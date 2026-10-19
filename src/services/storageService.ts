import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { INITIAL_MOCK_PROJECT } from './mockDataService';

const STORAGE_KEY_PROJECTS = 'discovery_done_projects_v1';
const STORAGE_KEY_ACTIVE_PROJECT_ID = 'discovery_done_active_project_id_v1';
const STORAGE_KEY_AI_PROVIDER = 'discovery_done_ai_provider_v1';
const STORAGE_KEY_OPENAI_KEY = 'discovery_done_openai_api_key_v1';
const STORAGE_KEY_OPENAI_MODEL = 'discovery_done_openai_model_v1';
const STORAGE_KEY_GEMINI_KEY = 'discovery_done_gemini_api_key_v1';
const STORAGE_KEY_GEMINI_MODEL = 'discovery_done_gemini_model_v1';

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
      const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (!data) {
        const initial = [INITIAL_MOCK_PROJECT];
        this.saveAllProjects(initial);
        return initial;
      }
      const parsed: DiscoveryProject[] = JSON.parse(data);
      // Backfill personas, bugReports, and mock enrichments if missing
      return parsed.map(p => {
        const withExtras = { ...p };
        if (!withExtras.personas || withExtras.personas.length === 0) {
          withExtras.personas = p.id === 'proj-1' ? INITIAL_MOCK_PROJECT.personas : [];
        }
        if (!withExtras.bugReports || withExtras.bugReports.length === 0) {
          withExtras.bugReports = p.id === 'proj-1' ? INITIAL_MOCK_PROJECT.bugReports : [];
        }
        // If proj-1 is missing evidenceQuote, merge from mock
        if (p.id === 'proj-1' && withExtras.epics?.[0]?.features?.[0]?.userStories?.[0] && !withExtras.epics[0].features[0].userStories[0].evidenceQuote) {
          withExtras.epics = INITIAL_MOCK_PROJECT.epics;
        }
        return withExtras;
      });
    } catch (e) {
      console.error('Erro ao ler projetos do storage:', e);
      return [INITIAL_MOCK_PROJECT];
    }
  },

  saveAllProjects(projects: DiscoveryProject[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      this.mirrorToIndexedDb(projects);
    } catch (e: any) {
      console.warn('Aviso: localStorage atingiu o limite de cota. Salvando cópia integral em IndexedDB:', e);
      this.mirrorToIndexedDb(projects);
    }
  },

  getActiveProject(): DiscoveryProject {
    const projects = this.getAllProjects();
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
    const found = projects.find(p => p.id === activeId);
    if (found) return found;
    return projects[0] || INITIAL_MOCK_PROJECT;
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
      id: 'proj-' + Date.now(),
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
      id: 'proj-' + Date.now(),
      name: name || 'Novo Projeto de Discovery',
      description: description || 'Descoberta de necessidades e oportunidades de produto.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
      okrs: [],
      epics: [],
      prd: {
        id: 'prd-' + Date.now(),
        title: `PRD: ${name}`,
        version: '0.1.0 (Rascunho Inicial)',
        lastUpdated: new Date().toLocaleDateString('pt-BR'),
        problemStatement: 'Descreva aqui o problema principal identificado nas sessões.',
        targetAudience: 'Personas e segmentos identificados.',
        valueProposition: 'Proposta única de valor.',
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
      bugReports: []
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

  resetForOfficialTests(initialName?: string, initialDesc?: string): DiscoveryProject {
    const projectName = initialName || 'Meu Projeto Oficial de Discovery';
    const projectDesc = initialDesc || 'Ambiente limpo pronto para conduzir entrevistas reais, capturar áudio com Whisper e gerar PRD.';
    const cleanProject: DiscoveryProject = {
      id: 'proj-' + Date.now(),
      name: projectName,
      description: projectDesc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [
        {
          id: 'sess-1',
          title: 'Sessão #1 - Entrevista Inicial de Discovery',
          date: new Date().toLocaleDateString('pt-BR'),
          durationSeconds: 0,
          participants: ['Entrevistador (PM)', 'Cliente / Stakeholder'],
          rawTranscript: [],
          summary: {
            tldr: 'Sessão limpa aguardando gravação ou importação de áudio.',
            mainTakeaways: [],
            actionItems: [],
            goldenQuotes: []
          },
          liveQuestions: [],
          painPoints: [],
          jtbds: [],
          mindMapNodes: [
            {
              id: 'node-root',
              label: projectName,
              type: 'root',
              x: 400,
              y: 250,
              color: '#6366f1'
            }
          ],
          mindMapEdges: [],
          userFlowSteps: []
        }
      ],
      okrs: [],
      epics: [],
      prd: {
        id: 'prd-' + Date.now(),
        title: `PRD: ${projectName}`,
        version: '0.1.0 (Rascunho Inicial)',
        lastUpdated: new Date().toLocaleDateString('pt-BR'),
        problemStatement: 'Descreva o problema validado com os clientes.',
        targetAudience: 'Público-alvo / Personas da solução.',
        valueProposition: 'Proposta única de valor.',
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
      bugReports: []
    };

    cleanProject.activeSessionId = cleanProject.sessions[0].id;
    this.saveAllProjects([cleanProject]);
    this.setActiveProjectId(cleanProject.id);
    return cleanProject;
  },

  addBugReport(projectId: string, bug: Omit<import('../types/discovery').BugReportItem, 'id'>): import('../types/discovery').BugReportItem {
    const project = this.getActiveProject();
    const newBug: import('../types/discovery').BugReportItem = {
      ...bug,
      id: 'bug-' + Date.now()
    };
    if (!project.bugReports) project.bugReports = [];
    project.bugReports.unshift(newBug);
    this.saveActiveProject(project);
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
    const project = this.getActiveProject();
    const epic = project.epics.find(e => e.id === epicId);
    if (!epic) return;
    const feat = epic.features.find(f => f.id === featId);
    if (!feat) return;
    const story = feat.userStories.find(s => s.id === storyId);
    if (!story) return;
    story.dorChecklist = dor;
    story.dodChecklist = dod;
    this.saveActiveProject(project);
  },

  createNewSession(projectId: string, title?: string, participants?: string[]): MeetingSession {
    const project = this.getActiveProject();
    const newSession: MeetingSession = {
      id: 'sess-' + Date.now(),
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

    project.sessions.unshift(newSession);
    project.activeSessionId = newSession.id;
    this.saveActiveProject(project);
    return newSession;
  },

  /** Espelha dados silenciosamente no IndexedDB para contornar limites de cota do localStorage */
  async mirrorToIndexedDb(projects: DiscoveryProject[]): Promise<void> {
    try {
      const db = await openIndexedDb();
      if (!db) return;
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_STORE);
      for (const p of projects) {
        store.put(p);
      }
    } catch (err) {
      console.warn('Falha silenciosa ao espelhar no IndexedDB:', err);
    }
  },

  /** Recupera projetos salvos no IndexedDB caso o localStorage tenha sido limpo */
  async getProjectsFromIndexedDb(): Promise<DiscoveryProject[]> {
    try {
      const db = await openIndexedDb();
      if (!db) return [];
      return new Promise((resolve) => {
        const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
        const store = tx.objectStore(INDEXED_DB_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
};

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

