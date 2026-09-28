"use server";

import JSZip from "jszip";
import { ProjectService } from "@/services/project.service";
import { FileService } from "@/services/file.service";
import { isBinaryFile } from "@/lib/file-utils";

import { requireAuth } from "@/lib/auth";

/**
 * Validates a file path to ensure it doesn't contain traversal attempts or absolute paths.
 */
function isValidPath(filePath: string): boolean {
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/")) return false;
  if (filePath.startsWith("\\")) return false;
  if (/^[a-zA-Z]:/.test(filePath)) return false; // Windows drive letters
  return true;
}

export async function importProjectZipAction(formData: FormData): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const session = await requireAuth() as any;
    const ownerId = session.user.id as string;

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Validate all paths first
    for (const relativePath of Object.keys(zip.files)) {
      if (!isValidPath(relativePath)) {
        return { success: false, error: `Invalid or unsafe path in ZIP: ${relativePath}` };
      }
    }

    // Determine project name from zip file name
    const projectName = file.name.replace(/\.zip$/i, "");
    
    // Determine if all files are inside a single top-level directory
    let commonPrefix = "";
    const allPaths = Object.keys(zip.files).filter(p => !zip.files[p]?.dir);
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

    // Find a sensible root file
    let rootFile = "main.tex";
    const texFiles = allPaths
      .filter(p => p.endsWith(".tex"))
      .map(p => commonPrefix ? p.slice(commonPrefix.length) : p);
      
    if (texFiles.length > 0) {
      if (texFiles.includes("main.tex")) {
        rootFile = "main.tex";
      } else {
        const rootTexFiles = texFiles.filter(p => !p.includes("/"));
        if (rootTexFiles.length > 0 && rootTexFiles[0]) {
          rootFile = rootTexFiles[0];
        } else if (texFiles[0]) {
          rootFile = texFiles[0];
        }
      }
    }

    // Create the project (this also creates a default main.tex which we'll overwrite or delete)
    const project = await ProjectService.createProject({
      name: projectName,
      rootFile: rootFile,
      ownerId: ownerId,
    });

    // Delete the default main.tex
    await FileService.deleteFile(project.id, "main.tex");

    // Write all files
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      let cleanPath = relativePath;
      if (commonPrefix && cleanPath.startsWith(commonPrefix)) {
        cleanPath = cleanPath.slice(commonPrefix.length);
      }
      
      if (!cleanPath) continue;
      
      // We skip explicit folder creation since FileService.writeFile creates parents automatically
      
      const isBinary = isBinaryFile(cleanPath);
      
      let content = "";
      if (isBinary) {
        content = await zipEntry.async("base64");
      } else {
        content = await zipEntry.async("string");
      }

      const extension = cleanPath.split(".").pop()?.toLowerCase() || "other";
      
      await FileService.writeFile(
        project.id,
        cleanPath,
        content,
        extension,
        isBinary
      );
    }

    return { success: true, projectId: project.id };
  } catch (error: any) {
    console.error("Failed to import ZIP:", error);
    return { success: false, error: error.message || "Failed to import ZIP" };
  }
}
