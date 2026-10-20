import React, { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { DiscoveryProject, MeetingType, ScheduledMeeting } from '../types/discovery';
import { MEETING_TYPE_LABELS } from '../services/assistantService';
import { isOverdue, parseAgenda, splitMeetings } from '../services/meetingService';
import type { MeetingInput } from '../services/meetingService';
import { buildAgenda } from '../services/meetingCopilotService';

interface AgendaViewProps {
  project: DiscoveryProject;
  onSchedule: (input: MeetingInput) => void;
  /** Abre a sala da reunião: cria uma sala nova se estava agendada, ou reabre a que já existe. */
  onStart: (meetingId: string) => void;
  onCancel: (meetingId: string) => void;
  onRemove: (meetingId: string) => void;
}

const TYPES = Object.keys(MEETING_TYPE_LABELS) as MeetingType[];

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.84rem'
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };
const smallButton: React.CSSProperties = { padding: '3px 10px', fontSize: '0.74rem' };
const sectionTitle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 800, margin: 0 };

const formatDate = (iso: string): string => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

interface MeetingCardProps {
  meeting: ScheduledMeeting;
  participantNames: string[];
  onStart: AgendaViewProps['onStart'];
  onCancel: AgendaViewProps['onCancel'];
  onRemove: AgendaViewProps['onRemove'];
}

function MeetingCard({ meeting, participantNames, onStart, onCancel, onRemove }: MeetingCardProps) {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  return (
    <article className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', marginRight: 'auto' }}>{meeting.title}</h3>
        <span className="badge badge-cyan">{MEETING_TYPE_LABELS[meeting.type].title}</span>
        {isOverdue(meeting) && <span className="badge badge-primary">Atrasada</span>}
        {meeting.status === 'started' && <span className="badge badge-primary">Realizada</span>}
        {meeting.status === 'cancelled' && <span className="badge badge-primary">Cancelada</span>}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(meeting.startsAt)}</div>
      {meeting.objective && <p style={{ margin: 0, fontSize: '0.84rem' }}>Objetivo: {meeting.objective}</p>}
      {meeting.agenda.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem' }}>
          {meeting.agenda.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}
      {participantNames.length > 0 && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Participantes: {participantNames.join(', ')}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {meeting.status === 'scheduled' && (
          <>
            <button type="button" className="btn btn-primary" style={smallButton} onClick={() => onStart(meeting.id)}>Iniciar reunião</button>
            {isConfirmingCancel ? (
              <>
                <button type="button" className="btn btn-secondary" style={{ ...smallButton, color: '#fda4af' }} onClick={() => onCancel(meeting.id)}>Confirmar cancelamento</button>
                <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setIsConfirmingCancel(false)}>Voltar</button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setIsConfirmingCancel(true)}>Cancelar reunião</button>
            )}
          </>
        )}
        {meeting.status === 'started' && (
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onStart(meeting.id)}>Abrir sala</button>
        )}
        {meeting.status === 'cancelled' && (
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onRemove(meeting.id)}>Remover da agenda</button>
        )}
      </div>
    </article>
  );
}

/** Agenda de reuniões: marcar com pauta e participantes, e iniciar a sala já preparada. */
export const AgendaView: React.FC<AgendaViewProps> = ({ project, onSchedule, onStart, onCancel, onRemove }) => {
  const meetings = useMemo(() => project.scheduledMeetings ?? [], [project.scheduledMeetings]);
  const stakeholders = project.stakeholders ?? [];
  const { upcoming, past } = useMemo(() => splitMeetings(meetings), [meetings]);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<MeetingType>('discovery');
  const [startsAt, setStartsAt] = useState('');
  const [objective, setObjective] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const namesOf = (meeting: ScheduledMeeting) =>
    meeting.participantIds.map(id => stakeholders.find(s => s.id === id)?.name).filter((n): n is string => !!n);

  const suggestAgenda = () =>
    setAgendaText(current => parseAgenda(`${current}\n${buildAgenda(project, type).join('\n')}`).join('\n'));

  const toggleParticipant = (id: string) =>
    setParticipantIds(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]));

  const schedule = () => {
    onSchedule({ title, type, startsAt, objective, agenda: parseAgenda(agendaText), participantIds });
    setTitle('');
    setType('discovery');
    setStartsAt('');
    setObjective('');
    setAgendaText('');
    setParticipantIds([]);
  };

  const renderCards = (list: ScheduledMeeting[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {list.map(m => (
        <MeetingCard key={m.id} meeting={m} participantNames={namesOf(m)} onStart={onStart} onCancel={onCancel} onRemove={onRemove} />
      ))}
    </div>
  );

  return (
    <section aria-label="Agenda de reuniões" style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <header>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
          <CalendarClock size={18} color="var(--primary)" /> Agenda de reuniões
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Marque a reunião com objetivo e pauta. No dia, "Iniciar reunião" abre a sala já com o tipo, os participantes e a pauta.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 240px' }}>
            <label htmlFor="meeting-title" style={labelStyle}>Título da reunião</label>
            <input id="meeting-title" value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="meeting-type" style={labelStyle}>Tipo da conversa</label>
            <select id="meeting-type" value={type} onChange={e => setType(e.target.value as MeetingType)} style={fieldStyle}>
              {TYPES.map(t => <option key={t} value={t}>{MEETING_TYPE_LABELS[t].title}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="meeting-date" style={labelStyle}>Data e hora</label>
            <input id="meeting-date" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div>
          <label htmlFor="meeting-objective" style={labelStyle}>Objetivo</label>
          <input id="meeting-objective" value={objective} onChange={e => setObjective(e.target.value)} style={fieldStyle} />
        </div>
        <div>
          <label htmlFor="meeting-agenda" style={labelStyle}>Pauta (um item por linha)</label>
          <textarea id="meeting-agenda" value={agendaText} onChange={e => setAgendaText(e.target.value)} style={{ ...fieldStyle, minHeight: '70px' }} />
          <button type="button" className="btn btn-secondary" style={{ ...smallButton, marginTop: '6px' }} onClick={suggestAgenda}>Sugerir pauta</button>
        </div>
        {stakeholders.length > 0 && (
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={labelStyle}>Participantes</legend>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {stakeholders.map(s => (
                <label key={s.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={participantIds.includes(s.id)} onChange={() => toggleParticipant(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <button type="button" className="btn btn-primary" disabled={!title.trim() || !startsAt} onClick={schedule}>Marcar reunião</button>
        </div>
      </div>

      {meetings.length === 0 && (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem' }}>Nenhuma reunião marcada ainda. Marque a primeira acima.</p>
      )}

      {upcoming.length > 0 && (
        <>
          <h3 style={sectionTitle}>Próximas reuniões</h3>
          {renderCards(upcoming)}
        </>
      )}

      {past.length > 0 && (
        <>
          <h3 style={sectionTitle}>Reuniões passadas</h3>
          {renderCards(past)}
        </>
      )}
    </section>
  );
};
