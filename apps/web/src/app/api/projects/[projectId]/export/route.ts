import { NextResponse } from "next/server";
import JSZip from "jszip";
import { FileService } from "@/services/file.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
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

    for (const f of allFiles) {
      if (f.isDirectory) {
        zip.folder(f.path);
      } else {
        const content = await FileService.readFile(projectId, f.path);
        if (content !== null) {
          if (f.isBinary) {
            // content is Base64 string, so we pass it to jszip and tell it it's base64
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
        "Content-Disposition": `attachment; filename="project-${projectId}.zip"`,
      },
    });
  } catch (error) {
    console.error("Failed to export ZIP:", error);
    return new NextResponse("Failed to export ZIP", { status: 500 });
  }
}
