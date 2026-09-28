import { BibEntry, BibTeXParser } from "./parser";

export interface BibliographySearchResult {
  entry: BibEntry;
  score: number;
}

export class BibliographyIndex {
  private entries: Map<string, BibEntry> = new Map();
  private duplicateKeys: string[] = [];
  private warnings: string[] = [];

  constructor(bibtexContent: string) {
    const parser = new BibTeXParser(bibtexContent);
    const { entries, warnings } = parser.parse();
    this.warnings = warnings;
    
    for (const entry of entries) {
      if (this.entries.has(entry.key)) {
        this.duplicateKeys.push(entry.key);
      } else {
        this.entries.set(entry.key, entry);
      }
    }
  }

  public getDuplicateKeys(): string[] {
    return this.duplicateKeys;
  }
  
  public getWarnings(): string[] {
    return this.warnings;
  }

  public getEntries(): BibEntry[] {
    return Array.from(this.entries.values());
  }

  public findByKey(key: string): BibEntry | undefined {
    return this.entries.get(key);
  }

  public search(query: string, maxResults: number = 10): BibliographySearchResult[] {
    if (!query) {
      return Array.from(this.entries.values()).slice(0, maxResults).map(entry => ({ entry, score: 1 }));
    }
    
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results: BibliographySearchResult[] = [];

    for (const entry of this.entries.values()) {
      let score = 0;
      const searchTarget = [
        entry.key,
        entry.fields.title || "",
        entry.fields.author || "",
        entry.fields.year || ""
      ].join(" ").toLowerCase();

      let matchedAll = true;
      for (const term of terms) {
        if (searchTarget.includes(term)) {
          score += 1;
        } else {
          matchedAll = false;
        }
      }

      // If the query contains multiple terms, we want them to all match for high score, 
      // but we'll accept partial matches if they match something.
      if (score > 0) {
        if (matchedAll) score += 5;
        // Boost score if the key starts with or exactly matches the query
        if (entry.key.toLowerCase().startsWith(query.toLowerCase())) score += 5;
        else if (entry.key.toLowerCase().includes(query.toLowerCase())) score += 2;
        
        results.push({ entry, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Helper to identify all undefined citations used in text against this index.
   */
  public findMissingCitations(texContent: string): string[] {
    const missing: Set<string> = new Set();
    // Match \cite{key1,key2} or \citep{key1}
    const citeRegex = /\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite)(?:\[.*?\])?\{([^}]+)\}/g;
    
    let match;
    while ((match = citeRegex.exec(texContent)) !== null) {
      const keys = match[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];
      for (const key of keys) {
        if (!this.entries.has(key)) {
          missing.add(key);
        }
      }
    }
    return Array.from(missing);
  }
  
  /**
   * Helper to identify unused references in this index against given tex content.
   */
  public findUnusedCitations(texContent: string): string[] {
    const citeRegex = /\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite)(?:\[.*?\])?\{([^}]+)\}/g;
    const usedKeys: Set<string> = new Set();
    
    let match;
    while ((match = citeRegex.exec(texContent)) !== null) {
      const keys = match[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];
      for (const key of keys) {
        usedKeys.add(key);
      }
    }
    
    const unused: string[] = [];
    for (const key of this.entries.keys()) {
      if (!usedKeys.has(key)) {
        unused.push(key);
      }
    }
    
    return unused;
  }
}
