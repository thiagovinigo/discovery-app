import { logChange, recordEvidence } from './backlogItemService';
import { plain, tokens } from './knowledgeService';
import { stakeholderName } from './stakeholderService';
import type { BacklogMeta, DiscoveryProject, Epic, ValidationEvidence } from '../types/discovery';

export type EvidenceLevel = 'épico' | 'feature' | 'história';

/** Uma fala que parece confirmar ou contestar um item do backlog. É só uma sugestão: o PO confirma antes de valer. */
export interface EvidenceSuggestion {
  id: string;
  level: EvidenceLevel;
  itemId: string;
  itemTitle: string;
  stance: ValidationEvidence['stance'];
  quote: string;
  speaker: string;
  timestamp: string;
  sessionId: string;
  sessionTitle: string;
}

/** Quantas palavras do item precisam aparecer na fala, e que fração delas, para a fala ser sobre o item. */
const MIN_SHARED_WORDS = 2;
const MIN_SHARED_RATIO = 0.3;
const MAX_SUGGESTIONS = 30;
const INTERVIEWER = 'Entrevistador (PM)';

// Frases (sem acento, minúsculas) que indicam rejeição ou necessidade. Rejeição vale primeiro: "não preciso" contém "preciso".
const CONTEST_CUES = [
  'nao preciso', 'nao precisamos', 'nao precisa', 'nao uso', 'nunca uso', 'nao usamos', 'nao faz sentido', 'nao e problema',
  'nao e um problema', 'nao quero', 'desnecessario', 'ninguem usa', 'dispensavel', 'nao ajuda', 'nao vejo valor', 'nao temos esse problema'
];
const CONFIRM_CUES = [
  'preciso', 'precisamos', 'toda semana', 'todo dia', 'todo mes', 'sempre', 'gostaria', 'queria', 'seria otimo', 'fundamental',
  'essencial', 'perco tempo', 'perdemos tempo', 'demora', 'muito manual', 'e um problema', 'dor de cabeca', 'atrapalha'
];

function stanceOf(text: string): ValidationEvidence['stance'] | null {
  const normalized = plain(text);
  if (CONTEST_CUES.some(cue => normalized.includes(cue))) return 'contests';
  if (CONFIRM_CUES.some(cue => normalized.includes(cue))) return 'confirms';
  return null;
}

interface Candidate {
  level: EvidenceLevel;
  id: string;
  title: string;
  words: Set<string>;
  meta: BacklogMeta;
}

function candidatesOf(epics: Epic[]): Candidate[] {
  const list: Candidate[] = [];
  const add = (level: EvidenceLevel, id: string, title: string, text: string, meta: BacklogMeta) =>
    list.push({ level, id, title, words: new Set(tokens(text)), meta });

  for (const epic of epics) {
    add('épico', epic.id, epic.title, `${epic.title} ${epic.objective}`, epic);
    for (const feature of epic.features) {
      add('feature', feature.id, feature.title, `${feature.title} ${feature.description}`, feature);
      for (const story of feature.userStories) {
        add('história', story.id, story.title, `${story.title} ${story.iWantTo} ${story.soThat}`, story);
      }
    }
  }
  return list;
}

/**
 * Varre as falas das reuniões (menos as do entrevistador) atrás de trechos que falam de um item do backlog e trazem
 * um sinal de necessidade (confirma) ou de rejeição (contesta). Por item e por posição, fica a fala mais aderente.
 * Falas já registradas como evidência do item não voltam. É uma heurística de palavras: o resultado é sugestão.
 */
export function suggestEvidence(project: DiscoveryProject): EvidenceSuggestion[] {
  const candidates = candidatesOf(project.epics);
  if (candidates.length === 0) return [];

  const best = new Map<string, { suggestion: EvidenceSuggestion; shared: number }>();

  for (const session of project.sessions) {
    for (const segment of session.rawTranscript) {
      if (segment.speaker === INTERVIEWER) continue;
      const stance = stanceOf(segment.text);
      if (!stance) continue;
      const spoken = new Set(tokens(segment.text));

      for (const candidate of candidates) {
        if (candidate.words.size === 0) continue;
        let shared = 0;
        for (const word of candidate.words) if (spoken.has(word)) shared++;
        if (shared < MIN_SHARED_WORDS || shared / candidate.words.size < MIN_SHARED_RATIO) continue;

        const known = candidate.meta.validation?.evidences ?? [];
        if (known.some(e => e.sessionId === session.id && e.quote === segment.text)) continue;

        const key = `${candidate.id}:${stance}`;
        if ((best.get(key)?.shared ?? 0) >= shared) continue;
        best.set(key, {
          shared,
          suggestion: {
            id: `ev:${candidate.id}:${session.id}:${segment.id}`,
            level: candidate.level,
            itemId: candidate.id,
            itemTitle: candidate.title,
            stance,
            quote: segment.text,
            speaker: stakeholderName(project, segment.speakerStakeholderId) ?? segment.speaker,
            timestamp: segment.timestamp,
            sessionId: session.id,
            sessionTitle: session.title
          }
        });
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.shared - a.shared)
    .slice(0, MAX_SUGGESTIONS)
    .map(entry => entry.suggestion);
}

/**
 * Registra no backlog as evidências aceitas (`'all'` aceita todas): o item é revalidado pela evidência mais recente,
 * item invalidado continua invalidado, e a decisão entra no histórico do item. Não altera o original.
 */
export function applyEvidence(epics: Epic[], suggestions: EvidenceSuggestion[], accepted: string[] | 'all', at: string): Epic[] {
  const chosen = accepted === 'all' ? suggestions : suggestions.filter(s => accepted.includes(s.id));
  return chosen.reduce((current, s) => {
    const register = <T extends BacklogMeta & { id: string }>(item: T): T => {
      if (item.id !== s.itemId) return item;
      const evidence: ValidationEvidence = {
        stance: s.stance, quote: s.quote, sessionId: s.sessionId, sessionTitle: s.sessionTitle, timestamp: s.timestamp, at
      };
      const verb = s.stance === 'confirms' ? 'confirmada' : 'contestada';
      return logChange(recordEvidence(item, evidence), `Validação ${verb} em "${s.sessionTitle}"`, at, s.sessionId);
    };
    return current.map(epic => ({
      ...register(epic),
      features: epic.features.map(feature => ({
        ...register(feature),
        userStories: feature.userStories.map(register)
      }))
    }));
  }, epics);
}
