"use client";

import React, { useState } from "react";
import { useEditorState } from "./editor-context";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, ChevronDown, ChevronRight, FileText, LayoutTemplate, Image as ImageIcon, Link as LinkIcon, BookOpen } from "lucide-react";

export function WorkspacePanel() {
  const { workspacePanelOpen, setWorkspacePanelOpen, workspaceIntelligence } = useEditorState();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    structure: true,
    assets: true,
    citations: true,
    labels: true
  });

  if (!workspacePanelOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openFileAndLine = (path: string, line: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("file", path);
    router.push(`${pathname}?${params.toString()}`);
    // A more advanced integration would jump CodeMirror to the exact line here
  };

  return (
    <div className="w-80 h-full border-l border-slate-700 bg-slate-900 flex flex-col text-slate-200 overflow-hidden shadow-xl shrink-0">
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-emerald-400" />
          Workspace Intelligence
        </h2>
        <button onClick={() => setWorkspacePanelOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!workspaceIntelligence ? (
          <div className="text-slate-400 text-sm text-center mt-10">
            Analyzing workspace...
          </div>
        ) : (
          <>
            {/* STRUCTURE */}
            <div className="space-y-2">
              <button onClick={() => toggleSection("structure")} className="flex items-center gap-2 font-medium text-sm text-slate-300 hover:text-white w-full text-left">
                {expandedSections.structure ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FileText className="w-4 h-4 text-blue-400" />
                Document Structure
              </button>
              {expandedSections.structure && (
                <div className="pl-6 space-y-1">
                  {workspaceIntelligence.structure.length === 0 ? (
                    <div className="text-xs text-slate-500">No sections found.</div>
                  ) : (
                    workspaceIntelligence.structure.map((node, i) => (
                      <div 
                        key={i} 
                        className={`text-xs cursor-pointer hover:text-blue-300 truncate py-0.5 ${node.type === 'section' ? 'font-semibold text-slate-200' : node.type === 'subsection' ? 'pl-2 text-slate-300' : 'pl-4 text-slate-400'}`}
                        onClick={() => openFileAndLine(node.file, node.line)}
                        title={`${node.file}:${node.line}`}
                      >
                        {node.title}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ASSETS */}
            <div className="space-y-2">
              <button onClick={() => toggleSection("assets")} className="flex items-center gap-2 font-medium text-sm text-slate-300 hover:text-white w-full text-left">
                {expandedSections.assets ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <ImageIcon className="w-4 h-4 text-purple-400" />
                Figures & Tables
              </button>
              {expandedSections.assets && (
                <div className="pl-6 space-y-2">
                  {workspaceIntelligence.assets.length === 0 ? (
                    <div className="text-xs text-slate-500">No assets found.</div>
                  ) : (
                    workspaceIntelligence.assets.map((asset, i) => (
                      <div 
                        key={i} 
                        className="text-xs cursor-pointer hover:bg-slate-800 p-1 rounded group"
                        onClick={() => openFileAndLine(asset.file, asset.line)}
                      >
                        <div className="font-medium text-slate-300 capitalize group-hover:text-purple-300">{asset.type}</div>
                        {asset.caption && <div className="text-slate-400 truncate mt-0.5">{asset.caption}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* CITATIONS */}
            <div className="space-y-2">
              <button onClick={() => toggleSection("citations")} className="flex items-center gap-2 font-medium text-sm text-slate-300 hover:text-white w-full text-left">
                {expandedSections.citations ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <BookOpen className="w-4 h-4 text-amber-400" />
                Bibliography Health
              </button>
              {expandedSections.citations && (
                <div className="pl-6 space-y-2 text-xs">
                  <div className="text-slate-300">
                    <span className="font-medium">{workspaceIntelligence.citations.length}</span> inline citations.
                  </div>
                  {workspaceIntelligence.unusedCitations.length > 0 && (
                    <div className="mt-2">
                      <div className="text-rose-400 font-medium mb-1">Unused References:</div>
                      <div className="flex flex-wrap gap-1">
                        {workspaceIntelligence.unusedCitations.map((key, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {workspaceIntelligence.unusedCitations.length === 0 && workspaceIntelligence.citations.length > 0 && (
                    <div className="text-emerald-400 mt-2">All bibliography items cited!</div>
                  )}
                </div>
              )}
            </div>

            {/* LABELS */}
            <div className="space-y-2">
              <button onClick={() => toggleSection("labels")} className="flex items-center gap-2 font-medium text-sm text-slate-300 hover:text-white w-full text-left">
                {expandedSections.labels ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <LinkIcon className="w-4 h-4 text-emerald-400" />
                Cross-References
              </button>
              {expandedSections.labels && (
                <div className="pl-6 space-y-2 text-xs">
                  <div className="text-slate-300">
                    <span className="font-medium">{workspaceIntelligence.labels.length}</span> labels, <span className="font-medium">{workspaceIntelligence.references.length}</span> refs.
                  </div>
                  {workspaceIntelligence.brokenRefs.length > 0 && (
                    <div className="mt-2">
                      <div className="text-rose-400 font-medium mb-1">Broken References:</div>
                      <div className="flex flex-wrap gap-1">
                        {workspaceIntelligence.brokenRefs.map((key, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-rose-950 border border-rose-900 rounded text-rose-300">
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
