import { describe, expect, it } from 'vitest';
import { filterQuestions, followUpsFor, reviewQuestion, suggestFollowUps } from './interviewQuestionService';
import { suggestTopicQuestions } from './topicService';
import { storageService } from './storageService';
import { assistOffline, deepProbes } from './assistantService';
import { heuristicAnalysis } from './ai/heuristics';
import type { LiveQuestionSuggestion, MeetingSession, TranscriptSegment } from '../types/discovery';

let counter = 0;
const talk = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder'): TranscriptSegment => ({
  id: `iq${++counter}`, speaker, text, timestamp: '00:10', isFinal: true
});

const session = (segments: TranscriptSegment[], liveQuestions: LiveQuestionSuggestion[] = []): MeetingSession => ({
  id: 's1', title: 'Entrevista', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions, painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

const codes = (q: string) => reviewQuestion(q).issues.map(i => i.code);

describe('reviewQuestion', () => {
  it('aceita pergunta sobre um fato recente e concreto', () => {
    const r = reviewQuestion('Qual foi a última vez que o fechamento travou? Quanto tempo levou para resolver?');

    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('acusa pergunta hipotética: pergunta sobre o que a pessoa faria, não sobre o que fez', () => {
    expect(codes('Você usaria um aplicativo que faz isso sozinho?')).toContain('hipotetica');
    expect(codes('Se essa solução não existisse, o que você faria?')).toContain('hipotetica');
    expect(codes('Você pagaria por isso?')).toContain('hipotetica');
  });

  it('acusa pergunta indutiva, que sopra a resposta', () => {
    expect(codes('Você não acha que seria bom automatizar isso?')).toContain('indutiva');
    expect(codes('Concorda que essa planilha é um problema?')).toContain('indutiva');
  });

  it('acusa pergunta de opinião', () => {
    expect(codes('O que você acha do processo atual?')).toContain('opiniao');
    expect(codes('Na sua opinião, qual é o maior problema?')).toContain('opiniao');
  });

  it('acusa pergunta fechada (sim ou não)', () => {
    expect(codes('Você tem problemas com o fechamento?')).toContain('fechada');
    expect(codes('Já tentaram resolver isso?')).toContain('fechada');
  });

  it('acusa várias perguntas numa só', () => {
    expect(codes('Como funciona o fechamento? Quem participa? Quanto tempo demora?')).toContain('composta');
  });

  it('cada problema vem com uma explicação e uma saída melhor', () => {
    const [issue] = reviewQuestion('Você usaria isso?').issues;

    expect(issue.message.length).toBeGreaterThan(10);
    expect(issue.better.length).toBeGreaterThan(10);
  });

  it('pergunta aberta sobre fatos passados não é fechada nem hipotética', () => {
    expect(reviewQuestion('Como vocês resolveram isso na última vez?').ok).toBe(true);
    expect(reviewQuestion('Quantas vezes isso aconteceu no último mês?').ok).toBe(true);
  });
});

describe('filterQuestions', () => {
  const q = (question: string): LiveQuestionSuggestion => ({ id: question, question, reason: '', category: 'mom_test', asked: false, timestamp: '' });

  it('tira as perguntas ruins e mantém as boas, na ordem', () => {
    const result = filterQuestions([q('Você usaria isso?'), q('Quando foi a última vez que isso aconteceu?'), q('O que você acha disso?')]);

    expect(result.map(r => r.question)).toEqual(['Quando foi a última vez que isso aconteceu?']);
  });

  it('se todas forem ruins, devolve as originais para não deixar a sala sem nada', () => {
    const all = [q('Você usaria isso?'), q('Você gostaria de uma solução?')];

    expect(filterQuestions(all)).toEqual(all);
  });
});

describe('followUpsFor', () => {
  it('uma fala sem pista não gera pergunta', () => {
    expect(followUpsFor('Bom dia, tudo bem?')).toEqual([]);
  });

  it('generalização ("sempre", "nunca") pede o último caso concreto, citando o trecho', () => {
    const [f] = followUpsFor('Os relatórios sempre chegam errados do financeiro');

    expect(f.kind).toBe('caso_concreto');
    expect(f.question).toContain('sempre chegam errados');
    expect(f.question).toMatch(/última vez/i);
  });

  it('palavra vaga ("demora", "muito") pede o número', () => {
    const quant = followUpsFor('A conferência demora bastante', 3).find(x => x.kind === 'quantificar');

    expect(quant?.question).toMatch(/quanto|quantas|número/i);
  });

  it('quando já há número na fala, não pede número de novo', () => {
    expect(followUpsFor('A conferência demora 3 dias').some(f => f.kind === 'quantificar')).toBe(false);
  });

  it('pedido de solução ("eu queria um app") volta para o que a pessoa já tentou', () => {
    const [f] = followUpsFor('Eu queria um aplicativo que fizesse isso sozinho');

    expect(f.kind).toBe('solucao');
    expect(f.question).toMatch(/tentou|faz hoje|fez/i);
  });

  it('hipótese ("eu pagaria") volta para o que a pessoa fez de verdade', () => {
    const [f] = followUpsFor('Eu pagaria por uma ferramenta assim');

    expect(f.kind).toBe('hipotese');
    expect(f.question).toMatch(/de fato|na prática|última vez/i);
  });

  it('emoção forte pede o que aconteceu, e causa pede o porquê', () => {
    expect(followUpsFor('Esse processo é horrível')[0].kind).toBe('emocao');
    expect(followUpsFor('Atrasa porque o banco manda o arquivo tarde')[0].kind).toBe('causa');
  });

  it('respeita o máximo pedido', () => {
    expect(followUpsFor('Sempre demora muito e é horrível porque o time não ajuda', 1)).toHaveLength(1);
  });

  it('toda pergunta gerada passa no avaliador de qualidade', () => {
    const samples = [
      'Os relatórios sempre chegam errados', 'A conferência demora bastante', 'Eu queria um aplicativo para isso',
      'Eu pagaria por isso', 'Esse processo é horrível', 'Atrasa porque o banco manda tarde', 'O time de suporte cuida disso'
    ];
    for (const text of samples) {
      for (const f of followUpsFor(text, 3)) expect(reviewQuestion(f.question).ok, f.question).toBe(true);
    }
  });
});

describe('suggestFollowUps', () => {
  it('sem falas do entrevistado, não sugere nada; falas do entrevistador não contam', () => {
    expect(suggestFollowUps(session([]))).toEqual([]);
    expect(suggestFollowUps(session([talk('Os relatórios sempre chegam errados', 'Entrevistador (PM)')]))).toEqual([]);
  });

  it('gera pergunta a partir do que o entrevistado acabou de dizer, com ids estáveis', () => {
    const s = session([talk('Os relatórios sempre chegam errados do financeiro')]);

    const first = suggestFollowUps(s);

    expect(first.length).toBeGreaterThan(0);
    expect(first[0].id.startsWith('fu-')).toBe(true);
    expect(first[0].asked).toBe(false);
    expect(suggestFollowUps(s).map(f => f.id)).toEqual(first.map(f => f.id));
  });

  it('não repete pergunta que já está na lista da sala', () => {
    const s = session([talk('Os relatórios sempre chegam errados do financeiro')]);
    const [first] = suggestFollowUps(s);

    expect(suggestFollowUps(session(s.rawTranscript, [first]))).toEqual([]);
  });

  it('não deixa a lista inchar: limite de perguntas de aprofundamento pendentes', () => {
    const many = Array.from({ length: 8 }, (_, i) => talk(`O sistema ${i} sempre trava e demora muito`));

    expect(suggestFollowUps(session(many)).length).toBeLessThanOrEqual(4);
  });

  it('a pergunta mais recente vem primeiro', () => {
    const s = session([talk('Os relatórios sempre chegam errados'), talk('Eu queria um aplicativo para isso')]);

    expect(suggestFollowUps(s)[0].question).toContain('aplicativo');
  });
});

describe('perguntas fixas do app (sem IA)', () => {
  const project = () => {
    localStorage.clear();
    return storageService.createNewProject('Projeto', 'Descrição');
  };

  it('as perguntas da análise offline passam no avaliador', () => {
    const text = 'O fechamento demora dias, perdemos dinheiro com multa, o cliente reclama no suporte e queria um botão novo';

    const questions = heuristicAnalysis(text).newQuestions.map(q => q.question);

    expect(questions.length).toBeGreaterThan(2);
    for (const q of questions) expect(reviewQuestion(q).issues.filter(i => i.code !== 'composta'), q).toEqual([]);
  });

  it('a pergunta genérica da análise offline também passa', () => {
    for (const q of heuristicAnalysis('Falamos de coisas diversas ontem').newQuestions.map(x => x.question)) {
      expect(reviewQuestion(q).ok, q).toBe(true);
    }
  });

  it('as perguntas do assistente de discovery passam no avaliador', () => {
    const p = project();
    const said = ['O problema é a planilha, uma integração com o sistema, a regra sempre falha, o perfil de acesso, o cadastro, o volume por dia, o erro de auditoria'];
    const asked: string[] = [];
    const all: string[] = [];

    for (let round = 0; round < 12; round++) {
      const probes = deepProbes(p, said, asked);
      if (probes.length === 0) break;
      for (const probe of probes) { asked.push(probe.question); all.push(probe.question); }
    }

    expect(all.length).toBeGreaterThan(5);
    for (const q of all) expect(reviewQuestion(q).ok, q).toBe(true);
  });

  it('as perguntas de refinamento passam nas regras duras', () => {
    const p = project();
    const probes = assistOffline('refinement', p, []).probes ?? [];

    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes) {
      expect(reviewQuestion(probe.question).issues.filter(i => ['hipotetica', 'indutiva', 'opiniao'].includes(i.code)), probe.question).toEqual([]);
    }
  });
});

describe('qualidade das perguntas por tópico', () => {
  it('todas passam no avaliador', () => {
    const s = session([talk('O cadastro de fornecedores é um problema'), talk('O cadastro de fornecedores incomoda muito')]);

    for (const q of suggestTopicQuestions(s)) expect(reviewQuestion(q.question).ok, q.question).toBe(true);
  });
});
