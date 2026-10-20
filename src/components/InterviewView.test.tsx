import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InterviewView } from './InterviewView';
import { storageService } from '../services/storageService';
import { INTERVIEW_STEPS, skipStep } from '../services/interviewService';
import type { DiscoveryProject } from '../types/discovery';

const freshProject = (): DiscoveryProject => {
  const id = storageService.createNewProject('Projeto', 'Descrição').id;
  return storageService.getAllProjects().find(p => p.id === id)!;
};

function renderView(project: DiscoveryProject = freshProject()) {
  const handlers = { onConfirm: vi.fn(), onSkip: vi.fn(), onNavigateToView: vi.fn() };
  render(<InterviewView project={project} {...handlers} />);
  return handlers;
}

const answerWith = (text: string) => {
  fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('InterviewView: pergunta', () => {
  it('começa pelo problema, com o andamento e a dica de como responder', () => {
    renderView();

    expect(screen.getByText('Pergunta 1 de 10')).toBeTruthy();
    expect(screen.getByText(INTERVIEW_STEPS[0].question)).toBeTruthy();
    expect(screen.getByText(INTERVIEW_STEPS[0].hint)).toBeTruthy();
  });

  it('não deixa enviar uma resposta vazia', () => {
    renderView();

    expect((screen.getByRole('button', { name: 'Enviar resposta' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Enviar resposta' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('retoma de onde parou: pula as etapas que o projeto já tem', () => {
    renderView(skipStep(freshProject(), 'problem'));

    expect(screen.getByText('Pergunta 2 de 10')).toBeTruthy();
    expect(screen.getByText(INTERVIEW_STEPS[1].question)).toBeTruthy();
  });

  it('"Pular esta pergunta" avisa a tela', () => {
    const { onSkip } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Pular esta pergunta' }));

    expect(onSkip).toHaveBeenCalledWith('problem');
  });
});

describe('InterviewView: aprofundamento', () => {
  it('resposta curta gera uma pergunta de aprofundamento antes de salvar', async () => {
    renderView();

    answerWith('Faltas');

    expect(await screen.findByText(/exemplo concreto/i)).toBeTruthy();
    expect(screen.queryByText('Entendi assim')).toBeNull();
  });

  it('"Seguir sem complementar" vai direto para a conferência', async () => {
    renderView();
    answerWith('Faltas');
    await screen.findByText(/exemplo concreto/i);

    fireEvent.click(screen.getByRole('button', { name: 'Seguir sem complementar' }));

    expect(screen.getByText('Entendi assim')).toBeTruthy();
    expect(screen.getByText('Faltas')).toBeTruthy();
  });

  it('o complemento é somado à resposta original', async () => {
    const { onConfirm } = renderView();
    answerWith('Faltas');
    await screen.findByText(/exemplo concreto/i);

    fireEvent.change(screen.getByLabelText('Complemento'), { target: { value: 'um em cada cinco pacientes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar e continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onConfirm).toHaveBeenCalledWith('problem', 'Faltas um em cada cinco pacientes');
  });

  it('resposta já detalhada vai direto para a conferência', async () => {
    renderView();

    answerWith('A recepção gasta duas horas por dia ligando para confirmar consultas e ainda assim um em cada cinco pacientes falta.');

    expect(await screen.findByText('Entendi assim')).toBeTruthy();
  });
});

describe('InterviewView: conferência', () => {
  it('mostra onde a resposta será salva e só grava depois de confirmar', async () => {
    const { onConfirm } = renderView();
    answerWith('A recepção gasta duas horas por dia ligando para confirmar consultas e ainda assim um em cada cinco pacientes falta.');
    await screen.findByText('Entendi assim');

    expect(screen.getByText(/Problema no PRD/)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onConfirm).toHaveBeenCalledWith('problem', expect.stringContaining('duas horas por dia'));
  });

  it('"Editar" volta para a resposta, mantendo o texto', async () => {
    renderView();
    answerWith('Faltas');
    await screen.findByText(/exemplo concreto/i);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir sem complementar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect((screen.getByLabelText('Sua resposta') as HTMLTextAreaElement).value).toBe('Faltas');
  });

  it('respostas em lista aparecem como itens separados', async () => {
    const afterPeople = ['problem', 'audience', 'value', 'northStar', 'metrics', 'stakeholders'].reduce(skipStep, freshProject());
    renderView(afterPeople);
    answerWith('lembrete\nconfirmação');

    await screen.findByText('Entendi assim');

    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['lembrete', 'confirmação']);
  });
});

describe('InterviewView: conclusão', () => {
  it('sem perguntas restantes, avisa que a entrevista terminou e oferece os próximos passos', () => {
    const project = INTERVIEW_STEPS.map(s => s.id).reduce(skipStep, freshProject());
    const { onNavigateToView } = renderView(project);

    expect(screen.getByText('Entrevista concluída')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o PRD' }));

    expect(onNavigateToView).toHaveBeenCalledWith('documentation');
  });
});
