import { describe, expect, it } from 'vitest';
import { planBacklogMerge } from './backlogMerge';
import type { BacklogData } from './backlogMerge';
import type { Epic, Feature, OKR, PRDDocument, UserStory } from '../types/discovery';

const story = (id: string, featureId: string, title: string, over: Partial<UserStory> = {}): UserStory => ({
  id, featureId, title, asA: 'PM', iWantTo: 'organizar', soThat: 'decidir', acceptanceCriteria: [], tasks: [], ...over,
});
const feature = (id: string, epicId: string, title: string, stories: UserStory[] = [], over: Partial<Feature> = {}): Feature => ({
  id, epicId, title, description: 'desc', valueProposition: 'valor', effort: 'M', userStories: stories, ...over,
});
const epic = (id: string, title: string, features: Feature[] = [], over: Partial<Epic> = {}): Epic => ({
  id, title, objective: 'obj', businessValue: 'valor', status: 'discovery', features, ...over,
});
const okr = (id: string, objective: string, target = '10'): OKR => ({
  id, objective, keyResults: [{ id: `${id}-kr`, description: 'kr', baseline: '0', target, current: '0' }],
});
const prd = (over: Partial<PRDDocument> = {}): PRDDocument => ({
  id: 'prd-1', title: 'PRD', version: '0.1.0', lastUpdated: '01/01/2026',
  problemStatement: 'Problema real', targetAudience: 'PMs', valueProposition: 'Valor',
  inScope: [], outOfScope: [], successMetrics: [], assumptions: [], risksAndMitigations: [], ...over,
});
const placeholderPrd = () => prd({ problemStatement: 'Descreva aqui o problema principal identificado nas sessões.' });

const data = (over: Partial<BacklogData> = {}): BacklogData => ({ okrs: [], epics: [], prd: prd(), ...over });

describe('planBacklogMerge: itens novos (incremento)', () => {
  it('acrescenta épicos novos sem pedir confirmação', () => {
    const existing = data({ epics: [epic('e1', 'Onboarding')] });
    const generated = data({ epics: [epic('g1', 'Pagamentos', [feature('gf1', 'g1', 'Pix', [story('gs1', 'gf1', 'Pagar')])])] });

    const plan = planBacklogMerge(existing, generated);

    expect(plan.merged.epics.map(e => e.title)).toEqual(['Onboarding', 'Pagamentos']);
    expect(plan.added).toMatchObject({ epics: 1, features: 1, stories: 1 });
    expect(plan.changed).toEqual([]);
  });

  it('acrescenta feature nova num épico existente, ligada ao id do épico existente', () => {
    const existing = data({ epics: [epic('e1', 'Onboarding', [feature('f1', 'e1', 'Cadastro')])] });
    const generated = data({ epics: [epic('g1', 'onboarding', [feature('gf1', 'g1', 'Login')])] });

    const plan = planBacklogMerge(existing, generated);

    const [merged] = plan.merged.epics;
    expect(merged.id).toBe('e1');
    expect(merged.features.map(f => f.title)).toEqual(['Cadastro', 'Login']);
    expect(merged.features[1].epicId).toBe('e1');
    expect(plan.added.features).toBe(1);
  });

  it('acrescenta história nova numa feature existente, ligada ao id da feature existente', () => {
    const existing = data({ epics: [epic('e1', 'E', [feature('f1', 'e1', 'F', [story('s1', 'f1', 'A')])])] });
    const generated = data({ epics: [epic('g1', 'E', [feature('gf1', 'g1', 'F', [story('gs1', 'gf1', 'B')])])] });

    const plan = planBacklogMerge(existing, generated);

    const stories = plan.merged.epics[0].features[0].userStories;
    expect(stories.map(s => s.title)).toEqual(['A', 'B']);
    expect(stories[1].featureId).toBe('f1');
    expect(plan.added.stories).toBe(1);
  });

  it('acrescenta OKRs novos e ignora os já existentes', () => {
    const existing = data({ okrs: [okr('o1', 'Reduzir tempo')] });
    const generated = data({ okrs: [okr('g1', 'reduzir tempo'), okr('g2', 'Aumentar NPS')] });

    const plan = planBacklogMerge(existing, generated);

    expect(plan.merged.okrs.map(o => o.objective)).toEqual(['Reduzir tempo', 'Aumentar NPS']);
    expect(plan.added.okrs).toBe(1);
  });

  it('não muda nada quando a IA devolve o mesmo conteúdo', () => {
    const existing = data({ epics: [epic('e1', 'E', [feature('f1', 'e1', 'F', [story('s1', 'f1', 'A')])])], okrs: [okr('o1', 'O')] });
    const generated = data({ epics: [epic('g1', 'E', [feature('gf1', 'g1', 'F', [story('gs1', 'gf1', 'A')])])], okrs: [okr('g1', 'O')] });

    const plan = planBacklogMerge(existing, generated);

    expect(plan.merged).toEqual(existing);
    expect(plan.changed).toEqual([]);
    expect(plan.added).toEqual({ okrs: 0, epics: 0, features: 0, stories: 0 });
  });
});

describe('planBacklogMerge: itens existentes que a IA quer alterar', () => {
  const existing = data({ epics: [epic('e1', 'E', [feature('f1', 'e1', 'F', [story('s1', 'f1', 'A', { iWantTo: 'versão do usuário', dorChecklist: [{ id: 'c', label: 'x', checked: true }] as never })])])] });
  const generated = data({ epics: [epic('g1', 'E', [feature('gf1', 'g1', 'F', [story('gs1', 'gf1', 'A', { iWantTo: 'versão da IA' })])])] });

  it('lista o que seria alterado e mantém a versão do usuário por padrão', () => {
    const plan = planBacklogMerge(existing, generated);

    expect(plan.changed).toEqual(['História "A"']);
    expect(plan.merged.epics[0].features[0].userStories[0].iWantTo).toBe('versão do usuário');
  });

  it('a versão "replaced" usa o texto da IA, mas preserva id, ligação e checklists do usuário', () => {
    const plan = planBacklogMerge(existing, generated);

    const replaced = plan.replaced.epics[0].features[0].userStories[0];
    expect(replaced.iWantTo).toBe('versão da IA');
    expect(replaced.id).toBe('s1');
    expect(replaced.featureId).toBe('f1');
    expect(replaced.dorChecklist).toHaveLength(1);
  });

  it('detecta mudança em épico, feature e OKR', () => {
    const ex = data({ epics: [epic('e1', 'E', [feature('f1', 'e1', 'F')])], okrs: [okr('o1', 'O', '10')] });
    const gen = data({
      epics: [epic('g1', 'E', [feature('gf1', 'g1', 'F', [], { description: 'nova' })], { objective: 'novo objetivo' })],
      okrs: [okr('g1', 'O', '99')],
    });

    expect(planBacklogMerge(ex, gen).changed).toEqual(['Épico "E"', 'Feature "F"', 'OKR "O"']);
  });

  it('uma mudança não impede que os itens novos sejam acrescentados', () => {
    const gen = data({ epics: [epic('g1', 'E', [feature('gf1', 'g1', 'F', [
      story('gs1', 'gf1', 'A', { iWantTo: 'versão da IA' }),
      story('gs2', 'gf1', 'Nova'),
    ])])] });

    const plan = planBacklogMerge(existing, gen);

    expect(plan.merged.epics[0].features[0].userStories.map(s => s.title)).toEqual(['A', 'Nova']);
    expect(plan.changed).toEqual(['História "A"']);
  });
});

describe('planBacklogMerge: PRD', () => {
  it('um PRD ainda em rascunho é preenchido pela IA sem confirmação, mantendo o id', () => {
    const existing = data({ prd: placeholderPrd() });
    const generated = data({ prd: prd({ id: 'prd-ia', problemStatement: 'Problema da IA' }) });

    const plan = planBacklogMerge(existing, generated);

    expect(plan.merged.prd.problemStatement).toBe('Problema da IA');
    expect(plan.merged.prd.id).toBe('prd-1');
    expect(plan.changed).toEqual([]);
  });

  it('um PRD já escrito só muda com confirmação', () => {
    const existing = data({ prd: prd({ problemStatement: 'Meu texto' }) });
    const generated = data({ prd: prd({ id: 'prd-ia', problemStatement: 'Texto da IA' }) });

    const plan = planBacklogMerge(existing, generated);

    expect(plan.changed).toEqual(['PRD']);
    expect(plan.merged.prd.problemStatement).toBe('Meu texto');
    expect(plan.replaced.prd.problemStatement).toBe('Texto da IA');
    expect(plan.replaced.prd.id).toBe('prd-1');
  });

  it('sem PRD gerado, mantém o existente', () => {
    const plan = planBacklogMerge(data(), { okrs: [], epics: [] });

    expect(plan.merged.prd).toEqual(data().prd);
    expect(plan.changed).toEqual([]);
  });
});
