import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BacklogReviewPanel } from './BacklogReviewPanel';
import type { Proposal } from '../services/backlogProposals';
import type { UserStory } from '../types/discovery';

const newStory = { id: 's1', featureId: 'f1', title: 'Nova história', asA: '', iWantTo: '', soThat: '', acceptanceCriteria: [], tasks: [] } as UserStory;

const addStory: Proposal = { id: 'add:story:f1:nova', kind: 'add', level: 'story', label: 'Nova história', parentId: 'f1', parentLabel: 'Relatórios', item: newStory };
const updateStory: Proposal = {
  id: 'update:story:s2', kind: 'update', level: 'story', label: 'Exportar PDF', parentLabel: 'Relatórios', targetId: 's2', patch: {},
  changes: [{ field: 'iWantTo', label: 'Quero', before: 'exportar em PDF', after: 'exportar em PDF e Excel' }]
};
const addTask: Proposal = { id: 'add:task:s2:testar', kind: 'add', level: 'task', label: 'Testar', parentId: 's2', parentLabel: 'Exportar PDF', item: { id: 't1', title: 'Testar', type: 'qa', status: 'todo' } };

function renderPanel(proposals: Proposal[]) {
  const handlers = { onApply: vi.fn(), onDiscard: vi.fn() };
  render(<BacklogReviewPanel proposals={proposals} {...handlers} />);
  return handlers;
}

afterEach(() => {
  cleanup();
});

describe('BacklogReviewPanel', () => {
  it('resume o pacote: quantas são novas e quantas alteram algo que já existe', () => {
    renderPanel([addStory, updateStory, addTask]);

    expect(screen.getByText('3 propostas: 2 novas e 1 alteração em itens seus')).toBeTruthy();
  });

  it('itens novos já vêm marcados; alterações em itens seus vêm desmarcadas', () => {
    renderPanel([addStory, updateStory]);

    expect((screen.getByLabelText(/Nova história/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Exportar PDF/) as HTMLInputElement).checked).toBe(false);
  });

  it('mostra o antes e o depois de cada campo alterado', () => {
    renderPanel([updateStory]);

    const group = screen.getByRole('group', { name: /Exportar PDF/ });
    expect(within(group).getByText('Quero')).toBeTruthy();
    expect(within(group).getByText('exportar em PDF')).toBeTruthy();
    expect(within(group).getByText('exportar em PDF e Excel')).toBeTruthy();
  });

  it('"Aplicar selecionadas" entrega só os ids marcados', () => {
    const { onApply } = renderPanel([addStory, updateStory, addTask]);

    fireEvent.click(screen.getByLabelText(/Exportar PDF/));
    fireEvent.click(screen.getByLabelText(/Testar/));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar selecionadas (2)' }));

    expect(onApply).toHaveBeenCalledWith([addStory.id, updateStory.id]);
  });

  it('"Aceitar tudo" entrega todas, inclusive as desmarcadas', () => {
    const { onApply } = renderPanel([addStory, updateStory]);

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar tudo' }));

    expect(onApply).toHaveBeenCalledWith([addStory.id, updateStory.id]);
  });

  it('sem nada marcado, o botão de aplicar fica desabilitado', () => {
    renderPanel([updateStory]);

    expect((screen.getByRole('button', { name: 'Aplicar selecionadas (0)' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Descartar tudo" avisa a tela e não aplica nada', () => {
    const { onApply, onDiscard } = renderPanel([addStory]);

    fireEvent.click(screen.getByRole('button', { name: 'Descartar tudo' }));

    expect(onDiscard).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('uma proposta de task mostra em qual história ela entra', () => {
    renderPanel([addTask]);

    expect(screen.getByText(/em "Exportar PDF"/)).toBeTruthy();
  });
});
