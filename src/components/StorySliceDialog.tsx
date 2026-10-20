import React, { useMemo, useState } from 'react';
import { Scissors } from 'lucide-react';
import type { UserStory } from '../types/discovery';
import { suggestStorySlices, validateStorySlice } from '../services/slicingService';
import type { StorySlicePart } from '../services/slicingService';

interface StorySliceDialogProps {
  story: UserStory;
  onConfirm: (parts: StorySlicePart[]) => void;
  onCancel: () => void;
}

const fieldStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.82rem'
};
const smallButton: React.CSSProperties = { padding: '4px 12px', fontSize: '0.78rem' };

/** Fatiar uma história: o app sugere uma filha por critério de aceite; o usuário ajusta títulos e pontos e confere antes. */
export const StorySliceDialog: React.FC<StorySliceDialogProps> = ({ story, onConfirm, onCancel }) => {
  const [parts, setParts] = useState<StorySlicePart[]>(() => suggestStorySlices(story));
  const errors = useMemo(() => validateStorySlice(story, parts), [story, parts]);

  const update = (index: number, changes: Partial<StorySlicePart>) =>
    setParts(current => current.map((part, i) => (i === index ? { ...part, ...changes } : part)));

  const scenarioOf = (id: string) => story.acceptanceCriteria.find(c => c.id === id)?.scenario ?? id;
  const taskOf = (id: string) => story.tasks.find(t => t.id === id)?.title ?? id;

  return (
    <section className="glass-panel" aria-label="Fatiar história" style={{ padding: '14px', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Scissors size={16} color="var(--primary)" /> {`Fatiar: ${story.title}`}
      </h3>

      {parts.length === 0 ? (
        <>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            Para fatiar por aqui a história precisa ter ao menos 2 critérios de aceite: cada filha leva um ou mais critérios. Complete os critérios e tente de novo.
          </p>
          <div>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-dim)' }}>
            Cada parte vira uma história nova no lugar desta, guardando de onde veio. Nenhum critério ou task se perde, e os pontos precisam somar{' '}
            {story.storyPoints !== undefined ? story.storyPoints : 'o total (a história não tem pontos)'}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parts.map((part, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input aria-label={`Título da parte ${i + 1}`} value={part.title} onChange={e => update(i, { title: e.target.value })} style={{ ...fieldStyle, flex: '1 1 260px' }} />
                  {story.storyPoints !== undefined && (
                    <input
                      aria-label={`Pontos da parte ${i + 1}`}
                      type="number"
                      min={0}
                      value={part.storyPoints ?? 0}
                      onChange={e => update(i, { storyPoints: Number(e.target.value) })}
                      style={{ ...fieldStyle, width: '80px' }}
                    />
                  )}
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {part.criteriaIds.map(id => <li key={id}>{scenarioOf(id)}</li>)}
                  {part.taskIds.map(id => <li key={id}>{`Task: ${taskOf(id)}`}</li>)}
                </ul>
              </div>
            ))}
          </div>

          {errors.length > 0 && (
            <div role="alert" style={{ fontSize: '0.78rem', color: '#fda4af' }}>
              {errors.map(e => <div key={e}>{e}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" style={smallButton} disabled={errors.length > 0} onClick={() => onConfirm(parts)}>Fatiar história</button>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      )}
    </section>
  );
};
