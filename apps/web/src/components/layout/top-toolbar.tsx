"use client";

import * as React from "react";
import { Library } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CompilerControls } from "@/components/editor/compiler-controls";
import { ShareDialog } from "@/components/project/share-dialog";
import { SettingsDialog } from "@/components/editor/settings-dialog";
import { useEditorState } from "@/components/editor/editor-context";

interface TopToolbarProps extends React.HTMLAttributes<HTMLElement> {
  projectName: string;
  projectId: string;
  rootFile: string;
}

export function TopToolbar({ projectName, projectId, rootFile, className, ...props }: TopToolbarProps) {
  const { aiPanelOpen, setAiPanelOpen, bibliographyPanelOpen, setBibliographyPanelOpen, researchPanelOpen, setResearchPanelOpen, workspacePanelOpen, setWorkspacePanelOpen } = useEditorState();

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4 z-20",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span className="sr-only">Back to Dashboard</span>
        </Link>
        
        <div className="flex flex-col">
          <h1 className="text-sm font-medium leading-tight text-foreground">{projectName}</h1>
          <span className="text-[10px] text-muted-foreground">ResearchTex Editor</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SettingsDialog />
        <ShareDialog projectId={projectId} />
        <Button 
          variant={workspacePanelOpen ? "secondary" : "outline"} 
          size="sm" 
          className="h-8 text-xs font-normal gap-1.5"
          onClick={() => setWorkspacePanelOpen(!workspacePanelOpen)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
          Workspace
        </Button>
        <Button 
          variant={bibliographyPanelOpen ? "secondary" : "outline"} 
          size="sm" 
          className="h-8 text-xs font-normal gap-1.5"
          onClick={() => setBibliographyPanelOpen(!bibliographyPanelOpen)}
        >
          <Library className="w-3.5 h-3.5" />
          Bibliography
        </Button>
        <Button 
          variant={researchPanelOpen ? "secondary" : "outline"} 
          size="sm" 
          className="h-8 text-xs font-normal gap-1.5"
          onClick={() => setResearchPanelOpen(!researchPanelOpen)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          Research
        </Button>
        <Button 
          variant={aiPanelOpen ? "secondary" : "outline"} 
          size="sm" 
          className="h-8 text-xs font-normal gap-1.5"
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          AI Assistant
        </Button>
        <CompilerControls projectId={projectId} rootFile={rootFile} />
      </div>
    </header>
  );
}
