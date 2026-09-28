"use server";

import { FileService } from "@/services/file.service";
import { isBinaryFile } from "@/lib/file-utils";

import JSZip from "jszip";

/**
 * Validates a file path to ensure it doesn't contain traversal attempts or absolute paths.
 */
function isValidPath(filePath: string): boolean {
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/") || filePath.startsWith("\\")) return false;
  if (/^[a-zA-Z]:/.test(filePath)) return false; // Windows drive letters
  return true;
}

export async function uploadFileAction(projectId: string, path: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidPath(path)) {
      throw new Error("Invalid path");
    }

    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = path.split(".").pop()?.toLowerCase() || "other";

    if (extension === "zip") {
      const zip = await JSZip.loadAsync(buffer);
      
      // Determine the base directory for extraction based on where the zip was uploaded
      const pathParts = path.split("/");
      pathParts.pop(); // remove the .zip filename
      const baseDir = pathParts.length > 0 ? pathParts.join("/") + "/" : "";
      
      const filePromises: Promise<any>[] = [];
      
      // Determine if all files are inside a single top-level directory
      let commonPrefix = "";
      const allPaths: string[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) allPaths.push(relativePath);
      });
      
      if (allPaths.length > 0) {
        const firstPath = allPaths[0]!;
        const firstPathParts = firstPath.split("/");
        if (firstPathParts.length > 1) {
          const potentialPrefix = firstPathParts[0] + "/";
          const allMatch = allPaths.every(p => p.startsWith(potentialPrefix));
          if (allMatch) {
            commonPrefix = potentialPrefix;
          }
        }
      }

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return; // Skip directories, we create them implicitly
        
        let cleanPath = relativePath;
        if (commonPrefix && cleanPath.startsWith(commonPrefix)) {
          cleanPath = cleanPath.slice(commonPrefix.length);
        }
        
        if (!cleanPath) return;

        // Ensure path is valid and clean
        const fullPath = baseDir + cleanPath;
        if (!isValidPath(fullPath)) return;
        
        filePromises.push(
          zipEntry.async("nodebuffer").then(async (entryBuffer) => {
            const entryIsBinary = isBinaryFile(fullPath);
            const content = entryIsBinary ? entryBuffer.toString("base64") : entryBuffer.toString("utf8");
            const entryExt = fullPath.split(".").pop()?.toLowerCase() || "other";
            await FileService.writeFile(projectId, fullPath, content, entryExt, entryIsBinary);
            
            // Hot-update the collaboration server if it's a text file
            if (!entryIsBinary) {
              await notifyCollabServer(projectId, fullPath, content);
            }
          })
        );
      });
      
      await Promise.all(filePromises);
    } else {
      const isBinary = isBinaryFile(path);
      const content = isBinary ? buffer.toString("base64") : buffer.toString("utf8");
      
      await FileService.writeFile(projectId, path, content, extension, isBinary);
      if (!isBinary) {
        await notifyCollabServer(projectId, path, content);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function notifyCollabServer(projectId: string, path: string, content: string) {
  try {
    const collabUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL 
      ? process.env.NEXT_PUBLIC_COLLABORATION_URL.replace('ws://', 'http://').replace('wss://', 'https://')
      : 'http://localhost:1234';
      
    await fetch(`${collabUrl}/collaboration/project/${projectId}/file/${encodeURIComponent(path)}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY || 'development_secret_key'
      },
      body: JSON.stringify({ content })
    });
  } catch (err) {
    console.error('Failed to notify collab server:', err);
  }
}

export async function deleteFileAction(projectId: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidPath(path)) throw new Error("Invalid path");
    await FileService.deleteFile(projectId, path);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createFolderAction(projectId: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidPath(path)) throw new Error("Invalid path");
    await FileService.createDirectory(projectId, path);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function renameFileAction(projectId: string, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidPath(oldPath) || !isValidPath(newPath)) throw new Error("Invalid path");
    
    const content = await FileService.readFile(projectId, oldPath);
    if (content === null) throw new Error("File not found");
    
    const isBinary = isBinaryFile(oldPath); // Assume new path has same binary semantics or we just copy as is
    const extension = newPath.split(".").pop()?.toLowerCase() || "other";
    
    await FileService.writeFile(projectId, newPath, content, extension, isBinary);
    await FileService.deleteFile(projectId, oldPath);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
