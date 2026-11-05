import { describe, expect, it } from 'vitest';
import {
  addStoryMapCard,
  extractStoryMap,
  moveStoryMapCard,
  proposeStoryMapToBacklog,
  removeStoryMapCard,
  syncStoryMap,
  updateStoryMapCard
} from './storyMapService';
import type { DiscoveryProject, MeetingSession, PainPoint, UserFlowStep } from '../types/discovery';

const makeStep = (
  id: string,
  stepNumber: number,
  title: string,
  frictionLevel: UserFlowStep['frictionLevel'] = 'warning',
  painPointDetected?: string
): UserFlowStep => ({
  id,
  stepNumber,
  title,
  actor: 'Analista de Compras',
  systemAction: '',
  frictionLevel,
  painPointDetected
});

const makePain = (id: string, description: string, severity: PainPoint['severity'] = 'high', quote?: string): PainPoint => ({
  id,
  description,
  severity,
  quote: quote ?? description,
  frequencyScore: 4
});

const makeSession = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 'sess-sm',
  title: 'Entrevista Compras',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: ['Entrevistador (PM)', 'Analista de Compras'],
  rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: [],
  ...over
});

describe('storyMapService (E12.2)', () => {
  it('jornada com 5 etapas e 4 dores gera um story map com histórias nas colunas certas', () => {
    const steps: UserFlowStep[] = [
      makeStep('s1', 1, 'Receber solicitação de material', 'warning'),
      makeStep('s2', 2, 'Consultar catálogo de fornecedores', 'critical', 'Cadastro de fornecedores desatualizado'),
      makeStep('s3', 3, 'Comparar cotações em planilha', 'critical', 'Comparação manual em planilha demora'),
      makeStep('s4', 4, 'Pedir aprovação de alçada ao diretor', 'warning', 'Aprovação de alçada para no e-mail'),
      makeStep('s5', 5, 'Emitir pedido de compra no ERP', 'critical', 'Digitação duplicada do pedido no ERP')
    ];

    const pains: PainPoint[] = [
      makePain('p1', 'Cadastro de fornecedores está sempre desatualizado e trava a consulta', 'high'),
      makePain('p2', 'Comparar cotações em planilha manual leva duas horas por compra', 'high'),
      makePain('p3', 'Aprovação de alçada pelo diretor demora dias no e-mail', 'medium'),
      makePain('p4', 'Digitar o pedido de compra de novo no ERP gera erro de quantidade', 'high')
    ];

    const session = makeSession({ userFlowSteps: steps, painPoints: pains });
    const cards = extractStoryMap(session);

    expect(cards.filter(c => c.stepId === 's2').some(c => c.title.toLowerCase().includes('fornecedor'))).toBe(true);
    expect(cards.filter(c => c.stepId === 's3').some(c => c.title.toLowerCase().includes('cota'))).toBe(true);
    expect(cards.filter(c => c.stepId === 's4').some(c => c.title.toLowerCase().includes('aprova') || c.title.toLowerCase().includes('alçada'))).toBe(true);
    expect(cards.filter(c => c.stepId === 's5').some(c => c.title.toLowerCase().includes('pedido') || c.title.toLowerCase().includes('erp'))).toBe(true);

    // Dores de alta severidade caem no MVP; média/baixa em "Depois" (next)
    const p3Card = cards.find(c => c.id === 'sm-pain-p3');
    expect(p3Card?.release).toBe('next');
    const p1Card = cards.find(c => c.id === 'sm-pain-p1');
    expect(p1Card?.release).toBe('mvp');
  });

  it('permite adicionar, editar, mover entre etapas/releases e apagar cartões preservando escolhas na sincronização', () => {
    const steps = [
      makeStep('s1', 1, 'Receber solicitação'),
      makeStep('s2', 2, 'Emitir pedido')
    ];
    let s = syncStoryMap(makeSession({
      userFlowSteps: steps,
      painPoints: [makePain('p1', 'Receber solicitação por mensagem solta gera perda')]
    }));

    expect(s.storyMapCards?.length).toBeGreaterThan(0);

    // Editar título marca manual: true e sobrevive ao sync
    s = updateStoryMapCard(s, 'sm-pain-p1', { title: 'Centralizar pedido de material' });
    s = syncStoryMap(s);
    expect(s.storyMapCards?.find(c => c.id === 'sm-pain-p1')?.title).toBe('Centralizar pedido de material');

    // Mover de etapa e de release (mvp -> next)
    s = moveStoryMapCard(s, 'sm-pain-p1', { stepId: 's2', release: 'next' });
    const moved = s.storyMapCards?.find(c => c.id === 'sm-pain-p1');
    expect(moved?.stepId).toBe('s2');
    expect(moved?.release).toBe('next');

    // Adicionar cartão manual
    s = addStoryMapCard(s, { stepId: 's1', title: 'Validar saldo orçamentário', release: 'mvp' });
    expect(s.storyMapCards?.some(c => c.title === 'Validar saldo orçamentário' && c.manual)).toBe(true);

    // Apagar cartão derivado não o recria no próximo sync
    s = removeStoryMapCard(s, 'sm-pain-p1');
    s = syncStoryMap(s);
    expect(s.storyMapCards?.some(c => c.id === 'sm-pain-p1')).toBe(false);
  });

  it('aprovar o story map gera propostas de revisão (E8.4) sem alterar o backlog do projeto antes do aceite', () => {
    const steps = [
      makeStep('s1', 1, 'Consultar fornecedores', 'critical'),
      makeStep('s2', 2, 'Comparar cotações', 'warning')
    ];
    const s = syncStoryMap(makeSession({
      userFlowSteps: steps,
      painPoints: [makePain('p1', 'Cadastro de fornecedores trava a consulta', 'high')]
    }));

    const project: DiscoveryProject = {
      id: 'proj-1',
      name: 'Portal de Compras',
      description: 'Gestão de compras',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      sessions: [s],
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
    };

    const proposals = proposeStoryMapToBacklog(project, s, 'mvp');

    // O projeto continua intacto até o aceite na tela de revisão
    expect(project.epics).toEqual([]);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0].kind).toBe('add');
  });
});
