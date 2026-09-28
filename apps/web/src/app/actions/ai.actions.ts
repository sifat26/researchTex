"use server";

import { requireAuth, requireProjectAccess } from "@/lib/auth";
import { getAIProvider } from "@/lib/ai/provider";
import { RESEARCHTEX_SYSTEM_PROMPT, getCompileErrorPrompt, getSelectionPrompt, getImproveSelectionPrompt } from "@/lib/ai/prompts";
import { z } from "zod";

const StructuredFixSchema = z.object({
  explanation: z.string(),
  cause: z.string(),
  filePath: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  replacement: z.string(),
  confidence: z.enum(["high", "medium", "low"])
});

export type StructuredFix = z.infer<typeof StructuredFixSchema>;

/**
 * Returns a markdown explanation of a compile error.
 */
export async function explainErrorAction(
  projectId: string, 
  errorMessage: string, 
  filePath: string, 
  line: number | undefined, 
  codeContext: string
) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  const provider = await getAIProvider();
  const res = await provider.generateText({
    systemPrompt: RESEARCHTEX_SYSTEM_PROMPT,
    userPrompt: getCompileErrorPrompt(errorMessage, filePath, line, codeContext),
  });

  return { explanation: res.text, provider: res.provider };
}

/**
 * Returns a structured JSON fix for a compile error.
 * Strictly validated via Zod.
 */
export async function fixErrorAction(
  projectId: string, 
  errorMessage: string, 
  filePath: string, 
  line: number | undefined, 
  codeContext: string
): Promise<StructuredFix & { provider: string }> {
  await requireAuth();
  await requireProjectAccess(projectId, "EDITOR"); // Viewers cannot request fixes to apply

  const provider = await getAIProvider();
  
  // Zod schema to JSON schema conversion manually for simple cases
  const jsonSchema = {
    type: "object",
    properties: {
      explanation: { type: "string" },
      cause: { type: "string" },
      filePath: { type: "string" },
      startLine: { type: "number" },
      endLine: { type: "number" },
      replacement: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] }
    },
    required: ["explanation", "cause", "filePath", "startLine", "endLine", "replacement", "confidence"]
  };

  const res = await provider.generateStructured<any>({
    systemPrompt: RESEARCHTEX_SYSTEM_PROMPT + `\n\nYou MUST return a JSON object matching the provided schema. The replacement string should be the exact text to substitute lines between startLine and endLine (1-indexed, inclusive).`,
    userPrompt: getCompileErrorPrompt(errorMessage, filePath, line, codeContext) + `\n\nProvide a structured fix.`,
    schema: jsonSchema,
  });

  // Validate the returned object
  const validated = StructuredFixSchema.parse(res.data);

  // Additional sanity checks
  if (validated.filePath !== filePath) {
    // The AI might try to fix the wrong file, but we should scope it for safety.
    // In Phase 11, we strictly enforce it fixes the requested file.
    validated.filePath = filePath; 
  }

  return { ...validated, provider: res.provider };
}

/**
 * Returns a markdown explanation of selected text.
 */
export async function explainSelectionAction(projectId: string, selection: string, fileContent: string) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  const provider = await getAIProvider();
  const res = await provider.generateText({
    systemPrompt: RESEARCHTEX_SYSTEM_PROMPT,
    userPrompt: getSelectionPrompt(selection, fileContent),
  });

  return { explanation: res.text, provider: res.provider };
}

/**
 * Autocomplete for CodeMirror Ghost Text
 */
export async function autocompleteAction(projectId: string, filePath: string, prefix: string, suffix: string) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  // Enforce context limits strictly on the server to save costs/tokens
  const MAX_PREFIX = 1000;
  const MAX_SUFFIX = 1000;
  
  const trimmedPrefix = prefix.slice(-MAX_PREFIX);
  const trimmedSuffix = suffix.slice(0, MAX_SUFFIX);

  const provider = await getAIProvider();
  const { AUTOCOMPLETE_SYSTEM_PROMPT, getAutocompletePrompt } = await import('@/lib/ai/prompts/autocomplete');
  
  const res = await provider.generateText({
    systemPrompt: AUTOCOMPLETE_SYSTEM_PROMPT,
    userPrompt: getAutocompletePrompt(trimmedPrefix, trimmedSuffix),
    temperature: 0.2, // Low temperature for more deterministic/predictable completions
  });

  return { suggestion: res.text.trim(), provider: res.provider };
}

/**
 * Transforms a selection using the AI Writing Assistant
 */
export async function transformSelectionAction(projectId: string, actionType: string, selection: string) {
  await requireAuth();
  await requireProjectAccess(projectId, "EDITOR"); // modifications require Editor

  const provider = await getAIProvider();
  const { WRITING_ASSISTANT_PROMPT, getWritingPrompt } = await import('@/lib/ai/prompts/writing');

  const res = await provider.generateText({
    systemPrompt: WRITING_ASSISTANT_PROMPT,
    userPrompt: getWritingPrompt(actionType, selection),
    temperature: 0.5,
  });

  return { transformed: res.text.trim(), provider: res.provider };
}

/**
 * Returns improved LaTeX for selected text.
 */
export async function improveSelectionAction(projectId: string, selection: string) {
  await requireAuth();
  await requireProjectAccess(projectId, "EDITOR");

  const provider = await getAIProvider();
  const res = await provider.generateText({
    systemPrompt: RESEARCHTEX_SYSTEM_PROMPT,
    userPrompt: getImproveSelectionPrompt(selection),
  });

  return { improved: res.text, provider: res.provider };
}

/**
 * Suggests citations for a selected text based on provided candidates
 */
export async function suggestCitationsAction(
  projectId: string, 
  selection: string, 
  candidates: { key: string, metadata: string }[]
) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  if (!candidates || candidates.length === 0) {
    return { citations: [], reasoning: "No bibliography entries found to recommend." };
  }

  const provider = await getAIProvider();
  const { CITATION_SUGGESTION_PROMPT } = await import('@/lib/ai/prompts/citation');

  const userPrompt = `
Selected Text:
"""
${selection}
"""

Candidate References:
${candidates.map(c => `[Key: ${c.key}] ${c.metadata}`).join('\n')}
`;

  // We enforce a structured response here
  const jsonSchema = {
    type: "object",
    properties: {
      citations: { type: "array", items: { type: "string" } },
      reasoning: { type: "string" }
    },
    required: ["citations", "reasoning"]
  };

  const res = await provider.generateStructured<any>({
    systemPrompt: CITATION_SUGGESTION_PROMPT,
    userPrompt,
    schema: jsonSchema,
  });

  // Verify the AI did not invent keys
  const validKeys = new Set(candidates.map(c => c.key));
  const verifiedCitations = (res.data?.citations || []).filter((key: string) => validKeys.has(key));

  return {
    citations: verifiedCitations,
    reasoning: res.data?.reasoning || "",
    provider: res.provider
  };
}

/**
 * Handles RAG search queries.
 */
export async function askResearchAction(
  projectId: string,
  query: string,
  chunksData: any[]
) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  // Validate limits (PART 18)
  const MAX_RESEARCH_RESULTS = 8;
  const MAX_RESEARCH_CONTEXT_CHARS = 10000;
  
  const limitedChunks = chunksData.slice(0, MAX_RESEARCH_RESULTS);
  let totalChars = 0;
  const finalizedChunks = [];
  for (const chunk of limitedChunks) {
    if (totalChars + chunk.content.length <= MAX_RESEARCH_CONTEXT_CHARS) {
      finalizedChunks.push(chunk);
      totalChars += chunk.content.length;
    }
  }

  const provider = await getAIProvider();
  const { RESEARCH_SYSTEM_PROMPT, getResearchPrompt } = await import('@/lib/ai/prompts/research');

  const res = await provider.generateText({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt: getResearchPrompt(query, finalizedChunks),
    temperature: 0.2, // low temperature for analytical tasks
  });

  return { answer: res.text, provider: res.provider };
}

/**
 * Handles Find Evidence action.
 */
export async function findEvidenceAction(
  projectId: string,
  statement: string,
  chunksData: any[]
) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  // Validate limits
  const MAX_RESEARCH_RESULTS = 8;
  const MAX_RESEARCH_CONTEXT_CHARS = 10000;
  
  const limitedChunks = chunksData.slice(0, MAX_RESEARCH_RESULTS);
  let totalChars = 0;
  const finalizedChunks = [];
  for (const chunk of limitedChunks) {
    if (totalChars + chunk.content.length <= MAX_RESEARCH_CONTEXT_CHARS) {
      finalizedChunks.push(chunk);
      totalChars += chunk.content.length;
    }
  }

  const provider = await getAIProvider();
  const { RESEARCH_SYSTEM_PROMPT, getResearchPrompt } = await import('@/lib/ai/prompts/research');

  const query = `Find evidence for or against the following statement: "${statement}". 
If no supporting passage is found in the indexed project, return exactly: "No supporting passage was found in the indexed project." 
Do NOT tell the user the statement is scientifically true/false unless the supplied project evidence supports such a conclusion.`;

  const res = await provider.generateText({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt: getResearchPrompt(query, finalizedChunks),
    temperature: 0.2,
  });

  return { answer: res.text, provider: res.provider };
}

/**
 * Handles general chat messages in the AI assistant panel.
 */
export async function chatAction(
  projectId: string,
  history: { role: 'user' | 'assistant', content: string }[],
  message: string,
  contextData: any
) {
  await requireAuth();
  await requireProjectAccess(projectId, "VIEWER");

  const provider = await getAIProvider();
  
  // Construct a prompt that includes the conversation history
  let prompt = "You are a helpful LaTeX AI assistant integrated into the ResearchTex editor.\n\n";
  
  if (contextData && contextData.activeSelection) {
    prompt += `The user currently has the following text selected in the editor:\n\`\`\`latex\n${contextData.activeSelection}\n\`\`\`\n\n`;
  }
  
  if (history && history.length > 0) {
    prompt += "Conversation history:\n";
    for (const msg of history) {
      prompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
    }
  }
  
  prompt += `USER: ${message}`;

  const res = await provider.generateText({
    systemPrompt: "You are an expert LaTeX and academic writing assistant. Provide concise, helpful answers.",
    userPrompt: prompt,
    temperature: 0.7,
  });

  return { answer: res.text, provider: res.provider };
}

/**
 * Generates embeddings on the server securely.
 */
export async function embedBatchAction(texts: string[]): Promise<number[][]> {
  await requireAuth();
  
  // Ensure we get the API key on the server
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  
  // Use the actual supported model from env or fallback
  const modelName = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  const dimensions = modelName.includes('004') ? 768 : (modelName.includes('001') ? 768 : 768);

  if (texts.length === 0) return [];
  
  const results: number[][] = [];
  
  // Make the API call directly from the server
  for (const text of texts) {
    if (!text.trim()) {
      results.push(new Array(dimensions).fill(0));
      continue;
    }
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${modelName}`,
          content: { parts: [{ text }] }
        })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Embedding failed: ${response.status} ${JSON.stringify(err)}`);
      }
      
      const res = await response.json();
      results.push(res.embedding?.values || []);
    } catch (e) {
      console.error("Embedding generation failed:", e);
      // Push empty to not crash the whole batch
      results.push(new Array(dimensions).fill(0));
    }
  }
  
  return results;
}
