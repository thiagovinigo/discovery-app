import { plain } from './knowledgeService';
import type { LiveQuestionSuggestion, MeetingSession, TranscriptSegment } from '../types/discovery';

// ---------------------------------------------------------------------------------------------
// Avaliador: a pergunta pede um fato ou uma opinião?
// ---------------------------------------------------------------------------------------------

export type QuestionIssueCode = 'hipotetica' | 'indutiva' | 'opiniao' | 'fechada' | 'composta';

export interface QuestionIssue {
  code: QuestionIssueCode;
  /** O que está errado com a pergunta. */
  message: string;
  /** Como perguntar no lugar. */
  better: string;
}

export interface QuestionReview {
  ok: boolean;
  issues: QuestionIssue[];
}

const HYPOTHETICAL = /\b(usaria|usariam|pagaria|pagariam|compraria|gostaria|iria usar|faria|se existisse|se nao existisse|se tivesse|imagine|e se)\b|no futuro/;
const LEADING = /\b(nao acha|nao seria|nao concorda|concorda que|seria bom|seria util|nao e verdade que|voce gosta)\b/;
const OPINION = /\bo que (voce |voces )?(acha|acham|pensa|pensam)\b|na sua opiniao|o que voce sente/;
const CLOSED_START = /^(e |entao )?(voce|voces|vc|ja|tem|ha|existe|foi|era|esta|estao|sao|fazem|faz|usa|usam|tentou|tentaram|conhece|precisa|pode|poderia)\b/;
const OPEN_WORD = /\b(como|quando|quanto|quantos|quantas|qual|quais|quem|onde|por que|o que|conte|contar|mostre|mostrar|descreva|descrever|explique|explicar)\b/;
const MAX_QUESTION_MARKS = 2;

const RULES: { code: QuestionIssueCode; test: (q: string, raw: string) => boolean; message: string; better: string }[] = [
  {
    code: 'hipotetica',
    test: q => HYPOTHETICAL.test(q),
    message: 'Pergunta hipotética: as pessoas erram ao prever o que fariam, e tendem a responder o que soa bem.',
    better: 'Pergunte o que aconteceu de verdade: "Quando foi a última vez que você precisou disso? O que fez?"'
  },
  {
    code: 'indutiva',
    test: q => LEADING.test(q),
    message: 'Pergunta indutiva: ela sopra a resposta que você quer ouvir.',
    better: 'Tire a sua opinião da pergunta: "Como você resolve isso hoje?" em vez de "Você não acha que...?"'
  },
  {
    code: 'opiniao',
    test: q => OPINION.test(q),
    message: 'Pergunta de opinião: gera achismo, não fato.',
    better: 'Peça um caso: "Me conte a última vez que isso aconteceu, passo a passo."'
  },
  {
    code: 'fechada',
    test: q => CLOSED_START.test(q) && !OPEN_WORD.test(q),
    message: 'Pergunta fechada: a resposta é sim ou não e você não aprende nada além disso.',
    better: 'Comece por "como", "quando", "quanto" ou "quem": "Como foi a última vez que isso aconteceu?"'
  },
  {
    code: 'composta',
    test: (_q, raw) => (raw.match(/\?/g) ?? []).length > MAX_QUESTION_MARKS,
    message: 'Várias perguntas numa só: a pessoa responde só a mais fácil.',
    better: 'Faça uma pergunta por vez e espere a resposta antes da próxima.'
  }
];

/** Aponta o que torna uma pergunta subjetiva (hipótese, opinião, indução, sim/não, várias de uma vez). */
export function reviewQuestion(question: string): QuestionReview {
  // O que está entre aspas é a fala do entrevistado citada, não a pergunta do PO
  const asked = question.replace(/"[^"]*"|“[^”]*”/g, ' ');
  const normalized = plain(asked).trim();
  const issues = RULES
    .filter(rule => rule.test(normalized, asked))
    .map(({ code, message, better }) => ({ code, message, better }));
  return { ok: issues.length === 0, issues };
}

// "Fechada" sozinha não derruba a pergunta (pode ser um fato direto); as outras, sim
const HARD_ISSUES: QuestionIssueCode[] = ['hipotetica', 'indutiva', 'opiniao', 'composta'];

/**
 * Tira as perguntas subjetivas de uma lista (por exemplo, a que a IA devolveu). Se todas forem ruins, devolve a
 * lista original: uma sala sem nenhuma sugestão ajuda menos do que uma sugestão imperfeita.
 */
export function filterQuestions<T extends { question: string }>(questions: T[]): T[] {
  const good = questions.filter(q => !reviewQuestion(q.question).issues.some(i => HARD_ISSUES.includes(i.code)));
  return good.length > 0 ? good : questions;
}

// ---------------------------------------------------------------------------------------------
// Aprofundamento: pergunta ancorada no que o entrevistado acabou de dizer
// ---------------------------------------------------------------------------------------------

export type FollowUpKind = 'caso_concreto' | 'quantificar' | 'solucao' | 'hipotese' | 'emocao' | 'causa' | 'terceiro';

export interface FollowUp {
  kind: FollowUpKind;
  question: string;
  reason: string;
  category: LiveQuestionSuggestion['category'];
  /** O trecho da fala do entrevistado que originou a pergunta. */
  anchor: string;
}

const BEFORE_WORDS = 3;
const AFTER_WORDS = 4;
const MAX_PENDING_FOLLOW_UPS = 4;
const RECENT_SEGMENTS = 5;
const NUMBER_WORDS = /\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|meia|metade)\b/;

interface FollowUpRule {
  kind: FollowUpKind;
  triggers: string[][];
  category: LiveQuestionSuggestion['category'];
  reason: string;
  ask: (anchor: string) => string;
  /** Não vale perguntar quando a fala já traz isto. */
  skipWhen?: (plainText: string) => boolean;
}

const RULES_BY_PRIORITY: FollowUpRule[] = [
  {
    kind: 'caso_concreto',
    triggers: [['sempre'], ['nunca'], ['toda', 'vez'], ['todo', 'mundo'], ['ninguem'], ['todos', 'os']],
    category: 'mom_test',
    reason: 'Generalizações ("sempre", "nunca") escondem os casos reais. Um fato recente vale mais do que uma tendência.',
    ask: a => `Você disse "${a}". Qual foi a última vez que isso aconteceu? Me conte do começo ao fim: quando foi, quem estava envolvido e o que você fez.`
  },
  {
    kind: 'quantificar',
    triggers: [['demora'], ['demorado'], ['demorada'], ['muito'], ['muita'], ['muitos'], ['muitas'], ['bastante'], ['pouco'], ['lento'], ['lenta'], ['rapido'], ['enorme'], ['frequentemente'], ['as', 'vezes']],
    category: 'quantification',
    reason: 'Palavras como "muito" e "demora" não dão para priorizar. Peça o número da última vez.',
    ask: a => `Você falou "${a}". Em números, quanto foi na última vez: quantas horas, dias, pessoas ou reais?`,
    skipWhen: t => /\d/.test(t) || NUMBER_WORDS.test(t)
  },
  {
    kind: 'solucao',
    triggers: [['queria'], ['quero'], ['preciso', 'de'], ['precisava', 'de'], ['seria', 'bom'], ['seria', 'util'], ['falta', 'um'], ['falta', 'uma'], ['deveria', 'ter']],
    category: 'premature_solution',
    reason: 'Quando a pessoa pede uma solução, volte para o problema por trás: o que ela já tentou e onde falhou.',
    ask: a => `Você mencionou "${a}". O que você já tentou ou faz hoje para resolver isso, e onde isso falha?`
  },
  {
    kind: 'hipotese',
    triggers: [['pagaria'], ['compraria'], ['usaria'], ['se', 'eu', 'tivesse'], ['se', 'existisse']],
    category: 'mom_test',
    reason: 'O que a pessoa diz que faria não é o que ela faz. Peça o comportamento real.',
    ask: a => `Você disse "${a}". O que você fez de fato da última vez que precisou disso, e quanto isso custou?`
  },
  {
    kind: 'emocao',
    triggers: [['horrivel'], ['frustrante'], ['odeio'], ['detesto'], ['terrivel'], ['pesadelo'], ['estressante'], ['irritante'], ['cansativo']],
    category: 'five_whys',
    reason: 'Uma emoção forte aponta uma dor real. Peça o episódio que a causou.',
    ask: a => `Você descreveu como "${a}". O que aconteceu da última vez que isso te deixou assim? Me conte o passo a passo.`
  },
  {
    kind: 'causa',
    triggers: [['porque'], ['por', 'causa'], ['devido'], ['culpa']],
    category: 'five_whys',
    reason: '5 Porquês: a causa dita é quase sempre só a primeira camada.',
    ask: a => `Você disse "${a}". Por que isso acontece? O que você viu acontecer, na prática, da última vez?`
  },
  {
    kind: 'terceiro',
    triggers: [['o', 'time', 'de'], ['a', 'equipe', 'de'], ['o', 'pessoal'], ['o', 'financeiro'], ['o', 'suporte'], ['meu', 'chefe'], ['a', 'diretoria']],
    category: 'mom_test',
    reason: 'Cada pessoa citada é uma fonte: quem faz o quê e quem decide.',
    ask: a => `Você citou "${a}". Quem exatamente faz isso e o que essa pessoa faz, passo a passo? Dá para eu conversar com ela?`
  }
];

const stripPunctuation = (word: string): string => plain(word).replace(/[^a-z0-9]/g, '');

function locate(words: string[], trigger: string[]): number {
  for (let i = 0; i + trigger.length <= words.length; i++) {
    if (trigger.every((t, k) => words[i + k] === t)) return i;
  }
  return -1;
}

/** O trecho da fala em volta da palavra que acendeu a regra, sem aspas para não quebrar a pergunta. */
function anchorAround(original: string[], index: number, length: number): string {
  const slice = original.slice(Math.max(0, index - BEFORE_WORDS), Math.min(original.length, index + length + AFTER_WORDS));
  return slice.join(' ').replace(/["“”]/g, "'").replace(/[.,;:!?]+$/, '').trim();
}

/**
 * Perguntas de aprofundamento para uma fala do entrevistado, cada uma citando o trecho que a originou: pede o
 * último caso (generalização), o número (palavra vaga), o que já tentou (pedido de solução), o que fez de fato
 * (hipótese), o episódio (emoção), o porquê (causa) e quem mais sabe (pessoa citada). Fala sem pista não gera nada.
 */
export function followUpsFor(text: string, max = 2): FollowUp[] {
  const original = text.trim().split(/\s+/).filter(Boolean);
  const words = original.map(stripPunctuation);
  const whole = plain(text);
  const result: FollowUp[] = [];

  for (const rule of RULES_BY_PRIORITY) {
    if (result.length >= max) break;
    if (rule.skipWhen?.(whole)) continue;
    for (const trigger of rule.triggers) {
      const index = locate(words, trigger);
      if (index < 0) continue;
      const anchor = anchorAround(original, index, trigger.length);
      result.push({ kind: rule.kind, question: rule.ask(anchor), reason: rule.reason, category: rule.category, anchor });
      break;
    }
  }
  return result;
}

const isInterviewee = (segment: TranscriptSegment): boolean => segment.speaker !== 'Entrevistador (PM)' && segment.text.trim().length > 0;

/**
 * Perguntas de aprofundamento pelas últimas falas do entrevistado, a mais recente primeiro. Não repete o que já está
 * na lista da sala e não deixa a lista crescer enquanto houver perguntas desse tipo por fazer.
 */
export function suggestFollowUps(session: MeetingSession): LiveQuestionSuggestion[] {
  const known = new Set(session.liveQuestions.flatMap(q => [q.id, plain(q.question).trim()]));
  const pending = session.liveQuestions.filter(q => !q.asked && q.id.startsWith('fu-')).length;
  const recent = session.rawTranscript.filter(isInterviewee).slice(-RECENT_SEGMENTS).reverse();

  const suggestions: LiveQuestionSuggestion[] = [];
  for (const segment of recent) {
    const [followUp] = followUpsFor(segment.text, 1);
    if (!followUp) continue;
    const id = `fu-${segment.id}-${followUp.kind}`;
    if (known.has(id) || known.has(plain(followUp.question).trim())) continue;
    suggestions.push({ id, question: followUp.question, reason: followUp.reason, category: followUp.category, asked: false, timestamp: 'Agora' });
  }
  return suggestions.slice(0, Math.max(0, MAX_PENDING_FOLLOW_UPS - pending));
}
