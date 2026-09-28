/**
 * CollaborationProvider interface — types for real-time collaboration.
 *
 * Import collaboration types from here within the web app.
 *
 * Phase 9+ will add the concrete Yjs/Hocuspocus implementation:
 *   - yjs-collaboration-provider.ts
 *
 * @todo Phase 9: Implement YjsCollaborationProvider using Yjs + WebSocket.
 * @todo Phase 9: Add server-side Hocuspocus WebSocket server in apps/collab/.
 */
export type {
  CollabSession,
  CursorPresence,
  CollabUpdateType,
  CollabUpdate,
  Unsubscribe,
} from "@researchtex/types";

/**
 * High-level collaboration provider interface.
 *
 * @todo Phase 9: Implement with Yjs CRDT + WebSocket transport.
 */
export interface CollaborationProvider {
  /** Join a real-time session for a project. */
  joinSession(projectId: string, userId: string): Promise<import("@researchtex/types").CollabSession>;

  /** Leave a session, releasing resources. */
  leaveSession(sessionId: string): Promise<void>;

  /** Subscribe to real-time updates. Returns an unsubscribe function. */
  onUpdate(
    sessionId: string,
    handler: (update: import("@researchtex/types").CollabUpdate) => void,
  ): import("@researchtex/types").Unsubscribe;
}
