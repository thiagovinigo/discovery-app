import { describe, expect, it } from 'vitest';
import { traceLines, withoutInvalidated } from './exportTrace';
import type { DiscoveryProject, Epic, UserStory } from '../types/discovery';

const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'História', asA: 'a', iWantTo: 'b', soThat: 'c', acceptanceCriteria: [], tasks: [], ...over
});

const epicWith = (stories: UserStory[], meta: Partial<Epic> = {}): Epic => ({
  id: 'e1', title: 'Épico', objective: '', businessValue: '', status: 'discovery', ...meta,
  features: [{ id: 'f1', epicId: 'e1', title: 'Feature', description: '', valueProposition: '', effort: 'S', userStories: stories }]
});

const projectWith = (epics: Epic[]): DiscoveryProject => ({ id: 'p1', name: 'P', epics } as unknown as DiscoveryProject);

const confirmed = (over = {}) => ({
  status: 'validated' as const,
  evidences: [{ stance: 'confirms' as const, quote: 'Preciso disso toda semana', sessionTitle: 'Kickoff', timestamp: '04:12', at: '2026-01-01T10:00:00.000Z', ...over }]
});

describe('traceLines', () => {
  it('item antigo, sem metadados, não traz nada', () => {
    expect(traceLines({})).toEqual([]);
    expect(traceLines(story())).toEqual([]);
  });

  it('hipótese sem origem nem fatiamento também não traz nada', () => {
    expect(traceLines({ validation: { status: 'hypothesis', evidences: [] } })).toEqual([]);
  });

  it('item validado traz o estado e a citação com reunião e minuto', () => {
    expect(traceLines({ validation: confirmed() })).toEqual([
      'Validação: validado',
      'Evidência: "Preciso disso toda semana" (Kickoff, 04:12)'
    ]);
  });

  it('item contestado traz a citação que contesta, não a que confirma', () => {
    const lines = traceLines({
      validation: {
        status: 'contested',
        evidences: [
          { stance: 'confirms', quote: 'Antes eu queria', at: '2026-01-01T10:00:00.000Z' },
          { stance: 'contests', quote: 'Agora ninguém usa', sessionTitle: 'Revisão', at: '2026-01-02T10:00:00.000Z' }
        ]
      }
    });

    expect(lines).toEqual(['Validação: contestado', 'Evidência: "Agora ninguém usa" (Revisão)']);
  });

  it('evidência sem reunião nem minuto vem só com a citação', () => {
    expect(traceLines({ validation: confirmed({ sessionTitle: undefined, timestamp: undefined }) })[1]).toBe('Evidência: "Preciso disso toda semana"');
  });

  it('item fatiado diz de onde veio', () => {
    const lines = traceLines({
      sliceOf: 's0',
      changes: [{ at: '2026-01-01T10:00:00.000Z', summary: 'Fatiada de "Gerenciar relatórios"' }]
    });

    expect(lines).toEqual(['Fatiado: Fatiada de "Gerenciar relatórios"']);
  });

  it('fatiado sem registro no histórico cita o id do original', () => {
    expect(traceLines({ sliceOf: 's0' })).toEqual(['Fatiado do item s0']);
  });

  it('mostra a origem quando existe', () => {
    expect(traceLines({ origin: { author: 'ai', createdAt: '2026-01-01T10:00:00.000Z' } })).toEqual(['Origem: IA']);
    expect(traceLines({ origin: { author: 'user', quote: 'Fala original', createdAt: '2026-01-01T10:00:00.000Z' } })).toEqual(['Origem: usuário — "Fala original"']);
  });
});

describe('withoutInvalidated', () => {
  const invalid = { validation: { status: 'invalidated' as const, evidences: [] } };

  it('tira histórias invalidadas, mantendo as demais', () => {
    const project = projectWith([epicWith([story({ id: 'a', title: 'Fica' }), story({ id: 'b', title: 'Sai', ...invalid })])]);

    const titles = withoutInvalidated(project).epics[0].features[0].userStories.map(s => s.title);

    expect(titles).toEqual(['Fica']);
  });

  it('tira tasks, features e épicos invalidados (com tudo que há dentro deles)', () => {
    const withTask = story({ tasks: [{ id: 't1', title: 'Fica', type: 'qa', status: 'todo' }, { id: 't2', title: 'Sai', type: 'qa', status: 'todo', ...invalid }] });
    const project = projectWith([
      epicWith([withTask]),
      epicWith([story()], { id: 'e2', title: 'Épico inválido', ...invalid })
    ]);

    const result = withoutInvalidated(project);

    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].features[0].userStories[0].tasks.map(t => t.title)).toEqual(['Fica']);
  });

  it('contestado e hipótese continuam no export', () => {
    const contested = { validation: { status: 'contested' as const, evidences: [] } };

    expect(withoutInvalidated(projectWith([epicWith([story({ ...contested })])])).epics[0].features[0].userStories).toHaveLength(1);
  });

  it('com a opção de incluir invalidados, nada é removido', () => {
    const project = projectWith([epicWith([story(invalid)])]);

    expect(withoutInvalidated(project, { includeInvalidated: true })).toBe(project);
  });

  it('sem nada a remover devolve o próprio projeto e não altera o original', () => {
    const project = projectWith([epicWith([story()])]);
    const snapshot = JSON.stringify(project);

    expect(withoutInvalidated(project)).toBe(project);
    expect(JSON.stringify(project)).toBe(snapshot);
  });
});
