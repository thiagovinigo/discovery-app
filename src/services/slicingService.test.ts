import { describe, expect, it } from 'vitest';
import {
  sliceEpicIntoFeatures,
  sliceFeatureIntoStories,
  sliceStory,
  sliceStoryIntoTasks,
  suggestStorySlices,
  validateStorySlice
} from './slicingService';
import type { StorySlicePart } from './slicingService';
import type { AcceptanceCriteria, Epic, TechnicalTask, UserStory } from '../types/discovery';

const OPTS = { at: '2026-03-01T10:00:00.000Z', sessionId: 'sess-1' };

const criterion = (id: string): AcceptanceCriteria => ({ id, scenario: `Cenário ${id}`, given: 'g', when: 'w', then: 't' });
const task = (id: string, type: TechnicalTask['type'] = 'backend'): TechnicalTask => ({ id, title: `Task ${id}`, type, status: 'todo' });

const bigStory = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Gerenciar relatórios', asA: 'diretor', iWantTo: 'gerenciar relatórios', soThat: 'decidir melhor',
  acceptanceCriteria: [criterion('a'), criterion('b'), criterion('c')], tasks: [task('t1'), task('t2'), task('t3', 'qa')],
  storyPoints: 8, evidenceQuote: { speaker: 'Ana', text: 'Preciso disso' }, ...over
});

const epicsWith = (stories: UserStory[]): Epic[] => [{
  id: 'e1', title: 'Relatórios', objective: '', businessValue: '', status: 'discovery',
  features: [{ id: 'f1', epicId: 'e1', title: 'Gestão', description: '', valueProposition: '', effort: 'M', userStories: stories }]
}];

const stories = (epics: Epic[]) => epics[0].features[0].userStories;

describe('suggestStorySlices', () => {
  it('sugere uma parte por critério de aceite, com os pontos repartidos e as tasks distribuídas', () => {
    const parts = suggestStorySlices(bigStory());

    expect(parts).toHaveLength(3);
    expect(parts.map(p => p.criteriaIds)).toEqual([['a'], ['b'], ['c']]);
    expect(parts.map(p => p.storyPoints)).toEqual([3, 3, 2]);
    expect(parts.flatMap(p => p.taskIds).sort()).toEqual(['t1', 't2', 't3']);
    expect(parts[0].title).toBe('Gerenciar relatórios — Cenário a');
  });

  it('com menos pontos do que critérios, agrupa os critérios em menos partes', () => {
    const parts = suggestStorySlices(bigStory({ storyPoints: 2, acceptanceCriteria: [criterion('a'), criterion('b'), criterion('c'), criterion('d')] }));

    expect(parts).toHaveLength(2);
    expect(parts.flatMap(p => p.criteriaIds).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(parts.reduce((total, p) => total + (p.storyPoints ?? 0), 0)).toBe(2);
  });

  it('história com um critério só ou nenhum não tem como ser fatiada pelos critérios', () => {
    expect(suggestStorySlices(bigStory({ acceptanceCriteria: [criterion('a')] }))).toEqual([]);
    expect(suggestStorySlices(bigStory({ acceptanceCriteria: [] }))).toEqual([]);
  });

  it('sem pontos na história, as partes ficam sem pontos', () => {
    expect(suggestStorySlices(bigStory({ storyPoints: undefined })).every(p => p.storyPoints === undefined)).toBe(true);
  });
});

describe('validateStorySlice', () => {
  const ok = (): StorySlicePart[] => suggestStorySlices(bigStory());

  it('a sugestão é válida', () => {
    expect(validateStorySlice(bigStory(), ok())).toEqual([]);
  });

  it('exige ao menos duas partes, cada uma com título', () => {
    expect(validateStorySlice(bigStory(), [ok()[0]])).toContain('Escolha ao menos 2 partes.');
    expect(validateStorySlice(bigStory(), ok().map((p, i) => (i === 0 ? { ...p, title: ' ' } : p)))).toContain('Toda parte precisa de título.');
  });

  it('não deixa nenhum critério de aceite sem destino', () => {
    const parts = ok();
    parts[2] = { ...parts[2], criteriaIds: [] };

    expect(validateStorySlice(bigStory(), parts)).toContain('Critério sem destino: "Cenário c".');
  });

  it('os pontos das partes precisam somar os da história', () => {
    const parts = ok().map(p => ({ ...p, storyPoints: 5 }));

    expect(validateStorySlice(bigStory(), parts)).toContain('Os pontos das partes (15) não batem com os da história (8).');
  });

  it('história sem pontos não exige soma', () => {
    const story = bigStory({ storyPoints: undefined });

    expect(validateStorySlice(story, suggestStorySlices(story))).toEqual([]);
  });
});

describe('sliceStory', () => {
  it('troca a história pelas filhas, na mesma posição, sem perder critério nem task', () => {
    const before = epicsWith([bigStory({ id: 'antes' }), bigStory({ id: 's1' }), bigStory({ id: 'depois' })]);

    const after = sliceStory(before, 's1', suggestStorySlices(bigStory()), OPTS);

    const list = stories(after);
    expect(list.map(s => s.id)).toEqual(['antes', expect.any(String), expect.any(String), expect.any(String), 'depois']);
    const children = list.slice(1, 4);
    expect(children.flatMap(c => c.acceptanceCriteria.map(a => a.id)).sort()).toEqual(['a', 'b', 'c']);
    expect(children.flatMap(c => c.tasks.map(t => t.id)).sort()).toEqual(['t1', 't2', 't3']);
    expect(children.reduce((total, c) => total + (c.storyPoints ?? 0), 0)).toBe(8);
  });

  it('cada filha rastreia o original, herda a citação e o texto, e registra de onde veio', () => {
    const [first] = stories(sliceStory(epicsWith([bigStory()]), 's1', suggestStorySlices(bigStory()), OPTS));

    expect(first).toMatchObject({
      sliceOf: 's1', featureId: 'f1', asA: 'diretor', soThat: 'decidir melhor', evidenceQuote: { speaker: 'Ana', text: 'Preciso disso' }
    });
    expect(first.changes).toEqual([{ at: OPTS.at, summary: 'Fatiada de "Gerenciar relatórios"', sessionId: 'sess-1' }]);
  });

  it('as filhas herdam a validação da história original', () => {
    const validated = bigStory({ validation: { status: 'validated', evidences: [{ stance: 'confirms', quote: 'q', at: OPTS.at }] } });

    const [first] = stories(sliceStory(epicsWith([validated]), 's1', suggestStorySlices(validated), OPTS));

    expect(first.validation?.status).toBe('validated');
  });

  it('um critério em mais de uma parte é copiado para as duas', () => {
    const parts = suggestStorySlices(bigStory());
    parts[0] = { ...parts[0], criteriaIds: ['a', 'b'] };

    const list = stories(sliceStory(epicsWith([bigStory()]), 's1', parts, OPTS));

    expect(list.filter(s => s.acceptanceCriteria.some(c => c.id === 'b'))).toHaveLength(2);
  });

  it('task sem destino fica com a primeira parte', () => {
    const parts = suggestStorySlices(bigStory()).map(p => ({ ...p, taskIds: [] }));

    const list = stories(sliceStory(epicsWith([bigStory()]), 's1', parts, OPTS));

    expect(list[0].tasks.map(t => t.id).sort()).toEqual(['t1', 't2', 't3']);
  });

  it('fatiamento inválido não muda nada e explica o motivo', () => {
    const before = epicsWith([bigStory()]);
    const bad = suggestStorySlices(bigStory()).map(p => ({ ...p, storyPoints: 1 }));

    expect(() => sliceStory(before, 's1', bad, OPTS)).toThrow(/pontos/i);
    expect(stories(before)).toHaveLength(1);
  });

  it('história inexistente não muda nada', () => {
    const before = epicsWith([bigStory()]);

    expect(sliceStory(before, 'zzz', suggestStorySlices(bigStory()), OPTS)).toBe(before);
  });

  it('não altera o backlog original', () => {
    const before = epicsWith([bigStory()]);
    const snapshot = JSON.stringify(before);

    sliceStory(before, 's1', suggestStorySlices(bigStory()), OPTS);

    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('sliceEpicIntoFeatures / sliceFeatureIntoStories / sliceStoryIntoTasks', () => {
  it('épico em features: acrescenta as features, rastreando o épico', () => {
    const after = sliceEpicIntoFeatures(epicsWith([]), 'e1', [{ title: 'Exportação', description: 'PDF e Excel' }, { title: 'Agendamento' }], OPTS);

    const added = after[0].features.slice(1);
    expect(added.map(f => f.title)).toEqual(['Exportação', 'Agendamento']);
    expect(added[0]).toMatchObject({ epicId: 'e1', sliceOf: 'e1', description: 'PDF e Excel', userStories: [] });
    expect(added[0].changes?.[0].summary).toBe('Fatiada de "Relatórios"');
  });

  it('feature em histórias: acrescenta as histórias, rastreando a feature', () => {
    const after = sliceFeatureIntoStories(epicsWith([]), 'f1', [{ title: 'Exportar PDF', storyPoints: 3 }, { title: 'Exportar Excel' }], OPTS);

    const added = stories(after);
    expect(added.map(s => s.title)).toEqual(['Exportar PDF', 'Exportar Excel']);
    expect(added[0]).toMatchObject({ featureId: 'f1', sliceOf: 'f1', storyPoints: 3 });
  });

  it('história em tasks: acrescenta as tasks novas, sem repetir as que já existem', () => {
    const after = sliceStoryIntoTasks(epicsWith([bigStory({ tasks: [task('t1')] })]), 's1', [{ title: 'Task t1', type: 'backend' }, { title: 'Escrever testes', type: 'qa' }], OPTS);

    const tasks = stories(after)[0].tasks;
    expect(tasks.map(t => t.title)).toEqual(['Task t1', 'Escrever testes']);
    expect(tasks[1]).toMatchObject({ type: 'qa', status: 'todo', sliceOf: 's1' });
  });

  it('partes sem título são recusadas, e ids desconhecidos não mudam nada', () => {
    const before = epicsWith([bigStory()]);

    expect(() => sliceEpicIntoFeatures(before, 'e1', [{ title: ' ' }], OPTS)).toThrow(/título/i);
    expect(sliceEpicIntoFeatures(before, 'zzz', [{ title: 'X' }], OPTS)).toBe(before);
    expect(sliceFeatureIntoStories(before, 'zzz', [{ title: 'X' }], OPTS)).toBe(before);
    expect(sliceStoryIntoTasks(before, 'zzz', [{ title: 'X', type: 'qa' }], OPTS)).toBe(before);
  });
});
