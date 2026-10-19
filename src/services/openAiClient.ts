export class OpenAIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenAIError';
    this.status = status;
  }
}

const friendlyOpenAiError = (status: number, apiMessage?: string): string => {
  if (status === 401) return 'Chave de API da OpenAI inválida ou sem permissão. Verifique nas Configurações.';
  if (status === 429) return 'Limite de requisições ou créditos da OpenAI atingido. Verifique o plano da OpenAI.';
  if (status === 404) return 'Modelo da OpenAI não encontrado. Escolha outro modelo nas Configurações.';
  if (status >= 500) return 'O serviço da OpenAI está temporariamente indisponível.';
  return apiMessage || `Erro HTTP ${status} ao chamar a OpenAI.`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface OpenAICallOptions {
  apiKey: string;
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  json?: boolean;
  retries?: number;
}

/** Chama a API do OpenAI Chat Completions e devolve o texto da resposta. Lança OpenAIError em caso de falha. */
export async function callOpenAI(opts: OpenAICallOptions): Promise<string> {
  const { apiKey, model, messages, temperature = 0.3, json = true, retries = 2 } = opts;
  const url = 'https://api.openai.com/v1/chat/completions';

  let lastError: OpenAIError = new OpenAIError('Falha desconhecida ao chamar a OpenAI.');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(json ? { response_format: { type: 'json_object' } } : {})
        })
      });

      if (!response.ok) {
        let apiMessage: string | undefined;
        try {
          const errData = await response.json();
          apiMessage = errData?.error?.message;
        } catch {
          /* corpo sem JSON */
        }
        lastError = new OpenAIError(friendlyOpenAiError(response.status, apiMessage), response.status);
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < retries) {
          await sleep(800 * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new OpenAIError('A OpenAI retornou uma resposta sem conteúdo.');
      }
      return text;
    } catch (e: any) {
      if (e instanceof OpenAIError) throw e;
      lastError = new OpenAIError(e?.message ? `Falha de rede com OpenAI: ${e.message}` : 'Falha de conexão com a API da OpenAI.');
      if (attempt < retries) {
        await sleep(800 * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface WhisperResult {
  text: string;
  duration?: number;
  segments: WhisperSegment[];
}

/** Transcreve arquivo de áudio (.mp3, .wav, .m4a, .ogg, .webm) via modelo Whisper da OpenAI */
export async function transcribeAudioWithWhisper(
  file: File | Blob,
  apiKey: string,
  customFileName?: string
): Promise<WhisperResult> {
  const url = 'https://api.openai.com/v1/audio/transcriptions';
  const formData = new FormData();
  const name = customFileName || (file instanceof File ? file.name : 'audio.mp3');
  formData.append('file', file, name);
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');
  formData.append('response_format', 'verbose_json');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      let apiMessage: string | undefined;
      try {
        const errData = await response.json();
        apiMessage = errData?.error?.message;
      } catch {
        /* corpo sem json */
      }
      throw new OpenAIError(friendlyOpenAiError(response.status, apiMessage), response.status);
    }

    const data = await response.json();
    return {
      text: data.text || '',
      duration: data.duration,
      segments: (data.segments || []).map((seg: any) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: (seg.text || '').trim()
      }))
    };
  } catch (e: any) {
    if (e instanceof OpenAIError) throw e;
    throw new OpenAIError(e?.message ? `Falha ao transcrever áudio com Whisper: ${e.message}` : 'Falha na conexão com o serviço Whisper da OpenAI.');
  }
}
