import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { UserFlowView } from './UserFlowView';
import type { UserFlowStep } from '../types/discovery';

afterEach(cleanup);

const STEPS: UserFlowStep[] = [
  { id: 's1', stepNumber: 1, title: 'Baixar extrato', actor: 'Ana', systemAction: '', frictionLevel: 'smooth' },
  {
    id: 's2', stepNumber: 2, title: 'Conferir linha a linha', actor: 'Ana', systemAction: '', frictionLevel: 'critical',
    painPointDetected: 'a fórmula quebra toda semana', quote: 'Em seguida confiro cada linha, a fórmula quebra toda semana', opportunity: 'Conciliar sozinho'
  }
];

const setup = (over: Partial<React.ComponentProps<typeof UserFlowView>> = {}) => {
  const props = {
    steps: STEPS, onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(), onRefresh: vi.fn(), ...over
  };
  render(<UserFlowView {...props} />);
  return props;
};

const card = (title: string) => screen.getByRole('listitem', { name: new RegExp(title) });

describe('UserFlowView', () => {
  it('mostra as etapas lado a lado, na ordem, com ator, dor, fala e oportunidade', () => {
    setup();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Baixar extrato');
    const second = card('Conferir linha a linha');
    expect(second.textContent).toContain('Ana');
    expect(second.textContent).toContain('a fórmula quebra toda semana');
    expect(second.textContent).toContain('Conciliar sozinho');
    expect(second.textContent).toContain('Crítico');
  });

  it('sem etapas, explica como a jornada nasce', () => {
    setup({ steps: [] });

    expect(screen.getByText(/primeiro.*depois.*por fim/i)).toBeTruthy();
  });

  it('edita título, fricção, dor e oportunidade de uma etapa', () => {
    const props = setup();
    fireEvent.click(within(card('Baixar extrato')).getByRole('button', { name: 'Editar etapa' }));

    fireEvent.change(screen.getByLabelText('Título da etapa'), { target: { value: 'Baixar extrato OFX' } });
    fireEvent.change(screen.getByLabelText('Fricção'), { target: { value: 'warning' } });
    fireEvent.change(screen.getByLabelText('Dor percebida'), { target: { value: 'Banco muda o formato' } });
    fireEvent.change(screen.getByLabelText('Oportunidade'), { target: { value: 'Integrar com o banco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar etapa' }));

    expect(props.onUpdate).toHaveBeenCalledWith('s1', {
      title: 'Baixar extrato OFX', frictionLevel: 'warning', painPointDetected: 'Banco muda o formato', opportunity: 'Integrar com o banco'
    });
  });

  it('não salva título em branco', () => {
    setup();
    fireEvent.click(within(card('Baixar extrato')).getByRole('button', { name: 'Editar etapa' }));

    fireEvent.change(screen.getByLabelText('Título da etapa'), { target: { value: '  ' } });

    expect((screen.getByRole('button', { name: 'Salvar etapa' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('move a etapa para a esquerda ou direita, e bloqueia nas pontas', () => {
    const props = setup();

    fireEvent.click(within(card('Conferir linha a linha')).getByRole('button', { name: 'Mover para antes' }));
    expect(props.onMove).toHaveBeenCalledWith('s2', 'up');
    expect((within(card('Baixar extrato')).getByRole('button', { name: 'Mover para antes' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(card('Conferir linha a linha')).getByRole('button', { name: 'Mover para depois' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('apagar pede confirmação', () => {
    const props = setup();
    const target = card('Baixar extrato');

    fireEvent.click(within(target).getByRole('button', { name: 'Apagar etapa' }));
    expect(props.onRemove).not.toHaveBeenCalled();
    fireEvent.click(within(card('Baixar extrato')).getByRole('button', { name: 'Confirmar: apagar etapa' }));

    expect(props.onRemove).toHaveBeenCalledWith('s1');
  });

  it('adiciona etapa nova com título, ator e fricção', () => {
    const props = setup();

    fireEvent.change(screen.getByLabelText('Nova etapa'), { target: { value: 'Enviar relatório' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar etapa' }));

    expect(props.onAdd).toHaveBeenCalledWith({ title: 'Enviar relatório', actor: 'Entrevistado', frictionLevel: 'smooth' });
  });

  it('"Atualizar jornada" refaz a partir da conversa', () => {
    const props = setup();

    fireEvent.click(screen.getByRole('button', { name: /Atualizar jornada/ }));

    expect(props.onRefresh).toHaveBeenCalled();
  });

  it('resume onde está o atrito: quantas etapas críticas e com atenção', () => {
    setup();

    expect(screen.getByText(/1 crítica/)).toBeTruthy();
    expect(screen.getByText(/0 com atenção/)).toBeTruthy();
  });
});
