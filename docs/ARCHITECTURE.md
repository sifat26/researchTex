# ResearchTex — Architecture Documentation

> Last updated: Phase 0 — Foundation

---

## 1. System Overview

ResearchTex is a web-based LaTeX editor and research platform. It consists of multiple independently deployable components connected through well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (apps/web)                        │
│                                                             │
│   Next.js App Router ─── React UI ─── CodeMirror 6 editor  │
│          │                                  │               │
│    API routes / tRPC               PDF.js viewer            │
│          │                                  │               │
└──────────┼──────────────────────────────────┼───────────────┘
           │                                  │
           │ HTTP/REST (Phase 7+)             │ localhost:54731
           ▼                                  ▼
┌─────────────────┐              ┌─────────────────────────┐
│   Backend API   │              │  ResearchTex Agent       │
│  (Phase 7+)     │              │  Tauri 2 + Rust          │
│                 │              │  (Phase 4+)              │
│  PostgreSQL     │              │  - TeX Live / MiKTeX     │
│  Object Storage │              │  - pdflatex/xelatex      │
│  Auth (NextAuth)│              │  - BibTeX/Biber          │
└─────────────────┘              └─────────────────────────┘
           │
           │ WebSocket (Phase 9+)
           ▼
┌──────────────────────┐
│  Collaboration Server │
│  Yjs + Hocuspocus    │
│  (Phase 9+)          │
└──────────────────────┘
```

---

## 2. Monorepo Structure

```
researchtex/
├── apps/
│   ├── web/               Next.js 14 web application
│   └── agent/             Tauri 2 desktop agent (Phase 4)
├── packages/
│   ├── types/             Shared TypeScript types & interfaces
│   └── config/            Shared tsconfig & eslint configs
└── docs/                  Architecture & convention docs
```

---

## 3. Core Interface Boundaries

These interfaces define the seams between major system components. Concrete implementations are swapped without touching the business logic.

### 3.1 StorageProvider

```typescript
interface StorageProvider {
  readFile(projectId, path): Promise<Uint8Array>
  writeFile(projectId, path, data): Promise<void>
  listFiles(projectId, dirPath): Promise<FileEntry[]>
  deleteFile(projectId, path): Promise<void>
  moveFile(projectId, fromPath, toPath): Promise<void>
  createDirectory(projectId, path): Promise<void>
  deleteDirectory(projectId, path): Promise<void>
}
```

Planned implementations:
- `LocalStorageProvider` — server filesystem (Phase 7)
- `CloudStorageProvider` — S3-compatible object storage (Phase 7)
- `GoogleDriveProvider` — Google Drive API (Phase 8)

### 3.2 AIProvider

```typescript
interface AIProvider {
  explainError(error, context): Promise<string>
  fixError(error, source, context): Promise<string>
  generateLatex(prompt, context): Promise<string>
  improveWriting(text, context): Promise<string>
  generateBibTeX(reference): Promise<string>
}
```

Planned implementations:
- `GeminiAIProvider` — Google Gemini API (Phase 11)
- `OpenAIProvider` — OpenAI API (Phase 11)

### 3.3 CompilerClient

```typescript
interface CompilerClient {
  health(): Promise<AgentHealthStatus>
  compile(request): Promise<CompileResult>
  cancelCompile(jobId): Promise<void>
  getLogs(jobId): Promise<CompileLogEntry[]>
  getPDF(jobId): Promise<Uint8Array>
}
```

Planned implementations:
- `AgentCompilerClient` — Communicates with local Tauri agent (Phase 4)
- `WasmCompilerClient` — Browser-based fallback compiler (Phase 5+)

### 3.4 CollaborationProvider

```typescript
interface CollaborationProvider {
  joinSession(projectId, userId): Promise<CollabSession>
  leaveSession(sessionId): Promise<void>
  onUpdate(sessionId, handler): Unsubscribe
}
```

Planned implementations:
- `YjsCollaborationProvider` — Yjs + Hocuspocus WebSocket (Phase 9)

---

## 4. Data Model

A project maps directly to a standard LaTeX directory structure. No proprietary container format.

```
project/
├── main.tex              ← rootFile (configurable)
├── references.bib
├── sections/
│   ├── introduction.tex
│   └── methodology.tex
├── figures/
│   └── diagram.png
└── styles/
    └── custom.sty
```

Projects are exported as plain ZIP archives for cross-platform compatibility (Overleaf, local TeX editors, etc.).

---

## 5. Security Boundaries

| Area | Principle |
|------|-----------|
| File paths | Always validate; reject `../`, absolute paths, null bytes |
| ZIP import | Sanitise all paths before extraction |
| Local agent | Never execute arbitrary commands; agent validates all inputs |
| Future server compiler | Isolated sandbox; no network; shell escape disabled |
| Auth | Server-side enforcement; frontend restrictions are UI-only |
| API keys | Environment variables only; never committed to source |
| OAuth secrets | Environment variables only |

---

## 6. Local Agent Communication (Phase 4+)

The web app communicates with the Tauri desktop agent via a controlled HTTP API on `http://127.0.0.1:54731` (configurable via `NEXT_PUBLIC_AGENT_BASE_URL`).

The browser **cannot** execute arbitrary shell commands. The agent exposes only:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Agent and compiler status |
| `/compile` | POST | Submit compile job |
| `/compile/:jobId/cancel` | POST | Cancel job |
| `/compile/:jobId/logs` | GET | Structured log entries |
| `/compile/:jobId/pdf` | GET | Download generated PDF |

The agent validates all paths and rejects anything outside the designated project directory.

---

## 7. AI Architecture (Phase 11+)

- **BYO API key model**: Users supply their own API keys. The platform does not pay per-user.
- **Minimal context**: Each AI request receives only the context necessary for the task.
- **User disclosure**: Users are informed when content is sent to an external AI provider.
- **Provider abstraction**: The `AIProvider` interface allows easy addition of new backends.

---

## 8. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Web framework | Next.js 14 App Router | Mature, SSR, file-based routing |
| Language | TypeScript (strict) | Type safety across the full stack |
| Styling | Tailwind CSS | Rapid, consistent, design-token-driven |
| Editor | CodeMirror 6 (Phase 3) | Extensible, performant, LaTeX-friendly |
| PDF viewer | PDF.js (Phase 5) | Browser-native, no dependencies |
| Desktop agent | Tauri 2 + Rust (Phase 4) | Minimal footprint, system access |
| CRDT/Collab | Yjs (Phase 9) | Standard, well-supported |
| Database | PostgreSQL (Phase 7) | Reliable, relational |
| Package manager | pnpm | Fast, strict, workspace support |
| Monorepo | Turborepo | Efficient task caching |
