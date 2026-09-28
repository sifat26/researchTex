import { FileService } from "./file.service";
import {
  StorageProvider,
  FileNotFoundError,
  PathTraversalError,
} from "@researchtex/types";
import type { FileEntry } from "@researchtex/types";

/**
 * StorageProvider implementation using the Database (Phase 2).
 * Fulfills the requirement to leave room for binary/cloud storage later.
 */
export class DatabaseStorageProvider implements StorageProvider {
  private validatePath(path: string) {
    if (path.includes("../") || path.startsWith("/") || path.includes("..\\")) {
      throw new PathTraversalError(path);
    }
  }

  async readFile(projectId: string, path: string): Promise<Uint8Array> {
    this.validatePath(path);
    const content = await FileService.readFile(projectId, path);
    if (content === null) {
      throw new FileNotFoundError(projectId, path);
    }
    return new TextEncoder().encode(content);
  }

  async writeFile(
    projectId: string,
    path: string,
    data: Uint8Array
  ): Promise<void> {
    this.validatePath(path);
    const content = new TextDecoder().decode(data);
    await FileService.writeFile(projectId, path, content);
  }

  async listFiles(projectId: string, dirPath: string): Promise<FileEntry[]> {
    this.validatePath(dirPath);
    return FileService.listFiles(projectId, dirPath);
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    this.validatePath(path);
    await FileService.deleteFile(projectId, path);
  }

  async moveFile(
    projectId: string,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    this.validatePath(fromPath);
    this.validatePath(toPath);
    
    // Read old content
    const content = await FileService.readFile(projectId, fromPath);
    if (content === null) throw new FileNotFoundError(projectId, fromPath);

    // Write new content and delete old
    await FileService.writeFile(projectId, toPath, content);
    await FileService.deleteFile(projectId, fromPath);
  }

  async createDirectory(projectId: string, path: string): Promise<void> {
    this.validatePath(path);
    await FileService.createDirectory(projectId, path);
  }

  async deleteDirectory(projectId: string, path: string): Promise<void> {
    this.validatePath(path);
    await FileService.deleteDirectory(projectId, path);
  }
}
