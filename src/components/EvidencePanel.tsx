import React, { useState } from 'react';
import { Quote } from 'lucide-react';
import type { EvidenceSuggestion } from '../services/evidenceService';

interface EvidencePanelProps {
  suggestions: EvidenceSuggestion[];
  /** Ids das sugestões que o usuário quer registrar. */
  onApply: (acceptedIds: string[]) => void;
  onDiscard: () => void;
}

const smallButton: React.CSSProperties = { padding: '4px 12px', fontSize: '0.78rem' };

/** Falas das reuniões que parecem confirmar ou contestar itens do backlog. Só valem depois de registradas pelo usuário. */
export const EvidencePanel: React.FC<EvidencePanelProps> = ({ suggestions, onApply, onDiscard }) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(suggestions.map(s => s.id)));
  const chosen = suggestions.filter(s => selected.has(s.id)).map(s => s.id);

  const toggle = (id: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="glass-panel" aria-label="Evidências das reuniões" style={{ padding: '14px', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Quote size={16} color="var(--primary)" /> Falas que parecem validar ou contestar o backlog
      </h3>
      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-dim)' }}>
        São sugestões por palavras-chave, e podem errar. Nada vale até você registrar; desmarque as que estiverem erradas.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {suggestions.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.6)' }}>
            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Registrar ${s.stance === 'confirms' ? 'confirmação' : 'contestação'} de ${s.itemTitle}`} style={{ marginTop: '3px' }} />
            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.66rem' }}>{s.stance === 'confirms' ? 'Confirma' : 'Contesta'}</span>
                <strong>{s.itemTitle}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{`(${s.level})`}</span>
              </div>
              <blockquote style={{ margin: 0, fontStyle: 'italic' }}>{`"${s.quote}"`}</blockquote>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{`${s.speaker} · ${s.sessionTitle} · ${s.timestamp}`}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" style={smallButton} disabled={chosen.length === 0} onClick={() => onApply(chosen)}>
          {`Registrar selecionadas (${chosen.length})`}
        </button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={onDiscard}>Descartar</button>
      </div>
    </section>
  );
};
