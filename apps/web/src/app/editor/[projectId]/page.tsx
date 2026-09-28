import * as React from "react";
import { TopToolbar } from "@/components/layout/top-toolbar";
import { ProjectService } from "@/services/project.service";
import { FileService } from "@/services/file.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CodeEditor } from "@/components/editor/code-editor";
import { EditorProvider } from "@/components/editor/editor-context";
import { PdfPreviewPane } from "@/components/editor/pdf-preview-pane";
import { FileExplorerActions } from "@/components/editor/file-explorer-actions";
import { AIAssistantPanel } from "@/components/editor/ai-assistant-panel";
import { BibliographyPanel } from "@/components/editor/bibliography-panel";
import { ResearchPanel } from "@/components/editor/research-panel";
import { WorkspacePanel } from "@/components/editor/workspace-panel";
import type { FileTreeNode } from "@researchtex/types";

function renderTree(nodes: readonly FileTreeNode[], projectId: string, currentFile: string | undefined, level = 0) {
  return (
    <div className="flex flex-col w-full">
      {nodes.map((node) => (
        <div key={node.path}>
          {node.isDirectory ? (
            <div className="w-full">
              <div 
                className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 cursor-pointer"
                style={{ paddingLeft: `${level * 12 + 8}px` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                {node.name}
              </div>
              {node.children && renderTree(node.children, projectId, currentFile, level + 1)}
            </div>
          ) : (
            <Link 
              href={`/editor/${projectId}?file=${encodeURIComponent(node.path)}`}
              className={`flex items-center gap-2 py-1.5 text-sm hover:bg-muted/50 transition-colors overflow-hidden ${
                currentFile === node.path ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
              }`}
              style={{ paddingLeft: `${level * 12 + 24}px`, paddingRight: '8px' }}
            >
              <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="truncate min-w-0">{node.name}</span>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

import { requireAuth, createCollabToken, requireProjectAccess } from "@/lib/auth";

export default async function EditorPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  const { projectId } = await params;
  const { file: selectedFile } = await searchParams;

  const session = await requireAuth();
  await requireProjectAccess(projectId);
  
  const collabToken = await createCollabToken(projectId);

  const project = await ProjectService.getProject(projectId);
  if (!project) {
    notFound();
  }

  const fileTree = await FileService.getFileTree(projectId);
  let fileContent = null;

  const displayFile = selectedFile || project.rootFile;
  const isBinary = /\.(png|jpe?g|webp|svg|pdf)$/i.test(displayFile);

  if (selectedFile && !isBinary) {
    fileContent = await FileService.readFile(projectId, selectedFile);
  } else if (!selectedFile && !isBinary) {
    // default to rootFile if not specified
    fileContent = await FileService.readFile(projectId, project.rootFile);
  }

  // Load all .bib files for BibliographyIndex and research files for LocalDocumentIndex
  const bibFiles: { path: string, content: string }[] = [];
  const researchFiles: { path: string, content: string }[] = [];
  
  const findFiles = async (nodes: readonly FileTreeNode[]) => {
    for (const node of nodes) {
      if (node.isDirectory && node.children) {
        await findFiles(node.children);
      } else {
        const ext = node.path.split('.').pop()?.toLowerCase();
        if (ext === 'bib') {
          const content = await FileService.readFile(projectId, node.path);
          if (content) bibFiles.push({ path: node.path, content });
        }
        if (['tex', 'bib', 'md', 'txt'].includes(ext || '')) {
          const content = await FileService.readFile(projectId, node.path);
          if (content) researchFiles.push({ path: node.path, content });
        }
      }
    }
  };
  await findFiles(fileTree);

  return (
    <EditorProvider initialBibFiles={bibFiles} initialResearchFiles={researchFiles}>
      <TopToolbar projectName={project.name} projectId={projectId} rootFile={displayFile.endsWith('.tex') ? displayFile : project.rootFile} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer Pane */}
        <aside className="w-64 flex-shrink-0 border-r border-border bg-muted/10 hidden md:flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files</span>
            <div className="flex gap-1">
               <FileExplorerActions projectId={projectId} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {renderTree(fileTree, projectId, displayFile)}
          </div>
        </aside>

        {/* Editor Pane */}
        <main className="flex-1 flex flex-col border-r border-border relative bg-background">
          {isBinary ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-background">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-border"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <h3 className="text-lg font-medium text-foreground mb-1">Binary file</h3>
              <p className="text-sm max-w-sm">This file type cannot be opened in the text editor.</p>
            </div>
          ) : fileContent !== null ? (
            <CodeEditor 
              key={displayFile} 
              projectId={projectId} 
              path={displayFile} 
              initialContent={fileContent} 
              collabToken={collabToken}
              user={{ name: session.name }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-border"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              <h3 className="text-lg font-medium text-foreground mb-1">No file selected</h3>
              <p className="text-sm max-w-sm">Select a file from the explorer to view its contents.</p>
            </div>
          )}
        </main>

        {/* PDF Preview Pane */}
        <PdfPreviewPane />
        
        {/* Bibliography Panel */}
        <BibliographyPanel projectId={projectId} />

        {/* Research Panel */}
        <ResearchPanel projectId={projectId} />

        {/* Workspace Panel */}
        <WorkspacePanel />

        {/* AI Assistant Panel (Overlays on the right) */}
        {fileContent !== null && (
          <AIAssistantPanel projectId={projectId} currentFile={displayFile} />
        )}
      </div>
    </EditorProvider>
  );
}
