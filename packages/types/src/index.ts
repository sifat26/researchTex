/**
 * Public surface of the @researchtex/types package.
 *
 * Import from this package like:
 *   import type { Project, StorageProvider } from "@researchtex/types";
 */

export type {
  // project.ts
  ProjectId,
  ProjectStatus,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FileType,
  FileEntry,
  FileTreeNode,
} from "./project.js";

export type {
  // user.ts
  UserId,
  AuthProvider,
  User,
  ProjectRole,
  ProjectMember,
  InviteCollaboratorInput,
} from "./user.js";

export type {
  // compiler.ts
  CompilerEngine,
  BibProcessor,
  AgentHealthStatus,
  CompileRequestFile,
  CompileRequest,
  CompileJobStatus,
  CompileResult,
  CompileLogLevel,
  CompileLogEntry,
  CompilerClient,
} from "./compiler.js";

export type {
  // collaboration.ts
  CollabSession,
  CursorPresence,
  CollabUpdateType,
  CollabUpdate,
  Unsubscribe,
} from "./collaboration.js";

export type {
  // storage.ts
  StorageProvider,
} from "./storage.js";

// Storage errors are values (classes), so export them as values + types
export { FileNotFoundError, PathTraversalError } from "./storage.js";

export type {
  // ai.ts
  LaTeXContext,
  AIProvider,
  AIProviderConfig,
} from "./ai.js";
