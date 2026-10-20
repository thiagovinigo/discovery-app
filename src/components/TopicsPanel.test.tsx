import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TopicsPanel } from './TopicsPanel';
import type { MeetingSession, TranscriptSegment } from '../types/discovery';

afterEach(cleanup);

let counter = 0;
const talk = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder'): TranscriptSegment => ({
  id: `t${++counter}`, speaker, text, timestamp: '00:10', isFinal: true
});

const session = (segments: TranscriptSegment[]): MeetingSession => ({
  id: 's1', title: 'Entrevista', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

describe('TopicsPanel', () => {
  it('sem conversa, explica que os assuntos aparecem conforme o entrevistado fala', () => {
    render(<TopicsPanel session={session([])} />);

    expect(screen.getByText(/conforme o entrevistado fala/i)).toBeTruthy();
  });

  it('lista os assuntos da conversa com o número de falas', () => {
    render(<TopicsPanel session={session([
      talk('O fechamento é feito em planilhas e demora quatro dias'),
      talk('As planilhas quebram sempre que alguém muda uma fórmula'),
      talk('Perco metade do tempo conferindo planilhas')
    ])} />);

    const item = screen.getByRole('listitem', { name: /Planilhas/i });
    expect(item.textContent).toMatch(/3 falas/);
  });

  it('mostra o que já foi coberto e o que falta em cada assunto', () => {
    render(<TopicsPanel session={session([
      talk('Na semana passada o cadastro de fornecedores travou, foi um caso feio'),
      talk('O cadastro de fornecedores incomoda')
    ])} />);

    const item = screen.getByRole('listitem', { name: /Cadastro/i });
    expect(within(item).getByText(/Caso real: coberto/)).toBeTruthy();
    expect(within(item).getByText(/Impacto: falta/)).toBeTruthy();
    expect(within(item).getByText(/Frequência: falta/)).toBeTruthy();
    expect(within(item).getByText(/Alternativa: falta/)).toBeTruthy();
  });
});
