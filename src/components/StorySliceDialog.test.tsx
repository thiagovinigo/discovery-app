import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StorySliceDialog } from './StorySliceDialog';
import type { UserStory } from '../types/discovery';

const crit = (id: string) => ({ id, scenario: `Cenário ${id}`, given: 'g', when: 'w', then: 't' });

const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Gerenciar relatórios', asA: 'diretor', iWantTo: 'gerenciar', soThat: 'decidir',
  acceptanceCriteria: [crit('a'), crit('b'), crit('c')], tasks: [], storyPoints: 8, ...over
});

function renderDialog(s: UserStory = story()) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() };
  render(<StorySliceDialog story={s} {...handlers} />);
  return handlers;
}

afterEach(() => {
  cleanup();
});

describe('StorySliceDialog', () => {
  it('mostra as partes sugeridas, uma por critério, com título, pontos e o critério que cada uma leva', () => {
    renderDialog();

    expect((screen.getByLabelText('Título da parte 1') as HTMLInputElement).value).toBe('Gerenciar relatórios — Cenário a');
    expect((screen.getByLabelText('Pontos da parte 1') as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText('Pontos da parte 3') as HTMLInputElement).value).toBe('2');
    expect(screen.getByText('Cenário b')).toBeTruthy();
  });

  it('a sugestão já é válida e pode ser confirmada', () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Fatiar história' }));

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Gerenciar relatórios — Cenário a', storyPoints: 3, criteriaIds: ['a'] }),
      expect.objectContaining({ storyPoints: 3, criteriaIds: ['b'] }),
      expect.objectContaining({ storyPoints: 2, criteriaIds: ['c'] })
    ]);
  });

  it('se os pontos deixam de somar, mostra o erro e bloqueia a confirmação', () => {
    const { onConfirm } = renderDialog();

    fireEvent.change(screen.getByLabelText('Pontos da parte 1'), { target: { value: '5' } });

    expect(screen.getByRole('alert').textContent).toContain('Os pontos das partes (10) não batem com os da história (8).');
    const confirm = screen.getByRole('button', { name: 'Fatiar história' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('título editado vai para a filha', () => {
    const { onConfirm } = renderDialog();

    fireEvent.change(screen.getByLabelText('Título da parte 2'), { target: { value: 'Filtrar por período' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fatiar história' }));

    expect(onConfirm.mock.calls[0][0][1].title).toBe('Filtrar por período');
  });

  it('parte sem título bloqueia a confirmação', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('Título da parte 1'), { target: { value: ' ' } });

    expect(screen.getByRole('alert').textContent).toContain('Toda parte precisa de título.');
    expect((screen.getByRole('button', { name: 'Fatiar história' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('história com menos de 2 critérios explica que não dá para fatiar assim', () => {
    renderDialog(story({ acceptanceCriteria: [crit('a')] }));

    expect(screen.getByText(/ao menos 2 critérios de aceite/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fatiar história' })).toBeNull();
  });

  it('cancelar fecha sem fatiar', () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
