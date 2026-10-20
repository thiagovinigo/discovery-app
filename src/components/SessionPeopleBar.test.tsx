import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionPeopleBar } from './SessionPeopleBar';
import type { Stakeholder } from '../types/discovery';

const person = (id: string, name: string): Stakeholder => ({
  id, name, role: 'usuario', interest: 'medio', influence: 'medio', createdAt: '2026-01-01T00:00:00.000Z'
});
const ana = person('s1', 'Ana');
const bia = person('s2', 'Bia');

afterEach(() => {
  cleanup();
});

function renderBar(over: Partial<React.ComponentProps<typeof SessionPeopleBar>> = {}) {
  const handlers = { onChangeParticipants: vi.fn(), onChangeSpeaker: vi.fn() };
  render(<SessionPeopleBar stakeholders={[ana, bia]} participantIds={[]} {...handlers} {...over} />);
  return handlers;
}

describe('SessionPeopleBar', () => {
  it('sem stakeholders cadastrados, só orienta a cadastrar', () => {
    render(<SessionPeopleBar stakeholders={[]} participantIds={[]} onChangeParticipants={vi.fn()} onChangeSpeaker={vi.fn()} />);

    expect(screen.getByText(/Cadastre stakeholders/)).toBeTruthy();
    expect(screen.queryByLabelText('Falando agora')).toBeNull();
  });

  it('marcar uma pessoa adiciona à lista de participantes', () => {
    const { onChangeParticipants } = renderBar({ participantIds: ['s1'] });

    fireEvent.click(screen.getByRole('button', { name: 'Bia' }));

    expect(onChangeParticipants).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('desmarcar tira da lista e mostra o estado de cada botão', () => {
    const { onChangeParticipants } = renderBar({ participantIds: ['s1', 's2'] });

    expect(screen.getByRole('button', { name: 'Ana' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Ana' }));

    expect(onChangeParticipants).toHaveBeenCalledWith(['s2']);
  });

  it('"Falando agora" lista só os participantes marcados', () => {
    renderBar({ participantIds: ['s2'] });

    const options = [...(screen.getByLabelText('Falando agora') as HTMLSelectElement).options].map(o => o.textContent);
    expect(options).toEqual(['Ninguém específico', 'Bia']);
  });

  it('sem participantes marcados, "Falando agora" oferece todos os cadastrados', () => {
    renderBar({ participantIds: [] });

    const options = [...(screen.getByLabelText('Falando agora') as HTMLSelectElement).options].map(o => o.textContent);
    expect(options).toEqual(['Ninguém específico', 'Ana', 'Bia']);
  });

  it('escolher quem fala avisa a sala, e voltar a "Ninguém" limpa', () => {
    const { onChangeSpeaker } = renderBar({ participantIds: ['s1'], currentSpeakerId: undefined });
    const select = screen.getByLabelText('Falando agora');

    fireEvent.change(select, { target: { value: 's1' } });
    expect(onChangeSpeaker).toHaveBeenLastCalledWith('s1');

    fireEvent.change(select, { target: { value: '' } });
    expect(onChangeSpeaker).toHaveBeenLastCalledWith(undefined);
  });
});
