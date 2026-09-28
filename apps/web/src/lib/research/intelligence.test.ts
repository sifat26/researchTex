// @ts-ignore
import { expect, test, describe } from 'vitest';
import { WorkspaceIntelligence } from './intelligence';
import { BibliographyIndex } from '../bibtex/index';

describe('WorkspaceIntelligence', () => {
  test('extracts structure correctly', () => {
    const tex = `
\\section{Introduction}
Some text here.
\\subsection{Background}
More text.
\\subsubsection{Previous Work}
Even more text.
    `;
    const files = [{ path: 'main.tex', content: tex }];
    const result = WorkspaceIntelligence.analyze(files);
    
    expect(result.structure).toHaveLength(3);
    expect(result.structure[0]).toEqual({ type: 'section', title: 'Introduction', line: 2, file: 'main.tex' });
    expect(result.structure[1]).toEqual({ type: 'subsection', title: 'Background', line: 4, file: 'main.tex' });
    expect(result.structure[2]).toEqual({ type: 'subsubsection', title: 'Previous Work', line: 6, file: 'main.tex' });
  });

  test('extracts assets (figures, tables, equations)', () => {
    const tex = `
\\begin{figure}
\\caption{A beautiful plot}
\\end{figure}

\\begin{table}
\\end{table}

\\begin{equation}
E = mc^2
\\end{equation}
    `;
    const files = [{ path: 'main.tex', content: tex }];
    const result = WorkspaceIntelligence.analyze(files);
    
    expect(result.assets).toHaveLength(3);
    expect(result.assets[0]!.type).toBe('figure');
    expect(result.assets[0]!.caption).toBe('A beautiful plot');
    expect(result.assets[0]!.line).toBe(2);
    expect(result.assets[1]!.type).toBe('table');
    expect(result.assets[2]!.type).toBe('equation');
  });

  test('extracts labels and broken refs', () => {
    const tex = `
\\section{Test} \\label{sec:test}
See \\ref{sec:test} and \\ref{fig:missing}.
    `;
    const files = [{ path: 'main.tex', content: tex }];
    const result = WorkspaceIntelligence.analyze(files);
    
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]!.name).toBe('sec:test');
    
    expect(result.references).toHaveLength(2);
    expect(result.brokenRefs).toEqual(['fig:missing']);
  });

  test('extracts unused citations', () => {
    const bib = `
@article{used2024,
  title={Used Citation}
}
@book{unused2024,
  title={Unused Citation}
}
    `;
    const bibIndex = new BibliographyIndex(bib);
    
    const tex = `
Here is a citation \\cite{used2024}.
    `;
    const files = [{ path: 'main.tex', content: tex }];
    const result = WorkspaceIntelligence.analyze(files, bibIndex);
    
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.key).toBe('used2024');
    expect(result.unusedCitations).toEqual(['unused2024']);
  });
});
