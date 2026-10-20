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

describe('storageService: começo limpo', () => {
  it('não cria projeto de exemplo quando o storage está vazio', () => {
    expect(storageService.getAllProjects()).toEqual([]);
    expect(localStorage.getItem('discovery_done_projects_v1')).toBeNull();
  });

  it('getActiveProject devolve null quando não há projetos', () => {
    expect(storageService.getActiveProject()).toBeNull();
  });

  it('JSON corrompido dá lista vazia, sem projeto de exemplo', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('discovery_done_projects_v1', '{corrompido');

    expect(storageService.getAllProjects()).toEqual([]);
  });

  it('clearAllProjects apaga todos os projetos e o projeto ativo', () => {
    storageService.createNewProject('A', '');
    storageService.createNewProject('B', '');

    storageService.clearAllProjects();

    expect(storageService.getAllProjects()).toEqual([]);
    expect(storageService.getActiveProjectId()).toBeNull();
    expect(storageService.getActiveProject()).toBeNull();
  });
});

describe('storageService: projetos', () => {
  it('cria um projeto novo, persiste e o torna o ativo', () => {
    const created = storageService.createNewProject('Projeto A', 'Descrição A');

    expect(created.sessions).toEqual([]);
    expect(storageService.getActiveProject()?.id).toBe(created.id);
    expect(storageService.getAllProjects().some(p => p.id === created.id)).toBe(true);
  });

  it('usa nome padrão quando o nome vem vazio', () => {
    expect(storageService.createNewProject('', '').name).toBe('Novo Projeto de Discovery');
  });

  it('exclui o projeto e ativa o primeiro restante', () => {
    const a = storageService.createNewProject('A', '');
    const b = storageService.createNewProject('B', '');
    const remaining = storageService.deleteProject(a.id);

    expect(remaining.map(p => p.id)).toEqual([b.id]);
    expect(storageService.getActiveProject()?.id).toBe(b.id);
  });

  it('excluir o último projeto deixa o app vazio', () => {
    const only = storageService.createNewProject('Único', '');

    expect(storageService.deleteProject(only.id)).toEqual([]);
    expect(storageService.getActiveProject()).toBeNull();
  });

  it('cai no primeiro projeto quando o id ativo não existe', () => {
    storageService.saveAllProjects([INITIAL_MOCK_PROJECT]);
    storageService.setActiveProjectId('id-inexistente');
    expect(storageService.getActiveProject()?.id).toBe(INITIAL_MOCK_PROJECT.id);
  });

  it('createNewSession adiciona a sessão no topo e a marca como ativa', () => {
    const project = storageService.createNewProject('P', '');
    const session = storageService.createNewSession(project.id, 'Entrevista 1');

    const reloaded = storageService.getActiveProject();
    expect(reloaded?.sessions[0].id).toBe(session.id);
    expect(reloaded?.activeSessionId).toBe(session.id);
    expect(session.rawTranscript).toEqual([]);
  });

  it('saveActiveProject atualiza updatedAt e substitui o projeto existente', () => {
    const project = storageService.createNewProject('P', '');
    storageService.saveActiveProject({ ...project, name: 'Renomeado', updatedAt: '2000-01-01T00:00:00.000Z' });

    const reloaded = storageService.getAllProjects().find(p => p.id === project.id)!;
    expect(reloaded.name).toBe('Renomeado');
    expect(reloaded.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
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
    storageService.saveAllProjects([INITIAL_MOCK_PROJECT]);
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

    expect(storageService.getActiveProject()?.id).toBe(imported.id);
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

    expect(storageService.getActiveProject()?.bugReports?.[0].id).toBe(bug.id);
  });

  it('addBugReport respeita o projectId recebido, não o projeto ativo (E3.2)', () => {
    const a = storageService.createNewProject('A', '');
    const b = storageService.createNewProject('B', ''); // B fica ativo

    storageService.addBugReport(a.id, {
      title: 'Bug do A',
      description: 'd',
      severity: 'high',
      status: 'open',
      createdAt: '2026-01-01',
    } as never);

    const projectA = storageService.getAllProjects().find(p => p.id === a.id)!;
    const projectB = storageService.getAllProjects().find(p => p.id === b.id)!;
    expect(projectA.bugReports).toHaveLength(1);
    expect(projectB.bugReports).toHaveLength(0);
  });

  it('createNewSession respeita o projectId e não ativa outro projeto (E3.2)', () => {
    const a = storageService.createNewProject('A', '');
    const b = storageService.createNewProject('B', '');

    const session = storageService.createNewSession(a.id, 'Sessão do A');

    const all = storageService.getAllProjects();
    expect(all.find(p => p.id === a.id)!.sessions[0].id).toBe(session.id);
    expect(all.find(p => p.id === b.id)!.sessions).toHaveLength(0);
    expect(storageService.getActiveProject()?.id).toBe(b.id);
  });

  it('updateStoryChecklists respeita o projectId (E3.2)', () => {
    const epic = INITIAL_MOCK_PROJECT.epics[0];
    const feature = epic.features[0];
    const story = feature.userStories[0];
    storageService.saveAllProjects([INITIAL_MOCK_PROJECT]);
    const other = storageService.createNewProject('Outro', ''); // fica ativo

    storageService.updateStoryChecklists(INITIAL_MOCK_PROJECT.id, epic.id, feature.id, story.id, [], []);

    const mock = storageService.getAllProjects().find(p => p.id === INITIAL_MOCK_PROJECT.id)!;
    expect(mock.epics[0].features[0].userStories[0].dorChecklist).toEqual([]);
    expect(storageService.getAllProjects().find(p => p.id === other.id)!.epics).toEqual([]);
  });

  it('não altera o objeto devolvido por getAllProjects ao registrar um bug (sem mutação)', () => {
    const project = storageService.createNewProject('P', '');
    const before = storageService.getAllProjects().find(p => p.id === project.id)!;

    storageService.addBugReport(project.id, { title: 'x', severity: 'high', status: 'open' } as never);

    expect(before.bugReports ?? []).toHaveLength(0);
  });

  it('gera ids diferentes mesmo quando criados no mesmo milissegundo (E3.6)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);

    const a = storageService.createNewProject('A', '');
    const b = storageService.createNewProject('B', '');
    const s1 = storageService.createNewSession(a.id);
    const s2 = storageService.createNewSession(a.id);

    expect(a.id).not.toBe(b.id);
    expect(s1.id).not.toBe(s2.id);
  });

  it('updateStoryChecklists grava DoR e DoD na história indicada', () => {
    const epic = INITIAL_MOCK_PROJECT.epics[0];
    const feature = epic.features[0];
    const story = feature.userStories[0];
    const dor = [{ id: 'c1', label: 'Pronto', checked: true }] as never;
    const dod = [{ id: 'c2', label: 'Feito', checked: false }] as never;

    storageService.saveAllProjects([INITIAL_MOCK_PROJECT]);
    storageService.updateStoryChecklists(INITIAL_MOCK_PROJECT.id, epic.id, feature.id, story.id, dor, dod);

    const saved = storageService.getActiveProject()?.epics[0].features[0].userStories[0];
    expect(saved?.dorChecklist).toEqual(dor);
    expect(saved?.dodChecklist).toEqual(dod);
  });

  it('updateStoryChecklists ignora ids que não existem, sem lançar erro', () => {
    expect(() => storageService.updateStoryChecklists('p', 'e-x', 'f-x', 's-x', [], [])).not.toThrow();
  });
});

describe('storageService: modelos e persistência', () => {
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
