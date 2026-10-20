import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { AssistantOutput, MeetingSession, MeetingType } from '../types/discovery';
import { MEETING_TYPE_LABELS } from '../services/assistantService';

interface AssistantPanelProps {
  session: MeetingSession;
  onChangeType: (type: MeetingType) => void;
  onToggle: (enabled: boolean) => void;
  onRunNow: () => void;
  /** Verdadeiro enquanto uma análise manual está em andamento. */
  busy?: boolean;
}

const TYPES = Object.keys(MEETING_TYPE_LABELS) as MeetingType[];

const emptyNote: React.CSSProperties = { fontSize: '0.78rem', color: 'var(--text-dim)' };

function OutputBody({ output }: { output: AssistantOutput }) {
  if (output.answers) {
    if (output.answers.length === 0) return <p style={emptyNote}>Nenhuma pergunta foi feita a você neste trecho.</p>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {output.answers.map((a, i) => (
          <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>{a.question}</strong>
            <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{a.answer}</div>
            {a.example && <div style={{ fontSize: '0.76rem', fontStyle: 'italic', color: '#fcd34d', marginTop: '6px' }}>{a.example}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (output.topics) {
    if (output.topics.length === 0) return <p style={emptyNote}>Ainda não há conteúdo suficiente para formar tópicos.</p>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {output.topics.map(topic => (
          <div key={topic.title} role="group" aria-label={topic.title} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>{topic.title}</h4>
            <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {topic.ideas.map((idea, i) => <li key={i}>{idea}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  const probes = output.probes ?? [];
  if (probes.length === 0) return <p style={emptyNote}>Sem novas perguntas por enquanto.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {probes.map((p, i) => (
        <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span className={p.target === 'spec' ? 'badge badge-cyan' : 'badge badge-primary'} style={{ fontSize: '0.64rem', flexShrink: 0 }}>
              {p.target === 'spec' ? 'SPEC' : 'PRD'}
            </span>
            <strong style={{ fontSize: '0.82rem' }}>{p.question}</strong>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.why}</div>
        </div>
      ))}
    </div>
  );
}

/** Na sala ao vivo: o assistente que acompanha a conversa e age conforme o tipo dela. */
export const AssistantPanel: React.FC<AssistantPanelProps> = ({ session, onChangeType, onToggle, onRunNow, busy = false }) => {
  const type: MeetingType = session.type ?? 'discovery';
  const enabled = session.assistant?.enabled ?? false;
  const outputs = session.assistant?.outputs ?? [];
  const latest = outputs[outputs.length - 1];
  const previous = outputs.slice(0, -1).reverse();

  return (
    <section className="glass-panel" aria-label="Assistente da conversa" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
          <Sparkles size={16} color="var(--primary)" /> Assistente da conversa
        </h3>
        <label htmlFor="assistant-type" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipo da conversa</label>
        <select
          id="assistant-type"
          value={type}
          onChange={e => onChangeType(e.target.value as MeetingType)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.78rem' }}
        >
          {TYPES.map(t => <option key={t} value={t}>{MEETING_TYPE_LABELS[t].title}</option>)}
        </select>
        <button
          type="button"
          aria-pressed={enabled}
          onClick={() => onToggle(!enabled)}
          className="btn btn-secondary"
          style={{ padding: '4px 12px', fontSize: '0.76rem', background: enabled ? 'rgba(16, 185, 129, 0.22)' : undefined, border: enabled ? '1px solid #10b981' : undefined }}
        >
          {enabled ? 'Assistente ouvindo' : 'Ligar assistente'}
        </button>
        <button type="button" onClick={onRunNow} disabled={busy} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.76rem', gap: '6px' }}>
          {busy ? <><Loader2 size={13} className="animate-spin" /> Analisando…</> : 'Analisar agora'}
        </button>
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>{MEETING_TYPE_LABELS[type].description}</p>

      {!latest ? (
        <p style={emptyNote}>
          O assistente ainda não analisou nada nesta reunião. Ligue-o para acompanhar cada fala nova, ou use "Analisar agora".
        </p>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            <span>{new Date(latest.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            {latest.source === 'offline' && <span>Gerado por regras locais, sem IA</span>}
          </div>
          {latest.error && (
            <div role="alert" style={{ fontSize: '0.74rem', color: '#fda4af', marginBottom: '6px' }}>
              Falha ao consultar a IA ({latest.error}); mostrando o resultado das regras locais.
            </div>
          )}
          <OutputBody output={latest} />
        </div>
      )}

      {previous.length > 0 && (
        <details>
          <summary style={{ fontSize: '0.76rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Análises anteriores ({previous.length})</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {previous.map(o => <OutputBody key={o.id} output={o} />)}
          </div>
        </details>
      )}
    </section>
  );
};
