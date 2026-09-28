/**
 * Real-time collaboration types (Phase 9+).
 *
 * The collaboration layer is built on CRDT-based synchronisation (Yjs).
 * All permission enforcement must happen server-side — not just in the UI.
 */

import type { UserId } from "./user.js";

// ─── Session ─────────────────────────────────────────────────────────────────

/** An active collaboration session for a project. */
export interface CollabSession {
  readonly sessionId: string;
  readonly projectId: string;
  readonly userId: UserId;
  readonly joinedAt: Date;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/** A collaborator's current cursor/selection position. */
export interface CursorPresence {
  readonly userId: UserId;
  readonly displayName: string;
  /** The file currently being edited, relative to project root. */
  readonly filePath: string;
  /** Cursor position within the file (character offset). */
  readonly position: number;
  /** Optional selection range. */
  readonly selection?: {
    readonly from: number;
    readonly to: number;
  };
  /** Hex colour assigned to this collaborator's cursor. */
  readonly color: string;
}

// ─── Updates ──────────────────────────────────────────────────────────────────

/** Types of real-time updates that can be received in a session. */
export type CollabUpdateType = "document" | "presence" | "file-tree" | "chat";

/** A generic real-time update envelope. */
export interface CollabUpdate {
  readonly type: CollabUpdateType;
  readonly sessionId: string;
  readonly senderId: UserId;
  readonly timestamp: Date;
  /** Type-specific payload. */
  readonly payload: unknown;
}

/** Unsubscribe function returned by subscription methods. */
export type Unsubscribe = () => void;
