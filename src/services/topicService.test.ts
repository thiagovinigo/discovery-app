import { describe, expect, it } from 'vitest';
import { extractTopics, suggestTopicQuestions } from './topicService';
import type { LiveQuestionSuggestion, MeetingSession, TranscriptSegment } from '../types/discovery';

let counter = 0;
const talk = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder'): TranscriptSegment => ({
  id: `g${++counter}`, speaker, text, timestamp: '00:10', isFinal: true
});

const session = (segments: TranscriptSegment[], liveQuestions: LiveQuestionSuggestion[] = []): MeetingSession => ({
  id: 's1', title: 'Entrevista', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions, painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

const SHEETS = [
  'O fechamento do mês é feito em planilhas e demora quatro dias',
  'As planilhas quebram sempre que alguém muda uma fórmula no fechamento',
  'Eu perco metade do tempo conferindo planilhas na mão'
];
const SUPPORT = [
  'O suporte recebe muitos chamados de clientes confusos com o repasse',
  'Cada chamado de repasse atrasado ocupa o suporte por uma hora',
  'Os clientes ligam no suporte porque não sabem o status do repasse'
];

describe('extractTopics', () => {
  it('sem falas do entrevistado, não há tópicos', () => {
    expect(extractTopics(session([]))).toEqual([]);
    expect(extractTopics(session([talk('Pode me contar mais?', 'Entrevistador (PM)')]))).toEqual([]);
  });

  it('separa os assuntos que a conversa realmente tem, com as falas de cada um', () => {
    const topics = extractTopics(session([...SHEETS.map(t => talk(t)), ...SUPPORT.map(t => talk(t))]));

    expect(topics).toHaveLength(2);
    const sheets = topics.find(t => t.keywords.includes('planilha'))!;
    const support = topics.find(t => t.keywords.includes('suporte'))!;
    expect(sheets.mentions).toBe(3);
    expect(support.mentions).toBe(3);
    expect(sheets.segmentIds).not.toEqual(support.segmentIds);
  });

  it('ignora as falas do entrevistador na hora de achar os assuntos', () => {
    const topics = extractTopics(session([
      talk('Fale sobre o orçamento do projeto e sobre o orçamento aprovado', 'Entrevistador (PM)'),
      talk('Orçamento orçamento orçamento', 'Entrevistador (PM)'),
      ...SHEETS.map(t => talk(t))
    ]));

    expect(topics.every(t => !t.keywords.includes('orcamento') && !t.keywords.includes('orçamento'))).toBe(true);
  });

  it('um assunto citado uma vez só não vira tópico quando há conversa suficiente', () => {
    const topics = extractTopics(session([...SHEETS.map(t => talk(t)), talk('Ontem choveu muito aqui na cidade')]));

    expect(topics).toHaveLength(1);
  });

  it('com poucas falas, um assunto citado uma vez ainda aparece, para o mapa começar cedo', () => {
    const topics = extractTopics(session([talk('Nosso maior problema é o cadastro de fornecedores')]));

    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].title.toLowerCase()).toContain('cadastro');
  });

  it('o título do tópico é legível, com a primeira letra maiúscula', () => {
    const [topic] = extractTopics(session(SHEETS.map(t => talk(t))));

    expect(topic.title[0]).toBe(topic.title[0].toUpperCase());
    expect(topic.title.length).toBeGreaterThan(3);
  });

  it('o mesmo texto gera sempre os mesmos tópicos e ids (estáveis entre análises)', () => {
    const s = session([...SHEETS.map(t => talk(t)), ...SUPPORT.map(t => talk(t))]);

    expect(extractTopics(s).map(t => t.id)).toEqual(extractTopics(s).map(t => t.id));
  });

  it('limita a quantidade de tópicos', () => {
    const words = ['alfa', 'beta', 'gama', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'sigma'];
    const segments = words.flatMap(w => [talk(`O ${w} trava a operação inteira`), talk(`Sempre que o ${w} falha tudo para`)]);

    expect(extractTopics(session(segments)).length).toBeLessThanOrEqual(8);
  });

  it('marca o que cada tópico já tem de evidência: exemplo, frequência, impacto e alternativa', () => {
    const [topic] = extractTopics(session([
      talk('Na semana passada o fechamento em planilhas travou, foi um caso feio'),
      talk('Isso acontece toda semana com as planilhas do fechamento'),
      talk('Cada fechamento em planilhas custa quatro dias de trabalho'),
      talk('Hoje a gente resolve o fechamento em planilhas na mão mesmo')
    ]));

    expect(topic.coverage).toEqual({ example: true, frequency: true, impact: true, alternative: true });
  });

  it('um tópico sem nada disso aparece com tudo a descobrir', () => {
    const [topic] = extractTopics(session([talk('O cadastro de fornecedores é um problema'), talk('O cadastro fornecedores incomoda')]));

    expect(topic.coverage).toEqual({ example: false, frequency: false, impact: false, alternative: false });
  });
});

describe('suggestTopicQuestions', () => {
  const topicSession = (extra: LiveQuestionSuggestion[] = []) =>
    session([talk('O cadastro de fornecedores é um problema'), talk('O cadastro de fornecedores incomoda muito')], extra);

  it('pergunta o que ainda falta saber sobre cada assunto, citando o assunto', () => {
    const questions = suggestTopicQuestions(topicSession());

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every(q => q.question.toLowerCase().includes('cadastro'))).toBe(true);
    expect(questions.every(q => q.asked === false && q.reason.length > 0)).toBe(true);
  });

  it('a primeira pergunta de um assunto novo pede um caso real (Mom Test)', () => {
    const [first] = suggestTopicQuestions(topicSession());

    expect(first.category).toBe('mom_test');
    expect(first.question).toMatch(/último caso|caso real/i);
  });

  it('não pergunta o que a conversa já respondeu', () => {
    const s = session([
      talk('O cadastro de fornecedores é um problema'),
      talk('Isso acontece toda semana no cadastro de fornecedores'),
      talk('Na semana passada o cadastro de fornecedores travou, foi um caso feio')
    ]);

    const categories = suggestTopicQuestions(s).map(q => q.question);

    expect(categories.some(q => /frequência/i.test(q))).toBe(false);
    expect(categories.some(q => /último caso|caso real/i.test(q))).toBe(false);
  });

  it('não repete perguntas que já estão na lista da sala, feitas ou não', () => {
    const first = suggestTopicQuestions(topicSession())[0];
    const existing: LiveQuestionSuggestion = { ...first, asked: true };

    const again = suggestTopicQuestions(topicSession([existing]));

    expect(again.some(q => q.id === first.id)).toBe(false);
    expect(again.some(q => q.question.toLowerCase() === first.question.toLowerCase())).toBe(false);
  });

  it('enquanto há perguntas pendentes de um assunto, não acrescenta outras dele (a lista não incha a cada análise)', () => {
    const pending = suggestTopicQuestions(topicSession());
    expect(pending).toHaveLength(2);

    expect(suggestTopicQuestions(topicSession(pending))).toEqual([]);
  });

  it('depois que as pendentes foram feitas, traz as próximas lacunas do assunto', () => {
    const asked = suggestTopicQuestions(topicSession()).map(q => ({ ...q, asked: true }));

    const next = suggestTopicQuestions(topicSession(asked));

    expect(next.length).toBeGreaterThan(0);
    expect(next.every(q => !asked.some(a => a.id === q.id))).toBe(true);
  });

  it('as perguntas têm ids estáveis, para a sala poder juntar sem duplicar', () => {
    expect(suggestTopicQuestions(topicSession()).map(q => q.id)).toEqual(suggestTopicQuestions(topicSession()).map(q => q.id));
  });

  it('no máximo duas perguntas por assunto e um total limitado', () => {
    const words = ['alfa', 'beta', 'gama', 'delta', 'epsilon', 'zeta'];
    const segments = words.flatMap(w => [talk(`O ${w} trava a operação inteira`), talk(`Sempre que o ${w} falha tudo para`)]);

    const questions = suggestTopicQuestions(session(segments));

    expect(questions.length).toBeLessThanOrEqual(6);
  });

  it('sem conversa, sem perguntas', () => {
    expect(suggestTopicQuestions(session([]))).toEqual([]);
  });
});
