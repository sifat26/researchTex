import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

// Common LaTeX commands for static autocomplete
const latexCommands = [
  "documentclass", "usepackage", "begin", "end", 
  "section", "subsection", "subsubsection", "paragraph",
  "chapter", "part", "textbf", "textit", "emph", "underline",
  "cite", "ref", "label", "includegraphics", "input", "include",
  "item", "maketitle", "tableofcontents", "bibliography", "bibliographystyle"
];

// Common LaTeX environments
const latexEnvironments = [
  "document", "abstract", "figure", "table", "itemize", "enumerate",
  "equation", "align", "center", "quote", "verbatim"
];

function latexCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\\[a-zA-Z]*/);
  if (word) {
    if (word.from === word.to && !context.explicit) return null;
    return {
      from: word.from + 1, // Exclude the backslash from replacement
      options: latexCommands.map(cmd => ({
        label: cmd,
        type: "keyword",
        apply: cmd + "{"
      })),
      validFor: /^[a-zA-Z]*$/
    };
  }

  // Very basic environment autocomplete inside \begin{...}
  const envWord = context.matchBefore(/\\begin\{[a-zA-Z]*$/);
  if (envWord) {
    const prefix = envWord.text.replace("\\begin{", "");
    return {
      from: envWord.to - prefix.length,
      options: latexEnvironments.map(env => ({
        label: env,
        type: "class",
        apply: env + "}"
      })),
      validFor: /^[a-zA-Z]*$/
    };
  }

  return null;
}

import { EditorState } from "@codemirror/state";

export const editorExtensions = [
  StreamLanguage.define(stex),
  EditorState.languageData.of(() => [{ autocomplete: latexCompletions }])
];
