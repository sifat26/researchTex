"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { importProjectZipAction } from "@/actions/project.actions";

export function ImportProjectForm() {
  const [isPending, setIsPending] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await importProjectZipAction(formData);
      if (res.success && res.projectId) {
        router.push(`/editor/${res.projectId}`);
      } else {
        alert(res.error || "Failed to import ZIP");
      }
    } catch (err: any) {
      alert("Import failed: " + err.message);
    } finally {
      setIsPending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".zip" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <button 
        type="button"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        {isPending ? "Importing..." : "Import ZIP"}
      </button>
    </div>
  );
}
