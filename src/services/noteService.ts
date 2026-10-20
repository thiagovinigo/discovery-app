import { storageService } from './storageService';
import { plain } from './knowledgeService';
import { newId } from './ids';
import type { DecisionLogEntry, DiscoveryProject, Epic, ProjectNote, UserStory } from '../types/discovery';

export interface NoteInput {
  text: string;
  tags?: string[];
  stakeholderId?: string;
  sessionId?: string;
  storyId?: string;
}

export interface NoteFilter {
  query?: string;
  tag?: string;
  stakeholderId?: string;
}

const NOTES_EPIC_TITLE = 'Anotações do projeto';
const NOTES_FEATURE_TITLE = 'Ideias e pedidos anotados';
const STORY_TITLE_MAX = 80;

const normalizeTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, '').toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
};

/** Etiquetas separadas por vírgula, ponto e vírgula ou espaço; sem "#", em minúsculas e sem repetir. */
export function parseTags(text: string): string[] {
  return normalizeTags(text.split(/[\s,;]+/));
}

const requireText = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Escreva o texto da anotação.');
  return trimmed;
};

const firstLine = (text: string): string => text.split('\n')[0].trim();

const loadProject = (projectId: string): DiscoveryProject | undefined =>
  storageService.getAllProjects().find(p => p.id === projectId);

const findNote = (project: DiscoveryProject | undefined, noteId: string): ProjectNote | undefined =>
  project?.notes?.find(n => n.id === noteId);

/** Cria a anotação. Lança erro se o texto estiver vazio; `undefined` se o projeto não existir. */
export function addNote(projectId: string, input: NoteInput): ProjectNote | undefined {
  const now = new Date().toISOString();
  const created: ProjectNote = {
    id: newId('note'),
    text: requireText(input.text),
    tags: normalizeTags(input.tags ?? []),
    stakeholderId: input.stakeholderId,
    sessionId: input.sessionId,
    storyId: input.storyId,
    createdAt: now,
    updatedAt: now
  };
  const updated = storageService.updateProject(projectId, p => ({ ...p, notes: [...(p.notes ?? []), created] }));
  return updated ? created : undefined;
}

/** Altera só os campos informados e renova a data de edição. `undefined` se a anotação não existir. */
export function updateNote(projectId: string, noteId: string, changes: Partial<NoteInput>): ProjectNote | undefined {
  const text = changes.text === undefined ? undefined : requireText(changes.text);
  const tags = changes.tags === undefined ? undefined : normalizeTags(changes.tags);
  let result: ProjectNote | undefined;

  storageService.updateProject(projectId, p => ({
    ...p,
    notes: (p.notes ?? []).map(n => {
      if (n.id !== noteId) return n;
      result = {
        ...n,
        ...changes,
        ...(text === undefined ? {} : { text }),
        ...(tags === undefined ? {} : { tags }),
        updatedAt: new Date().toISOString()
      };
      return result;
    })
  }));
  return result;
}

export function removeNote(projectId: string, noteId: string): boolean {
  if (!findNote(loadProject(projectId), noteId)) return false;
  storageService.updateProject(projectId, p => ({ ...p, notes: (p.notes ?? []).filter(n => n.id !== noteId) }));
  return true;
}

/** Aplica busca (sem diferenciar maiúsculas nem acentos), etiqueta e stakeholder; da mais recente para a mais antiga. */
export function filterNotes(notes: ProjectNote[], filter: NoteFilter): ProjectNote[] {
  const query = filter.query ? plain(filter.query.trim()) : '';
  return notes
    .filter(n => !query || plain(n.text).includes(query))
    .filter(n => !filter.tag || n.tags.includes(filter.tag))
    .filter(n => !filter.stakeholderId || n.stakeholderId === filter.stakeholderId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Etiquetas em uso com a contagem; as mais usadas primeiro, depois ordem alfabética. */
export function allTags(notes: ProjectNote[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Registra a anotação no Decision Log. Promover de novo devolve a mesma decisão. */
export function promoteToDecision(projectId: string, noteId: string): DecisionLogEntry | undefined {
  const project = loadProject(projectId);
  const note = findNote(project, noteId);
  if (!project || !note) return undefined;

  const existing = note.decisionId ? project.decisionLog.find(d => d.id === note.decisionId) : undefined;
  if (existing) return existing;

  const driver = (project.stakeholders ?? []).find(s => s.id === note.stakeholderId)?.name ?? 'Anotação do PO';
  const entry: DecisionLogEntry = {
    id: newId('dec'),
    date: new Date().toLocaleDateString('pt-BR'),
    decision: firstLine(note.text),
    context: note.text,
    driver,
    consequences: '',
    status: 'approved'
  };
  storageService.updateProject(projectId, p => ({
    ...p,
    decisionLog: [...p.decisionLog, entry],
    notes: (p.notes ?? []).map(n => (n.id === noteId ? { ...n, decisionId: entry.id } : n))
  }));
  return entry;
}

const findStory = (epics: Epic[], storyId?: string): UserStory | undefined =>
  storyId ? epics.flatMap(e => e.features).flatMap(f => f.userStories).find(s => s.id === storyId) : undefined;

const newNotesEpic = (): Epic => ({
  id: newId('epic'),
  title: NOTES_EPIC_TITLE,
  objective: 'Reunir o que foi anotado e ainda precisa ser refinado.',
  businessValue: '',
  status: 'discovery',
  features: []
});

/** Põe a história na primeira funcionalidade do épico; se ele ainda não tem uma, cria. */
const addToEpic = (epic: Epic, story: UserStory): Epic => {
  if (epic.features.length === 0) {
    return {
      ...epic,
      features: [{
        id: story.featureId,
        epicId: epic.id,
        title: NOTES_FEATURE_TITLE,
        description: 'Itens que nasceram de anotações do PO.',
        valueProposition: '',
        effort: 'S',
        userStories: [story]
      }]
    };
  }
  const [first, ...rest] = epic.features;
  return { ...epic, features: [{ ...first, userStories: [...first.userStories, { ...story, featureId: first.id }] }, ...rest] };
};

/** Cria uma história no épico "Anotações do projeto". Promover de novo devolve a mesma história. */
export function promoteToStory(projectId: string, noteId: string): UserStory | undefined {
  const project = loadProject(projectId);
  const note = findNote(project, noteId);
  if (!project || !note) return undefined;

  const existing = findStory(project.epics, note.storyId);
  if (existing) return existing;

  const story: UserStory = {
    id: newId('story'),
    featureId: newId('feat'),
    title: firstLine(note.text).slice(0, STORY_TITLE_MAX),
    asA: '',
    iWantTo: note.text,
    soThat: '',
    acceptanceCriteria: [],
    tasks: []
  };

  const updated = storageService.updateProject(projectId, p => {
    const notesEpic = p.epics.find(e => e.title === NOTES_EPIC_TITLE);
    const epics = notesEpic
      ? p.epics.map(e => (e === notesEpic ? addToEpic(e, story) : e))
      : [...p.epics, addToEpic(newNotesEpic(), story)];
    return { ...p, epics, notes: (p.notes ?? []).map(n => (n.id === noteId ? { ...n, storyId: story.id } : n)) };
  });
  return findStory(updated?.epics ?? [], story.id);
}
