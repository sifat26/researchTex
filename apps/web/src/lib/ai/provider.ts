import { GoogleGenAI } from '@google/genai';

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
}

export interface StructuredAIRequest<T> extends AIRequest {
  schema: any; // Using JSON schema compatible object
}

export interface StructuredAIResponse<T> {
  data: T;
  provider: string;
  model: string;
}

export interface AIProvider {
  name: string;
  generateText(request: AIRequest): Promise<AIResponse>;
  generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>>;
  isAvailable(): boolean;
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-3.6-flash') {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  isAvailable(): boolean {
    return true;
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        temperature: request.temperature ?? 0.7,
      }
    });

    return {
      text: res.text || '',
      provider: this.name,
      model: this.model,
    };
  }

  async generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>> {
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        temperature: request.temperature ?? 0.1,
        responseMimeType: 'application/json',
        responseSchema: request.schema,
      }
    });

    const text = res.text || '{}';
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch (e) {
      throw new Error("Failed to parse structured AI response");
    }

    return {
      data,
      provider: this.name,
      model: this.model,
    };
  }
}

export class DisabledProvider implements AIProvider {
  name = 'disabled';
  
  isAvailable(): boolean {
    return false;
  }

  async generateText(): Promise<AIResponse> {
    throw new Error("AI is not configured. Add a Gemini API key to enable AI features.");
  }

  async generateStructured<T>(): Promise<StructuredAIResponse<T>> {
    throw new Error("AI is not configured. Add a Gemini API key to enable AI features.");
  }
}

import { cookies } from "next/headers";

export async function getAIProvider(): Promise<AIProvider> {
  const provider = process.env.AI_PROVIDER || 'gemini';
  
  if (provider === 'gemini') {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get("gemini_api_key")?.value || process.env.GEMINI_API_KEY;
    if (apiKey) {
      return new GeminiProvider(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
    }
  }

  return new DisabledProvider();
}
