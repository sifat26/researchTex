// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { LocalDocumentIndex } from './index';

describe('LocalDocumentIndex', () => {
  it('indexes chunks and searches them with basic keyword matching', async () => {
    const index = new LocalDocumentIndex();
    
    await index.indexProject('proj_1', [
      {
        id: '1',
        projectId: 'proj_1',
        filePath: 'main.tex',
        startLine: 1,
        endLine: 10,
        section: 'Methodology',
        content: 'We propose a new dual-input architecture using ResNet.'
      },
      {
        id: '2',
        projectId: 'proj_1',
        filePath: 'main.tex',
        startLine: 11,
        endLine: 20,
        section: 'Results',
        content: 'The experimental results show significant improvements.'
      }
    ]);

    const results = await index.search('proj_1', 'dual-input architecture');
    expect(results.length).toBeGreaterThan(0);
    // the first result should be the Methodology chunk
    expect(results[0].id).toBe('1');
    
    const results2 = await index.search('proj_1', 'results');
    expect(results2.length).toBeGreaterThan(0);
    expect(results2[0].id).toBe('2'); // matches section and content
  });

  it('incorporates semantic embeddings if available', async () => {
    // mock embedding provider
    const mockProvider = {
      isAvailable: () => true,
      dimensions: () => 3,
      embed: async (t: string) => [1, 0, 0], // query vector
      embedBatch: async (texts: string[]) => texts.map((t, i) => i === 0 ? [1, 0, 0] : [0, 1, 0]) // first text matches query
    };
    
    const index = new LocalDocumentIndex(mockProvider as any);
    await index.indexProject('proj_2', [
      {
        id: '1', projectId: 'proj_2', filePath: 'main.tex', startLine: 1, endLine: 5,
        content: 'This has semantic overlap but no keyword overlap.' // gets [1, 0, 0]
      },
      {
        id: '2', projectId: 'proj_2', filePath: 'main.tex', startLine: 6, endLine: 10,
        content: 'Some random stuff here.' // gets [0, 1, 0]
      }
    ]);
    
    // query is 'test', which has no keyword overlap with either
    const results = await index.search('proj_2', 'test');
    expect(results.length).toBeGreaterThan(0);
    // semantic score should bump chunk 1 to top
    expect(results[0].id).toBe('1');
  });
});
