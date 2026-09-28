import { Extension, StateField, StateEffect, Transaction } from "@codemirror/state";
import { keymap, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType, EditorView } from "@codemirror/view";
import { autocompleteAction } from "@/app/actions/ai.actions";

// --- State Definitions ---

export interface AIAutocompleteState {
  suggestion: string;
  pos: number;
}

export const setAISuggestion = StateEffect.define<AIAutocompleteState | null>();

export const aiSuggestionState = StateField.define<AIAutocompleteState | null>({
  create() {
    return null;
  },
  update(value: AIAutocompleteState | null, tr: Transaction) {
    // If document changed, invalidate suggestion
    if (tr.docChanged) return null;
    
    // Process state effects
    for (let effect of tr.effects) {
      if (effect.is(setAISuggestion)) {
        return effect.value;
      }
    }
    
    // If selection changed away from the suggestion pos, invalidate
    if (tr.selection && value) {
      if (tr.selection.main.head !== value.pos) {
        return null;
      }
    }
    
    return value;
  }
});

// --- Ghost Text Decoration ---

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ai-ghost-text";
    span.style.opacity = "0.4";
    span.style.fontStyle = "italic";
    span.style.pointerEvents = "none";
    span.textContent = this.text;
    return span;
  }
}

export const aiSuggestionDecoration = EditorView.decorations.compute([aiSuggestionState as any], state => {
  const suggestion: any = state.field(aiSuggestionState as any);
  if (!suggestion || !suggestion.suggestion) return Decoration.none;

  return Decoration.set([
    Decoration.widget({
      widget: new GhostTextWidget(suggestion.suggestion),
      side: 1
    }).range(suggestion.pos)
  ]);
});

// --- ViewPlugin for Debouncing ---

export function createAIAutocompletePlugin(projectId: string, path: string) {
  return ViewPlugin.fromClass(class {
    debounceTimer: NodeJS.Timeout | null = null;
    currentAbortController: AbortController | null = null;

    constructor(readonly view: EditorView) {}

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.scheduleRequest(update.view);
      }
    }

    scheduleRequest(view: EditorView) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }

      this.debounceTimer = setTimeout(() => {
        this.requestAutocomplete(view);
      }, 700);
    }

    async requestAutocomplete(view: EditorView) {
      const pos = view.state.selection.main.head;
      const text = view.state.doc.toString();
      
      const prefix = text.slice(0, pos);
      const suffix = text.slice(pos);

      // Do not request if cursor is at the very beginning (no context)
      if (prefix.trim().length === 0) return;

      const abortController = new AbortController();
      this.currentAbortController = abortController;

      try {
        const result = await autocompleteAction(projectId, path, prefix, suffix);
        
        // If aborted or cursor moved during request, discard
        if (abortController.signal.aborted) return;
        if (view.state.selection.main.head !== pos) return;
        
        // Avoid meaningless/empty suggestions
        if (!result.suggestion || result.suggestion.length === 0) return;

        view.dispatch({
          effects: setAISuggestion.of({ suggestion: result.suggestion, pos })
        });
      } catch (e: any) {
        // Ignore errors (e.g. rate limit, aborted, disabled)
        if (e.message?.includes("AI is not configured")) {
           // Silently ignore if AI isn't configured
           return;
        }
        console.warn("AI Autocomplete failed:", e.message || e);
      }
    }

    destroy() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (this.currentAbortController) this.currentAbortController.abort();
    }
  });
}

// --- Keymap Binding ---

export const aiAutocompleteKeymap = keymap.of([{
  key: "Tab",
  run: (view) => {
    const suggestion: any = view.state.field(aiSuggestionState as any);
    if (suggestion && suggestion.suggestion) {
      // Accept suggestion
      view.dispatch({
        changes: { from: suggestion.pos, insert: suggestion.suggestion },
        selection: { anchor: suggestion.pos + suggestion.suggestion.length },
        effects: setAISuggestion.of(null as AIAutocompleteState | null)
      });
      return true; // Prevents default Tab behavior
    }
    return false; // Fallthrough to default Tab
  }
}, {
  key: "Escape",
  run: (view) => {
    const suggestion: any = view.state.field(aiSuggestionState as any);
    if (suggestion) {
      // Dismiss suggestion
      view.dispatch({
        effects: setAISuggestion.of(null as AIAutocompleteState | null)
      });
      return true;
    }
    return false;
  }
}]);

export function aiAutocompleteExtension(projectId: string, path: string): Extension {
  // Only activate the plugin if the server has AI configured (checked client-side via env var)
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return []; // Return empty extension set — no AI, no 500 errors
  }
  return [
    aiSuggestionState,
    aiSuggestionDecoration,
    createAIAutocompletePlugin(projectId, path),
    aiAutocompleteKeymap
  ];
}
