import React, { useMemo } from 'react';
import { Check, CircleDashed, HelpCircle, Layers } from 'lucide-react';
import {
  AGENDA_STATUS_LABELS,
  DOUBT_KIND_LABELS,
  buildLiveAgenda,
  extractDoubts
} from '../services/agendaDoubtService';
import type { AgendaItemStatus } from '../services/agendaDoubtService';
import type { TopicCoverage } from '../services/topicService';
import type { MeetingSession } from '../types/discovery';

interface TopicsPanelProps {
  session: MeetingSession;
}

const DIMENSIONS: { key: keyof TopicCoverage; label: string }[] = [
  { key: 'example', label: 'Caso real' },
  { key: 'impact', label: 'Impacto' },
  { key: 'frequency', label: 'Frequência' },
  { key: 'alternative', label: 'Alternativa' }
];

const STATUS_STYLE: Record<AgendaItemStatus, { color: string; bg: string }> = {
  pending: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' },
  in_progress: { color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.14)' },
  covered: { color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.14)' },
  decided: { color: '#c4b5fd', bg: 'rgba(139, 92, 246, 0.2)' }
};

/** Pauta viva (tópicos com status que evolui sozinho) e lista de dúvidas abertas/resolvidas da conversa. */
export const TopicsPanel: React.FC<TopicsPanelProps> = ({ session }) => {
  const items = useMemo(() => buildLiveAgenda(session), [session]);
  const doubts = useMemo(() => extractDoubts(session), [session]);
  const openDoubts = doubts.filter(d => d.status === 'open');
  const resolvedDoubts = doubts.filter(d => d.status === 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <section aria-label="Tópicos da conversa" className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--accent-violet)" />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Pauta viva & Tópicos da conversa</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
        </div>

        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Os assuntos aparecem aqui conforme o entrevistado fala, com o status da pauta e o que já foi coberto em cada um.
          </p>
        ) : (
          <ul role="list" style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(item => {
              const badge = STATUS_STYLE[item.status];
              return (
                <li key={item.id} aria-label={item.title} style={{ listStyle: 'none', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.82rem' }}>{item.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 7px', borderRadius: '999px', color: badge.color, background: badge.bg }}>
                        {AGENDA_STATUS_LABELS[item.status]}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{item.mentions} {item.mentions === 1 ? 'fala' : 'falas'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {DIMENSIONS.map(({ key, label }) => {
                      const covered = item.coverage[key];
                      return (
                        <span
                          key={key}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.66rem', padding: '1px 7px', borderRadius: '999px', color: covered ? '#6ee7b7' : '#fcd34d', background: covered ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}
                        >
                          {covered ? <Check size={10} /> : <CircleDashed size={10} />}
                          {label}: {covered ? 'coberto' : 'falta'}
                        </span>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {doubts.length > 0 && (
        <section aria-label="Dúvidas da conversa" className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={15} color="#fcd34d" />
            <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700 }}>Dúvidas da conversa</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{openDoubts.length} em aberto</span>
          </div>

          {openDoubts.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Todas as dúvidas levantadas até agora foram esclarecidas na conversa.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {openDoubts.map(d => (
                <li key={d.id} style={{ listStyle: 'none', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.28)', background: 'rgba(245, 158, 11, 0.06)', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#fcd34d' }}>{DOUBT_KIND_LABELS[d.kind]}</span>
                    {d.sourceTimestamp && <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>{d.sourceTimestamp}</span>}
                  </div>
                  <div>{d.text}</div>
                </li>
              ))}
            </ul>
          )}

          {resolvedDoubts.length > 0 && (
            <details style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#6ee7b7' }}>
                Resolvidas ({resolvedDoubts.length})
              </summary>
              <ul style={{ margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {resolvedDoubts.map(d => (
                  <li key={d.id} style={{ listStyle: 'none', padding: '6px 9px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.22)' }}>
                    <div style={{ textDecoration: 'line-through', color: 'var(--text-dim)' }}>{d.text}</div>
                    {d.resolvedAnswer && (
                      <div style={{ marginTop: '3px', color: 'var(--text-main)' }}>
                        <strong>Esclarecido ({d.resolvedTimestamp}):</strong> {d.resolvedAnswer}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
};
