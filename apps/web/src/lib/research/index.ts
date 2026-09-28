import { DocumentChunk } from './extractor';
import { EmbeddingProvider } from '../ai/embedding';

export interface SearchOptions {
  limit?: number;
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
}

export interface DocumentIndex {
  indexProject(projectId: string, chunks: DocumentChunk[]): Promise<void>;
  updateFile(projectId: string, filePath: string, newChunks: DocumentChunk[]): Promise<void>;
  removeProject(projectId: string): Promise<void>;
  search(projectId: string, query: string, options?: SearchOptions): Promise<RetrievedChunk[]>;
}

export interface ResearchRetriever {
  search(projectId: string, query: string, options?: SearchOptions): Promise<RetrievedChunk[]>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class LocalDocumentIndex implements DocumentIndex, ResearchRetriever {
  // Structure: Map<projectId, Map<filePath, DocumentChunk[]>>
  private index = new Map<string, Map<string, DocumentChunk[]>>();
  private embeddingProvider?: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  public async indexProject(projectId: string, chunks: DocumentChunk[]): Promise<void> {
    if (this.embeddingProvider && await this.embeddingProvider.isAvailable()) {
      const texts = chunks.map(c => c.content);
      const embeddings = await this.embeddingProvider.embedBatch(texts);
      chunks.forEach((chunk, i) => {
        chunk.embedding = embeddings[i];
      });
    }

    const projectMap = new Map<string, DocumentChunk[]>();
    for (const chunk of chunks) {
      if (!projectMap.has(chunk.filePath)) {
        projectMap.set(chunk.filePath, []);
      }
      projectMap.get(chunk.filePath)!.push(chunk);
    }
    this.index.set(projectId, projectMap);
  }

  public async updateFile(projectId: string, filePath: string, newChunks: DocumentChunk[]): Promise<void> {
    if (this.embeddingProvider && await this.embeddingProvider.isAvailable()) {
      const texts = newChunks.map(c => c.content);
      const embeddings = await this.embeddingProvider.embedBatch(texts);
      newChunks.forEach((chunk, i) => {
        chunk.embedding = embeddings[i];
      });
    }

    if (!this.index.has(projectId)) {
      this.index.set(projectId, new Map<string, DocumentChunk[]>());
    }
    const projectMap = this.index.get(projectId)!;
    projectMap.set(filePath, newChunks);
  }

  public async removeProject(projectId: string): Promise<void> {
    this.index.delete(projectId);
  }

  public async search(projectId: string, query: string, options?: SearchOptions): Promise<RetrievedChunk[]> {
    const projectMap = this.index.get(projectId);
    if (!projectMap) return [];

    const limit = options?.limit || 10;
    const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    
    let queryEmbedding: number[] | null = null;
    if (this.embeddingProvider && await this.embeddingProvider.isAvailable()) {
       queryEmbedding = await this.embeddingProvider.embed(query);
    }

    const scoredChunks: RetrievedChunk[] = [];
    let maxKeywordScore = 0;

    const chunkScores = new Map<DocumentChunk, { keyword: number, semantic: number }>();

    for (const [filePath, chunks] of Array.from(projectMap.entries())) {
        const fileMatch = queryTerms.some(t => filePath.toLowerCase().includes(t)) ? 2 : 0;
        
        for (const chunk of chunks) {
            let kwScore = fileMatch;
            const contentLower = chunk.content.toLowerCase();
            
            if (chunk.section && queryTerms.some(t => chunk.section!.toLowerCase().includes(t))) {
                kwScore += 3;
            }
            if (chunk.subsection && queryTerms.some(t => chunk.subsection!.toLowerCase().includes(t))) {
                kwScore += 3;
            }
            if (contentLower.includes(query.toLowerCase())) {
                kwScore += 5;
            }
            for (const term of queryTerms) {
                let occurrences = 0;
                let pos = contentLower.indexOf(term);
                while (pos !== -1) {
                    occurrences++;
                    pos = contentLower.indexOf(term, pos + term.length);
                }
                kwScore += occurrences;
            }
            if (kwScore > maxKeywordScore) maxKeywordScore = kwScore;

            let semScore = 0;
            if (queryEmbedding && chunk.embedding) {
               semScore = cosineSimilarity(queryEmbedding, chunk.embedding);
               semScore = Math.max(0, semScore); 
            }

            chunkScores.set(chunk, { keyword: kwScore, semantic: semScore });
        }
    }

    for (const [chunk, scores] of Array.from(chunkScores.entries())) {
        let finalScore = 0;
        if (queryEmbedding) {
            const normalizedKw = maxKeywordScore > 0 ? scores.keyword / maxKeywordScore : 0;
            finalScore = (scores.semantic * 0.7) + (normalizedKw * 0.3);
        } else {
            finalScore = scores.keyword;
        }

        if (finalScore > 0) {
            scoredChunks.push({ ...chunk, score: finalScore });
        }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, limit);
  }
}
