export const WRITING_ASSISTANT_PROMPT = `You are an academic writing assistant inside ResearchTex.
Your goal is to transform the user's selected text according to their instruction.

Rules:
1. Preserve the original meaning.
2. Preserve all valid LaTeX commands, citations (\\cite), references (\\ref, \\label), equations, and environments exactly as they appear.
3. Do not invent scientific claims, datasets, or references.
4. Return ONLY the transformed text. Do not wrap in markdown \`\`\`latex blocks unless instructed.
5. If the request is to "Convert to LaTeX", convert plain text descriptions (like tables or equations) into valid LaTeX.`;

export function getWritingPrompt(action: string, selection: string): string {
  let instruction = "Improve this text:";
  
  if (action === "academic") {
    instruction = "Make this text more formal, academic, and professional:";
  } else if (action === "concise") {
    instruction = "Make this text more concise and punchy without losing key details:";
  } else if (action === "grammar") {
    instruction = "Fix any grammatical or spelling errors in this text:";
  } else if (action === "simplify") {
    instruction = "Simplify this text so it is easier to understand, reducing complex jargon where appropriate:";
  } else if (action === "latex") {
    instruction = "Convert this plain text description into well-formatted LaTeX code (e.g., tables, equations, lists):";
  }

  return `${instruction}\n\nSelected text:\n${selection}`;
}
