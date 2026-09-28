// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { DocumentExtractor } from './extractor';

describe('DocumentExtractor', () => {
  it('extracts LaTeX sections properly', () => {
    const extractor = new DocumentExtractor({ maxChunkChars: 100 });
    const tex = `\\section{Introduction}
This is the introduction.

It has multiple paragraphs.

\\subsection{Background}
Here is the background info.
`;
    
    const chunks = extractor.extract("proj_1", "main.tex", tex);
    
    // Chunk 1: Introduction
    expect(chunks[0].section).toBe("Introduction");
    expect(chunks[0].subsection).toBe("");
    expect(chunks[0].content).toContain("This is the introduction.");
    
    // Chunk 2: Background
    expect(chunks.some(c => c.section === "Introduction" && c.subsection === "Background")).toBe(true);
  });

  it('handles generic text extraction', () => {
    const extractor = new DocumentExtractor({ maxChunkChars: 50 });
    const txt = `Line 1
Line 2
Line 3

Line 4
Line 5`;
    const chunks = extractor.extract("proj_1", "readme.txt", txt);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain("Line 1");
  });
});
