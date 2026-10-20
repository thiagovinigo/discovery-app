import { describe, expect, it } from 'vitest';
import { changeWithSnapshot, lastSnapshot, undoLast } from './backlogHistoryService';
import type { DiscoveryProject, Epic } from '../types/discovery';

const epic = (title: string): Epic => ({ id: `e-${title}`, title, objective: '', businessValue: '', status: 'discovery', features: [] });

const project = (epics: Epic[] = [], extra: Partial<DiscoveryProject> = {}): DiscoveryProject =>
  ({ id: 'p1', name: 'P', okrs: [], epics, ...extra } as unknown as DiscoveryProject);

const at = (n: number) => `2026-03-0${n}T10:00:00.000Z`;

describe('changeWithSnapshot', () => {
  it('guarda o backlog de antes e aplica a mudança', () => {
    const before = project([epic('A')]);

    const after = changeWithSnapshot(before, 'Aplicou 2 propostas', at(1), p => ({ ...p, epics: [...p.epics, epic('B')] }));

    expect(after.epics.map(e => e.title)).toEqual(['A', 'B']);
    expect(after.backlogHistory).toHaveLength(1);
    expect(after.backlogHistory![0]).toMatchObject({ at: at(1), label: 'Aplicou 2 propostas', epics: [expect.objectContaining({ title: 'A' })] });
  });

  it('o instantâneo é uma cópia: mudar o backlog depois não o altera', () => {
    const before = project([epic('A')]);
    const after = changeWithSnapshot(before, 'x', at(1), p => ({ ...p, epics: [] }));

    expect(after.backlogHistory![0].epics).toHaveLength(1);
    expect(before.epics).toHaveLength(1);
  });

  it('guarda no máximo 5 instantâneos, descartando os mais antigos', () => {
    let current = project([epic('A')]);
    for (let i = 1; i <= 7; i++) current = changeWithSnapshot(current, `mudança ${i}`, at(1), p => ({ ...p, epics: [...p.epics, epic(`N${i}`)] }));

    expect(current.backlogHistory).toHaveLength(5);
    expect(current.backlogHistory![0].label).toBe('mudança 7');
    expect(current.backlogHistory![4].label).toBe('mudança 3');
  });

  it('mudança que não altera nada não gera instantâneo', () => {
    const before = project([epic('A')]);

    expect(changeWithSnapshot(before, 'nada', at(1), p => p)).toBe(before);
  });

  it('a própria lista de instantâneos não entra dentro do instantâneo', () => {
    let current = project([epic('A')]);
    current = changeWithSnapshot(current, 'um', at(1), p => ({ ...p, epics: [...p.epics, epic('B')] }));
    current = changeWithSnapshot(current, 'dois', at(2), p => ({ ...p, epics: [...p.epics, epic('C')] }));

    expect(Object.keys(current.backlogHistory![0]).sort()).toEqual(['at', 'epics', 'id', 'label', 'okrs']);
  });
});

describe('undoLast / lastSnapshot', () => {
  it('desfazer devolve o backlog exatamente ao estado de antes', () => {
    const before = project([epic('A')]);
    const after = changeWithSnapshot(before, 'x', at(1), p => ({ ...p, epics: [...p.epics, epic('B')], okrs: [] }));

    const { project: restored, undone } = undoLast(after);

    expect(restored.epics).toEqual(before.epics);
    expect(restored.okrs).toEqual(before.okrs);
    expect(undone?.label).toBe('x');
    expect(restored.backlogHistory).toEqual([]);
  });

  it('desfaz uma mudança por vez, da mais recente para a mais antiga', () => {
    let current = project([epic('A')]);
    current = changeWithSnapshot(current, 'um', at(1), p => ({ ...p, epics: [...p.epics, epic('B')] }));
    current = changeWithSnapshot(current, 'dois', at(2), p => ({ ...p, epics: [...p.epics, epic('C')] }));

    const first = undoLast(current);
    expect(first.project.epics.map(e => e.title)).toEqual(['A', 'B']);
    expect(lastSnapshot(first.project)?.label).toBe('um');

    const second = undoLast(first.project);
    expect(second.project.epics.map(e => e.title)).toEqual(['A']);
  });

  it('sem histórico, desfazer não muda nada', () => {
    const p = project([epic('A')]);

    expect(undoLast(p)).toEqual({ project: p, undone: undefined });
    expect(lastSnapshot(p)).toBeUndefined();
  });

  it('desfazer não mexe no resto do projeto', () => {
    const p = project([epic('A')], { name: 'Nome', notes: [{ id: 'n1', text: 'x', tags: [], createdAt: at(1), updatedAt: at(1) }] });
    const after = changeWithSnapshot(p, 'x', at(1), q => ({ ...q, epics: [] }));

    expect(undoLast(after).project.notes).toEqual(p.notes);
  });
});
