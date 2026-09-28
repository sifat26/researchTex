/**
 * LocalStorageProvider — Phase 7+ implementation stub.
 *
 * This class will be implemented in Phase 7 when server-side persistence
 * is added. It is declared here to:
 *   1. Reserve the module path.
 *   2. Document the planned implementation contract.
 *   3. Prevent future phases from creating this file in the wrong location.
 *
 * DO NOT use this provider in production until Phase 7 is complete.
 *
 * @todo Phase 7: Implement using the server filesystem or S3-compatible
 *               object storage (environment-configurable).
 */

import type { StorageProvider } from "./types.js";
import type { FileEntry, ProjectId } from "@researchtex/types";

/**
 * Stub implementation — all methods throw NotImplementedError.
 *
 * Replace the method bodies in Phase 7.
 */
export class LocalStorageProvider implements StorageProvider {
  readFile(_projectId: ProjectId, _path: string): Promise<Uint8Array> {
    return Promise.reject(new NotImplementedError("LocalStorageProvider.readFile"));
  }

  writeFile(
    _projectId: ProjectId,
    _path: string,
    _data: Uint8Array,
  ): Promise<void> {
    return Promise.reject(new NotImplementedError("LocalStorageProvider.writeFile"));
  }

  listFiles(_projectId: ProjectId, _dirPath: string): Promise<FileEntry[]> {
    return Promise.reject(new NotImplementedError("LocalStorageProvider.listFiles"));
  }

  deleteFile(_projectId: ProjectId, _path: string): Promise<void> {
    return Promise.reject(new NotImplementedError("LocalStorageProvider.deleteFile"));
  }

  moveFile(
    _projectId: ProjectId,
    _fromPath: string,
    _toPath: string,
  ): Promise<void> {
    return Promise.reject(new NotImplementedError("LocalStorageProvider.moveFile"));
  }

  createDirectory(_projectId: ProjectId, _path: string): Promise<void> {
    return Promise.reject(
      new NotImplementedError("LocalStorageProvider.createDirectory"),
    );
  }

  deleteDirectory(_projectId: ProjectId, _path: string): Promise<void> {
    return Promise.reject(
      new NotImplementedError("LocalStorageProvider.deleteDirectory"),
    );
  }
}

/** Thrown by stub implementations that have not yet been built. */
export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`Not implemented yet: ${feature}. See Phase 7.`);
    this.name = "NotImplementedError";
  }
}
