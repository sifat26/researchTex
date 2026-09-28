# ResearchTex - Phase 17 Audit Report

**Date:** September 2026
**Status:** PRODUCTION STABILIZATION, FUNCTIONALITY AUDIT & UI CONSISTENCY

## Executive Summary
This audit evaluated the existing state of the ResearchTex monorepo (Phase 1–16) with a strict focus on stabilization, reliability, and correctness. The application consists of three primary services (`apps/web`, `apps/collaboration`, `apps/agent`) operating via a PostgreSQL database and synchronized via `y-websocket`.

The audit reveals that while feature velocity has been high, technical debt has accumulated in areas of file payload handling, AI component architecture, UI state reconciliation (especially compiler logs), and LaTeX dependency management.

---

## 1. File Storage & Payload Constraints
- **Current State:** Files (including binaries like CT scan images) are stored in the PostgreSQL database as `text` or `base64` encoded strings.
- **Issues:**
  - This architecture caused severe `413 Payload Too Large` errors during project ZIP uploads and compiler invocations.
  - **Temporary Band-aids applied:** Next.js `serverActions.bodySizeLimit` increased to 50MB, and Axum `DefaultBodyLimit` disabled.
- **Action Items:** 
  - File retrieval for compilation needs streaming or a direct-to-disk cache rather than loading the entire base64 string into memory.
  - Implement real multipart uploading or dedicated blob storage (S3) for binary assets.

## 2. Compiler Agent (Rust/Axum)
- **Current State:** A robust local Axum server that creates a temp workspace, runs `pdflatex` -> `biber` -> `pdflatex`, and returns the generated PDF as base64.
- **Issues:**
  - Standard `pdflatex` does not auto-install missing packages (`amssymb`, `placeins`, etc.). Users receive generic "Undefined control sequence" errors.
  - State inconsistencies: The Next.js client does not always wipe old compiler logs before initiating a new compile, leading to "ghost" errors (e.g. stale 413 messages persisting in the UI).
- **Action Items:**
  - Clear compiler logs explicitly in Next.js state upon clicking "Compile".
  - Consider swapping `pdflatex` for `tectonic` in the long term for auto-dependency resolution, or at least parse logs better to give specific actionable AI feedback.

## 3. AI & Embeddings Architecture
- **Current State:** `GeminiEmbeddingProvider` handles document indexing for "Research Intelligence". 
- **Issues:**
  - **Client-Side Execution:** The embedding logic is currently executing in the browser, making raw `fetch` requests to `generativelanguage.googleapis.com` using keys read from cookies. This exposes keys and violates best security practices.
  - **Model Drift:** Hardcoded `text-embedding-004` caused `404 Not Found` for certain API keys/regions; patched to fallback to `embedding-001`.
- **Action Items:**
  - Move embedding generation strictly to server actions or background Node.js jobs.
  - Sanitize the `provider.ts` implementations to ensure clean server/client boundaries.

## 4. UI & Editor Consistency
- **Current State:** CodeMirror + Yjs editor with overlapping context panels.
- **Issues:**
  - Panels (AI, Workspace, Bibliography, Research) were recently patched to be mutually exclusive using raw React state setters, which is functionally correct but fragile if new panels are added.
  - Inconsistent empty states for file explorer.
- **Action Items:**
  - Implement a central "Panel Manager" state instead of disjoint booleans.
  - Audit loading spinners and disabled states for buttons (specifically during the 1-2 minute Rust compilation window).

## 5. Collaboration Server
- **Current State:** `y-websocket` server running on Express.
- **Issues:**
  - Relies on internal Next.js API `/api/internal/files` to persist debounced changes. 
  - The Web UI calls `/flush` on the collab server before compilation to ensure DB is up to date.
- **Action Items:**
  - Robust error handling if the internal API key mechanism fails.
  - Ensure WebSocket connection closures during rapid file-switching (e.g., zip unzipping) are caught and suppressed to prevent console alarm fatigue.

---

### Phase 17 Goal Alignment
No new features will be introduced. The subsequent steps in this phase will strictly address the Action Items listed above, focusing heavily on migrating AI logic to the server, clearing stale compiler state, and standardizing loading/empty states across the UI.
