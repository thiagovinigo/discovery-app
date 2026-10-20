import type { JTBDItem, MeetingSession, PainPoint } from '../types/discovery';

export interface GenerationInput {
  transcript: string;
  painPoints: PainPoint[];
  jtbds: JTBDItem[];
  sessionCount: number;
}

const linesOf = (session: MeetingSession): string => session.rawTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');

/** Mantém o primeiro de cada item, comparando sem diferenciar maiúsculas. */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item).trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Monta o que a IA recebe para gerar o backlog a partir de uma ou mais reuniões. Com uma sessão, a transcrição é só as
 * falas; com várias, cada trecho vem sob o título da reunião de onde saiu. Dores e JTBDs repetidos entre as reuniões
 * entram uma vez só.
 */
export function buildGenerationInput(sessions: MeetingSession[]): GenerationInput {
  const withSpeech = sessions.filter(s => s.rawTranscript.length > 0);
  const transcript =
    sessions.length === 1
      ? linesOf(sessions[0])
      : withSpeech.map(s => `### Reunião: ${s.title} (${s.date})\n${linesOf(s)}`).join('\n\n');

  return {
    transcript,
    painPoints: uniqueBy(sessions.flatMap(s => s.painPoints), p => p.description),
    jtbds: uniqueBy(sessions.flatMap(s => s.jtbds), j => j.job),
    sessionCount: sessions.length
  };
}
