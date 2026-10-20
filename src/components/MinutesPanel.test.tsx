import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MinutesPanel } from './MinutesPanel';
import type { MeetingMinutes, MeetingSession } from '../types/discovery';

afterEach(cleanup);

const MINUTES: MeetingMinutes = {
  generatedAt: '2026-02-01T15:00:00.000Z',
  participants: ['Ana Souza', 'Bruno'],
  summary: '4 falas, 1 assunto, 1 decisão, 1 ação combinada',
  topics: [{ title: 'Planilhas', statements: [{ speaker: 'Ana Souza', text: 'A planilha quebra', timestamp: '00:10' }] }],
  decisions: [{ text: 'Ficou decidido adotar o novo fluxo', speaker: 'Bruno', timestamp: '00:30' }],
  actionItems: [{ item: 'Eu vou mandar o extrato até sexta', owner: 'Ana Souza', deadline: 'até sexta' }],
  openQuestions: ['Qual o impacto em reais?'],
  painPoints: ['Fórmula quebra'],
  jobs: ['Fechar o mês sem erro']
};

const session = (minutes?: MeetingMinutes): MeetingSession => ({
  id: 's1', title: 'Discovery do fechamento', date: '01/02/2026', durationSeconds: 600, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], minutes
});

describe('MinutesPanel', () => {
  it('sem ata, explica e oferece gerar', () => {
    const onGenerate = vi.fn();
    render(<MinutesPanel session={session()} onGenerate={onGenerate} />);

    expect(screen.getByText(/ainda não tem ata/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar ata' }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('com ata, mostra participantes, decisões, ações, perguntas em aberto, dores e jobs', () => {
    render(<MinutesPanel session={session(MINUTES)} onGenerate={vi.fn()} />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('Ana Souza, Bruno');
    expect(text).toContain('Ficou decidido adotar o novo fluxo');
    expect(text).toContain('Eu vou mandar o extrato até sexta');
    expect(text).toContain('até sexta');
    expect(text).toContain('Qual o impacto em reais?');
    expect(text).toContain('Fórmula quebra');
    expect(text).toContain('Fechar o mês sem erro');
    expect(text).toContain('Planilhas');
  });

  it('"Atualizar ata" gera de novo a partir da conversa', () => {
    const onGenerate = vi.fn();
    render(<MinutesPanel session={session(MINUTES)} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar ata' }));

    expect(onGenerate).toHaveBeenCalled();
  });

  it('copia a ata em Markdown', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<MinutesPanel session={session(MINUTES)} onGenerate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Copiar Markdown/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('# Ata: Discovery do fechamento');
    await waitFor(() => expect(screen.getByText(/Copiado/)).toBeTruthy());
  });

  it('"Gerar backlog desta reunião" aparece quando há ata e chama o callback', () => {
    const onGenerateBacklog = vi.fn();
    render(<MinutesPanel session={session(MINUTES)} onGenerate={vi.fn()} onGenerateBacklog={onGenerateBacklog} />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar backlog desta reunião/ }));

    expect(onGenerateBacklog).toHaveBeenCalled();
  });
});
