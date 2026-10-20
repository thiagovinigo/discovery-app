import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { BacklogHealthPanel } from './BacklogHealthPanel';
import { recordEvidence } from '../services/backlogItemService';
import type { Epic, UserStory } from '../types/discovery';

const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Exportar PDF', asA: 'diretor', iWantTo: 'exportar', soThat: 'enviar',
  acceptanceCriteria: [{ id: 'a1', scenario: 'Exporta', given: 'g', when: 'w', then: 't' }],
  tasks: [{ id: 't1', title: 'Testar', type: 'qa', status: 'todo' }], storyPoints: 3, ...over
});

const epicWith = (stories: UserStory[], meta: Partial<Epic> = {}): Epic => ({
  id: 'e1', title: 'Épico', objective: '', businessValue: '', status: 'discovery', ...meta,
  features: [{ id: 'f1', epicId: 'e1', title: 'Feature', description: '', valueProposition: '', effort: 'S', userStories: stories }]
});

afterEach(() => {
  cleanup();
});

describe('BacklogHealthPanel', () => {
  it('backlog vazio não mostra o painel', () => {
    const { container } = render(<BacklogHealthPanel epics={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('mostra quantos itens são hipótese, validados, contestados e invalidados', () => {
    const validated = recordEvidence({}, { stance: 'confirms', quote: 'q', at: '2026-01-01T10:00:00.000Z' });
    render(<BacklogHealthPanel epics={[epicWith([story({ ...validated })])]} />);

    const validation = screen.getByLabelText('Validação do backlog');
    expect(within(validation).getByText('Hipóteses').nextSibling?.textContent).toBe('3');
    expect(within(validation).getByText('Validados').nextSibling?.textContent).toBe('1');
    expect(within(validation).getByText('Contestados').nextSibling?.textContent).toBe('0');
    expect(within(validation).getByText('Invalidados').nextSibling?.textContent).toBe('0');
  });

  it('diz quantas histórias estão prontas para dev', () => {
    render(<BacklogHealthPanel epics={[epicWith([story({ id: 's1' }), story({ id: 's2', title: 'Sem critério', acceptanceCriteria: [] })])]} />);

    expect(screen.getByText('1 de 2 histórias prontas para dev')).toBeTruthy();
  });

  it('lista as histórias com lacunas, marcando o que bloqueia', () => {
    render(<BacklogHealthPanel epics={[epicWith([story({ id: 's2', title: 'Sem critério', acceptanceCriteria: [], storyPoints: undefined })])]} />);

    const group = screen.getByRole('group', { name: 'Sem critério' });
    expect(within(group).getByText(/Bloqueia: Sem critério de aceite/)).toBeTruthy();
    expect(within(group).getByText(/Sem estimativa de pontos/)).toBeTruthy();
  });

  it('itens contestados continuam visíveis, com a fala que os contesta', () => {
    const contested = recordEvidence({}, { stance: 'contests', quote: 'Ninguém usa isso', sessionTitle: 'Kickoff', at: '2026-01-01T10:00:00.000Z' });
    render(<BacklogHealthPanel epics={[epicWith([story({ title: 'Exportar PDF', ...contested })])]} />);

    const list = screen.getByLabelText('Itens contestados');
    expect(within(list).getByText(/Exportar PDF/)).toBeTruthy();
    expect(within(list).getByText(/Ninguém usa isso/)).toBeTruthy();
    expect(within(list).getByText(/Kickoff/)).toBeTruthy();
  });

  it('sem itens contestados nem lacunas, não mostra essas listas', () => {
    render(<BacklogHealthPanel epics={[epicWith([story()])]} />);

    expect(screen.queryByLabelText('Itens contestados')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
