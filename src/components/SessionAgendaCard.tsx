import React from 'react';
import { CalendarClock } from 'lucide-react';
import type { MeetingSession } from '../types/discovery';

interface SessionAgendaCardProps {
  session: MeetingSession;
}

/** Na sala ao vivo: o objetivo e a pauta combinados quando a reunião foi marcada na agenda. */
export const SessionAgendaCard: React.FC<SessionAgendaCardProps> = ({ session }) => {
  const agenda = session.agenda ?? [];
  if (!session.objective && agenda.length === 0) return null;

  return (
    <section className="glass-panel" aria-label="Pauta da reunião" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <h3 style={{ fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
        <CalendarClock size={15} color="var(--primary)" /> Pauta da reunião
      </h3>
      {session.objective && <p style={{ margin: 0, fontSize: '0.8rem' }}>Objetivo: {session.objective}</p>}
      {agenda.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem' }}>
          {agenda.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
};
