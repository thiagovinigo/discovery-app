import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import {
  addStakeholder,
  groupByQuadrant,
  parseStakeholderLines,
  quadrantOf,
  removeStakeholder,
  setCurrentSpeaker,
  setSessionParticipants,
  stakeholderName,
  updateStakeholder
} from './stakeholderService';
import { appendSegment } from './sessionService';
import type { Stakeholder, TranscriptSegment } from '../types/discovery';

let projectId: string;

const stored = () => storageService.getAllProjects().find(p => p.id === projectId)!;
const base = { name: 'Ana Souza', role: 'decisor' as const, interest: 'alto' as const, influence: 'alto' as const };

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', '').id;
});

describe('addStakeholder', () => {
  it('guarda o stakeholder com id e data, sem espaços sobrando no nome', () => {
    const created = addStakeholder(projectId, { ...base, name: '  Ana Souza  ', organization: 'Clínica X' });

    expect(created?.id).toMatch(/^stk-/);
    expect(created?.name).toBe('Ana Souza');
    expect(Number.isNaN(Date.parse(created!.createdAt))).toBe(false);
    expect(stored().stakeholders).toEqual([created]);
  });

  it('recusa nome vazio', () => {
    expect(() => addStakeholder(projectId, { ...base, name: '   ' })).toThrow('nome');
    expect(stored().stakeholders).toEqual([]);
  });

  it('devolve undefined quando o projeto não existe', () => {
    expect(addStakeholder('nao-existe', base)).toBeUndefined();
  });

  it('dois stakeholders com o mesmo nome continuam distintos (ids diferentes)', () => {
    const a = addStakeholder(projectId, base)!;
    const b = addStakeholder(projectId, base)!;

    expect(a.id).not.toBe(b.id);
    expect(stored().stakeholders).toHaveLength(2);
  });
});

describe('updateStakeholder', () => {
  it('altera só os campos informados e mantém id e data', () => {
    const created = addStakeholder(projectId, { ...base, organization: 'Clínica X' })!;

    const updated = updateStakeholder(projectId, created.id, { influence: 'baixo', notes: 'Prefere e-mail' });

    expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, organization: 'Clínica X', influence: 'baixo', notes: 'Prefere e-mail' });
  });

  it('recusa trocar o nome por vazio', () => {
    const created = addStakeholder(projectId, base)!;

    expect(() => updateStakeholder(projectId, created.id, { name: '' })).toThrow('nome');
    expect(stored().stakeholders![0].name).toBe('Ana Souza');
  });

  it('devolve undefined para um stakeholder que não existe', () => {
    expect(updateStakeholder(projectId, 'stk-x', { notes: 'x' })).toBeUndefined();
  });
});

describe('removeStakeholder', () => {
  it('remove o stakeholder e limpa as ligações com reuniões, agenda e anotações', () => {
    const ana = addStakeholder(projectId, base)!;
    const bia = addStakeholder(projectId, { ...base, name: 'Bia' })!;
    const session = storageService.createNewSession(projectId, 'Entrevista');
    setSessionParticipants(projectId, session.id, [ana.id, bia.id]);
    setCurrentSpeaker(projectId, session.id, ana.id);
    storageService.updateProject(projectId, p => ({
      ...p,
      scheduledMeetings: [{ id: 'm1', title: 'R', type: 'discovery', startsAt: '2026-11-01T10:00:00.000Z', objective: '', agenda: [], participantIds: [ana.id, bia.id], status: 'scheduled', createdAt: 'x' }],
      notes: [{ id: 'n1', text: 'nota', tags: [], stakeholderId: ana.id, createdAt: 'x', updatedAt: 'x' }]
    }));

    expect(removeStakeholder(projectId, ana.id)).toBe(true);

    const project = stored();
    expect(project.stakeholders!.map(s => s.id)).toEqual([bia.id]);
    expect(project.sessions[0].participantIds).toEqual([bia.id]);
    expect(project.sessions[0].currentSpeakerId).toBeUndefined();
    expect(project.scheduledMeetings![0].participantIds).toEqual([bia.id]);
    expect(project.notes![0].stakeholderId).toBeUndefined();
    expect(project.notes![0].text).toBe('nota');
  });

  it('devolve false para um stakeholder que não existe', () => {
    expect(removeStakeholder(projectId, 'stk-x')).toBe(false);
  });
});

describe('matriz interesse × influência', () => {
  const s = (interest: Stakeholder['interest'], influence: Stakeholder['influence']) => ({ interest, influence });

  it('classifica nos 4 quadrantes; "médio" conta como alto', () => {
    expect(quadrantOf(s('alto', 'alto'))).toBe('gerenciar_de_perto');
    expect(quadrantOf(s('medio', 'medio'))).toBe('gerenciar_de_perto');
    expect(quadrantOf(s('baixo', 'alto'))).toBe('manter_satisfeito');
    expect(quadrantOf(s('alto', 'baixo'))).toBe('manter_informado');
    expect(quadrantOf(s('baixo', 'baixo'))).toBe('monitorar');
  });

  it('agrupa a lista por quadrante, mantendo a ordem', () => {
    const list = [
      { ...base, id: '1', name: 'A', createdAt: 'x', interest: 'alto', influence: 'alto' },
      { ...base, id: '2', name: 'B', createdAt: 'x', interest: 'baixo', influence: 'baixo' },
      { ...base, id: '3', name: 'C', createdAt: 'x', interest: 'alto', influence: 'alto' }
    ] as Stakeholder[];

    const groups = groupByQuadrant(list);

    expect(groups.gerenciar_de_perto.map(x => x.name)).toEqual(['A', 'C']);
    expect(groups.monitorar.map(x => x.name)).toEqual(['B']);
    expect(groups.manter_satisfeito).toEqual([]);
    expect(groups.manter_informado).toEqual([]);
  });
});

describe('parseStakeholderLines', () => {
  it('lê "nome — papel — organização" e variações de separador', () => {
    const parsed = parseStakeholderLines([
      'Ana Souza — decisora — Clínica X',
      'Bruno - patrocinador - Hospital Y',
      'Carla, especialista, Laboratório Z',
      '- Davi; usuário; Recepção'
    ].join('\n'));

    expect(parsed.map(p => [p.name, p.role, p.organization])).toEqual([
      ['Ana Souza', 'decisor', 'Clínica X'],
      ['Bruno', 'patrocinador', 'Hospital Y'],
      ['Carla', 'especialista', 'Laboratório Z'],
      ['Davi', 'usuario', 'Recepção']
    ]);
  });

  it('linha só com o nome vira papel "outro" e nível médio; linhas vazias são ignoradas', () => {
    const parsed = parseStakeholderLines('\n  Edu  \n\n');

    expect(parsed).toEqual([{ name: 'Edu', role: 'outro', interest: 'medio', influence: 'medio' }]);
  });

  it('papel desconhecido vira "outro" e a descrição não se perde', () => {
    const [only] = parseStakeholderLines('Fabi — enfermeira chefe — Hospital Y');

    expect(only).toMatchObject({ name: 'Fabi', role: 'outro', jobTitle: 'enfermeira chefe', organization: 'Hospital Y' });
  });
});

describe('participantes e quem está falando', () => {
  it('setSessionParticipants grava só ids de stakeholders que existem', () => {
    const ana = addStakeholder(projectId, base)!;
    const session = storageService.createNewSession(projectId, 'R');

    setSessionParticipants(projectId, session.id, [ana.id, 'stk-fantasma']);

    expect(stored().sessions[0].participantIds).toEqual([ana.id]);
  });

  it('a fala de "Usuário / Stakeholder" leva o id de quem está falando', () => {
    const ana = addStakeholder(projectId, base)!;
    const session = storageService.createNewSession(projectId, 'R');
    setCurrentSpeaker(projectId, session.id, ana.id);

    const seg = (id: string, speaker: TranscriptSegment['speaker']): TranscriptSegment => ({ id, speaker, text: id, timestamp: '00:00', isFinal: true });
    appendSegment(projectId, session.id, seg('a', 'Usuário / Stakeholder'));
    appendSegment(projectId, session.id, seg('b', 'Entrevistador (PM)'));

    const [a, b] = stored().sessions[0].rawTranscript;
    expect(a.speakerStakeholderId).toBe(ana.id);
    expect(b.speakerStakeholderId).toBeUndefined();
  });

  it('stakeholderName resolve o nome pelo id e devolve undefined se não existir', () => {
    const ana = addStakeholder(projectId, base)!;

    expect(stakeholderName(stored(), ana.id)).toBe('Ana Souza');
    expect(stakeholderName(stored(), 'stk-x')).toBeUndefined();
    expect(stakeholderName(stored(), undefined)).toBeUndefined();
  });
});
