import type { Epic, Feature, OKR, PRDDocument, UserStory } from '../types/discovery';

/** O que o usuário já tem no projeto. */
export interface BacklogData {
  okrs: OKR[];
  epics: Epic[];
  prd: PRDDocument;
}

/** O que a IA devolveu; o PRD pode vir ausente. */
export interface GeneratedBacklog {
  okrs: OKR[];
  epics: Epic[];
  prd?: PRDDocument;
}

export interface MergeAdded {
  okrs: number;
  epics: number;
  features: number;
  stories: number;
}

export interface MergePlan {
  /** Existente + itens novos. Itens existentes ficam como o usuário os deixou. */
  merged: BacklogData;
  /** Igual a `merged`, mas os itens existentes que a IA quer alterar recebem a versão da IA. */
  replaced: BacklogData;
  added: MergeAdded;
  /** Rótulos dos itens existentes que a IA quer alterar. Vazio significa que o merge é só incremento. */
  changed: string[];
}

const norm = (text: string): string => text.toLowerCase().trim();
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const defined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
const isDraftPrd = (prd: PRDDocument): boolean => !prd.problemStatement.trim() || /^descreva\b/i.test(prd.problemStatement.trim());

// Impressões digitais do conteúdo que o usuário percebe como "o item". Status, ids e checklists ficam de fora.
const storyFp = (s: UserStory) => [
  s.asA, s.iWantTo, s.soThat, s.storyPoints,
  s.acceptanceCriteria.map(a => [a.scenario, a.given, a.when, a.then]),
  s.tasks.map(t => [t.title, t.type])
];
const featureFp = (f: Feature) => [f.description, f.valueProposition, f.effort];
const epicFp = (e: Epic) => [e.objective, e.businessValue];
const okrFp = (o: OKR) => o.keyResults.map(k => [k.description, k.baseline, k.target]);
const prdFp = (p: PRDDocument) => [
  p.problemStatement, p.targetAudience, p.valueProposition,
  p.inScope, p.outOfScope, p.successMetrics, p.assumptions, p.risksAndMitigations
];

function build(existing: BacklogData, generated: GeneratedBacklog, replaceChanged: boolean) {
  const added: MergeAdded = { okrs: 0, epics: 0, features: 0, stories: 0 };
  const changed: string[] = [];

  const mergeStories = (feature: Feature, generatedStories: UserStory[]): UserStory[] => {
    const kept = feature.userStories.map(story => {
      const match = generatedStories.find(g => norm(g.title) === norm(story.title));
      if (!match || same(storyFp(story), storyFp(match))) return story;
      changed.push(`História "${story.title}"`);
      return replaceChanged ? { ...story, ...defined(match), id: story.id, featureId: story.featureId } : story;
    });
    const fresh = generatedStories
      .filter(g => !feature.userStories.some(s => norm(s.title) === norm(g.title)))
      .map(g => ({ ...g, featureId: feature.id }));
    added.stories += fresh.length;
    return [...kept, ...fresh];
  };

  const mergeFeatures = (epic: Epic, generatedFeatures: Feature[]): Feature[] => {
    const kept = epic.features.map(feature => {
      const match = generatedFeatures.find(g => norm(g.title) === norm(feature.title));
      if (!match) return feature;
      const differs = !same(featureFp(feature), featureFp(match));
      if (differs) changed.push(`Feature "${feature.title}"`);
      const base: Feature = differs && replaceChanged
        ? { ...feature, ...defined({ ...match, userStories: undefined }), id: feature.id, epicId: feature.epicId }
        : feature;
      return { ...base, userStories: mergeStories(base, match.userStories) };
    });
    const fresh = generatedFeatures
      .filter(g => !epic.features.some(f => norm(f.title) === norm(g.title)))
      .map(g => ({ ...g, epicId: epic.id }));
    added.features += fresh.length;
    added.stories += fresh.reduce((total, f) => total + f.userStories.length, 0);
    return [...kept, ...fresh];
  };

  const keptEpics = existing.epics.map(epic => {
    const match = generated.epics.find(g => norm(g.title) === norm(epic.title));
    if (!match) return epic;
    const differs = !same(epicFp(epic), epicFp(match));
    if (differs) changed.push(`Épico "${epic.title}"`);
    const base: Epic = differs && replaceChanged
      ? { ...epic, ...defined({ ...match, features: undefined }), id: epic.id }
      : epic;
    return { ...base, features: mergeFeatures(base, match.features) };
  });
  const freshEpics = generated.epics.filter(g => !existing.epics.some(e => norm(e.title) === norm(g.title)));
  added.epics += freshEpics.length;
  added.features += freshEpics.reduce((total, e) => total + e.features.length, 0);
  added.stories += freshEpics.reduce((total, e) => total + e.features.reduce((n, f) => n + f.userStories.length, 0), 0);

  const keptOkrs = existing.okrs.map(okr => {
    const match = generated.okrs.find(g => norm(g.objective) === norm(okr.objective));
    if (!match || same(okrFp(okr), okrFp(match))) return okr;
    changed.push(`OKR "${okr.objective}"`);
    return replaceChanged ? { ...okr, ...defined(match), id: okr.id } : okr;
  });
  const freshOkrs = generated.okrs.filter(g => !existing.okrs.some(o => norm(o.objective) === norm(g.objective)));
  added.okrs += freshOkrs.length;

  let prd = existing.prd;
  if (generated.prd) {
    if (isDraftPrd(existing.prd)) {
      prd = { ...generated.prd, id: existing.prd.id };
    } else if (!same(prdFp(existing.prd), prdFp(generated.prd))) {
      changed.push('PRD');
      if (replaceChanged) prd = { ...existing.prd, ...defined(generated.prd), id: existing.prd.id };
    }
  }

  return {
    data: { okrs: [...keptOkrs, ...freshOkrs], epics: [...keptEpics, ...freshEpics], prd } satisfies BacklogData,
    added,
    changed
  };
}

/**
 * Planeja como juntar o backlog gerado pela IA ao que o usuário já tem. Itens novos entram direto
 * (incremento). Itens existentes que a IA quer alterar ficam como estão, a menos que quem chama
 * escolha `plan.replaced` depois de confirmar com o usuário.
 */
export function planBacklogMerge(existing: BacklogData, generated: GeneratedBacklog): MergePlan {
  const keepExisting = build(existing, generated, false);
  const useGenerated = build(existing, generated, true);
  return {
    merged: keepExisting.data,
    replaced: useGenerated.data,
    added: keepExisting.added,
    changed: keepExisting.changed
  };
}
