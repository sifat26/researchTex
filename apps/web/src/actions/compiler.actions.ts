"use server";

import { FileService } from "@/services/file.service";
import type { CompileRequestFile } from "@researchtex/types";
import { requireProjectAccess } from "@/lib/auth";

/**
 * Retrieves a flat array of all project files and their text contents from the DB.
 */
export async function getProjectSnapshot(projectId: string): Promise<CompileRequestFile[]> {
  // Phase 9 Auth: Must have at least EDITOR rights to take a snapshot for compilation
  await requireProjectAccess(projectId, "EDITOR");

  // Phase 8: Force the collaboration server to flush any pending Yjs updates
  // to PostgreSQL before we read the snapshot.
  try {
    const collabUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL 
      ? process.env.NEXT_PUBLIC_COLLABORATION_URL.replace('ws://', 'http://').replace('wss://', 'https://')
      : 'http://localhost:1234';
      
    await fetch(`${collabUrl}/collaboration/project/${projectId}/flush`, {
      method: 'POST',
      headers: {
        'x-internal-api-key': process.env.INTERNAL_API_KEY || 'development_secret_key'
      }
    });
  } catch (err) {
    console.error('Failed to flush collaboration server before snapshot:', err);
    // Continue anyway in case collab server is offline but we have local state
  }

  const fileTree = await FileService.getFileTree(projectId);
  
  const flattenTree = (nodes: any[], currentPath: string = "") => {
    let flat: { path: string; isDirectory: boolean; isBinary?: boolean }[] = [];
    for (const node of nodes) {
      flat.push({ path: node.path, isDirectory: node.isDirectory, isBinary: node.isBinary });
      if (node.children) {
        flat = flat.concat(flattenTree(node.children, node.path));
      }
    }
    return flat;
  };
  
  const allFiles = flattenTree(fileTree);
  const snapshot: CompileRequestFile[] = [];
  
  const maxProjectSize = parseInt(process.env.MAX_COMPILE_PROJECT_SIZE || "52428800", 10); // 50 MB
  const maxFileSize = parseInt(process.env.MAX_COMPILE_FILE_SIZE || "20971520", 10); // 20 MB
  let currentProjectSize = 0;
  
  for (const f of allFiles) {
    if (!f.isDirectory) {
      const content = await FileService.readFile(projectId, f.path);
      if (content !== null) {
        // Approximate bytes (utf8 string or base64)
        const bytes = f.isBinary ? Math.ceil(content.length * 3 / 4) : Buffer.byteLength(content, 'utf8');
        
        if (bytes > maxFileSize) {
          throw new Error(`File ${f.path} is ${(bytes / 1024 / 1024).toFixed(1)} MB. Maximum allowed file size is ${(maxFileSize / 1024 / 1024).toFixed(1)} MB.`);
        }
        
        currentProjectSize += bytes;
        if (currentProjectSize > maxProjectSize) {
          throw new Error(`Project size: ${(currentProjectSize / 1024 / 1024).toFixed(1)} MB. Maximum allowed: ${(maxProjectSize / 1024 / 1024).toFixed(1)} MB.`);
        }
        
        snapshot.push({
          path: f.path,
          content,
          isBinary: f.isBinary || false,
        });
      }
    }
  }
  
  return snapshot;
}
