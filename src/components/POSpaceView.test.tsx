import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { POSpaceView } from './POSpaceView';
import { storageService } from '../services/storageService';
import { addNote } from '../services/noteService';
import type { DiscoveryProject } from '../types/discovery';

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

const ask = (text: string) => {
  fireEvent.change(screen.getByPlaceholderText(/Pergunte ou peça/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  projectId = storageService.createNewProject('Meu produto', 'Descrição').id;
});

afterEach(() => {
  cleanup();
});

describe('POSpaceView: chat sem chave de IA', () => {
  it('responde com o que o projeto tem registrado e avisa que não foi a IA', async () => {
    addNote(projectId, { text: 'O diretor quer o relatório semanal em PDF' });
    render(<POSpaceView project={load()} />);

    ask('O que o diretor quer do relatório?');

    expect(await screen.findByText(/O diretor quer o relatório semanal em PDF/)).toBeTruthy();
    expect(screen.getByText('Resposta da busca no projeto, sem IA')).toBeTruthy();
    expect(screen.queryByText(/Configure sua chave de API/)).toBeNull();
  });

  it('quando não há registro, diz que não encontrou em vez de mostrar erro', async () => {
    render(<POSpaceView project={load()} />);

    ask('Qual o orçamento aprovado?');

    expect(await screen.findByText(/Não encontrei nada registrado/)).toBeTruthy();
    expect(screen.queryByText(/Configure sua chave de API/)).toBeNull();
  });
});
