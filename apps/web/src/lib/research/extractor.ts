import { v4 as uuidv4 } from 'uuid';

export interface DocumentChunk {
  id: string;
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  section?: string;
  subsection?: string;
  content: string;
  embedding?: number[];
}

export interface ExtractorOptions {
  maxChunkChars?: number;
  overlapChars?: number;
}

export class DocumentExtractor {
  private maxChunkChars: number;
  private overlapChars: number;

  constructor(options: ExtractorOptions = {}) {
    this.maxChunkChars = options.maxChunkChars || 1000;
    this.overlapChars = options.overlapChars || 100;
  }

  public extract(projectId: string, filePath: string, content: string): DocumentChunk[] {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (ext === 'tex') {
      return this.extractLatex(projectId, filePath, content);
    } else if (ext === 'bib') {
      return this.extractBib(projectId, filePath, content);
    } else {
      // Default fallback for md, txt, etc.
      return this.extractGeneric(projectId, filePath, content);
    }
  }

  private extractLatex(projectId: string, filePath: string, content: string): DocumentChunk[] {
    const lines = content.split('\n');
    const chunks: DocumentChunk[] = [];
    
    let currentSection = "";
    let currentSubsection = "";
    
    let currentChunkLines: string[] = [];
    let currentChunkStartLine = 1;
    let currentChunkChars = 0;

    const flushChunk = (endLine: number) => {
      if (currentChunkLines.length === 0) return;
      
      const chunkContent = currentChunkLines.join('\n').trim();
      if (chunkContent.length > 0) {
        // If the chunk is wildly oversized, we fallback to hard character splitting
        if (chunkContent.length > this.maxChunkChars * 1.5) {
            const splitChunks = this.splitByCharLimit(chunkContent, this.maxChunkChars, this.overlapChars);
            let subStart = currentChunkStartLine;
            for (const text of splitChunks) {
                // approximate line numbers for the hard split
                const approxLines = text.split('\n').length;
                chunks.push({
                    id: uuidv4(),
                    projectId,
                    filePath,
                    startLine: subStart,
                    endLine: subStart + approxLines - 1,
                    section: currentSection,
                    subsection: currentSubsection,
                    content: text
                });
                subStart += approxLines;
            }
        } else {
            chunks.push({
                id: uuidv4(),
                projectId,
                filePath,
                startLine: currentChunkStartLine,
                endLine: endLine,
                section: currentSection,
                subsection: currentSubsection,
                content: chunkContent
            });
        }
      }
      
      currentChunkLines = [];
      currentChunkChars = 0;
      currentChunkStartLine = endLine + 1;
    };

    const sectionRegex = /\\section(?:\[.*?\])?\{(.*?)\}/;
    const subsectionRegex = /\\subsection(?:\[.*?\])?\{(.*?)\}/;
    const envBeginRegex = /\\begin\{.*?\}/;
    const envEndRegex = /\\end\{.*?\}/;

    let inEnv = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Semantic Boundaries
      const secMatch = trimmed.match(sectionRegex);
      const subsecMatch = trimmed.match(subsectionRegex);
      const beginMatch = trimmed.match(envBeginRegex);
      const endMatch = trimmed.match(envEndRegex);
      
      const isParagraphBreak = trimmed === "";

      // If we hit a section, flush whatever we had
      if (secMatch) {
        flushChunk(lineNum - 1);
        currentSection = secMatch[1] || "";
        currentSubsection = ""; // reset subsection
        currentChunkStartLine = lineNum;
      } else if (subsecMatch) {
        flushChunk(lineNum - 1);
        currentSubsection = subsecMatch[1] || "";
        currentChunkStartLine = lineNum;
      } else if (beginMatch) {
        // flush before env if we have a lot
        if (currentChunkChars > this.maxChunkChars * 0.5 && !inEnv) {
            flushChunk(lineNum - 1);
        }
        inEnv = true;
      } else if (endMatch) {
        inEnv = false;
        // don't flush immediately, allow text to continue, but if large we can flush later
      }

      currentChunkLines.push(line);
      currentChunkChars += line.length + 1; // +1 for newline

      // Flush heuristically
      if (!inEnv) {
        if (currentChunkChars >= this.maxChunkChars) {
           // We prefer flushing at paragraph breaks if possible
           if (isParagraphBreak) {
             flushChunk(lineNum);
           } else if (currentChunkChars >= this.maxChunkChars * 1.5) {
             // Hard flush if getting too large despite no paragraph break
             flushChunk(lineNum);
           }
        }
      }
    }

    // Flush remaining
    flushChunk(lines.length);

    return chunks;
  }

  private extractBib(projectId: string, filePath: string, content: string): DocumentChunk[] {
    // For BibTeX, we'll chunk by @entry
    const lines = content.split('\n');
    const chunks: DocumentChunk[] = [];
    
    let currentChunkLines: string[] = [];
    let currentStart = 1;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || "";
        
        // Very simplistic boundary detection for bib
        if (line.trim().startsWith('@') && braceLevel === 0 && currentChunkLines.length > 0) {
            chunks.push({
                id: uuidv4(),
                projectId,
                filePath,
                startLine: currentStart,
                endLine: i,
                content: currentChunkLines.join('\n').trim()
            });
            currentChunkLines = [];
            currentStart = i + 1;
        }

        // track braces to know when an entry likely ends
        for (const char of line) {
            if (char === '{') braceLevel++;
            if (char === '}') braceLevel = Math.max(0, braceLevel - 1);
        }

        currentChunkLines.push(line);
    }

    if (currentChunkLines.length > 0) {
        chunks.push({
            id: uuidv4(),
            projectId,
            filePath,
            startLine: currentStart,
            endLine: lines.length,
            content: currentChunkLines.join('\n').trim()
        });
    }

    return chunks;
  }

  private extractGeneric(projectId: string, filePath: string, content: string): DocumentChunk[] {
    const lines = content.split('\n');
    const chunks: DocumentChunk[] = [];
    
    let currentChunkLines: string[] = [];
    let currentChunkStartLine = 1;
    let currentChunkChars = 0;

    const flushChunk = (endLine: number) => {
        if (currentChunkLines.length === 0) return;
        
        const chunkContent = currentChunkLines.join('\n').trim();
        if (chunkContent.length > 0) {
            if (chunkContent.length > this.maxChunkChars * 1.5) {
                const splitChunks = this.splitByCharLimit(chunkContent, this.maxChunkChars, this.overlapChars);
                let subStart = currentChunkStartLine;
                for (const text of splitChunks) {
                    const approxLines = text.split('\n').length;
                    chunks.push({
                        id: uuidv4(),
                        projectId,
                        filePath,
                        startLine: subStart,
                        endLine: subStart + approxLines - 1,
                        content: text
                    });
                    subStart += approxLines;
                }
            } else {
                chunks.push({
                    id: uuidv4(),
                    projectId,
                    filePath,
                    startLine: currentChunkStartLine,
                    endLine: endLine,
                    content: chunkContent
                });
            }
        }
        currentChunkLines = [];
        currentChunkChars = 0;
        currentChunkStartLine = endLine + 1;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || "";
        const isParagraphBreak = line.trim() === "";

        currentChunkLines.push(line);
        currentChunkChars += line.length + 1;

        if (currentChunkChars >= this.maxChunkChars) {
            if (isParagraphBreak || currentChunkChars >= this.maxChunkChars * 1.5) {
                flushChunk(i + 1);
            }
        }
    }

    flushChunk(lines.length);

    return chunks;
  }

  private splitByCharLimit(text: string, limit: number, overlap: number): string[] {
      const chunks: string[] = [];
      let i = 0;
      while (i < text.length) {
          const end = Math.min(i + limit, text.length);
          chunks.push(text.substring(i, end));
          if (end === text.length) break;
          i += limit - overlap;
      }
      return chunks;
  }
}
