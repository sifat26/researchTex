/**
 * CompilerClient interface — types for the local ResearchTex Agent.
 *
 * Import compiler types from here within the web app.
 *
 * Phase 4+ will add the concrete HTTP client implementation:
 *   - agent-compiler-client.ts
 *
 * The local agent runs at NEXT_PUBLIC_AGENT_BASE_URL (default: http://127.0.0.1:54731).
 * The browser communicates with it via a controlled REST API.
 * The browser NEVER executes arbitrary shell commands through the agent.
 *
 * @todo Phase 4: Implement AgentCompilerClient that calls the local Tauri agent.
 * @todo Phase 5: Wire the client into the PDF compilation workflow.
 */
export type {
  CompilerEngine,
  BibProcessor,
  AgentHealthStatus,
  CompileRequest,
  CompileJobStatus,
  CompileResult,
  CompileLogLevel,
  CompileLogEntry,
} from "@researchtex/types";

/**
 * High-level compiler client interface.
 * The web app uses this interface — not any concrete HTTP client directly.
 *
 * @todo Phase 4: Move this to @researchtex/types if the agent package also needs it.
 */
export interface CompilerClient {
  /** Check whether the local agent is running and ready. */
  health(): Promise<import("@researchtex/types").AgentHealthStatus>;

  /** Submit a compile job. Returns immediately; poll for status. */
  compile(
    request: import("@researchtex/types").CompileRequest,
  ): Promise<import("@researchtex/types").CompileResult>;

  /** Cancel a running compile job. */
  cancelCompile(jobId: string): Promise<void>;

  /** Retrieve the structured log entries for a completed job. */
  getLogs(
    jobId: string,
  ): Promise<readonly import("@researchtex/types").CompileLogEntry[]>;

  /** Retrieve the generated PDF bytes for a successful job. */
  getPDF(jobId: string): Promise<Uint8Array>;
}
