import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { newId } from './ids';

const STORAGE_KEY_PROJECTS = 'discovery_done_projects_v1';
const STORAGE_KEY_ACTIVE_PROJECT_ID = 'discovery_done_active_project_id_v1';
const STORAGE_KEY_AI_PROVIDER = 'discovery_done_ai_provider_v1';
const STORAGE_KEY_OPENAI_KEY = 'discovery_done_openai_api_key_v1';
const STORAGE_KEY_OPENAI_MODEL = 'discovery_done_openai_model_v1';
const STORAGE_KEY_GEMINI_KEY = 'discovery_done_gemini_api_key_v1';
const STORAGE_KEY_GEMINI_MODEL = 'discovery_done_gemini_model_v1';

// Gravações no IndexedDB entram numa fila para não se atropelarem: vale sempre a última.
let mirrorQueue: Promise<void> = Promise.resolve();
// Quando o localStorage estoura a cota, o que acabou de ser salvo fica aqui para as leituras seguintes.
let quotaFallback: DiscoveryProject[] | null = null;

export const storageService = {
  getAiProvider(): 'openai' | 'gemini' {
    const p = localStorage.getItem(STORAGE_KEY_AI_PROVIDER);
    if (p === 'gemini') return 'gemini';
    return 'openai';
  },

  setAiProvider(provider: 'openai' | 'gemini') {
    localStorage.setItem(STORAGE_KEY_AI_PROVIDER, provider);
  },

  getOpenAiApiKey(): string {
    return localStorage.getItem(STORAGE_KEY_OPENAI_KEY) || '';
  },

  setOpenAiApiKey(key: string) {
    localStorage.setItem(STORAGE_KEY_OPENAI_KEY, key.trim());
  },

  getOpenAiModel(): string {
    return localStorage.getItem(STORAGE_KEY_OPENAI_MODEL) || 'gpt-4o-mini';
  },

  setOpenAiModel(model: string) {
    localStorage.setItem(STORAGE_KEY_OPENAI_MODEL, model);
  },

  getGeminiApiKey(): string {
    return localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
  },

  setGeminiApiKey(key: string) {
    localStorage.setItem(STORAGE_KEY_GEMINI_KEY, key.trim());
  },

  getGeminiModel(): string {
    return localStorage.getItem(STORAGE_KEY_GEMINI_MODEL) || 'gemini-2.5-flash';
  },

  setGeminiModel(model: string) {
    localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model);
  },

  getApiKey(): string {
    const provider = this.getAiProvider();
    if (provider === 'gemini') {
      return this.getGeminiApiKey();
    }
    return this.getOpenAiApiKey();
  },

  setApiKey(key: string) {
    const trimmed = key.trim();
    if (trimmed.startsWith('sk-')) {
      this.setAiProvider('openai');
      this.setOpenAiApiKey(trimmed);
    } else {
      const provider = this.getAiProvider();
      if (provider === 'gemini') {
        this.setGeminiApiKey(trimmed);
      } else {
        this.setOpenAiApiKey(trimmed);
      }
    }
  },

  getModel(): string {
    const provider = this.getAiProvider();
    return provider === 'gemini' ? this.getGeminiModel() : this.getOpenAiModel();
  },

  setModel(model: string) {
    const provider = this.getAiProvider();
    if (provider === 'gemini') {
      this.setGeminiModel(model);
    } else {
      this.setOpenAiModel(model);
    }
  },

  getAllProjects(): DiscoveryProject[] {
    try {
      const data = quotaFallback ? JSON.stringify(quotaFallback) : localStorage.getItem(STORAGE_KEY_PROJECTS);
      // Começa vazio: o app não cria projeto de exemplo sozinho
      if (!data) return [];
      const parsed: DiscoveryProject[] = JSON.parse(data);
      // Projetos salvos por versões antigas podem não ter estes campos
      return parsed.map(p => ({
        ...p,
        personas: p.personas ?? [],
        bugReports: p.bugReports ?? [],
        stakeholders: p.stakeholders ?? [],
        notes: p.notes ?? [],
        scheduledMeetings: p.scheduledMeetings ?? []
      }));
    } catch (e) {
      console.error('Erro ao ler projetos do storage:', e);
      return [];
    }
  },

  saveAllProjects(projects: DiscoveryProject[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      quotaFallback = null;
    } catch (e: unknown) {
      console.warn('Aviso: localStorage atingiu o limite de cota. Mantendo cópia em memória e no IndexedDB:', e);
      quotaFallback = JSON.parse(JSON.stringify(projects)) as DiscoveryProject[];
    }
    void this.mirrorToIndexedDb(projects);
  },

  /** Projeto ativo; se o id salvo não existe mais, o primeiro; `null` se não há nenhum projeto. */
  getActiveProject(): DiscoveryProject | null {
    const projects = this.getAllProjects();
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
    return projects.find(p => p.id === activeId) ?? projects[0] ?? null;
  },

  /** Apaga todos os projetos (no localStorage e no espelho do IndexedDB) e o projeto ativo. */
  clearAllProjects(): void {
    localStorage.removeItem(STORAGE_KEY_PROJECTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
    quotaFallback = null;
    void this.mirrorToIndexedDb([]);
  },

  /** Id guardado como ativo, sem checar se o projeto ainda existe. */
  getActiveProjectId(): string | null {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
  },

  setActiveProjectId(id: string) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, id);
  },

  saveActiveProject(project: DiscoveryProject) {
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.push({ ...project, updatedAt: new Date().toISOString() });
    }
    this.saveAllProjects(projects);
  },

  /** Importa um projeto exportado em JSON. Gera novo ID para evitar sobrescrever existentes. */
  importProject(json: string): DiscoveryProject {
    let data: any;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('Arquivo inválido: não é um JSON.');
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.sessions) || !data.prd || typeof data.name !== 'string') {
      throw new Error('Arquivo inválido: não parece ser um projeto do Discovery ao Done.');
    }
    const imported: DiscoveryProject = {
      ...data,
      id: newId('proj'),
      name: data.name + ' (importado)',
      okrs: Array.isArray(data.okrs) ? data.okrs : [],
      epics: Array.isArray(data.epics) ? data.epics : [],
      decisionLog: Array.isArray(data.decisionLog) ? data.decisionLog : [],
      updatedAt: new Date().toISOString()
    };
    const projects = this.getAllProjects();
    projects.unshift(imported);
    this.saveAllProjects(projects);
    this.setActiveProjectId(imported.id);
    return imported;
  },

  createNewProject(name: string, description: string): DiscoveryProject {
    const newProj: DiscoveryProject = {
      id: newId('proj'),
      name: name || 'Novo Projeto de Discovery',
      description: description || 'Descoberta de necessidades e oportunidades de produto.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
      okrs: [],
      epics: [],
      prd: {
        id: newId('prd'),
        title: `PRD: ${name}`,
        version: '0.1.0 (Rascunho Inicial)',
        lastUpdated: new Date().toLocaleDateString('pt-BR'),
        // Vazios de propósito: o que o usuário não escreveu não deve aparecer como se fosse conteúdo
        problemStatement: '',
        targetAudience: '',
        valueProposition: '',
        inScope: [],
        outOfScope: [],
        successMetrics: [],
        assumptions: [],
        risksAndMitigations: []
      },
      leanCanvas: {
        problem: [],
        existingAlternatives: [],
        customerSegments: [],
        earlyAdopters: [],
        uniqueValueProposition: '',
        highLevelConcept: '',
        solution: [],
        channels: [],
        revenueStreams: [],
        costStructure: [],
        keyMetrics: [],
        unfairAdvantage: ''
      },
      decisionLog: [],
      personas: [],
      bugReports: [],
      stakeholders: [],
      notes: [],
      scheduledMeetings: []
    };

    const projects = this.getAllProjects();
    projects.unshift(newProj);
    this.saveAllProjects(projects);
    this.setActiveProjectId(newProj.id);
    return newProj;
  },

  deleteProject(projectId: string): DiscoveryProject[] {
    const projects = this.getAllProjects().filter(p => p.id !== projectId);
    this.saveAllProjects(projects);
    if (projects.length > 0) {
      this.setActiveProjectId(projects[0].id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
    }
    return projects;
  },

  /**
   * Aplica `update` ao projeto com esse id sem mutar o original e persiste o resultado.
   * Devolve o projeto atualizado, ou `undefined` se o id não existir.
   */
  updateProject(projectId: string, update: (project: DiscoveryProject) => DiscoveryProject): DiscoveryProject | undefined {
    const projects = this.getAllProjects();
    const current = projects.find(p => p.id === projectId);
    if (!current) return undefined;
    const updated: DiscoveryProject = { ...update(current), updatedAt: new Date().toISOString() };
    this.saveAllProjects(projects.map(p => (p.id === projectId ? updated : p)));
    return updated;
  },

  addBugReport(projectId: string, bug: Omit<import('../types/discovery').BugReportItem, 'id'>): import('../types/discovery').BugReportItem {
    const newBug: import('../types/discovery').BugReportItem = {
      ...bug,
      id: newId('bug')
    };
    const updated = this.updateProject(projectId, p => ({ ...p, bugReports: [newBug, ...(p.bugReports ?? [])] }));
    if (!updated) throw new Error(`Projeto não encontrado: ${projectId}`);
    return newBug;
  },

  updateStoryChecklists(
    projectId: string,
    epicId: string,
    featId: string,
    storyId: string,
    dor: import('../types/discovery').ChecklistItem[],
    dod: import('../types/discovery').ChecklistItem[]
  ) {
    this.updateProject(projectId, p => ({
      ...p,
      epics: p.epics.map(epic => epic.id !== epicId ? epic : {
        ...epic,
        features: epic.features.map(feat => feat.id !== featId ? feat : {
          ...feat,
          userStories: feat.userStories.map(story =>
            story.id !== storyId ? story : { ...story, dorChecklist: dor, dodChecklist: dod }
          )
        })
      })
    }));
  },

  createNewSession(projectId: string, title?: string, participants?: string[]): MeetingSession {
    const project = this.getAllProjects().find(p => p.id === projectId);
    if (!project) throw new Error(`Projeto não encontrado: ${projectId}`);
    const newSession: MeetingSession = {
      id: newId('sess'),
      title: title || `Sessão de Discovery #${(project.sessions.length + 1)}`,
      date: new Date().toLocaleDateString('pt-BR'),
      durationSeconds: 0,
      participants: participants && participants.length > 0 ? participants : ['Entrevistador (PM)', 'Usuário'],
      rawTranscript: [],
      summary: {
        tldr: 'Sessão em andamento...',
        mainTakeaways: [],
        actionItems: [],
        goldenQuotes: []
      },
      liveQuestions: [],
      painPoints: [],
      jtbds: [],
      mindMapNodes: [
        { id: 'node-root', label: title || project.name, type: 'root', x: 400, y: 250, color: '#6366f1' }
      ],
      mindMapEdges: [],
      userFlowSteps: []
    };

    this.updateProject(projectId, p => ({ ...p, sessions: [newSession, ...p.sessions], activeSessionId: newSession.id }));
    return newSession;
  },

  /**
   * Espelha os projetos no IndexedDB, substituindo o conteúdo anterior (assim exclusões também
   * chegam lá). As gravações rodam em fila; a promessa resolve quando esta já foi concluída.
   */
  mirrorToIndexedDb(projects: DiscoveryProject[]): Promise<void> {
    mirrorQueue = mirrorQueue.then(() => writeAllToIndexedDb(projects));
    return mirrorQueue;
  },

  /** Espera todas as gravações pendentes no IndexedDB terminarem. */
  flushMirror(): Promise<void> {
    return mirrorQueue;
  },

  /** Lê todos os projetos espelhados no IndexedDB. Devolve lista vazia se não houver suporte ou der erro. */
  async getProjectsFromIndexedDb(): Promise<DiscoveryProject[]> {
    try {
      const db = await openIndexedDb();
      if (!db) return [];
      return await new Promise<DiscoveryProject[]>((resolve) => {
        const request = db.transaction(INDEXED_DB_STORE, 'readonly').objectStore(INDEXED_DB_STORE).getAll();
        request.onsuccess = () => { db.close(); resolve((request.result as DiscoveryProject[]) || []); };
        request.onerror = () => { db.close(); resolve([]); };
      });
    } catch {
      return [];
    }
  },

  /**
   * Traz do IndexedDB os projetos que faltam no localStorage (ex.: dados do site limpos) ou que lá
   * estão mais novos (ex.: a última gravação estourou a cota). Projetos só locais são mantidos.
   * Devolve true se o localStorage foi atualizado.
   */
  async restoreFromIndexedDb(): Promise<boolean> {
    const mirrored = await this.getProjectsFromIndexedDb();
    if (mirrored.length === 0) return false;

    let local: DiscoveryProject[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
      local = raw ? (JSON.parse(raw) as DiscoveryProject[]) : [];
    } catch {
      local = [];
    }

    const byId = new Map(local.map(p => [p.id, p]));
    let changed = false;
    for (const project of mirrored) {
      const current = byId.get(project.id);
      if (!current || (project.updatedAt ?? '') > (current.updatedAt ?? '')) {
        byId.set(project.id, project);
        changed = true;
      }
    }
    if (!changed) return false;

    this.saveAllProjects([...byId.values()]);
    return true;
  }
};

/** Troca o conteúdo do IndexedDB pelos projetos recebidos, em uma única transação. */
async function writeAllToIndexedDb(projects: DiscoveryProject[]): Promise<void> {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_STORE);
      store.clear();
      for (const project of projects) store.put(project);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = tx.onabort = () => {
        console.warn('Falha ao espelhar no IndexedDB:', tx.error);
        db.close();
        resolve();
      };
    });
  } catch (err) {
    console.warn('Falha silenciosa ao espelhar no IndexedDB:', err);
  }
}

const INDEXED_DB_NAME = 'discovery_done_indexed_db';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'projects_store';

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

