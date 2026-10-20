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

describe('App: agenda de reuniões', () => {
  it('marcar uma reunião e iniciá-la abre a sala já com tipo, pauta e objetivo', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Criar Meu Primeiro Projeto/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: 'Meu produto' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar e Começar Trabalho/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Agenda de Reuniões/ }));
    fireEvent.change(await screen.findByLabelText('Título da reunião'), { target: { value: 'Kickoff' } });
    fireEvent.change(screen.getByLabelText('Tipo da conversa'), { target: { value: 'alignment' } });
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2099-03-10T14:00' } });
    fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: 'Fechar o escopo' } });
    fireEvent.change(screen.getByLabelText('Pauta (um item por linha)'), { target: { value: 'Prazo\nOrçamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar reunião' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar reunião' }));

    expect(await screen.findByLabelText('Pauta da reunião')).toBeTruthy();
    expect(screen.getByText(/Fechar o escopo/)).toBeTruthy();
    await waitFor(() => {
      const project = storageService.getAllProjects()[0];
      expect(project.sessions[0]).toMatchObject({ title: 'Kickoff', type: 'alignment', agenda: ['Prazo', 'Orçamento'] });
      expect(project.scheduledMeetings![0].status).toBe('started');
    });
  });
});

describe('App: fechamento da reunião', () => {
  it('encerrar a reunião com o copiloto grava uma anotação #fechamento ligada à sala', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Criar Meu Primeiro Projeto/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: 'Meu produto' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar e Começar Trabalho/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Gravação & Sala ao Vivo/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar primeira sessão/ }));
    fireEvent.change(await screen.findByLabelText('O que ficou claro?'), { target: { value: 'Escopo fechado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fechamento' }));

    await waitFor(() => {
      const project = storageService.getAllProjects()[0];
      expect(project.notes).toHaveLength(1);
      expect(project.notes![0]).toMatchObject({ tags: ['fechamento'], sessionId: project.sessions[0].id });
    });
    expect(await screen.findByRole('button', { name: 'Atualizar fechamento' })).toBeTruthy();
  });
});

describe('App: anotações', () => {
  it('anotar, buscar e transformar em decisão e em história do backlog', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Criar Meu Primeiro Projeto/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: 'Meu produto' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar e Começar Trabalho/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Anotações/ }));
    fireEvent.change(await screen.findByLabelText('Nova anotação'), { target: { value: 'Adiar o lançamento\nO time pediu mais tempo.' } });
    fireEvent.change(screen.getByLabelText('Etiquetas'), { target: { value: 'prazo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar anotação' }));

    await waitFor(() => expect(storageService.getAllProjects()[0].notes).toHaveLength(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Virar decisão' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Virar história' }));

    await waitFor(() => {
      const project = storageService.getAllProjects()[0];
      expect(project.decisionLog.map(d => d.decision)).toEqual(['Adiar o lançamento']);
      expect(project.epics.find(e => e.title === 'Anotações do projeto')?.features[0].userStories).toHaveLength(1);
    });
    expect(await screen.findByText('Virou decisão')).toBeTruthy();
    expect(screen.getByText('Virou história')).toBeTruthy();
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
