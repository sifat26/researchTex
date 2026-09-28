/**
 * AIProvider interface (Phase 11+).
 *
 * The AI layer is modular — no single provider is assumed.
 * Users supply their own API keys (BYO model). The platform does not pay
 * per-user AI costs.
 *
 * Planned implementations:
 *   - GeminiAIProvider   — Google Gemini API
 *   - OpenAIProvider     — OpenAI API
 *   - LocalModelProvider — Ollama or similar local model (future)
 *
 * IMPORTANT: Users must be informed when project or research content is
 *            sent to an external AI provider. Never send more context than
 *            strictly needed for the task.
 */

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Minimal LaTeX context provided to an AI request.
 * Only include what is strictly necessary for the task.
 */
export interface LaTeXContext {
  /** The full LaTeX source of the file being edited. */
  readonly fileContent?: string;
  /** The specific line(s) most relevant to the request. */
  readonly relevantLines?: string;
  /** Compiler log output, if any. */
  readonly compilerLog?: string;
  /** Project name (for context labelling). */
  readonly projectName?: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Provider-agnostic AI capability interface.
 * All methods receive the minimal context needed for the specific task.
 */
export interface AIProvider {
  /**
   * Explain a LaTeX compiler error in plain language.
   */
  explainError(
    error: string,
    context: LaTeXContext,
  ): Promise<string>;

  /**
   * Suggest a fix for a compiler error.
   * Returns the corrected source lines (not a whole-file replacement).
   */
  fixError(
    error: string,
    source: string,
    context: LaTeXContext,
  ): Promise<string>;

  /**
   * Generate LaTeX markup from a natural-language prompt.
   */
  generateLatex(prompt: string, context: LaTeXContext): Promise<string>;

  /**
   * Improve the academic writing style of a passage.
   */
  improveWriting(text: string, context: LaTeXContext): Promise<string>;

  /**
   * Generate a BibTeX entry from a DOI, URL, or description.
   */
  generateBibTeX(reference: string): Promise<string>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** User-supplied AI provider configuration (stored securely, never in source). */
export interface AIProviderConfig {
  readonly provider: "gemini" | "openai" | "local";
  /** API key supplied by the user. Never hardcoded. */
  readonly apiKey: string;
  /** Optional model override (e.g. "gpt-4o", "gemini-1.5-pro"). */
  readonly model?: string;
}
