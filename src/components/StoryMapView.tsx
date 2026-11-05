import React, { useState } from 'react';
import { ArrowDownUp, CheckCircle2, LayoutGrid, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { RELEASE_LABELS } from '../services/storyMapService';
import type { MeetingSession, StoryMapCard, StoryMapRelease } from '../types/discovery';

interface StoryMapViewProps {
  session: MeetingSession;
  onAddCard: (data: { stepId: string; title: string; release: StoryMapRelease }) => void;
  onUpdateCard: (cardId: string, patch: Partial<Omit<StoryMapCard, 'id'>>) => void;
  onMoveCard: (cardId: string, target: { stepId?: string; release?: StoryMapRelease }) => void;
  onRemoveCard: (cardId: string) => void;
  onRefresh: () => void;
  onProposeBacklog: (release: StoryMapRelease | 'all') => void;
}

const RELEASES: StoryMapRelease[] = ['mvp', 'next'];

export const StoryMapView: React.FC<StoryMapViewProps> = ({
  session,
  onAddCard,
  onUpdateCard,
  onMoveCard,
  onRemoveCard,
  onRefresh,
  onProposeBacklog
}) => {
  const steps = [...session.userFlowSteps].sort((a, b) => a.stepNumber - b.stepNumber);
  const cards = session.storyMapCards ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCardTitleByStep, setNewCardTitleByStep] = useState<Record<string, string>>({});

  if (steps.length === 0) {
    return (
      <section aria-label="User Story Mapping" className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutGrid size={16} color="var(--primary)" /> User Story Mapping
          </h3>
          <button className="btn btn-secondary" onClick={onRefresh} style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '5px' }}>
            <RefreshCw size={13} /> Atualizar story map
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          A espinha do Story Map vem das etapas da Jornada do Usuário. Quando o entrevistado descrever a sequência ("primeiro…, depois…, por fim…") ou você adicionar etapas na aba Jornada, as colunas e histórias aparecerão aqui automaticamente.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="User Story Mapping" className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutGrid size={15} color="var(--primary)" /> User Story Mapping ({cards.length} {cards.length === 1 ? 'história' : 'histórias'})
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Espinha = etapas da jornada; linhas = releases. Aprovar envia para a revisão do backlog (nada altera o backlog sem seu aceite).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onRefresh} style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}>
            <RefreshCw size={12} /> Atualizar mapa
          </button>
          <button
            className="btn btn-primary"
            disabled={!cards.some(c => c.release === 'mvp')}
            onClick={() => onProposeBacklog('mvp')}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            <CheckCircle2 size={12} /> Propor MVP no backlog
          </button>
          <button
            className="btn btn-secondary"
            disabled={cards.length === 0}
            onClick={() => onProposeBacklog('all')}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            Propor tudo no backlog
          </button>
        </div>
      </div>

      {/* Espinha: cabeçalho das colunas (etapas da jornada) */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(210px, 1fr))`, gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {steps.map(step => (
          <div
            key={step.id}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.14)',
              border: '1px solid rgba(99, 102, 241, 0.35)'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c4b5fd' }}>
              {step.stepNumber}. {step.title}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Ator: {step.actor}
            </div>
          </div>
        ))}
      </div>

      {/* Faixas de release (MVP vs Depois) */}
      {RELEASES.map(release => (
        <div key={release} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '6px',
            background: release === 'mvp' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(148, 163, 184, 0.12)',
            color: release === 'mvp' ? '#6ee7b7' : '#cbd5e1',
            display: 'inline-block',
            alignSelf: 'flex-start'
          }}>
            {RELEASE_LABELS[release]}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(210px, 1fr))`, gap: '10px', overflowX: 'auto' }}>
            {steps.map((step, stepIdx) => {
              const cellCards = cards.filter(c => c.stepId === step.id && c.release === release);
              const nextRelease: StoryMapRelease = release === 'mvp' ? 'next' : 'mvp';
              const nextReleaseLabel = release === 'mvp' ? 'Depois' : 'MVP';

              return (
                <div
                  key={`${release}-${step.id}`}
                  style={{
                    minHeight: '95px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {cellCards.map(card => (
                    <div
                      key={card.id}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {editingId === card.id ? (
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (editDraft.trim()) onUpdateCard(card.id, { title: editDraft.trim() });
                            setEditingId(null);
                          }}
                          style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                        >
                          <input
                            aria-label="Editar título da história"
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid var(--primary)', background: 'rgba(15,23,42,0.9)', color: 'var(--text-main)' }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Salvar</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingId(card.id);
                            setEditDraft(card.title);
                          }}
                          title="Clique para editar o título"
                          style={{ fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', lineHeight: 1.35 }}
                        >
                          {card.title}
                        </div>
                      )}

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        Como <strong>{card.asA}</strong>, quero {card.iWantTo}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          aria-label={`Mover "${card.title}" para ${nextReleaseLabel}`}
                          onClick={() => onMoveCard(card.id, { release: nextRelease })}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.66rem', padding: '2px 6px', gap: '3px' }}
                        >
                          <ArrowDownUp size={10} /> {nextReleaseLabel}
                        </button>

                        <div style={{ display: 'flex', gap: '3px' }}>
                          {stepIdx > 0 && (
                            <button
                              type="button"
                              aria-label={`Mover "${card.title}" para etapa anterior`}
                              onClick={() => onMoveCard(card.id, { stepId: steps[stepIdx - 1].id })}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.66rem', padding: '2px 5px' }}
                            >
                              ←
                            </button>
                          )}
                          {stepIdx < steps.length - 1 && (
                            <button
                              type="button"
                              aria-label={`Mover "${card.title}" para próxima etapa`}
                              onClick={() => onMoveCard(card.id, { stepId: steps[stepIdx + 1].id })}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.66rem', padding: '2px 5px' }}
                            >
                              →
                            </button>
                          )}
                          {confirmDeleteId === card.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onRemoveCard(card.id);
                                setConfirmDeleteId(null);
                              }}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.66rem', padding: '2px 6px', color: '#fda4af' }}
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Apagar "${card.title}"`}
                              onClick={() => setConfirmDeleteId(card.id)}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.66rem', padding: '2px 5px', color: 'var(--text-dim)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {release === 'mvp' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const title = (newCardTitleByStep[step.id] ?? '').trim();
                        if (!title) return;
                        onAddCard({ stepId: step.id, title, release: 'mvp' });
                        setNewCardTitleByStep(prev => ({ ...prev, [step.id]: '' }));
                      }}
                      style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}
                    >
                      <input
                        placeholder="+ História nesta etapa…"
                        value={newCardTitleByStep[step.id] ?? ''}
                        onChange={e => setNewCardTitleByStep(prev => ({ ...prev, [step.id]: e.target.value }))}
                        style={{ flex: 1, minWidth: 0, padding: '4px 6px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15,23,42,0.75)', color: 'var(--text-main)' }}
                      />
                      <button type="submit" className="btn btn-secondary" style={{ padding: '4px 7px', fontSize: '0.7rem' }} title="Adicionar história ao MVP desta etapa">
                        <Plus size={12} />
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
};
