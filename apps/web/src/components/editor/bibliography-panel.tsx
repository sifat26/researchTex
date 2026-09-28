"use client";

import React, { useState } from "react";
import { useEditorState } from "./editor-context";

export function BibliographyPanel({ projectId }: { projectId: string }) {
  const { bibliographyPanelOpen, setBibliographyPanelOpen, projectBibIndex, getCurrentFileContent } = useEditorState();
  const [search, setSearch] = useState("");

  if (!bibliographyPanelOpen) return null;

  const entries = projectBibIndex.search(search, 50);
  const totalEntries = projectBibIndex.getEntries().length;
  const duplicates = projectBibIndex.getDuplicateKeys();
  const warnings = projectBibIndex.getWarnings();

  // Evaluate missing/unused on the current active tex file
  const currentTex = getCurrentFileContent();
  const missing = projectBibIndex.findMissingCitations(currentTex);
  const unused = projectBibIndex.findUnusedCitations(currentTex);

  return (
    <aside className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col z-20 shadow-lg">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          Bibliography
        </h3>
        <button onClick={() => setBibliographyPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="p-3 border-b border-border space-y-3">
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search references..." 
          className="w-full text-sm px-3 py-1.5 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{totalEntries} total entries</span>
          {duplicates.length > 0 && <span className="text-destructive font-medium">{duplicates.length} duplicates</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {warnings.length > 0 && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
            <strong>Parser Warnings:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
              {warnings.length > 5 && <li>...and {warnings.length - 5} more</li>}
            </ul>
          </div>
        )}

        {missing.length > 0 && (
           <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs rounded">
            <strong>⚠ Missing Citations:</strong>
            <p className="mt-1">The following keys are cited but not found in the bibliography:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {missing.map(m => (
                <span key={m} className="px-1.5 py-0.5 bg-amber-500/20 rounded font-mono">{m}</span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {entries.map(({ entry }) => (
            <div key={entry.key} className="p-2 bg-muted/40 border border-border rounded-md text-sm group">
              <div className="font-semibold text-foreground break-words">{entry.key}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {entry.fields.title || "No Title"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {entry.fields.author || "Unknown Author"} · {entry.fields.year || "N.D."}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No references found
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
