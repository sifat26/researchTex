/**
 * Core project and file system types.
 *
 * A ResearchTex project maps 1:1 to a standard LaTeX project directory.
 * No proprietary container format — files are stored with their natural
 * names and relative paths so the project can be exported as a plain ZIP.
 */

// ─── Project ─────────────────────────────────────────────────────────────────

/** Unique identifier for a project (opaque string, server-assigned). */
export type ProjectId = string;

/** The lifecycle state of a project. */
export type ProjectStatus = "active" | "archived" | "deleted";

/** Top-level project metadata. */
export interface Project {
  readonly id: ProjectId;
  readonly ownerId: string;
  readonly name: string;
  /** Root entry file, relative to project root. Defaults to "main.tex". */
  readonly rootFile: string;
  readonly status: ProjectStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** Optional user-supplied description. */
  readonly description?: string;
  /** Tags for organising projects. */
  readonly tags: readonly string[];
}

/** Payload used when creating a new project. */
export interface CreateProjectInput {
  name: string;
  rootFile?: string;
  description?: string;
  tags?: string[];
}

/** Payload used when updating project metadata. */
export interface UpdateProjectInput {
  name?: string;
  rootFile?: string;
  description?: string;
  tags?: string[];
}

// ─── File System ──────────────────────────────────────────────────────────────

/** MIME-like type for files tracked inside a project. */
export type FileType =
  | "tex"
  | "bib"
  | "sty"
  | "cls"
  | "image"
  | "pdf"
  | "other";

/** A single entry in a project's file tree. */
export interface FileEntry {
  /**
   * Path relative to the project root.
   * Always uses forward slashes regardless of OS.
   * Example: "sections/introduction.tex"
   */
  readonly path: string;
  readonly name: string;
  readonly type: FileType;
  /** `true` for directory nodes, `false` for file nodes. */
  readonly isDirectory: boolean;
  readonly isBinary?: boolean;
  /** File size in bytes. Absent for directories. */
  readonly sizeBytes?: number;
  readonly updatedAt: Date;
}

/** A file tree node (leaf or branch). */
export interface FileTreeNode extends FileEntry {
  readonly children?: readonly FileTreeNode[];
}
