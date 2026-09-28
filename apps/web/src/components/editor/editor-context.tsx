"use client";

import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from "react";
import type { CompileLogEntry } from "@researchtex/types";
import { BibliographyIndex } from "@/lib/bibtex/index";
import { ProjectIntelligenceResult, WorkspaceIntelligence } from "@/lib/research/intelligence";

interface AIContextData {
  errorLog?: CompileLogEntry;
  action?: 'explain' | 'fix' | 'none';
}

export interface BibFileContent {
  path: string;
  content: string;
}

export type CompileStatusType = "idle" | "compiling" | "success" | "error" | "cancelled";

interface EditorState {
  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;
  isCompiling: boolean; // DEPRECATED: use compileStatus
  setIsCompiling: (val: boolean) => void;
  compileStatus: CompileStatusType;
  setCompileStatus: (status: CompileStatusType) => void;
  logs: readonly CompileLogEntry[];
  setLogs: (logs: readonly CompileLogEntry[]) => void;
  compileError: string | null;
  setCompileError: (err: string | null) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (val: boolean) => void;
  bibliographyPanelOpen: boolean;
  setBibliographyPanelOpen: (val: boolean) => void;
  aiContextData: AIContextData | null;
  setAiContextData: (data: AIContextData | null) => void;
  getCurrentFileContent: () => string;
  setGetCurrentFileContent: (fn: () => string) => void;
  applyAIFix: (replacement: string, startLine: number, endLine: number) => void;
  setApplyAIFix: (fn: (r: string, s: number, e: number) => void) => void;
  activeSelection: string;
  setActiveSelection: (selection: string) => void;
  bibFiles: BibFileContent[];
  setBibFiles: React.Dispatch<React.SetStateAction<BibFileContent[]>>;
  projectBibIndex: BibliographyIndex;
  researchPanelOpen: boolean;
  setResearchPanelOpen: (val: boolean) => void;
  workspacePanelOpen: boolean;
  setWorkspacePanelOpen: (val: boolean) => void;
  researchFiles: { path: string, content: string }[];
  setResearchFiles: React.Dispatch<React.SetStateAction<{ path: string, content: string }[]>>;
  localDocumentIndex: any; // We'll type this properly
  workspaceIntelligence: ProjectIntelligenceResult | null;
}

const EditorContext = createContext<EditorState | null>(null);

export function EditorProvider({ children, initialBibFiles = [], initialResearchFiles = [] }: { children: React.ReactNode, initialBibFiles?: BibFileContent[], initialResearchFiles?: { path: string, content: string }[] }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<CompileStatusType>("idle");
  const [logs, setLogs] = useState<readonly CompileLogEntry[]>([]);
  const [compileError, setCompileError] = useState<string | null>(null);
  type EditorPanel = "ai" | "research" | "bibliography" | "workspace" | null;
  const [activePanel, setActivePanel] = useState<EditorPanel>(null);

  const aiPanelOpen = activePanel === "ai";
  const bibliographyPanelOpen = activePanel === "bibliography";
  const researchPanelOpen = activePanel === "research";
  const workspacePanelOpen = activePanel === "workspace";

  const setAiPanelOpen = (val: boolean) => setActivePanel(val ? "ai" : (activePanel === "ai" ? null : activePanel));
  const setBibliographyPanelOpen = (val: boolean) => setActivePanel(val ? "bibliography" : (activePanel === "bibliography" ? null : activePanel));
  const setResearchPanelOpen = (val: boolean) => setActivePanel(val ? "research" : (activePanel === "research" ? null : activePanel));
  const setWorkspacePanelOpen = (val: boolean) => setActivePanel(val ? "workspace" : (activePanel === "workspace" ? null : activePanel));

  const [aiContextData, setAiContextData] = useState<AIContextData | null>(null);
  const getCurrentFileContentRef = useRef<() => string>(() => "");
  const applyAIFixRef = useRef<(r: string, s: number, e: number) => void>(() => {});
  const [activeSelection, setActiveSelection] = useState<string>("");

  const [bibFiles, setBibFiles] = useState<BibFileContent[]>(initialBibFiles);
  const [researchFiles, setResearchFiles] = useState<{ path: string, content: string }[]>(initialResearchFiles);
  const [localDocumentIndex, setLocalDocumentIndex] = useState<any>(null);
  
  const projectBibIndex = useMemo(() => {
    const allBibContent = bibFiles.map(f => f.content).join("\n\n");
    return new BibliographyIndex(allBibContent);
  }, [bibFiles]);

  const workspaceIntelligence = useMemo(() => {
    return WorkspaceIntelligence.analyze(researchFiles, projectBibIndex);
  }, [researchFiles, projectBibIndex]);

  useEffect(() => {
    const initResearchIndex = async () => {
      const { DocumentExtractor } = await import("@/lib/research/extractor");
      const { LocalDocumentIndex } = await import("@/lib/research/index");
      const { getEmbeddingProvider } = await import("@/lib/ai/embedding");
      
      const extractor = new DocumentExtractor();
      const embeddingProvider = getEmbeddingProvider();
      const index = new LocalDocumentIndex(embeddingProvider);
      
      // We assume projectId is 'local' or just pass an empty string for the local client context
      let allChunks: any[] = [];
      for (const file of initialResearchFiles) {
        const chunks = extractor.extract("current-project", file.path, file.content);
        allChunks = allChunks.concat(chunks);
      }
      
      await index.indexProject("current-project", allChunks);
      setLocalDocumentIndex(index);
    };
    
    initResearchIndex();
  }, []);

  return (
    <EditorContext.Provider 
      value={{ 
        pdfUrl, setPdfUrl, 
        isCompiling, setIsCompiling, 
        compileStatus, setCompileStatus,
        logs, setLogs, 
        compileError, setCompileError,
        aiPanelOpen, setAiPanelOpen,
        bibliographyPanelOpen, setBibliographyPanelOpen,
        aiContextData, setAiContextData,
        getCurrentFileContent: () => getCurrentFileContentRef.current(),
        setGetCurrentFileContent: (fn: () => string) => { getCurrentFileContentRef.current = fn; },
        applyAIFix: (r, s, e) => applyAIFixRef.current(r, s, e),
        setApplyAIFix: (fn: (r: string, s: number, e: number) => void) => { applyAIFixRef.current = fn; },
        activeSelection, setActiveSelection,
        bibFiles, setBibFiles,
        projectBibIndex,
        researchPanelOpen, setResearchPanelOpen,
        workspacePanelOpen, setWorkspacePanelOpen,
        researchFiles, setResearchFiles,
        localDocumentIndex,
        workspaceIntelligence
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorState() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorState must be used within EditorProvider");
  return ctx;
}
