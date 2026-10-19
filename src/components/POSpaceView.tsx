import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { ChatMessage, chatWithProject } from '../services/agentService';
import { AgentPanel } from './AgentPanel';

interface POSpaceViewProps {
  project: DiscoveryProject;
  session?: MeetingSession;
}

const SHORTCUTS = [
  'Reescreva a história mais fraca do backlog seguindo INVEST.',
  'Quais riscos eu ainda não validei com o stakeholder?',
  'Crie critérios de aceite Given/When/Then para a primeira feature.',
  'Me ajude a preparar a próxima entrevista.',
  'Quais dores das reuniões ainda não viraram backlog?'
];

const storageKey = (projectId: string) => `discovery_done_po_chat_${projectId}`;

const loadHistory = (projectId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const POSpaceView: React.FC<POSpaceViewProps> = ({ project, session }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(project.id));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory(project.id));
    setError(null);
  }, [project.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(project.id), JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage cheio */
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, project.id]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text: content }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    const res = await chatWithProject(next.slice(-12), project, session);
    setLoading(false);
    if (res.error) setError(res.error);
    else setMessages([...next, { role: 'assistant', text: res.text }]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
      <section className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)', minHeight: '480px' }} aria-label="Chat com a IA">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Sparkles size={18} color="var(--primary)" /> Espaço do PO
          </h2>
          {messages.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', gap: '4px' }} onClick={() => setMessages([])}>
              <Trash2 size={13} /> Limpar conversa
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <p style={{ marginBottom: '10px' }}>
                Converse com a IA usando o contexto de <strong>{project.name}</strong> (reuniões, backlog e PRD). Comece por um atalho:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SHORTCUTS.map(s => (
                  <button key={s} className="btn btn-secondary" style={{ textAlign: 'left', fontSize: '0.78rem', justifyContent: 'flex-start' }} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: m.role === 'user' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Loader2 size={14} className="animate-spin" /> Pensando…
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af' }}>
              {error}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            send(input);
          }}
          style={{ display: 'flex', gap: '8px', marginTop: '10px' }}
        >
          <input
            id="po-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pergunte ou peça algo sobre o projeto…"
            style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
          />
          <button id="po-chat-send" type="submit" className="btn btn-primary" disabled={loading || !input.trim()} style={{ gap: '6px' }}>
            <Send size={14} /> Enviar
          </button>
        </form>
      </section>

      <AgentPanel scope="general" title="Agentes do PO" project={project} session={session} />
    </div>
  );
};
