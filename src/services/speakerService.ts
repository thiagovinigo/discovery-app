import { plain } from './knowledgeService';
import type { MeetingSession, Stakeholder } from '../types/discovery';

export interface SpeakerSuggestion {
  segmentId: string;
  stakeholderId: string;
  /** Por que a sala acha isso, para o usuário conferir antes de aceitar. */
  reason: string;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Nomes que apontam para uma única pessoa. Quem divide o primeiro nome com outro só é achado pelo nome inteiro. */
function nameIndex(stakeholders: Stakeholder[]): { stakeholder: Stakeholder; names: string[] }[] {
  const firstNames = stakeholders.map(s => plain(s.name).trim().split(/\s+/)[0]);
  return stakeholders.map((stakeholder, i) => {
    const full = plain(stakeholder.name).trim();
    const first = firstNames[i];
    const shared = firstNames.filter(n => n === first).length > 1;
    return { stakeholder, names: shared ? [full] : [full, first] };
  }).filter(entry => entry.names.every(Boolean));
}

const INTRODUCTION = (name: string) =>
  new RegExp(`(?:aqui (?:e|eh) (?:o |a )?|meu nome (?:e|eh) |eu sou (?:o |a )?|sou (?:o |a )?|me chamo )${escapeRegex(name)}\\b`);
const ADDRESSED = (name: string) =>
  new RegExp(`(?:^|obrigad[oa],?\\s+|valeu,?\\s+|e voce,?\\s+|e a\\s+|e o\\s+)${escapeRegex(name)}\\b`);

/**
 * Pistas no texto sobre quem está falando: "aqui é a Ana", "meu nome é Bruno" (a própria fala) e "obrigado, Bruno"
 * (a fala seguinte é dele). O navegador não separa vozes pelo som; estas são sugestões para o usuário aceitar ou não.
 * Falas que já têm autor não são tocadas.
 */
export function suggestSpeakers(session: MeetingSession, stakeholders: Stakeholder[]): SpeakerSuggestion[] {
  const index = nameIndex(stakeholders);
  if (index.length === 0) return [];
  const segments = session.rawTranscript;
  const taken = new Set(segments.filter(s => s.speakerStakeholderId).map(s => s.id));
  const result: SpeakerSuggestion[] = [];
  const suggest = (segmentId: string, stakeholder: Stakeholder, reason: string) => {
    if (taken.has(segmentId)) return;
    taken.add(segmentId);
    result.push({ segmentId, stakeholderId: stakeholder.id, reason });
  };

  segments.forEach((segment, i) => {
    const text = plain(segment.text).trim();
    for (const { stakeholder, names } of index) {
      if (names.some(name => INTRODUCTION(name).test(text))) {
        suggest(segment.id, stakeholder, `Se apresentou como ${stakeholder.name} nesta fala.`);
      }
    }
    const next = segments[i + 1];
    if (!next || next.speaker === segment.speaker) return;
    for (const { stakeholder, names } of index) {
      if (names.some(name => ADDRESSED(name).test(text))) {
        suggest(next.id, stakeholder, `${stakeholder.name} foi chamado(a) pelo nome na fala anterior.`);
      }
    }
  });

  const order = new Map(segments.map((s, i) => [s.id, i]));
  return result.sort((a, b) => (order.get(a.segmentId) ?? 0) - (order.get(b.segmentId) ?? 0));
}

/** Marca (ou, com `undefined`, desmarca) quem disse a fala. Fala sem identificação passa a ser do entrevistado. */
export function assignSpeaker(session: MeetingSession, segmentId: string, stakeholderId: string | undefined): MeetingSession {
  if (!session.rawTranscript.some(s => s.id === segmentId)) return session;
  return {
    ...session,
    rawTranscript: session.rawTranscript.map(s => {
      if (s.id !== segmentId) return s;
      const { speakerStakeholderId: _removed, ...rest } = s;
      if (!stakeholderId) return rest;
      return { ...rest, speaker: s.speaker === 'Desconhecido' ? 'Usuário / Stakeholder' : s.speaker, speakerStakeholderId: stakeholderId };
    })
  };
}

/** Aceita várias sugestões de uma vez, sem sobrescrever falas que já têm autor. */
export function applySuggestions(session: MeetingSession, suggestions: SpeakerSuggestion[]): MeetingSession {
  return suggestions.reduce((current, suggestion) => {
    const segment = current.rawTranscript.find(s => s.id === suggestion.segmentId);
    return segment && !segment.speakerStakeholderId ? assignSpeaker(current, suggestion.segmentId, suggestion.stakeholderId) : current;
  }, session);
}
