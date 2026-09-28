import { db } from "@/db";
import { files } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { FileEntry, FileTreeNode, FileType } from "@researchtex/types";

export class FileService {
  /**
   * List all files and folders at a specific directory path within a project.
   */
  static async listFiles(projectId: string, dirPath: string = ""): Promise<FileEntry[]> {
    // Basic implementation: fetch all files for project and build tree, or fetch specifically.
    // For Phase 2 simplicity, since file trees are usually small in LaTeX projects,
    // fetching all metadata for a project is highly efficient.
    const allFiles = await db
      .select({
        id: files.id,
        parentId: files.parentId,
        path: files.path,
        name: files.name,
        type: files.type,
        fileType: files.fileType,
        sizeBytes: files.sizeBytes,
        isBinary: files.isBinary,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(eq(files.projectId, projectId));

    // To just get immediate children of dirPath, we could do SQL filtering,
    // but building the tree in memory is fine for Phase 2 bounds.
    return allFiles
      .filter((f) => {
        if (dirPath === "" || dirPath === "/") {
          return f.parentId === null;
        }
        const parent = allFiles.find((p) => p.path === dirPath);
        return parent && f.parentId === parent.id;
      })
      .map((f) => ({
        path: f.path,
        name: f.name,
        type: f.fileType as FileType,
        isDirectory: f.type === "folder",
        isBinary: f.isBinary,
        sizeBytes: f.sizeBytes ?? undefined,
        updatedAt: f.updatedAt,
      }));
  }

  /**
   * Get the full tree (nested) for a project.
   */
  static async getFileTree(projectId: string): Promise<FileTreeNode[]> {
    const allFiles = await db
      .select({
        id: files.id,
        parentId: files.parentId,
        path: files.path,
        name: files.name,
        type: files.type,
        fileType: files.fileType,
        sizeBytes: files.sizeBytes,
        isBinary: files.isBinary,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(eq(files.projectId, projectId));

    const buildNode = (f: typeof allFiles[0]): FileTreeNode => {
      const children = allFiles.filter((child) => child.parentId === f.id);
      return {
        path: f.path,
        name: f.name,
        type: f.fileType as FileType,
        isDirectory: f.type === "folder",
        isBinary: f.isBinary,
        sizeBytes: f.sizeBytes ?? undefined,
        updatedAt: f.updatedAt,
        ...(f.type === "folder" ? { children: children.map(buildNode) } : {}),
      };
    };

    return allFiles.filter((f) => f.parentId === null).map(buildNode);
  }

  /**
   * Read raw file content.
   */
  static async readFile(projectId: string, path: string): Promise<string | null> {
    const [file] = await db
      .select({ content: files.content, isBinary: files.isBinary })
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, path)));

    return file?.content ?? null;
  }

  /**
   * Create or update a file.
   */
  static async writeFile(
    projectId: string,
    path: string,
    content: string,
    fileType: string = "other",
    isBinary: boolean = false
  ): Promise<void> {
    // Determine parent path and name
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) throw new Error("Invalid path");

    const name = parts[parts.length - 1]!;
    let parentId: string | null = null;

    // Create parent folders if they don't exist
    if (parts.length > 1) {
      let currentPath = "";
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i]!;
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let [folder] = await db
          .select()
          .from(files)
          .where(and(eq(files.projectId, projectId), eq(files.path, currentPath)));

        if (!folder) {
          [folder] = await db
            .insert(files)
            .values({
              projectId,
              parentId: parentId ?? null,
              name: folderName,
              path: currentPath,
              type: "folder",
              fileType: "other",
            })
            .returning();
        }
        parentId = folder!.id;
      }
    }

    // Check if file exists
    const [existingFile] = await db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, path)));

    if (existingFile) {
      await db
        .update(files)
        .set({
          content,
          sizeBytes: isBinary ? Buffer.from(content, "base64").length : Buffer.byteLength(content, "utf8"),
          isBinary,
          updatedAt: new Date(),
        })
        .where(eq(files.id, existingFile.id));
    } else {
      await db.insert(files).values({
        projectId,
        parentId: parentId ?? null,
        name,
        path,
        type: "file",
        fileType,
        content,
        isBinary,
        sizeBytes: isBinary ? Buffer.from(content, "base64").length : Buffer.byteLength(content, "utf8"),
      });
    }
  }

  /**
   * Delete a file or empty directory.
   */
  static async deleteFile(projectId: string, path: string): Promise<void> {
    await db.delete(files).where(and(eq(files.projectId, projectId), eq(files.path, path)));
  }

  /**
   * Delete a directory recursively.
   */
  static async deleteDirectory(projectId: string, path: string): Promise<void> {
    // Delete the directory itself, cascade delete takes care of the children if we used proper FKs
    // But since path isn't cascade via FK natively across the tree perfectly (only direct parent),
    // we should use a LIKE query to delete all files where path starts with dirPath/
    await db.delete(files).where(and(eq(files.projectId, projectId), like(files.path, `${path}/%`)));
    await db.delete(files).where(and(eq(files.projectId, projectId), eq(files.path, path)));
  }

  /**
   * Create an empty directory.
   */
  static async createDirectory(projectId: string, path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) throw new Error("Invalid path");

    let currentPath = "";
    let parentId: string | null = null;

    for (let i = 0; i < parts.length; i++) {
      const folderName = parts[i]!;
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      let [folder] = await db
        .select()
        .from(files)
        .where(and(eq(files.projectId, projectId), eq(files.path, currentPath)));

      if (!folder) {
        [folder] = await db
          .insert(files)
          .values({
            projectId,
            parentId: parentId ?? null,
            name: folderName,
            path: currentPath,
            type: "folder",
            fileType: "other",
          })
          .returning();
      }
      parentId = folder!.id;
    }
  }
}
