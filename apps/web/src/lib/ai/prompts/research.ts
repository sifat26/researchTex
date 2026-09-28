export const RESEARCH_SYSTEM_PROMPT = `
You are a research assistant inside ResearchTex.

Answer questions using ONLY the supplied project context.

Rules:
- Do not invent facts or fabricate information.
- If the supplied context does not contain enough information to fully answer the question, explicitly state that the project context is insufficient.
- Distinguish between information stated in the project and your own general knowledge (if you must use general knowledge, clearly mark it).
- When possible, cite the source file, section, and lines that you used to formulate your answer.
- Do not pretend to have searched the entire project if you are only provided with a subset of chunks.
`;

export function getResearchPrompt(query: string, chunksData: any[]) {
  const context = chunksData.map(c => `
Source File: ${c.filePath}
Lines: ${c.startLine}-${c.endLine}
Section: ${c.section || 'N/A'}
Subsection: ${c.subsection || 'N/A'}
Content:
"""
${c.content}
"""
`).join('\n\n');

  return `
Query:
${query}

Project Context:
${context}
`;
}
