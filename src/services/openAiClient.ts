import { filterWhisperSegments, isAudioBlobValid, isWhisperHallucination } from './whisperFilter';

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
  speaker?: string;
}

export interface WhisperResult {
  text: string;
  duration?: number;
  segments: WhisperSegment[];
}

export interface WhisperTranscribeOptions {
  /** Vocabulário extraído do projeto e da sessão ativa (nomes de stakeholders, tópicos). */
  prompt?: string;
  /** Modelo de transcrição ('whisper-1' padrão para preservar verbose_json com segmentos). */
  model?: 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';
}

export interface RealtimeTranscriptionSessionInfo {
  sessionId: string;
  ephemeralToken: string;
  expiresAt?: number;
  model: string;
}

/**
 * Solicita um token efêmero direto do navegador para sessão Realtime de transcrição via WebRTC (E12.5).
 * Usa `gpt-4o-transcribe` com VAD no servidor e vocabulário do projeto.
 */
export async function createRealtimeTranscriptionSession(
  apiKey: string,
  options?: { prompt?: string; model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' }
): Promise<RealtimeTranscriptionSessionInfo> {
  const model = options?.model ?? 'gpt-4o-transcribe';
  const response = await fetch('https://api.openai.com/v1/realtime/transcription_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1'
    },
    body: JSON.stringify({
      input_audio_transcription: {
        model,
        language: 'pt',
        ...(options?.prompt?.trim() ? { prompt: options.prompt.trim() } : {})
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 600
      }
    })
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
  const token: string | undefined = data?.client_secret?.value;
  if (!token) {
    throw new OpenAIError('A OpenAI não retornou um token efêmero válido para a sessão Realtime.');
  }

  return {
    sessionId: data?.id || 'rt-session',
    ephemeralToken: token,
    expiresAt: data?.client_secret?.expires_at,
    model
  };
}

/**
 * Separa os segmentos transcritos em turnos de fala (`Entrevistador (PM)` vs `Usuário / Stakeholder`, E12.5):
 * respeita rótulo de diarização se presente (`seg.speaker`), perguntas de condução e pausas entre falas.
 */
export function inferSpeakerTurnsFromWhisper(
  segments: WhisperSegment[]
): { speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder'; text: string; start: number; end: number }[] {
  let currentSpeaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder' = 'Usuário / Stakeholder';

  return segments.map((seg, idx) => {
    const text = seg.text.trim();
    const prev = idx > 0 ? segments[idx - 1] : undefined;
    const pauseSeconds = prev ? Math.max(0, seg.start - prev.end) : 0;

    if (seg.speaker) {
      const lowered = seg.speaker.toLowerCase();
      currentSpeaker =
        lowered.includes('pm') || lowered.includes('entrevistador') || lowered === 'speaker_0'
          ? 'Entrevistador (PM)'
          : 'Usuário / Stakeholder';
    } else if (
      text.endsWith('?') &&
      /\b(como|qual|quais|quando|onde|quem|quanto|me conta|pode contar|última vez|ultima vez|por que|por quê)\b/i.test(text)
    ) {
      currentSpeaker = 'Entrevistador (PM)';
    } else if (prev && currentSpeaker === 'Entrevistador (PM)' && !text.endsWith('?')) {
      currentSpeaker = 'Usuário / Stakeholder';
    } else if (pauseSeconds > 2.5 && text.endsWith('?')) {
      currentSpeaker = 'Entrevistador (PM)';
    }

    return {
      speaker: currentSpeaker,
      text,
      start: seg.start,
      end: seg.end
    };
  });
}

async function requestWhisperTranscription(
  file: File | Blob,
  apiKey: string,
  name: string,
  language: string | undefined,
  options?: WhisperTranscribeOptions
): Promise<WhisperResult> {
  const url = 'https://api.openai.com/v1/audio/transcriptions';
  const model = options?.model ?? 'whisper-1';
  const formData = new FormData();
  formData.append('file', file, name);
  formData.append('model', model);
  if (language) formData.append('language', language);
  formData.append('response_format', model === 'whisper-1' ? 'verbose_json' : 'json');
  if (options?.prompt?.trim()) {
    formData.append('prompt', options.prompt.trim());
  }

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
  const rawSegments: WhisperSegment[] = (data.segments || []).map((seg: any) => ({
    id: seg.id,
    start: seg.start,
    end: seg.end,
    text: (seg.text || '').trim(),
    ...(seg.speaker ? { speaker: String(seg.speaker) } : {})
  }));
  const cleanSegments = filterWhisperSegments(rawSegments);
  const rawText = typeof data.text === 'string' ? data.text.trim() : '';
  const cleanText = cleanSegments.length > 0
    ? cleanSegments.map(s => s.text).join(' ')
    : (isWhisperHallucination(rawText) ? '' : rawText);

  return {
    text: cleanText,
    duration: data.duration,
    segments: cleanSegments
  };
}

/** Transcreve arquivo de áudio (.mp3, .wav, .m4a, .ogg, .webm) via modelo Whisper da OpenAI */
export async function transcribeAudioWithWhisper(
  file: File | Blob,
  apiKey: string,
  customFileName?: string,
  options?: WhisperTranscribeOptions
): Promise<WhisperResult> {
  if (!isAudioBlobValid(file)) {
    return { text: '', segments: [] };
  }

  const name = customFileName || (file instanceof File ? file.name : 'audio.mp3');

  try {
    const firstAttempt = await requestWhisperTranscription(file, apiKey, name, 'pt', options);
    if (firstAttempt.text || firstAttempt.segments.length > 0) {
      return firstAttempt;
    }
    // Se veio vazio em 'pt' (ou só tinha alucinações filtradas), tenta sem forçar idioma fixo
    return await requestWhisperTranscription(file, apiKey, name, undefined, options);
  } catch (e: any) {
    if (e instanceof OpenAIError) throw e;
    throw new OpenAIError(e?.message ? `Falha ao transcrever áudio com Whisper: ${e.message}` : 'Falha na conexão com o serviço Whisper da OpenAI.');
  }
}
