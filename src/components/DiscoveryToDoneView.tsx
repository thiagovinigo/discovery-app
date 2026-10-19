import React, { useState } from 'react';
import { Epic, OKR, Feature, UserStory, DomainCategory, ChecklistItem, DiscoveryProject } from '../types/discovery';
import {
  Layers,
  Target,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Circle,
  FileSpreadsheet,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Tag,
  Quote,
  ExternalLink,
  Share2,
  GitBranch,
  Send,
  Shield,
  CreditCard,
  Rocket,
  Settings,
  X,
  Radio,
  FileText,
  Bot,
  FileCode,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportService } from '../services/exportService';

interface DiscoveryToDoneViewProps {
  okrs: OKR[];
  epics: Epic[];
  project?: DiscoveryProject;
  onGenerateBacklogWithAI: () => void;
  isGenerating: boolean;
  onUpdateTaskStatus: (epicId: string, featId: string, storyId: string, taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => void;
  onToggleChecklistItem?: (epicId: string, featId: string, storyId: string, type: 'dor' | 'dod', itemId: string) => void;
  onNavigateToLiveRoom?: () => void;
}

export const DiscoveryToDoneView: React.FC<DiscoveryToDoneViewProps> = ({
  okrs,
  epics,
  project,
  onGenerateBacklogWithAI,
  isGenerating,
  onUpdateTaskStatus,
  onToggleChecklistItem,
  onNavigateToLiveRoom
}) => {
  const [activeTab, setActiveTab] = useState<'epics' | 'okrs'>('epics');
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(epics[0]?.id || null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeExportTab, setActiveExportTab] = useState<'spec' | 'prd' | 'jira' | 'github' | 'linear'>('spec');
  const [copiedExportMsg, setCopiedExportMsg] = useState(false);

  // Local state for DoR and DoD toggles if callback is not passed
  const [localChecklists, setLocalChecklists] = useState<Record<string, { dor: ChecklistItem[]; dod: ChecklistItem[] }>>({});

  const handleFireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    onGenerateBacklogWithAI();
  };

  const getStoryChecklists = (us: UserStory) => {
    if (localChecklists[us.id]) {
      return localChecklists[us.id];
    }
    const defaultDor: ChecklistItem[] = us.dorChecklist || [
      { id: 'dor-1', label: 'Problema e persona claramente identificados', checked: true },
      { id: 'dor-2', label: 'Critérios de aceite em formato BDD Gherkin', checked: true },
      { id: 'dor-3', label: 'Dependências técnicas mapeadas', checked: true },
      { id: 'dor-4', label: `Estimativa de Story Points calibrada (${us.storyPoints || 3} pts)`, checked: true }
    ];

    const defaultDod: ChecklistItem[] = us.dodChecklist || [
      { id: 'dod-1', label: 'Testes unitários e de integração passando', checked: false },
      { id: 'dod-2', label: 'Revisão de código (PR) aprovada por pares', checked: false },
      { id: 'dod-3', label: 'Validação de critérios Gherkin em staging', checked: false },
      { id: 'dod-4', label: 'Documentação técnica de API e logs atualizada', checked: false }
    ];

    return { dor: defaultDor, dod: defaultDod };
  };

  const handleToggleChecklist = (epicId: string, featId: string, storyId: string, type: 'dor' | 'dod', itemId: string) => {
    if (onToggleChecklistItem) {
      onToggleChecklistItem(epicId, featId, storyId, type, itemId);
    }
    setLocalChecklists(prev => {
      const current = prev[storyId] || getStoryChecklists(
        epics.find(e => e.id === epicId)?.features.find(f => f.id === featId)?.userStories.find(s => s.id === storyId) as UserStory
      );
      const targetList = type === 'dor' ? [...current.dor] : [...current.dod];
      const itemIndex = targetList.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        targetList[itemIndex] = { ...targetList[itemIndex], checked: !targetList[itemIndex].checked };
      }
      return {
        ...prev,
        [storyId]: {
          ...current,
          [type]: targetList
        }
      };
    });
  };

  const handleCopyStory = (us: UserStory) => {
    const acText = us.acceptanceCriteria
      .map(ac => `Scenario: ${ac.scenario}\nGiven ${ac.given}\nWhen ${ac.when}\nThen ${ac.then}`)
      .join('\n\n');

    const evidenceText = us.evidenceQuote
      ? `*Evidência da Entrevista (${us.evidenceQuote.speaker}):*\n"${us.evidenceQuote.text}"\n\n`
      : '';

    const fullText = `*User Story: ${us.title}* (${us.storyPoints || 3} pts)\n` +
      `Como ${us.asA}\nEu quero ${us.iWantTo}\nPara que ${us.soThat}\n\n` +
      evidenceText +
      `*Critérios de Aceite (BDD):*\n${acText}\n\n` +
      `*Tasks Técnicas:*\n` +
      us.tasks.map(t => `- [${t.type.toUpperCase()}] ${t.title}`).join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedStoryId(us.id);
    setTimeout(() => setCopiedStoryId(null), 2000);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'frontend':
        return <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>FRONT</span>;
      case 'backend':
        return <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>BACK</span>;
      case 'database':
        return <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>DB</span>;
      case 'analytics':
        return <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>DATA</span>;
      default:
        return <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>DEV</span>;
    }
  };

  const getDomainBadge = (domain?: DomainCategory) => {
    switch (domain) {
      case 'checkout':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CreditCard size={11} /> Checkout & Pagamentos
          </span>
        );
      case 'onboarding':
        return (
          <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#67e8f9', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Rocket size={11} /> Onboarding & Ativação
          </span>
        );
      case 'security':
        return (
          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={11} /> Segurança & Compliance
          </span>
        );
      case 'operations':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fcd34d', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Settings size={11} /> Operações & Backoffice
          </span>
        );
      case 'analytics':
        return (
          <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#f472b6', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={11} /> Analytics & BI
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} /> Core da Aplicação
          </span>
        );
    }
  };

  const handleCopyExportText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExportMsg(true);
    setTimeout(() => setCopiedExportMsg(false), 2000);
  };

  // Safe dummy project if none provided
  const targetProject = project || {
    id: 'proj-active',
    name: 'Discovery ao Done',
    description: 'Segundo Cérebro de Produto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessions: [],
    okrs,
    epics,
    prd: { id: 'prd-1', title: 'PRD', version: '1.0', lastUpdated: '', problemStatement: '', targetAudience: '', valueProposition: '', inScope: [], outOfScope: [], successMetrics: [], assumptions: [], risksAndMitigations: [] },
    leanCanvas: { problem: [], existingAlternatives: [], customerSegments: [], earlyAdopters: [], uniqueValueProposition: '', highLevelConcept: '', solution: [], channels: [], revenueStreams: [], costStructure: [], keyMetrics: [], unfairAdvantage: '' },
    decisionLog: []
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
      {/* Top Header & AI Transform Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Discovery ao Done Engine</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Transformação direta de evidências de entrevistas em OKRs, Épicos, Stories (INVEST) e Tasks
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botão Exportar SPEC & PRD */}
          <button
            onClick={() => {
              setActiveExportTab('spec');
              setIsExportModalOpen(true);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', gap: '8px', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}
            title="Converter backlog em SPEC.md e PRD.md para desenvolvimento por IA"
          >
            <Bot size={15} />
            Converter em PRD & SPEC.md (IA)
          </button>

          {/* Botão Exportar / Push */}
          <button
            onClick={() => {
              setActiveExportTab('jira');
              setIsExportModalOpen(true);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', gap: '8px' }}
            title="Exportar para Jira, Linear ou GitHub Issues"
          >
            <Share2 size={15} color="var(--accent-cyan)" />
            Push Delivery (Jira/GitHub/Linear)
          </button>

          <button
            onClick={handleFireConfetti}
            disabled={isGenerating}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', gap: '8px' }}
          >
            <Sparkles size={16} />
            {isGenerating ? 'IA Estruturando Backlog...' : 'Gerar / Refinar Backlog com IA'}
          </button>
        </div>
      </div>

      {/* Onboarding Guide Card: Como Iniciar e Alimentar o Backlog */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              🧭
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'white', margin: 0 }}>
                Como Iniciar e Alimentar o Backlog de <span style={{ color: '#a5b4fc' }}>{targetProject.name}</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Três caminhos integrados para transformar descobertas em histórias entregáveis com padrão INVEST & BDD:
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>Etapa 3 de 5 da Jornada</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Card 1: Pelas Gravações */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1rem' }}>🎙️</span>
                <strong style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>Caminho 1: Das Gravações com IA</strong>
                <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>Recomendado</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
                Grave a entrevista do usuário com microfone ou importe áudio/texto. A IA extrai dores, quotes e gera os épicos e histórias automaticamente vinculados ao que o cliente disse.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {onNavigateToLiveRoom && (
                <button
                  onClick={onNavigateToLiveRoom}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '5px' }}
                >
                  <Radio size={13} color="#f43f5e" />
                  Ir para Gravações
                </button>
              )}
              <button
                onClick={handleFireConfetti}
                disabled={isGenerating}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '5px' }}
              >
                <Sparkles size={13} />
                {isGenerating ? 'Gerando...' : 'Sintetizar com IA'}
              </button>
            </div>
          </div>

          {/* Card 2: Fatiamento SPIDR & BDD */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1rem' }}>🔪</span>
                <strong style={{ fontSize: '0.85rem', color: '#a5f3fc' }}>Caminho 2: Fatiar Épicos (SPIDR)</strong>
                <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>INVEST & BDD</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
                Quebre requisitos complexos em histórias finas usando o método SPIDR (Paths, Rules, Data). Cada história inclui cenários Given/When/Then e checklist DoR/DoD calibrado.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  setActiveTab('epics');
                  if (epics[0]) setExpandedEpicId(epics[0].id);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '5px', color: '#67e8f9' }}
              >
                <Layers size={13} />
                Explorar Épicos ({epics.length})
              </button>
            </div>
          </div>

          {/* Card 3: Converter para IA (SPEC.md) & Git */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1rem' }}>🤖</span>
                <strong style={{ fontSize: '0.85rem', color: '#6ee7b7' }}>Caminho 3: Enviar para IA & Git</strong>
                <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>Executável</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
                Converta o backlog em PRD.md canônico e SPEC.md com contratos de API, schemas e regras para a IA codificar, ou faça push para Jira / GitHub / Linear.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setActiveExportTab('spec');
                  setIsExportModalOpen(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '5px', color: '#6ee7b7' }}
              >
                <Bot size={13} />
                Gerar SPEC & PRD
              </button>
              <button
                onClick={() => {
                  setActiveExportTab('jira');
                  setIsExportModalOpen(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '5px' }}
              >
                <Share2 size={13} />
                Push Delivery
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('epics')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            background: activeTab === 'epics' ? 'var(--primary-light)' : 'transparent',
            color: activeTab === 'epics' ? '#a5b4fc' : 'var(--text-muted)',
            border: activeTab === 'epics' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Layers size={14} />
          Épicos & Features ({epics.length})
        </button>

        <button
          onClick={() => setActiveTab('okrs')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            background: activeTab === 'okrs' ? 'var(--accent-cyan-light)' : 'transparent',
            color: activeTab === 'okrs' ? '#67e8f9' : 'var(--text-muted)',
            border: activeTab === 'okrs' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Target size={14} />
          OKRs & OBIs de Negócio ({okrs.length})
        </button>
      </div>

      {/* Tab Content: OKRs */}
      {activeTab === 'okrs' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px' }}>
          {okrs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              Nenhum OKR definido. Clique em "Gerar Backlog com IA" para derivar resultados mensuráveis das conversas.
            </div>
          ) : (
            okrs.map(okr => (
              <div key={okr.id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="badge badge-cyan">OBJETIVO ESTRATÉGICO</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{okr.objective}</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                  {okr.keyResults.map(kr => (
                    <div
                      key={kr.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={15} color="var(--accent-emerald)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{kr.description}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Baseline: <strong>{kr.baseline}</strong></span>
                        <span style={{ color: 'var(--accent-amber)' }}>Atual: <strong>{kr.current}</strong></span>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Meta: <strong>{kr.target}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Epics & Features */}
      {activeTab === 'epics' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          {epics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              Nenhum Épico estruturado ainda. Clique em "Gerar Backlog com IA" para converter os insights da reunião em épicos.
            </div>
          ) : (
            epics.map(epic => {
              const isExpanded = expandedEpicId === epic.id;
              return (
                <div key={epic.id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                  {/* Epic Header */}
                  <div
                    onClick={() => setExpandedEpicId(isExpanded ? null : epic.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isExpanded ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="var(--text-dim)" />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary">ÉPICO</span>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{epic.title}</h3>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Objetivo:</strong> {epic.objective}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-emerald">
                        {epic.status === 'ready_for_dev' ? 'Pronto para Dev' : epic.status}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {epic.features.length} Features
                      </span>
                    </div>
                  </div>

                  {/* Epic Body */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#c4b5fd' }}>
                        <strong>Valor de Negócio Validado:</strong> {epic.businessValue}
                      </div>

                      {/* Features List */}
                      {epic.features.map(feat => (
                        <div
                          key={feat.id}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="badge badge-cyan">FEATURE</span>
                              <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>{feat.title}</h4>
                              {getDomainBadge(feat.domain)}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {feat.riceScore && (
                                <span className="badge badge-amber" title={`R: ${feat.riceScore.reach} | I: ${feat.riceScore.impact} | C: ${feat.riceScore.confidence}% | E: ${feat.riceScore.effort}`}>
                                  RICE: {feat.riceScore.total}
                                </span>
                              )}
                              <span className="badge badge-primary">Esforço: {feat.effort}</span>
                            </div>
                          </div>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            {feat.description}
                          </p>

                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                            <strong>Proposta de Valor:</strong> {feat.valueProposition}
                          </div>

                          {/* User Stories Accordion */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {feat.userStories.map(us => {
                              const isStoryOpen = expandedStoryId === us.id;
                              const checklists = getStoryChecklists(us);
                              return (
                                <div
                                  key={us.id}
                                  style={{
                                    borderRadius: '8px',
                                    border: isStoryOpen ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                                    background: isStoryOpen ? 'rgba(30, 41, 59, 0.75)' : 'rgba(30, 41, 59, 0.5)',
                                    overflow: 'hidden',
                                    transition: 'all .2s'
                                  }}
                                >
                                  {/* Story Header */}
                                  <div
                                    onClick={() => setExpandedStoryId(isStoryOpen ? null : us.id)}
                                    style={{
                                      padding: '10px 12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: 'pointer',
                                      background: 'rgba(255, 255, 255, 0.02)',
                                      flexWrap: 'wrap',
                                      gap: '8px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {isStoryOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📝 {us.title}</span>
                                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{us.storyPoints || 3} pts</span>
                                      {getDomainBadge(us.domain || feat.domain)}
                                      {us.evidenceQuote && (
                                        <span className="badge badge-primary" style={{ fontSize: '0.63rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <Quote size={9} /> Evidência Real
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyStory(us);
                                      }}
                                      className="btn btn-ghost"
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                      title="Copiar User Story com Gherkin e Tasks para Jira/Notion"
                                    >
                                      {copiedStoryId === us.id ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                      {copiedStoryId === us.id ? 'Copiada!' : 'Copiar'}
                                    </button>
                                  </div>

                                  {/* Story Details */}
                                  {isStoryOpen && (
                                    <div style={{ padding: '14px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.85)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                      
                                      {/* EVIDENCE LINK: Citação real da reunião que originou a história */}
                                      {us.evidenceQuote ? (
                                        <div
                                          style={{
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.12))',
                                            border: '1px solid rgba(6, 182, 212, 0.35)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                              <Quote size={13} /> EVIDÊNCIA DE DISCOVERY (POR QUE ESTA HISTÓRIA EXISTE)
                                            </span>
                                            {onNavigateToLiveRoom && (
                                              <button
                                                type="button"
                                                onClick={onNavigateToLiveRoom}
                                                className="btn btn-ghost"
                                                style={{ padding: '2px 8px', fontSize: '0.68rem', gap: '4px', color: 'var(--accent-cyan)' }}
                                              >
                                                <Radio size={11} /> Ouvir/Ver na Sala ao Vivo <ExternalLink size={10} />
                                              </button>
                                            )}
                                          </div>
                                          <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: '#e2e8f0', margin: 0, lineHeight: 1.45 }}>
                                            "{us.evidenceQuote.text}"
                                          </p>
                                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: '12px' }}>
                                            <span><strong>Autor:</strong> {us.evidenceQuote.speaker}</span>
                                            {us.evidenceQuote.sessionTitle && <span><strong>Sessão:</strong> {us.evidenceQuote.sessionTitle}</span>}
                                            {us.evidenceQuote.timestamp && <span><strong>Minuto:</strong> {us.evidenceQuote.timestamp}</span>}
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* INVEST statement */}
                                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                        <p style={{ margin: '0 0 2px 0' }}><strong>Como</strong> {us.asA}</p>
                                        <p style={{ margin: '0 0 2px 0' }}><strong>Eu quero</strong> {us.iWantTo}</p>
                                        <p style={{ margin: 0 }}><strong>Para que</strong> {us.soThat}</p>
                                      </div>

                                      {/* Acceptance Criteria (Gherkin BDD) */}
                                      <div>
                                        <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                          Critérios de Aceite (Gherkin Dado / Quando / Então)
                                        </h5>
                                        {us.acceptanceCriteria.map((ac) => (
                                          <div key={ac.id} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', marginBottom: '6px' }}>
                                            <div style={{ color: '#67e8f9', fontWeight: 600 }}>Cenário: {ac.scenario}</div>
                                            <div style={{ color: '#a5b4fc' }}>Dado que {ac.given}</div>
                                            <div style={{ color: '#fcd34d' }}>Quando {ac.when}</div>
                                            <div style={{ color: '#6ee7b7' }}>Então {ac.then}</div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* CHECKLISTS: Definition of Ready (DoR) e Definition of Done (DoD) */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                        {/* Definition of Ready */}
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                          <h6 style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <CheckCircle2 size={13} /> Definition of Ready (DoR)
                                          </h6>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {checklists.dor.map(item => (
                                              <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.74rem', color: item.checked ? '#e2e8f0' : 'var(--text-muted)', cursor: 'pointer' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={item.checked}
                                                  onChange={() => handleToggleChecklist(epic.id, feat.id, us.id, 'dor', item.id)}
                                                  style={{ marginTop: '2px', accentColor: '#10b981' }}
                                                />
                                                <span style={{ textDecoration: item.checked ? 'none' : 'none' }}>{item.label}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Definition of Done */}
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                          <h6 style={{ fontSize: '0.74rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Shield size={13} /> Definition of Done (DoD)
                                          </h6>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {checklists.dod.map(item => (
                                              <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.74rem', color: item.checked ? '#e2e8f0' : 'var(--text-muted)', cursor: 'pointer' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={item.checked}
                                                  onChange={() => handleToggleChecklist(epic.id, feat.id, us.id, 'dod', item.id)}
                                                  style={{ marginTop: '2px', accentColor: '#6366f1' }}
                                                />
                                                <span>{item.label}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Technical Tasks */}
                                      <div>
                                        <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                          Tasks Técnicas de Engenharia ({us.tasks.length})
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {us.tasks.map(task => (
                                            <div
                                              key={task.id}
                                              style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.78rem'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                  onClick={() => onUpdateTaskStatus(epic.id, feat.id, us.id, task.id, task.status === 'done' ? 'todo' : 'done')}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                  {task.status === 'done' ? (
                                                    <CheckCircle2 size={15} color="var(--accent-emerald)" />
                                                  ) : (
                                                    <Circle size={15} color="var(--text-dim)" />
                                                  )}
                                                </button>
                                                {getTaskIcon(task.type)}
                                                <span style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-dim)' : 'var(--text-main)' }}>
                                                  {task.title}
                                                </span>
                                              </div>

                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                {task.estimatedHours || 4}h
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL DE INTEGRAÇÕES & EXPORTAÇÃO (Jira Cloud, Linear, GitHub Issues) */}
      {isExportModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Converter Backlog em PRD & SPEC.md (IA)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Exporte especificações para agentes de IA (Claude, Cursor, Antigravity) ou ferramentas de delivery
                  </p>
                </div>
              </div>

              <button onClick={() => setIsExportModalOpen(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveExportTab('spec')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeExportTab === 'spec' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: activeExportTab === 'spec' ? '#67e8f9' : 'var(--text-muted)',
                  border: activeExportTab === 'spec' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Bot size={14} />
                🤖 SPEC.md (Para IA Desenvolver)
              </button>

              <button
                onClick={() => setActiveExportTab('prd')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeExportTab === 'prd' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: activeExportTab === 'prd' ? '#a5b4fc' : 'var(--text-muted)',
                  border: activeExportTab === 'prd' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} />
                📄 PRD.md (Produto)
              </button>

              <button
                onClick={() => setActiveExportTab('jira')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeExportTab === 'jira' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: activeExportTab === 'jira' ? '#a5b4fc' : 'var(--text-muted)',
                  border: activeExportTab === 'jira' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={14} />
                Jira Cloud
              </button>

              <button
                onClick={() => setActiveExportTab('github')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeExportTab === 'github' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  color: activeExportTab === 'github' ? '#6ee7b7' : 'var(--text-muted)',
                  border: activeExportTab === 'github' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <GitBranch size={14} />
                GitHub Issues
              </button>

              <button
                onClick={() => setActiveExportTab('linear')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeExportTab === 'linear' ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
                  color: activeExportTab === 'linear' ? '#f472b6' : 'var(--text-muted)',
                  border: activeExportTab === 'linear' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Rocket size={14} />
                Linear
              </button>
            </div>

            {/* Modal Body Preview */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {activeExportTab === 'spec' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    ⚡ <strong>Especificação Autônoma para IA:</strong> Arquivo <code>SPEC.md</code> pronto para Cursor Agent, Claude Code, Antigravity ou Copilot desenvolverem o sistema ponta a ponta sem alucinações.
                  </p>
                  <pre style={{ maxHeight: '280px', overflowY: 'auto', padding: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#67e8f9', whiteSpace: 'pre-wrap', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    {exportService.exportToAISpec(targetProject)}
                  </pre>
                </div>
              )}

              {activeExportTab === 'prd' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    📄 <strong>PRD em 8 Seções:</strong> Documento formal de requisitos de produto (Problema, Personas, Solução, OKRs, Constraints, Roadmap, BDD Gherkin e Governança DoR/DoD).
                  </p>
                  <pre style={{ maxHeight: '280px', overflowY: 'auto', padding: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#a5b4fc', whiteSpace: 'pre-wrap', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    {exportService.exportToPRD(targetProject)}
                  </pre>
                </div>
              )}

              {activeExportTab === 'jira' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    O arquivo gerado é compatível com o <strong>Jira External System Import</strong> (CSV padrão Atlassian com Épicos, Stories, Sub-tasks e Critérios de Aceite).
                  </p>
                  <pre style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#a5b4fc', whiteSpace: 'pre-wrap' }}>
                    {exportService.exportToJiraCsv(targetProject)}
                  </pre>
                </div>
              )}

              {activeExportTab === 'github' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Estrutura pronta para criar issues no GitHub com labels, checkboxes de DoR/DoD e critérios de aceite.
                  </p>
                  <pre style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#6ee7b7', whiteSpace: 'pre-wrap' }}>
                    {exportService.exportToGitHubIssues(targetProject).map(i => `### ${i.title}\nLabels: ${i.labels.join(', ')}\n\n${i.body}`).join('\n\n---\n\n')}
                  </pre>
                </div>
              )}

              {activeExportTab === 'linear' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Formato de importação direta para o Linear com estimativas em Story Points e citações de discovery.
                  </p>
                  <pre style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#f472b6', whiteSpace: 'pre-wrap' }}>
                    {exportService.exportToLinear(targetProject)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {epics.reduce((acc, e) => acc + e.features.reduce((fAcc, f) => fAcc + f.userStories.length, 0), 0)} histórias e tasks mapeadas no backlog
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {activeExportTab === 'spec' && (
                  <button
                    onClick={() => {
                      const spec = exportService.exportToAISpec(targetProject);
                      exportService.downloadFile(spec, 'SPEC.md', 'text/markdown');
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '6px', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#67e8f9' }}
                  >
                    <Download size={14} /> Baixar SPEC.md
                  </button>
                )}

                {activeExportTab === 'prd' && (
                  <button
                    onClick={() => {
                      const prdText = exportService.exportToPRD(targetProject);
                      exportService.downloadFile(prdText, 'PRD.md', 'text/markdown');
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '6px', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc' }}
                  >
                    <Download size={14} /> Baixar PRD.md
                  </button>
                )}

                {activeExportTab === 'jira' && (
                  <button
                    onClick={() => {
                      const csv = exportService.exportToJiraCsv(targetProject);
                      exportService.downloadFile(csv, `${targetProject.name.toLowerCase().replace(/\s+/g, '-')}-jira-backlog.csv`, 'text/csv');
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '6px' }}
                  >
                    <FileSpreadsheet size={14} /> Baixar Jira CSV
                  </button>
                )}

                <button
                  onClick={() => {
                    if (activeExportTab === 'spec') {
                      handleCopyExportText(exportService.exportToAISpec(targetProject));
                    } else if (activeExportTab === 'prd') {
                      handleCopyExportText(exportService.exportToPRD(targetProject));
                    } else if (activeExportTab === 'jira') {
                      handleCopyExportText(exportService.exportToJiraJson(targetProject));
                    } else if (activeExportTab === 'github') {
                      const text = exportService.exportToGitHubIssues(targetProject).map(i => `### ${i.title}\nLabels: ${i.labels.join(', ')}\n\n${i.body}`).join('\n\n---\n\n');
                      handleCopyExportText(text);
                    } else {
                      handleCopyExportText(exportService.exportToLinear(targetProject));
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', gap: '6px' }}
                >
                  {copiedExportMsg ? <Check size={14} /> : <Copy size={14} />}
                  {copiedExportMsg ? 'Copiado para Área de Transferência!' : (activeExportTab === 'spec' ? 'Copiar Prompt SPEC.md para IA' : 'Copiar Payload Completo')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
