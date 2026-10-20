import { logChange, stampOrigin } from './backlogItemService';
import { plain } from './knowledgeService';
import type { BacklogData, GeneratedBacklog } from './backlogMerge';
import type { Epic, Feature, OKR, TechnicalTask, UserStory } from '../types/discovery';

export type ProposalLevel = 'okr' | 'epic' | 'feature' | 'story' | 'task';

/** Uma diferença de campo, já formatada para o usuário conferir antes de aceitar. */
export interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

interface ProposalBase {
  /** Estável para o mesmo backlog e a mesma geração, então a tela pode guardar o que foi aceito. */
  id: string;
  level: ProposalLevel;
  label: string;
  /** Título do item onde este entra (feature de uma história, história de uma task…). */
  parentLabel?: string;
}

export interface AddProposal extends ProposalBase {
  kind: 'add';
  parentId?: string;
  item: OKR | Epic | Feature | UserStory | TechnicalTask;
}

export interface UpdateProposal extends ProposalBase {
  kind: 'update';
  targetId: string;
  changes: FieldChange[];
  /** Valores novos, por campo, que serão gravados se a proposta for aceita. */
  patch: Record<string, unknown>;
}

export type Proposal = AddProposal | UpdateProposal;

export interface ApplyOptions {
  /** Quando a revisão foi aplicada, em ISO-8601. */
  at: string;
  /** Reunião que originou a revisão, se houver. */
  sessionId?: string;
}

const SIMILAR_TITLE_THRESHOLD = 0.8;
const MIN_WORD_LENGTH = 3;
const EMPTY = '(vazio)';

const wordsOf = (text: string): Set<string> =>
  new Set(plain(text).split(/[^a-z0-9]+/).filter(word => word.length >= MIN_WORD_LENGTH));

/** Mesmo título, ou tão parecido (80% das palavras em comum) que é o mesmo item escrito de outro jeito. */
export function sameTitle(a: string, b: string): boolean {
  if (plain(a).trim() === plain(b).trim()) return true;
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  for (const word of wa) if (wb.has(word)) shared++;
  return shared / (wa.size + wb.size - shared) >= SIMILAR_TITLE_THRESHOLD;
}

// ---------------------------------------------------------------------------------------------
// Planejamento: o que mudaria, item a item
// ---------------------------------------------------------------------------------------------

interface FieldSpec {
  field: string;
  label: string;
  show: (value: unknown) => string;
}

const text = (value: unknown): string => (value === undefined || value === null || value === '' ? EMPTY : String(value));

const criteriaText = (value: unknown): string => {
  const criteria = value as UserStory['acceptanceCriteria'];
  return criteria.length ? criteria.map(c => c.scenario).join('; ') : EMPTY;
};

const criteriaKey = (value: unknown) => (value as UserStory['acceptanceCriteria']).map(c => [c.scenario, c.given, c.when, c.then]);

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Compara só os campos que a IA informou; campo ausente na versão da IA não é mudança. */
function diffFields(before: object, after: object, specs: FieldSpec[]): { changes: FieldChange[]; patch: Record<string, unknown> } {
  const changes: FieldChange[] = [];
  const patch: Record<string, unknown> = {};
  const prevRecord = before as Record<string, unknown>;
  const nextRecord = after as Record<string, unknown>;
  for (const spec of specs) {
    const next = nextRecord[spec.field];
    if (next === undefined) continue;
    const prev = prevRecord[spec.field];
    const different = spec.field === 'acceptanceCriteria'
      ? !sameValue(criteriaKey(prev), criteriaKey(next))
      : !sameValue(prev, next);
    if (!different) continue;
    changes.push({ field: spec.field, label: spec.label, before: spec.show(prev), after: spec.show(next) });
    patch[spec.field] = next;
  }
  return { changes, patch };
}

const EPIC_FIELDS: FieldSpec[] = [
  { field: 'objective', label: 'Objetivo', show: text },
  { field: 'businessValue', label: 'Valor de negócio', show: text }
];
const FEATURE_FIELDS: FieldSpec[] = [
  { field: 'description', label: 'Descrição', show: text },
  { field: 'valueProposition', label: 'Proposta de valor', show: text },
  { field: 'effort', label: 'Esforço', show: text }
];
const STORY_FIELDS: FieldSpec[] = [
  { field: 'asA', label: 'Como', show: text },
  { field: 'iWantTo', label: 'Quero', show: text },
  { field: 'soThat', label: 'Para que', show: text },
  { field: 'storyPoints', label: 'Pontos', show: text },
  { field: 'acceptanceCriteria', label: 'Critérios de aceite', show: criteriaText }
];
const TASK_FIELDS: FieldSpec[] = [{ field: 'type', label: 'Tipo', show: text }];
const OKR_FIELDS: FieldSpec[] = [
  {
    field: 'keyResults',
    label: 'Resultados-chave',
    show: v => (v as OKR['keyResults']).map(k => `${k.description} (${k.baseline} → ${k.target})`).join('; ') || EMPTY
  }
];

const addId = (level: ProposalLevel, parentId: string | undefined, label: string) => `add:${level}:${parentId ?? 'root'}:${plain(label).trim()}`;
const updateId = (level: ProposalLevel, targetId: string) => `update:${level}:${targetId}`;

/**
 * Compara o backlog gerado pela IA com o que o usuário tem e lista o que mudaria, **item a item**, nos 4 níveis
 * (épico, feature, história e task) e nos OKRs. Itens novos viram propostas de adição (os filhos de um item novo vão
 * dentro dele); itens parecidos viram propostas de atualização com o diff por campo. Task nova numa história
 * existente não marca a história como alterada. Nada é aplicado aqui.
 */
export function planBacklogProposals(existing: BacklogData, generated: GeneratedBacklog): Proposal[] {
  const proposals: Proposal[] = [];

  const propose = (level: ProposalLevel, label: string, parentLabel: string | undefined, current: { id: string }, next: object, specs: FieldSpec[]) => {
    const { changes, patch } = diffFields(current, next, specs);
    if (changes.length) proposals.push({ id: updateId(level, current.id), kind: 'update', level, label, parentLabel, targetId: current.id, changes, patch });
  };
  const add = (level: ProposalLevel, label: string, parentId: string | undefined, parentLabel: string | undefined, item: AddProposal['item']) =>
    proposals.push({ id: addId(level, parentId, label), kind: 'add', level, label, parentId, parentLabel, item });

  for (const g of generated.okrs) {
    const match = existing.okrs.find(o => sameTitle(o.objective, g.objective));
    if (match) propose('okr', match.objective, undefined, match, g, OKR_FIELDS);
    else add('okr', g.objective, undefined, undefined, g);
  }

  for (const ge of generated.epics) {
    const me = existing.epics.find(e => sameTitle(e.title, ge.title));
    if (!me) {
      add('epic', ge.title, undefined, undefined, ge);
      continue;
    }
    propose('epic', me.title, undefined, me, ge, EPIC_FIELDS);

    for (const gf of ge.features) {
      const mf = me.features.find(f => sameTitle(f.title, gf.title));
      if (!mf) {
        add('feature', gf.title, me.id, me.title, { ...gf, epicId: me.id });
        continue;
      }
      propose('feature', mf.title, me.title, mf, gf, FEATURE_FIELDS);

      for (const gs of gf.userStories) {
        const ms = mf.userStories.find(s => sameTitle(s.title, gs.title));
        if (!ms) {
          add('story', gs.title, mf.id, mf.title, { ...gs, featureId: mf.id });
          continue;
        }
        propose('story', ms.title, mf.title, ms, gs, STORY_FIELDS);

        for (const gt of gs.tasks) {
          const mt = ms.tasks.find(t => sameTitle(t.title, gt.title));
          if (mt) propose('task', mt.title, ms.title, mt, gt, TASK_FIELDS);
          else add('task', gt.title, ms.id, ms.title, gt);
        }
      }
    }
  }

  return proposals;
}

// ---------------------------------------------------------------------------------------------
// Aplicação: só o que o usuário aceitou
// ---------------------------------------------------------------------------------------------

const mapFeatures = (epics: Epic[], fn: (feature: Feature) => Feature): Epic[] =>
  epics.map(epic => ({ ...epic, features: epic.features.map(fn) }));
const mapStories = (epics: Epic[], fn: (story: UserStory) => UserStory): Epic[] =>
  mapFeatures(epics, feature => ({ ...feature, userStories: feature.userStories.map(fn) }));

/** Marca o item e todos os filhos como criados pela IA nesta revisão. */
function stampTree(item: AddProposal['item'], opts: ApplyOptions): AddProposal['item'] {
  const origin = { author: 'ai' as const, ...(opts.sessionId ? { sessionId: opts.sessionId } : {}) };
  const stamp = <U extends object>(value: U): U => stampOrigin(value, origin, opts.at);
  if ('features' in item) return stamp({ ...item, features: item.features.map(f => stampTree(f, opts) as Feature) });
  if ('userStories' in item) return stamp({ ...item, userStories: item.userStories.map(s => stampTree(s, opts) as UserStory) });
  if ('tasks' in item) return stamp({ ...item, tasks: item.tasks.map(t => stampTree(t, opts) as TechnicalTask) });
  return stamp(item);
}

function applyAdd(data: BacklogData, p: AddProposal, opts: ApplyOptions): BacklogData {
  const item = stampTree(p.item, opts);
  switch (p.level) {
    case 'okr':
      return { ...data, okrs: [...data.okrs, item as OKR] };
    case 'epic':
      return { ...data, epics: [...data.epics, item as Epic] };
    case 'feature':
      return { ...data, epics: data.epics.map(e => (e.id === p.parentId ? { ...e, features: [...e.features, item as Feature] } : e)) };
    case 'story':
      return { ...data, epics: mapFeatures(data.epics, f => (f.id === p.parentId ? { ...f, userStories: [...f.userStories, item as UserStory] } : f)) };
    case 'task':
      return { ...data, epics: mapStories(data.epics, s => (s.id === p.parentId ? { ...s, tasks: [...s.tasks, item as TechnicalTask] } : s)) };
  }
}

function applyUpdate(data: BacklogData, p: UpdateProposal, opts: ApplyOptions): BacklogData {
  const summary = `Atualizado pela IA: ${p.changes.map(c => c.label).join(', ')}`;
  const patchOf = <T extends { id: string }>(item: T): T =>
    item.id === p.targetId ? { ...item, ...p.patch, ...logOnly(item, summary, opts) } : item;

  switch (p.level) {
    case 'okr':
      return { ...data, okrs: data.okrs.map(patchOf) };
    case 'epic':
      return { ...data, epics: data.epics.map(patchOf) };
    case 'feature':
      return { ...data, epics: mapFeatures(data.epics, patchOf) };
    case 'story':
      return { ...data, epics: mapStories(data.epics, patchOf) };
    case 'task':
      return { ...data, epics: mapStories(data.epics, s => ({ ...s, tasks: s.tasks.map(patchOf) })) };
  }
}

/** O novo histórico do item, depois de registrar esta atualização. */
function logOnly(item: object, summary: string, opts: ApplyOptions): { changes: NonNullable<UserStory['changes']> } {
  return { changes: logChange(item as UserStory, summary, opts.at, opts.sessionId).changes! };
}

/**
 * Aplica ao backlog só as propostas aceitas (`'all'` aceita todas). Não altera o original. Itens novos ganham
 * origem "IA" com a reunião; itens atualizados ganham uma linha no histórico.
 */
export function applyProposals(existing: BacklogData, proposals: Proposal[], accepted: string[] | 'all', opts: ApplyOptions): BacklogData {
  const chosen = accepted === 'all' ? proposals : proposals.filter(p => accepted.includes(p.id));
  return chosen.reduce<BacklogData>((data, p) => (p.kind === 'add' ? applyAdd(data, p, opts) : applyUpdate(data, p, opts)), existing);
}

// ---------------------------------------------------------------------------------------------
// Duplicados dentro do próprio backlog
// ---------------------------------------------------------------------------------------------

export interface DuplicatePair {
  keepId: string;
  dropId: string;
  title: string;
}

/** Histórias de uma mesma feature com título parecido. A primeira é a que fica; cada duplicada aparece uma vez. */
export function findDuplicateStories(epics: Epic[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (const feature of epics.flatMap(e => e.features)) {
    const kept: UserStory[] = [];
    for (const story of feature.userStories) {
      const original = kept.find(k => sameTitle(k.title, story.title));
      if (original) pairs.push({ keepId: original.id, dropId: story.id, title: original.title });
      else kept.push(story);
    }
  }
  return pairs;
}

function mergeInto(keep: UserStory, drop: UserStory, opts: ApplyOptions): UserStory {
  const known = new Set(keep.acceptanceCriteria.map(c => plain(c.scenario).trim()));
  const criteria = [...keep.acceptanceCriteria, ...drop.acceptanceCriteria.filter(c => !known.has(plain(c.scenario).trim()))];
  const tasks = [...keep.tasks, ...drop.tasks.filter(t => !keep.tasks.some(k => sameTitle(k.title, t.title)))];
  const inherited = [...(keep.changes ?? []), ...(drop.changes ?? [])];
  const merged: UserStory = {
    ...keep,
    asA: keep.asA || drop.asA,
    iWantTo: keep.iWantTo || drop.iWantTo,
    soThat: keep.soThat || drop.soThat,
    storyPoints: keep.storyPoints ?? drop.storyPoints,
    evidenceQuote: keep.evidenceQuote ?? drop.evidenceQuote,
    validation: keep.validation ?? drop.validation,
    acceptanceCriteria: criteria,
    tasks,
    changes: inherited
  };
  return logChange(merged, `Mesclada com "${drop.title}"`, opts.at, opts.sessionId);
}

/** Junta `dropId` em `keepId` (mesma feature): une critérios e tasks sem repetir e remove a duplicada. Ids desconhecidos não mudam nada. */
export function mergeStories(epics: Epic[], keepId: string, dropId: string, opts: ApplyOptions): Epic[] {
  const feature = epics.flatMap(e => e.features).find(f => f.userStories.some(s => s.id === keepId) && f.userStories.some(s => s.id === dropId));
  if (!feature || keepId === dropId) return epics;
  const drop = feature.userStories.find(s => s.id === dropId)!;

  return mapFeatures(epics, f =>
    f.id !== feature.id
      ? f
      : {
          ...f,
          userStories: f.userStories
            .filter(s => s.id !== dropId)
            .map(s => (s.id === keepId ? mergeInto(s, drop, opts) : s))
        }
  );
}
