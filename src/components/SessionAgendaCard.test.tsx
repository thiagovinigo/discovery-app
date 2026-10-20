import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SessionAgendaCard } from './SessionAgendaCard';
import type { MeetingSession } from '../types/discovery';

const session = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1', title: 'Reunião', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

afterEach(() => {
  cleanup();
});

describe('SessionAgendaCard', () => {
  it('mostra o objetivo e a pauta combinados na agenda', () => {
    render(<SessionAgendaCard session={session({ objective: 'Fechar o escopo', agenda: ['Prazo', 'Orçamento'] })} />);

    expect(screen.getByLabelText('Pauta da reunião')).toBeTruthy();
    expect(screen.getByText(/Fechar o escopo/)).toBeTruthy();
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['Prazo', 'Orçamento']);
  });

  it('só com a pauta, não mostra objetivo', () => {
    render(<SessionAgendaCard session={session({ agenda: ['Prazo'] })} />);

    expect(screen.queryByText(/Objetivo/)).toBeNull();
    expect(screen.getByText('Prazo')).toBeTruthy();
  });

  it('sala sem objetivo nem pauta não mostra nada', () => {
    const { container } = render(<SessionAgendaCard session={session()} />);

    expect(container.firstChild).toBeNull();
  });
});
