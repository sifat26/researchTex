"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LocalCompilerClient } from "@/lib/compiler/local-compiler-client";
import { useEditorState } from "./editor-context";
import { v4 as uuidv4 } from "uuid";
import type { CompilerEngine } from "@researchtex/types";

export function CompilerControls({ projectId, rootFile }: { projectId: string; rootFile: string }) {
  const { 
    isCompiling, setIsCompiling, 
    compileStatus, setCompileStatus,
    setPdfUrl, setLogs, 
    setCompileError 
  } = useEditorState();
  
  const [isAgentConnected, setIsAgentConnected] = useState<boolean | null>(null);
  const [engine, setEngine] = useState<CompilerEngine>("pdflatex");
  const clientRef = useRef(new LocalCompilerClient(projectId));
  const currentJobIdRef = useRef<string | null>(null);
  // Track current blob URL so we can revoke it before creating a new one (prevents memory leaks)
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const health = await clientRef.current.health();
        if (mounted) {
          setIsAgentConnected(health.isRunning);
        }
      } catch (err) {
        if (mounted) setIsAgentConnected(false);
      }
    }
    
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Ctrl+Enter global shortcut to compile (Overleaf-style)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isCompiling) {
        e.preventDefault();
        handleCompile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompiling, isAgentConnected]);

  const handleCompile = async () => {
    if (!isAgentConnected) {
      setCompileError("ResearchTex Compiler Agent is not running. Please start the ResearchTex desktop agent and try again.");
      return;
    }

    setIsCompiling(true);
    setCompileStatus("compiling");
    setCompileError(null);
    setLogs([]);
    
    const jobId = uuidv4();
    currentJobIdRef.current = jobId;
    
    try {
      const result = await clientRef.current.compile({
        jobId,
        rootFile,
        engine,
        runBib: true,
      });

      // Prevent race conditions: ignore response if a newer compile has started or this one was cancelled
      if (currentJobIdRef.current !== jobId) {
        return;
      }

      setLogs(result.logEntries || []);

      if (result.status === "success" && result.pdfBase64) {
        // Convert base64 to Blob URL
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        
        // Revoke previous blob URL to prevent memory leak
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrlRef.current = blobUrl;
        setPdfUrl(blobUrl);
        setCompileStatus("success");
      } else {
        // Show the first error from log entries if available, otherwise a generic message
        const firstError = result.logEntries?.find(e => e.level === "error");
        setCompileError(firstError?.message || "Compilation failed. Check the log panel for details.");
        setCompileStatus("error");
      }
    } catch (err: any) {
      if (currentJobIdRef.current === jobId) {
        setCompileError(err.message || "An unknown error occurred during compilation.");
        setCompileStatus("error");
      }
    } finally {
      if (currentJobIdRef.current === jobId) {
        setIsCompiling(false);
        // Note: compileStatus is left at success/error, not idle
        currentJobIdRef.current = null;
      }
    }
  };

  const handleCancel = async () => {
    if (currentJobIdRef.current) {
      try {
        const jobIdToCancel = currentJobIdRef.current;
        currentJobIdRef.current = null; // Immediately clear so incoming responses are ignored
        setIsCompiling(false);
        setCompileStatus("cancelled");
        setCompileError("Compilation cancelled.");
        await clientRef.current.cancel(jobIdToCancel);
      } catch (e) {
        console.error("Cancel failed", e);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Health Indicator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            isAgentConnected === null ? "bg-yellow-500 animate-pulse" :
            isAgentConnected ? "bg-green-500" : "bg-red-500"
          }`} 
        />
        {isAgentConnected === null ? "Checking..." : isAgentConnected ? "Compiler Connected" : "Compiler Offline"}
      </div>

      {/* Engine Selector */}
      <select 
        className="text-xs bg-background border border-border rounded px-2 h-8 outline-none"
        value={engine}
        onChange={(e) => setEngine(e.target.value as CompilerEngine)}
        disabled={isCompiling}
      >
        <option value="pdflatex">pdfLaTeX</option>
        <option value="xelatex">XeLaTeX</option>
        <option value="lualatex">LuaLaTeX</option>
      </select>

      {/* Compile / Cancel Button */}
      {isCompiling ? (
        <Button size="sm" variant="destructive" className="h-8 text-xs font-normal w-24" onClick={handleCancel}>
          Cancel
        </Button>
      ) : (
        <Button size="sm" className="h-8 text-xs font-normal w-24" onClick={handleCompile} title="Compile (Ctrl+Enter)">
          Compile
        </Button>
      )}
    </div>
  );
}
