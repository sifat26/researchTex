"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { uploadFileAction } from "@/actions/file.actions";

export function FileExplorerActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await uploadFileAction(projectId, file.name, formData);
      if (res.success) {
        router.refresh();
      } else {
        alert("Upload failed: " + res.error);
      }
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportZip = () => {
    window.open(`/api/projects/${projectId}/export`, "_blank");
  };

  return (
    <div className="flex gap-1">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <button 
        title="Upload File"
        onClick={handleUploadClick}
        disabled={isUploading}
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </button>
      <button 
        title="Export ZIP"
        onClick={handleExportZip}
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    </div>
  );
}
