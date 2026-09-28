/**
 * AIProvider interface — re-exported from @researchtex/types.
 *
 * Import AI types from here within the web app.
 *
 * Phase 11+ will add concrete provider implementations alongside this file:
 *   - gemini-provider.ts
 *   - openai-provider.ts
 *
 * @todo Phase 11: Add provider factory function that reads user's stored
 *                API key and returns the appropriate AIProvider implementation.
 */
export type {
  AIProvider,
  AIProviderConfig,
  LaTeXContext,
} from "@researchtex/types";
