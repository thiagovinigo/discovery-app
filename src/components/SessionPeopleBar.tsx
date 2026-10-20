import React from 'react';
import { Users } from 'lucide-react';
import type { Stakeholder } from '../types/discovery';

interface SessionPeopleBarProps {
  stakeholders: Stakeholder[];
  participantIds: string[];
  currentSpeakerId?: string;
  onChangeParticipants: (stakeholderIds: string[]) => void;
  /** Sem id, ninguém específico está falando. */
  onChangeSpeaker: (stakeholderId?: string) => void;
}

/** Na sala ao vivo: quem participa da reunião e quem está falando agora (as próximas falas levam o nome). */
export const SessionPeopleBar: React.FC<SessionPeopleBarProps> = ({
  stakeholders,
  participantIds,
  currentSpeakerId,
  onChangeParticipants,
  onChangeSpeaker
}) => {
  if (stakeholders.length === 0) {
    return (
      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', padding: '6px 2px' }}>
        <Users size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
        Cadastre stakeholders na etapa 1 para marcar quem participa da reunião e quem está falando.
      </div>
    );
  }

  const toggle = (id: string) =>
    onChangeParticipants(participantIds.includes(id) ? participantIds.filter(p => p !== id) : [...participantIds, id]);

  const speakerOptions = participantIds.length > 0 ? stakeholders.filter(s => participantIds.includes(s.id)) : stakeholders;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', padding: '6px 2px' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
        <Users size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
        Participantes:
      </span>
      {stakeholders.map(s => {
        const selected = participantIds.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(s.id)}
            className="btn btn-secondary"
            style={{
              padding: '3px 10px',
              fontSize: '0.74rem',
              background: selected ? 'rgba(99, 102, 241, 0.28)' : undefined,
              border: selected ? '1px solid var(--primary)' : undefined
            }}
          >
            {s.name}
          </button>
        );
      })}
      <label htmlFor="session-speaker" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 'auto' }}>
        Falando agora
      </label>
      <select
        id="session-speaker"
        value={currentSpeakerId ?? ''}
        onChange={e => onChangeSpeaker(e.target.value || undefined)}
        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.78rem' }}
      >
        <option value="">Ninguém específico</option>
        {speakerOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
};
