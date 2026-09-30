"use client";

import React, { useState, useEffect, useRef } from "react";
import { useEditorState } from "./editor-context";

export function PdfPreviewPane() {
  const { pdfUrl, isCompiling, compileStatus, compileError, logs, setAiPanelOpen, setAiContextData } = useEditorState();
  const [showLogs, setShowLogs] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<'errors' | 'warnings' | 'raw'>('errors');

  const errors = logs.filter(l => l.level === 'error');
  const warnings = logs.filter(l => l.level === 'warning');
  const hasLogs = logs.length > 0;

  // Elapsed timer while compiling
  useEffect(() => {
    if (isCompiling) {
      setElapsedSec(0);
      timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCompiling]);

  // Auto-open log panel on compile error/failure, auto-close on success
  useEffect(() => {
    if (compileStatus === "error" && hasLogs) {
      setShowLogs(true);
    } else if (compileStatus === "success") {
      setShowLogs(false);
    }
  }, [compileStatus, hasLogs]);

  // Auto-switch tab to best available category
  useEffect(() => {
    if (showLogs) {
      if (errors.length > 0) setActiveTab('errors');
      else if (warnings.length > 0) setActiveTab('warnings');
      else setActiveTab('raw');
    }
  }, [showLogs, errors.length, warnings.length]);

  // Determine if we should show the stale-PDF warning badge (Overleaf behaviour)
  const showStalePdf = compileStatus === "error" && !!pdfUrl;

  return (
    <aside className="w-1/2 flex-shrink-0 bg-muted/20 hidden lg:flex flex-col relative border-l border-border">
      
      {/* Top Bar showing compile status */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-background z-10">
        <div className="text-xs font-medium flex items-center gap-2">
          {compileStatus === "compiling" ? (
            <span className="text-blue-500 animate-pulse flex items-center gap-1.5">
               <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Compiling... {elapsedSec > 0 && <span className="text-blue-400/70 ml-1">({elapsedSec}s)</span>}
            </span>
          ) : compileStatus === "error" || compileError ? (
            <span className="text-red-500 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Compilation failed {errors.length > 0 && `(${errors.length} ${errors.length === 1 ? 'error' : 'errors'})`}
            </span>
          ) : compileStatus === "cancelled" ? (
             <span className="text-yellow-500 flex items-center gap-1">
              Compilation cancelled
            </span>
          ) : pdfUrl ? (
            <span className="text-green-500 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Compiled successfully {warnings.length > 0 && <span className="text-yellow-500/80">({warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'})</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Ready to compile</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {showStalePdf && (
            <span className="text-[10px] text-yellow-600/90 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5 font-medium">
              Stale PDF
            </span>
          )}
          {hasLogs && (
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className={`text-xs underline decoration-dashed underline-offset-2 transition-colors ${
                compileStatus === "error" ? "text-red-500/80 hover:text-red-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {showLogs ? "Hide Logs" : `Show Logs ${errors.length > 0 ? `(${errors.length} error${errors.length > 1 ? 's' : ''})` : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Logs Panel (Collapsible) */}
      {showLogs && hasLogs && (
        <div className="absolute top-10 left-0 right-0 max-h-80 flex flex-col bg-background text-foreground text-xs z-20 border-b border-border shadow-md">
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
            <button onClick={() => setActiveTab('errors')} className={`font-medium transition-colors ${activeTab === 'errors' ? 'text-red-500 underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Errors ({errors.length})
            </button>
            <button onClick={() => setActiveTab('warnings')} className={`font-medium transition-colors ${activeTab === 'warnings' ? 'text-yellow-500 underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Warnings ({warnings.length})
            </button>
            <button onClick={() => setActiveTab('raw')} className={`font-medium transition-colors ${activeTab === 'raw' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Full Log
            </button>
            <button onClick={() => setShowLogs(false)} className="ml-auto text-muted-foreground hover:text-foreground" title="Close log panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="overflow-y-auto p-4 max-h-64 font-mono text-[11px] leading-relaxed">
            {activeTab === 'errors' && (
              errors.length > 0 ? errors.map((log, i) => (
                <div key={i} className="mb-3 text-red-500 border border-red-500/20 bg-red-500/5 p-2 rounded">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {log.file ? `${log.file}${log.line ? `:${log.line}` : ''}` : 'LaTeX Error'}
                  </div>
                  <div className="whitespace-pre-wrap mb-2">{log.message}</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setAiPanelOpen(true); setAiContextData({ errorLog: log, action: 'explain' }); }}
                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-[10px] uppercase font-semibold transition-colors"
                    >
                      Explain with AI
                    </button>
                    <button 
                      onClick={() => { setAiPanelOpen(true); setAiContextData({ errorLog: log, action: 'fix' }); }}
                      className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded border border-blue-500/20 text-[10px] uppercase font-semibold transition-colors"
                    >
                      Fix with AI
                    </button>
                  </div>
                </div>
              )) : <div className="text-muted-foreground">No errors found.</div>
            )}
            
            {activeTab === 'warnings' && (
              warnings.length > 0 ? warnings.map((log, i) => (
                <div key={i} className="mb-3 text-yellow-500/90 border border-yellow-500/20 bg-yellow-500/5 p-2 rounded">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {log.file ? `${log.file}${log.line ? `:${log.line}` : ''}` : 'Warning'}
                  </div>
                  <div className="whitespace-pre-wrap">{log.message}</div>
                </div>
              )) : <div className="text-muted-foreground">No warnings found.</div>
            )}

            {activeTab === 'raw' && (
              <div className="text-muted-foreground whitespace-pre-wrap select-all">
                {logs.map((l, i) => <div key={i} className={
                  l.level === 'error' ? 'text-red-400' :
                  l.level === 'warning' ? 'text-yellow-400' :
                  'text-muted-foreground'
                }>{l.message}</div>)}
                {logs.length === 0 && 'No log output.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer — Overleaf style: always show stale PDF, overlay a badge on error */}
      <div className="flex-1 relative bg-muted/20">
        {pdfUrl ? (
          <>
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0`} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
            {/* Error overlay badge — does NOT hide the PDF (Overleaf behaviour) */}
            {compileError && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/95 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Compile failed — showing previous PDF
              </div>
            )}
          </>
        ) : compileError ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-red-500/80">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-red-500/50"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3 className="text-lg font-medium mb-1 text-red-500">Compilation Failed</h3>
            <p className="text-sm max-w-sm mb-4">{compileError}</p>
            <p className="text-xs text-muted-foreground">Fix the errors and compile again.</p>
          </div>
        ) : isCompiling ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <svg className="animate-spin h-10 w-10 mb-4 text-blue-500/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-sm font-medium text-foreground">Compiling your document...</p>
            <p className="text-xs text-muted-foreground mt-1">{elapsedSec}s elapsed</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-border"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <h3 className="text-lg font-medium text-foreground mb-1">No PDF Generated</h3>
            <p className="text-sm max-w-sm">Click <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Compile</kbd> or press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Ctrl+Enter</kbd> to compile.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
