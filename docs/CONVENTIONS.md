# ResearchTex — Coding Conventions

> These conventions apply to all code in the monorepo.
> They exist to maintain consistency as multiple contributors work across phases.

---

## 1. Language

- **TypeScript everywhere.** No plain `.js` files except config files that cannot be TypeScript (e.g., `postcss.config.js`).
- **`strict: true`** is non-negotiable. Do not weaken TypeScript settings without a documented reason in a code comment.
- **No `any`.** Use `unknown` and narrow the type explicitly. If you receive `any` from a third-party, cast it at the boundary.
- **Explicit return types** on exported functions. Internal helpers may infer if obvious.
- **`noUncheckedIndexedAccess`** is enabled — always handle the `undefined` case when indexing arrays or records.

---

## 2. Naming

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | `kebab-case` | `local-storage-provider.ts` |
| React components | `PascalCase` | `FileTreeNode.tsx` |
| Non-component modules | `camelCase` export | `createProject()` |
| Interfaces | `PascalCase`, no `I` prefix | `StorageProvider` |
| Types | `PascalCase` | `ProjectRole` |
| Enums | Avoid; use `as const` objects or string unions |  |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_FILE_SIZE_BYTES` |
| React hooks | `use` prefix | `useProjectFiles()` |
| Services | `*.service.ts` | `project.service.ts` |
| Providers/implementations | `*Provider` or `*Client` | `GeminiAIProvider` |

---

## 3. File Structure

```
src/
├── app/             Next.js App Router pages and layouts
├── components/
│   ├── ui/          Generic, reusable primitive components (no business logic)
│   └── [feature]/   Feature-specific components
├── lib/             Integration layer — storage, AI, compiler, collaboration
├── services/        Business logic — no React imports
├── hooks/           React hooks
├── types/           App-level type extensions (re-exports from packages/types)
└── styles/          Global CSS
```

**Rules:**
- `components/ui` contains **only** generic components. No project-domain logic.
- `services/` never imports from React or any browser API. They must be testable in isolation.
- `lib/` contains interface definitions and provider implementations. No UI logic.
- Business logic never lives in React components — extract to services or hooks.

---

## 4. Imports

- Use the `@/` path alias for all internal imports from `apps/web/src`.
  ```ts
  import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";
  ```
- Use `type` imports for type-only imports:
  ```ts
  import type { Project } from "@researchtex/types";
  ```
- Order imports: external packages → workspace packages → internal `@/` paths.

---

## 5. Error Handling

- **Never swallow errors silently.** Always log or re-throw.
- Use typed error classes for domain errors (e.g., `FileNotFoundError`, `PathTraversalError`).
- In async functions, handle errors at the call site — do not scatter try/catch everywhere.
- API route handlers must return structured error responses, never raw stack traces.

---

## 6. Environment Variables

- All secrets: environment variables only. **Never hardcode.**
- Browser-exposed vars: `NEXT_PUBLIC_` prefix.
- Server-only vars: no prefix, never access on the client.
- Document every variable in `.env.example` and `apps/web/.env.local.example`.
- Phase-annotate new variables with a comment indicating which phase needs them.

---

## 7. Comments and Documentation

- **Interfaces** must have a JSDoc block explaining the contract.
- **Stub implementations** must have a comment explaining they are stubs and which phase will implement them.
- **TODOs** must reference the phase: `// TODO (Phase 7): Implement with Prisma`.
- Avoid obvious comments that restate what the code does.
- Document *why*, not *what*.

---

## 8. React Conventions

- Prefer **Server Components** by default in Next.js App Router.
- Mark with `"use client"` only when browser APIs or interactivity are required.
- Prefer `React.JSX.Element` as return type for components.
- Avoid `React.FC` — use regular function declarations with explicit return types.
- Keep components small and focused. Extract sub-components when a component exceeds ~150 lines.

---

## 9. Commits

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Reference the phase in commit messages: `feat(phase-1): add sidebar layout`.
- Never commit `.env.local` or any file containing secrets.

---

## 10. Security Rules

- **Validate all file paths** before any file system operation. Reject `../`, absolute paths, null bytes.
- **Never trust client-provided paths** in server code.
- **Never expose raw stack traces** in API responses.
- **Never log secrets**, API keys, or tokens.
- Enforce permissions server-side — frontend checks are UI conveniences only.
