import React, { useState } from 'react';
import { Bot, Copy, Check, Loader2, Play } from 'lucide-react';
import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { AgentScope, ProjectAgent, agentsByScope, runAgent } from '../services/agentService';

interface AgentPanelProps {
  scope: AgentScope;
  title: string;
  project: DiscoveryProject;
  session?: MeetingSession;
  /** Altura máxima da área de resultado */
  resultMaxHeight?: number;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ scope, title, project, session, resultMaxHeight = 360 }) => {
  const agents = agentsByScope(scope);
  const [activeAgent, setActiveAgent] = useState<ProjectAgent | null>(null);
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (agent: ProjectAgent) => {
    setActiveAgent(agent);
    setLoading(true);
    setResult(null);
    const res = await runAgent(agent, project, session, extra.trim() || undefined);
    setResult(res);
    setLoading(false);
  };

  const copy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '16px' }} aria-label={title}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Bot size={16} color="var(--accent-cyan)" /> {title}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        {agents.map(a => (
          <button
            key={a.id}
            id={`agent-${a.id}`}
            onClick={() => run(a)}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '4px',
              padding: '10px 12px',
              borderColor: activeAgent?.id === a.id ? 'var(--primary)' : undefined
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Play size={11} /> {a.name}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{a.description}</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={extra}
        onChange={e => setExtra(e.target.value)}
        placeholder="Instrução extra opcional (ex.: foque no módulo de conciliação)"
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: 'var(--text-main)',
          fontSize: '0.8rem',
          outline: 'none',
          marginBottom: '10px'
        }}
      />

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <Loader2 size={14} className="animate-spin" /> {activeAgent?.name} está analisando o projeto…
        </div>
      )}

      {result?.error && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af' }}>
          {result.error}
        </div>
      )}

      {result?.text && (
        <div style={{ position: 'relative' }}>
          <button onClick={copy} className="btn btn-ghost" style={{ position: 'absolute', top: '6px', right: '6px', padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
          </button>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              lineHeight: 1.55,
              padding: '14px',
              paddingTop: '30px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              maxHeight: `${resultMaxHeight}px`,
              overflowY: 'auto',
              margin: 0
            }}
          >
            {result.text}
          </pre>
        </div>
      )}
    </section>
  );
};
