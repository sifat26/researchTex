"use client";

import React, { useState } from "react";
import { useEditorState } from "./editor-context";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { RetrievedChunk } from "@/lib/research/index";
import { askResearchAction } from "@/app/actions/ai.actions";

export function ResearchPanel({ projectId }: { projectId: string }) {
  const { researchPanelOpen, setResearchPanelOpen, localDocumentIndex } = useEditorState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!researchPanelOpen) return null;

  const handleSearch = async () => {
    if (!query.trim() || !localDocumentIndex) return;
    setLoading(true);
    setAiAnswer(null);
    try {
      const retrieved = await localDocumentIndex.search("current-project", query, { limit: 10 });
      setResults(retrieved);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!query.trim() || results.length === 0) return;
    setLoading(true);
    try {
      const chunksData = results.slice(0, 8).map(r => ({
        id: r.id,
        filePath: r.filePath,
        section: r.section,
        subsection: r.subsection,
        startLine: r.startLine,
        endLine: r.endLine,
        content: r.content
      }));
      
      const res = await askResearchAction(projectId, query, chunksData);
      setAiAnswer(res.answer);
    } catch (e: any) {
      setAiAnswer(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openFile = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('file', path);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className="w-96 flex-shrink-0 bg-muted/10 border-l border-border flex flex-col z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] absolute right-0 top-12 bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research Intelligence</span>
        </div>
        <button onClick={() => setResearchPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search project or ask AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
            onClick={handleSearch}
            disabled={loading}
          >
            Search
          </button>
        </div>

        {results.length > 0 && !aiAnswer && (
           <button 
             className="w-full h-8 text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
             onClick={handleAskAI}
             disabled={loading}
           >
             Ask AI using these results
           </button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-500 p-2">
             <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             Processing...
          </div>
        )}

        {aiAnswer && (
          <div className="text-sm bg-blue-500/10 text-blue-100 p-3 rounded border border-blue-500/20 whitespace-pre-wrap">
            <h4 className="font-semibold text-blue-400 mb-2">AI Answer</h4>
            {aiAnswer}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {results.map((result, idx) => (
            <div key={idx} className="bg-muted/30 border border-border rounded p-3 text-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-semibold text-muted-foreground break-all">
                  {result.filePath}
                  {result.section && <span className="text-primary ml-1">· {result.section}</span>}
                </div>
                <div className="text-[10px] bg-background px-1 border border-border rounded">
                   L{result.startLine}-{result.endLine}
                </div>
              </div>
              <div className="text-xs text-foreground bg-background p-2 border border-border rounded whitespace-pre-wrap overflow-hidden max-h-32 text-ellipsis">
                {result.content}
              </div>
              <button 
                onClick={() => openFile(result.filePath)}
                className="mt-2 text-[10px] font-semibold text-primary hover:underline uppercase tracking-wider"
              >
                Open File
              </button>
            </div>
          ))}
          
          {!loading && query && results.length === 0 && (
             <div className="text-sm text-muted-foreground italic text-center p-4">No results found.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
