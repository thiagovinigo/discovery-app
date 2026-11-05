import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildOfflinePrototype,
  buildPrototypeScreens,
  generatePrototypeWithAI
} from './prototypeService';
import { storageService } from './storageService';
import { callAI } from './aiClient';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});

const callAIMock = vi.mocked(callAI);

const makeSession = (): MeetingSession => ({
  id: 'sess-proto',
  title: 'Entrevista Compras',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: ['Comprador'],
  rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [
    { id: 'p1', description: 'Cadastro de fornecedores trava por CNPJ inválido', severity: 'high', frequencyScore: 4 }
  ],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: [
    {
      id: 'st-1',
      stepNumber: 1,
      title: 'Consultar catálogo de fornecedores',
      actor: 'Comprador',
      systemAction: '',
      frictionLevel: 'critical',
      painPointDetected: 'Cadastro de fornecedores trava por CNPJ inválido'
    },
    {
      id: 'st-2',
      stepNumber: 2,
      title: 'Emitir pedido de compra',
      actor: 'Comprador',
      systemAction: '',
      frictionLevel: 'smooth'
    }
  ]
});

const makeProject = (session: MeetingSession): DiscoveryProject => ({
  id: 'proj-proto',
  name: 'Portal Compras',
  description: 'Compras B2B',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  sessions: [session],
  okrs: [],
  epics: [],
  prd: {
    id: 'prd-1', title: 'PRD', version: '0.1', lastUpdated: '04/11/2026',
    problemStatement: '', targetAudience: '', valueProposition: '',
    inScope: [], outOfScope: [], successMetrics: [], assumptions: [], risksAndMitigations: []
  },
  leanCanvas: {
    problem: [], existingAlternatives: [], customerSegments: [], earlyAdopters: [],
    uniqueValueProposition: '', highLevelConcept: '', solution: [], channels: [],
    revenueStreams: [], costStructure: [], keyMetrics: [], unfairAdvantage: ''
  },
  decisionLog: []
});

describe('prototypeService (E12.3)', () => {
  beforeEach(() => {
    localStorage.clear();
    callAIMock.mockReset();
  });

  it('monta uma tela por etapa da jornada/story map com campos, ações e estado de erro vindo da fricção', () => {
    const s = makeSession();
    const screens = buildPrototypeScreens(s);

    expect(screens).toHaveLength(2);
    expect(screens[0].title).toBe('Consultar catálogo de fornecedores');
    expect(screens[0].errorState).toContain('CNPJ inválido');
    expect(screens[0].fields.length).toBeGreaterThan(0);
    expect(screens[0].storyTitles.length).toBeGreaterThan(0);
  });

  it('sem chave de IA gera wireframe navegável de baixa fidelidade marcado como "offline"', async () => {
    const s = makeSession();
    const p = makeProject(s);

    const proto = await generatePrototypeWithAI(s, p);

    expect(callAIMock).not.toHaveBeenCalled();
    expect(proto.source).toBe('offline');
    expect(proto.screens).toHaveLength(2);
    expect(proto.html).toContain('<!DOCTYPE html>');
    expect(proto.html).toContain('Consultar catálogo de fornecedores');
    expect(proto.html).toContain('Emitir pedido de compra');
  });

  it('com chave de IA gera protótipo HTML de alta fidelidade marcado como "ai", e cai no offline se a IA falhar', async () => {
    storageService.setApiKey('sk-test');
    const s = makeSession();
    const p = makeProject(s);

    callAIMock.mockResolvedValueOnce('```html\n<!DOCTYPE html><html><body><h1>Protótipo IA</h1></body></html>\n```');
    const aiProto = await generatePrototypeWithAI(s, p);

    expect(aiProto.source).toBe('ai');
    expect(aiProto.html).toContain('<h1>Protótipo IA</h1>');
    expect(aiProto.html).not.toContain('```');

    // Se a IA falhar, devolve o wireframe offline sem quebrar
    callAIMock.mockRejectedValueOnce(new Error('timeout'));
    const fallback = await generatePrototypeWithAI(s, p);
    expect(fallback.source).toBe('offline');
    expect(fallback.html).toContain('Consultar catálogo de fornecedores');
  });

  it('buildOfflinePrototype devolve lista vazia quando a sessão não tem etapas na jornada', () => {
    const empty = { ...makeSession(), userFlowSteps: [] };
    const proto = buildOfflinePrototype(empty, 'Portal Compras');

    expect(proto.screens).toEqual([]);
  });
});
