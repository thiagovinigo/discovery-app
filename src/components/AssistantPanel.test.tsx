import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AssistantPanel } from './AssistantPanel';
import type { AssistantOutput, MeetingSession, MeetingType } from '../types/discovery';

const baseSession = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1', title: 'Reunião', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

const output = (mode: MeetingType, over: Partial<AssistantOutput> = {}): AssistantOutput => ({
  id: `o-${mode}`, mode, createdAt: '2026-01-01T10:00:00.000Z', source: 'offline', basedOnSegmentIds: ['a'], ...over
});

afterEach(() => {
  cleanup();
});

function renderPanel(session: MeetingSession, extra: Partial<React.ComponentProps<typeof AssistantPanel>> = {}) {
  const handlers = { onChangeType: vi.fn(), onToggle: vi.fn(), onRunNow: vi.fn() };
  render(<AssistantPanel session={session} {...handlers} {...extra} />);
  return handlers;
}

describe('AssistantPanel: controles', () => {
  it('oferece os 4 tipos de conversa e explica o que o assistente faz em cada um', () => {
    renderPanel(baseSession({ type: 'alignment' }));

    const select = screen.getByLabelText('Tipo da conversa') as HTMLSelectElement;
    expect([...select.options].map(o => o.value)).toEqual(['discovery', 'interview', 'alignment', 'refinement']);
    expect(screen.getByText(/organiza tópicos/i)).toBeTruthy();
  });

  it('sem tipo definido, assume discovery', () => {
    renderPanel(baseSession());

    expect((screen.getByLabelText('Tipo da conversa') as HTMLSelectElement).value).toBe('discovery');
    expect(screen.getByText(/perguntas profundas/i)).toBeTruthy();
  });

  it('trocar o tipo avisa a sala', () => {
    const { onChangeType } = renderPanel(baseSession());

    fireEvent.change(screen.getByLabelText('Tipo da conversa'), { target: { value: 'interview' } });

    expect(onChangeType).toHaveBeenCalledWith('interview');
  });

  it('o botão liga e desliga o assistente e mostra o estado', () => {
    const { onToggle } = renderPanel(baseSession({ assistant: { enabled: true, outputs: [] } }));
    const button = screen.getByRole('button', { name: /Assistente ouvindo/ });

    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('desligado, o botão convida a ligar', () => {
    const { onToggle } = renderPanel(baseSession());

    fireEvent.click(screen.getByRole('button', { name: /Ligar assistente/ }));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('"Analisar agora" pede a análise e fica desabilitado enquanto trabalha', () => {
    const { onRunNow } = renderPanel(baseSession());
    fireEvent.click(screen.getByRole('button', { name: /Analisar agora/ }));
    expect(onRunNow).toHaveBeenCalled();

    cleanup();
    renderPanel(baseSession(), { busy: true });
    expect((screen.getByRole('button', { name: /Analisando/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('AssistantPanel: saída por tipo', () => {
  it('sem nada ainda, explica como começar', () => {
    renderPanel(baseSession());

    expect(screen.getByText(/ainda não analisou nada/i)).toBeTruthy();
  });

  it('entrevista: mostra a pergunta, a resposta e o exemplo', () => {
    renderPanel(baseSession({
      type: 'interview',
      assistant: { enabled: true, outputs: [output('interview', { answers: [{ question: 'Qual o prazo?', answer: 'Três meses.', example: 'Exemplo ilustrativo: 3 meses.' }] })] }
    }));

    expect(screen.getByText('Qual o prazo?')).toBeTruthy();
    expect(screen.getByText('Três meses.')).toBeTruthy();
    expect(screen.getByText('Exemplo ilustrativo: 3 meses.')).toBeTruthy();
  });

  it('alinhamento: mostra os tópicos com as ideias embaixo', () => {
    renderPanel(baseSession({
      type: 'alignment',
      assistant: { enabled: true, outputs: [output('alignment', { topics: [{ title: 'Prazo e cronograma', ideas: ['Dividir em fases', 'Marco no fim do mês'] }] })] }
    }));

    const topic = screen.getByRole('group', { name: 'Prazo e cronograma' });
    expect(within(topic).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Dividir em fases', 'Marco no fim do mês']);
  });

  it('discovery: mostra cada pergunta com o alvo (PRD ou SPEC) e o motivo', () => {
    renderPanel(baseSession({
      type: 'discovery',
      assistant: { enabled: true, outputs: [output('discovery', { probes: [
        { question: 'Quais sistemas integram?', why: 'Contratos de integração.', target: 'spec' },
        { question: 'Qual o impacto?', why: 'Quantificar o problema.', target: 'prd' }
      ] })] }
    }));

    expect(screen.getByText('Quais sistemas integram?')).toBeTruthy();
    expect(screen.getByText('SPEC')).toBeTruthy();
    expect(screen.getByText('PRD')).toBeTruthy();
    expect(screen.getByText('Contratos de integração.')).toBeTruthy();
  });

  it('indica quando veio das regras locais e mostra o erro da IA, se houve', () => {
    renderPanel(baseSession({
      assistant: { enabled: true, outputs: [output('discovery', { probes: [], error: 'cota excedida' })] }
    }));

    expect(screen.getByText('Gerado por regras locais, sem IA')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('cota excedida');
  });

  it('mostra a análise mais recente e guarda as anteriores num bloco recolhido', () => {
    renderPanel(baseSession({
      type: 'discovery',
      assistant: { enabled: true, outputs: [
        output('discovery', { id: 'old', probes: [{ question: 'Pergunta antiga?', why: 'x', target: 'prd' }] }),
        output('discovery', { id: 'new', probes: [{ question: 'Pergunta nova?', why: 'y', target: 'prd' }] })
      ] }
    }));

    expect(screen.getByText('Pergunta nova?')).toBeTruthy();
    expect(screen.getByText(/Análises anteriores \(1\)/)).toBeTruthy();
  });
});
