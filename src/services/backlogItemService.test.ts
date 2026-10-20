import { describe, expect, it } from 'vitest';
import {
  contestedItems,
  invalidate,
  logChange,
  recordEvidence,
  stampOrigin,
  validationOf,
  validationSummary
} from './backlogItemService';
import type { BacklogMeta, Epic, UserStory, ValidationEvidence } from '../types/discovery';

const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'História', asA: 'a', iWantTo: 'b', soThat: 'c', acceptanceCriteria: [], tasks: [], ...over
});

const evidence = (stance: ValidationEvidence['stance'], at: string, quote = 'frase'): ValidationEvidence => ({ stance, quote, at });

describe('validationOf', () => {
  it('item antigo, sem metadados, conta como hipótese', () => {
    expect(validationOf({})).toBe('hypothesis');
    expect(validationOf(story())).toBe('hypothesis');
  });

  it('devolve o estado gravado', () => {
    expect(validationOf({ validation: { status: 'validated', evidences: [] } })).toBe('validated');
  });
});

describe('recordEvidence', () => {
  it('uma fala que confirma valida o item e guarda a citação', () => {
    const next = recordEvidence(story(), { ...evidence('confirms', '2026-01-01T10:00:00.000Z', 'Preciso disso toda semana'), sessionTitle: 'Kickoff', timestamp: '00:12' });

    expect(validationOf(next)).toBe('validated');
    expect(next.validation!.evidences).toEqual([
      { stance: 'confirms', quote: 'Preciso disso toda semana', sessionTitle: 'Kickoff', timestamp: '00:12', at: '2026-01-01T10:00:00.000Z' }
    ]);
  });

  it('uma fala que contesta marca como contestado, e o item continua visível com as evidências', () => {
    const next = recordEvidence(story(), evidence('contests', '2026-01-01T10:00:00.000Z'));

    expect(validationOf(next)).toBe('contested');
  });

  it('vale a evidência mais recente, e o histórico fica todo guardado', () => {
    let item: BacklogMeta = recordEvidence({}, evidence('confirms', '2026-01-01T10:00:00.000Z'));
    item = recordEvidence(item, evidence('contests', '2026-01-02T10:00:00.000Z'));

    expect(validationOf(item)).toBe('contested');
    expect(item.validation!.evidences).toHaveLength(2);

    item = recordEvidence(item, evidence('confirms', '2026-01-03T10:00:00.000Z'));
    expect(validationOf(item)).toBe('validated');
  });

  it('item invalidado continua invalidado, mesmo com nova evidência', () => {
    const item = recordEvidence(invalidate(story(), '2026-01-01T10:00:00.000Z'), evidence('confirms', '2026-01-02T10:00:00.000Z'));

    expect(validationOf(item)).toBe('invalidated');
    expect(item.validation!.evidences).toHaveLength(1);
  });

  it('não altera o item original', () => {
    const original = story();
    const snapshot = JSON.stringify(original);

    recordEvidence(original, evidence('confirms', '2026-01-01T10:00:00.000Z'));

    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('invalidate / logChange / stampOrigin', () => {
  it('invalidar marca o item e registra no histórico', () => {
    const next = invalidate(story(), '2026-01-01T10:00:00.000Z');

    expect(validationOf(next)).toBe('invalidated');
    expect(next.changes).toEqual([{ at: '2026-01-01T10:00:00.000Z', summary: 'Item invalidado' }]);
  });

  it('logChange acrescenta ao histórico sem apagar o anterior', () => {
    const first = logChange(story(), 'Título ajustado', '2026-01-01T10:00:00.000Z', 'sess-1');
    const second = logChange(first, 'Critério incluído', '2026-01-02T10:00:00.000Z');

    expect(second.changes).toEqual([
      { at: '2026-01-01T10:00:00.000Z', summary: 'Título ajustado', sessionId: 'sess-1' },
      { at: '2026-01-02T10:00:00.000Z', summary: 'Critério incluído' }
    ]);
  });

  it('stampOrigin registra quem criou o item e de onde veio', () => {
    const next = stampOrigin(story(), { author: 'ai', sessionId: 's9', quote: 'Frase', timestamp: '00:03' }, '2026-01-01T10:00:00.000Z');

    expect(next.origin).toEqual({ author: 'ai', sessionId: 's9', quote: 'Frase', timestamp: '00:03', createdAt: '2026-01-01T10:00:00.000Z' });
  });

  it('stampOrigin não troca a origem que o item já tem', () => {
    const first = stampOrigin(story(), { author: 'user' }, '2026-01-01T10:00:00.000Z');

    expect(stampOrigin(first, { author: 'ai' }, '2026-02-01T10:00:00.000Z').origin).toEqual(first.origin);
  });
});

describe('contestedItems', () => {
  it('lista épicos, features e histórias contestados, com a citação que contesta', () => {
    const contested = (quote: string) => recordEvidence({}, { stance: 'contests', quote, sessionTitle: 'Kickoff', at: '2026-01-01T10:00:00.000Z' });
    const epics: Epic[] = [{
      id: 'e1', title: 'Épico A', objective: '', businessValue: '', status: 'discovery',
      features: [{
        id: 'f1', epicId: 'e1', title: 'Feature B', description: '', valueProposition: '', effort: 'S', ...contested('Isso não é problema pra nós'),
        userStories: [story({ id: 's1', title: 'História C', ...contested('Ninguém usa') }), story({ id: 's2', title: 'História D' })]
      }]
    }];

    expect(contestedItems(epics)).toEqual([
      { level: 'feature', title: 'Feature B', quote: 'Isso não é problema pra nós', sessionTitle: 'Kickoff' },
      { level: 'história', title: 'História C', quote: 'Ninguém usa', sessionTitle: 'Kickoff' }
    ]);
  });

  it('sem itens contestados devolve lista vazia', () => {
    expect(contestedItems([])).toEqual([]);
  });
});

describe('validationSummary', () => {
  it('conta os itens dos 4 níveis por estado', () => {
    const validated = { validation: { status: 'validated' as const, evidences: [] } };
    const contested = { validation: { status: 'contested' as const, evidences: [] } };
    const epics: Epic[] = [{
      id: 'e1', title: 'E', objective: '', businessValue: '', status: 'discovery', ...validated,
      features: [{
        id: 'f1', epicId: 'e1', title: 'F', description: '', valueProposition: '', effort: 'S',
        userStories: [
          story({ id: 's1', ...validated, tasks: [{ id: 't1', title: 'T', type: 'qa', status: 'todo', ...contested }] }),
          story({ id: 's2' })
        ]
      }]
    }];

    expect(validationSummary(epics)).toEqual({ hypothesis: 2, validated: 2, contested: 1, invalidated: 0, total: 5 });
  });

  it('backlog vazio dá tudo zero', () => {
    expect(validationSummary([])).toEqual({ hypothesis: 0, validated: 0, contested: 0, invalidated: 0, total: 0 });
  });
});
