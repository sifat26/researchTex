"use client";

import React, { useState } from "react";
import { useEditorState } from "./editor-context";

export function PdfPreviewPane() {
  const { pdfUrl, isCompiling, compileStatus, compileError, logs, setAiPanelOpen, setAiContextData } = useEditorState();
  const [showLogs, setShowLogs] = useState(false);

  const errors = logs.filter(l => l.level === 'error');
  const warnings = logs.filter(l => l.level === 'warning');
  const hasLogs = logs.length > 0;
  const [activeTab, setActiveTab] = useState<'errors' | 'warnings' | 'raw'>('errors');

  // Automatically switch to errors if compile fails and logs are shown
  React.useEffect(() => {
    if (showLogs) {
      if (errors.length > 0) setActiveTab('errors');
      else if (warnings.length > 0) setActiveTab('warnings');
      else setActiveTab('raw');
    }
  }, [showLogs, errors.length, warnings.length]);

  return (
    <aside className="w-1/2 flex-shrink-0 bg-muted/20 hidden lg:flex flex-col relative border-l border-border">
      
      {/* Top Bar showing compile status */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-background z-10">
        <div className="text-xs font-medium flex items-center gap-2">
          {compileStatus === "compiling" ? (
            <span className="text-blue-500 animate-pulse flex items-center gap-1">
               <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Compiling...
            </span>
          ) : compileStatus === "error" || compileError ? (
            <span className="text-red-500 flex items-center gap-1">
              Compilation failed {errors.length > 0 && `(${errors.length} errors)`}
            </span>
          ) : compileStatus === "cancelled" ? (
             <span className="text-yellow-500 flex items-center gap-1">
              Compilation cancelled
            </span>
          ) : pdfUrl ? (
            <span className="text-green-500 flex items-center gap-1">
              Compilation successful {warnings.length > 0 && `(${warnings.length} warnings)`}
            </span>
          ) : (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
        
        {hasLogs && (
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-2"
          >
            {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
        )}
      </div>

      {/* Logs Panel (Collapsible) */}
      {showLogs && hasLogs && (
        <div className="absolute top-10 left-0 right-0 max-h-80 flex flex-col bg-background text-foreground text-xs z-20 border-b border-border shadow-md">
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
            <button onClick={() => setActiveTab('errors')} className={`font-medium ${activeTab === 'errors' ? 'text-red-500 underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Errors ({errors.length})
            </button>
            <button onClick={() => setActiveTab('warnings')} className={`font-medium ${activeTab === 'warnings' ? 'text-yellow-500 underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Warnings ({warnings.length})
            </button>
            <button onClick={() => setActiveTab('raw')} className={`font-medium ${activeTab === 'raw' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}>
              Raw Output
            </button>
          </div>
          <div className="overflow-y-auto p-4 max-h-64 font-mono text-[11px] leading-relaxed">
            {activeTab === 'errors' && (
              errors.length > 0 ? errors.map((log, i) => (
                <div key={i} className="mb-3 text-red-500 border border-red-500/20 bg-red-500/5 p-2 rounded relative group">
                  <div className="font-semibold mb-1">
                    {log.file ? `${log.file}${log.line ? `:${log.line}` : ''}` : 'Error'}
                  </div>
                  <div className="whitespace-pre-wrap mb-2">{log.message}</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setAiPanelOpen(true); setAiContextData({ errorLog: log, action: 'explain' }); }}
                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-[10px] uppercase font-semibold"
                    >
                      Explain with AI
                    </button>
                    <button 
                      onClick={() => { setAiPanelOpen(true); setAiContextData({ errorLog: log, action: 'fix' }); }}
                      className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded border border-blue-500/20 text-[10px] uppercase font-semibold"
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
                  <div className="font-semibold mb-1">
                    {log.file ? `${log.file}${log.line ? `:${log.line}` : ''}` : 'Warning'}
                  </div>
                  <div className="whitespace-pre-wrap">{log.message}</div>
                </div>
              )) : <div className="text-muted-foreground">No warnings found.</div>
            )}

            {activeTab === 'raw' && (
              <div className="text-muted-foreground whitespace-pre-wrap">
                {logs.filter(l => l.level === 'info').map((l, i) => <div key={i}>{l.message}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer or Status Overlay */}
      <div className="flex-1 relative bg-muted/20">
        {pdfUrl && !compileError ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0`} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        ) : compileError ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-red-500/80">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-red-500/50"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3 className="text-lg font-medium mb-1 text-red-500">Compilation Failed</h3>
            <p className="text-sm max-w-sm mb-4">{compileError}</p>
            {pdfUrl && (
              <p className="text-xs text-muted-foreground p-2 border border-border rounded">
                Note: Showing errors. Previous PDF is available but stale.
              </p>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-border"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <h3 className="text-lg font-medium text-foreground mb-1">No PDF Generated</h3>
            <p className="text-sm max-w-sm">Click Compile to generate a PDF preview.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
