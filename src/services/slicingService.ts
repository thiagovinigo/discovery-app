import { newId } from './ids';
import { sameTitle } from './backlogProposals';
import type { Epic, Feature, TechnicalTask, UserStory } from '../types/discovery';

export interface SliceOptions {
  /** Quando o fatiamento foi feito, em ISO-8601. */
  at: string;
  sessionId?: string;
}

/** Uma história filha de um fatiamento: o que ela leva do original. */
export interface StorySlicePart {
  title: string;
  storyPoints?: number;
  /** Critérios de aceite do original que passam para esta filha. */
  criteriaIds: string[];
  /** Tasks do original que passam para esta filha. */
  taskIds: string[];
}

export interface FeaturePart {
  title: string;
  description?: string;
}

export interface StoryPart {
  title: string;
  asA?: string;
  iWantTo?: string;
  soThat?: string;
  storyPoints?: number;
}

export interface TaskPart {
  title: string;
  type: TechnicalTask['type'];
}

const MIN_PARTS = 2;
const NEEDS_TITLE = 'Toda parte precisa de título.';

const requireTitles = (parts: { title: string }[]) => {
  if (parts.some(p => !p.title.trim())) throw new Error(NEEDS_TITLE);
};

const findStory = (epics: Epic[], storyId: string): UserStory | undefined =>
  epics.flatMap(e => e.features).flatMap(f => f.userStories).find(s => s.id === storyId);

const mapFeatures = (epics: Epic[], fn: (feature: Feature) => Feature): Epic[] =>
  epics.map(epic => ({ ...epic, features: epic.features.map(fn) }));

const fromNote = (parent: string, opts: SliceOptions) => ({
  changes: [{ at: opts.at, summary: `Fatiada de "${parent}"`, ...(opts.sessionId ? { sessionId: opts.sessionId } : {}) }]
});

// ---------------------------------------------------------------------------------------------
// História em histórias menores (SPIDR)
// ---------------------------------------------------------------------------------------------

/**
 * Sugere o fatiamento de uma história pelos critérios de aceite: uma filha por critério (menos filhas se a história
 * tem poucos pontos, agrupando critérios), com os pontos repartidos e as tasks distribuídas. Sem 2+ critérios, não sugere.
 */
export function suggestStorySlices(story: UserStory): StorySlicePart[] {
  const criteria = story.acceptanceCriteria;
  if (criteria.length < MIN_PARTS) return [];

  const points = story.storyPoints;
  const count = points === undefined ? criteria.length : Math.min(criteria.length, Math.max(MIN_PARTS, points));

  return Array.from({ length: count }, (_, i) => {
    const mine = criteria.filter((_c, index) => index % count === i);
    const share = points === undefined ? undefined : Math.floor(points / count) + (i < points % count ? 1 : 0);
    return {
      title: mine.length === 1 ? `${story.title} — ${mine[0].scenario}` : `${story.title} — parte ${i + 1}`,
      storyPoints: share,
      criteriaIds: mine.map(c => c.id),
      taskIds: story.tasks.filter((_t, index) => index % count === i).map(t => t.id)
    };
  });
}

/** O que impede o fatiamento: partes de menos, sem título, critério sem destino ou pontos que não somam. Lista vazia = pode fatiar. */
export function validateStorySlice(story: UserStory, parts: StorySlicePart[]): string[] {
  const errors: string[] = [];
  if (parts.length < MIN_PARTS) errors.push('Escolha ao menos 2 partes.');
  if (parts.some(p => !p.title.trim())) errors.push(NEEDS_TITLE);

  const assigned = new Set(parts.flatMap(p => p.criteriaIds));
  for (const criterion of story.acceptanceCriteria) {
    if (!assigned.has(criterion.id)) errors.push(`Critério sem destino: "${criterion.scenario}".`);
  }

  if (story.storyPoints !== undefined) {
    const sum = parts.reduce((total, p) => total + (p.storyPoints ?? 0), 0);
    if (sum !== story.storyPoints) errors.push(`Os pontos das partes (${sum}) não batem com os da história (${story.storyPoints}).`);
  }
  return errors;
}

/**
 * Troca a história pelas filhas, na mesma posição. Nenhum critério ou task se perde (task sem destino fica com a
 * primeira filha), cada filha guarda `sliceOf` e herda texto, citação, checklists e validação do original.
 * Lança erro se o fatiamento for inválido; id desconhecido não muda nada.
 */
export function sliceStory(epics: Epic[], storyId: string, parts: StorySlicePart[], opts: SliceOptions): Epic[] {
  const original = findStory(epics, storyId);
  if (!original) return epics;

  const errors = validateStorySlice(original, parts);
  if (errors.length) throw new Error(errors.join(' '));

  const claimedTasks = new Set(parts.flatMap(p => p.taskIds));
  const orphanTasks = original.tasks.filter(t => !claimedTasks.has(t.id));

  const children: UserStory[] = parts.map((part, index) => ({
    ...original,
    id: newId('story'),
    title: part.title.trim(),
    storyPoints: part.storyPoints,
    acceptanceCriteria: original.acceptanceCriteria.filter(c => part.criteriaIds.includes(c.id)),
    tasks: [
      ...original.tasks.filter(t => part.taskIds.includes(t.id)),
      ...(index === 0 ? orphanTasks : [])
    ],
    validation: original.validation ? structuredClone(original.validation) : undefined,
    verifiedAt: undefined,
    sliceOf: original.id,
    changes: [...(original.changes ?? []), ...fromNote(original.title, opts).changes]
  }));

  return mapFeatures(epics, feature => {
    const at = feature.userStories.findIndex(s => s.id === storyId);
    if (at === -1) return feature;
    return { ...feature, userStories: [...feature.userStories.slice(0, at), ...children, ...feature.userStories.slice(at + 1)] };
  });
}

// ---------------------------------------------------------------------------------------------
// Épico em features, feature em histórias, história em tasks
// ---------------------------------------------------------------------------------------------

/** Acrescenta features ao épico, rastreando o épico. O épico continua existindo. */
export function sliceEpicIntoFeatures(epics: Epic[], epicId: string, parts: FeaturePart[], opts: SliceOptions): Epic[] {
  const epic = epics.find(e => e.id === epicId);
  if (!epic) return epics;
  requireTitles(parts);

  const added: Feature[] = parts.map(part => ({
    id: newId('feat'),
    epicId,
    title: part.title.trim(),
    description: part.description?.trim() ?? '',
    valueProposition: '',
    effort: 'M',
    userStories: [],
    sliceOf: epicId,
    ...fromNote(epic.title, opts)
  }));
  return epics.map(e => (e.id === epicId ? { ...e, features: [...e.features, ...added] } : e));
}

/** Acrescenta histórias à feature, rastreando a feature. */
export function sliceFeatureIntoStories(epics: Epic[], featureId: string, parts: StoryPart[], opts: SliceOptions): Epic[] {
  const feature = epics.flatMap(e => e.features).find(f => f.id === featureId);
  if (!feature) return epics;
  requireTitles(parts);

  const added: UserStory[] = parts.map(part => ({
    id: newId('story'),
    featureId,
    title: part.title.trim(),
    asA: part.asA ?? '',
    iWantTo: part.iWantTo ?? '',
    soThat: part.soThat ?? '',
    acceptanceCriteria: [],
    tasks: [],
    storyPoints: part.storyPoints,
    sliceOf: featureId,
    ...fromNote(feature.title, opts)
  }));
  return mapFeatures(epics, f => (f.id === featureId ? { ...f, userStories: [...f.userStories, ...added] } : f));
}

/** Acrescenta tasks à história, rastreando a história e sem repetir as que já existem. */
export function sliceStoryIntoTasks(epics: Epic[], storyId: string, parts: TaskPart[], _opts: SliceOptions): Epic[] {
  const story = findStory(epics, storyId);
  if (!story) return epics;
  requireTitles(parts);

  const tasks = [...story.tasks];
  for (const part of parts) {
    if (tasks.some(t => sameTitle(t.title, part.title))) continue;
    tasks.push({ id: newId('task'), title: part.title.trim(), type: part.type, status: 'todo', sliceOf: storyId });
  }
  return mapFeatures(epics, f => ({ ...f, userStories: f.userStories.map(s => (s.id === storyId ? { ...s, tasks } : s)) }));
}
