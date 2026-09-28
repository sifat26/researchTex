/**
 * StorageProvider interface (Phase 7+).
 *
 * Abstracts how project files are read and written, making it possible to
 * swap the storage backend without changing any project or editor logic.
 *
 * Planned implementations:
 *   - LocalStorageProvider  — server local filesystem (Phase 7)
 *   - CloudStorageProvider  — object storage / S3-compatible (Phase 7)
 *   - GoogleDriveProvider   — Google Drive API (Phase 8)
 *
 * All paths are POSIX-style relative paths from the project root.
 * Example valid path: "sections/introduction.tex"
 * Example invalid paths: "../secret", "/etc/passwd", "C:\\Windows"
 */

import type { FileEntry, ProjectId } from "./project.js";

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Provider-agnostic interface for reading and writing project files.
 * All implementations MUST validate paths to prevent directory traversal.
 */
export interface StorageProvider {
  /**
   * Read the raw bytes of a file.
   * @throws {FileNotFoundError} if the file does not exist.
   */
  readFile(projectId: ProjectId, path: string): Promise<Uint8Array>;

  /**
   * Write raw bytes to a file, creating it if it does not exist.
   * Parent directories must be created automatically.
   */
  writeFile(
    projectId: ProjectId,
    path: string,
    data: Uint8Array,
  ): Promise<void>;

  /**
   * List files and directories at a given path within the project.
   * Pass an empty string or "/" for the project root.
   */
  listFiles(projectId: ProjectId, dirPath: string): Promise<FileEntry[]>;

  /**
   * Delete a file. Silently succeeds if the file does not exist.
   * Throws if path points to a non-empty directory.
   */
  deleteFile(projectId: ProjectId, path: string): Promise<void>;

  /**
   * Rename or move a file/directory within the same project.
   */
  moveFile(
    projectId: ProjectId,
    fromPath: string,
    toPath: string,
  ): Promise<void>;

  /**
   * Create an empty directory at the given path.
   * No-ops if the directory already exists.
   */
  createDirectory(projectId: ProjectId, path: string): Promise<void>;

  /**
   * Delete a directory and all its contents recursively.
   */
  deleteDirectory(projectId: ProjectId, path: string): Promise<void>;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class FileNotFoundError extends Error {
  constructor(
    public readonly projectId: ProjectId,
    public readonly path: string,
  ) {
    super(`File not found: ${projectId}/${path}`);
    this.name = "FileNotFoundError";
  }
}

export class PathTraversalError extends Error {
  constructor(public readonly path: string) {
    super(`Unsafe path detected: ${path}`);
    this.name = "PathTraversalError";
  }
}
