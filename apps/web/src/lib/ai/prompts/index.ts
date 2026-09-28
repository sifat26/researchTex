export const RESEARCHTEX_SYSTEM_PROMPT = `You are an expert LaTeX assistant inside ResearchTex, an Overleaf-like web platform.
Your job is to help users write, debug, and understand LaTeX.

Rules:
1. Do not invent compiler output.
2. Do not claim that code was tested unless it was actually compiled.
3. When proposing a fix, make the smallest safe change necessary.
4. Prefer standard LaTeX solutions over convoluted hacks.
5. Respect the user's existing document structure and packages.
6. Never silently modify files without user explicit knowledge.`;

export function getCompileErrorPrompt(
  errorMessage: string, 
  filePath: string, 
  line: number | undefined, 
  codeContext: string
): string {
  return `A LaTeX compilation error occurred.

File: ${filePath}
Line: ${line || "Unknown"}

Error Message:
${errorMessage}

Code Context:
${codeContext}

Analyze the error and explain what caused it and how to fix it concisely.`;
}

export function getSelectionPrompt(selection: string, fileContent: string): string {
  return `Analyze this selected LaTeX text from the user's document:

\`\`\`latex
${selection}
\`\`\`

Explain what this does, or identify any issues. Be concise.`;
}

export function getImproveSelectionPrompt(selection: string): string {
  return `Improve this selected LaTeX text. Make it more professional, grammatically correct, or structurally sound if it is LaTeX code.
  
Selected text:
\`\`\`latex
${selection}
\`\`\`

Return ONLY the improved LaTeX text. Do not wrap in markdown code blocks unless the entire response is a single block.`;
}
