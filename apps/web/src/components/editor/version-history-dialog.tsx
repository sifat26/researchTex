"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getVersionsAction, restoreVersionAction, createVersionAction } from "@/app/actions/versions";
import { VersionDiffViewer } from "./version-diff-viewer";
import { Input } from "@/components/ui/input";

interface VersionHistoryDialogProps {
  projectId: string;
  path: string;
  getCurrentContent: () => string;
}

export function VersionHistoryDialog({ projectId, path, getCurrentContent }: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [versionMessage, setVersionMessage] = useState("");
  const [liveContent, setLiveContent] = useState("");

  useEffect(() => {
    if (open && path) {
      loadVersions();
      setLiveContent(getCurrentContent());
    }
  }, [open, path, getCurrentContent]);

  async function loadVersions() {
    try {
      setLoading(true);
      const data = await getVersionsAction(projectId, path);
      setVersions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createVersionAction(projectId, path, versionMessage);
      if (res.duplicated && !versionMessage) {
        alert("This version is identical to the last one. Provide a message to force creation.");
      } else {
        setVersionMessage("");
        await loadVersions();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create version");
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!confirm("Are you sure you want to restore this version? This will overwrite the current document for all collaborators.")) {
      return;
    }
    
    try {
      await restoreVersionAction(projectId, path, versionId);
      setSelectedVersion(null);
      await loadVersions();
      setOpen(false); // Close dialog so they can see the restored editor
    } catch (err: any) {
      alert(err.message || "Failed to restore version");
    }
  }

  // Hide version history for binary files (we don't pass currentContent if it's binary, or we just rely on the prop)
  if (!path || /\.(png|jpe?g|webp|svg|pdf)$/i.test(path)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => {
      setOpen(val);
      if (!val) setSelectedVersion(null);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs font-normal gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History - {path}</DialogTitle>
          <DialogDescription>
            View past versions, compare changes, and restore previous states.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden mt-4">
          {/* Sidebar list of versions */}
          <div className="w-64 border-r border-border pr-4 flex flex-col gap-4 overflow-y-auto">
            <form onSubmit={handleCreateVersion} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-md border border-border">
              <span className="text-xs font-medium">Create Manual Version</span>
              <Input 
                placeholder="Optional message..." 
                className="h-8 text-xs" 
                value={versionMessage}
                onChange={(e: any) => setVersionMessage(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={creating} className="h-8 text-xs">
                {creating ? "Saving..." : "Save Version"}
              </Button>
            </form>

            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : versions.length === 0 ? (
                <div className="text-xs text-muted-foreground">No versions found.</div>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`flex flex-col items-start gap-1 p-3 text-left rounded-md transition-colors border ${
                      selectedVersion?.id === v.id ? "bg-muted border-border" : "hover:bg-muted/50 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold truncate">{v.authorName || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                    {v.message && (
                      <span className="text-xs text-foreground mt-1 truncate w-full">
                        {v.message}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Diff Viewer Pane */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedVersion ? (
              <div className="flex flex-col h-full gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Viewing Version</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedVersion.createdAt).toLocaleString()} by {selectedVersion.authorName || "Unknown"}
                    </span>
                  </div>
                  <Button variant="default" size="sm" onClick={() => handleRestore(selectedVersion.id)}>
                    Restore this version
                  </Button>
                </div>
                <VersionDiffViewer 
                  currentContent={liveContent} 
                  historicalContent={selectedVersion.content} 
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Select a version to preview changes
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
