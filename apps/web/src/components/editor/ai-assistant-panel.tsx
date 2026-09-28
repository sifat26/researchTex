"use client";

import React, { useState, useEffect } from "react";
import { useEditorState } from "./editor-context";
import { explainErrorAction, fixErrorAction, suggestCitationsAction, type StructuredFix } from "@/app/actions/ai.actions";

export function AIAssistantPanel({ projectId, currentFile }: { projectId: string; currentFile: string }) {
  const { aiPanelOpen, setAiPanelOpen, aiContextData, getCurrentFileContent, applyAIFix, setAiContextData, activeSelection, projectBibIndex, localDocumentIndex } = useEditorState();
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [proposedFix, setProposedFix] = useState<StructuredFix | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [diffView, setDiffView] = useState(false);

  // New state for writing assistant
  const [transformedText, setTransformedText] = useState("");
  const [isWritingMode, setIsWritingMode] = useState(false);
  
  // State for citations
  const [citationSuggestions, setCitationSuggestions] = useState<{ citations: string[], reasoning: string } | null>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  useEffect(() => {
    if (aiContextData?.action && aiContextData.action !== 'none' && aiContextData.errorLog) {
      handleAction(aiContextData.action, aiContextData.errorLog);
    }
  }, [aiContextData]);

  if (!aiPanelOpen) return null;

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setErrorMsg("");
    
    try {
      const { chatAction } = await import('@/app/actions/ai.actions');
      const res = await chatAction(projectId, chatHistory, userMessage, { activeSelection });
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'explain' | 'fix', log: any) {
    setLoading(true);
    setResultText("");
    setProposedFix(null);
    setErrorMsg("");
    setDiffView(false);
    setIsWritingMode(false);
    setTransformedText("");

    try {
      const content = getCurrentFileContent();
      const fileToFix = log.file || currentFile;
      
      if (action === 'explain') {
        const res = await explainErrorAction(projectId, log.message, fileToFix, log.line, content);
        setResultText(res.explanation);
      } else if (action === 'fix') {
        const res = await fixErrorAction(projectId, log.message, fileToFix, log.line, content);
        setProposedFix(res);
        setDiffView(true);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An error occurred connecting to the AI provider.");
    } finally {
      setLoading(false);
      setAiContextData(null); // consume the action
    }
  }

  async function handleWritingAction(type: string) {
    if (!activeSelection) return;
    
    setLoading(true);
    setResultText("");
    setProposedFix(null);
    setErrorMsg("");
    setDiffView(false);
    setIsWritingMode(true);
    setTransformedText("");

    try {
      const { transformSelectionAction } = await import('@/app/actions/ai.actions');
      const res = await transformSelectionAction(projectId, type, activeSelection);
      setTransformedText(res.transformed);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to transform selection.");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFix() {
    if (proposedFix) {
      applyAIFix(proposedFix.replacement, proposedFix.startLine, proposedFix.endLine);
      setProposedFix(null);
      setDiffView(false);
      setResultText("Fix applied successfully. You can now recompile.");
    }
  }

  function handleReplaceSelection() {
    // A quick hack: If we have transformedText, we need the start/end lines of the selection.
    // However, CodeMirror replaces selections natively if we just trigger a command.
    // But since applyAIFix expects line numbers, replacing multi-line selections directly requires a bit of math.
    // For Phase 12, we can just fire a generic "replace selection" custom event that CodeEditor listens to!
    window.dispatchEvent(new CustomEvent('ai-replace-selection', { detail: transformedText }));
    setTransformedText("");
    setIsWritingMode(false);
  }

  async function handleCitationSuggestion() {
    if (!activeSelection) return;
    setLoading(true);
    setResultText("");
    setProposedFix(null);
    setErrorMsg("");
    setDiffView(false);
    setIsWritingMode(false);
    setTransformedText("");
    setCitationSuggestions(null);

    try {
      const candidates = projectBibIndex.search(activeSelection, 20).map(r => ({
        key: r.entry.key,
        metadata: `${r.entry.fields.title || ""} | ${r.entry.fields.author || ""} | ${r.entry.fields.year || ""}`
      }));
      
      const res = await suggestCitationsAction(projectId, activeSelection, candidates);
      setCitationSuggestions(res);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to suggest citations");
    } finally {
      setLoading(false);
    }
  }

  async function handleResearchAction(type: 'summarize' | 'explain' | 'evidence' | 'references') {
    if (!activeSelection || !localDocumentIndex) return;
    setLoading(true);
    setResultText("");
    setProposedFix(null);
    setErrorMsg("");
    setDiffView(false);
    setIsWritingMode(false);
    setTransformedText("");
    setCitationSuggestions(null);

    try {
      const retrieved = await localDocumentIndex.search("current-project", activeSelection, { limit: 8 });
      const chunksData = retrieved.map((r: any) => ({
        id: r.id,
        filePath: r.filePath,
        section: r.section,
        subsection: r.subsection,
        startLine: r.startLine,
        endLine: r.endLine,
        content: r.content
      }));

      let prompt = "";
      if (type === 'summarize') prompt = `Summarize the section matching: "${activeSelection}"`;
      if (type === 'explain') prompt = `Explain the concepts in the section matching: "${activeSelection}"`;
      
      if (type === 'evidence') {
        const { findEvidenceAction } = await import('@/app/actions/ai.actions');
        const res = await findEvidenceAction(projectId, activeSelection, chunksData);
        setResultText(res.answer);
        setLoading(false);
        return;
      }
      if (type === 'references') {
        const candidates = projectBibIndex.search(activeSelection, 20).map((r: any) => ({
          key: r.entry.key,
          metadata: `${r.entry.fields.title || ""} | ${r.entry.fields.author || ""} | ${r.entry.fields.year || ""}`
        }));
        const { suggestCitationsAction } = await import('@/app/actions/ai.actions');
        const res = await suggestCitationsAction(projectId, activeSelection, candidates);
        setCitationSuggestions(res);
        setLoading(false);
        return;
      }

      const { askResearchAction } = await import('@/app/actions/ai.actions');
      const res = await askResearchAction(projectId, prompt, chunksData);
      setResultText(res.answer);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to run research action.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-muted/10 border-l border-border flex flex-col z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] absolute right-0 top-12 bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</span>
        </div>
        <button onClick={() => setAiPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
          Context: <span className="font-mono text-foreground">{currentFile}</span>
        </div>

        {activeSelection && !loading && !transformedText && !resultText && !proposedFix && !errorMsg && !citationSuggestions && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Writing Assistant</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleWritingAction('improve')} className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded border border-primary/20">Improve</button>
                <button onClick={() => handleWritingAction('academic')} className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded border border-primary/20">Academic</button>
                <button onClick={() => handleWritingAction('concise')} className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded border border-primary/20">Concise</button>
                <button onClick={() => handleWritingAction('grammar')} className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded border border-primary/20">Grammar</button>
                <button onClick={() => handleWritingAction('simplify')} className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded border border-primary/20">Simplify</button>
                <button onClick={() => handleCitationSuggestion()} className="text-[10px] uppercase font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 p-2 rounded border border-blue-500/20">Suggest Citations</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Research Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleResearchAction('summarize')} className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 p-2 rounded border border-purple-500/20">Summarize Section</button>
                <button onClick={() => handleResearchAction('explain')} className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 p-2 rounded border border-purple-500/20">Explain Section</button>
                <button onClick={() => handleResearchAction('evidence')} className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 p-2 rounded border border-purple-500/20">Find Evidence</button>
                <button onClick={() => handleResearchAction('references')} className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 p-2 rounded border border-purple-500/20">Find Related Refs</button>
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground mt-2 bg-muted p-2 rounded border border-border overflow-hidden text-ellipsis whitespace-nowrap">
              "{activeSelection}"
            </div>
          </div>
        )}

        {!activeSelection && !loading && !resultText && !proposedFix && !errorMsg && !citationSuggestions && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            <h4 className="text-sm font-medium mb-1">How can I help?</h4>
            <p className="text-xs text-muted-foreground mb-4">Click "Explain" or "Fix" on any compiler error, or select text in the editor to use the Writing Assistant.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-500 bg-blue-500/10 p-3 rounded border border-blue-500/20">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            AI is analyzing...
          </div>
        )}

        {errorMsg && (
          <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded border border-red-500/20 whitespace-pre-wrap">
            {errorMsg}
          </div>
        )}

        {resultText && (
          <div className="text-sm text-foreground space-y-2">
            <div className="font-semibold text-xs uppercase text-muted-foreground tracking-wider mb-2">AI Response</div>
            <div className="prose prose-sm prose-invert bg-muted/30 p-3 rounded border border-border whitespace-pre-wrap">
              {resultText}
            </div>
            <button onClick={() => setResultText("")} className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs rounded font-medium mt-2">Close</button>
          </div>
        )}

        {citationSuggestions && (
          <div className="text-sm flex flex-col gap-3">
             <div className="bg-muted p-3 rounded border border-border">
              <h4 className="font-semibold mb-2 text-blue-500">AI Citation Suggestions</h4>
              <p className="text-xs text-muted-foreground mb-3">{citationSuggestions.reasoning}</p>
              <div className="flex flex-col gap-2">
                {citationSuggestions.citations.length > 0 ? (
                  citationSuggestions.citations.map(c => (
                    <div key={c} className="text-xs font-mono bg-blue-500/10 p-2 rounded border border-blue-500/20 text-blue-500 flex justify-between items-center">
                      <span>{c}</span>
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('ai-replace-selection', { detail: `\\cite{${c}}` }));
                          setCitationSuggestions(null);
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Insert
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">No relevant citations found.</div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setCitationSuggestions(null)}
                className="flex-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs rounded font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {isWritingMode && transformedText && (
          <div className="text-sm flex flex-col gap-3">
             <div className="bg-muted p-3 rounded border border-border">
              <h4 className="font-semibold mb-2">Original</h4>
              <div className="text-xs bg-background p-2 rounded border border-border overflow-x-auto text-muted-foreground mb-3 line-through opacity-70">
                {activeSelection}
              </div>
              <h4 className="font-semibold mb-2 text-green-500">Transformed</h4>
              <div className="text-xs font-mono bg-green-500/10 p-2 rounded border border-green-500/20 overflow-x-auto text-green-400">
                {transformedText}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleReplaceSelection}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs rounded font-medium"
              >
                Replace
              </button>
              <button 
                onClick={() => { setTransformedText(""); setIsWritingMode(false); }}
                className="flex-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {proposedFix && diffView && (
          <div className="text-sm flex flex-col gap-3">
            <div className="bg-muted p-3 rounded border border-border">
              <h4 className="font-semibold mb-1">Explanation</h4>
              <p className="text-muted-foreground mb-3">{proposedFix.explanation}</p>
              
              <h4 className="font-semibold mb-1">Proposed Fix</h4>
              <div className="text-xs font-mono bg-background p-2 rounded border border-border overflow-x-auto text-green-400">
                {proposedFix.replacement}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleApplyFix}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs rounded font-medium"
              >
                Apply Fix
              </button>
              <button 
                onClick={() => { setProposedFix(null); setDiffView(false); }}
                className="flex-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="flex flex-col border-t border-border bg-background">
        {chatHistory.length > 0 && (
          <div className="p-4 overflow-y-auto max-h-[30vh] flex flex-col gap-3" ref={chatScrollRef}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`text-xs p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 text-primary self-end ml-4' : 'bg-muted text-foreground mr-4'}`}>
                {msg.content}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleChatSubmit} className="p-3 bg-muted/30 flex gap-2 border-t border-border">
          <input 
            type="text" 
            placeholder="Ask AI anything..." 
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button 
            type="submit" 
            disabled={loading || !chatInput.trim()}
            className="inline-flex items-center justify-center shrink-0 w-8 h-8 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
