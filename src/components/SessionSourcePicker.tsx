import React from 'react';
import { Layers } from 'lucide-react';
import type { MeetingSession } from '../types/discovery';

interface SessionSourcePickerProps {
  sessions: MeetingSession[];
  /** Ids das reuniões escolhidas. Vazio: a geração usa só a sala ativa. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const smallButton: React.CSSProperties = { padding: '3px 10px', fontSize: '0.74rem' };

/** Escolhe de quais reuniões o backlog será gerado. Só aparece com duas ou mais reuniões. */
export const SessionSourcePicker: React.FC<SessionSourcePickerProps> = ({ sessions, selectedIds, onChange }) => {
  if (sessions.length < 2) return null;

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  const withTalk = sessions.filter(s => s.rawTranscript.length > 0).map(s => s.id);

  return (
    <fieldset className="glass-panel" style={{ margin: '12px 0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-subtle)' }}>
      <legend style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 6px' }}>
        <Layers size={14} color="var(--primary)" /> Reuniões usadas para gerar o backlog
      </legend>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sessions.map(s => (
          <label key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem' }}>
            <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggle(s.id)} />
            {`${s.title} (${s.date}) · ${s.rawTranscript.length} ${s.rawTranscript.length === 1 ? 'fala' : 'falas'}`}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onChange(withTalk)}>Selecionar todas com falas</button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onChange([])}>Limpar</button>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          {selectedIds.length === 0
            ? 'Nenhuma marcada: o backlog será gerado só com a sala ativa.'
            : `O backlog será gerado com ${selectedIds.length} ${selectedIds.length === 1 ? 'reunião' : 'reuniões'}.`}
        </span>
      </div>
    </fieldset>
  );
};
