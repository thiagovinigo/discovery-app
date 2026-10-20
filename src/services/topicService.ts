import { plain, tokens } from './knowledgeService';
import type { LiveQuestionSuggestion, MeetingSession, TranscriptSegment } from '../types/discovery';

export interface TopicCoverage {
  /** Alguém contou um caso concreto. */
  example: boolean;
  /** Já se sabe com que frequência acontece. */
  frequency: boolean;
  /** Já há uma medida de tempo, dinheiro ou retrabalho. */
  impact: boolean;
  /** Já se sabe como resolvem hoje. */
  alternative: boolean;
}

export interface SessionTopic {
  id: string;
  /** Nome legível do assunto, a partir das palavras que mais aparecem nele. */
  title: string;
  /** Palavras-chave (no singular, sem acento), as principais primeiro. */
  keywords: string[];
  segmentIds: string[];
  mentions: number;
  coverage: TopicCoverage;
}

const INTERVIEWER: TranscriptSegment['speaker'] = 'Entrevistador (PM)';
const MAX_TOPICS = 8;
const MAX_KEYWORDS = 3;
/** Com tão poucas falas, qualquer assunto citado conta: o mapa precisa começar cedo. */
const FEW_SEGMENTS = 3;
const MAX_QUESTIONS_PER_TOPIC = 2;
const MAX_QUESTIONS = 6;

// Palavras de conversa que não são assunto (além das comuns que o `tokens` já ignora)
const FILLERS = new Set([
  'coisa', 'coisas', 'gente', 'entao', 'porque', 'assim', 'aqui', 'tipo', 'fica', 'ficar', 'nada', 'algo', 'cada', 'sempre',
  'todo', 'toda', 'todos', 'todas', 'vezes', 'pouco', 'mesmo', 'agora', 'depois', 'antes', 'hoje', 'ontem', 'semana',
  'passada', 'passado', 'dias', 'hora', 'horas', 'ano', 'anos', 'quatro', 'tres', 'cinco', 'perco', 'foi', 'sao', 'ser',
  'maior', 'menor', 'grande', 'pequeno', 'bom', 'boa', 'ruim', 'feito', 'feita', 'fazer', 'faz', 'fazem', 'tem', 'tinha'
]);

const PATTERNS = {
  example: /por exemplo|um caso|o caso|semana passada|m[eê]s passado|ontem|[uú]ltima vez|outro dia|teve um/i,
  frequency: /\btoda\b|\btodo\b|todos os|todas as|sempre|\bvezes\b|diari|semanal|mensal|por (dia|semana|m[eê]s)|frequen|\bcada\b/i,
  impact: /\d+|quatro|tr[eê]s|cinco|\bdias\b|\bhoras\b|reais|r\$|custa|custo|\bperd|preju[ií]zo|atraso|retrabalho|multa/i,
  alternative: /hoje (a gente|eu|n[oó]s|fa[cç]o|usamos?)|resolv|na m[aã]o|planilha|excel|gambiarra|workaround|manualmente|improvis|\buso o\b|usamos o/i
};

const intervieweeSegments = (session: MeetingSession): TranscriptSegment[] =>
  session.rawTranscript.filter(s => s.speaker !== INTERVIEWER && s.text.trim());

const termsOf = (text: string): Set<string> => new Set(tokens(text).filter(term => !FILLERS.has(term)));

/** Maior frequência, depois termo mais longo, depois ordem alfabética: sempre o mesmo resultado para o mesmo texto. */
const byImportance = (df: Map<string, number>) => (a: string, b: string) =>
  (df.get(b) ?? 0) - (df.get(a) ?? 0) || b.length - a.length || a.localeCompare(b);

/** Como a pessoa escreveu a palavra (com acento, plural), para o título ficar legível. */
function surfaceForms(segments: TranscriptSegment[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const segment of segments) {
    for (const word of segment.text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      const term = tokens(word)[0];
      if (!term) continue;
      const forms = counts.get(term) ?? new Map<string, number>();
      forms.set(word, (forms.get(word) ?? 0) + 1);
      counts.set(term, forms);
    }
  }
  const result = new Map<string, string>();
  for (const [term, forms] of counts) {
    result.set(term, [...forms.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]);
  }
  return result;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

function coverageOf(text: string): TopicCoverage {
  return {
    example: PATTERNS.example.test(text),
    frequency: PATTERNS.frequency.test(text),
    impact: PATTERNS.impact.test(text),
    alternative: PATTERNS.alternative.test(text)
  };
}

/**
 * Descobre os assuntos da conversa a partir do que o entrevistado disse (as falas do entrevistador não contam).
 * Agrupa as falas pelas palavras que mais se repetem, funciona em qualquer domínio e dá sempre o mesmo resultado para
 * o mesmo texto. Cada assunto traz o que já foi coberto: caso real, frequência, impacto e alternativa atual.
 */
export function extractTopics(session: MeetingSession): SessionTopic[] {
  const segments = intervieweeSegments(session);
  if (segments.length === 0) return [];

  const minMentions = segments.length <= FEW_SEGMENTS ? 1 : 2;
  const forms = surfaceForms(segments);
  const termsBySegment = new Map(segments.map(s => [s.id, termsOf(s.text)]));
  const unassigned = new Set(segments.map(s => s.id));
  const topics: SessionTopic[] = [];

  while (topics.length < MAX_TOPICS && unassigned.size > 0) {
    const df = new Map<string, number>();
    for (const id of unassigned) for (const term of termsBySegment.get(id)!) df.set(term, (df.get(term) ?? 0) + 1);

    const candidates = [...df.entries()].filter(([, count]) => count >= minMentions).map(([term]) => term);
    if (candidates.length === 0) break;
    const seed = candidates.sort(byImportance(df))[0];

    const members = segments.filter(s => unassigned.has(s.id) && termsBySegment.get(s.id)!.has(seed));
    const inTopic = new Map<string, number>();
    for (const member of members) for (const term of termsBySegment.get(member.id)!) inTopic.set(term, (inTopic.get(term) ?? 0) + 1);
    const others = [...inTopic.keys()].filter(term => term !== seed).sort(byImportance(inTopic));
    const keywords = [seed, ...others].slice(0, MAX_KEYWORDS);

    const shown = keywords.slice(0, 2).map(term => forms.get(term) ?? term);
    topics.push({
      id: `topic-${seed}`,
      title: capitalize(shown.length > 1 ? `${shown[0]} e ${shown[1]}` : shown[0]),
      keywords,
      segmentIds: members.map(m => m.id),
      mentions: members.length,
      coverage: coverageOf(members.map(m => m.text).join(' . '))
    });
    for (const member of members) unassigned.delete(member.id);
  }

  return topics;
}

type Dimension = keyof TopicCoverage;

// Ordem em que as perguntas valem a pena: primeiro um caso real, depois o tamanho do problema
const QUESTION_PLAN: { dimension: Dimension; category: LiveQuestionSuggestion['category']; reason: string; ask: (title: string) => string }[] = [
  {
    dimension: 'example', category: 'mom_test',
    reason: 'Mom Test: um fato do passado recente vale mais do que uma opinião.',
    ask: title => `Pode me contar o último caso real de "${title}"? O que aconteceu, passo a passo?`
  },
  {
    dimension: 'impact', category: 'quantification',
    reason: 'Sem um número aproximado de tempo, dinheiro ou retrabalho, não dá para saber se vale resolver.',
    ask: title => `Qual o impacto de "${title}" em tempo, dinheiro ou retrabalho? Tem um número aproximado?`
  },
  {
    dimension: 'frequency', category: 'quantification',
    reason: 'A frequência mostra se é uma dor constante ou um caso raro.',
    ask: title => `Qual a frequência de "${title}": acontece por dia, por semana ou por mês?`
  },
  {
    dimension: 'alternative', category: 'jtbd',
    reason: 'O que a pessoa faz hoje revela o que realmente incomoda e o que ela aceita como solução.',
    ask: title => `Como vocês resolvem "${title}" hoje? O que já tentaram?`
  }
];

/**
 * Perguntas para fazer agora, uma por lacuna de cada assunto da conversa (caso real, impacto, frequência, alternativa
 * atual), com os assuntos mais citados primeiro. Não repete o que a conversa já respondeu nem o que já está na lista da
 * sala, feito ou não. Os ids são estáveis, então a sala pode juntar as perguntas novas sem duplicar.
 */
export function suggestTopicQuestions(session: MeetingSession): LiveQuestionSuggestion[] {
  const known = new Set(session.liveQuestions.flatMap(q => [q.id, plain(q.question).trim()]));
  const suggestions: LiveQuestionSuggestion[] = [];

  for (const topic of [...extractTopics(session)].sort((a, b) => b.mentions - a.mentions)) {
    let forTopic = 0;
    for (const step of QUESTION_PLAN) {
      if (forTopic >= MAX_QUESTIONS_PER_TOPIC) break;
      if (topic.coverage[step.dimension]) continue;
      const question = step.ask(topic.title);
      const id = `tq-${topic.id}-${step.dimension}`;
      if (known.has(id) || known.has(plain(question).trim())) continue;
      suggestions.push({ id, question, reason: step.reason, category: step.category, asked: false, timestamp: 'Agora' });
      forTopic++;
    }
  }
  return suggestions.slice(0, MAX_QUESTIONS);
}
