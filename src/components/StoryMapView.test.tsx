import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StoryMapView } from './StoryMapView';
import type { MeetingSession } from '../types/discovery';

afterEach(cleanup);

const makeSession = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1',
  title: 'Entrevista Operação',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: [],
  rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: [],
  ...over
});

describe('StoryMapView (E12.2)', () => {
  it('avisa quando a jornada ainda não tem etapas para formar a espinha do story map', () => {
    render(
      <StoryMapView
        session={makeSession()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onMoveCard={vi.fn()}
        onRemoveCard={vi.fn()}
        onRefresh={vi.fn()}
        onProposeBacklog={vi.fn()}
      />
    );

    expect(screen.getByText(/espinha do Story Map vem das etapas da Jornada/i)).toBeTruthy();
  });

  it('renderiza colunas por etapa, faixas de release (MVP e Depois) e permite editar, mover e propor no backlog', () => {
    const onUpdateCard = vi.fn();
    const onMoveCard = vi.fn();
    const onProposeBacklog = vi.fn();

    const session = makeSession({
      userFlowSteps: [
        { id: 'step-1', stepNumber: 1, title: 'Consultar fornecedor', actor: 'Comprador', systemAction: '', frictionLevel: 'critical' },
        { id: 'step-2', stepNumber: 2, title: 'Emitir pedido', actor: 'Comprador', systemAction: '', frictionLevel: 'warning' }
      ],
      storyMapCards: [
        {
          id: 'sm-1',
          stepId: 'step-1',
          title: 'Validar CNPJ do fornecedor',
          asA: 'Comprador',
          iWantTo: 'validar o CNPJ automaticamente',
          soThat: 'não trave na emissão',
          release: 'mvp'
        }
      ]
    });

    render(
      <StoryMapView
        session={session}
        onAddCard={vi.fn()}
        onUpdateCard={onUpdateCard}
        onMoveCard={onMoveCard}
        onRemoveCard={vi.fn()}
        onRefresh={vi.fn()}
        onProposeBacklog={onProposeBacklog}
      />
    );

    expect(screen.getByText(/1\. Consultar fornecedor/i)).toBeTruthy();
    expect(screen.getByText(/2\. Emitir pedido/i)).toBeTruthy();
    expect(screen.getByText('Validar CNPJ do fornecedor')).toBeTruthy();

    // Mover de MVP para Depois
    fireEvent.click(screen.getByRole('button', { name: /Mover "Validar CNPJ do fornecedor" para Depois/i }));
    expect(onMoveCard).toHaveBeenCalledWith('sm-1', { release: 'next' });

    // Propor MVP no backlog
    fireEvent.click(screen.getByRole('button', { name: /Propor MVP no backlog/i }));
    expect(onProposeBacklog).toHaveBeenCalledWith('mvp');
  });
});
