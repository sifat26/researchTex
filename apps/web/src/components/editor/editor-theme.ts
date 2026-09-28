import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

/**
 * A clean, minimalist theme that integrates with Tailwind CSS variables.
 * Uses current body colors to support both light and dark modes natively.
 */
export const researchTexTheme = EditorView.theme(
  {
    "&": {
      color: "hsl(var(--foreground))",
      backgroundColor: "transparent",
      fontSize: "14px",
      fontFamily: "var(--font-mono), monospace",
    },
    ".cm-content": {
      caretColor: "hsl(var(--foreground))",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "hsl(var(--foreground))" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "hsl(var(--accent))",
    },
    ".cm-panels": { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" },
    ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
    ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
    ".cm-searchMatch": {
      backgroundColor: "hsl(var(--accent))",
      outline: "1px solid hsl(var(--ring))",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "hsl(var(--primary) / 0.2)",
    },
    ".cm-activeLine": { backgroundColor: "hsl(var(--muted) / 0.3)" },
    ".cm-selectionMatch": { backgroundColor: "hsl(var(--accent))" },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "hsl(var(--muted))",
      outline: "1px solid hsl(var(--border))",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "hsl(var(--muted-foreground))",
      borderRight: "1px solid hsl(var(--border))",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--muted) / 0.3)",
      color: "hsl(var(--foreground))",
    },
  },
  { dark: false } // We let CSS vars handle dark/light natively
);

/**
 * Basic syntax highlighting colors mapped nicely for LaTeX.
 */
export const researchTexHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: "#d73a49", fontWeight: "bold" }, // standard commands
    { tag: t.operator, color: "#005cc5" }, // braces, brackets
    { tag: t.className, color: "#6f42c1" }, // environments
    { tag: t.string, color: "#032f62" },
    { tag: t.comment, color: "#6a737d", fontStyle: "italic" },
    { tag: t.variableName, color: "#e36209" },
    { tag: t.number, color: "#005cc5" },
    { tag: t.tagName, color: "#22863a" },
    { tag: t.attributeName, color: "#6f42c1" },
  ])
);

export const editorTheme = [researchTexTheme, researchTexHighlightStyle];
