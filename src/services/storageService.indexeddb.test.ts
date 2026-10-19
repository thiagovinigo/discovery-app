import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_MOCK_PROJECT } from './mockDataService';
import type { DiscoveryProject } from '../types/discovery';

type StorageServiceType = (typeof import('./storageService'))['storageService'];

const PROJECTS_KEY = 'discovery_done_projects_v1';
const OLD = '2026-01-01T00:00:00.000Z';
const NEW = '2026-02-01T00:00:00.000Z';

let storageService: StorageServiceType;

const project = (id: string, name: string = id, updatedAt: string = OLD): DiscoveryProject => ({
  ...INITIAL_MOCK_PROJECT,
  id,
  name,
  updatedAt,
});

const idsInLocalStorage = (): string[] =>
  (JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]') as DiscoveryProject[]).map(p => p.id);

const deleteIndexedDb = () =>
  new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase('discovery_done_indexed_db');
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });

beforeEach(async () => {
  localStorage.clear();
  await deleteIndexedDb();
  vi.resetModules(); // zera o estado em memória do serviço (fila de espelho e cópia de cota)
  ({ storageService } = await import('./storageService'));
});

afterEach(async () => {
  // uma gravação ainda na fila poderia terminar depois que o próximo teste limpou o banco
  await storageService.flushMirror();
  vi.restoreAllMocks();
});

describe('storageService: restauração a partir do IndexedDB (E3.3)', () => {
  it('os projetos voltam quando o localStorage foi limpo', async () => {
    storageService.saveAllProjects([project('a'), project('b')]);
    await storageService.flushMirror();
    localStorage.clear();

    const restored = await storageService.restoreFromIndexedDb();

    expect(restored).toBe(true);
    expect(idsInLocalStorage()).toEqual(['a', 'b']);
    expect(storageService.getAllProjects().map(p => p.id)).toEqual(['a', 'b']);
  });

  it('não restaura nada quando o IndexedDB está vazio', async () => {
    expect(await storageService.restoreFromIndexedDb()).toBe(false);
    expect(localStorage.getItem(PROJECTS_KEY)).toBeNull();
  });

  it('um projeto excluído não volta na restauração', async () => {
    storageService.saveAllProjects([project('a'), project('b')]);
    await storageService.flushMirror();

    storageService.deleteProject('a');
    await storageService.flushMirror();
    localStorage.clear();
    await storageService.restoreFromIndexedDb();

    expect(storageService.getAllProjects().map(p => p.id)).toEqual(['b']);
  });

  it('a versão mais nova do IndexedDB vence a versão velha do localStorage', async () => {
    storageService.saveAllProjects([project('a', 'versão nova', NEW)]);
    await storageService.flushMirror();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project('a', 'versão velha', OLD)]));

    const restored = await storageService.restoreFromIndexedDb();

    expect(restored).toBe(true);
    expect(storageService.getAllProjects()[0].name).toBe('versão nova');
  });

  it('não mexe no localStorage quando ele já está igual ou mais novo, e mantém projetos só locais', async () => {
    storageService.saveAllProjects([project('a')]);
    await storageService.flushMirror();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project('c'), project('a', 'a', NEW)]));

    const restored = await storageService.restoreFromIndexedDb();

    expect(restored).toBe(false);
    expect(idsInLocalStorage()).toEqual(['c', 'a']);
  });
});

describe('storageService: estouro de cota do localStorage (E3.3)', () => {
  const failSetItem = () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
  };

  it('a leitura seguinte devolve o que acabou de ser salvo, não a cópia velha', () => {
    storageService.saveAllProjects([project('q', 'antigo')]);
    const setItem = failSetItem();

    storageService.saveAllProjects([project('q', 'salvo durante a cota')]);

    expect(storageService.getAllProjects()[0].name).toBe('salvo durante a cota');
    setItem.mockRestore();
  });

  it('o que foi salvo durante o estouro volta no próximo carregamento', async () => {
    const setItem = failSetItem();
    storageService.saveAllProjects([project('q', 'só no IndexedDB', NEW)]);
    await storageService.flushMirror();
    setItem.mockRestore();
    localStorage.clear();

    await storageService.restoreFromIndexedDb();

    expect(storageService.getAllProjects()[0].name).toBe('só no IndexedDB');
  });

  it('quando volta a caber, o localStorage volta a ser a fonte da leitura', () => {
    const setItem = failSetItem();
    storageService.saveAllProjects([project('q', 'durante a cota')]);
    setItem.mockRestore();

    storageService.saveAllProjects([project('r', 'depois da cota')]);

    expect(storageService.getAllProjects().map(p => p.id)).toEqual(['r']);
    expect(idsInLocalStorage()).toEqual(['r']);
  });
});
