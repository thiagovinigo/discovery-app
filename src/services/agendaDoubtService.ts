import { plain, tokens } from './knowledgeService';
import { extractTopics } from './topicService';
import type { TopicCoverage } from './topicService';
import type { MeetingSession, TranscriptSegment } from '../types/discovery';

export type AgendaItemStatus = 'pending' | 'in_progress' | 'covered' | 'decided';

export const AGENDA_STATUS_LABELS: Record<AgendaItemStatus, string> = {
  pending: 'A tratar',
  in_progress: 'Em andamento',
  covered: 'Tratado',
  decided: 'Decidido'
};

export interface LiveAgendaItem {
  id: string;
  title: string;
  origin: 'agenda' | 'topic';
  status: AgendaItemStatus;
  mentions: number;
  coverage: TopicCoverage;
}

export type DoubtKind = 'interviewee_question' | 'contradiction' | 'gap';

export const DOUBT_KIND_LABELS: Record<DoubtKind, string> = {
  interviewee_question: 'Pergunta do participante',
  contradiction: 'Contradição entre falas',
  gap: 'Lacuna no tópico'
};

export interface SessionDoubt {
  id: string;
  kind: DoubtKind;
  text: string;
  topicTitle?: string;
  sourceQuote?: string;
  sourceTimestamp?: string;
  status: 'open' | 'resolved';
  resolvedAnswer?: string;
  resolvedTimestamp?: string;
}

const DECISION_CUE = /\b(decidimos|ficou decidido|combinamos|combinado|aprovado|definimos|ficou definido|fechamos que|vamos seguir com)\b/i;
const CLARIFICATION_CUE = /\b(corrigindo|na verdade|esclarecendo|confirmando|o certo [eé]|explicando melhor)\b/i;
const INTERVIEWEE_DOUBT_CUE = /\?|\b(n[aã]o sei se|preciso confirmar|n[aã]o tenho certeza|como fica|ser[aá] que)\b/i;

const COVERAGE_PATTERNS = {
  example: /por exemplo|um caso|o caso|semana passada|m[eê]s passado|ontem|[uú]ltima vez|outro dia|teve um/i,
  frequency: /\btoda\b|\btodo\b|todos os|todas as|sempre|\bvezes\b|diari|semanal|mensal|por (dia|semana|m[eê]s)|frequen|\bcada\b/i,
  impact: /\d+|quatro|tr[eê]s|cinco|\bdias\b|\bhoras\b|reais|r\$|custa|custo|\bperd|preju[ií]zo|atraso|retrabalho|multa/i,
  alternative: /hoje (a gente|eu|n[oó]s|fa[cç]o|usamos?)|resolv|na m[aã]o|planilha|excel|gambiarra|workaround|manualmente|improvis|\buso o\b|usamos o/i
};

function computeCoverage(text: string): TopicCoverage {
  return {
    example: COVERAGE_PATTERNS.example.test(text),
    frequency: COVERAGE_PATTERNS.frequency.test(text),
    impact: COVERAGE_PATTERNS.impact.test(text),
    alternative: COVERAGE_PATTERNS.alternative.test(text)
  };
}

function coveredCount(cov: TopicCoverage): number {
  return [cov.example, cov.frequency, cov.impact, cov.alternative].filter(Boolean).length;
}

function deriveStatus(segments: TranscriptSegment[], cov: TopicCoverage): AgendaItemStatus {
  if (segments.length === 0) return 'pending';
  const joined = segments.map(s => s.text).join(' . ');
  if (DECISION_CUE.test(joined)) return 'decided';
  if (coveredCount(cov) >= 2) return 'covered';
  return 'in_progress';
}

/**
 * Constrói a pauta viva da sessão combinando os itens pré-agendados (`session.agenda`)
 * com os tópicos emergentes da conversa (`extractTopics`), calculando o status de cada item sem precisar de cliques.
 */
export function buildLiveAgenda(session: MeetingSession): LiveAgendaItem[] {
  const result: LiveAgendaItem[] = [];
  const usedTerms = new Set<string>();

  for (const rawTitle of session.agenda ?? []) {
    const title = rawTitle.trim();
    if (!title) continue;
    const itemTerms = tokens(title);
    for (const t of itemTerms) usedTerms.add(t);

    const matching = session.rawTranscript.filter(seg => {
      const segTerms = new Set(tokens(seg.text));
      return itemTerms.some(t => segTerms.has(t)) || plain(seg.text).includes(plain(title));
    });

    const cov = computeCoverage(matching.map(m => m.text).join(' . '));
    result.push({
      id: `agenda-${plain(title).replace(/\s+/g, '-')}`,
      title,
      origin: 'agenda',
      status: deriveStatus(matching, cov),
      mentions: matching.length,
      coverage: cov
    });
  }

  const topics = extractTopics(session);
  for (const topic of topics) {
    if (topic.keywords.some(k => usedTerms.has(k))) continue;
    const matching = session.rawTranscript.filter(s => topic.segmentIds.includes(s.id));
    result.push({
      id: `live-${topic.id}`,
      title: topic.title,
      origin: 'topic',
      status: deriveStatus(matching, topic.coverage),
      mentions: topic.mentions,
      coverage: topic.coverage
    });
  }

  return result;
}

const NUMBER_WITH_UNIT = /\b(\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s*(horas?|dias?|semanas?|minutos?|pessoas?|vezes|reais|%)/i;

function normalizeNumberWord(raw: string): string {
  const map: Record<string, string> = {
    um: '1', uma: '1', dois: '2', duas: '2', tres: '3', três: '3',
    quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10'
  };
  const key = raw.toLowerCase();
  return map[key] ?? key;
}

function normalizeUnit(unit: string): string {
  return plain(unit).replace(/s$/, '');
}

/**
 * Extrai a lista de dúvidas da sessão (perguntas do participante, contradições entre falas e lacunas nos tópicos)
 * e marca automaticamente como `resolved` quando uma fala posterior responde ou esclarece o ponto.
 */
export function extractDoubts(session: MeetingSession): SessionDoubt[] {
  const doubts: SessionDoubt[] = [];
  const transcript = session.rawTranscript;
  if (transcript.length === 0) return doubts;

  // 1. Dúvidas levantadas pelo entrevistado (perguntas diretas ou incertezas explícitas)
  transcript.forEach((seg, index) => {
    if (seg.speaker === 'Entrevistador (PM)') return;
    if (!INTERVIEWEE_DOUBT_CUE.test(seg.text)) return;

    const segTerms = tokens(seg.text).filter(t => t.length > 3);
    const laterSegments = transcript.slice(index + 1);
    const answerSeg = laterSegments.find(later => {
      if (later.text.trim().endsWith('?')) return false;
      const laterTerms = new Set(tokens(later.text));
      const shared = segTerms.filter(t => laterTerms.has(t));
      return shared.length >= 1 || DECISION_CUE.test(later.text) || CLARIFICATION_CUE.test(later.text);
    });

    doubts.push({
      id: `doubt-q-${seg.id}`,
      kind: 'interviewee_question',
      text: seg.text.trim(),
      sourceQuote: seg.text.trim(),
      sourceTimestamp: seg.timestamp,
      status: answerSeg ? 'resolved' : 'open',
      resolvedAnswer: answerSeg?.text.trim(),
      resolvedTimestamp: answerSeg?.timestamp
    });
  });

  // 2. Contradições numéricas sobre o mesmo assunto entre duas falas do entrevistado
  const intervieweeIndexed = transcript
    .map((seg, index) => ({ seg, index }))
    .filter(({ seg }) => seg.speaker !== 'Entrevistador (PM)');

  const seenContradictionKeys = new Set<string>();
  for (let i = 0; i < intervieweeIndexed.length; i++) {
    const a = intervieweeIndexed[i];
    const matchA = a.seg.text.match(NUMBER_WITH_UNIT);
    if (!matchA) continue;
    const numA = normalizeNumberWord(matchA[1]);
    const unitA = normalizeUnit(matchA[2]);
    const termsA = new Set(tokens(a.seg.text).filter(t => t.length > 3));

    for (let j = i + 1; j < intervieweeIndexed.length; j++) {
      const b = intervieweeIndexed[j];
      if (CLARIFICATION_CUE.test(b.seg.text)) continue;
      const matchB = b.seg.text.match(NUMBER_WITH_UNIT);
      if (!matchB) continue;
      const numB = normalizeNumberWord(matchB[1]);
      const unitB = normalizeUnit(matchB[2]);
      if (unitA !== unitB || numA === numB) continue;

      const shared = tokens(b.seg.text).filter(t => t.length > 3 && termsA.has(t));
      if (shared.length === 0) continue;

      const subject = shared[0];
      const key = `${subject}-${unitA}`;
      if (seenContradictionKeys.has(key)) continue;
      seenContradictionKeys.add(key);

      const clarifier = transcript.slice(b.index + 1).find(later => {
        const laterTerms = new Set(tokens(later.text));
        return laterTerms.has(subject) && (CLARIFICATION_CUE.test(later.text) || DECISION_CUE.test(later.text));
      });

      doubts.push({
        id: `doubt-c-${a.seg.id}-${b.seg.id}`,
        kind: 'contradiction',
        text: `Divergência sobre "${subject}": foi mencionado "${matchA[0]}" (${a.seg.timestamp}) e depois "${matchB[0]}" (${b.seg.timestamp}).`,
        topicTitle: subject,
        sourceQuote: `${a.seg.text.trim()} ↔ ${b.seg.text.trim()}`,
        sourceTimestamp: b.seg.timestamp,
        status: clarifier ? 'resolved' : 'open',
        resolvedAnswer: clarifier?.text.trim(),
        resolvedTimestamp: clarifier?.timestamp
      });
    }
  }

  // 3. Lacunas dos tópicos (ex.: tópico levantado sem impacto mensurado no início, resolvido se o impacto apareceu depois)
  const topics = extractTopics(session);
  for (const topic of topics) {
    const memberSegments = transcript.filter(s => topic.segmentIds.includes(s.id));
    if (memberSegments.length === 0) continue;

    const firstSeg = memberSegments[0];
    const firstHadImpact = COVERAGE_PATTERNS.impact.test(firstSeg.text);

    if (!firstHadImpact) {
      const resolvingSeg = memberSegments.slice(1).find(s => COVERAGE_PATTERNS.impact.test(s.text));
      doubts.push({
        id: `doubt-gap-${topic.id}-impact`,
        kind: 'gap',
        text: `Qual o impacto concreto (tempo, custo ou retrabalho) de "${topic.title}"?`,
        topicTitle: topic.title,
        sourceQuote: firstSeg.text.trim(),
        sourceTimestamp: firstSeg.timestamp,
        status: resolvingSeg ? 'resolved' : 'open',
        resolvedAnswer: resolvingSeg?.text.trim(),
        resolvedTimestamp: resolvingSeg?.timestamp
      });
    }
  }

  return doubts;
}
