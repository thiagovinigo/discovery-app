import React, { useState } from 'react';
import { PRDDocument, LeanCanvas, DecisionLogEntry, MeetingSession, PersonaItem, BugReportItem, DiscoveryProject } from '../types/discovery';
import {
  FileText,
  LayoutGrid,
  History,
  CheckCircle,
  Quote,
  AlertTriangle,
  Calendar,
  UserCheck,
  ShieldAlert,
  Target,
  Clock,
  Sparkles,
  Users,
  Bug,
  Flame,
  Check,
  Bot,
  Download,
  Copy,
  FileCode
} from 'lucide-react';
import { exportService } from '../services/exportService';

interface ProjectDocumentationViewProps {
  project?: DiscoveryProject;
  activeSession?: MeetingSession;
  prd: PRDDocument;
  leanCanvas: LeanCanvas;
  decisionLog: DecisionLogEntry[];
  personas?: PersonaItem[];
  bugReports?: BugReportItem[];
}

export const ProjectDocumentationView: React.FC<ProjectDocumentationViewProps> = ({
  project,
  activeSession,
  prd,
  leanCanvas,
  decisionLog,
  personas = [],
  bugReports = []
}) => {
  const [activeTab, setActiveTab] = useState<'meeting_summary' | 'personas' | 'bugs' | 'prd' | 'ai_spec' | 'canvas' | 'decisions'>('meeting_summary');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const targetProject: DiscoveryProject = project || {
    id: 'proj-doc',
    name: prd.title || 'Discovery ao Done',
    description: prd.problemStatement || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessions: activeSession ? [activeSession] : [],
    okrs: [],
    epics: [],
    prd,
    leanCanvas,
    decisionLog,
    personas,
    bugReports
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('meeting_summary')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'meeting_summary' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'meeting_summary' ? '#a5b4fc' : 'var(--text-muted)',
              border: activeTab === 'meeting_summary' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={14} />
            Resumo da Reunião
          </button>

          <button
            onClick={() => setActiveTab('personas')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'personas' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeTab === 'personas' ? '#c4b5fd' : 'var(--text-muted)',
              border: activeTab === 'personas' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={14} />
            Personas Vivas ({personas.length})
          </button>

          <button
            onClick={() => setActiveTab('bugs')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'bugs' ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
              color: activeTab === 'bugs' ? '#fda4af' : 'var(--text-muted)',
              border: activeTab === 'bugs' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bug size={14} />
            Bugs Relatados ({bugReports.length})
          </button>

          <button
            onClick={() => setActiveTab('prd')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'prd' ? 'var(--accent-cyan-light)' : 'transparent',
              color: activeTab === 'prd' ? '#67e8f9' : 'var(--text-muted)',
              border: activeTab === 'prd' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} />
            PRD Vivo
          </button>

          <button
            onClick={() => setActiveTab('ai_spec')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'ai_spec' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              color: activeTab === 'ai_spec' ? '#67e8f9' : 'var(--text-muted)',
              border: activeTab === 'ai_spec' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bot size={14} />
            SPEC.md (Para IA)
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'canvas' ? 'var(--accent-emerald-light)' : 'transparent',
              color: activeTab === 'canvas' ? '#6ee7b7' : 'var(--text-muted)',
              border: activeTab === 'canvas' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LayoutGrid size={14} />
            Lean Canvas (9 Blocos)
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'decisions' ? 'var(--accent-amber-light)' : 'transparent',
              color: activeTab === 'decisions' ? '#fcd34d' : 'var(--text-muted)',
              border: activeTab === 'decisions' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={14} />
            Decision Log ({decisionLog.length})
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Atualizado em tempo real
        </span>
      </div>

      {/* Tab: Resumo da Reunião */}
      {activeTab === 'meeting_summary' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          {activeSession ? (
            <>
              {/* Session Meta */}
              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeSession.title}</h3>
                  <span className="badge badge-primary">{activeSession.date}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Participantes:</strong> {activeSession.participants.join(', ')}
                </p>
              </div>

              {/* TLDR */}
              <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} /> TL;DR (Resumo Executivo)
                </h4>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                  {activeSession.summary.tldr}
                </p>
              </div>

              {/* Main Takeaways */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px' }}>
                  📌 Principais Conclusões & Sinais
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeSession.summary.mainTakeaways.map((takeaway, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                      <CheckCircle size={15} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Golden Quotes */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fda4af', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Quote size={15} /> Quotes de Ouro (Frases Literais do Cliente)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeSession.summary.goldenQuotes.map((q, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '3px solid var(--accent-rose)' }}>
                      <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '4px' }}>
                        "{q.quote}"
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        — {q.speaker} • {q.context}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action items with owners */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={15} /> Próximos Passos & Donos (Action Items)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeSession.summary.actionItems.map((act, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span><strong>{act.item}</strong></span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span className="badge badge-primary">{act.owner}</span>
                        <span className="badge badge-amber">{act.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              Nenhuma sessão de reunião ativa no momento.
            </div>
          )}
        </div>
      )}

      {/* Tab: Personas Vivas (JTBD) */}
      {activeTab === 'personas' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          {personas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              Nenhuma persona mapeada ainda. Conduza entrevistas na Sala ao Vivo para alimentar o repositório de personas vivas.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {personas.map(persona => (
                <div
                  key={persona.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    borderTop: `4px solid ${persona.avatarColor || '#6366f1'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: persona.avatarColor || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}
                    >
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{persona.name}</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{persona.role}</p>
                      <span className="badge badge-primary" style={{ fontSize: '0.66rem', marginTop: '2px' }}>
                        {persona.segment}
                      </span>
                    </div>
                  </div>

                  {/* Objetivos */}
                  <div>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '6px' }}>
                      🎯 Objetivos Principais
                    </h5>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {persona.goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Dores Críticas */}
                  <div>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fda4af', textTransform: 'uppercase', marginBottom: '6px' }}>
                      🔥 Dores e Frustrações
                    </h5>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {persona.painPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  {/* JTBD */}
                  <div>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      ⚡ Jobs To Be Done (JTBD)
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {persona.jtbds.map((j, i) => (
                        <div key={i} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.08)', borderLeft: '3px solid var(--accent-cyan)', fontSize: '0.74rem' }}>
                          {j}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quotes Literais */}
                  {persona.quotes && persona.quotes.length > 0 && (
                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Quote size={11} /> "{persona.quotes[0]}"
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Bugs de Produção Relatados */}
      {activeTab === 'bugs' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fda4af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bug size={16} /> Falhas Críticas Identificadas em Entrevistas de Discovery
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Bugs relatados espontaneamente por usuários durante reuniões, separados de melhorias de produto.
              </p>
            </div>
            <span className="badge badge-rose">{bugReports.length} bugs catalogados</span>
          </div>

          {bugReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              Nenhum bug de produção relatado nas conversas.
            </div>
          ) : (
            bugReports.map(bug => (
              <div
                key={bug.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  borderLeft: `4px solid ${bug.severity === 'critical' ? '#f43f5e' : '#f59e0b'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${bug.severity === 'critical' ? 'badge-rose' : 'badge-amber'}`}>
                      {bug.severity.toUpperCase()}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{bug.title}</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <span>{bug.sessionTitle} ({bug.timestamp})</span>
                    <span className="badge badge-emerald">{bug.status}</span>
                  </div>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic', fontSize: '0.78rem', color: '#e2e8f0' }}>
                  <Quote size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-rose)' }} />
                  "{bug.quote}" — <strong>{bug.speaker}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: PRD Vivo */}
      {activeTab === 'prd' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{prd.title}</h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span className="badge badge-cyan">{prd.version}</span>
                  <span className="badge badge-primary">{prd.lastUpdated}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => exportService.downloadFile(exportService.exportToPRD(targetProject), 'PRD.md', 'text/markdown')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', gap: '6px', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#67e8f9' }}
                >
                  <Download size={13} /> Baixar PRD.md
                </button>
                <button
                  onClick={() => handleCopyText(exportService.exportToPRD(targetProject))}
                  className="btn btn-primary"
                  style={{ fontSize: '0.78rem', gap: '6px' }}
                >
                  {copiedMsg ? <Check size={13} /> : <Copy size={13} />}
                  {copiedMsg ? 'Copiado!' : 'Copiar PRD Completo'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Problema Central Validado
              </h4>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>{prd.problemStatement}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Público Alvo / Personas
                </h4>
                <p style={{ fontSize: '0.85rem' }}>{prd.targetAudience}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Proposta de Valor
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>{prd.valueProposition}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ✅ No Escopo (In-Scope)
                </h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {prd.inScope.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              </div>

              <div style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fda4af', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ❌ Fora de Escopo (Out-of-Scope)
                </h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {prd.outOfScope.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Riscos e Mitigações
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {prd.risksAndMitigations.map((rm, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', fontSize: '0.8rem' }}>
                    <div style={{ color: '#fda4af', fontWeight: 600 }}>⚠️ Risco: {rm.risk}</div>
                    <div style={{ color: '#6ee7b7' }}>🛡️ Mitigação: {rm.mitigation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SPEC.md para IA */}
      {activeTab === 'ai_spec' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color="#06b6d4" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>SPEC.md — Especificação Autônoma para Desenvolvimento por IA</h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Formato prescritivo com diretrizes de sistema, BDD Gherkin, schemas TypeScript e checklist DoR/DoD para Claude, Cursor, Antigravity e Copilot.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => exportService.downloadFile(exportService.exportToAISpec(targetProject), 'SPEC.md', 'text/markdown')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', gap: '6px', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#67e8f9' }}
                >
                  <Download size={14} /> Baixar SPEC.md
                </button>
                <button
                  onClick={() => handleCopyText(exportService.exportToAISpec(targetProject))}
                  className="btn btn-primary"
                  style={{ fontSize: '0.78rem', gap: '6px' }}
                >
                  {copiedMsg ? <Check size={14} /> : <Copy size={14} />}
                  {copiedMsg ? 'Copiado para Área de Transferência!' : 'Copiar Prompt SPEC.md para IA'}
                </button>
              </div>
            </div>

            <pre style={{ maxHeight: '420px', overflowY: 'auto', padding: '16px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#67e8f9', whiteSpace: 'pre-wrap', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              {exportService.exportToAISpec(targetProject)}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Lean Canvas */}
      {activeTab === 'canvas' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.78rem' }}>
          {/* Col 1: Problema */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="badge badge-rose" style={{ alignSelf: 'flex-start' }}>1. PROBLEMA</span>
            <ul style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {leanCanvas.problem.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <strong>Alternativas Atuais:</strong>
              <div style={{ color: 'var(--text-dim)' }}>{leanCanvas.existingAlternatives.join(', ')}</div>
            </div>
          </div>

          {/* Col 2: Solução */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="badge badge-cyan" style={{ alignSelf: 'flex-start' }}>4. SOLUÇÃO</span>
            <ul style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {leanCanvas.solution.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>8. MÉTRICAS CHAVE</span>
              <div style={{ color: 'var(--text-dim)', marginTop: '4px' }}>{leanCanvas.keyMetrics.join(', ')}</div>
            </div>
          </div>

          {/* Col 3: Proposta de Valor */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>3. PROPOSTA ÚNICA</span>
            <p style={{ fontWeight: 600, color: '#a5b4fc' }}>{leanCanvas.uniqueValueProposition}</p>
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <strong>Conceito de Alto Nível:</strong>
              <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>{leanCanvas.highLevelConcept}</div>
            </div>
          </div>

          {/* Col 4: Vantagem Injusta & Canais */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>9. VANTAGEM INJUSTA</span>
            <p style={{ color: '#6ee7b7' }}>{leanCanvas.unfairAdvantage}</p>
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>5. CANAIS</span>
              <div style={{ color: 'var(--text-dim)', marginTop: '4px' }}>{leanCanvas.channels.join(', ')}</div>
            </div>
          </div>

          {/* Col 5: Segmentos de Clientes */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>2. SEGMENTOS</span>
            <ul style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {leanCanvas.customerSegments.map((cs, i) => <li key={i}>{cs}</li>)}
            </ul>
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <strong>Early Adopters:</strong>
              <div style={{ color: 'var(--accent-amber)' }}>{leanCanvas.earlyAdopters.join(', ')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Decision Log */}
      {activeTab === 'decisions' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
          {decisionLog.map(dec => (
            <div key={dec.id} className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>{dec.decision}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-amber">{dec.status}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{dec.date}</span>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <strong>Contexto do Discovery:</strong> {dec.context}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span><strong>Originado por:</strong> {dec.driver}</span>
                <span style={{ color: '#6ee7b7' }}><strong>Impacto:</strong> {dec.consequences}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
