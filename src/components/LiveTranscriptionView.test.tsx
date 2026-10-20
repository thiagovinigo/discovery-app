import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LiveTranscriptionView } from './LiveTranscriptionView';
import type { Stakeholder, TranscriptSegment } from '../types/discovery';

afterEach(cleanup);

const person = (id: string, name: string): Stakeholder => ({ id, name, role: 'usuario', interest: 'alto', influence: 'medio', createdAt: '2026-01-01' });
const ANA = person('sh-ana', 'Ana Souza');
const BRUNO = person('sh-bruno', 'Bruno Lima');

const SEGMENTS: TranscriptSegment[] = [
  { id: 'a', speaker: 'Usuário / Stakeholder', text: 'Aqui é a Ana, cuido do fechamento', timestamp: '00:05', isFinal: true },
  { id: 'b', speaker: 'Usuário / Stakeholder', text: 'O fechamento demora', timestamp: '00:20', isFinal: true, speakerStakeholderId: 'sh-bruno' }
];

const setup = (over: Partial<React.ComponentProps<typeof LiveTranscriptionView>> = {}) => {
  const props = { segments: SEGMENTS, onManualNoteSubmit: vi.fn(), ...over };
  render(<LiveTranscriptionView {...props} />);
  return props;
};

describe('LiveTranscriptionView · identificação de quem falou', () => {
  it('mostra o nome da pessoa cadastrada no lugar do papel genérico', () => {
    setup({ stakeholders: [ANA, BRUNO], onAssignSpeaker: vi.fn() });

    expect(screen.getAllByText('Bruno Lima').some(el => el.tagName === 'SPAN')).toBe(true);
    expect(screen.queryAllByText('Usuário / Stakeholder').some(el => el.tagName === 'SPAN')).toBe(true);
  });

  it('cada fala tem um seletor para dizer quem falou, que chama onAssignSpeaker', () => {
    const props = setup({ stakeholders: [ANA, BRUNO], onAssignSpeaker: vi.fn() });

    const selects = screen.getAllByLabelText('Quem falou');
    fireEvent.change(selects[0], { target: { value: 'sh-ana' } });

    expect(props.onAssignSpeaker).toHaveBeenCalledWith('a', 'sh-ana');
  });

  it('"Sem identificar" limpa a atribuição', () => {
    const props = setup({ stakeholders: [ANA, BRUNO], onAssignSpeaker: vi.fn() });

    fireEvent.change(screen.getAllByLabelText('Quem falou')[1], { target: { value: '' } });

    expect(props.onAssignSpeaker).toHaveBeenCalledWith('b', undefined);
  });

  it('sem pessoas cadastradas, não mostra o seletor', () => {
    setup({ stakeholders: [], onAssignSpeaker: vi.fn() });

    expect(screen.queryByLabelText('Quem falou')).toBeNull();
  });

  it('mostra a sugestão do texto na fala e aceita com um clique', () => {
    const props = setup({
      stakeholders: [ANA, BRUNO],
      onAssignSpeaker: vi.fn(),
      speakerSuggestions: [{ segmentId: 'a', stakeholderId: 'sh-ana', reason: 'Se apresentou como Ana Souza nesta fala.' }]
    });

    fireEvent.click(screen.getByRole('button', { name: /Aceitar: Ana Souza/ }));

    expect(props.onAssignSpeaker).toHaveBeenCalledWith('a', 'sh-ana');
  });

  it('aplica todas as sugestões de uma vez', () => {
    const onApplySuggestions = vi.fn();
    setup({
      stakeholders: [ANA, BRUNO],
      onAssignSpeaker: vi.fn(),
      onApplySuggestions,
      speakerSuggestions: [{ segmentId: 'a', stakeholderId: 'sh-ana', reason: 'x' }]
    });

    const banner = screen.getByRole('status');
    expect(banner.textContent).toContain('1 fala');
    fireEvent.click(within(banner).getByRole('button', { name: /Aplicar/ }));

    expect(onApplySuggestions).toHaveBeenCalled();
  });

  it('sem sugestões, não mostra o aviso', () => {
    setup({ stakeholders: [ANA], onAssignSpeaker: vi.fn(), speakerSuggestions: [] });

    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('LiveTranscriptionView · sala vazia', () => {
  it('não preenche o campo com um exemplo fictício ao escolher "Colar Anotação"', () => {
    setup({ segments: [] });

    fireEvent.click(screen.getByRole('button', { name: /Colar Anotação/ }));

    expect((screen.getByPlaceholderText(/Digite uma anotação/) as HTMLInputElement).value).toBe('');
  });
});
