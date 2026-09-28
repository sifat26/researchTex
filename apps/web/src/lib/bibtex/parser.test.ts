// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { BibTeXParser } from './parser';

describe('BibTeXParser', () => {
  it('parses a basic article', () => {
    const bib = `
      @article{smith2025,
        author = {Smith, John},
        title = {A Title},
        year = {2025}
      }
    `;
    const parser = new BibTeXParser(bib);
    const result = parser.parse();
    expect(result.warnings).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      key: 'smith2025',
      type: 'article',
      fields: {
        author: 'Smith, John',
        title: 'A Title',
        year: '2025'
      }
    });
  });

  it('handles nested braces', () => {
    const bib = `
      @book{foo,
        title = {The {Foo} {Bar} Book},
        publisher = "O'Reilly \\{Media\\}"
      }
    `;
    const parser = new BibTeXParser(bib);
    const result = parser.parse();
    expect(result.entries[0]?.fields['title']).toBe('The {Foo} {Bar} Book');
    expect(result.entries[0]?.fields['publisher']).toBe("O'Reilly \\{Media\\}");
  });

  it('recovers from missing comma', () => {
    const bib = `
      @article{good1, title={T1} }
      @article{bad, title={T2} year={2020} }
      @article{good2, title={T3} }
    `;
    const parser = new BibTeXParser(bib);
    const result = parser.parse();
    // good1 should be parsed
    expect(result.entries[0]?.key).toBe('good1');
    // bad might have warnings and be truncated
    expect(result.warnings.length).toBeGreaterThan(0);
    // good2 should be parsed because it recovered
    expect(result.entries[result.entries.length - 1]?.key).toBe('good2');
  });

  it('handles quotes and macros', () => {
    const bib = `
      @article{test,
        month = oct # " 12",
        note = "See {Smith, 2020}"
      }
    `;
    const parser = new BibTeXParser(bib);
    const result = parser.parse();
    expect(result.entries[0]?.fields['month']).toBe('oct  12');
    expect(result.entries[0]?.fields['note']).toBe('See {Smith, 2020}');
  });
});
