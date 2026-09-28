/**
 * User and permission types.
 */

// ─── User ────────────────────────────────────────────────────────────────────

/** Unique identifier for a user (opaque string, server-assigned). */
export type UserId = string;

/** Authentication provider that created this account. */
export type AuthProvider = "google" | "github" | "email";

/** A registered user account. */
export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly authProvider: AuthProvider;
  readonly createdAt: Date;
}

// ─── Project Permissions ──────────────────────────────────────────────────────

/**
 * Role of a collaborator within a specific project.
 *
 * - OWNER: Full control including deletion and permission management.
 * - EDITOR: Can read and write all files.
 * - COMMENTER: Can read and add comments (Phase 9+).
 * - VIEWER: Read-only access.
 *
 * NOTE: All permissions must be enforced server-side.
 *       Frontend UI restrictions are UI conveniences only.
 */
export type ProjectRole = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";

/** A record linking a user to a project with a specific role. */
export interface ProjectMember {
  readonly userId: UserId;
  readonly projectId: string;
  readonly role: ProjectRole;
  readonly joinedAt: Date;
}

/** Payload for inviting a collaborator (Phase 9+). */
export interface InviteCollaboratorInput {
  email: string;
  role: ProjectRole;
}
