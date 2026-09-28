import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { BibliographyIndex } from "@/lib/bibtex/index";

export function citationAutocomplete(bibIndex: BibliographyIndex) {
  return EditorState.languageData.of(() => [{
    autocomplete: (context: CompletionContext): CompletionResult | null => {
      // match \cite{..., \citep{..., \citet{..., \citeauthor{..., \citeyear{..., \autocite{..., \parencite{..., \textcite{...
      // allowing optional [options] and multiple comma separated keys.
      const word = context.matchBefore(/\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite)(?:\[[^\]]*\])?\{([^}]*)$/);
      
      if (!word) return null;
      if (word.from === word.to && !context.explicit) return null;

      const matchStr = word.text;
      const lastBrace = matchStr.lastIndexOf('{');
      const lastComma = matchStr.lastIndexOf(',');
      const startPos = Math.max(lastBrace, lastComma);
      
      const query = matchStr.slice(startPos + 1).trimStart(); // keep trailing spaces for query if any, but usually we just trim

      const results = bibIndex.search(query.trim(), 50);

      return {
        from: word.from + startPos + 1 + (matchStr.slice(startPos + 1).length - query.length), // Account for trimmed start spaces
        options: results.map(res => {
          const author = res.entry.fields.author ? res.entry.fields.author.split('and')[0]?.trim() + (res.entry.fields.author.includes('and') ? ' et al.' : '') : 'Unknown';
          return {
            label: res.entry.key,
            type: "text",
            detail: `${res.entry.fields.year || "N.D."} · ${author}`,
            info: res.entry.fields.title || "No title available"
          } as Completion;
        })
      };
    }
  }]);
}
