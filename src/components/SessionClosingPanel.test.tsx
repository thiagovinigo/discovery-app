import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionClosingPanel } from './SessionClosingPanel';
import type { ProjectNote } from '../types/discovery';

const savedNote: ProjectNote = {
  id: 'n1', text: 'Fechamento: Kickoff', tags: ['fechamento'], sessionId: 's1',
  createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z'
};

afterEach(() => {
  cleanup();
});

describe('SessionClosingPanel', () => {
  it('faz as três perguntas do fechamento', () => {
    render(<SessionClosingPanel onSave={vi.fn()} />);

    expect(screen.getByLabelText('O que ficou claro?')).toBeTruthy();
    expect(screen.getByLabelText('O que ficou em aberto?')).toBeTruthy();
    expect(screen.getByLabelText('Qual é a próxima ação e quem cuida dela?')).toBeTruthy();
  });

  it('só habilita o botão depois de alguma resposta e entrega as três respostas', () => {
    const onSave = vi.fn();
    render(<SessionClosingPanel onSave={onSave} />);
    const button = screen.getByRole('button', { name: 'Salvar fechamento' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('O que ficou claro?'), { target: { value: 'Escopo fechado' } });
    fireEvent.change(screen.getByLabelText('Qual é a próxima ação e quem cuida dela?'), { target: { value: 'Ana envia o contrato' } });
    fireEvent.click(button);

    expect(onSave).toHaveBeenCalledWith({ clear: 'Escopo fechado', open: '', nextAction: 'Ana envia o contrato' });
  });

  it('avisa quando o fechamento desta sala já foi salvo e permite atualizar', () => {
    render(<SessionClosingPanel savedNote={savedNote} onSave={vi.fn()} />);

    expect(screen.getByText(/Fechamento já salvo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Atualizar fechamento' })).toBeTruthy();
  });
});
