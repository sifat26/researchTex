# ResearchTex — Development Phases

Each phase must leave the project in a **runnable state**.
Do not implement features from a later phase until the earlier phase is complete.

---

| Phase | Title | Status | Key Deliverables |
|-------|-------|--------|-----------------|
| **0** | Foundation & Architecture | ✅ Complete | Monorepo, TypeScript, ESLint, Tailwind, interface stubs, documentation |
| **1** | Application Shell & UI Foundation | 🔲 Planned | Design system, layout shell, navigation, routing skeleton |
| **2** | Project & File Management | 🔲 Planned | Dashboard, project CRUD, file tree (in-memory) |
| **3** | CodeMirror LaTeX Editor | 🔲 Planned | Syntax highlighting, bracket matching, autocomplete stubs |
| **4** | Local ResearchTex Agent | 🔲 Planned | Tauri app, compiler detection, compile API, local agent client |
| **5** | PDF Viewer & Compilation Workflow | 🔲 Planned | PDF.js integration, compile trigger, log panel |
| **6** | ZIP Import/Export | 🔲 Planned | Project → ZIP, ZIP → Project, path sanitisation |
| **7** | Cloud Persistence | 🔲 Planned | PostgreSQL, Prisma, NextAuth, file storage, project API |
| **8** | Google Drive Integration | 🔲 Planned | OAuth, Drive picker, bi-directional sync |
| **9** | Real-time Collaboration | 🔲 Planned | Yjs, Hocuspocus, cursor presence, conflict resolution |
| **10** | Version History | 🔲 Planned | Snapshots, diff viewer, restore |
| **11** | AI Assistant | 🔲 Planned | BYO key, error explanation, LaTeX generation, writing improvement |
| **12** | Research Tools | 🔲 Planned | Citation search, bibliography management, paper analysis |
| **13** | Advanced Integrations | 🔲 Planned | GitHub, Zotero, arXiv, DOI lookup |
| **14** | Security, Optimisation & Hardening | 🔲 Planned | Rate limiting, auditing, CSP, performance budget, pen-test |

---

## Phase 0 — Foundation & Architecture (Complete)

**Goal**: Establish the monorepo, tooling, and interface boundaries. No real features implemented.

### Deliverables
- pnpm workspace + Turborepo pipeline
- `packages/types` — all shared interfaces
- `packages/config` — shared tsconfig + eslint
- `apps/web` — minimal Next.js 14 scaffold
- Four service boundary stubs: StorageProvider, AIProvider, CompilerClient, CollaborationProvider
- Environment variable conventions
- Architecture and conventions documentation
- Runnable dev server at localhost:3000

---

## Phase 1 — Application Shell & UI Foundation (Planned)

**Goal**: Establish the design system and application layout shell.

### Planned Deliverables
- Full design token system in Tailwind
- Root authenticated layout with sidebar placeholder
- Top navigation bar
- Responsive layout grid
- Primitive UI components: Button, Input, Badge, Spinner, Tooltip, Modal
- Route structure: `/`, `/dashboard`, `/projects/[id]` (shells only)
- Dark mode (default)
- Keyboard navigation foundation
- Inter + JetBrains Mono fonts loaded via Next.js font optimisation

---

## Phase 2 — Project & File Management (Planned)

**Goal**: Users can create, rename, delete projects and manage files (in-memory, pre-database).

### Planned Deliverables
- Project dashboard listing
- Create / rename / delete project
- File tree sidebar
- Create / rename / delete / move files and directories
- In-memory project state (will be replaced by persistent storage in Phase 7)
- File content editing (plain textarea, pre-CodeMirror)

---

## Phase 3 — CodeMirror LaTeX Editor (Planned)

**Goal**: Proper LaTeX editing experience.

### Planned Deliverables
- CodeMirror 6 integration
- LaTeX syntax highlighting
- Bracket and environment matching
- Basic LaTeX autocomplete
- Multiple file tabs
- Editor preferences (font size, key bindings)
- Word count / character count

---

## Phase 4 — Local ResearchTex Agent (Planned)

**Goal**: Tauri desktop agent that compiles LaTeX locally.

### Planned Deliverables
- Tauri 2 project in `apps/agent`
- LaTeX distribution detection (TeX Live / MiKTeX)
- Compile API: pdflatex, xelatex, lualatex
- BibTeX / Biber support
- Structured log output
- PDF output delivery
- `AgentCompilerClient` in web app
- Agent status indicator in UI

---

## Phase 5 — PDF Viewer & Compilation Workflow (Planned)

**Goal**: Full compile → view loop.

### Planned Deliverables
- PDF.js integration
- Compile button + keyboard shortcut
- Compilation status indicator
- Compiler log panel (parsed, colour-coded)
- PDF/source sync (SyncTeX if available)
- Debounced auto-compile option

---

## Phases 6–14

See `ARCHITECTURE.md` for full descriptions of each feature area.
Detailed planning for each phase will be produced as separate implementation plans.
