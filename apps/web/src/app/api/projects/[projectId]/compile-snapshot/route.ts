import { NextResponse } from "next/server";
import JSZip from "jszip";
import { FileService } from "@/services/file.service";
import { requireProjectAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Require EDITOR access
    await requireProjectAccess(projectId, "EDITOR");
    
    // Flush Collab server
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
      console.error('Failed to flush collaboration server before compile snapshot:', err);
    }
    
    // Fetch all files
    const fileTree = await FileService.getFileTree(projectId);
    
    const flattenTree = (nodes: any[], currentPath: string = "") => {
      let flat: { path: string; isDirectory: boolean; isBinary?: boolean }[] = [];
      for (const node of nodes) {
        flat.push({ 
          path: node.path, 
          isDirectory: node.isDirectory,
          isBinary: node.isBinary
        });
        if (node.children) {
          flat = flat.concat(flattenTree(node.children, node.path));
        }
      }
      return flat;
    };
    
    const allFiles = flattenTree(fileTree);
    const zip = new JSZip();
    
    const maxProjectSize = parseInt(process.env.MAX_COMPILE_PROJECT_SIZE || "52428800", 10); // 50 MB
    const maxFileSize = parseInt(process.env.MAX_COMPILE_FILE_SIZE || "20971520", 10); // 20 MB
    let currentProjectSize = 0;

    for (const f of allFiles) {
      if (f.isDirectory) {
        zip.folder(f.path);
      } else {
        const content = await FileService.readFile(projectId, f.path);
        if (content !== null) {
          const bytes = f.isBinary ? Math.ceil(content.length * 3 / 4) : Buffer.byteLength(content, 'utf8');
          if (bytes > maxFileSize) {
             return NextResponse.json({ error: `File ${f.path} is ${(bytes / 1024 / 1024).toFixed(1)} MB. Maximum allowed file size is ${(maxFileSize / 1024 / 1024).toFixed(1)} MB.` }, { status: 413 });
          }
          currentProjectSize += bytes;
          if (currentProjectSize > maxProjectSize) {
             return NextResponse.json({ error: `Project size: ${(currentProjectSize / 1024 / 1024).toFixed(1)} MB. Maximum allowed: ${(maxProjectSize / 1024 / 1024).toFixed(1)} MB.` }, { status: 413 });
          }

          if (f.isBinary) {
            zip.file(f.path, content, { base64: true });
          } else {
            zip.file(f.path, content);
          }
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
      },
    });
  } catch (error: any) {
    console.error("Failed to generate compile snapshot:", error);
    return NextResponse.json({ error: error.message || "Failed to generate compile snapshot" }, { status: 500 });
  }
}
