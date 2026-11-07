import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  ListChecks,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Workflow
} from 'lucide-react';
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
  ensureAutomationDiscovery,
  evaluateReadoutQualityChecklist,
  exportProcessesInventoryToCsv,
  extractAutomationDiscoveryOffline,
  extractAutomationDiscoveryWithAI,
  generateExecutiveReadoutMarkdown,
  proposeAutomationOpportunitiesToBacklog,
  removeAutomationOpportunity,
  removeDiscoveryArea,
  removeDiscoverySystem,
  removeProcessSheet,
  saveAreaScriptAnswer,
  suggestSolutionTypeForProcess,
  updateAutomationOpportunity,
  updateChecklistItem,
  updateDiscoveryArea,
  updateDiscoveryPremises,
  updateDiscoverySystem,
  updateProcessSheet,
  validatePremisesWeights
} from '../services/automationDiscoveryService';
import { callAI } from '../services/aiClient';
import { evaluateOpportunityWithJev, type JevOpportunityVerdict } from '../services/jevDecisionService';
import { storageService } from '../services/storageService';
import type { Proposal } from '../services/backlogProposals';
import type {
  AutomationDiscoveryData,
  CandidateSolutionType,
  ChecklistItemStatus,
  ChecklistPhase,
  DiscoveryAreaStatus,
  DiscoveryProject,
  MeetingSession,
  OpportunityStatus,
  ProcessFrequency,
  RoadmapWave,
  SystemCategory,
  YesPartialNo
} from '../types/discovery';

export type DiscoverySubTab =
  | 'capa'
  | 'checklist'
  | 'areas'
  | 'roteiro'
  | 'processos'
  | 'inventario'
  | 'sistemas'
  | 'oportunidades'
  | 'readout';

interface AutomationDiscoveryViewProps {
  project: DiscoveryProject;
  activeSession?: MeetingSession;
  onSaveAutomationDiscovery: (nextData: AutomationDiscoveryData) => void;
  onProposeToBacklog?: (proposals: Proposal[]) => void;
  onNotify?: (type: 'error' | 'info' | 'success', text: string) => void;
}

const brl = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const SCORE_SCALES_GUIDE: { title: string; items: string[] }[] = [
  {
    title: 'Impacto (40% do score)',
    items: [
      '1 = menos de 10 h/mês liberadas, dor baixa',
      '2 = 10 a 25 h/mês ou melhoria local',
      '3 = 25 a 60 h/mês ou redução visível de retrabalho',
      '4 = 60 a 120 h/mês ou impacto direto em indicador da área',
      '5 = mais de 120 h/mês ou impacto direto em receita, margem, perda ou risco crítico'
    ]
  },
  {
    title: 'Esforço (25%, invertido: menor é melhor)',
    items: [
      '1 = até 1 semana; 1 sistema ou planilha; regra pronta',
      '2 = 1 a 2 semanas; integração simples; pouca mudança de rotina',
      '3 = 3 a 4 semanas; 2 sistemas; exige validação e treino',
      '4 = 1 a 2 meses; múltiplos sistemas ou TI externa',
      '5 = mais de 2 meses; mudança profunda de sistema ou processo'
    ]
  },
  {
    title: 'Risco (15%, invertido: menor é melhor)',
    items: [
      '1 = interno, reversível, sem dado pessoal nem dinheiro',
      '2 = erro fácil de detectar antes de sair para fora',
      '3 = afeta operação interna se falhar, mas há revisão humana',
      '4 = envolve cliente, fornecedor, preço ou dado pessoal',
      '5 = risco fiscal, jurídico, financeiro alto ou imagem da marca'
    ]
  },
  {
    title: 'Dados prontos (20% do score)',
    items: [
      '1 = dado em papel, áudio ou conversa sem registro',
      '2 = PDF, imagem ou WhatsApp sem padrão',
      '3 = planilhas com padrão razoável',
      '4 = sistema com exportação ou relatório confiável',
      '5 = sistema com API ou banco acessível e dado limpo'
    ]
  }
];

export const AutomationDiscoveryView: React.FC<AutomationDiscoveryViewProps> = ({
  project,
  activeSession,
  onSaveAutomationDiscovery,
  onProposeToBacklog,
  onNotify
}) => {
  const data = useMemo(() => ensureAutomationDiscovery(project), [project]);
  const summary = useMemo(() => computeDiscoverySummary(data), [data]);
  const inventoryRows = useMemo(
    () => data.processes.map(p => computeProcessInventoryRow(p, data.premises)),
    [data.processes, data.premises]
  );
  const opportunityRows = useMemo(() => computeOpportunitiesTable(data), [data]);
  const qualityChecklist = useMemo(() => evaluateReadoutQualityChecklist(data), [data]);
  const weightsValidation = useMemo(() => validatePremisesWeights(data.premises), [data.premises]);

  const [activeTab, setActiveTab] = useState<DiscoverySubTab>('capa');
  const [checklistPhaseFilter, setChecklistPhaseFilter] = useState<'Todas' | ChecklistPhase>('Todas');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => data.areas[0]?.id ?? '');
  const [selectedProcessId, setSelectedProcessId] = useState<string>(() => data.processes[0]?.id ?? '');
  const [inventoryAreaFilter, setInventoryAreaFilter] = useState<string>('Todas');
  const [inventorySolutionFilter, setInventorySolutionFilter] = useState<string>('Todas');
  const [isExtractingFromSession, setIsExtractingFromSession] = useState(false);
  const [jevBusyId, setJevBusyId] = useState<string | null>(null);
  const [jevVerdicts, setJevVerdicts] = useState<Record<string, JevOpportunityVerdict>>({});

  // Formulários rápidos de adição
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaManager, setNewAreaManager] = useState('');
  const [newSystemName, setNewSystemName] = useState('');
  const [newSystemType, setNewSystemType] = useState<SystemCategory>('ERP');
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppProcessId, setNewOppProcessId] = useState('');

  const effectiveSelectedAreaId =
    data.areas.find(a => a.id === selectedAreaId)?.id ?? data.areas[0]?.id ?? '';
  const effectiveSelectedProcess =
    data.processes.find(p => p.id === selectedProcessId) ?? data.processes[0] ?? null;

  const commit = (next: AutomationDiscoveryData) => {
    onSaveAutomationDiscovery(next);
  };

  const handleExtractFromTranscript = async () => {
    const targetSession = activeSession ?? project.sessions[0];
    if (!targetSession || targetSession.rawTranscript.length === 0) {
      onNotify?.('info', 'Selecione ou grave uma sessão com transcrição na Sala ao Vivo primeiro.');
      return;
    }

    setIsExtractingFromSession(true);
    try {
      const apiKey = storageService.getApiKey();
      const provider = storageService.getAiProvider();
      const model = storageService.getModel();

      const caller = apiKey
        ? (sys: string, usr: string, temp?: number) =>
            callAI({ provider, apiKey, model, systemPrompt: sys, userPrompt: usr, temperature: temp })
        : undefined;

      const res = caller
        ? await extractAutomationDiscoveryWithAI(data, targetSession, caller)
        : extractAutomationDiscoveryOffline(data, targetSession);

      commit(res.data);
      onNotify?.(
        'success',
        `Planilha preenchida (${res.source === 'ai' ? 'IA' : 'Regras locais'}): +${res.addedProcesses} processo(s), +${res.addedSystems} sistema(s), +${res.addedOpportunities} oportunidade(s).`
      );
    } finally {
      setIsExtractingFromSession(false);
    }
  };

  const handleDownloadReadoutMarkdown = () => {
    const md = generateExecutiveReadoutMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `readout-executivo-${(data.premises.clientName || project.name).toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('success', 'Relatório Executivo de Readout (.md) exportado.');
  };

  const handleDownloadInventoryCsv = () => {
    const csv = exportProcessesInventoryToCsv(data);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-processos-${(data.premises.clientName || project.name).toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('success', 'Inventário de Processos (.csv para Excel) exportado.');
  };

  const handleSendOpportunitiesToBacklog = () => {
    const proposals = proposeAutomationOpportunitiesToBacklog(project, data);
    if (proposals.length === 0) {
      onNotify?.('info', 'Cadastre ao menos uma oportunidade ativa antes de enviar para o Backlog.');
      return;
    }
    onProposeToBacklog?.(proposals);
    onNotify?.('success', `${proposals.length} proposta(s) gerada(s) para revisão no Backlog!`);
  };

  const handleRunJevOnOpportunity = async (oppId: string) => {
    const opp = data.opportunities.find(o => o.id === oppId);
    if (!opp) return;
    const proc = data.processes.find(p => p.id === opp.processId);

    setJevBusyId(oppId);
    try {
      const apiKey = storageService.getApiKey();
      const provider = storageService.getAiProvider();
      const model = storageService.getModel();

      const caller = apiKey
        ? (sys: string, usr: string, temp?: number) =>
            callAI({ provider, apiKey, model, systemPrompt: sys, userPrompt: usr, temperature: temp })
        : undefined;

      const verdict = await evaluateOpportunityWithJev(
        opp,
        proc,
        data.premises.loadedHourlyCost,
        caller
      );
      setJevVerdicts(prev => ({ ...prev, [oppId]: verdict }));

      commit(
        updateAutomationOpportunity(data, oppId, {
          solutionType: verdict.solutionChoice.choice,
          impact: verdict.impactScore.score,
          effort: verdict.effortScore.score,
          risk: verdict.riskScore.score,
          dataReadiness: verdict.dataReadinessScore.score,
          roadmapWave: verdict.waveChoice.choice
        })
      );

      onNotify?.(
        'success',
        `Jev (${verdict.source === 'ai' ? 'IA' : 'System-One Local'} · ${Math.round(verdict.overallConfidence * 100)}% conf.): ${verdict.goVerdict.answer.toUpperCase()} — Onda ${verdict.waveChoice.choice}.`
      );
    } finally {
      setJevBusyId(null);
    }
  };

  const handleRunJevBatch = async () => {
    const activeOpps = data.opportunities.filter(o => o.status !== 'Descartada');
    if (activeOpps.length === 0) {
      onNotify?.('info', 'Nenhuma oportunidade ativa para decidir com Jev.');
      return;
    }

    setJevBusyId('batch');
    try {
      const apiKey = storageService.getApiKey();
      const provider = storageService.getAiProvider();
      const model = storageService.getModel();

      const caller = apiKey
        ? (sys: string, usr: string, temp?: number) =>
            callAI({ provider, apiKey, model, systemPrompt: sys, userPrompt: usr, temperature: temp })
        : undefined;

      let nextData = data;
      const nextVerdicts: Record<string, JevOpportunityVerdict> = { ...jevVerdicts };

      for (const opp of activeOpps) {
        const proc = nextData.processes.find(p => p.id === opp.processId);
        const verdict = await evaluateOpportunityWithJev(
          opp,
          proc,
          nextData.premises.loadedHourlyCost,
          caller
        );
        nextVerdicts[opp.id] = verdict;
        nextData = updateAutomationOpportunity(nextData, opp.id, {
          solutionType: verdict.solutionChoice.choice,
          impact: verdict.impactScore.score,
          effort: verdict.effortScore.score,
          risk: verdict.riskScore.score,
          dataReadiness: verdict.dataReadinessScore.score,
          roadmapWave: verdict.waveChoice.choice
        });
      }

      setJevVerdicts(nextVerdicts);
      commit(nextData);
      onNotify?.(
        'success',
        `Jev em lote concluído: ${activeOpps.length} oportunidade(s) calibrada(s) com notas, solução e onda!`
      );
    } finally {
      setJevBusyId(null);
    }
  };

  const subTabs: { id: DiscoverySubTab; label: string; badge?: string; icon: React.ReactNode }[] = [
    { id: 'capa', label: '1. Capa & Premissas', icon: <FileSpreadsheet size={15} /> },
    {
      id: 'checklist',
      label: '2. Checklist (17)',
      badge: `${data.checklist.filter(i => i.status === 'Feito').length}/17`,
      icon: <ClipboardCheck size={15} />
    },
    {
      id: 'areas',
      label: '3. Ficha da Área',
      badge: `${data.areas.length}`,
      icon: <Building2 size={15} />
    },
    { id: 'roteiro', label: '4. Roteiro 2h (40)', icon: <Clock size={15} /> },
    {
      id: 'processos',
      label: '5. Processos (22)',
      badge: `${data.processes.length}`,
      icon: <Workflow size={15} />
    },
    {
      id: 'inventario',
      label: '6. Inventário',
      badge: `${Math.round(summary.totalMappedHoursPerMonth)}h`,
      icon: <Layers size={15} />
    },
    {
      id: 'sistemas',
      label: '7. Sistemas & LGPD',
      badge: `${data.systems.length}`,
      icon: <Database size={15} />
    },
    {
      id: 'oportunidades',
      label: '8. Oportunidades',
      badge: `${summary.activeOpportunitiesCount}`,
      icon: <Bot size={15} />
    },
    {
      id: 'readout',
      label: '9. Priorização & Readout',
      badge: `${qualityChecklist.filter(c => c.passed).length}/12`,
      icon: <TrendingUp size={15} />
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Cabeçalho Principal + Botão de Preenchimento por Transcrição */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles size={13} />
            METODOLOGIA DISCOVERY DE IA E AUTOMAÇÃO (3 SEMANAS · 10 ABAS)
          </div>
          <h1 className="text-2xl font-bold text-white">
            Discovery de IA & Automação — {data.premises.clientName || project.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Mapeie processos com os 4 números obrigatórios, avalie sistemas/LGPD, calcule capacidade liberada e gere o Readout Executivo de 90 dias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExtractFromTranscript}
            disabled={isExtractingFromSession}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            <Sparkles size={15} />
            {isExtractingFromSession
              ? 'Extraindo da transcrição...'
              : 'Preencher da Transcrição (Sala ao Vivo)'}
          </button>
          <button
            type="button"
            onClick={handleDownloadInventoryCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadReadoutMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
          >
            <FileText size={14} />
            Exportar Readout (.md)
          </button>
        </div>
      </div>

      {/* KPIs Rápidos no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Áreas (Realizadas / Escopo)</div>
          <div className="text-xl font-bold text-white mt-1">
            {summary.interviewedAreasCount} / {summary.scopedAreasCount}
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Processos Mapeados</div>
          <div className="text-xl font-bold text-white mt-1">
            {summary.mappedProcessesCount}{' '}
            <span className="text-xs font-normal text-slate-400">
              ({Math.round(summary.totalMappedHoursPerMonth)} h/mês)
            </span>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Oportunidades Ativas</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">
            {summary.activeOpportunitiesCount}{' '}
            <span className="text-xs font-normal text-emerald-400">
              ({summary.quickWinsCount} Quick Wins)
            </span>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Capacidade Liberável</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {Math.round(summary.totalReleasedHoursPerMonth)} h/mês{' '}
            <span className="text-xs font-normal text-slate-400">
              ({summary.equivalentFteReleased.toFixed(1)} FTE)
            </span>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Ganho Anual Estimado</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {brl(summary.totalEstimatedAnnualGain)}
          </div>
        </div>
      </div>

      {/* Navegação das 9 Abas Operacionais */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/70 p-2 rounded-xl border border-slate-800">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === tab.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ABA 1: CAPA & PREMISSAS */}
      {activeTab === 'capa' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Dados e Premissas do Discovery</h2>
            <p className="text-xs text-slate-400">
              Estes parâmetros alimentam todas as fórmulas de custo mensal, ganho anual, score ponderado e quadrantes da matriz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Empresa / Cliente</label>
                <input
                  type="text"
                  aria-label="Empresa / Cliente"
                  value={data.premises.clientName}
                  onChange={e => commit(updateDiscoveryPremises(data, { clientName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex.: Grupo Varejo S.A."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Período do Discovery</label>
                <input
                  type="text"
                  aria-label="Período do Discovery"
                  value={data.premises.discoveryPeriod}
                  onChange={e => commit(updateDiscoveryPremises(data, { discoveryPeriod: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex.: Nov/2026 (3 semanas)"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Consultor(es) Responsável(is)</label>
                <input
                  type="text"
                  aria-label="Consultor Responsável"
                  value={data.premises.consultant}
                  onChange={e => commit(updateDiscoveryPremises(data, { consultant: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Nome do consultor ou equipe"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Custo-hora médio carregado (R$)
                </label>
                <input
                  type="number"
                  min={1}
                  aria-label="Custo-hora médio carregado"
                  value={data.premises.loadedHourlyCost}
                  onChange={e =>
                    commit(
                      updateDiscoveryPremises(data, {
                        loadedHourlyCost: Math.max(1, Number(e.target.value) || 0)
                      })
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Fonte / observação do custo-hora (obrigatório antes do Readout)
              </label>
              <input
                type="text"
                aria-label="Fonte do custo-hora"
                value={data.premises.hourlyCostSource}
                onChange={e => commit(updateDiscoveryPremises(data, { hourlyCostSource: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Ex.: Informado pelo RH (salário médio + encargos ÷ 176h)"
              />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Pesos do Score e Cortes da Matriz</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  weightsValidation.isValid
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {weightsValidation.message}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Peso — Impacto no negócio (padrão 0.40)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={data.premises.weightImpact}
                  onChange={e =>
                    commit(updateDiscoveryPremises(data, { weightImpact: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Peso — Dados prontos (padrão 0.20)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={data.premises.weightDataReadiness}
                  onChange={e =>
                    commit(
                      updateDiscoveryPremises(data, { weightDataReadiness: Number(e.target.value) || 0 })
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Peso — Facilidade / 6 - Esforço (padrão 0.25)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={data.premises.weightEffort}
                  onChange={e =>
                    commit(updateDiscoveryPremises(data, { weightEffort: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Peso — Segurança / 6 - Risco (padrão 0.15)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={data.premises.weightRisk}
                  onChange={e =>
                    commit(updateDiscoveryPremises(data, { weightRisk: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Corte de Alto Impacto (nota &gt;= X, padrão 4)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={data.premises.highImpactCutoff}
                  onChange={e =>
                    commit(
                      updateDiscoveryPremises(data, {
                        highImpactCutoff: Math.min(5, Math.max(1, Number(e.target.value) || 4))
                      })
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Corte de Baixo Esforço (nota &lt;= X, padrão 2)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={data.premises.lowEffortCutoff}
                  onChange={e =>
                    commit(
                      updateDiscoveryPremises(data, {
                        lowEffortCutoff: Math.min(5, Math.max(1, Number(e.target.value) || 2))
                      })
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CHECKLIST DA ENTREVISTA (17 ITENS) */}
      {activeTab === 'checklist' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Checklist da Entrevista — Antes (1–7), Durante (8–12) e Depois (13–17)
              </h2>
              <p className="text-xs text-slate-400">
                Concluídos: {data.checklist.filter(i => i.status === 'Feito').length} de {DEFAULT_INTERVIEW_CHECKLIST.length} itens
              </p>
            </div>
            <div className="flex gap-1.5">
              {(['Todas', 'Antes', 'Durante', 'Depois'] as const).map(phase => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setChecklistPhaseFilter(phase)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    checklistPhaseFilter === phase
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {data.checklist
              .filter(item => checklistPhaseFilter === 'Todas' || item.phase === checklistPhaseFilter)
              .map(item => (
                <div
                  key={item.number}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300">
                        #{item.number} · {item.phase}
                      </span>
                      <span className="text-sm font-semibold text-white">{item.item}</span>
                    </div>
                    <p className="text-xs text-slate-400">{item.why}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Responsável"
                      value={item.owner}
                      onChange={e =>
                        commit(updateChecklistItem(data, item.number, { owner: e.target.value }))
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-32"
                    />
                    <select
                      aria-label={`Status do item ${item.number}`}
                      value={item.status}
                      onChange={e =>
                        commit(
                          updateChecklistItem(data, item.number, {
                            status: e.target.value as ChecklistItemStatus
                          })
                        )
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Feito">Feito</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ABA 3: FICHA DA ÁREA */}
      {activeTab === 'areas' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Cadastrar Área no Escopo do Discovery</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Nome da área (ex.: Comercial / Compras, Financeiro)"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                className="flex-1 min-w-[220px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Gestor entrevistado"
                value={newAreaManager}
                onChange={e => setNewAreaManager(e.target.value)}
                className="w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newAreaName.trim()) return;
                  const next = addDiscoveryArea(data, {
                    name: newAreaName,
                    managerName: newAreaManager
                  });
                  commit(next);
                  setSelectedAreaId(next.areas[next.areas.length - 1].id);
                  setNewAreaName('');
                  setNewAreaManager('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Plus size={15} />
                Adicionar Área
              </button>
            </div>
          </div>

          {data.areas.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Nenhuma área cadastrada ainda. Adicione a primeira área acima para habilitar o Roteiro de 2h e as Fichas de Processo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {data.areas.map(area => (
                <div
                  key={area.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white">{area.name}</h3>
                      <select
                        aria-label={`Status da área ${area.name}`}
                        value={area.status}
                        onChange={e =>
                          commit(
                            updateDiscoveryArea(data, area.id, {
                              status: e.target.value as DiscoveryAreaStatus
                            })
                          )
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-300"
                      >
                        <option value="A agendar">A agendar</option>
                        <option value="Agendada">Agendada</option>
                        <option value="Realizada">Realizada</option>
                        <option value="Consolidada">Consolidada</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => commit(removeDiscoveryArea(data, area.id))}
                      className="text-slate-400 hover:text-rose-400 p-1"
                      title="Remover área"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Gestor Entrevistado</label>
                      <input
                        type="text"
                        value={area.managerName}
                        onChange={e =>
                          commit(updateDiscoveryArea(data, area.id, { managerName: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cargo</label>
                      <input
                        type="text"
                        value={area.role}
                        onChange={e =>
                          commit(updateDiscoveryArea(data, area.id, { role: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Sponsor Executivo</label>
                      <input
                        type="text"
                        value={area.executiveSponsor}
                        onChange={e =>
                          commit(
                            updateDiscoveryArea(data, area.id, { executiveSponsor: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Tamanho do time (pessoas)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={area.headcount}
                        onChange={e =>
                          commit(
                            updateDiscoveryArea(data, area.id, {
                              headcount: Number(e.target.value) || 0
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Principais KPIs da área (3 a 5)
                      </label>
                      <input
                        type="text"
                        value={area.mainKpis}
                        onChange={e =>
                          commit(updateDiscoveryArea(data, area.id, { mainKpis: e.target.value }))
                        }
                        placeholder="Ex.: Margem bruta, ruptura, SLA de fechamento"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Principal dor declarada pelo gestor
                      </label>
                      <input
                        type="text"
                        value={area.declaredPain}
                        onChange={e =>
                          commit(updateDiscoveryArea(data, area.id, { declaredPain: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Observações / 3 hipóteses pré-entrevista
                      </label>
                      <input
                        type="text"
                        value={area.notes}
                        onChange={e =>
                          commit(updateDiscoveryArea(data, area.id, { notes: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: ROTEIRO DE 2 HORAS POR ÁREA (40 PERGUNTAS EM 8 BLOCOS) */}
      {activeTab === 'roteiro' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Roteiro de Entrevista de 2 Horas por Área (8 Blocos · 40 Perguntas)
              </h2>
              <p className="text-xs text-slate-400">
                Selecione a área abaixo para registrar ou consultar as anotações de cada pergunta.
              </p>
            </div>
            {data.areas.length > 0 && (
              <select
                aria-label="Selecionar área do roteiro"
                value={effectiveSelectedAreaId}
                onChange={e => setSelectedAreaId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white"
              >
                {data.areas.map(a => (
                  <option key={a.id} value={a.id}>
                    Área: {a.name} ({a.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {!effectiveSelectedAreaId ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Cadastre ao menos uma área na aba "3. Ficha da Área" para anotar as respostas do roteiro de 2 horas.
            </div>
          ) : (
            <div className="space-y-4">
              {INTERVIEW_SCRIPT_40_QUESTIONS.map(q => {
                const answer = data.scriptAnswersByArea[effectiveSelectedAreaId]?.[q.number] ?? '';
                return (
                  <div
                    key={q.number}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-indigo-300">
                        {q.blockTitle} ({q.blockMinutes} min) · Pergunta {q.number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        Alimenta: {q.feedsTab}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">{q.question}</p>
                    <div className="text-xs text-slate-400">
                      <strong>O que buscar:</strong> {q.whatToLookFor} · <strong>Sondagem:</strong>{' '}
                      <em>{q.probing}</em>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Anotações da entrevista..."
                      value={answer}
                      onChange={e =>
                        commit(
                          saveAreaScriptAnswer(
                            data,
                            effectiveSelectedAreaId,
                            q.number,
                            e.target.value
                          )
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 5: FICHAS DE PROCESSO (22 PERGUNTAS + OS 4 NÚMEROS OBRIGATÓRIOS) */}
      {activeTab === 'processos' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {data.processes.map(proc => {
                const row = computeProcessInventoryRow(proc, data.premises);
                return (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => setSelectedProcessId(proc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      effectiveSelectedProcess?.id === proc.id
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {proc.id}: {proc.name || '(Sem nome)'}{' '}
                    <span className="ml-1 text-[10px] opacity-80">
                      ({row.hasFourGoldenNumbers ? '4 números ok' : 'faltam números'})
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = addProcessSheet(data, {
                  area: data.areas[0]?.name ?? ''
                });
                commit(next);
                setSelectedProcessId(next.processes[next.processes.length - 1].id);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Plus size={15} />
              Nova Ficha de Processo ({`P-${String(data.processes.length + 1).padStart(2, '0')}`})
            </button>
          </div>

          {!effectiveSelectedProcess ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Nenhuma ficha de processo aberta. Clique em "Nova Ficha de Processo" acima ou extraia direto da transcrição da Sala ao Vivo.
            </div>
          ) : (
            (() => {
              const proc = effectiveSelectedProcess;
              const row = computeProcessInventoryRow(proc, data.premises);
              return (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                          PROCESSO {proc.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                            row.hasFourGoldenNumbers
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {row.headerBadge}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {proc.name || 'Preencha o nome do processo (verbo + objeto)'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Horas/mês · Custo mensal</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {row.hoursPerMonth.toFixed(1)} h/mês · {brl(row.monthlyCost)}/mês
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = suggestSolutionTypeForProcess(proc);
                          const next = addAutomationOpportunity(data, {
                            title: `${suggested} para ${proc.name || proc.id} (com revisão humana nas exceções)`,
                            processId: proc.id,
                            solutionType: suggested,
                            automatizableFraction: 0.65
                          });
                          commit(next);
                          onNotify?.('success', `Oportunidade criada para o processo ${proc.id}.`);
                        }}
                        className="px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                      >
                        + Criar Oportunidade deste Processo
                      </button>
                      <button
                        type="button"
                        onClick={() => commit(removeProcessSheet(data, proc.id))}
                        className="text-slate-400 hover:text-rose-400 p-2"
                        title="Remover processo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {row.exceedsMonthlyWorkdayLimit && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>
                        Alerta de sanidade de jornada: este processo consome{' '}
                        <strong>{Math.round(row.hoursPerPersonPerMonth)} h/mês por pessoa</strong>{' '}
                        (acima de 176h mensais). Confira o volume mensal (Q8), os minutos no caso padrão (Q9) ou a quantidade de pessoas (Q10).
                      </span>
                    </div>
                  )}

                  {/* As 22 perguntas da Ficha de Processo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        1. Área ({PROCESS_SHEET_22_QUESTIONS[0].tip})
                      </label>
                      <input
                        type="text"
                        value={proc.area}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { area: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        2. Nome do processo (verbo + objeto)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: Conciliar notas fiscais de mercadoria"
                        value={proc.name}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { name: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        3. O que dispara o processo? (gatilho)
                      </label>
                      <input
                        type="text"
                        value={proc.trigger}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { trigger: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        4. Quais são as etapas principais? (3 a 6 passos)
                      </label>
                      <input
                        type="text"
                        value={proc.mainSteps}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { mainSteps: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        5. Qual é a entrega final?
                      </label>
                      <input
                        type="text"
                        value={proc.finalDeliverable}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, { finalDeliverable: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        6. Quem é o dono do processo? (cargo, não nome)
                      </label>
                      <input
                        type="text"
                        value={proc.ownerRole}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { ownerRole: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        7. Qual é a frequência?
                      </label>
                      <select
                        value={proc.frequency}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              frequency: e.target.value as ProcessFrequency
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="Diária">Diária</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                        <option value="Por evento">Por evento</option>
                      </select>
                    </div>

                    {/* OS 4 NÚMEROS OBRIGATÓRIOS (Q8, Q9, Q10, Q11) */}
                    <div>
                      <label className="block text-xs text-amber-300 font-bold mb-1">
                        8. [NÚMERO 1/4] Quantas vezes roda por mês? (volume mensal)
                      </label>
                      <input
                        type="number"
                        min={0}
                        aria-label="Volume mensal"
                        value={proc.monthlyVolume ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              monthlyVolume:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-amber-300 font-bold mb-1">
                        9. [NÚMERO 2/4] Quantos minutos leva uma execução no caso padrão?
                      </label>
                      <input
                        type="number"
                        min={0}
                        aria-label="Minutos no caso padrão"
                        value={proc.standardMinutes ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              standardMinutes:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-amber-300 font-bold mb-1">
                        10. [NÚMERO 3/4] Quantas pessoas executam esse processo?
                      </label>
                      <input
                        type="number"
                        min={0}
                        aria-label="Pessoas envolvidas"
                        value={proc.peopleInvolved ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              peopleInvolved:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-amber-300 font-bold mb-1">
                        11. [NÚMERO 4/4] Que % dos casos vira exceção? (fração 0 a 1, ex.: 0.2 = 20%)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        aria-label="Taxa de exceção"
                        value={proc.exceptionRate ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              exceptionRate:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        12. Quantos minutos leva um caso com exceção?
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={proc.exceptionMinutes ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              exceptionMinutes:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        13. Quais sistemas o processo usa?
                      </label>
                      <input
                        type="text"
                        value={proc.systemsUsed}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { systemsUsed: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        14. De onde vêm os dados e em que formato?
                      </label>
                      <input
                        type="text"
                        value={proc.dataInputFormat}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, { dataInputFormat: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        15. Os dados já estão estruturados (campos fixos)?
                      </label>
                      <select
                        value={proc.structuredData}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              structuredData: e.target.value as YesPartialNo
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="Sim">Sim</option>
                        <option value="Parcial">Parcial</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        16. As regras de decisão são claras e documentadas?
                      </label>
                      <select
                        value={proc.documentedRules}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              documentedRules: e.target.value as YesPartialNo
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="Sim">Sim</option>
                        <option value="Parcial">Parcial</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        17. Onde o processo trava ou espera alguém? (gargalos)
                      </label>
                      <input
                        type="text"
                        value={proc.bottlenecks}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { bottlenecks: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        18. O que acontece quando dá erro? Qual é o impacto?
                      </label>
                      <input
                        type="text"
                        value={proc.errorImpact}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { errorImpact: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        19. Qual é a dor, nas palavras do time? (frase literal)
                      </label>
                      <input
                        type="text"
                        value={proc.literalPainQuote}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, { literalPainQuote: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        20. Tem pico ou sazonalidade?
                      </label>
                      <input
                        type="text"
                        value={proc.seasonality}
                        onChange={e =>
                          commit(updateProcessSheet(data, proc.id, { seasonality: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        21. Custo-hora diferente da Capa (R$)? (opcional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder={`Padrão da Capa: R$ ${data.premises.loadedHourlyCost}/h`}
                        value={proc.customHourlyCost ?? ''}
                        onChange={e =>
                          commit(
                            updateProcessSheet(data, proc.id, {
                              customHourlyCost:
                                e.target.value === '' ? undefined : Number(e.target.value)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        22. Qual tipo de solução parece mais adequado?
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={proc.candidateSolution}
                          onChange={e =>
                            commit(
                              updateProcessSheet(data, proc.id, {
                                candidateSolution: e.target.value as CandidateSolutionType
                              })
                            )
                          }
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                        >
                          <option value="Automação n8n">Automação n8n</option>
                          <option value="Agente de IA">Agente de IA</option>
                          <option value="Assistente Claude">Assistente Claude</option>
                          <option value="Analytics / BI">Analytics / BI</option>
                          <option value="Redesenho de processo">Redesenho de processo</option>
                          <option value="Não se aplica">Não se aplica</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            commit(
                              updateProcessSheet(data, proc.id, {
                                candidateSolution: suggestSolutionTypeForProcess(proc)
                              })
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-indigo-300"
                        >
                          Sugerir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ABA 6: INVENTÁRIO DE PROCESSOS (TABELA AUTOMÁTICA COM FILTROS) */}
      {activeTab === 'inventario' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Inventário Consolidado de Processos (Calculado Automaticamente)
              </h2>
              <p className="text-xs text-slate-400">
                Fórmula conservadora: Horas/mês = (Volume mensal × Minutos no caso padrão) ÷ 60.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={inventoryAreaFilter}
                onChange={e => setInventoryAreaFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="Todas">Todas as áreas</option>
                {Array.from(new Set(data.processes.map(p => p.area).filter(Boolean))).map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={inventorySolutionFilter}
                onChange={e => setInventorySolutionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="Todas">Todas as soluções</option>
                <option value="Automação n8n">Automação n8n</option>
                <option value="Agente de IA">Agente de IA</option>
                <option value="Assistente Claude">Assistente Claude</option>
                <option value="Analytics / BI">Analytics / BI</option>
                <option value="Redesenho de processo">Redesenho de processo</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-2">ID</th>
                  <th className="py-2.5 px-2">Área</th>
                  <th className="py-2.5 px-2">Processo</th>
                  <th className="py-2.5 px-2">Vol/mês</th>
                  <th className="py-2.5 px-2">Min</th>
                  <th className="py-2.5 px-2">Pessoas</th>
                  <th className="py-2.5 px-2">Horas/mês</th>
                  <th className="py-2.5 px-2">Custo mensal</th>
                  <th className="py-2.5 px-2">Solução candidata</th>
                  <th className="py-2.5 px-2">Status 4 números</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows
                  .filter(
                    r =>
                      (inventoryAreaFilter === 'Todas' || r.process.area === inventoryAreaFilter) &&
                      (inventorySolutionFilter === 'Todas' ||
                        r.process.candidateSolution === inventorySolutionFilter)
                  )
                  .map(r => (
                    <tr key={r.process.id} className="border-b border-slate-800/60 hover:bg-slate-950/60">
                      <td className="py-2.5 px-2 font-bold text-indigo-300">{r.process.id}</td>
                      <td className="py-2.5 px-2 text-slate-300">{r.process.area}</td>
                      <td className="py-2.5 px-2 font-medium text-white">{r.process.name}</td>
                      <td className="py-2.5 px-2">{r.process.monthlyVolume ?? '—'}</td>
                      <td className="py-2.5 px-2">{r.process.standardMinutes ?? '—'}</td>
                      <td className="py-2.5 px-2">{r.process.peopleInvolved ?? '—'}</td>
                      <td className="py-2.5 px-2 font-bold text-emerald-400">
                        {r.hoursPerMonth.toFixed(1)} h
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-amber-300">
                        {brl(r.monthlyCost)}
                      </td>
                      <td className="py-2.5 px-2">{r.process.candidateSolution}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.hasFourGoldenNumbers
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {r.hasFourGoldenNumbers ? '4 números ok' : 'faltam números'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 7: SISTEMAS E DADOS (LGPD) */}
      {activeTab === 'sistemas' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Mapa de Sistemas, Integrações e LGPD</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Nome do sistema (ex.: ERP Consinco, SAP, WMS, Planilha de Metas, WhatsApp)"
                value={newSystemName}
                onChange={e => setNewSystemName(e.target.value)}
                className="flex-1 min-w-[240px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
              <select
                value={newSystemType}
                onChange={e => setNewSystemType(e.target.value as SystemCategory)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="ERP">ERP</option>
                <option value="WMS">WMS</option>
                <option value="PDV">PDV</option>
                <option value="CRM">CRM</option>
                <option value="BI">BI</option>
                <option value="Planilha">Planilha</option>
                <option value="Portal externo">Portal externo</option>
                <option value="Comunicação">Comunicação</option>
                <option value="RH">RH</option>
                <option value="Outro">Outro</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newSystemName.trim()) return;
                  commit(addDiscoverySystem(data, { name: newSystemName, type: newSystemType }));
                  setNewSystemName('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Plus size={15} />
                Adicionar Sistema
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {data.systems.map(sys => (
              <div
                key={sys.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-center"
              >
                <div>
                  <label className="block text-[10px] text-slate-400">Sistema ({sys.type})</label>
                  <input
                    type="text"
                    value={sys.name}
                    onChange={e =>
                      commit(updateDiscoverySystem(data, sys.id, { name: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Áreas que usam</label>
                  <input
                    type="text"
                    value={sys.areasUsing}
                    onChange={e =>
                      commit(updateDiscoverySystem(data, sys.id, { areasUsing: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Tem API / Integração?</label>
                  <select
                    value={sys.hasApi}
                    onChange={e =>
                      commit(
                        updateDiscoverySystem(data, sys.id, {
                          hasApi: e.target.value as 'Sim' | 'Não' | 'Não sei'
                        })
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                    <option value="Não sei">Não sei</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Qualidade dos dados (1–5)</label>
                  <select
                    value={sys.dataQuality}
                    onChange={e =>
                      commit(
                        updateDiscoverySystem(data, sys.id, {
                          dataQuality: Number(e.target.value) as 1 | 2 | 3 | 4 | 5
                        })
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>
                        Nota {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Dados pessoais (LGPD)?</label>
                  <select
                    value={sys.hasPersonalDataLgpd}
                    onChange={e =>
                      commit(
                        updateDiscoverySystem(data, sys.id, {
                          hasPersonalDataLgpd: e.target.value as 'Sim' | 'Não'
                        })
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim (Requer cautela LGPD)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400">Dono técnico / TI</label>
                    <input
                      type="text"
                      value={sys.technicalOwner}
                      onChange={e =>
                        commit(
                          updateDiscoverySystem(data, sys.id, { technicalOwner: e.target.value })
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => commit(removeDiscoverySystem(data, sys.id))}
                    className="text-slate-400 hover:text-rose-400 p-1.5 mt-4"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 8: OPORTUNIDADES (SCORE 1 A 5, QUADRANTE, GANHO ANUAL E PONTE COM BACKLOG) */}
      {activeTab === 'oportunidades' && (
        <div className="space-y-6">
          {/* Régua de Calibração de Notas 1 a 5 do Guia do Consultor */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {SCORE_SCALES_GUIDE.map(scale => (
              <div
                key={scale.title}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="text-xs font-bold text-indigo-300">{scale.title}</div>
                <ul className="text-[11px] text-slate-400 space-y-0.5">
                  {scale.items.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Descreva a oportunidade: o que faz, sobre qual processo e onde fica o controle humano"
              value={newOppTitle}
              onChange={e => setNewOppTitle(e.target.value)}
              className="flex-1 min-w-[260px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <select
              aria-label="Vincular processo à oportunidade"
              value={newOppProcessId || data.processes[0]?.id || ''}
              onChange={e => setNewOppProcessId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="">Selecione o Processo (P-XX)</option>
              {data.processes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name || '(Sem nome)'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const pid = newOppProcessId || data.processes[0]?.id;
                if (!newOppTitle.trim() || !pid) {
                  onNotify?.('info', 'Informe o título da oportunidade e selecione um processo P-XX.');
                  return;
                }
                commit(addAutomationOpportunity(data, { title: newOppTitle, processId: pid }));
                setNewOppTitle('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Plus size={15} />
              Adicionar Oportunidade
            </button>
            {data.opportunities.length > 0 && (
              <button
                type="button"
                disabled={jevBusyId !== null}
                onClick={handleRunJevBatch}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-200 text-xs font-semibold disabled:opacity-50"
              >
                <Sparkles size={14} />
                {jevBusyId === 'batch'
                  ? 'Jev decidindo lote...'
                  : 'Jev em Lote: Decidir Todas as Oportunidades'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {opportunityRows.map(row => {
              const opp = row.opportunity;
              return (
                <div
                  key={opp.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                        {opp.id}
                      </span>
                      {row.ranking !== null && (
                        <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
                          Ranking #{row.ranking} · Score {row.score?.toFixed(2)}
                        </span>
                      )}
                      {row.quadrant && (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                          {row.quadrant}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Processo: <strong>{opp.processId}</strong> ({row.processName || 'Sem vínculo'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-400">
                        Libera {row.releasedHoursPerMonth.toFixed(1)} h/mês ·{' '}
                        {brl(row.estimatedAnnualGain)}/ano
                      </span>
                      <button
                        type="button"
                        disabled={jevBusyId === opp.id}
                        onClick={() => handleRunJevOnOpportunity(opp.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold transition"
                        title="Jev (System One): decide tipo de solução (Choice), 4 notas de 1 a 5 (Score), Onda e Veredito GO/NO-GO (Noul) com grau de confiança"
                      >
                        <Sparkles size={12} />
                        {jevBusyId === opp.id ? 'Jev decidindo...' : 'Jev: Decidir Notas & Onda'}
                      </button>
                      <button
                        type="button"
                        onClick={() => commit(removeAutomationOpportunity(data, opp.id))}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {jevVerdicts[opp.id] && (
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-bold text-[10px]">
                          JEV SYSTEM-ONE ({jevVerdicts[opp.id].source === 'ai' ? 'IA' : 'LOCAL'})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            jevVerdicts[opp.id].goVerdict.answer === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : jevVerdicts[opp.id].goVerdict.answer === 'null'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          NOUL: {jevVerdicts[opp.id].goVerdict.answer.toUpperCase()} (
                          {Math.round(jevVerdicts[opp.id].overallConfidence * 100)}% conf.)
                        </span>
                        <span className="text-slate-300">
                          {jevVerdicts[opp.id].goVerdict.rationale}
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-300">
                        Choice: <strong>{jevVerdicts[opp.id].solutionChoice.choice}</strong> →{' '}
                        <strong>{jevVerdicts[opp.id].waveChoice.choice}</strong>
                      </span>
                    </div>
                  )}

                  {row.exceeds80PercentWarning && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      Atenção: % automatizável acima de 80% ({Math.round(opp.automatizableFraction * 100)}%). O Guia do Consultor recomenda usar no máximo 80% para manter números defensáveis perante a diretoria.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Oportunidade (o que faz + processo + controle humano)
                      </label>
                      <input
                        type="text"
                        value={opp.title}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, { title: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        % Automatizável (0 a 1, ex.: 0.70 = 70%)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={opp.automatizableFraction}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              automatizableFraction: Number(e.target.value) || 0
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* As 4 notas de 1 a 5 + Onda + Status */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Impacto (1–5)</label>
                      <select
                        aria-label={`Impacto ${opp.id}`}
                        value={opp.impact ?? ''}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              impact:
                                e.target.value === ''
                                  ? undefined
                                  : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Esforço (1–5)</label>
                      <select
                        aria-label={`Esforço ${opp.id}`}
                        value={opp.effort ?? ''}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              effort:
                                e.target.value === ''
                                  ? undefined
                                  : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Risco (1–5)</label>
                      <select
                        aria-label={`Risco ${opp.id}`}
                        value={opp.risk ?? ''}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              risk:
                                e.target.value === ''
                                  ? undefined
                                  : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Dados prontos (1–5)
                      </label>
                      <select
                        aria-label={`Dados prontos ${opp.id}`}
                        value={opp.dataReadiness ?? ''}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              dataReadiness:
                                e.target.value === ''
                                  ? undefined
                                  : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Onda Roadmap</label>
                      <select
                        value={opp.roadmapWave}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              roadmapWave: e.target.value as RoadmapWave
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="0–30 dias">0–30 dias</option>
                        <option value="31–60 dias">31–60 dias</option>
                        <option value="61–90 dias">61–90 dias</option>
                        <option value="Backlog">Backlog</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                      <select
                        value={opp.status}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              status: e.target.value as OpportunityStatus
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Mapeada">Mapeada</option>
                        <option value="Validada com a área">Validada com a área</option>
                        <option value="Aprovada">Aprovada</option>
                        <option value="Descartada">Descartada</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Dono / Sponsor</label>
                      <input
                        type="text"
                        value={opp.ownerSponsor}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, {
                              ownerSponsor: e.target.value
                            })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Próximo passo</label>
                      <input
                        type="text"
                        value={opp.nextStep}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, { nextStep: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Outros ganhos</label>
                      <input
                        type="text"
                        value={opp.otherGains}
                        onChange={e =>
                          commit(
                            updateAutomationOpportunity(data, opp.id, { otherGains: e.target.value })
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 9: PRIORIZAÇÃO, RESUMO & READOUT EXECUTIVO (MATRIZ 2x2 + CHECKLIST DE 12 PONTOS) */}
      {activeTab === 'readout' && (
        <div className="space-y-6">
          {/* Matriz Impacto × Esforço (4 Quadrantes) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Matriz Impacto × Esforço e Roadmap de 90 Dias
                </h2>
                <p className="text-xs text-slate-400">
                  Oportunidades marcadas como "Descartada" são excluídas automaticamente dos cálculos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendOpportunitiesToBacklog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Target size={15} />
                Enviar Roadmap para Revisão no Backlog
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {summary.quadrants.map(q => (
                <div
                  key={q.quadrant}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1"
                >
                  <div className="text-xs font-bold text-indigo-300">{q.quadrant}</div>
                  <div className="text-xl font-bold text-white">
                    {q.count} op. · <span className="text-emerald-400">{brl(q.annualGain)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{q.meaning}</p>
                </div>
              ))}
            </div>

            {/* Resumo por Onda e por Tipo de Solução */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">
                  Roadmap de 90 Dias (Por Onda)
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-1.5 text-left">Onda</th>
                      <th className="py-1.5 text-right">Oportunidades</th>
                      <th className="py-1.5 text-right">Horas liberáveis/mês</th>
                      <th className="py-1.5 text-right">Ganho anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byWave.map(w => (
                      <tr key={w.wave} className="border-b border-slate-800/40">
                        <td className="py-1.5 font-semibold text-white">{w.wave}</td>
                        <td className="py-1.5 text-right">{w.opportunitiesCount}</td>
                        <td className="py-1.5 text-right text-emerald-400">
                          {Math.round(w.releasedHoursPerMonth)} h
                        </td>
                        <td className="py-1.5 text-right text-amber-300">
                          {brl(w.estimatedAnnualGain)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">
                  Por Tipo de Solução
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-1.5 text-left">Solução</th>
                      <th className="py-1.5 text-right">Oportunidades</th>
                      <th className="py-1.5 text-right">Horas liberáveis/mês</th>
                      <th className="py-1.5 text-right">Ganho anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bySolutionType.map(s => (
                      <tr key={s.solutionType} className="border-b border-slate-800/40">
                        <td className="py-1.5 font-semibold text-white">{s.solutionType}</td>
                        <td className="py-1.5 text-right">{s.opportunitiesCount}</td>
                        <td className="py-1.5 text-right text-emerald-400">
                          {Math.round(s.releasedHoursPerMonth)} h
                        </td>
                        <td className="py-1.5 text-right text-amber-300">
                          {brl(s.estimatedAnnualGain)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Checklist de Qualidade Pré-Readout (12 itens do Guia do Consultor) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ListChecks size={18} className="text-indigo-400" />
                  Checklist de Qualidade Antes do Readout Executivo (12 Verificações)
                </h2>
                <p className="text-xs text-slate-400">
                  Garante que nenhum número possa ser desmontado na apresentação para a diretoria.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white">
                {qualityChecklist.filter(c => c.passed).length} / 12 aprovados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {qualityChecklist.map(check => (
                <div
                  key={check.number}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    check.passed
                      ? 'bg-emerald-500/5 border-emerald-500/25 text-slate-200'
                      : 'bg-amber-500/5 border-amber-500/25 text-slate-200'
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {check.number}. {check.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
