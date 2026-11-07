import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVIEW_CHECKLIST,
  INTERVIEW_SCRIPT_40_QUESTIONS,
  PROCESS_SHEET_22_QUESTIONS,
  addAutomationOpportunity,
  addDiscoveryArea,
  addDiscoverySystem,
  addProcessSheet,
  computeDiscoverySummary,
  computeOpportunitiesTable,
  computeProcessInventoryRow,
  evaluateReadoutQualityChecklist,
  exportProcessesInventoryToCsv,
  extractAutomationDiscoveryOffline,
  extractAutomationDiscoveryWithAI,
  generateExecutiveReadoutMarkdown,
  initAutomationDiscovery,
  parseSpokenVolumeAndMinutes,
  proposeAutomationOpportunitiesToBacklog,
  saveAreaScriptAnswer,
  suggestSolutionTypeForProcess,
  updateChecklistItem,
  updateDiscoveryArea,
  updateDiscoveryPremises,
  validatePremisesWeights
} from './automationDiscoveryService';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

describe('automationDiscoveryService (Épico E13)', () => {
  it('inicializa com 17 itens no checklist, 40 perguntas no roteiro 2h e 22 perguntas na ficha de processo', () => {
    const data = initAutomationDiscovery('Empresa Teste');
    expect(DEFAULT_INTERVIEW_CHECKLIST).toHaveLength(17);
    expect(data.checklist).toHaveLength(17);
    expect(data.checklist.filter(i => i.phase === 'Antes')).toHaveLength(7);
    expect(data.checklist.filter(i => i.phase === 'Durante')).toHaveLength(5);
    expect(data.checklist.filter(i => i.phase === 'Depois')).toHaveLength(5);

    expect(INTERVIEW_SCRIPT_40_QUESTIONS).toHaveLength(40);
    const uniqueBlocks = new Map<string, number>();
    for (const q of INTERVIEW_SCRIPT_40_QUESTIONS) {
      uniqueBlocks.set(q.blockId, q.blockMinutes);
    }
    const totalMinutes = Array.from(uniqueBlocks.values()).reduce((a, b) => a + b, 0);
    expect(totalMinutes).toBe(120);

    expect(PROCESS_SHEET_22_QUESTIONS).toHaveLength(22);
    expect(PROCESS_SHEET_22_QUESTIONS.filter(q => q.isGoldenFour)).toHaveLength(4);
  });

  it('valida se os pesos da Capa somam 100%', () => {
    const data = initAutomationDiscovery('Cliente');
    expect(validatePremisesWeights(data.premises).isValid).toBe(true);
    expect(validatePremisesWeights(data.premises).message).toBe('OK (soma 100%)');

    const invalid = updateDiscoveryPremises(data, { weightImpact: 0.5 });
    expect(validatePremisesWeights(invalid.premises).isValid).toBe(false);
    expect(validatePremisesWeights(invalid.premises).message).toContain('110%');
  });

  it('calcula horas/mês, custo mensal, regra dos 4 números e alerta de jornada > 176h/pessoa no Inventário de Processos', () => {
    let data = initAutomationDiscovery('Atacarejo');
    data = addProcessSheet(data, {
      area: 'Comercial / Compras',
      name: 'Cadastrar e atualizar produtos e preços no ERP',
      trigger: 'Fornecedor envia tabela por e-mail ou WhatsApp',
      mainSteps: 'Abrir planilha -> conferir NCM -> digitar no ERP -> liberar para lojas',
      finalDeliverable: 'Produto ativo no ERP e no PDV',
      ownerRole: 'Coordenador de Cadastro',
      frequency: 'Diária',
      monthlyVolume: 600,
      standardMinutes: 18,
      peopleInvolved: 3,
      exceptionRate: 0.25,
      exceptionMinutes: 40,
      systemsUsed: 'ERP Consinco, Excel, WhatsApp',
      dataInputFormat: 'Planilha Excel, PDF e WhatsApp',
      structuredData: 'Parcial',
      documentedRules: 'Parcial',
      bottlenecks: 'Esperar confirmação fiscal do NCM',
      errorImpact: 'Erro de preço na etiqueta de gôndola',
      literalPainQuote: 'A gente passa o dia digitando planilha de fornecedor no ERP.',
      seasonality: 'Véspera de encarte semanal'
    });

    const row = computeProcessInventoryRow(data.processes[0], data.premises);
    expect(row.process.id).toBe('P-01');
    expect(row.hasFourGoldenNumbers).toBe(true);
    expect(row.headerBadge).toContain('4 números ok');
    expect(row.hoursPerMonth).toBe(180); // 600 * 18 / 60 = 180
    expect(row.effectiveHourlyCost).toBe(45);
    expect(row.monthlyCost).toBe(8100); // 180 * 45 = 8100
    expect(row.hoursPerPersonPerMonth).toBe(60); // 180 / 3 = 60 <= 176
    expect(row.exceedsMonthlyWorkdayLimit).toBe(false);

    // Sem um dos 4 números obrigatórios
    const incomplete = computeProcessInventoryRow(
      { ...data.processes[0], peopleInvolved: undefined },
      data.premises
    );
    expect(incomplete.hasFourGoldenNumbers).toBe(false);
    expect(incomplete.headerBadge).toContain('faltam números');
  });

  it('aplica a heurística de tipo de solução candidata corretamente', () => {
    expect(
      suggestSolutionTypeForProcess({
        name: 'Importar planilha padronizada',
        structuredData: 'Sim',
        documentedRules: 'Sim'
      })
    ).toBe('Automação n8n');

    expect(
      suggestSolutionTypeForProcess({
        name: 'Triar notas fiscais em PDF enviadas por WhatsApp',
        dataInputFormat: 'PDF e foto no WhatsApp',
        structuredData: 'Não',
        documentedRules: 'Parcial'
      })
    ).toBe('Agente de IA');

    expect(
      suggestSolutionTypeForProcess({
        name: 'Responder dúvidas sobre política comercial',
        mainSteps: 'Consultar manual e responder pergunta do vendedor',
        structuredData: 'Não',
        documentedRules: 'Sim'
      })
    ).toBe('Assistente Claude');
  });

  it('calcula horas liberadas, ganho anual, score ponderado, quadrante e ranking nas Oportunidades', () => {
    let data = initAutomationDiscovery('Cliente');
    data = addProcessSheet(data, {
      area: 'Financeiro',
      name: 'Conciliar recebíveis de cartões e Pix',
      monthlyVolume: 22,
      standardMinutes: 150, // 55h/mês
      peopleInvolved: 2,
      exceptionRate: 0.15
    });
    data = addProcessSheet(data, {
      area: 'Comercial',
      name: 'Emitir pedidos de reposição',
      monthlyVolume: 440,
      standardMinutes: 25, // 183.33h/mês
      peopleInvolved: 6,
      exceptionRate: 0.2
    });

    // O-01: Impacto 5, Esforço 2, Risco 2, Dados 4 -> Score = 5*0.4 + 4*0.2 + (6-2)*0.25 + (6-2)*0.15 = 2.0 + 0.8 + 1.0 + 0.6 = 4.40 (Quick win)
    data = addAutomationOpportunity(data, {
      title: 'Automação n8n de conciliação diária de cartões e Pix',
      processId: 'P-01',
      solutionType: 'Automação n8n',
      automatizableFraction: 0.8,
      impact: 5,
      effort: 2,
      risk: 2,
      dataReadiness: 4,
      roadmapWave: '0–30 dias',
      ownerSponsor: 'Controller',
      nextStep: 'Solicitar arquivo de extrato EDI',
      status: 'Aprovada'
    });

    // O-02: Impacto 5, Esforço 3, Risco 2, Dados 4 -> Score = 5*0.4 + 4*0.2 + (6-3)*0.25 + (6-2)*0.15 = 2.0 + 0.8 + 0.75 + 0.6 = 4.15 (Projeto estratégico)
    data = addAutomationOpportunity(data, {
      title: 'Sugestão automática de pedido de reposição com aprovação do comprador',
      processId: 'P-02',
      solutionType: 'Automação n8n',
      automatizableFraction: 0.7,
      impact: 5,
      effort: 3,
      risk: 2,
      dataReadiness: 4,
      roadmapWave: '31–60 dias',
      ownerSponsor: 'Diretor Comercial',
      nextStep: 'Definir regra de estoque mínimo',
      status: 'Validada com a área'
    });

    const oppRows = computeOpportunitiesTable(data);
    expect(oppRows).toHaveLength(2);

    expect(oppRows[0].currentHoursPerMonth).toBe(55);
    expect(oppRows[0].releasedHoursPerMonth).toBe(44); // 55 * 0.8
    expect(oppRows[0].estimatedMonthlyGain).toBe(1980); // 44 * 45
    expect(oppRows[0].estimatedAnnualGain).toBe(23760); // 1980 * 12
    expect(oppRows[0].score).toBe(4.4);
    expect(oppRows[0].quadrant).toBe('Quick win');
    expect(oppRows[0].ranking).toBe(1);

    expect(oppRows[1].score).toBe(4.15);
    expect(oppRows[1].quadrant).toBe('Projeto estratégico');
    expect(oppRows[1].ranking).toBe(2);

    const summary = computeDiscoverySummary(data);
    expect(summary.quickWinsCount).toBe(1);
    expect(summary.activeOpportunitiesCount).toBe(2);
    expect(summary.top10Opportunities[0].opportunity.id).toBe('O-01');
  });

  it('converte "40 horas no mês" na fala em volume=1 e minutos=2400 conforme o Guia do Consultor', () => {
    const parsed = parseSpokenVolumeAndMinutes(
      'Hoje 3 pessoas fazem esse fechamento e a gente gasta 40 horas no mês nisso, com 15% de exceção.'
    );
    expect(parsed.monthlyVolume).toBe(1);
    expect(parsed.standardMinutes).toBe(2400);
    expect(parsed.peopleInvolved).toBe(3);
    expect(parsed.exceptionRate).toBe(0.15);
  });

  it('extrai área, sistemas, processos e oportunidades da sessão (offline e com IA) e gera Readout e CSV', async () => {
    const session: MeetingSession = {
      id: 'sess-1',
      title: 'Entrevista - Financeiro',
      date: '2026-04-20',
      durationSeconds: 3600,
      participants: [' Marcos (Controller)'],
      rawTranscript: [
        {
          id: 't1',
          speaker: 'Usuário / Stakeholder',
          text: 'No SAP e no Excel, 2 analistas fazem 200 notas por mês, levando 15 minutos cada, e 20% de exceção por divergência de pedido.',
          timestamp: '02:10',
          isFinal: true
        }
      ],
      summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
      liveQuestions: [],
      painPoints: [
        {
          id: 'p1',
          description: 'Conferência manual de nota fiscal contra pedido no ERP',
          severity: 'high',
          quote: 'Perdemos horas conferindo PDF contra o pedido no SAP.',
          frequencyScore: 8
        }
      ],
      jtbds: [],
      mindMapNodes: [],
      mindMapEdges: [],
      userFlowSteps: []
    };

    const initial = initAutomationDiscovery('Grupo Exemplo');
    const extracted = extractAutomationDiscoveryOffline(initial, session);

    expect(extracted.addedAreas).toBe(1);
    expect(extracted.addedSystems).toBeGreaterThanOrEqual(2); // SAP/ERP + Excel
    expect(extracted.addedProcesses).toBe(1);
    expect(extracted.addedOpportunities).toBe(1);
    expect(extracted.data.processes[0].monthlyVolume).toBe(200);
    expect(extracted.data.processes[0].standardMinutes).toBe(15);

    // Testa extração com IA mockada
    const aiExtracted = await extractAutomationDiscoveryWithAI(
      initial,
      session,
      async () =>
        JSON.stringify({
          area: { name: 'Fiscal', managerName: 'Ana', role: 'Gerente Fiscal', headcount: 5 },
          scriptAnswers: { '2.2': 'SLA de entrada de NF em 24h' },
          systems: [{ name: 'Protheus', type: 'ERP', purpose: 'Escrituração', hasApi: 'Sim', hasPersonalDataLgpd: 'Não' }],
          processes: [
            {
              name: 'Validar XML de entrada',
              monthlyVolume: 500,
              standardMinutes: 12,
              peopleInvolved: 2,
              exceptionRate: 0.1,
              structuredData: 'Sim',
              documentedRules: 'Sim',
              candidateSolution: 'Automação n8n'
            }
          ],
          opportunities: [
            {
              title: 'Validação automática de XML com fila de exceção',
              processName: 'Validar XML de entrada',
              solutionType: 'Automação n8n',
              automatizableFraction: 0.75
            }
          ]
        })
    );

    expect(aiExtracted.source).toBe('ai');
    expect(aiExtracted.data.areas[0].name).toBe('Fiscal');
    expect(aiExtracted.data.processes[0].monthlyVolume).toBe(500);

    // Avalia checklist de qualidade de 12 pontos, relatório Markdown e exportação CSV
    let consolidated = updateDiscoveryArea(aiExtracted.data, aiExtracted.data.areas[0].id, {
      status: 'Consolidada'
    });
    consolidated = updateChecklistItem(consolidated, 1, { status: 'Feito' });
    consolidated = saveAreaScriptAnswer(consolidated, consolidated.areas[0].id, '1.1', 'Alinhado');

    const checks = evaluateReadoutQualityChecklist(consolidated);
    expect(checks).toHaveLength(12);
    expect(checks[0].passed).toBe(true); // Área Consolidada
    expect(checks[1].passed).toBe(true); // 4 números ok

    const md = generateExecutiveReadoutMarkdown(consolidated);
    expect(md).toContain('# Diagnóstico de Oportunidades de IA e Automação');
    expect(md).toContain('## 1. Sumário Executivo');
    expect(md).toContain('## 6. Roadmap de 90 Dias');

    const csv = exportProcessesInventoryToCsv(consolidated);
    expect(csv).toContain('Validar XML de entrada');

    // Testa geração de propostas para o backlog (E8.4)
    const dummyProject: DiscoveryProject = {
      id: 'p1',
      name: 'Grupo Exemplo',
      description: '',
      createdAt: '',
      updatedAt: '',
      sessions: [],
      okrs: [],
      epics: [],
      prd: {} as any,
      leanCanvas: {} as any,
      decisionLog: []
    };
    const proposals = proposeAutomationOpportunitiesToBacklog(dummyProject, consolidated);
    expect(proposals.length).toBeGreaterThan(0);
  });
});
