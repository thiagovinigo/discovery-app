import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionSourcePicker } from './SessionSourcePicker';
import type { MeetingSession } from '../types/discovery';

const session = (id: string, title: string, talks = 3): MeetingSession => ({
  id, title, date: '01/01/2026', durationSeconds: 0, participants: [],
  rawTranscript: Array.from({ length: talks }, (_, i) => ({ id: `${id}-${i}`, speaker: 'Usuário / Stakeholder' as const, text: 'x', timestamp: '00:01', isFinal: true })),
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

const sessions = [session('a', 'Kickoff', 5), session('b', 'Revisão', 2), session('c', 'Fechamento', 0)];

function renderPicker(selectedIds: string[] = []) {
  const onChange = vi.fn();
  render(<SessionSourcePicker sessions={sessions} selectedIds={selectedIds} onChange={onChange} />);
  return onChange;
}

afterEach(() => {
  cleanup();
});

describe('SessionSourcePicker', () => {
  it('com uma reunião só (ou nenhuma), não aparece: não há o que escolher', () => {
    const { container } = render(<SessionSourcePicker sessions={[session('a', 'Única')]} selectedIds={[]} onChange={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it('lista cada reunião com a data e o número de falas', () => {
    renderPicker();

    expect(screen.getByLabelText('Kickoff (01/01/2026) · 5 falas')).toBeTruthy();
    expect(screen.getByLabelText('Revisão (01/01/2026) · 2 falas')).toBeTruthy();
    expect(screen.getByLabelText('Fechamento (01/01/2026) · 0 falas')).toBeTruthy();
  });

  it('marcar e desmarcar uma reunião avisa a tela com a lista nova', () => {
    const onChange = renderPicker(['a']);

    fireEvent.click(screen.getByLabelText(/Revisão/));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);

    fireEvent.click(screen.getByLabelText(/Kickoff/));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('"Selecionar todas" marca todas as reuniões que têm falas', () => {
    const onChange = renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todas com falas' }));

    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('"Limpar" volta a usar só a sala ativa', () => {
    const onChange = renderPicker(['a', 'b']);

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('diz de onde o backlog vai ser gerado', () => {
    renderPicker();
    expect(screen.getByText('Nenhuma marcada: o backlog será gerado só com a sala ativa.')).toBeTruthy();

    cleanup();
    renderPicker(['a', 'b']);
    expect(screen.getByText('O backlog será gerado com 2 reuniões.')).toBeTruthy();
  });
});
