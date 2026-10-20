import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { Proposal, ProposalLevel } from '../services/backlogProposals';

interface BacklogReviewPanelProps {
  proposals: Proposal[];
  /** Ids das propostas aceitas. */
  onApply: (acceptedIds: string[]) => void;
  onDiscard: () => void;
  /** Quantas propostas do pacote estão ocultas pelo tipo da conversa. */
  hiddenCount?: number;
  /** Nome do tipo da conversa que está filtrando o pacote. */
  typeLabel?: string;
  onShowAll?: () => void;
}

const LEVEL_NOUN: Record<ProposalLevel, string> = { okr: 'OKR', epic: 'épico', feature: 'feature', story: 'história', task: 'task' };

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

const titleOf = (p: Proposal): string => `${p.kind === 'add' ? 'Adicionar' : 'Alterar'} ${LEVEL_NOUN[p.level]}: ${p.label}`;

const smallButton: React.CSSProperties = { padding: '4px 12px', fontSize: '0.78rem' };

/**
 * Revisão do backlog proposto pela IA: cada proposta é aceita ou rejeitada sozinha. Itens novos já vêm marcados;
 * alterações em itens que o usuário já tem vêm desmarcadas, para não pisar no que ele editou sem querer.
 */
export const BacklogReviewPanel: React.FC<BacklogReviewPanelProps> = ({ proposals, onApply, onDiscard, hiddenCount = 0, typeLabel, onShowAll }) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposals.filter(p => p.kind === 'add').map(p => p.id)));

  const adds = proposals.filter(p => p.kind === 'add').length;
  const updates = proposals.length - adds;
  const chosen = proposals.filter(p => selected.has(p.id)).map(p => p.id);

  const toggle = (id: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="glass-panel" aria-label="Revisão do backlog" style={{ padding: '14px', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ClipboardList size={16} color="var(--primary)" /> Revisar o que a IA propõe para o backlog
      </h3>
      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {`${plural(proposals.length, 'proposta', 'propostas')}: ${plural(adds, 'nova', 'novas')} e ${plural(updates, 'alteração', 'alterações')} em itens seus`}
      </p>
      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-dim)' }}>Nada muda no backlog até você aplicar. Marque o que quer aceitar.</p>
      {hiddenCount > 0 && onShowAll && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <span>{`Mostrando o que importa numa conversa de ${typeLabel ?? 'este tipo'}. ${plural(hiddenCount, 'proposta está oculta', 'propostas estão ocultas')}.`}</span>
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={onShowAll}>Mostrar todas</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {proposals.map(p => (
          <fieldset key={p.id} style={{ margin: 0, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.6)' }}>
            <legend style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0 6px' }}>{titleOf(p)}</legend>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Aceitar ${titleOf(p)}`} style={{ marginTop: '3px' }} />
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {p.parentLabel && <span style={{ color: 'var(--text-muted)' }}>{`em "${p.parentLabel}"`}</span>}
                {p.kind === 'update' &&
                  p.changes.map(change => (
                    <div key={change.field} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <strong>{change.label}</strong>
                      <span style={{ color: '#fda4af', textDecoration: 'line-through' }}>{change.before}</span>
                      <span aria-hidden="true">→</span>
                      <span style={{ color: '#86efac' }}>{change.after}</span>
                    </div>
                  ))}
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" style={smallButton} disabled={chosen.length === 0} onClick={() => onApply(chosen)}>
          {`Aplicar selecionadas (${chosen.length})`}
        </button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onApply(proposals.map(p => p.id))}>Aceitar tudo</button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={onDiscard}>Descartar tudo</button>
      </div>
    </section>
  );
};
