import { describe, expect, it } from 'vitest';
import {
  applyProposals,
  findDuplicateStories,
  mergeStories,
  planBacklogProposals,
  proposalsForMeetingType,
  sameTitle
} from './backlogProposals';
import type { BacklogData } from './backlogMerge';
import type { AcceptanceCriteria, Epic, Feature, OKR, TechnicalTask, UserStory } from '../types/discovery';

const prd = { id: 'prd', problemStatement: '', targetAudience: '', valueProposition: '', inScope: [], outOfScope: [], successMetrics: [], assumptions: [], risksAndMitigations: [] } as unknown as BacklogData['prd'];

const criterion = (scenario: string): AcceptanceCriteria => ({ id: `a-${scenario}`, scenario, given: 'g', when: 'w', then: 't' });
const task = (title: string, over: Partial<TechnicalTask> = {}): TechnicalTask => ({ id: `t-${title}`, title, type: 'backend', status: 'todo', ...over });
const story = (title: string, over: Partial<UserStory> = {}): UserStory => ({
  id: `s-${title}`, featureId: 'f1', title, asA: 'diretor', iWantTo: 'exportar', soThat: 'enviar', acceptanceCriteria: [], tasks: [], ...over
});
const feature = (title: string, stories: UserStory[] = [], over: Partial<Feature> = {}): Feature => ({
  id: `f-${title}`, epicId: 'e1', title, description: 'desc', valueProposition: 'valor', effort: 'S', userStories: stories, ...over
});
const epic = (title: string, features: Feature[] = [], over: Partial<Epic> = {}): Epic => ({
  id: `e-${title}`, title, objective: 'obj', businessValue: 'bv', status: 'discovery', features, ...over
});
const okr = (objective: string, target = 10): OKR => ({
  id: `o-${objective}`, objective, keyResults: [{ id: 'k1', description: 'KR', baseline: 0, target, unit: '%' }]
} as unknown as OKR);

const data = (epics: Epic[] = [], okrs: OKR[] = []): BacklogData => ({ okrs, epics, prd });
const NOW = { at: '2026-03-01T10:00:00.000Z', sessionId: 'sess-1' };

describe('sameTitle', () => {
  it('ignora maiúsculas, acentos, palavras curtas e ordem de preenchimento', () => {
    expect(sameTitle('Exportar relatório em PDF', 'Exportar o RELATORIO em pdf')).toBe(true);
  });

  it('títulos diferentes não casam', () => {
    expect(sameTitle('Exportar relatório', 'Importar usuários')).toBe(false);
    expect(sameTitle('', '')).toBe(true);
    expect(sameTitle('', 'Algo')).toBe(false);
  });
});

describe('planBacklogProposals: itens novos', () => {
  it('épico novo vira uma única proposta, com os filhos dentro dela', () => {
    const generated = data([epic('Novo', [feature('F', [story('S')])])]);

    const proposals = planBacklogProposals(data(), generated);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ kind: 'add', level: 'epic', label: 'Novo' });
  });

  it('história nova numa feature existente é proposta sob essa feature', () => {
    const existing = data([epic('E', [feature('F')])]);
    const generated = data([epic('E', [feature('F', [story('Nova história')])])]);

    const proposals = planBacklogProposals(existing, generated);

    expect(proposals).toEqual([expect.objectContaining({ kind: 'add', level: 'story', label: 'Nova história', parentLabel: 'F' })]);
  });

  it('task nova entra na história existente sem marcar a história como alterada', () => {
    const existing = data([epic('E', [feature('F', [story('S', { tasks: [task('A')] })])])]);
    const generated = data([epic('E', [feature('F', [story('S', { tasks: [task('A'), task('B', { type: 'qa' })] })])])]);

    const proposals = planBacklogProposals(existing, generated);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ kind: 'add', level: 'task', label: 'B', parentLabel: 'S' });
  });

  it('nada novo e nada diferente não gera proposta', () => {
    const same = data([epic('E', [feature('F', [story('S', { tasks: [task('A')] })])])], [okr('Crescer')]);

    expect(planBacklogProposals(same, same)).toEqual([]);
  });

  it('título parecido é o mesmo item: não duplica', () => {
    const existing = data([epic('E', [feature('F', [story('Exportar relatório em PDF')])])]);
    const generated = data([epic('E', [feature('F', [story('Exportar o relatório em PDF')])])]);

    expect(planBacklogProposals(existing, generated).filter(p => p.kind === 'add')).toEqual([]);
  });
});

describe('planBacklogProposals: atualizações campo a campo', () => {
  it('mostra o antes e o depois só do que mudou', () => {
    const existing = data([epic('E', [feature('F', [story('S', { iWantTo: 'exportar em PDF', storyPoints: 3 })])])]);
    const generated = data([epic('E', [feature('F', [story('S', { iWantTo: 'exportar em PDF e Excel', storyPoints: 3 })])])]);

    const proposals = planBacklogProposals(existing, generated);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      kind: 'update', level: 'story', label: 'S',
      changes: [{ field: 'iWantTo', label: 'Quero', before: 'exportar em PDF', after: 'exportar em PDF e Excel' }]
    });
  });

  it('atualiza épico, feature e task em propostas separadas', () => {
    const existing = data([epic('E', [feature('F', [story('S', { tasks: [task('A')] })])])]);
    const generated = data([epic('E', [feature('F', [story('S', { tasks: [task('A', { type: 'qa' })] })], { description: 'nova desc' })], { objective: 'novo obj' })]);

    const levels = planBacklogProposals(existing, generated).map(p => p.level).sort();

    expect(levels).toEqual(['epic', 'feature', 'task']);
  });

  it('critérios de aceite diferentes aparecem como uma mudança de critérios', () => {
    const existing = data([epic('E', [feature('F', [story('S', { acceptanceCriteria: [criterion('um')] })])])]);
    const generated = data([epic('E', [feature('F', [story('S', { acceptanceCriteria: [criterion('um'), criterion('dois')] })])])]);

    const [proposal] = planBacklogProposals(existing, generated);

    expect(proposal).toMatchObject({ kind: 'update', changes: [{ field: 'acceptanceCriteria', before: 'um', after: 'um; dois' }] });
  });

  it('campo que a IA não informou não conta como mudança', () => {
    const existing = data([epic('E', [feature('F', [story('S', { storyPoints: 5 })])])]);
    const generated = data([epic('E', [feature('F', [story('S', { storyPoints: undefined })])])]);

    expect(planBacklogProposals(existing, generated)).toEqual([]);
  });

  it('OKR novo e OKR com meta diferente', () => {
    const proposals = planBacklogProposals(data([], [okr('Crescer', 10)]), data([], [okr('Crescer', 20), okr('Reter')]));

    expect(proposals.map(p => [p.kind, p.level])).toEqual([['update', 'okr'], ['add', 'okr']]);
  });
});

describe('applyProposals', () => {
  const existing = data([epic('E', [feature('F', [story('S', { iWantTo: 'exportar', tasks: [task('A')], dorChecklist: [{ id: 'd1', label: 'x', checked: true }] })])])]);
  const generated = data([epic('E', [feature('F', [
    story('S', { iWantTo: 'exportar tudo', tasks: [task('A'), task('B')] }),
    story('Outra')
  ])])]);

  it('aplica só as propostas aceitas, uma a uma', () => {
    const proposals = planBacklogProposals(existing, generated);
    const addStory = proposals.find(p => p.kind === 'add' && p.level === 'story')!;

    const result = applyProposals(existing, proposals, [addStory.id], NOW);

    const stories = result.epics[0].features[0].userStories;
    expect(stories.map(s => s.title)).toEqual(['S', 'Outra']);
    expect(stories[0].iWantTo).toBe('exportar');
    expect(stories[0].tasks).toHaveLength(1);
  });

  it('"all" aplica tudo; aceitar nada não muda nada', () => {
    const proposals = planBacklogProposals(existing, generated);

    const all = applyProposals(existing, proposals, 'all', NOW).epics[0].features[0].userStories;
    expect(all.map(s => s.title)).toEqual(['S', 'Outra']);
    expect(all[0].iWantTo).toBe('exportar tudo');
    expect(all[0].tasks.map(t => t.title)).toEqual(['A', 'B']);

    expect(applyProposals(existing, proposals, [], NOW)).toEqual(existing);
  });

  it('atualizar preserva id, checklists e o que a IA não mexeu', () => {
    const proposals = planBacklogProposals(existing, generated);
    const update = proposals.find(p => p.kind === 'update')!;

    const updated = applyProposals(existing, proposals, [update.id], NOW).epics[0].features[0].userStories[0];

    expect(updated.id).toBe('s-S');
    expect(updated.dorChecklist).toEqual([{ id: 'd1', label: 'x', checked: true }]);
    expect(updated.tasks).toHaveLength(1);
  });

  it('itens novos ganham origem "IA" com a reunião, e atualizações entram no histórico do item', () => {
    const proposals = planBacklogProposals(existing, generated);

    const stories = applyProposals(existing, proposals, 'all', NOW).epics[0].features[0].userStories;

    expect(stories[1].origin).toEqual({ author: 'ai', sessionId: 'sess-1', createdAt: NOW.at });
    expect(stories[0].changes).toEqual([{ at: NOW.at, summary: 'Atualizado pela IA: Quero', sessionId: 'sess-1' }]);
    expect(stories[0].tasks[1].origin?.author).toBe('ai');
  });

  it('não altera o backlog original', () => {
    const snapshot = JSON.stringify(existing);

    applyProposals(existing, planBacklogProposals(existing, generated), 'all', NOW);

    expect(JSON.stringify(existing)).toBe(snapshot);
  });

  it('épico novo entra com os filhos marcados com a origem', () => {
    const proposals = planBacklogProposals(data(), data([epic('Novo', [feature('F', [story('S', { tasks: [task('T')] })])])]));

    const [added] = applyProposals(data(), proposals, 'all', NOW).epics;

    expect(added.origin?.author).toBe('ai');
    expect(added.features[0].userStories[0].tasks[0].origin?.author).toBe('ai');
  });
});

describe('proposalsForMeetingType', () => {
  const existing = data([epic('E', [feature('F', [story('S', { iWantTo: 'exportar', tasks: [task('A')] })])])]);
  const generated = data([
    epic('E', [feature('F', [story('S', { iWantTo: 'exportar tudo', tasks: [task('A'), task('B')] }), story('Outra')])], { objective: 'novo obj' }),
    epic('Novo épico')
  ]);
  const all = planBacklogProposals(existing, generated);
  const summary = (list: typeof all) => list.map(p => `${p.kind}:${p.level}`).sort();

  it('sem tipo definido ou numa entrevista, mostra tudo', () => {
    expect(proposalsForMeetingType(all, undefined)).toEqual(all);
    expect(proposalsForMeetingType(all, 'interview')).toEqual(all);
  });

  it('discovery mostra o que é novo (incrementos)', () => {
    expect(summary(proposalsForMeetingType(all, 'discovery'))).toEqual(['add:epic', 'add:story', 'add:task']);
  });

  it('alinhamento mostra as alterações em itens que já existem', () => {
    expect(summary(proposalsForMeetingType(all, 'alignment'))).toEqual(['update:epic', 'update:story']);
  });

  it('refinamento mostra só histórias e tasks', () => {
    expect(summary(proposalsForMeetingType(all, 'refinement'))).toEqual(['add:story', 'add:task', 'update:story']);
  });

  it('os filtros nunca inventam propostas: o que aparece é subconjunto do pacote', () => {
    for (const type of ['discovery', 'alignment', 'refinement'] as const) {
      expect(proposalsForMeetingType(all, type).every(p => all.includes(p))).toBe(true);
    }
  });
});

describe('findDuplicateStories / mergeStories', () => {
  const withDupes = () => [epic('E', [
    feature('F', [
      story('Exportar relatório em PDF', { id: 'a', acceptanceCriteria: [criterion('um')], tasks: [task('Gerar')], storyPoints: 3 }),
      story('Exportar o relatório em PDF', { id: 'b', acceptanceCriteria: [criterion('um'), criterion('dois')], tasks: [task('Gerar'), task('Testar', { type: 'qa' })] }),
      story('Importar usuários', { id: 'c' })
    ])
  ])];

  it('acha pares de histórias com título parecido', () => {
    expect(findDuplicateStories(withDupes())).toEqual([{ keepId: 'a', dropId: 'b', title: 'Exportar relatório em PDF' }]);
  });

  it('mesclar junta critérios e tasks sem repetir, mantém a primeira e remove a outra', () => {
    const merged = mergeStories(withDupes(), 'a', 'b', NOW);

    const stories = merged[0].features[0].userStories;
    expect(stories.map(s => s.id)).toEqual(['a', 'c']);
    expect(stories[0].acceptanceCriteria.map(c => c.scenario)).toEqual(['um', 'dois']);
    expect(stories[0].tasks.map(t => t.title)).toEqual(['Gerar', 'Testar']);
    expect(stories[0].storyPoints).toBe(3);
    expect(stories[0].changes).toEqual([{ at: NOW.at, summary: 'Mesclada com "Exportar o relatório em PDF"', sessionId: 'sess-1' }]);
  });

  it('ids desconhecidos não mudam nada', () => {
    expect(mergeStories(withDupes(), 'a', 'zzz', NOW)).toEqual(withDupes());
  });
});
