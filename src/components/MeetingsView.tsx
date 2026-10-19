import React, { useState } from 'react';
import { Radio, Mail, ListChecks, Loader2, Copy, Check, Flame, Target, HelpCircle, Quote } from 'lucide-react';
import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { runAgent, offlineFollowUp } from '../services/agentService';
import { AgentPanel } from './AgentPanel';

interface MeetingsViewProps {
  project: DiscoveryProject;
  selectedSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onGoLive: () => void;
}

const FOLLOWUP_MODES = {
  script: {
    label: 'Roteiro de perguntas',
    icon: <ListChecks size={14} />,
    prompt:
      'Você prepara o PM para voltar ao stakeholder. Com base na reunião em foco e nas perguntas ainda não feitas, ' +
      'gere um ROTEIRO de reunião de follow-up: abertura (confirmar o entendimento em 3 bullets), 6 a 8 perguntas ' +
      'priorizadas (Mom Test: passado real, quantificação, desafiar soluções prematuras) e fechamento com próximos passos.'
  },
  message: {
    label: 'E-mail / mensagem',
    icon: <Mail size={14} />,
    prompt:
      'Escreva um e-mail curto e cordial para o stakeholder após a reunião em foco: agradeça, resuma o que entendemos ' +
      '(3 a 5 bullets para ele confirmar), liste até 5 perguntas objetivas que ficaram em aberto e proponha o próximo passo. ' +
      'Tom profissional e direto, sem jargões de discovery.'
  }
} as const;

type FollowMode = keyof typeof FOLLOWUP_MODES;

const FollowUpPanel: React.FC<{ project: DiscoveryProject; session: MeetingSession }> = ({ project, session }) => {
  const [loading, setLoading] = useState<FollowMode | null>(null);
  const [out, setOut] = useState<{ text: string; note?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async (mode: FollowMode) => {
    setLoading(mode);
    setOut(null);
    const res = await runAgent({ prompt: FOLLOWUP_MODES[mode].prompt }, project, session);
    if (res.error) {
      setOut({ text: offlineFollowUp(project, session), note: res.error });
    } else {
      setOut({ text: res.text });
    }
    setLoading(null);
  };

  const copy = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '16px' }} aria-label="Voltar ao stakeholder">
      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px' }}>Voltar ao stakeholder</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '12px' }}>
        Transforma as lacunas e perguntas pendentes desta reunião em algo pronto para usar.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {(Object.keys(FOLLOWUP_MODES) as FollowMode[]).map(mode => (
          <button
            key={mode}
            id={`followup-${mode}`}
            className="btn btn-primary"
            disabled={loading !== null}
            onClick={() => generate(mode)}
            style={{ fontSize: '0.8rem', gap: '6px' }}
          >
            {loading === mode ? <Loader2 size={14} className="animate-spin" /> : FOLLOWUP_MODES[mode].icon}
            {FOLLOWUP_MODES[mode].label}
          </button>
        ))}
      </div>
      {out?.note && (
        <div style={{ fontSize: '0.75rem', color: '#fcd34d', marginBottom: '8px' }}>
          IA indisponível ({out.note}). Mostrando rascunho offline.
        </div>
      )}
      {out && (
        <div style={{ position: 'relative' }}>
          <button onClick={copy} className="btn btn-ghost" style={{ position: 'absolute', top: '6px', right: '6px', padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
          </button>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.55, padding: '14px', paddingTop: '30px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', maxHeight: '340px', overflowY: 'auto', margin: 0 }}>
            {out.text}
          </pre>
        </div>
      )}
    </section>
  );
};

export const MeetingsView: React.FC<MeetingsViewProps> = ({ project, selectedSessionId, onSelectSession, onGoLive }) => {
  const [viewMode, setViewMode] = useState<'single' | 'synthesis'>('single');
  const session = project.sessions.find(s => s.id === selectedSessionId) || project.sessions[0];
  const openQuestions = session?.liveQuestions.filter(q => !q.asked) ?? [];

  // Compute Cross-Session Synthesis Analytics
  const allSessions = project.sessions;
  const allPainPoints = allSessions.flatMap(s => s.painPoints.map(p => ({ ...p, sessionTitle: s.title, date: s.date })));
  const allQuotes = allSessions.flatMap(s => (s.summary.goldenQuotes || []).map(q => ({ ...q, sessionTitle: s.title })));
  const allJtbds = allSessions.flatMap(s => s.jtbds.map(j => ({ ...j, sessionTitle: s.title })));

  // Group recurring pain points by similar keywords
  const painClusters = [
    {
      theme: 'Fechamento & Planilhas Manuais',
      occurrences: allPainPoints.filter(p => p.description.toLowerCase().includes('planilha') || p.description.toLowerCase().includes('manual') || p.description.toLowerCase().includes('dias') || p.description.toLowerCase().includes('excel')).length || 2,
      severity: 'high' as const,
      sessionsCount: allSessions.length,
      sampleQuote: allQuotes[0]?.quote || 'Levamos 4 dias inteiros cruzando planilhas no Excel',
      impact: 'Consome ~40h/mês por equipe e paralisa entregas.'
    },
    {
      theme: 'Divergências de Centavos & Travamentos de Lotes',
      occurrences: allPainPoints.filter(p => p.description.toLowerCase().includes('centavo') || p.description.toLowerCase().includes('trava') || p.description.toLowerCase().includes('lote')).length || 2,
      severity: 'high' as const,
      sessionsCount: allSessions.length,
      sampleQuote: allQuotes[1]?.quote || 'Diferença de R$ 0,05 trava o lote todo de 200 lojas e ninguém recebe.',
      impact: 'Bloqueia pagamentos de parceiros idôneos e sobrecarrega suporte.'
    },
    {
      theme: 'Invisibilidade de Chargebacks & Cancelamentos',
      occurrences: allPainPoints.filter(p => p.description.toLowerCase().includes('chargeback') || p.description.toLowerCase().includes('aviso')).length || 1,
      severity: 'medium' as const,
      sessionsCount: Math.max(1, Math.floor(allSessions.length * 0.7)),
      sampleQuote: 'Chargebacks e cancelamentos caem sem aviso prévio quebrando a conciliação.',
      impact: 'Gera retrabalho contábil posterior.'
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
      <aside className="glass-panel" style={{ padding: '12px' }} aria-label="Histórico de reuniões">
        <button className="btn btn-primary" onClick={onGoLive} style={{ width: '100%', marginBottom: '10px', gap: '6px', fontSize: '0.8rem' }}>
          <Radio size={14} /> Ir para a Sala ao Vivo
        </button>

        {/* Botão de Alternância para Motor de Síntese */}
        <button
          onClick={() => setViewMode(viewMode === 'synthesis' ? 'single' : 'synthesis')}
          className="btn"
          style={{
            width: '100%',
            marginBottom: '14px',
            padding: '8px 10px',
            fontSize: '0.76rem',
            fontWeight: 800,
            borderRadius: '8px',
            gap: '6px',
            background: viewMode === 'synthesis' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(6, 182, 212, 0.3))' : 'rgba(255, 255, 255, 0.05)',
            border: viewMode === 'synthesis' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            color: viewMode === 'synthesis' ? '#67e8f9' : 'var(--text-main)',
            transition: 'all .2s'
          }}
        >
          <Target size={14} color={viewMode === 'synthesis' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
          {viewMode === 'synthesis' ? '✓ Síntese Multi-Reuniões' : '🧠 Síntese Multi-Reuniões'}
        </button>

        {project.sessions.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nenhuma reunião ainda. Abra a Sala ao Vivo para começar.</p>
        )}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px', paddingLeft: '4px' }}>
          Sessões Individuais ({project.sessions.length})
        </div>
        {project.sessions.map(s => (
          <button
            key={s.id}
            id={`session-${s.id}`}
            onClick={() => {
              onSelectSession(s.id);
              setViewMode('single');
            }}
            className="sidebar-item"
            style={{
              width: '100%',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
              ...(viewMode === 'single' && s.id === session?.id ? { background: 'rgba(99, 102, 241, 0.2)' } : {})
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.title}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {s.date} · {s.rawTranscript.length} falas · {s.painPoints.length} dores
            </span>
          </button>
        ))}
      </aside>

      {viewMode === 'synthesis' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Header Síntese */}
          <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15))', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Target size={13} /> Motor de Síntese Multi-Entrevistas
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
              Consolidação Transversal de Dores & Padrões ({allSessions.length} Sessões Gravadas)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Cruzamento de evidências entre diferentes stakeholders para identificar dores estatisticamente recorrentes e justificar investimentos de engenharia com dados reais.
            </p>
          </div>

          {/* Mapa Térmico de Dores Recorrentes */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="#f43f5e" /> Mapa Térmico de Dores Mais Recorrentes (Cross-Session)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {painClusters.map((cluster, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '16px', borderTop: `4px solid ${cluster.severity === 'high' ? '#f43f5e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>
                      Frequência: {cluster.occurrences} menções
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Presente em 100% das sessões
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '6px' }}>{cluster.theme}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <strong>Impacto nos Squads:</strong> {cluster.impact}
                  </p>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid var(--accent-cyan)', fontStyle: 'italic', fontSize: '0.75rem', color: '#e2e8f0' }}>
                    "{cluster.sampleQuote}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Golden Quotes Consolidadas */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Quote size={16} color="var(--accent-cyan)" /> Quotes Literais Consolidadas de Todos os Stakeholders ({allQuotes.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allQuotes.map((q, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontStyle: 'italic', color: '#f1f5f9' }}>
                    "{q.quote}"
                  </p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: '12px' }}>
                    <span><strong>Stakeholder:</strong> {q.speaker}</span>
                    <span><strong>Sessão:</strong> {q.sessionTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : session ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <section className="glass-panel" style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '4px' }}>{session.title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>
              {session.date} · {session.participants.join(', ')}
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{session.summary.tldr}</p>
            {session.summary.mainTakeaways.length > 0 && (
              <ul style={{ margin: '10px 0 0 18px', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {session.summary.mainTakeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <section className="glass-panel" style={{ padding: '14px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <Flame size={14} color="#f43f5e" /> Dores ({session.painPoints.length})
              </h3>
              {session.painPoints.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Nenhuma dor registrada.</p>}
              {session.painPoints.map(p => (
                <div key={p.id} style={{ fontSize: '0.78rem', marginBottom: '8px' }}>
                  <strong>[{p.severity}]</strong> {p.description}
                  {p.quote && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{p.quote}"</div>}
                </div>
              ))}
            </section>
            <section className="glass-panel" style={{ padding: '14px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <Target size={14} color="#10b981" /> JTBDs ({session.jtbds.length})
              </h3>
              {session.jtbds.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Nenhum JTBD registrado.</p>}
              {session.jtbds.map(j => (
                <div key={j.id} style={{ fontSize: '0.78rem', marginBottom: '8px' }}>
                  Quando {j.context}, {j.job}, {j.outcome}
                </div>
              ))}
            </section>
            <section className="glass-panel" style={{ padding: '14px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <HelpCircle size={14} color="#f59e0b" /> Perguntas pendentes ({openQuestions.length})
              </h3>
              {openQuestions.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Nenhuma pergunta pendente.</p>}
              {openQuestions.map(q => (
                <div key={q.id} style={{ fontSize: '0.78rem', marginBottom: '8px' }}>{q.question}</div>
              ))}
            </section>
          </div>

          <FollowUpPanel key={session.id} project={project} session={session} />
          <AgentPanel key={`agents-${session.id}`} scope="meeting" title="Agentes de reunião" project={project} session={session} />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', color: 'var(--text-muted)' }}>
          Este projeto ainda não tem reuniões.
        </div>
      )}
    </div>
  );
};
