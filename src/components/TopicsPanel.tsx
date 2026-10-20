import React, { useMemo } from 'react';
import { Check, CircleDashed, Layers } from 'lucide-react';
import { extractTopics } from '../services/topicService';
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

/** Os assuntos que a conversa já tem e, em cada um, o que ainda falta perguntar. */
export const TopicsPanel: React.FC<TopicsPanelProps> = ({ session }) => {
  const topics = useMemo(() => extractTopics(session), [session]);

  return (
    <section aria-label="Tópicos da conversa" className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={16} color="var(--accent-violet)" />
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Tópicos da conversa</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{topics.length} {topics.length === 1 ? 'assunto' : 'assuntos'}</span>
      </div>

      {topics.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Os assuntos aparecem aqui conforme o entrevistado fala, com o que já foi coberto em cada um.
        </p>
      ) : (
        <ul role="list" style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topics.map(topic => (
            <li key={topic.id} aria-label={topic.title} style={{ listStyle: 'none', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '0.82rem' }}>{topic.title}</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{topic.mentions} {topic.mentions === 1 ? 'fala' : 'falas'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {DIMENSIONS.map(({ key, label }) => {
                  const covered = topic.coverage[key];
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
          ))}
        </ul>
      )}
    </section>
  );
};
