import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AgendaView } from './AgendaView';
import { storageService } from '../services/storageService';
import type { DiscoveryProject, ScheduledMeeting } from '../types/discovery';

const meeting = (over: Partial<ScheduledMeeting> & Pick<ScheduledMeeting, 'id' | 'title'>): ScheduledMeeting => ({
  type: 'alignment', startsAt: '2099-03-10T14:00:00.000Z', objective: '', agenda: [], participantIds: [], status: 'scheduled',
  createdAt: '2026-01-01T10:00:00.000Z', ...over
});

function projectWith(meetings: ScheduledMeeting[]): DiscoveryProject {
  const id = storageService.createNewProject('Projeto', 'Descrição').id;
  const project = storageService.getAllProjects().find(p => p.id === id)!;
  return {
    ...project,
    scheduledMeetings: meetings,
    stakeholders: [{ id: 'stk-ana', name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto', createdAt: '2026-01-01T10:00:00.000Z' }]
  };
}

function renderView(meetings: ScheduledMeeting[] = []) {
  const handlers = { onSchedule: vi.fn(), onStart: vi.fn(), onCancel: vi.fn(), onRemove: vi.fn() };
  render(<AgendaView project={projectWith(meetings)} {...handlers} />);
  return handlers;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('AgendaView: marcar reunião', () => {
  it('sem reuniões, avisa que a agenda está vazia', () => {
    renderView();

    expect(screen.getByText(/Nenhuma reunião marcada/)).toBeTruthy();
  });

  it('só habilita o botão com título e data', () => {
    renderView();
    const button = screen.getByRole('button', { name: 'Marcar reunião' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Título da reunião'), { target: { value: 'Kickoff' } });
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2099-03-10T14:00' } });
    expect(button.disabled).toBe(false);
  });

  it('entrega todos os campos, com a pauta separada por linha, e limpa o formulário', () => {
    const { onSchedule } = renderView();

    fireEvent.change(screen.getByLabelText('Título da reunião'), { target: { value: 'Kickoff' } });
    fireEvent.change(screen.getByLabelText('Tipo da conversa'), { target: { value: 'refinement' } });
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2099-03-10T14:00' } });
    fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: 'Fechar o escopo' } });
    fireEvent.change(screen.getByLabelText('Pauta (um item por linha)'), { target: { value: '- Prazo\nOrçamento' } });
    fireEvent.click(screen.getByLabelText('Ana'));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar reunião' }));

    expect(onSchedule).toHaveBeenCalledWith({
      title: 'Kickoff', type: 'refinement', startsAt: '2099-03-10T14:00', objective: 'Fechar o escopo',
      agenda: ['Prazo', 'Orçamento'], participantIds: ['stk-ana']
    });
    expect((screen.getByLabelText('Título da reunião') as HTMLInputElement).value).toBe('');
  });
});

describe('AgendaView: próximas reuniões', () => {
  it('lista a mais cedo primeiro, com tipo, objetivo, pauta e participantes', () => {
    renderView([
      meeting({ id: 'b', title: 'Segunda', startsAt: '2099-05-02T10:00:00.000Z' }),
      meeting({ id: 'a', title: 'Primeira', startsAt: '2099-05-01T10:00:00.000Z', objective: 'Fechar o escopo', agenda: ['Prazo', 'Orçamento'], participantIds: ['stk-ana'] })
    ]);

    const cards = screen.getAllByRole('article');
    expect(cards.map(c => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual(['Primeira', 'Segunda']);
    expect(within(cards[0]).getByText('Alinhamento')).toBeTruthy();
    expect(within(cards[0]).getByText(/Fechar o escopo/)).toBeTruthy();
    expect(within(cards[0]).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Prazo', 'Orçamento']);
    expect(within(cards[0]).getByText(/Ana/)).toBeTruthy();
  });

  it('reunião agendada com data passada ganha o selo "Atrasada"', () => {
    renderView([meeting({ id: 'a', title: 'Velha', startsAt: '2000-01-01T10:00:00.000Z' })]);

    expect(screen.getByText('Atrasada')).toBeTruthy();
  });

  it('"Iniciar reunião" abre a sala daquela reunião', () => {
    const { onStart } = renderView([meeting({ id: 'a', title: 'Kickoff' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar reunião' }));

    expect(onStart).toHaveBeenCalledWith('a');
  });

  it('cancelar pede confirmação antes', () => {
    const { onCancel } = renderView([meeting({ id: 'a', title: 'Kickoff' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reunião' }));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(onCancel).toHaveBeenCalledWith('a');
  });
});

describe('AgendaView: reuniões passadas', () => {
  it('reunião realizada permite reabrir a sala', () => {
    const { onStart } = renderView([meeting({ id: 'a', title: 'Feita', status: 'started', sessionId: 's1' })]);

    expect(screen.getByText('Realizada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir sala' }));

    expect(onStart).toHaveBeenCalledWith('a');
  });

  it('reunião cancelada pode ser removida da agenda', () => {
    const { onRemove } = renderView([meeting({ id: 'a', title: 'Cancelada um', status: 'cancelled' })]);

    expect(screen.getByText('Cancelada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remover da agenda' }));

    expect(onRemove).toHaveBeenCalledWith('a');
  });
});
