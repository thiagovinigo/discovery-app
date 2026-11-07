import { describe, expect, it } from 'vitest';
import {
  evaluateOpportunityWithJev,
  evaluateOpportunityWithJevOffline,
  jevChoice,
  jevNoul,
  jevScore,
  judgeBacklogEvidenceWithJev
} from './jevDecisionService';
import type { AutomationOpportunity, ProcessSheet } from '../types/discovery';

describe('jevDecisionService (Motor System-One estilo Jev / TypeSafe AI)', () => {
  const sampleProcess: ProcessSheet = {
    id: 'P-01',
    area: 'Financeiro',
    name: 'Conciliar cartões e Pix',
    trigger: 'Fechamento do caixa diário',
    mainSteps: 'Baixar extrato -> cruzar com ERP -> lançar divergências',
    finalDeliverable: 'Títulos baixados no ERP',
    ownerRole: 'Controller',
    frequency: 'Diária',
    monthlyVolume: 400,
    standardMinutes: 15, // 100 horas/mês
    peopleInvolved: 2,
    exceptionRate: 0.15,
    systemsUsed: 'SAP, Excel',
    dataInputFormat: 'Arquivo EDI e planilha',
    structuredData: 'Sim',
    documentedRules: 'Sim',
    bottlenecks: 'Conferência manual de taxas',
    errorImpact: 'Atraso no fechamento interno',
    literalPainQuote: 'Perdemos horas toda manhã conferindo taxa de cartão.',
    seasonality: 'Segunda-feira',
    candidateSolution: 'Automação n8n'
  };

  const sampleOpp: AutomationOpportunity = {
    id: 'O-01',
    title: 'Conciliação automática n8n com revisão humana nas divergências',
    processId: 'P-01',
    solutionType: 'Automação n8n',
    automatizableFraction: 0.75, // 75h liberadas/mês
    otherGains: 'Visibilidade diária de caixa',
    roadmapWave: '0–30 dias',
    ownerSponsor: 'Controller',
    nextStep: 'Mapear layout EDI',
    status: 'Mapeada'
  };

  it('executa as 3 primitivas Noul, Choice e Score com fallback determinístico offline e com IA', async () => {
    const noulOffline = await jevNoul('O usuário disse que gasta 3 horas por dia.', 'Há dor de tempo?', () => ({
      answer: 'yes',
      confidence: 0.85,
      probabilities: { yes: 0.85, no: 0.05, null: 0.1 },
      rationale: 'Mencionou 3 horas por dia.'
    }));
    expect(noulOffline.answer).toBe('yes');
    expect(noulOffline.source).toBe('offline');

    const choiceAi = await jevChoice(
      'Dados em tabela fixa e regra documentada.',
      'Qual solução?',
      ['Automação n8n', 'Agente de IA'] as const,
      () => ({
        choice: 'Automação n8n',
        confidence: 0.7,
        probabilities: { 'Automação n8n': 0.7, 'Agente de IA': 0.3 },
        rationale: 'Fallback'
      }),
      async () =>
        JSON.stringify({
          choice: 'Automação n8n',
          confidence: 0.92,
          probabilities: { 'Automação n8n': 0.92, 'Agente de IA': 0.08 },
          rationale: 'Regra determinística e dado estruturado.'
        })
    );
    expect(choiceAi.choice).toBe('Automação n8n');
    expect(choiceAi.confidence).toBe(0.92);
    expect(choiceAi.source).toBe('ai');

    const scoreAi = await jevScore(
      'Libera 80 horas por mês.',
      'Impacto de 1 a 5',
      () => ({ score: 4, confidence: 0.8, rationale: '60 a 120h/mês' }),
      async () => JSON.stringify({ score: 4, confidence: 0.9, rationale: '80h/mês está na faixa 4.' })
    );
    expect(scoreAi.score).toBe(4);
    expect(scoreAi.source).toBe('ai');
  });

  it('calcula o veredito completo Jev para uma Oportunidade (offline e com IA)', async () => {
    const offlineVerdict = evaluateOpportunityWithJevOffline(sampleOpp, sampleProcess, 45);
    expect(offlineVerdict.solutionChoice.choice).toBe('Automação n8n');
    expect(offlineVerdict.impactScore.score).toBe(4); // 75h liberadas/mês -> nota 4 (60 a 120h)
    expect(offlineVerdict.dataReadinessScore.score).toBe(5); // Estruturado Sim + Regra Sim
    expect(offlineVerdict.effortScore.score).toBe(2);
    expect(offlineVerdict.waveChoice.choice).toBe('0–30 dias');
    expect(offlineVerdict.goVerdict.answer).toBe('yes');

    const aiVerdict = await evaluateOpportunityWithJev(
      sampleOpp,
      sampleProcess,
      45,
      async () =>
        JSON.stringify({
          solutionType: 'Automação n8n',
          solutionConfidence: 0.91,
          impact: 5,
          effort: 2,
          risk: 2,
          dataReadiness: 5,
          roadmapWave: '0–30 dias',
          go: 'yes',
          goConfidence: 0.94,
          rationale: 'Quick win clássico com alto volume e dados estruturados.'
        })
    );
    expect(aiVerdict.source).toBe('ai');
    expect(aiVerdict.impactScore.score).toBe(5);
    expect(aiVerdict.goVerdict.answer).toBe('yes');
    expect(aiVerdict.overallConfidence).toBe(0.94);
  });

  it('julga evidências do backlog via primitiva Noul (confirms / contests / null)', async () => {
    const confirmRes = await judgeBacklogEvidenceWithJev(
      'Eu preciso fazer isso todo dia na mão e perco tempo demais.',
      'Automatizar conciliação',
      'Conciliar extratos diariamente'
    );
    expect(confirmRes.answer).toBe('yes');

    const contestRes = await judgeBacklogEvidenceWithJev(
      'Sinceramente não preciso disso, ninguém usa esse relatório.',
      'Relatório impresso',
      'Gerar relatório diário em papel'
    );
    expect(contestRes.answer).toBe('no');

    const neutralRes = await judgeBacklogEvidenceWithJev(
      'Ontem a reunião começou às 10h da manhã.',
      'Automatizar conciliação',
      'Conciliar extratos'
    );
    expect(neutralRes.answer).toBe('null');
  });
});
