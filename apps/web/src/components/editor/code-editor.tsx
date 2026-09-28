"use client";

import React, { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { editorTheme } from "./editor-theme";
import { editorExtensions } from "./editor-extensions";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { VersionHistoryDialog } from "./version-history-dialog";
import { EditorView } from "@codemirror/view";
import { useEditorState } from "./editor-context";
import { aiAutocompleteExtension } from "./ai-autocomplete-extension";
import { citationAutocomplete } from "./citation-autocomplete-extension";
import { useDebouncedCallback } from "use-debounce";

interface CodeEditorProps {
  projectId: string;
  path: string;
  initialContent: string;
  collabToken: string;
  user: { name: string };
}



export function CodeEditor({ projectId, path, initialContent, collabToken, user }: CodeEditorProps) {
  const [collabStatus, setCollabStatus] = useState<string>("connecting");
  const [collaborators, setCollaborators] = useState<number>(1);
  const [yExtensions, setYExtensions] = useState<any[]>([]);
  const ytextRef = useRef<Y.Text | null>(null);
  const { setGetCurrentFileContent, setApplyAIFix, setActiveSelection, setBibFiles, projectBibIndex, localDocumentIndex, setResearchFiles } = useEditorState();
  
  const handleBibChange = useDebouncedCallback((newContent: string) => {
    setBibFiles(prev => {
      const idx = prev.findIndex(f => f.path === path);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], content: newContent, path: path || "main.tex" };
        return copy;
      } else {
        return [...prev, { path: path || "main.tex", content: newContent }];
      }
    });
  }, 1000);

  const handleResearchChange = useDebouncedCallback(async (newContent: string) => {
    // Also update researchFiles array
    setResearchFiles(prev => {
      const idx = prev.findIndex(f => f.path === path);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], content: newContent, path: path || "main.tex" };
        return copy;
      } else {
        return [...prev, { path: path || "main.tex", content: newContent }];
      }
    });

    if (localDocumentIndex) {
      const { DocumentExtractor } = await import("@/lib/research/extractor");
      const extractor = new DocumentExtractor();
      const chunks = extractor.extract("current-project", path, newContent);
      localDocumentIndex.updateFile("current-project", path, chunks);
    }
  }, 1500);
  
  useEffect(() => {
    const doc = new Y.Doc();
    const ytext = doc.getText("codemirror");
    ytextRef.current = ytext;
    
    // Make the live text available to the editor context (for AI)
    setGetCurrentFileContent(() => ytext.toString() || initialContent);
    ytext.observe(() => {
      const newText = ytext.toString();
      setGetCurrentFileContent(() => newText);
      if (path.endsWith('.bib')) {
        handleBibChange(newText);
      }
      if (path.endsWith('.tex') || path.endsWith('.md') || path.endsWith('.txt') || path.endsWith('.bib')) {
        handleResearchChange(newText);
      }
    });

    setApplyAIFix((replacement, startLine, endLine) => {
      // 1-indexed lines
      const text = ytext.toString();
      const lines = text.split('\n');
      
      const startIdx = lines.slice(0, startLine - 1).reduce((acc, l) => acc + l.length + 1, 0);
      let endIdx = startIdx;
      
      for(let i = startLine - 1; i < endLine; i++) {
         const lineLength = lines[i]?.length;
         if (lineLength !== undefined) {
           endIdx += lineLength + 1; // +1 for newline
         }
      }
      
      // We might have added an extra newline at the end of endIdx, so subtract 1 if it's not EOF
      if (endIdx > 0 && text[endIdx - 1] === '\n') {
        endIdx -= 1;
      }

      doc.transact(() => {
        ytext.delete(startIdx, endIdx - startIdx);
        ytext.insert(startIdx, replacement);
      });
    });
    
    // The server will load the initial document from PostgreSQL if it's the first connection.
    // Server expects: ws://localhost:1234/collaboration/project/:projectId/file/:filePath?token=...
    // y-websocket constructs: serverUrl + "/" + roomName, so we use the full path as serverUrl with empty room
    const docName = `project:${projectId}:file:${path}`;
    const base = (process.env.NEXT_PUBLIC_COLLABORATION_URL || "ws://localhost:1234").replace(/\/$/, "");
    const serverUrl = `${base}/collaboration/project/${projectId}/file/${encodeURIComponent(path)}?token=${collabToken}`;
    const provider = new WebsocketProvider(serverUrl, "", doc);

    provider.on("status", (event: { status: string }) => {
      setCollabStatus(event.status);
    });

    provider.awareness.on("change", () => {
      setCollaborators(provider.awareness.getStates().size);
    });

    // Random user identification for Phase 8
    const userColors = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899"];
    const randomColor = userColors[Math.floor(Math.random() * userColors.length)];
    provider.awareness.setLocalStateField("user", {
      name: user.name,
      color: randomColor,
      colorLight: randomColor + "33" 
    });

    setYExtensions([yCollab(ytext, provider.awareness)]);

    return () => {
      provider.disconnect();
      doc.destroy();
    };
  }, [projectId, path]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault(); 
      // Saving is debounced server-side automatically via Yjs persistence.
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown}>
      {/* Editor specific toolbar/header */}
      <div className="flex items-center justify-between border-b border-border p-2 bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {path}
        </div>
        <div className="flex items-center gap-3">
          <VersionHistoryDialog 
            projectId={projectId} 
            path={path} 
            getCurrentContent={() => ytextRef.current?.toString() || initialContent} 
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${
              collabStatus === "connected" ? "bg-green-500" : 
              collabStatus === "connecting" ? "bg-yellow-500 animate-pulse" : 
              "bg-red-500"
            }`} />
            {collabStatus === "connected" ? `${collaborators} ${collaborators === 1 ? 'Collaborator' : 'Collaborators'}` : 
             collabStatus === "connecting" ? "Connecting..." : 
             "Offline"}
          </div>
        </div>
      </div>
      
      {/* CodeMirror Workspace */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          height="100%"
          className="absolute inset-0"
          theme={editorTheme}
          extensions={[
             ...editorExtensions, 
             ...yExtensions,
             aiAutocompleteExtension(projectId, path) as any,
             citationAutocomplete(projectBibIndex),
             EditorView.domEventHandlers({
               "ai-replace-selection": (e, view) => {
                 const customEvent = e as unknown as CustomEvent<string>;
                 const replacement = customEvent.detail;
                 const selection = view.state.selection.main;
                 if (!selection.empty) {
                   view.dispatch({
                     changes: { from: selection.from, to: selection.to, insert: replacement }
                   });
                 }
                 return true;
               }
             }),
             EditorView.updateListener.of((update) => {
               if (update.docChanged && path.endsWith(".bib")) {
                 handleBibChange(update.state.doc.toString());
               }
               
               if (update.selectionSet || update.docChanged) {
                 const ranges = update.state.selection.ranges;
                 if (ranges.length > 0 && ranges[0] && !ranges[0].empty) {
                   const from = ranges[0].from;
                   const to = ranges[0].to;
                   const selText = update.state.doc.sliceString(from, to);
                   setActiveSelection(selText);
                 } else {
                   setActiveSelection("");
                 }
               }
             })
          ]}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            indentOnInput: true,
            autocompletion: true,
            searchKeymap: true,
            foldKeymap: true,
            history: false,
            historyKeymap: false,
            lintKeymap: true,
            syntaxHighlighting: true,
          }}
        />
      </div>
    </div>
  );
}
