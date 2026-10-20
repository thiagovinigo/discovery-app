import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from './storageService';
import { callAI } from './aiClient';
import { addStakeholder } from './stakeholderService';
import { addNote } from './noteService';
import { scheduleMeeting } from './meetingService';
import { buildProjectContext, chatWithProject } from './agentService';
import type { DiscoveryProject } from '../types/discovery';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});
const callAIMock = vi.mocked(callAI);

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;
const ask = (text: string) => [{ role: 'user' as const, text }];

beforeEach(() => {
  localStorage.clear();
  callAIMock.mockReset();
  projectId = storageService.createNewProject('Meu produto', 'Descrição do produto').id;
});

describe('buildProjectContext', () => {
  it('projeto novo não imprime campos do PRD em branco nem seções vazias', () => {
    const context = buildProjectContext(load());

    expect(context).toContain('# Projeto: Meu produto');
    expect(context).not.toContain('Problema:');
    expect(context).not.toContain('## PRD');
    expect(context).not.toContain('## Stakeholders');
    expect(context).not.toContain('## Anotações');
  });

  it('inclui só os campos do PRD que foram preenchidos', () => {
    const project = { ...load(), prd: { ...load().prd, problemStatement: 'Faltas sem aviso', northStarMetric: 'Comparecimento' } };

    const context = buildProjectContext(project);

    expect(context).toContain('## PRD');
    expect(context).toContain('Problema: Faltas sem aviso');
    expect(context).toContain('North Star: Comparecimento');
    expect(context).not.toContain('Público:');
  });

  it('inclui stakeholders, anotações, reuniões marcadas e decisões', () => {
    addStakeholder(projectId, { name: 'Ana', role: 'decisor', organization: 'Clínica X', interest: 'alto', influence: 'alto' });
    addNote(projectId, { text: 'Prazo apertado no lançamento', tags: ['prazo'] });
    scheduleMeeting(projectId, { title: 'Kickoff', type: 'alignment', startsAt: '2099-03-10T14:00' });
    const project: DiscoveryProject = {
      ...load(),
      decisionLog: [{ id: 'd1', date: '01/01/2026', decision: 'Adiar o lançamento', context: '', driver: '', consequences: '', status: 'approved' }]
    };

    const context = buildProjectContext(project);

    expect(context).toContain('## Stakeholders');
    expect(context).toContain('Ana (Decisor, Clínica X)');
    expect(context).toContain('## Anotações');
    expect(context).toContain('#prazo Prazo apertado no lançamento');
    expect(context).toContain('## Reuniões marcadas');
    expect(context).toContain('Kickoff');
    expect(context).toContain('## Decisões');
    expect(context).toContain('Adiar o lançamento');
  });

  it('limita as anotações às 20 mais recentes', () => {
    for (let i = 1; i <= 25; i++) addNote(projectId, { text: `Anotação número ${i}` });
    const notes = load().notes!.map((n, i) => ({ ...n, updatedAt: `2026-01-01T10:00:${String(i).padStart(2, '0')}.000Z` }));

    const context = buildProjectContext({ ...load(), notes });

    expect(context).toContain('Anotação número 25');
    expect(context).not.toContain('Anotação número 5\n');
    expect(context.match(/Anotação número/g)).toHaveLength(20);
  });
});

describe('chatWithProject sem chave de IA', () => {
  it('responde com o que o projeto tem registrado e diz de onde veio', async () => {
    addNote(projectId, { text: 'O diretor quer o relatório semanal em PDF' });

    const res = await chatWithProject(ask('O que o diretor quer do relatório?'), load());

    expect(res.error).toBeUndefined();
    expect(res.offline).toBe(true);
    expect(res.text).toContain('O diretor quer o relatório semanal em PDF');
    expect(res.text).toContain('Anotação de');
    expect(callAIMock).not.toHaveBeenCalled();
  });

  it('sem nada registrado, diz que não encontrou em vez de inventar', async () => {
    const res = await chatWithProject(ask('Qual o orçamento aprovado?'), load());

    expect(res.offline).toBe(true);
    expect(res.text).toMatch(/Não encontrei nada registrado/);
    expect(res.text).toMatch(/chave de IA/);
  });
});

describe('chatWithProject com chave de IA', () => {
  beforeEach(() => {
    storageService.setApiKey('sk-teste');
  });

  it('anexa os trechos encontrados ao prompt e pede para citar a fonte', async () => {
    addNote(projectId, { text: 'O diretor quer o relatório semanal em PDF' });
    callAIMock.mockResolvedValue('Ele quer em PDF [Anotação].');

    const res = await chatWithProject(ask('O que o diretor quer do relatório?'), load());

    expect(res).toEqual({ text: 'Ele quer em PDF [Anotação].' });
    const call = callAIMock.mock.calls[0][0];
    expect(call.userPrompt).toContain('TRECHOS ENCONTRADOS NO PROJETO');
    expect(call.userPrompt).toContain('O diretor quer o relatório semanal em PDF');
    expect(call.systemPrompt).toMatch(/cite/i);
    expect(call.systemPrompt).toMatch(/não inventa|não há registro/i);
  });

  it('sem trecho relevante, avisa a IA de que nada casou', async () => {
    callAIMock.mockResolvedValue('Não há registro sobre isso.');

    await chatWithProject(ask('Qual o orçamento aprovado?'), load());

    expect(callAIMock.mock.calls[0][0].userPrompt).toContain('Nenhum trecho do projeto casou com a pergunta');
  });

  it('se a IA falhar, entrega a busca local avisando do problema', async () => {
    addNote(projectId, { text: 'O diretor quer o relatório semanal em PDF' });
    callAIMock.mockRejectedValue(new Error('cota excedida'));

    const res = await chatWithProject(ask('O que o diretor quer do relatório?'), load());

    expect(res.error).toBeUndefined();
    expect(res.offline).toBe(true);
    expect(res.text).toContain('A IA não respondeu (cota excedida)');
    expect(res.text).toContain('O diretor quer o relatório semanal em PDF');
  });
});
