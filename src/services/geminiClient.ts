export class GeminiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

const friendlyHttpError = (status: number, apiMessage?: string): string => {
  if (status === 400 && /api key/i.test(apiMessage || '')) return 'Chave de API inválida. Revise nas Configurações.';
  if (status === 401 || status === 403) return 'Chave de API sem permissão ou inválida. Revise nas Configurações.';
  if (status === 404) return 'Modelo não encontrado. Escolha outro modelo nas Configurações.';
  if (status === 429) return 'Limite de uso da API do Gemini atingido. Aguarde alguns instantes.';
  if (status >= 500) return 'O serviço do Gemini está indisponível no momento.';
  return apiMessage || `Erro HTTP ${status} ao chamar o Gemini.`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface GeminiCallOptions {
  apiKey: string;
  model: string;
  parts: { text: string }[];
  temperature?: number;
  json?: boolean;
  retries?: number;
}

/** Chama o Gemini e devolve o texto da primeira resposta. Lança GeminiError em caso de falha. */
export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const { apiKey, model, parts, temperature = 0.3, json = true, retries = 2 } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let lastError: GeminiError = new GeminiError('Falha desconhecida ao chamar o Gemini.');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature,
            ...(json ? { responseMimeType: 'application/json' } : {})
          }
        })
      });

      if (!response.ok) {
        let apiMessage: string | undefined;
        try {
          apiMessage = (await response.json())?.error?.message;
        } catch {
          /* corpo sem JSON */
        }
        lastError = new GeminiError(friendlyHttpError(response.status, apiMessage), response.status);
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < retries) {
          await sleep(800 * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
        throw new GeminiError(
          reason ? `O Gemini não retornou conteúdo (${reason}).` : 'O Gemini retornou uma resposta vazia.'
        );
      }
      return text;
    } catch (e: any) {
      if (e instanceof GeminiError) throw e;
      lastError = new GeminiError(e?.message ? `Falha de rede: ${e.message}` : 'Falha de conexão com a API do Gemini.');
      if (attempt < retries) {
        await sleep(800 * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

/** Extrai um objeto JSON de uma resposta, tolerando cercas de markdown e texto extra. */
export function parseJsonLoose<T = any>(raw: string): T {
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* cai no erro abaixo */
      }
    }
    throw new GeminiError('A resposta da IA não veio em JSON válido. Tente novamente.');
  }
}
