import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from './storageService';
import { appendSegment } from './sessionService';
import { callAI } from './aiClient';
import {
  assist,
  assistOffline,
  deepProbes,
  extractQuestions,
  groupTopics,
  runAssistant,
  setAssistantEnabled,
  setSessionType,
  suggestAnswers
} from './assistantService';
import type { DiscoveryProject, TranscriptSegment } from '../types/discovery';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});
const callAIMock = vi.mocked(callAI);

let projectId: string;
let sessionId: string;

const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;
const session = () => load().sessions.find(s => s.id === sessionId)!;
const seg = (id: string, text: string, speaker: TranscriptSegment['speaker'] = 'Entrevistador (PM)'): TranscriptSegment => ({
  id, speaker, text, timestamp: '00:10', isFinal: true
});

beforeEach(() => {
  localStorage.clear();
  callAIMock.mockReset();
  projectId = storageService.createNewProject('Projeto', 'Reduzir faltas em consultas').id;
  sessionId = storageService.createNewSession(projectId, 'Reunião').id;
});

describe('extractQuestions', () => {
  it('pega frases com "?" e as que começam com palavra interrogativa, ignorando o resto', () => {
    const questions = extractQuestions([
      'Qual é o maior problema hoje?',
      'Entendi.',
      'Como vocês medem o sucesso',
      'a gente precisa de relatório'
    ]);

    expect(questions).toEqual(['Qual é o maior problema hoje?', 'Como vocês medem o sucesso']);
  });
});

describe('suggestAnswers (entrevista: o assistente responde e dá exemplo)', () => {
  it('responde com o que está registrado no PRD e marca o exemplo como ilustrativo', () => {
    storageService.updateProject(projectId, p => ({ ...p, prd: { ...p.prd, problemStatement: 'Pacientes faltam às consultas sem avisar' } }));

    const [answer] = suggestAnswers(load(), ['Qual o problema que vocês querem resolver?']);

    expect(answer.question).toBe('Qual o problema que vocês querem resolver?');
    expect(answer.answer).toContain('Pacientes faltam às consultas sem avisar');
    expect(answer.example).toMatch(/Exemplo ilustrativo/);
  });

  it('cita a fonte quando a resposta está numa fala já registrada', () => {
    appendSegment(projectId, sessionId, seg('s1', 'O prazo combinado para a primeira entrega é de três meses', 'Usuário / Stakeholder'));

    const [answer] = suggestAnswers(load(), ['Qual é o prazo da entrega?']);

    expect(answer.answer).toContain('três meses');
    expect(answer.answer).toContain('Reunião "Reunião"');
  });

  it('sem nada registrado, diz que falta o dado e propõe como responder, sem inventar', () => {
    const [answer] = suggestAnswers(load(), ['Qual é o orçamento disponível?']);

    expect(answer.answer).toMatch(/Ainda não há .* registrad/);
    expect(answer.answer).not.toMatch(/\d{2,}/);
    expect(answer.example).toMatch(/Exemplo ilustrativo/);
  });

  it('devolve uma resposta por pergunta, na mesma ordem', () => {
    const answers = suggestAnswers(load(), ['Quem usa o produto?', 'Como vocês medem o sucesso?']);

    expect(answers.map(a => a.question)).toEqual(['Quem usa o produto?', 'Como vocês medem o sucesso?']);
  });
});

describe('groupTopics (alinhamento: tópicos com ideias embaixo)', () => {
  const sentences = [
    'Precisamos definir o prazo de entrega',
    'Podemos dividir o trabalho em duas fases',
    'O orçamento está apertado para este trimestre',
    'Sugiro cortar o custo da integração',
    'O time de testes precisa de um responsável'
  ];

  it('agrupa as frases por tema e mantém cada frase como uma ideia embaixo do tópico', () => {
    const topics = groupTopics(sentences);

    const byTitle = Object.fromEntries(topics.map(t => [t.title, t.ideas]));
    expect(byTitle['Prazo e cronograma']).toEqual(['Precisamos definir o prazo de entrega', 'Podemos dividir o trabalho em duas fases']);
    expect(byTitle['Orçamento e custos']).toEqual(['O orçamento está apertado para este trimestre', 'Sugiro cortar o custo da integração']);
  });

  it('o que não cabe em nenhum tema vai para "Outros pontos", sempre por último', () => {
    const topics = groupTopics([...sentences, 'Combinamos de tomar um café depois da reunião']);

    expect(topics[topics.length - 1]).toEqual({ title: 'Outros pontos', ideas: ['Combinamos de tomar um café depois da reunião'] });
  });

  it('ignora frases muito curtas e repetidas', () => {
    const topics = groupTopics(['Ok.', 'Precisamos definir o prazo de entrega', 'Precisamos definir o prazo de entrega']);

    expect(topics).toEqual([{ title: 'Prazo e cronograma', ideas: ['Precisamos definir o prazo de entrega'] }]);
  });

  it('sem conteúdo, não devolve tópicos', () => {
    expect(groupTopics([])).toEqual([]);
  });
});

describe('deepProbes (discovery: perguntas profundas para PRD e SPEC)', () => {
  it('a partir do que foi dito, pergunta o que falta para a SPEC (integração, regra) e para o PRD (problema)', () => {
    const probes = deepProbes(load(), [
      'Hoje a gente integra o sistema com uma planilha do financeiro',
      'Tem uma regra: nunca pode aprovar sem o gerente',
      'O problema é o atraso nos repasses'
    ], []);

    const bySpec = probes.filter(p => p.target === 'spec');
    const byPrd = probes.filter(p => p.target === 'prd');
    expect(bySpec.some(p => /sistemas|dados|frequência/i.test(p.question))).toBe(true);
    expect(bySpec.some(p => /exceç/i.test(p.question))).toBe(true);
    expect(byPrd.some(p => /impacto|mensur/i.test(p.question))).toBe(true);
    expect(probes.every(p => p.why.length > 0)).toBe(true);
  });

  it('aponta lacunas do PRD (ainda sem métricas de sucesso) quando a conversa já começou', () => {
    const probes = deepProbes(load(), ['Falamos um pouco sobre o dia a dia da recepção'], []);

    expect(probes.some(p => p.target === 'prd' && /métrica|meta|sucesso/i.test(p.question))).toBe(true);
  });

  it('não repete pergunta que já foi feita e respeita o limite de 4', () => {
    const texts = ['integra o sistema', 'regra de aprovação', 'o problema do atraso', 'o acesso por perfil', 'o volume de dados'];
    const first = deepProbes(load(), texts, []);
    const second = deepProbes(load(), texts, first.map(p => p.question));

    expect(first.length).toBeLessThanOrEqual(4);
    const repeated = second.filter(p => first.some(f => f.question === p.question));
    expect(repeated).toEqual([]);
  });

  it('sem gatilho nenhum, ainda propõe uma pergunta de aprofundamento', () => {
    storageService.updateProject(projectId, p => ({
      ...p, prd: { ...p.prd, successMetrics: ['m'], inScope: ['a'], outOfScope: ['b'], assumptions: ['c'] }
    }));

    const probes = deepProbes(load(), ['Bom dia a todos'], []);

    expect(probes.length).toBeGreaterThan(0);
  });
});

describe('assistOffline', () => {
  it('entrevista: devolve respostas; alinhamento: tópicos; discovery e refinamento: perguntas', () => {
    const segments = [seg('1', 'Qual é o prazo?'), seg('2', 'Precisamos definir o prazo de entrega')];

    expect(assistOffline('interview', load(), segments).answers).toHaveLength(1);
    expect(assistOffline('alignment', load(), segments).topics?.length).toBeGreaterThan(0);
    expect(assistOffline('discovery', load(), segments).probes?.length).toBeGreaterThan(0);
    expect(assistOffline('refinement', load(), segments).probes?.every(p => p.target === 'spec')).toBe(true);
  });

  it('marca a origem como offline e guarda quais falas leu', () => {
    const out = assistOffline('alignment', load(), [seg('a', 'Definir o prazo de entrega'), seg('b', 'Revisar o orçamento')]);

    expect(out.source).toBe('offline');
    expect(out.basedOnSegmentIds).toEqual(['a', 'b']);
    expect(out.id).toMatch(/^ast-/);
  });
});

describe('assist: com IA', () => {
  beforeEach(() => {
    storageService.setApiKey('sk-teste');
  });

  it('usa a resposta da IA, no formato do tipo da conversa', async () => {
    callAIMock.mockResolvedValue(JSON.stringify({ topics: [{ title: 'Prazo', ideas: ['Dividir em fases'] }] }));

    const out = await assist('alignment', load(), [seg('1', 'Vamos falar de prazo')], []);

    expect(out.source).toBe('ai');
    expect(out.topics).toEqual([{ title: 'Prazo', ideas: ['Dividir em fases'] }]);
    expect(callAIMock.mock.calls[0][0].systemPrompt).toMatch(/tópicos/i);
  });

  it('o pedido de discovery fala de perguntas profundas, PRD e SPEC', async () => {
    callAIMock.mockResolvedValue(JSON.stringify({ probes: [{ question: 'Q?', why: 'p', target: 'spec' }] }));

    const out = await assist('discovery', load(), [seg('1', 'texto')], []);

    expect(out.probes).toEqual([{ question: 'Q?', why: 'p', target: 'spec' }]);
    const prompt = callAIMock.mock.calls[0][0].systemPrompt!;
    expect(prompt).toMatch(/PRD/);
    expect(prompt).toMatch(/SPEC/);
  });

  it('descarta itens malformados da resposta da IA', async () => {
    callAIMock.mockResolvedValue(JSON.stringify({ probes: [{ question: 'Boa?', why: 'x', target: 'prd' }, { why: 'sem pergunta' }, { question: 'Alvo ruim?', why: 'y', target: 'xyz' }] }));

    const out = await assist('discovery', load(), [seg('1', 'texto')], []);

    expect(out.probes).toEqual([{ question: 'Boa?', why: 'x', target: 'prd' }]);
  });

  it('se a IA falhar, cai nas regras locais e informa o erro', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    callAIMock.mockRejectedValue(new Error('cota excedida'));

    const out = await assist('alignment', load(), [seg('1', 'Definir o prazo de entrega')], []);

    expect(out.source).toBe('offline');
    expect(out.error).toBe('cota excedida');
    expect(out.topics?.length).toBeGreaterThan(0);
  });

  it('sem chave, nem chama a IA', async () => {
    localStorage.clear();
    projectId = storageService.createNewProject('Outro', '').id;

    const out = await assist('alignment', load(), [seg('1', 'Definir o prazo de entrega')], []);

    expect(callAIMock).not.toHaveBeenCalled();
    expect(out.source).toBe('offline');
  });
});

describe('controle do assistente na sala', () => {
  it('liga e desliga o assistente, e define o tipo da conversa', () => {
    setAssistantEnabled(projectId, sessionId, true);
    setSessionType(projectId, sessionId, 'interview');

    expect(session().assistant?.enabled).toBe(true);
    expect(session().type).toBe('interview');

    setAssistantEnabled(projectId, sessionId, false);
    expect(session().assistant?.enabled).toBe(false);
  });

  it('runAssistant lê só as falas novas e registra o resultado e até onde leu', async () => {
    setSessionType(projectId, sessionId, 'interview');
    appendSegment(projectId, sessionId, seg('q1', 'Qual é o prazo da entrega?'));

    await runAssistant(projectId, sessionId);

    expect(session().assistant?.lastSegmentId).toBe('q1');
    expect(session().assistant?.outputs).toHaveLength(1);
    expect(session().assistant?.outputs[0].answers).toHaveLength(1);
  });

  it('sem fala nova não roda de novo, a menos que seja forçado', async () => {
    appendSegment(projectId, sessionId, seg('a', 'O problema é o atraso'));
    await runAssistant(projectId, sessionId);

    expect(await runAssistant(projectId, sessionId)).toBeUndefined();
    expect(session().assistant?.outputs).toHaveLength(1);

    await runAssistant(projectId, sessionId, { force: true });
    expect(session().assistant?.outputs).toHaveLength(2);
  });

  it('a segunda leitura só considera o que veio depois da primeira', async () => {
    setSessionType(projectId, sessionId, 'alignment');
    appendSegment(projectId, sessionId, seg('a', 'Precisamos definir o prazo de entrega'));
    await runAssistant(projectId, sessionId);
    appendSegment(projectId, sessionId, seg('b', 'O orçamento está apertado neste trimestre'));

    await runAssistant(projectId, sessionId);

    const [first, second] = session().assistant!.outputs;
    expect(first.basedOnSegmentIds).toEqual(['a']);
    expect(second.basedOnSegmentIds).toEqual(['b']);
  });

  it('duas execuções ao mesmo tempo na mesma sala não se atropelam', async () => {
    appendSegment(projectId, sessionId, seg('a', 'O problema é o atraso'));

    const [one, two] = await Promise.all([runAssistant(projectId, sessionId), runAssistant(projectId, sessionId)]);

    expect([one, two].filter(Boolean)).toHaveLength(1);
    expect(session().assistant?.outputs).toHaveLength(1);
  });

  it('guarda no máximo as 20 últimas saídas', async () => {
    for (let i = 0; i < 22; i++) {
      appendSegment(projectId, sessionId, seg(`s${i}`, `Precisamos definir o prazo ${i}`));
      await runAssistant(projectId, sessionId);
    }

    expect(session().assistant?.outputs).toHaveLength(20);
  });

  it('devolve undefined para projeto ou sala que não existem', async () => {
    expect(await runAssistant('nao-existe', sessionId, { force: true })).toBeUndefined();
    expect(await runAssistant(projectId, 'nao-existe', { force: true })).toBeUndefined();
  });
});
