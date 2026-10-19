import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useProjects } from './useProjects';
import { storageService } from '../services/storageService';
import { appendSegment } from '../services/sessionService';
import type { TranscriptSegment } from '../types/discovery';

const segment = (id: string): TranscriptSegment => ({
  id, speaker: 'Usuário / Stakeholder', text: id, timestamp: '00:00', isFinal: true,
});

async function setup(options?: Parameters<typeof useProjects>[0]) {
  const hook = renderHook(() => useProjects(options));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  localStorage.clear();
});

describe('useProjects: carga inicial', () => {
  it('carrega os projetos do storage e fica pronto', async () => {
    const { result } = await setup();

    expect(result.current.projects.length).toBeGreaterThan(0);
    expect(result.current.activeProject).not.toBeNull();
  });

  it('começa sem projeto ativo e não pronto, antes de ler o storage', () => {
    const { result } = renderHook(() => useProjects());

    expect(result.current.ready).toBe(false);
    expect(result.current.activeProject).toBeNull();
  });

  it('o projeto ativo é derivado da lista: é o mesmo objeto, não uma cópia (fonte única)', async () => {
    const { result } = await setup();

    expect(result.current.projects).toContain(result.current.activeProject);
  });

  it('não avisa de restauração quando não havia nada a restaurar', async () => {
    const onRestored = vi.fn();

    await setup({ onRestored });

    expect(onRestored).not.toHaveBeenCalled();
  });
});

describe('useProjects: operações', () => {
  it('select troca o projeto ativo', async () => {
    const { result } = await setup();
    let other = '';
    act(() => { other = result.current.create('Outro', '').id; });
    const first = result.current.projects.find(p => p.id !== other)!;

    act(() => result.current.select(first.id));

    expect(result.current.activeProject!.id).toBe(first.id);
    expect(storageService.getActiveProject().id).toBe(first.id);
  });

  it('create adiciona o projeto, o ativa e persiste', async () => {
    const { result } = await setup();

    let created = '';
    act(() => { created = result.current.create('Novo', 'Desc').id; });

    expect(result.current.activeProject!.id).toBe(created);
    expect(result.current.projects[0].id).toBe(created);
    expect(storageService.getAllProjects().some(p => p.id === created)).toBe(true);
  });

  it('saveProject atualiza o estado e persiste', async () => {
    const { result } = await setup();
    const active = result.current.activeProject!;

    act(() => result.current.saveProject({ ...active, name: 'Renomeado' }));

    expect(result.current.activeProject!.name).toBe('Renomeado');
    expect(storageService.getActiveProject().name).toBe('Renomeado');
  });

  it('update altera um projeto que não é o ativo, sem trocar o ativo', async () => {
    const { result } = await setup();
    let otherId = '';
    act(() => { otherId = result.current.create('Outro', '').id; });
    const activeBefore = result.current.activeProject!.id;
    const target = result.current.projects.find(p => p.id !== activeBefore)!;

    act(() => { result.current.update(target.id, p => ({ ...p, name: 'Alterado' })); });

    expect(result.current.projects.find(p => p.id === target.id)!.name).toBe('Alterado');
    expect(result.current.activeProject!.id).toBe(activeBefore);
    expect(otherId).toBe(activeBefore);
  });

  it('update devolve undefined para um projeto que não existe', async () => {
    const { result } = await setup();

    let returned: unknown = 'x';
    act(() => { returned = result.current.update('nao-existe', p => p); });

    expect(returned).toBeUndefined();
  });

  it('remove tira o projeto e o ativo passa a ser um dos restantes', async () => {
    const { result } = await setup();
    let created = '';
    act(() => { created = result.current.create('Descartável', '').id; });

    act(() => result.current.remove(created));

    expect(result.current.projects.some(p => p.id === created)).toBe(false);
    expect(result.current.projects).toContain(result.current.activeProject);
  });

  it('reset deixa um único projeto limpo e ativo', async () => {
    const { result } = await setup();

    let cleanId = '';
    act(() => { cleanId = result.current.reset().id; });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.activeProject!.id).toBe(cleanId);
  });
});

describe('useProjects: importação de JSON', () => {
  it('importa, adiciona no topo e ativa', async () => {
    const { result } = await setup();
    const json = JSON.stringify({ ...result.current.activeProject!, name: 'Exportado' });

    let importedId = '';
    act(() => { importedId = result.current.importFromJson(json).id; });

    expect(result.current.activeProject!.id).toBe(importedId);
    expect(result.current.activeProject!.name).toBe('Exportado (importado)');
  });

  it('JSON inválido lança erro e não altera o estado', async () => {
    const { result } = await setup();
    const before = result.current.projects.length;

    expect(() => act(() => { result.current.importFromJson('não é json'); })).toThrow('não é um JSON');
    expect(result.current.projects).toHaveLength(before);
  });
});

describe('useProjects: gravações feitas direto no storage', () => {
  it('refresh traz para o estado o que um serviço gravou no storage', async () => {
    const { result } = await setup();
    let projectId = '';
    act(() => { projectId = result.current.create('Com sessão', '').id; });
    const session = storageService.createNewSession(projectId);
    act(() => result.current.refresh());

    appendSegment(projectId, session.id, segment('falou'));
    expect(result.current.activeProject!.sessions[0].rawTranscript).toHaveLength(0);

    act(() => result.current.refresh());

    expect(result.current.activeProject!.sessions[0].rawTranscript.map(s => s.id)).toEqual(['falou']);
  });

  it('se o id ativo salvo não existe mais, o ativo cai no primeiro projeto', async () => {
    const { result } = await setup();
    storageService.setActiveProjectId('id-que-sumiu');

    act(() => result.current.refresh());

    expect(result.current.activeProject!.id).toBe(result.current.projects[0].id);
  });
});
