
export interface EmbeddingProvider {
  readonly id: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions(): number | null;
  isAvailable(): Promise<boolean>;
}

export class NoopEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'noop';
  async embed(text: string): Promise<number[]> {
    return [];
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => []);
  }
  dimensions(): number | null {
    return null;
  }
  async isAvailable(): Promise<boolean> {
    return false;
  }
}

export class ServerActionEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'server-action';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  dimensions(): number | null {
    return 768; // Usually 768 for gemini models, but server handles details
  }

  async embed(text: string): Promise<number[]> {
    const { embedBatchAction } = await import('@/app/actions/ai.actions');
    const res = await embedBatchAction([text]);
    return res[0] || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { embedBatchAction } = await import('@/app/actions/ai.actions');
    return await embedBatchAction(texts);
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return new ServerActionEmbeddingProvider();
}
