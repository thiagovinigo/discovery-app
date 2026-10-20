import React, { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Epic } from '../types/discovery';
import { contestedItems, validationSummary } from '../services/backlogItemService';
import { verifyBacklog } from '../services/verificationService';
import { findDuplicateStories } from '../services/backlogProposals';

interface BacklogHealthPanelProps {
  epics: Epic[];
  /** Procura nas reuniões falas que confirmam ou contestam itens do backlog. */
  onFindEvidence?: () => void;
  /** O que a última mudança do backlog fez; o botão de desfazer só aparece com isto e com `onUndo`. */
  undoLabel?: string;
  onUndo?: () => void;
  /** Abre o fatiamento de uma história grande demais. */
  onSliceStory?: (storyId: string) => void;
  /** Junta uma história duplicada (`dropId`) em outra (`keepId`). */
  onMergeDuplicate?: (keepId: string, dropId: string) => void;
}

const cardStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)' };

/** No backlog: quanto dele já foi validado em reunião e quanto está pronto para dev, com as lacunas à vista. */
export const BacklogHealthPanel: React.FC<BacklogHealthPanelProps> = ({ epics, onFindEvidence, undoLabel, onUndo, onSliceStory, onMergeDuplicate }) => {
  const validation = useMemo(() => validationSummary(epics), [epics]);
  const duplicates = useMemo(() => (onMergeDuplicate ? findDuplicateStories(epics) : []), [epics, onMergeDuplicate]);
  const verification = useMemo(() => verifyBacklog(epics), [epics]);
  const contested = useMemo(() => contestedItems(epics), [epics]);

  if (validation.total === 0) return null;

  const withGaps = verification.stories.filter(s => s.gaps.length > 0);
  const counters: [string, number][] = [
    ['Hipóteses', validation.hypothesis],
    ['Validados', validation.validated],
    ['Contestados', validation.contested],
    ['Invalidados', validation.invalidated]
  ];

  return (
    <section className="glass-panel" aria-label="Saúde do backlog" style={{ padding: '12px 14px', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ShieldCheck size={15} color="var(--primary)" /> Saúde do backlog
      </h3>

      <div aria-label="Validação do backlog" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {counters.map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '8px' }}>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {(onFindEvidence || (onUndo && undoLabel)) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onFindEvidence && (
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={onFindEvidence}>
              Buscar evidências nas reuniões
            </button>
          )}
          {onUndo && undoLabel && (
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={onUndo}>
              {`Desfazer: ${undoLabel}`}
            </button>
          )}
        </div>
      )}

      {verification.stories.length > 0 && (
        <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700 }}>
          {`${verification.ready} de ${verification.stories.length} histórias prontas para dev`}
        </p>
      )}

      {duplicates.length > 0 && onMergeDuplicate && (
        <ul aria-label="Histórias duplicadas" style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem' }}>
          {duplicates.map(d => (
            <li key={`${d.keepId}-${d.dropId}`}>
              {`Possível duplicada de "${d.title}" `}
              <button type="button" className="btn btn-secondary" style={{ padding: '2px 10px', fontSize: '0.72rem' }} onClick={() => onMergeDuplicate(d.keepId, d.dropId)}>
                {`Mesclar duplicada de "${d.title}"`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {contested.length > 0 && (
        <ul aria-label="Itens contestados" style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#fcd34d' }}>
          {contested.map(item => (
            <li key={`${item.level}-${item.title}`}>
              {`Contestado (${item.level}): ${item.title}`}
              {item.quote && ` — "${item.quote}"`}
              {item.sessionTitle && ` (${item.sessionTitle})`}
            </li>
          ))}
        </ul>
      )}

      {withGaps.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>{`Histórias com lacunas (${withGaps.length})`}</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {withGaps.map(s => (
              <div key={s.storyId} role="group" aria-label={s.title} style={cardStyle}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.82rem' }}>{s.title}</strong>
                  {onSliceStory && s.gaps.some(g => g.code === 'too-big') && (
                    <button type="button" className="btn btn-secondary" style={{ padding: '2px 10px', fontSize: '0.72rem' }} onClick={() => onSliceStory(s.storyId)}>
                      {`Fatiar "${s.title}"`}
                    </button>
                  )}
                </div>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '0.76rem' }}>
                  {s.gaps.map((gap, i) => (
                    <li key={i} style={{ color: gap.severity === 'blocker' ? '#fda4af' : 'var(--text-muted)' }}>
                      {gap.severity === 'blocker' ? `Bloqueia: ${gap.message}` : gap.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};
