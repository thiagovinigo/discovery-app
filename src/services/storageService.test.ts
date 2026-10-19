import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from './storageService';
import { exportService } from './exportService';
import { INITIAL_MOCK_PROJECT } from './mockDataService';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('storageService: projetos', () => {
  it('semeia o projeto de exemplo quando o storage está vazio', () => {
    const projects = storageService.getAllProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(INITIAL_MOCK_PROJECT.id);
  });

  it('cria um projeto novo, persiste e o torna o ativo', () => {
    const created = storageService.createNewProject('Projeto A', 'Descrição A');

    expect(created.sessions).toEqual([]);
    expect(storageService.getActiveProject().id).toBe(created.id);
    expect(storageService.getAllProjects().some(p => p.id === created.id)).toBe(true);
  });

  it('usa nome padrão quando o nome vem vazio', () => {
    expect(storageService.createNewProject('', '').name).toBe('Novo Projeto de Discovery');
  });

  it('exclui o projeto e ativa o primeiro restante', () => {
    const a = storageService.createNewProject('A', '');
    const remaining = storageService.deleteProject(a.id);

    expect(remaining.some(p => p.id === a.id)).toBe(false);
    expect(storageService.getActiveProject().id).toBe(remaining[0].id);
  });

  it('cai no primeiro projeto quando o id ativo não existe', () => {
    storageService.getAllProjects();
    storageService.setActiveProjectId('id-inexistente');
    expect(storageService.getActiveProject().id).toBe(INITIAL_MOCK_PROJECT.id);
  });

  it('createNewSession adiciona a sessão no topo e a marca como ativa', () => {
    const project = storageService.createNewProject('P', '');
    const session = storageService.createNewSession(project.id, 'Entrevista 1');

    const reloaded = storageService.getActiveProject();
    expect(reloaded.sessions[0].id).toBe(session.id);
    expect(reloaded.activeSessionId).toBe(session.id);
    expect(session.rawTranscript).toEqual([]);
  });

  it('saveActiveProject atualiza updatedAt e substitui o projeto existente', () => {
    const project = storageService.createNewProject('P', '');
    storageService.saveActiveProject({ ...project, name: 'Renomeado', updatedAt: '2000-01-01T00:00:00.000Z' });

    const reloaded = storageService.getAllProjects().find(p => p.id === project.id)!;
    expect(reloaded.name).toBe('Renomeado');
    expect(reloaded.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('devolve o projeto de exemplo quando o JSON salvo está corrompido', () => {
    localStorage.setItem('discovery_done_projects_v1', '{corrompido');
    expect(storageService.getAllProjects()[0].id).toBe(INITIAL_MOCK_PROJECT.id);
  });
});

describe('storageService: chaves de API', () => {
  it('não devolve chave nenhuma quando o usuário não configurou', () => {
    expect(storageService.getOpenAiApiKey()).toBe('');
    expect(storageService.getApiKey()).toBe('');
  });

  it('chave sk- troca o provider para OpenAI e guarda a chave', () => {
    storageService.setAiProvider('gemini');
    storageService.setApiKey('  sk-teste-123  ');

    expect(storageService.getAiProvider()).toBe('openai');
    expect(storageService.getApiKey()).toBe('sk-teste-123');
  });

  it('chave sem prefixo sk- vai para o provider ativo', () => {
    storageService.setAiProvider('gemini');
    storageService.setApiKey('AIza-teste');

    expect(storageService.getGeminiApiKey()).toBe('AIza-teste');
    expect(storageService.getOpenAiApiKey()).toBe('');
  });

  it('usa os modelos padrão de cada provider', () => {
    expect(storageService.getOpenAiModel()).toBe('gpt-4o-mini');
    expect(storageService.getGeminiModel()).toBe('gemini-2.5-flash');
  });
});

describe('storageService: backup JSON (exportar e reimportar)', () => {
  it('reimporta o conteúdo; só id, nome e updatedAt mudam', () => {
    const original = storageService.getAllProjects()[0];
    const json = exportService.exportToJson(original);

    const imported = storageService.importProject(json);

    expect(imported.id).not.toBe(original.id);
    expect(imported.name).toBe(`${original.name} (importado)`);
    const { id: _a, name: _b, updatedAt: _c, ...importedRest } = imported;
    const { id: _d, name: _e, updatedAt: _f, ...originalRest } = original;
    expect(importedRest).toEqual(originalRest);
  });

  it('o projeto importado vira o ativo e entra no topo da lista', () => {
    const imported = storageService.importProject(exportService.exportToJson(INITIAL_MOCK_PROJECT));

    expect(storageService.getActiveProject().id).toBe(imported.id);
    expect(storageService.getAllProjects()[0].id).toBe(imported.id);
  });

  it('rejeita texto que não é JSON', () => {
    expect(() => storageService.importProject('isto não é json')).toThrow('não é um JSON');
  });

  it('rejeita JSON que não parece um projeto', () => {
    expect(() => storageService.importProject('{"foo":1}')).toThrow('não parece ser um projeto');
  });

  it('completa listas ausentes com arrays vazios', () => {
    const minimal = JSON.stringify({ name: 'Mínimo', sessions: [], prd: INITIAL_MOCK_PROJECT.prd });
    const imported = storageService.importProject(minimal);

    expect(imported.okrs).toEqual([]);
    expect(imported.epics).toEqual([]);
    expect(imported.decisionLog).toEqual([]);
  });
});

describe('storageService: operações sobre o projeto ativo', () => {
  it('addBugReport grava o bug no projeto ativo', () => {
    const project = storageService.createNewProject('P', '');
    const bug = storageService.addBugReport(project.id, {
      title: 'Bug',
      description: 'd',
      severity: 'high',
      status: 'open',
      createdAt: '2026-01-01',
    } as never);

    expect(storageService.getActiveProject().bugReports?.[0].id).toBe(bug.id);
  });

  // Bug conhecido (E3.2 do BACKLOG.md): as funções ignoram o projectId recebido e
  // sempre alteram o projeto ativo. Quando E3.2 for corrigido, este teste passa a
  // falhar como "it.fails": remova o .fails.
  it.fails('addBugReport respeita o projectId recebido, não o projeto ativo', () => {
    // Os ids são 'proj-' + Date.now(): sem avançar o relógio, A e B nasceriam com o mesmo id.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);
    const a = storageService.createNewProject('A', '');
    vi.setSystemTime(2_000);
    storageService.createNewProject('B', ''); // B fica ativo

    storageService.addBugReport(a.id, {
      title: 'Bug do A',
      description: 'd',
      severity: 'high',
      status: 'open',
      createdAt: '2026-01-01',
    } as never);

    const projectA = storageService.getAllProjects().find(p => p.id === a.id)!;
    expect(projectA.bugReports).toHaveLength(1);
  });

  it('updateStoryChecklists grava DoR e DoD na história indicada', () => {
    const epic = INITIAL_MOCK_PROJECT.epics[0];
    const feature = epic.features[0];
    const story = feature.userStories[0];
    const dor = [{ id: 'c1', label: 'Pronto', checked: true }] as never;
    const dod = [{ id: 'c2', label: 'Feito', checked: false }] as never;

    storageService.getAllProjects();
    storageService.updateStoryChecklists(INITIAL_MOCK_PROJECT.id, epic.id, feature.id, story.id, dor, dod);

    const saved = storageService.getActiveProject().epics[0].features[0].userStories[0];
    expect(saved.dorChecklist).toEqual(dor);
    expect(saved.dodChecklist).toEqual(dod);
  });

  it('updateStoryChecklists ignora ids que não existem, sem lançar erro', () => {
    storageService.getAllProjects();
    expect(() => storageService.updateStoryChecklists('p', 'e-x', 'f-x', 's-x', [], [])).not.toThrow();
  });
});

describe('storageService: reset, modelos e persistência', () => {
  it('resetForOfficialTests deixa um único projeto limpo, com uma sessão vazia e ativa', () => {
    const clean = storageService.resetForOfficialTests('Meu Projeto', 'Desc');

    expect(storageService.getAllProjects()).toHaveLength(1);
    expect(clean.name).toBe('Meu Projeto');
    expect(clean.sessions).toHaveLength(1);
    expect(clean.activeSessionId).toBe(clean.sessions[0].id);
    expect(clean.epics).toEqual([]);
  });

  it('guarda o modelo separadamente para cada provider', () => {
    storageService.setAiProvider('openai');
    storageService.setModel('gpt-4o');
    storageService.setAiProvider('gemini');
    storageService.setModel('gemini-2.5-pro');

    expect(storageService.getModel()).toBe('gemini-2.5-pro');
    storageService.setAiProvider('openai');
    expect(storageService.getModel()).toBe('gpt-4o');
  });

  it('completa personas e bugReports ausentes em projetos antigos', () => {
    const legacy = { ...INITIAL_MOCK_PROJECT, id: 'proj-antigo', personas: undefined, bugReports: undefined };
    localStorage.setItem('discovery_done_projects_v1', JSON.stringify([legacy]));

    const [loaded] = storageService.getAllProjects();
    expect(loaded.personas).toEqual([]);
    expect(loaded.bugReports).toEqual([]);
  });

  it('não lança erro quando o localStorage estoura a cota ao salvar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => storageService.saveAllProjects([INITIAL_MOCK_PROJECT])).not.toThrow();

    setItem.mockRestore();
    warn.mockRestore();
  });

  it('devolve lista vazia do IndexedDB quando o navegador não o oferece', async () => {
    await expect(storageService.getProjectsFromIndexedDb()).resolves.toEqual([]);
  });
});
