import { BibliographyIndex } from '../bibtex/index';

export interface ProjectStructureNode {
  type: 'section' | 'subsection' | 'subsubsection';
  title: string;
  line: number;
  file: string;
}

export interface ProjectAsset {
  type: 'figure' | 'table' | 'equation';
  caption?: string;
  line: number;
  file: string;
}

export interface ProjectLabel {
  name: string;
  line: number;
  file: string;
}

export interface ProjectCitation {
  key: string;
  line: number;
  file: string;
}

export interface ProjectReference {
  key: string;
  line: number;
  file: string;
}

export interface ProjectIntelligenceResult {
  structure: ProjectStructureNode[];
  assets: ProjectAsset[];
  labels: ProjectLabel[];
  citations: ProjectCitation[];
  references: ProjectReference[];
  unusedCitations: string[]; // Keys in Bibliography but not cited
  brokenRefs: string[]; // Refs without matching label
}

export class WorkspaceIntelligence {
  public static analyze(
    files: { path: string; content: string }[],
    bibIndex?: BibliographyIndex
  ): ProjectIntelligenceResult {
    const structure: ProjectStructureNode[] = [];
    const assets: ProjectAsset[] = [];
    const labels: ProjectLabel[] = [];
    const citations: ProjectCitation[] = [];
    const references: ProjectReference[] = [];

    // Regexes
    const secRegex = /\\(section|subsection|subsubsection)(?:\[.*?\])?\{(.*?)\}/g;
    const beginEnvRegex = /\\begin\{(figure|table|equation)\}/g;
    const captionRegex = /\\caption\{(.*?)\}/g;
    const labelRegex = /\\label\{(.*?)\}/g;
    const refRegex = /\\(ref|cref|Cref|autoref)\{(.*?)\}/g;
    const citeRegex = /\\(cite|textcite|parencite|autocite|footcite)(?:\[.*?\])?(?:\[.*?\])?\{(.*?)\}/g;

    for (const file of files) {
      if (!file.path.endsWith('.tex')) continue;

      const lines = file.content.split('\n');
      
      let currentEnv: { type: 'figure' | 'table' | 'equation', line: number } | null = null;
      let currentCaption: string | undefined = undefined;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const lineNum = i + 1;

        // Structure
        let match;
        secRegex.lastIndex = 0;
        while ((match = secRegex.exec(line)) !== null) {
          structure.push({ type: match[1] as any, title: match[2] || '', line: lineNum, file: file.path });
        }

        // Environments
        beginEnvRegex.lastIndex = 0;
        if ((match = beginEnvRegex.exec(line)) !== null) {
          currentEnv = { type: match[1] as any, line: lineNum };
          currentCaption = undefined;
        }

        if (currentEnv) {
          captionRegex.lastIndex = 0;
          if ((match = captionRegex.exec(line)) !== null) {
            currentCaption = match[1];
          }

          if (line.includes(`\\end{${currentEnv.type}}`)) {
            assets.push({
              type: currentEnv.type,
              caption: currentCaption,
              line: currentEnv.line,
              file: file.path
            });
            currentEnv = null;
          }
        }

        // Labels
        labelRegex.lastIndex = 0;
        while ((match = labelRegex.exec(line)) !== null) {
          labels.push({ name: match[1] || '', line: lineNum, file: file.path });
        }

        // References
        refRegex.lastIndex = 0;
        while ((match = refRegex.exec(line)) !== null) {
          const keys = (match[2] || "").split(',').map(k => k.trim());
          for (const key of keys) {
            references.push({ key, line: lineNum, file: file.path });
          }
        }

        // Citations
        citeRegex.lastIndex = 0;
        while ((match = citeRegex.exec(line)) !== null) {
          const keys = (match[2] || "").split(',').map(k => k.trim());
          for (const key of keys) {
            citations.push({ key, line: lineNum, file: file.path });
          }
        }
      }
    }

    // Unused citations
    const citedKeys = new Set(citations.map(c => c.key));
    const allBibKeys = bibIndex ? bibIndex.getEntries().map(e => e.key) : [];
    const unusedCitations = allBibKeys.filter(k => !citedKeys.has(k));

    // Broken refs
    const labelNames = new Set(labels.map(l => l.name));
    const brokenRefs = references.filter(r => !labelNames.has(r.key)).map(r => r.key);

    return {
      structure,
      assets,
      labels,
      citations,
      references,
      unusedCitations,
      brokenRefs: Array.from(new Set(brokenRefs)) // deduplicate
    };
  }
}
