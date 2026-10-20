import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EvidencePanel } from './EvidencePanel';
import type { EvidenceSuggestion } from '../services/evidenceService';

const confirms: EvidenceSuggestion = {
  id: 'ev:s1:sess-1:g1', level: 'história', itemId: 's1', itemTitle: 'Exportar PDF', stance: 'confirms',
  quote: 'Eu preciso exportar toda semana', speaker: 'Ana', timestamp: '04:12', sessionId: 'sess-1', sessionTitle: 'Kickoff'
};
const contests: EvidenceSuggestion = {
  id: 'ev:s2:sess-1:g2', level: 'feature', itemId: 'f1', itemTitle: 'Dashboard', stance: 'contests',
  quote: 'Ninguém usa dashboard aqui', speaker: 'Bruno', timestamp: '10:30', sessionId: 'sess-1', sessionTitle: 'Kickoff'
};

function renderPanel(suggestions: EvidenceSuggestion[]) {
  const handlers = { onApply: vi.fn(), onDiscard: vi.fn() };
  render(<EvidencePanel suggestions={suggestions} {...handlers} />);
  return handlers;
}

afterEach(() => {
  cleanup();
});

describe('EvidencePanel', () => {
  it('mostra, para cada sugestão, o item, se confirma ou contesta, a citação, quem falou, a reunião e o minuto', () => {
    renderPanel([confirms, contests]);

    expect(screen.getByText('Confirma')).toBeTruthy();
    expect(screen.getByText('Contesta')).toBeTruthy();
    expect(screen.getByText(/Eu preciso exportar toda semana/)).toBeTruthy();
    expect(screen.getByText('Ana · Kickoff · 04:12')).toBeTruthy();
    expect(screen.getByText('Exportar PDF')).toBeTruthy();
  });

  it('já vem tudo marcado, e dá para desmarcar uma sugestão errada', () => {
    const { onApply } = renderPanel([confirms, contests]);
    const contestBox = screen.getByLabelText(/Dashboard/) as HTMLInputElement;
    expect((screen.getByLabelText(/Exportar PDF/) as HTMLInputElement).checked).toBe(true);
    expect(contestBox.checked).toBe(true);

    fireEvent.click(contestBox);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar selecionadas (1)' }));

    expect(onApply).toHaveBeenCalledWith([confirms.id]);
  });

  it('sem nada marcado, o botão de registrar fica desabilitado', () => {
    renderPanel([confirms]);

    fireEvent.click(screen.getByLabelText(/Exportar PDF/));

    expect((screen.getByRole('button', { name: 'Registrar selecionadas (0)' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('avisa que são sugestões por palavras e que nada vale até registrar', () => {
    renderPanel([confirms]);

    expect(screen.getByText(/sugestões por palavras-chave/i)).toBeTruthy();
  });

  it('"Descartar" fecha sem registrar', () => {
    const { onApply, onDiscard } = renderPanel([confirms]);

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onDiscard).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
