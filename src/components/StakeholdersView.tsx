import React, { useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import type { DiscoveryProject, Stakeholder, StakeholderLevel, StakeholderRole } from '../types/discovery';
import { LEVEL_LABELS, QUADRANT_LABELS, ROLE_LABELS, groupByQuadrant } from '../services/stakeholderService';
import type { Quadrant, StakeholderInput } from '../services/stakeholderService';

interface StakeholdersViewProps {
  project: DiscoveryProject;
  onAdd: (input: StakeholderInput) => void;
  onUpdate: (stakeholderId: string, changes: Partial<StakeholderInput>) => void;
  onRemove: (stakeholderId: string) => void;
  /** Abre a entrevista do copiloto, que também cadastra as pessoas envolvidas. */
  onOpenInterview?: () => void;
}

interface FormState {
  name: string;
  role: StakeholderRole;
  organization: string;
  jobTitle: string;
  interest: StakeholderLevel;
  influence: StakeholderLevel;
  contact: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '', role: 'outro', organization: '', jobTitle: '', interest: 'medio', influence: 'medio', contact: '', notes: ''
};

// Influência alta em cima, interesse alto à direita
const QUADRANT_ORDER: Quadrant[] = ['manter_satisfeito', 'gerenciar_de_perto', 'monitorar', 'manter_informado'];

const toInput = (form: FormState): StakeholderInput => ({
  name: form.name.trim(),
  role: form.role,
  interest: form.interest,
  influence: form.influence,
  organization: form.organization.trim() || undefined,
  jobTitle: form.jobTitle.trim() || undefined,
  contact: form.contact.trim() || undefined,
  notes: form.notes.trim() || undefined
});

const fromStakeholder = (s: Stakeholder): FormState => ({
  name: s.name,
  role: s.role,
  organization: s.organization ?? '',
  jobTitle: s.jobTitle ?? '',
  interest: s.interest,
  influence: s.influence,
  contact: s.contact ?? '',
  notes: s.notes ?? ''
});

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.84rem'
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({ project, onAdd, onUpdate, onRemove, onOpenInterview }) => {
  const stakeholders = project.stakeholders ?? [];
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Informe o nome do stakeholder.');
      return;
    }
    if (editingId) onUpdate(editingId, toInput(form));
    else onAdd(toInput(form));
    resetForm();
  };

  const handleRemove = (s: Stakeholder) => {
    if (window.confirm(`Remover ${s.name}? As anotações e reuniões continuam, mas deixam de apontar para a pessoa.`)) onRemove(s.id);
  };

  const groups = groupByQuadrant(stakeholders);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '16px', alignItems: 'start' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }} aria-label="Cadastro de stakeholder">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Users size={18} color="var(--primary)" /> {editingId ? 'Editar stakeholder' : 'Novo stakeholder'}
        </h2>

        <div>
          <label htmlFor="stk-name" style={labelStyle}>Nome</label>
          <input id="stk-name" value={form.name} onChange={e => setField('name', e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="stk-role" style={labelStyle}>Papel</label>
            <select id="stk-role" value={form.role} onChange={e => setField('role', e.target.value as StakeholderRole)} style={fieldStyle}>
              {(Object.keys(ROLE_LABELS) as StakeholderRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="stk-org" style={labelStyle}>Organização</label>
            <input id="stk-org" value={form.organization} onChange={e => setField('organization', e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div>
          <label htmlFor="stk-title" style={labelStyle}>Cargo</label>
          <input id="stk-title" value={form.jobTitle} onChange={e => setField('jobTitle', e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="stk-interest" style={labelStyle}>Interesse</label>
            <select id="stk-interest" value={form.interest} onChange={e => setField('interest', e.target.value as StakeholderLevel)} style={fieldStyle}>
              {(Object.keys(LEVEL_LABELS) as StakeholderLevel[]).map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="stk-influence" style={labelStyle}>Influência</label>
            <select id="stk-influence" value={form.influence} onChange={e => setField('influence', e.target.value as StakeholderLevel)} style={fieldStyle}>
              {(Object.keys(LEVEL_LABELS) as StakeholderLevel[]).map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="stk-contact" style={labelStyle}>Contato</label>
          <input id="stk-contact" value={form.contact} onChange={e => setField('contact', e.target.value)} placeholder="Como prefere ser contatado" style={fieldStyle} />
        </div>

        <div>
          <label htmlFor="stk-notes" style={labelStyle}>Observações</label>
          <textarea id="stk-notes" rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ ...fieldStyle, resize: 'none' }} />
        </div>

        {error && (
          <div role="alert" style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar edição</button>}
          <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
            <Plus size={14} /> {editingId ? 'Salvar alterações' : 'Adicionar stakeholder'}
          </button>
        </div>
      </form>

      <div>
        {stakeholders.length === 0 ? (
          <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', border: '1px dashed var(--border-subtle)' }}>
            <Users size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Nenhum stakeholder cadastrado</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Cadastre quem decide, patrocina, usa ou é impactado pelo projeto. A matriz mostra como envolver cada um.
            </p>
            {onOpenInterview && (
              <button type="button" className="btn btn-secondary" onClick={onOpenInterview} style={{ gap: '6px' }}>
                <Sparkles size={14} /> Pedir ao copiloto para me entrevistar
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {QUADRANT_ORDER.map(q => (
              <section key={q} aria-label={QUADRANT_LABELS[q].title} className="glass-card" style={{ padding: '12px', minHeight: '140px' }}>
                <h3 style={{ fontSize: '0.84rem', fontWeight: 800 }}>{QUADRANT_LABELS[q].title}</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '8px' }}>{QUADRANT_LABELS[q].hint}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groups[q].map(s => (
                    <div key={s.id} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.86rem' }}>{s.name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {ROLE_LABELS[s.role]}{s.jobTitle ? ` · ${s.jobTitle}` : ''}{s.organization ? ` · ${s.organization}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" className="btn btn-ghost" aria-label={`Editar ${s.name}`} style={{ padding: '3px 6px' }} onClick={() => { setForm(fromStakeholder(s)); setEditingId(s.id); setError(null); }}>
                            <Pencil size={13} />
                          </button>
                          <button type="button" className="btn btn-ghost" aria-label={`Remover ${s.name}`} style={{ padding: '3px 6px', color: '#fda4af' }} onClick={() => handleRemove(s)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {(s.contact || s.notes) && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {s.contact && <div>Contato: {s.contact}</div>}
                          {s.notes && <div>{s.notes}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
