import { callGemini, GeminiError, parseJsonLoose } from './geminiClient';
import { callOpenAI, OpenAIError } from './openAiClient';
import { storageService } from './storageService';

export interface AICallOptions {
  provider?: 'openai' | 'gemini';
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  json?: boolean;
  retries?: number;
}

/** Despachante inteligente unificado que encaminha chamadas para OpenAI ou Google Gemini */
export async function callAI(opts: AICallOptions): Promise<string> {
  const provider = opts.provider || storageService.getAiProvider();
  const apiKey = opts.apiKey || storageService.getApiKey();
  const model = opts.model || storageService.getModel();
  const temperature = opts.temperature ?? 0.3;
  const json = opts.json ?? true;
  const retries = opts.retries ?? 2;

  if (provider === 'openai') {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (opts.systemPrompt) {
      messages.push({ role: 'system', content: opts.systemPrompt });
    }
    messages.push({ role: 'user', content: opts.userPrompt });

    return await callOpenAI({
      apiKey,
      model,
      messages,
      temperature,
      json,
      retries
    });
  } else {
    const parts: { text: string }[] = [];
    if (opts.systemPrompt) {
      parts.push({ text: opts.systemPrompt });
    }
    parts.push({ text: opts.userPrompt });

    return await callGemini({
      apiKey,
      model,
      parts,
      temperature,
      json,
      retries
    });
  }
}

export { parseJsonLoose, OpenAIError, GeminiError };
