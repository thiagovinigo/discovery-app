import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Flame, Lightbulb, Pencil, Plus, Quote, RefreshCw, Trash2, Workflow } from 'lucide-react';
import type { UserFlowStep } from '../types/discovery';
import type { StepPatch } from '../services/journeyService';

type Friction = UserFlowStep['frictionLevel'];

interface UserFlowViewProps {
  steps: UserFlowStep[];
  onAdd: (step: Pick<UserFlowStep, 'title' | 'actor' | 'frictionLevel'>) => void;
  onUpdate: (stepId: string, patch: StepPatch) => void;
  onRemove: (stepId: string) => void;
  onMove: (stepId: string, direction: 'up' | 'down') => void;
  /** Refaz a jornada com o que a conversa tem agora, sem IA. */
  onRefresh?: () => void;
}

const FRICTION: Record<Friction, { label: string; color: string; height: number }> = {
  smooth: { label: 'Fluido', color: '#10b981', height: 12 },
  warning: { label: 'Atenção', color: '#f59e0b', height: 32 },
  critical: { label: 'Crítico', color: '#f43f5e', height: 52 }
};

const DEFAULT_ACTOR = 'Entrevistado';
const CARD_WIDTH = 230;
const CURVE_STEP = 60;

const field: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.76rem', boxSizing: 'border-box'
};

/** A linha que sobe onde a pessoa sofre e desce onde o caminho flui. */
const FrictionCurve: React.FC<{ steps: UserFlowStep[] }> = ({ steps }) => {
  if (steps.length < 2) return null;
  const width = (steps.length - 1) * CURVE_STEP + 24;
  const points = steps.map((s, i) => `${12 + i * CURVE_STEP},${64 - FRICTION[s.frictionLevel].height}`).join(' ');
  return (
    <svg aria-hidden="true" width={width} height={70} style={{ maxWidth: '100%' }}>
      <polyline points={points} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
      {steps.map((s, i) => (
        <circle key={s.id} cx={12 + i * CURVE_STEP} cy={64 - FRICTION[s.frictionLevel].height} r={5} fill={FRICTION[s.frictionLevel].color} />
      ))}
    </svg>
  );
};

interface CardProps {
  step: UserFlowStep;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: UserFlowViewProps['onUpdate'];
  onRemove: UserFlowViewProps['onRemove'];
  onMove: UserFlowViewProps['onMove'];
}

const StepCard: React.FC<CardProps> = ({ step, isFirst, isLast, onUpdate, onRemove, onMove }) => {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [friction, setFriction] = useState<Friction>(step.frictionLevel);
  const [pain, setPain] = useState(step.painPointDetected ?? '');
  const [opportunity, setOpportunity] = useState(step.opportunity ?? '');
  const tone = FRICTION[step.frictionLevel];

  const save = () => {
    onUpdate(step.id, {
      title: title.trim(),
      frictionLevel: friction,
      painPointDetected: pain.trim() || undefined,
      opportunity: opportunity.trim() || undefined
    });
    setEditing(false);
  };

  return (
    <li
      aria-label={`Etapa ${step.stepNumber}: ${step.title}`}
      style={{ listStyle: 'none', flex: `0 0 ${CARD_WIDTH}px`, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${tone.color}66`, borderTop: `4px solid ${tone.color}`, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>{step.stepNumber}</span>
        <span style={{ color: tone.color, fontWeight: 700, fontSize: '0.7rem' }}>{tone.label}</span>
      </div>

      {editing ? (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>Título da etapa
            <input style={field} value={title} onChange={e => setTitle(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>Fricção
            <select style={field} value={friction} onChange={e => setFriction(e.target.value as Friction)}>
              {(Object.keys(FRICTION) as Friction[]).map(level => <option key={level} value={level}>{FRICTION[level].label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>Dor percebida
            <input style={field} value={pain} onChange={e => setPain(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>Oportunidade
            <input style={field} value={opportunity} onChange={e => setOpportunity(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} disabled={!title.trim()} onClick={save}>Salvar etapa</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <strong style={{ fontSize: '0.84rem', lineHeight: 1.3 }}>{step.title}</strong>
          <span style={{ color: 'var(--text-muted)' }}>{step.actor}</span>
          {step.painPointDetected && (
            <p style={{ margin: 0, display: 'flex', gap: '5px', color: '#fda4af', lineHeight: 1.35 }}><Flame size={12} style={{ flexShrink: 0, marginTop: 2 }} />{step.painPointDetected}</p>
          )}
          {step.opportunity && (
            <p style={{ margin: 0, display: 'flex', gap: '5px', color: '#c4b5fd', lineHeight: 1.35 }}><Lightbulb size={12} style={{ flexShrink: 0, marginTop: 2 }} />{step.opportunity}</p>
          )}
          {step.quote && (
            <p style={{ margin: 0, display: 'flex', gap: '5px', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.35 }}><Quote size={12} style={{ flexShrink: 0, marginTop: 2 }} />{step.quote}</p>
          )}
          <div style={{ display: 'flex', gap: '4px', marginTop: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" style={{ padding: '3px' }} aria-label="Mover para antes" disabled={isFirst} onClick={() => onMove(step.id, 'up')}><ArrowLeft size={13} /></button>
            <button className="btn btn-ghost" style={{ padding: '3px' }} aria-label="Mover para depois" disabled={isLast} onClick={() => onMove(step.id, 'down')}><ArrowRight size={13} /></button>
            <button className="btn btn-ghost" style={{ padding: '3px' }} aria-label="Editar etapa" onClick={() => setEditing(true)}><Pencil size={13} /></button>
            {confirming ? (
              <button className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#fda4af' }} aria-label="Confirmar: apagar etapa" onClick={() => { onRemove(step.id); setConfirming(false); }}>Apagar?</button>
            ) : (
              <button className="btn btn-ghost" style={{ padding: '3px', color: '#fda4af' }} aria-label="Apagar etapa" onClick={() => setConfirming(true)}><Trash2 size={13} /></button>
            )}
          </div>
        </>
      )}
    </li>
  );
};

export const UserFlowView: React.FC<UserFlowViewProps> = ({ steps, onAdd, onUpdate, onRemove, onMove, onRefresh }) => {
  const [newTitle, setNewTitle] = useState('');
  const critical = steps.filter(s => s.frictionLevel === 'critical').length;
  const warning = steps.filter(s => s.frictionLevel === 'warning').length;

  const add = () => {
    if (!newTitle.trim()) return;
    onAdd({ title: newTitle.trim(), actor: DEFAULT_ACTOR, frictionLevel: 'smooth' });
    setNewTitle('');
  };

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '320px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Workflow size={18} color="var(--accent-cyan, #06b6d4)" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Jornada do usuário</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>{critical} {critical === 1 ? 'crítica' : 'críticas'}</span> · <span>{warning} com atenção</span> · {steps.length} etapas
            </span>
          </div>
        </div>
        {onRefresh && (
          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={onRefresh} title="Refaz a jornada com a sequência que o entrevistado contou, sem IA">
            <RefreshCw size={12} /> Atualizar jornada
          </button>
        )}
      </div>

      {steps.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          A jornada nasce quando o entrevistado conta o passo a passo: frases como “primeiro eu…, depois…, por fim…” viram etapas, com a fricção de cada uma. Você também pode adicionar etapas abaixo.
        </p>
      ) : (
        <>
          <FrictionCurve steps={steps} />
          <ul role="list" style={{ margin: 0, padding: '0 0 6px', display: 'flex', gap: '10px', overflowX: 'auto', flex: 1, alignItems: 'stretch' }}>
            {steps.map((step, i) => (
              <StepCard key={`${step.id}:${step.title}:${step.frictionLevel}`} step={step} isFirst={i === 0} isLast={i === steps.length - 1} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} />
            ))}
          </ul>
        </>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          aria-label="Nova etapa"
          placeholder="Nova etapa da jornada"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          style={{ ...field, flex: 1 }}
        />
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.74rem', gap: '4px' }} disabled={!newTitle.trim()} onClick={add}>
          <Plus size={12} /> Adicionar etapa
        </button>
      </div>
    </div>
  );
};
