import { describe, expect, it } from 'vitest';
import { clarityScore, clusterPainPoints, methodSuggestions, productAreas } from './insightService';
import type { Epic, MeetingSession, PainPoint, UserStory } from '../types/discovery';

const pain = (id: string, description: string, over: Partial<PainPoint> = {}): PainPoint => ({
  id, description, severity: 'medium', frequencyScore: 1, ...over
});

const session = (id: string, title: string, painPoints: PainPoint[]): MeetingSession => ({
  id, title, date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints, jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

describe('clusterPainPoints', () => {
  it('sem dores mapeadas, não inventa tema nenhum', () => {
    expect(clusterPainPoints([])).toEqual([]);
    expect(clusterPainPoints([session('s1', 'A', [])])).toEqual([]);
  });

  it('agrupa dores parecidas de reuniões diferentes e conta menções e reuniões', () => {
    const clusters = clusterPainPoints([
      session('s1', 'Kickoff', [pain('p1', 'Fechamento manual em planilhas demora dias', { quote: 'Levamos quatro dias cruzando planilhas' })]),
      session('s2', 'Revisão', [pain('p2', 'Fechamento em planilhas manuais atrasa a entrega'), pain('p3', 'Ninguém sabe o status do repasse')])
    ]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toMatchObject({ theme: 'Fechamento manual em planilhas demora dias', occurrences: 2, sessionsCount: 2, sampleQuote: 'Levamos quatro dias cruzando planilhas' });
    expect(clusters[1]).toMatchObject({ occurrences: 1, sessionsCount: 1, sampleQuote: undefined });
  });

  it('a severidade do grupo é a mais alta entre as dores dele', () => {
    const [cluster] = clusterPainPoints([
      session('s1', 'A', [pain('p1', 'Fechamento manual em planilhas', { severity: 'low' }), pain('p2', 'Fechamento manual em planilhas lento', { severity: 'high' })])
    ]);

    expect(cluster.severity).toBe('high');
  });

  it('ordena pelos grupos mais citados e limita a lista', () => {
    const many = Array.from({ length: 10 }, (_, i) => pain(`p${i}`, `Assunto totalmente diferente número ${['alfa', 'beta', 'gama', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'][i]}`));
    const clusters = clusterPainPoints([session('s1', 'A', many)]);

    expect(clusters.length).toBeLessThanOrEqual(6);
    expect(clusterPainPoints([session('s1', 'A', [pain('a', 'Coisa rara única xyz'), pain('b', 'Cadastro lento demais'), pain('c', 'Cadastro lento')])])[0].occurrences).toBe(2);
  });

  it('pega a citação da primeira dor do grupo que tiver uma', () => {
    const [cluster] = clusterPainPoints([
      session('s1', 'A', [pain('p1', 'Cadastro lento demais'), pain('p2', 'Cadastro muito lento', { quote: 'Demora uma eternidade' })])
    ]);

    expect(cluster.sampleQuote).toBe('Demora uma eternidade');
  });
});

describe('methodSuggestions', () => {
  it('sem dores, não sugere nada', () => {
    expect(methodSuggestions([])).toEqual([]);
  });

  it('cada sugestão parte de uma dor real do projeto, com o método certo para ela', () => {
    const suggestions = methodSuggestions([
      session('s1', 'A', [pain('p1', 'Travamento do lote por centavos', { severity: 'high' })]),
      session('s2', 'B', [pain('p2', 'Cadastro lento demais'), pain('p3', 'Cadastro muito lento')]),
      session('s3', 'C', [pain('p4', 'Cliente confuso com o menu')])
    ]);

    expect(suggestions.map(s => s.trigger)).toEqual([
      'Travamento do lote por centavos',
      'Cadastro lento demais',
      'Cliente confuso com o menu'
    ]);
    expect(suggestions[0].method).toMatch(/PBB/);
    expect(suggestions[0].action).toContain('Travamento do lote por centavos');
    expect(suggestions[1].method).toMatch(/OST/);
    expect(suggestions[2].badge).toBeTruthy();
  });

  it('no máximo três sugestões', () => {
    const sessions = [session('s1', 'A', ['alfa', 'beta', 'gama', 'delta', 'epsilon'].map((w, i) => pain(`p${i}`, `Problema ${w} sem relação nenhuma`, { severity: 'high' })))];

    expect(methodSuggestions(sessions).length).toBeLessThanOrEqual(3);
  });
});

describe('productAreas', () => {
  const story = (domain?: UserStory['domain']): UserStory => ({
    id: Math.random().toString(), featureId: 'f', title: 't', asA: 'a', iWantTo: 'b', soThat: 'c', acceptanceCriteria: [], tasks: [], domain
  });
  const epicOf = (stories: UserStory[]): Epic => ({
    id: 'e', title: 'E', objective: '', businessValue: '', status: 'discovery',
    features: [{ id: 'f', epicId: 'e', title: 'F', description: '', valueProposition: '', effort: 'S', userStories: stories }]
  });

  it('sem domínios nas histórias, devolve lista vazia', () => {
    expect(productAreas([])).toEqual([]);
    expect(productAreas([epicOf([story(), story()])])).toEqual([]);
  });

  it('lista os domínios que as histórias realmente têm, do mais usado para o menos', () => {
    const areas = productAreas([epicOf([story('security'), story('checkout'), story('security')])]);

    expect(areas).toEqual([{ label: 'Segurança', stories: 2 }, { label: 'Checkout', stories: 1 }]);
  });
});

describe('clarityScore', () => {
  it('projeto vazio não ganha pontuação de graça', () => {
    expect(clarityScore({ transcripts: 0, painPoints: 0, jtbds: 0, epics: 0 })).toBe(0);
  });

  it('cresce com a evidência coletada e nunca passa de 95', () => {
    const some = clarityScore({ transcripts: 10, painPoints: 3, jtbds: 2, epics: 1 });
    const lots = clarityScore({ transcripts: 500, painPoints: 100, jtbds: 100, epics: 5 });

    expect(some).toBeGreaterThan(0);
    expect(lots).toBe(95);
    expect(lots).toBeGreaterThan(some);
  });
});
