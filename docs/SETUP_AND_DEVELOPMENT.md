# ResearchTex: Setup and Development Guide

Welcome to the ResearchTex project! This document outlines everything a new developer needs to know to get the project running locally and understand the core architecture for further development and implementation.

## 1. System Prerequisites

Before cloning the repository, ensure your development environment has the following dependencies installed:

- **Node.js**: v20 or higher (We recommend using `nvm` or `fnm`)
- **pnpm**: Global installation required (`npm install -g pnpm`)
- **Rust Toolchain**: For the local compiler agent (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **LaTeX Distribution**: A local LaTeX engine is required for compiling documents locally.
  - Windows: [MiKTeX](https://miktex.org/)
  - macOS: [MacTeX](https://www.tug.org/mactex/)
  - Linux: `texlive-full`
  - *Ensure `pdflatex`, `latexmk`, and `biber` are accessible in your system's PATH.*
- **PostgreSQL**: A running instance (local or hosted like Supabase/Neon).

---

## 2. Initial Setup

### Clone and Install
Clone the repository and install all monorepo dependencies. We use Turborepo and pnpm workspaces.

```bash
git clone <repository-url>
cd ResearchTex
pnpm install
```

### Environment Variables
You must configure your environment variables before running the application.

1. Navigate to the web app:
   ```bash
   cd apps/web
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` and populate the required fields:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `NEXTAUTH_SECRET`: Generate a random secure string (e.g., `openssl rand -base64 32`).
   - `NEXTAUTH_URL`: `http://localhost:3000`
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth authentication.
   - `GEMINI_API_KEY`: Google Gemini API key for AI features.

### Database Migration
ResearchTex uses Prisma as its ORM. Push the database schema to your configured PostgreSQL instance:

```bash
pnpm --filter @researchtex/web run db:push
```

*(Note: If making schema changes in the future, use `pnpm run db:generate` to regenerate the Prisma client).*

---

## 3. Running the Project Locally

The ResearchTex architecture is distributed. You must run **three** separate services simultaneously to have a fully functional local environment. 

You can run these in three separate terminal tabs from the root of the project:

**Terminal 1: Next.js Web App**
Runs the main user interface and API routes.
```bash
pnpm --filter @researchtex/web dev
```
*Accessible at: http://localhost:3000*

**Terminal 2: Collaboration Server**
Runs the Yjs WebSocket server for real-time multiplayer editing.
```bash
pnpm --filter @researchtex/collaboration dev
```
*Listens on: ws://localhost:1234*

**Terminal 3: Rust Compiler Agent**
Runs the local Axum agent that securely interfaces with your system's LaTeX distribution to compile PDFs.
```bash
cd apps/agent
cargo run
```
*Listens on: http://127.0.0.1:4433*

---

## 4. Monorepo Architecture Overview

ResearchTex is structured as a pnpm workspace with the following key directories:

- `apps/web/`: The Next.js 15 App Router frontend. Contains the UI, authentication, AI routes, and project management.
- `apps/collaboration/`: A Node.js/Yjs WebSocket server handling real-time CRDT synchronization for the code editor.
- `apps/agent/`: A secure Rust (Axum) server that accepts `.zip` payloads from the web app, extracts them into temporary local workspaces, invokes the system LaTeX compiler, and returns the generated PDF and logs.
- `packages/db/`: Prisma schema and database connection logic.
- `packages/types/`: Shared TypeScript interfaces used across the frontend and collaboration server.
- `docs/`: Extensive documentation outlining the development phases, architectural decisions, and audits.

---

## 5. Guidelines for Further Implementation & Checks

When implementing new features or debugging, adhere to the following architectural rules:

### A. The Compiler Payload Boundary
Never send raw Base64 strings of large binary files (like images) directly via JSON payloads between the Web App and the Rust Agent. This causes `413 PayloadTooLargeError` and memory crashes. 
- **Always use ZIP streaming**: The Next.js API `compile-snapshot` generates a `.zip` blob.
- **Always use Multipart Form-Data**: The Rust agent consumes `multipart/form-data` to extract the ZIP securely.

### B. Security & Path Traversal
- The Rust agent runs locally on the user's machine. Any file operations (like extracting ZIPs or writing compiler files) must go through rigorous validation to prevent Path Traversal attacks (e.g., preventing `../../` directory escapes).
- **Reference**: Review `apps/agent/src/security/validation.rs` before touching the file system.

### C. State Synchronization
ResearchTex relies heavily on **Yjs CRDTs** for the editor state. 
- Never update the Postgres database with editor code directly from the client without going through the Collaboration Server.
- When triggering a compilation, the Next.js API first forces a "flush" of the Collaboration Server state to Postgres before generating the compiler ZIP. This ensures the compiled PDF perfectly matches what is on the user's screen.

### D. Adding Dependencies
Because this is a pnpm workspace, when adding a new dependency, use the `--filter` flag to install it in the correct app:
```bash
pnpm --filter @researchtex/web add lucide-react
```

### E. AI and Context Generation
When modifying AI features (Gemini), remember that ResearchTex uses chunk-based embedding generation. Ensure that prompts do not exceed token limits by truncating document context intelligently.

### F. Auditing and History
Before beginning major architectural overhauls, please read the previous Phase reports in the `docs/` directory (e.g., `PHASE_17_AUDIT.md`, `PHASE_17B_FIX_REPORT.md`). These documents explain *why* certain decisions (like local Rust agents over cloud compilation) were made.
