import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NotesView } from './NotesView';
import { storageService } from '../services/storageService';
import type { DiscoveryProject, ProjectNote } from '../types/discovery';

const note = (over: Partial<ProjectNote> & Pick<ProjectNote, 'id' | 'text'>): ProjectNote => ({
  tags: [], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z', ...over
});

function projectWith(notes: ProjectNote[]): DiscoveryProject {
  const id = storageService.createNewProject('Projeto', 'Descrição').id;
  const project = storageService.getAllProjects().find(p => p.id === id)!;
  return {
    ...project,
    notes,
    stakeholders: [{ id: 'stk-ana', name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto', createdAt: '2026-01-01T10:00:00.000Z' }]
  };
}

function renderView(notes: ProjectNote[] = []) {
  const handlers = {
    onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), onPromoteToDecision: vi.fn(), onPromoteToStory: vi.fn()
  };
  render(<NotesView project={projectWith(notes)} {...handlers} />);
  return handlers;
}

const prazo = note({ id: 'n1', text: 'Prazo apertado no lançamento', tags: ['prazo', 'risco'], updatedAt: '2026-01-02T10:00:00.000Z' });
const orcamento = note({ id: 'n2', text: 'Orçamento aprovado', tags: ['dinheiro'], stakeholderId: 'stk-ana', updatedAt: '2026-01-03T10:00:00.000Z' });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('NotesView: nova anotação', () => {
  it('sem anotações, convida a escrever a primeira', () => {
    renderView();

    expect(screen.getByText(/Nenhuma anotação ainda/)).toBeTruthy();
  });

  it('só habilita o botão com texto e entrega texto, etiquetas e stakeholder', () => {
    const { onAdd } = renderView();
    const add = screen.getByRole('button', { name: 'Adicionar anotação' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'Cliente quer relatório' } });
    fireEvent.change(screen.getByLabelText('Etiquetas'), { target: { value: 'Prazo, #risco' } });
    fireEvent.change(screen.getByLabelText('Sobre quem'), { target: { value: 'stk-ana' } });
    fireEvent.click(add);

    expect(onAdd).toHaveBeenCalledWith({ text: 'Cliente quer relatório', tags: ['prazo', 'risco'], stakeholderId: 'stk-ana' });
    expect((screen.getByLabelText('Nova anotação') as HTMLTextAreaElement).value).toBe('');
  });

  it('sem escolher ninguém em "Sobre quem", a anotação não fica ligada a stakeholder', () => {
    const { onAdd } = renderView();

    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'Ideia solta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar anotação' }));

    expect(onAdd).toHaveBeenCalledWith({ text: 'Ideia solta', tags: [], stakeholderId: undefined });
  });
});

describe('NotesView: lista e busca', () => {
  it('mostra a mais recente primeiro, com etiquetas e o nome do stakeholder', () => {
    renderView([prazo, orcamento]);

    const items = screen.getAllByRole('article');
    expect(items.map(i => within(i).getByText(/Orçamento aprovado|Prazo apertado/).textContent)).toEqual(['Orçamento aprovado', 'Prazo apertado no lançamento']);
    expect(within(items[0]).getByText('Ana')).toBeTruthy();
    expect(within(items[1]).getByText('#prazo')).toBeTruthy();
  });

  it('a busca ignora maiúsculas e acentos e avisa quando nada combina', () => {
    renderView([prazo, orcamento]);

    fireEvent.change(screen.getByLabelText('Buscar nas anotações'), { target: { value: 'ORCAMENTO' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Buscar nas anotações'), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText(/Nenhuma anotação encontrada/)).toBeTruthy();
  });

  it('clicar numa etiqueta filtra e clicar de novo remove o filtro', () => {
    renderView([prazo, orcamento]);
    const chip = screen.getByRole('button', { name: /#dinheiro \(1\)/ });

    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(1);

    fireEvent.click(chip);
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('filtra por stakeholder', () => {
    renderView([prazo, orcamento]);

    fireEvent.change(screen.getByLabelText('Filtrar por stakeholder'), { target: { value: 'stk-ana' } });

    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});

describe('NotesView: ações', () => {
  it('"Virar decisão" e "Virar história" chamam a tela com o id da anotação', () => {
    const { onPromoteToDecision, onPromoteToStory } = renderView([prazo]);

    fireEvent.click(screen.getByRole('button', { name: 'Virar decisão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Virar história' }));

    expect(onPromoteToDecision).toHaveBeenCalledWith('n1');
    expect(onPromoteToStory).toHaveBeenCalledWith('n1');
  });

  it('anotação que já virou decisão ou história mostra o selo e não oferece de novo', () => {
    renderView([{ ...prazo, decisionId: 'dec-1', storyId: 'story-1' }]);

    expect(screen.getByText('Virou decisão')).toBeTruthy();
    expect(screen.getByText('Virou história')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Virar decisão' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Virar história' })).toBeNull();
  });

  it('editar troca o texto e as etiquetas', () => {
    const { onUpdate } = renderView([prazo]);

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Texto da anotação'), { target: { value: 'Prazo foi adiado' } });
    fireEvent.change(screen.getByLabelText('Etiquetas da anotação'), { target: { value: 'prazo; adiado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));

    expect(onUpdate).toHaveBeenCalledWith('n1', { text: 'Prazo foi adiado', tags: ['prazo', 'adiado'] });
  });

  it('cancelar a edição não altera nada', () => {
    const { onUpdate } = renderView([prazo]);

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Prazo apertado no lançamento')).toBeTruthy();
  });

  it('excluir pede confirmação antes de apagar', () => {
    const { onRemove } = renderView([prazo]);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(onRemove).toHaveBeenCalledWith('n1');
  });
});
