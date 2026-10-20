import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { storageService } from './services/storageService';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('App: começo limpo', () => {
  it('sem nenhum projeto, mostra a tela inicial com o convite para criar o primeiro (não fica em branco)', async () => {
    render(<App />);

    expect(await screen.findByText('Nenhum projeto cadastrado')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Criar Meu Primeiro Projeto/ })).toBeTruthy();
  });

  it('não traz projeto de exemplo nem oferece apagar tudo quando está vazio', async () => {
    render(<App />);
    await screen.findByText('Nenhum projeto cadastrado');

    expect(screen.queryByText(/Plataforma de Liquidação/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Apagar todos os projetos/ })).toBeNull();
    expect(storageService.getAllProjects()).toEqual([]);
  });

  it('criar o primeiro projeto entra nele e o persiste', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Criar Meu Primeiro Projeto/ }));

    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: 'Meu produto' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar e Começar Trabalho/ }));

    await waitFor(() => expect(storageService.getAllProjects()).toHaveLength(1));
    expect(storageService.getAllProjects()[0].name).toBe('Meu produto');
    expect((await screen.findAllByText(/Meu produto/)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Nenhum projeto cadastrado')).toBeNull();
  });
});

describe('App: copiloto entrevistador', () => {
  it('responder e confirmar grava no PRD e avança para a próxima pergunta', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Criar Meu Primeiro Projeto/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: 'Meu produto' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar e Começar Trabalho/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Copiloto me entrevista/ }));
    fireEvent.change(await screen.findByLabelText('Sua resposta'), {
      target: { value: 'A recepção gasta duas horas por dia ligando para confirmar consultas e ainda assim um em cada cinco pacientes falta.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(storageService.getAllProjects()[0].prd.problemStatement).toContain('duas horas por dia'));
    expect(await screen.findByText('Pergunta 2 de 10')).toBeTruthy();
  });
});
