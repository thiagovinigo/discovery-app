import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import { addStakeholder } from './stakeholderService';
import {
  addNote,
  allTags,
  filterNotes,
  parseTags,
  promoteToDecision,
  promoteToStory,
  removeNote,
  updateNote
} from './noteService';
import type { DiscoveryProject } from '../types/discovery';

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('parseTags', () => {
  it('separa por vírgula, ponto e vírgula ou espaço, tira o "#", põe em minúsculas e não repete', () => {
    expect(parseTags('Prazo, #Orçamento ; prazo  risco')).toEqual(['prazo', 'orçamento', 'risco']);
  });

  it('entrada vazia dá lista vazia', () => {
    expect(parseTags('  , ; ')).toEqual([]);
  });
});

describe('addNote / updateNote / removeNote', () => {
  it('guarda o texto aparado, as etiquetas e as datas', () => {
    const note = addNote(projectId, { text: '  Cliente quer entrega em março  ', tags: ['Prazo', 'prazo'] })!;

    expect(note.id.startsWith('note-')).toBe(true);
    expect(note.text).toBe('Cliente quer entrega em março');
    expect(note.tags).toEqual(['prazo']);
    expect(note.createdAt).toBe(note.updatedAt);
    expect(load().notes).toEqual([note]);
  });

  it('liga a anotação a um stakeholder, reunião ou história', () => {
    const stk = addStakeholder(projectId, { name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto' })!;

    const note = addNote(projectId, { text: 'Ana pediu relatório', stakeholderId: stk.id, sessionId: 's1', storyId: 'st1' })!;

    expect(note).toMatchObject({ stakeholderId: stk.id, sessionId: 's1', storyId: 'st1' });
  });

  it('recusa texto vazio e devolve undefined para projeto inexistente', () => {
    expect(() => addNote(projectId, { text: '   ' })).toThrow(/texto/i);
    expect(addNote('nao-existe', { text: 'x' })).toBeUndefined();
    expect(load().notes).toEqual([]);
  });

  it('atualiza o texto e as etiquetas, mantendo a criação e renovando a edição', async () => {
    const note = addNote(projectId, { text: 'Antes', tags: ['a'] })!;
    await new Promise(resolve => setTimeout(resolve, 5));

    const updated = updateNote(projectId, note.id, { text: 'Depois', tags: ['b'] })!;

    expect(updated).toMatchObject({ text: 'Depois', tags: ['b'], createdAt: note.createdAt });
    expect(updated.updatedAt > note.updatedAt).toBe(true);
    expect(load().notes).toHaveLength(1);
  });

  it('não deixa apagar o texto ao editar, e ignora anotação inexistente', () => {
    const note = addNote(projectId, { text: 'Algo' })!;

    expect(() => updateNote(projectId, note.id, { text: ' ' })).toThrow(/texto/i);
    expect(updateNote(projectId, 'nao-existe', { text: 'x' })).toBeUndefined();
  });

  it('remove a anotação', () => {
    const note = addNote(projectId, { text: 'Algo' })!;

    expect(removeNote(projectId, note.id)).toBe(true);
    expect(removeNote(projectId, note.id)).toBe(false);
    expect(load().notes).toEqual([]);
  });
});

describe('filterNotes / allTags', () => {
  const build = () => {
    addNote(projectId, { text: 'Orçamento aprovado para o primeiro trimestre', tags: ['dinheiro'] });
    addNote(projectId, { text: 'Prazo apertado no lançamento', tags: ['prazo', 'risco'] });
    addNote(projectId, { text: 'Ana quer relatório semanal', tags: ['prazo'], stakeholderId: 'stk-ana' });
    return load().notes!;
  };

  it('sem filtro devolve tudo, da mais recente para a mais antiga', () => {
    const notes = build().map((n, i) => ({ ...n, updatedAt: `2026-01-0${i + 1}T10:00:00.000Z` }));

    expect(filterNotes(notes, {}).map(n => n.text.split(' ')[0])).toEqual(['Ana', 'Prazo', 'Orçamento']);
  });

  it('busca no texto sem diferenciar maiúsculas nem acentos', () => {
    const notes = build();

    expect(filterNotes(notes, { query: 'ORCAMENTO' })).toHaveLength(1);
    expect(filterNotes(notes, { query: 'relatorio semanal' })).toHaveLength(1);
    expect(filterNotes(notes, { query: 'inexistente' })).toEqual([]);
  });

  it('filtra por etiqueta e por stakeholder, combinando com a busca', () => {
    const notes = build();

    expect(filterNotes(notes, { tag: 'prazo' })).toHaveLength(2);
    expect(filterNotes(notes, { tag: 'prazo', query: 'lançamento' })).toHaveLength(1);
    expect(filterNotes(notes, { stakeholderId: 'stk-ana' })).toHaveLength(1);
  });

  it('lista as etiquetas com a contagem, mais usadas primeiro', () => {
    expect(allTags(build())).toEqual([
      { tag: 'prazo', count: 2 },
      { tag: 'dinheiro', count: 1 },
      { tag: 'risco', count: 1 }
    ]);
  });
});

describe('promoteToDecision', () => {
  it('registra a anotação no Decision Log e guarda a ligação', () => {
    const stk = addStakeholder(projectId, { name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto' })!;
    const note = addNote(projectId, { text: 'Adiar o lançamento\nO time pediu mais duas semanas.', stakeholderId: stk.id })!;

    const entry = promoteToDecision(projectId, note.id)!;

    expect(entry).toMatchObject({ decision: 'Adiar o lançamento', context: 'Adiar o lançamento\nO time pediu mais duas semanas.', driver: 'Ana', status: 'approved' });
    expect(load().decisionLog).toEqual([entry]);
    expect(load().notes![0].decisionId).toBe(entry.id);
  });

  it('sem stakeholder, o motivador é a própria anotação', () => {
    const note = addNote(projectId, { text: 'Cortar o módulo de relatórios' })!;

    expect(promoteToDecision(projectId, note.id)!.driver).toBe('Anotação do PO');
  });

  it('promover de novo devolve a mesma decisão, sem duplicar', () => {
    const note = addNote(projectId, { text: 'Cortar o módulo' })!;

    const first = promoteToDecision(projectId, note.id)!;
    const second = promoteToDecision(projectId, note.id)!;

    expect(second.id).toBe(first.id);
    expect(load().decisionLog).toHaveLength(1);
  });

  it('anotação inexistente devolve undefined', () => {
    expect(promoteToDecision(projectId, 'nao-existe')).toBeUndefined();
  });
});

describe('promoteToStory', () => {
  it('cria a história no épico "Anotações do projeto" e liga a anotação a ela', () => {
    const note = addNote(projectId, { text: 'Exportar o relatório em PDF\nPara mandar ao diretor.' })!;

    const story = promoteToStory(projectId, note.id)!;

    const epic = load().epics.find(e => e.title === 'Anotações do projeto')!;
    expect(epic.features).toHaveLength(1);
    expect(epic.features[0].userStories).toEqual([story]);
    expect(story).toMatchObject({ title: 'Exportar o relatório em PDF', iWantTo: 'Exportar o relatório em PDF\nPara mandar ao diretor.', featureId: epic.features[0].id });
    expect(load().notes![0].storyId).toBe(story.id);
  });

  it('várias anotações vão para o mesmo épico', () => {
    promoteToStory(projectId, addNote(projectId, { text: 'Ideia um' })!.id);
    promoteToStory(projectId, addNote(projectId, { text: 'Ideia dois' })!.id);

    const epics = load().epics.filter(e => e.title === 'Anotações do projeto');
    expect(epics).toHaveLength(1);
    expect(epics[0].features[0].userStories).toHaveLength(2);
  });

  it('promover de novo devolve a mesma história, sem duplicar', () => {
    const note = addNote(projectId, { text: 'Ideia' })!;

    const first = promoteToStory(projectId, note.id)!;
    const second = promoteToStory(projectId, note.id)!;

    expect(second.id).toBe(first.id);
    expect(load().epics.flatMap(e => e.features).flatMap(f => f.userStories)).toHaveLength(1);
  });

  it('título longo é cortado em 80 caracteres', () => {
    const note = addNote(projectId, { text: 'a'.repeat(120) })!;

    expect(promoteToStory(projectId, note.id)!.title).toHaveLength(80);
  });

  it('anotação inexistente devolve undefined', () => {
    expect(promoteToStory(projectId, 'nao-existe')).toBeUndefined();
  });
});
