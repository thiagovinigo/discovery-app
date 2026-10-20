import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SecondBrainDashboardView } from './SecondBrainDashboardView';
import { storageService } from '../services/storageService';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

const FIXED_FICTION = ['Lojistas', 'adquirentes', 'conciliação', 'Operações Financeiras', 'internet banking', 'Fechamento manual em planilhas'];

let blank: DiscoveryProject;

const sessionWithPain = (description: string): MeetingSession => ({
  id: 's1', title: 'Entrevista', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] }, liveQuestions: [],
  painPoints: [{ id: 'p1', description, severity: 'high', frequencyScore: 1 }],
  jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

beforeEach(() => {
  localStorage.clear();
  const id = storageService.createNewProject('Meu produto', 'Uma ideia nova').id;
  blank = storageService.getAllProjects().find(p => p.id === id)!;
});

afterEach(() => {
  cleanup();
});

describe('SecondBrainDashboardView', () => {
  it('projeto novo não mostra índice de clareza inventado nem recomendações', () => {
    render(<SecondBrainDashboardView project={blank} onNavigateToView={vi.fn()} />);

    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('0 Recomendações')).toBeTruthy();
    expect(screen.getByText(/Ainda não há dores mapeadas/)).toBeTruthy();
  });

  it('projeto novo não traz nenhum texto fixo de um domínio que o usuário não escreveu', () => {
    const { container } = render(<SecondBrainDashboardView project={blank} onNavigateToView={vi.fn()} />);

    for (const fixed of FIXED_FICTION) expect(container.textContent).not.toContain(fixed);
  });

  it('as recomendações partem das dores reais mapeadas nas reuniões', () => {
    const project: DiscoveryProject = { ...blank, sessions: [sessionWithPain('Cadastro demora demais para o cliente')] };

    render(<SecondBrainDashboardView project={project} onNavigateToView={vi.fn()} />);

    expect(screen.getByText('1 Recomendação')).toBeTruthy();
    expect(screen.getAllByText(/Cadastro demora demais para o cliente/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Product Backlog Building/)).toBeTruthy();
  });
});
