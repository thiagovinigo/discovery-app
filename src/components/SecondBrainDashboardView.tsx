import React, { useState } from 'react';
import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { clarityScore as computeClarity, methodSuggestions, productAreas } from '../services/insightService';
import {
  Brain,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
  TrendingUp,
  Flame,
  Lightbulb,
  CheckCircle2,
  FolderTree,
  Archive,
  BookOpen,
  Zap,
  Target,
  FileText,
  Search,
  ExternalLink
} from 'lucide-react';

interface SecondBrainDashboardViewProps {
  project: DiscoveryProject;
  activeSession?: MeetingSession;
  onNavigateToView: (view: 'live_room' | 'backlog' | 'documentation' | 'knowledge_hub') => void;
}

export const SecondBrainDashboardView: React.FC<SecondBrainDashboardViewProps> = ({
  project,
  activeSession,
  onNavigateToView
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'capture' | 'organize' | 'distill' | 'express'>('distill');

  // Calculate Cognitive Metrics
  const totalTranscripts = project.sessions.reduce((acc, s) => acc + s.rawTranscript.length, 0);
  const totalPainPoints = project.sessions.reduce((acc, s) => acc + s.painPoints.length, 0);
  const totalJtbds = project.sessions.reduce((acc, s) => acc + s.jtbds.length, 0);
  const totalEpics = project.epics.length;
  const totalStories = project.epics.reduce((acc, e) => acc + e.features.reduce((fAcc, f) => fAcc + f.userStories.length, 0), 0);

  // Índice de clareza: cresce com a evidência coletada; sem nada coletado, fica em zero
  const clarityScore = computeClarity({ transcripts: totalTranscripts, painPoints: totalPainPoints, jtbds: totalJtbds, epics: totalEpics });

  // Sugestões de método, cada uma partindo de uma dor mapeada de verdade nas reuniões deste projeto
  const synapticRecommendations = methodSuggestions(project.sessions);
  const areas = productAreas(project.epics);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* Top Header: Brain Brand & Vital Signs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)'
          }}>
            <Brain className="animate-brain" size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Segundo Cérebro: Centro de Inteligência Cognitiva</h2>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Método C.O.D.E. • Tiago Forte</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sua extensão de memória ativa: Captura conversas, Organiza em domínios, Destila dores e Expressa em Backlog de Entrega
            </p>
          </div>
        </div>

        {/* Cognitive Health Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              Índice de Clareza de Discovery
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: clarityScore > 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {clarityScore}%
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {clarityScore > 75 ? '• Pronto para Engenharia' : '• Hipóteses em Validação'}
              </span>
            </div>
          </div>
          <div style={{ width: '50px', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ width: `${clarityScore}%`, height: '100%', background: clarityScore > 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)', borderRadius: '999px' }} />
          </div>
        </div>
      </div>

      {/* 4 Cognitive Vital Signs Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            1. CAPTURE (MEMÓRIA ATIVA)
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalTranscripts}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>falas em {project.sessions.length} reuniões</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            2. ORGANIZE (ESTRUTURA P.A.R.A.)
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{project.epics.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projetos & Épicos ativos</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid var(--accent-rose)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            3. DISTILL (SINAIS DE OURO)
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalPainPoints + totalJtbds}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dores e JTBDs validados</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid var(--accent-emerald)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            4. EXPRESS (ENTREGA "DONE")
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalStories}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User Stories INVEST prontas</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left Column: The Interactive C.O.D.E. Engine */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* C.O.D.E. Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <button
              onClick={() => setActiveCodeTab('capture')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: activeCodeTab === 'capture' ? 'var(--primary-light)' : 'transparent',
                color: activeCodeTab === 'capture' ? '#a5b4fc' : 'var(--text-muted)',
                border: activeCodeTab === 'capture' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              C • Capture
            </button>
            <button
              onClick={() => setActiveCodeTab('organize')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: activeCodeTab === 'organize' ? 'var(--accent-cyan-light)' : 'transparent',
                color: activeCodeTab === 'organize' ? '#67e8f9' : 'var(--text-muted)',
                border: activeCodeTab === 'organize' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              O • Organize (P.A.R.A.)
            </button>
            <button
              onClick={() => setActiveCodeTab('distill')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: activeCodeTab === 'distill' ? 'var(--accent-rose-light)' : 'transparent',
                color: activeCodeTab === 'distill' ? '#fda4af' : 'var(--text-muted)',
                border: activeCodeTab === 'distill' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              D • Distill (Essência)
            </button>
            <button
              onClick={() => setActiveCodeTab('express')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: activeCodeTab === 'express' ? 'var(--accent-emerald-light)' : 'transparent',
                color: activeCodeTab === 'express' ? '#6ee7b7' : 'var(--text-muted)',
                border: activeCodeTab === 'express' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              E • Express (Entrega)
            </button>
          </div>

          {/* CODE Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {activeCodeTab === 'capture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Capture (Captura Cognitiva):</strong> Nenhum insight é perdido. O cérebro armazena transcrições com timestamps e falantes identificados.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {project.sessions.map((sess, idx) => (
                    <div key={sess.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>🎙️ {sess.title}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Data: {sess.date} • {sess.rawTranscript.length} falas registradas</span>
                      </div>
                      <button
                        onClick={() => onNavigateToView('live_room')}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        Ver Transcrição ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCodeTab === 'organize' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Organize (Método P.A.R.A.):</strong> Separação entre Projetos com prazos, Áreas de domínio, Recursos de apoio e Arquivos de aprendizado.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                    <strong style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={14} /> P • Projects (Em Andamento)
                    </strong>
                    <ul style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <li>{project.name}</li>
                      <li>{project.epics.length} Épicos ativos</li>
                    </ul>
                  </div>

                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                    <strong style={{ color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FolderTree size={14} /> A • Areas (Domínios de Produto)
                    </strong>
                    <ul style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {areas.length === 0 && <li>Nenhum domínio definido nas histórias ainda</li>}
                      {areas.map(area => <li key={area.label}>{`${area.label} (${area.stories} ${area.stories === 1 ? 'história' : 'histórias'})`}</li>)}
                    </ul>
                  </div>

                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <strong style={{ color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={14} /> R • Resources (Acervo Ágil)
                    </strong>
                    <ul style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <li>SAFe 6.0 & Flight Levels</li>
                      <li>Continuous Discovery & PBB</li>
                      <li>Prompts de IA Especialistas</li>
                    </ul>
                  </div>

                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <strong style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Archive size={14} /> A • Archives (Histórico)
                    </strong>
                    <ul style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <li>{project.decisionLog.length} Decisões no Decision Log</li>
                      <li>{`PRD versão ${project.prd.version || '—'}`}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeCodeTab === 'distill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Distill (Destilação de Valor):</strong> O Cérebro filtra centenas de palavras soltas e sintetiza o que realmente importa para a tomada de decisão.
                </p>

                {/* Sinais Destilados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeSession?.painPoints.map((pain) => (
                    <div key={pain.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '3px solid var(--accent-rose)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase' }}>
                          🔥 Dor Destilada [Severidade {pain.severity.toUpperCase()}]
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Frequência: {pain.frequencyScore}/5</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {pain.description}
                      </p>
                      {pain.quote && (
                        <span style={{ fontSize: '0.72rem', color: '#fda4af', fontStyle: 'italic' }}>
                          "{pain.quote}"
                        </span>
                      )}
                    </div>
                  ))}

                  {activeSession?.jtbds.map((jtbd) => (
                    <div key={jtbd.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid var(--accent-emerald)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        🎯 Job to Be Done (JTBD)
                      </span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        <strong>Quando</strong> {jtbd.context}, <strong>Quero</strong> {jtbd.job}, <strong>Para que</strong> {jtbd.outcome}.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCodeTab === 'express' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Express (Expressão & Entrega):</strong> Converte o conhecimento armazenado em artefatos concretos para o time de desenvolvimento.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>📦 Backlog de Engenharia (Jira / INVEST)</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{totalEpics} Épicos • {totalStories} User Stories com BDD</span>
                    </div>
                    <button
                      onClick={() => onNavigateToView('backlog')}
                      className="btn btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    >
                      Ver Backlog ➔
                    </button>
                  </div>

                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>📄 PRD Vivo & Lean Canvas</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Documento estratégico pronto para stakeholders</span>
                    </div>
                    <button
                      onClick={() => onNavigateToView('documentation')}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    >
                      Ver Documentos ➔
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synaptic AI Recommender (Conexão entre Dores e Acervo Ágil) */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Sinapses Ativas (Dores ➔ Acervo Ágil)</h3>
            </div>
            <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
              {`${synapticRecommendations.length} ${synapticRecommendations.length === 1 ? 'Recomendação' : 'Recomendações'}`}
            </span>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {synapticRecommendations.length === 0
              ? 'Ainda não há dores mapeadas nas reuniões. Quando houver, o Segundo Cérebro as cruza com o Acervo Ágil & IA e sugere um método para cada uma.'
              : <>O Segundo Cérebro cruzou as dores mapeadas nas reuniões com o <strong>Acervo Ágil & IA</strong> e sugere estes métodos:</>}
          </p>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {synapticRecommendations.map(syn => (
              <div
                key={syn.id}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{syn.badge}</span>
                  <button
                    onClick={() => onNavigateToView('knowledge_hub')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    Ver no Acervo <ExternalLink size={10} />
                  </button>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#fda4af', marginBottom: '4px' }}>
                  <strong>Dor Gatilho:</strong> "{syn.trigger}"
                </div>

                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '4px' }}>
                  🧠 Método Sugerido: {syn.method}
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {syn.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
