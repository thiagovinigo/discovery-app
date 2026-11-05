import type { DiscoveryProject, MeetingSession } from '../types/discovery';

/** Abaixo de 1 KB um arquivo de áudio contém apenas cabeçalho ou silêncio imperceptível. */
export const MIN_AUDIO_BYTES = 1024;

const HALLUCINATION_PATTERNS: RegExp[] = [
  /^obrigad[oa] por assistir(\s+ao\s+v[ií]deo)?[!.]*$/i,
  /inscreva-se no canal/i,
  /deixe (o )?seu like/i,
  /ative o sininho/i,
  /legendas? pela comunidade/i,
  /amara\.org/i,
  /subtitles by/i,
  /thank(s| you) for watching/i,
  /translated by/i,
  /^legendad?o por\b/i,
  /^[\s♪♫♬♩[\]().,!?;:\-–—…]+$/,
  /^\[(m[uú]sica|sil[eê]ncio|aplausos|risos|ru[ií]do)\]$/i
];

const stripPunctuation = (text: string): string =>
  text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Detecta se o texto é repetição mecânica da mesma palavra ou expressão curta (ex.: "sim sim sim sim"). */
function isRepetitiveLoop(cleaned: string): boolean {
  const words = cleaned.toLowerCase().split(' ').filter(Boolean);
  if (words.length < 4) return false;

  // 1 palavra repetida >= 4 vezes dominando a frase
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  if (maxCount >= 4 && maxCount / words.length >= 0.75) return true;

  // Bigrama repetido >= 3 vezes seguidas (ex.: "tá bom tá bom tá bom")
  if (words.length >= 6) {
    const pair = `${words[0]} ${words[1]}`;
    let matches = 0;
    for (let i = 0; i + 1 < words.length; i += 2) {
      if (`${words[i]} ${words[i + 1]}` === pair) matches++;
    }
    if (matches >= 3 && (matches * 2) / words.length >= 0.75) return true;
  }

  return false;
}

/**
 * Identifica falas fantasma geradas pelo Whisper em trechos de silêncio ou ruído de fundo.
 */
export function isWhisperHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  const useful = stripPunctuation(trimmed);
  if (useful.length < 4) return true;

  if (isRepetitiveLoop(useful)) return true;

  return false;
}

/** Filtra segmentos fantasma do Whisper e apara espaços em branco. */
export function filterWhisperSegments<T extends { text: string }>(segments: T[]): T[] {
  return segments
    .map(seg => ({ ...seg, text: seg.text.trim() }))
    .filter(seg => !isWhisperHallucination(seg.text));
}

/** Verifica se o arquivo ou blob de áudio tem tamanho mínimo para conter voz real. */
export function isAudioBlobValid(blob: { size: number } | null | undefined): boolean {
  return !!blob && typeof blob.size === 'number' && blob.size >= MIN_AUDIO_BYTES;
}

/**
 * Monta o prompt de vocabulário do Whisper exclusivamente com termos do projeto e da sessão ativa
 * (nome do projeto, nomes e organizações dos stakeholders, título e pauta da reunião).
 */
export function buildWhisperPrompt(
  project?: Pick<DiscoveryProject, 'name' | 'description' | 'stakeholders'> | null,
  session?: Pick<MeetingSession, 'title' | 'agenda'> | null
): string {
  if (!project && !session) return '';

  const terms: string[] = [];
  const pushUnique = (value?: string) => {
    const clean = value?.trim();
    if (clean && !terms.includes(clean)) terms.push(clean);
  };

  if (project) {
    pushUnique(project.name);
    for (const s of project.stakeholders ?? []) {
      pushUnique(s.name);
      pushUnique(s.organization);
    }
  }

  if (session) {
    pushUnique(session.title);
    for (const item of session.agenda ?? []) {
      pushUnique(item);
    }
  }

  return terms.join(', ').slice(0, 500);
}
