import React, { useState } from 'react';
import { githubCrawlerService, CrawlerLogEntry } from '../services/githubCrawlerService';
import { runStudioAgent } from '../services/studioAgentService';
import type { StudioAgentId, StudioAgentResult } from '../services/studioAgentService';
import { ExampleResultNotice } from './ExampleResultNotice';
import {
  Bot,
  Play,
  RotateCw,
  Sparkles,
  GitBranch,
  Terminal,
  CheckCircle2,
  FileCode,
  Layers,
  Send,
  Zap,
  Check,
  Copy,
  ExternalLink,
  Cpu,
  BookOpen,
  Download,
  Radio,
  FileText,
  Code2
} from 'lucide-react';

interface AgentStudioViewProps {
  onNewPracticesAdded?: (count: number) => void;
  onNavigateToKnowledgeHub?: () => void;
}

export type AgentStudioTab = 'crawler' | 'synthesizer' | 'slicer' | 'spec_architect' | 'coach' | 'jira_sync';

export const AgentStudioView: React.FC<AgentStudioViewProps> = ({
  onNewPracticesAdded,
  onNavigateToKnowledgeHub
}) => {
  const [activeAgentTab, setActiveAgentTab] = useState<AgentStudioTab>('crawler');

  // Agent 1 State: GitHub Crawler & Material Git
  const [repoUrl, setRepoUrl] = useState('https://github.com/thiagovinigo/agile-coach-ai.git');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerLogs, setCrawlerLogs] = useState<CrawlerLogEntry[]>([]);
  const [crawlComplete, setCrawlComplete] = useState(false);
  const [crawledStats, setCrawledStats] = useState<{ files: number; practices: number } | null>(null);

  // Agent 2 State: Discovery Synthesizer
  const [rawNotes, setRawNotes] = useState(
    'Entrevistamos 3 analistas financeiros e 2 lojistas sobre o processo de liquidação mensal.\n' +
    'Eles relatam que gastam 4 dias no Excel batendo extratos com o sistema bancário legado.\n' +
    'Quando há divergência de centavos, o lote inteiro de 200 lojistas é bloqueado, gerando ligações furiosas para o suporte.\n' +
    'Eles gostariam de aprovação automática para divergências irrelevantes e relatórios em tempo real sem depender de TI.'
  );
  const [synthesizedDiscovery, setSynthesizedDiscovery] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Agent 3 State: Story Slicer (SPIDR)
  const [epicToSlice, setEpicToSlice] = useState('Módulo completo de pagamento e liquidação com split automático para 200 lojistas.');
  const [slicedStories, setSlicedStories] = useState<string | null>(null);
  const [isSlicing, setIsSlicing] = useState(false);

  // Agent 4 State: Principal Tech Architect (SPEC.md para IA)
  const [specInput, setSpecInput] = useState('Motor de Conciliação Financeira com Tolerância Parametrizável e Split em Lote');
  const [generatedSpec, setGeneratedSpec] = useState<string | null>(null);
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false);

  // Agent 5 State: Agile Coach Prescriber
  const [teamProblem, setTeamProblem] = useState('Nossos 6 squads de produto têm muitas dependências entre si e a entrega do trimestre sempre atrasa por causa de integrações não alinhadas.');
  const [coachPrescription, setCoachPrescription] = useState<string | null>(null);
  const [isPrescribing, setIsPrescribing] = useState(false);

  // Agent 6 State: Jira & DevOps Sync
  const [jiraProjectKey, setJiraProjectKey] = useState('FIN');
  const [jiraPayload, setJiraPayload] = useState<string | null>(null);
  const [isGeneratingJira, setIsGeneratingJira] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState<Partial<Record<StudioAgentId, StudioAgentResult['source']>>>({});

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Roda um agente e guarda a origem do resultado, para avisar quando for só um exemplo
  const runAgent = async (
    id: StudioAgentId,
    input: string,
    setBusy: (busy: boolean) => void,
    setResult: (text: string) => void
  ) => {
    setBusy(true);
    const result = await runStudioAgent(id, input);
    setResult(result.text);
    setResultSource(prev => ({ ...prev, [id]: result.source }));
    setBusy(false);
  };

  const handleRunSpecArchitect = () => runAgent('spec_architect', specInput, setIsGeneratingSpec, setGeneratedSpec);

  const handleRunCrawler = async () => {
    setIsCrawling(true);
    setCrawlerLogs([]);
    setCrawlComplete(false);

    try {
      const result = await githubCrawlerService.crawlRepository(repoUrl, (log) => {
        setCrawlerLogs(prev => [...prev, log]);
      });

      setCrawledStats({ files: result.filesScanned, practices: result.practicesExtracted });
      setCrawlComplete(true);
      if (onNewPracticesAdded) {
        onNewPracticesAdded(result.practicesExtracted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleRunCoach = () => runAgent('coach', teamProblem, setIsPrescribing, setCoachPrescription);

  const handleRunSlicer = () => runAgent('slicer', epicToSlice, setIsSlicing, setSlicedStories);

  const handleRunSynthesizer = () => runAgent('synthesizer', rawNotes, setIsSynthesizing, setSynthesizedDiscovery);

  const handleRunJiraSync = () => runAgent('jira_sync', jiraProjectKey, setIsGeneratingJira, setJiraPayload);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
          }}>
            <Bot size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Central de Agentes Especialistas de IA & Material Git</h2>
              <span className="badge badge-emerald">6 Agentes Ativos</span>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Etapa 5 de 5 da Jornada</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Acesso unificado aos agentes autônomos para ler repositórios Git, sintetizar discovery, fatiar histórias BDD, arquitetar SPEC.md e sincronizar entregas
            </p>
          </div>
        </div>
      </div>

      {/* Visual Directory: 6 Agentes e Material Git */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🧭 Diretório de Agentes Especialistas • Clique para Ativar
          </span>
          <span style={{ fontSize: '0.72rem', color: '#67e8f9' }}>
            Selecione qualquer agente para ver seus inputs, execuções e outputs
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {/* Card 1: Material Git */}
          <button
            id="agent-card-crawler"
            onClick={() => setActiveAgentTab('crawler')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'crawler' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'crawler' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <GitBranch size={15} color="#10b981" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'crawler' ? '#6ee7b7' : 'white' }}>1. Material do Git</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Crawl de repositórios, playbooks markdown e schemas
            </p>
          </button>

          {/* Card 2: Discovery Synthesizer */}
          <button
            id="agent-card-synthesizer"
            onClick={() => setActiveAgentTab('synthesizer')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'synthesizer' ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'synthesizer' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <FileCode size={15} color="#06b6d4" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'synthesizer' ? '#67e8f9' : 'white' }}>2. Discovery (JTBD)</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Sintetiza falas em dores, jobs e hipóteses falsificáveis
            </p>
          </button>

          {/* Card 3: Story Slicer */}
          <button
            id="agent-card-slicer"
            onClick={() => setActiveAgentTab('slicer')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'slicer' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'slicer' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Zap size={15} color="#ec4899" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'slicer' ? '#f472b6' : 'white' }}>3. Story Slicer</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Fatiamento SPIDR em histórias com Given/When/Then
            </p>
          </button>

          {/* Card 4: Tech Architect */}
          <button
            id="agent-card-spec-architect"
            onClick={() => setActiveAgentTab('spec_architect')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'spec_architect' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'spec_architect' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Cpu size={15} color="#f59e0b" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'spec_architect' ? '#fcd34d' : 'white' }}>4. Tech Architect</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Gera SPEC.md com APIs, TypeScript e testes para IA
            </p>
          </button>

          {/* Card 5: Agile Coach */}
          <button
            id="agent-card-coach"
            onClick={() => setActiveAgentTab('coach')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'coach' ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'coach' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Sparkles size={15} color="#8b5cf6" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'coach' ? '#c4b5fd' : 'white' }}>5. Agile Coach</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Diagnóstico de silos, WIP limits e prescrição de rituais
            </p>
          </button>

          {/* Card 6: Jira & DevOps */}
          <button
            id="agent-card-jira-sync"
            onClick={() => setActiveAgentTab('jira_sync')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeAgentTab === 'jira_sync' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeAgentTab === 'jira_sync' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Layers size={15} color="#3b82f6" />
              <strong style={{ fontSize: '0.82rem', color: activeAgentTab === 'jira_sync' ? '#93c5fd' : 'white' }}>6. Jira & DevOps</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.3 }}>
              Gera payload JSON para Jira Cloud, Linear e GitHub
            </p>
          </button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* AGENT 1: GITHUB CRAWLER */}
        {activeAgentTab === 'crawler' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Varredura Automática de Repositórios do GitHub</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    O agente percorre todos os arquivos markdown, playbooks e frameworks do repositório e os indexa no seu Acervo Ágil.
                  </p>
                </div>

                {crawledStats && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge badge-cyan">{crawledStats.files} arquivos lidos</span>
                    <span className="badge badge-emerald">{crawledStats.practices} práticas indexadas</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/thiagovinigo/agile-coach-ai.git"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  onClick={handleRunCrawler}
                  disabled={isCrawling}
                  className="btn btn-primary"
                  style={{ gap: '6px', minWidth: '220px' }}
                >
                  {isCrawling ? <RotateCw className="animate-spin" size={16} /> : <Play size={16} />}
                  {isCrawling ? 'Agente Rastreando...' : 'Executar Varredura'}
                </button>
              </div>

              {/* Repositórios Rápidos e Material Local */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Repositórios de Exemplo:</span>
                  <button
                    onClick={() => setRepoUrl('https://github.com/thiagovinigo/agile-coach-ai.git')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    📦 agile-coach-ai (Oficial)
                  </button>
                  <button
                    onClick={() => setRepoUrl('https://github.com/discovery-ao-done/financial-specs.git')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    💳 financial-specs
                  </button>
                  <button
                    onClick={() => setRepoUrl('https://github.com/discovery-ao-done/product-playbooks.git')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    📚 product-playbooks
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>📁 Materiais Disponíveis no Workspace:</span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>PRD.md</span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>SPEC.md</span>
                </div>
              </div>
            </div>

            {/* Terminal Log Console */}
            <div style={{
              flex: 1,
              background: '#070b14',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'JetBrains Mono',
              fontSize: '0.78rem',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)' }}>
                  <Terminal size={14} />
                  <span>LOG DE EXECUÇÃO DO AGENTE GITHUB CRAWLER</span>
                </div>
                {crawlComplete && onNavigateToKnowledgeHub && (
                  <button
                    onClick={onNavigateToKnowledgeHub}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    Ver Práticas no Acervo ➔
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {crawlerLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>
                    Clique em "Executar Varredura" para iniciar a leitura autônoma dos arquivos do GitHub...
                  </div>
                ) : (
                  crawlerLogs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{log.timestamp}]</span>
                      <span style={{
                        color: log.type === 'success' ? '#6ee7b7' : log.type === 'file' ? '#67e8f9' : '#e2e8f0'
                      }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AGENT 2: AGILE COACH PRESCRIBER */}
        {activeAgentTab === 'coach' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Descreva o Desafio da Equipe ou Projeto</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                O Agente Agile Coach consulta o acervo e prescreve o método exato com dinâmica e plano de ação.
              </p>
              <textarea
                rows={6}
                value={teamProblem}
                onChange={(e) => setTeamProblem(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'white',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />
              <button
                onClick={handleRunCoach}
                disabled={isPrescribing}
                className="btn btn-primary"
                style={{ gap: '6px', alignSelf: 'flex-start' }}
              >
                {isPrescribing ? <RotateCw className="animate-spin" size={15} /> : <Sparkles size={15} />}
                {isPrescribing ? 'Diagnosticando...' : 'Diagnosticar e Prescrever Método'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6ee7b7' }}>
                  Prescrição do Agile Coach AI
                </h3>
                {coachPrescription && (
                  <button
                    onClick={() => handleCopyText('coach', coachPrescription)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    {copiedKey === 'coach' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedKey === 'coach' ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
              {coachPrescription && resultSource.coach === 'template' && <ExampleResultNotice />}
              {coachPrescription ? (
                <div style={{ fontSize: '0.82rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {coachPrescription}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>
                  Aguardando envio do desafio para gerar recomendação...
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENT 3: STORY SLICER */}
        {activeAgentTab === 'slicer' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Fatiador Inteligente de Épicos em Histórias (SPIDR)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cole qualquer funcionalidade gigante e o Agente criará histórias de 1 a 3 pontos com critérios BDD Given/When/Then.
              </p>
              <textarea
                rows={6}
                value={epicToSlice}
                onChange={(e) => setEpicToSlice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'white',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />
              <button
                onClick={handleRunSlicer}
                disabled={isSlicing}
                className="btn btn-primary"
                style={{ gap: '6px', alignSelf: 'flex-start' }}
              >
                {isSlicing ? <RotateCw className="animate-spin" size={15} /> : <Zap size={15} />}
                {isSlicing ? 'Fatiando...' : 'Fatiar Épico em Histórias BDD'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#67e8f9' }}>
                  Histórias Fatiadas Prontas para o Backlog
                </h3>
                {slicedStories && (
                  <button
                    onClick={() => handleCopyText('slicer', slicedStories)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    {copiedKey === 'slicer' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedKey === 'slicer' ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
              {slicedStories && resultSource.slicer === 'template' && <ExampleResultNotice />}
              {slicedStories ? (
                <div style={{ fontSize: '0.82rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {slicedStories}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>
                  Aguardando envio do épico para fatiar...
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENT 4: DISCOVERY SYNTHESIZER */}
        {activeAgentTab === 'synthesizer' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Anotações ou Transcrição Bruta da Entrevista</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cole relatos de clientes, notas de reunião ou transcripts. O Agente sintetizará Jobs To Be Done (JTBD), Dores Críticas e Oportunidades.
              </p>
              <textarea
                rows={7}
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'white',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />
              <button
                onClick={handleRunSynthesizer}
                disabled={isSynthesizing}
                className="btn btn-primary"
                style={{ gap: '6px', alignSelf: 'flex-start' }}
              >
                {isSynthesizing ? <RotateCw className="animate-spin" size={15} /> : <FileCode size={15} />}
                {isSynthesizing ? 'Sintetizando Insights...' : 'Sintetizar JTBD & Dores'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                  Síntese de Discovery & Oportunidades
                </h3>
                {synthesizedDiscovery && (
                  <button
                    onClick={() => handleCopyText('synthesizer', synthesizedDiscovery)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    {copiedKey === 'synthesizer' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedKey === 'synthesizer' ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
              {synthesizedDiscovery && resultSource.synthesizer === 'template' && <ExampleResultNotice />}
              {synthesizedDiscovery ? (
                <div style={{ fontSize: '0.82rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {synthesizedDiscovery}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>
                  Aguardando envio das anotações de entrevista para sintetizar...
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENT 5: JIRA & DEVOPS SYNC */}
        {activeAgentTab === 'jira_sync' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Exportação Padronizada para Jira & Azure DevOps</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                O Agente estrutura todo o backlog gerado em formato JSON/CSV pronto para ingestão via API ou importação direta no Jira Cloud/Data Center.
              </p>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Chave do Projeto Jira (Project Key):
                </label>
                <input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#93c5fd' }}>
                📌 <strong>Garantia de Padrão INVEST & BDD:</strong> O payload exporta Épicos, Stories fatiadas, critérios de aceite em Gherkin (Dado/Quando/Então) e campos de WSJF/Story Points para seus sprints.
              </div>

              <button
                onClick={handleRunJiraSync}
                disabled={isGeneratingJira}
                className="btn btn-primary"
                style={{ gap: '6px', alignSelf: 'flex-start' }}
              >
                {isGeneratingJira ? <RotateCw className="animate-spin" size={15} /> : <Layers size={15} />}
                {isGeneratingJira ? 'Gerando Payload...' : 'Gerar Payload Jira JSON'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa' }}>
                  Payload Pronto para Jira / Azure DevOps
                </h3>
                {jiraPayload && (
                  <button
                    onClick={() => handleCopyText('jira', jiraPayload)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    {copiedKey === 'jira' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedKey === 'jira' ? 'Copiado JSON!' : 'Copiar JSON'}
                  </button>
                )}
              </div>
              {jiraPayload && resultSource.jira_sync === 'template' && <ExampleResultNotice />}
              {jiraPayload ? (
                <pre style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  background: '#070b14',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#67e8f9',
                  overflowX: 'auto',
                  fontFamily: 'JetBrains Mono'
                }}>
                  {jiraPayload}
                </pre>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>
                  Aguardando geração do payload Jira...
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENT 4: PRINCIPAL TECH ARCHITECT (SPEC.MD) */}
        {activeAgentTab === 'spec_architect' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Principal Tech Architect AI (Geração de SPEC.md)</h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Transforme requisitos de negócio e épicos em especificações técnicas de código prontas para agentes de IA (TypeScript interfaces, endpoints REST, precisão centesimal e cenários Gherkin).
              </p>
              <textarea
                rows={6}
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'white',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem', color: '#fcd34d' }}>
                ⚙️ <strong>Pronto para LLM:</strong> A SPEC gerada inclui restrições arquiteturais estritas (aritmética inteira, isolamento de lote e idempotência) para alimentar seu agente de desenvolvimento.
              </div>
              <button
                onClick={handleRunSpecArchitect}
                disabled={isGeneratingSpec}
                className="btn btn-primary"
                style={{ gap: '6px', alignSelf: 'flex-start', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {isGeneratingSpec ? <RotateCw className="animate-spin" size={15} /> : <Cpu size={15} />}
                {isGeneratingSpec ? 'Arquitetando SPEC.md...' : 'Gerar Especificação Técnica (SPEC.md)'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fcd34d' }}>
                  SPEC.md Gerado para Desenvolvimento por IA
                </h3>
                {generatedSpec && (
                  <button
                    onClick={() => handleCopyText('spec_gen', generatedSpec)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                  >
                    {copiedKey === 'spec_gen' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedKey === 'spec_gen' ? 'Copiado!' : 'Copiar SPEC.md'}
                  </button>
                )}
              </div>
              {generatedSpec && resultSource.spec_architect === 'template' && <ExampleResultNotice />}
              {generatedSpec ? (
                <pre style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.45',
                  background: '#070b14',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  fontFamily: 'JetBrains Mono',
                  whiteSpace: 'pre-wrap'
                }}>
                  {generatedSpec}
                </pre>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>
                  Clique em "Gerar Especificação Técnica (SPEC.md)" para arquitetar a spec executável por IA...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

