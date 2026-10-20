import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import { addStakeholder, removeStakeholder } from './stakeholderService';
import {
  cancelMeeting,
  isOverdue,
  parseAgenda,
  removeMeeting,
  scheduleMeeting,
  splitMeetings,
  startMeeting,
  updateMeeting
} from './meetingService';
import type { DiscoveryProject, ScheduledMeeting } from '../types/discovery';

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;
const person = (name: string) => addStakeholder(projectId, { name, role: 'usuario', interest: 'alto', influence: 'medio' })!;

const base = { title: 'Alinhamento com o time', type: 'alignment' as const, startsAt: '2026-03-10T14:00' };

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('parseAgenda', () => {
  it('uma pauta por linha, sem marcadores, vazios nem repetidos', () => {
    expect(parseAgenda('- Prazo\n• Orçamento\n\nprazo')).toEqual(['Prazo', 'Orçamento']);
  });
});

describe('scheduleMeeting', () => {
  it('guarda a reunião como agendada, com a data em ISO-8601 e a pauta', () => {
    const meeting = scheduleMeeting(projectId, { ...base, objective: ' Fechar o escopo ', agenda: ['Prazo', 'Orçamento'] })!;

    expect(meeting).toMatchObject({
      title: 'Alinhamento com o time', type: 'alignment', objective: 'Fechar o escopo', agenda: ['Prazo', 'Orçamento'], participantIds: [], status: 'scheduled'
    });
    expect(meeting.id.startsWith('meet-')).toBe(true);
    expect(meeting.startsAt).toBe(new Date('2026-03-10T14:00').toISOString());
    expect(load().scheduledMeetings).toEqual([meeting]);
  });

  it('descarta participantes que não são stakeholders do projeto', () => {
    const ana = person('Ana');

    const meeting = scheduleMeeting(projectId, { ...base, participantIds: [ana.id, 'fantasma'] })!;

    expect(meeting.participantIds).toEqual([ana.id]);
  });

  it('recusa título vazio e data inválida; projeto inexistente devolve undefined', () => {
    expect(() => scheduleMeeting(projectId, { ...base, title: '  ' })).toThrow(/título/i);
    expect(() => scheduleMeeting(projectId, { ...base, startsAt: 'ontem' })).toThrow(/data/i);
    expect(scheduleMeeting('nao-existe', base)).toBeUndefined();
    expect(load().scheduledMeetings).toEqual([]);
  });
});

describe('updateMeeting / cancelMeeting / removeMeeting', () => {
  it('altera só o que foi informado enquanto a reunião está agendada', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    const updated = updateMeeting(projectId, meeting.id, { title: 'Novo título', agenda: ['Item'] })!;

    expect(updated).toMatchObject({ title: 'Novo título', agenda: ['Item'], type: 'alignment', startsAt: meeting.startsAt });
  });

  it('não deixa deixar o título vazio e não edita reunião inexistente', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    expect(() => updateMeeting(projectId, meeting.id, { title: ' ' })).toThrow(/título/i);
    expect(updateMeeting(projectId, 'nao-existe', { title: 'x' })).toBeUndefined();
  });

  it('cancelar marca como cancelada e só vale para reunião agendada', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    expect(cancelMeeting(projectId, meeting.id)).toBe(true);
    expect(load().scheduledMeetings![0].status).toBe('cancelled');
    expect(cancelMeeting(projectId, meeting.id)).toBe(false);
    expect(updateMeeting(projectId, meeting.id, { title: 'x' })).toBeUndefined();
  });

  it('remove a reunião da agenda', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    expect(removeMeeting(projectId, meeting.id)).toBe(true);
    expect(removeMeeting(projectId, meeting.id)).toBe(false);
    expect(load().scheduledMeetings).toEqual([]);
  });
});

describe('splitMeetings / isOverdue', () => {
  const meeting = (id: string, startsAt: string, status: ScheduledMeeting['status']): ScheduledMeeting => ({
    id, title: id, type: 'discovery', startsAt, objective: '', agenda: [], participantIds: [], status, createdAt: startsAt
  });

  it('separa as próximas (mais cedo primeiro) das passadas (mais recente primeiro)', () => {
    const { upcoming, past } = splitMeetings([
      meeting('b', '2026-05-02T10:00:00.000Z', 'scheduled'),
      meeting('a', '2026-05-01T10:00:00.000Z', 'scheduled'),
      meeting('x', '2026-04-01T10:00:00.000Z', 'started'),
      meeting('y', '2026-04-10T10:00:00.000Z', 'cancelled')
    ]);

    expect(upcoming.map(m => m.id)).toEqual(['a', 'b']);
    expect(past.map(m => m.id)).toEqual(['y', 'x']);
  });

  it('reunião agendada com data já passada está atrasada', () => {
    const now = new Date('2026-05-01T12:00:00.000Z');

    expect(isOverdue(meeting('a', '2026-05-01T10:00:00.000Z', 'scheduled'), now)).toBe(true);
    expect(isOverdue(meeting('b', '2026-05-01T13:00:00.000Z', 'scheduled'), now)).toBe(false);
    expect(isOverdue(meeting('c', '2026-05-01T10:00:00.000Z', 'started'), now)).toBe(false);
  });
});

describe('startMeeting', () => {
  it('abre a sala já com título, tipo, participantes, objetivo e pauta, e a deixa ativa', () => {
    const ana = person('Ana');
    const meeting = scheduleMeeting(projectId, { ...base, objective: 'Fechar o escopo', agenda: ['Prazo'], participantIds: [ana.id] })!;

    const session = startMeeting(projectId, meeting.id)!;

    expect(session).toMatchObject({
      title: 'Alinhamento com o time', type: 'alignment', participants: ['Ana'], participantIds: [ana.id],
      scheduledMeetingId: meeting.id, objective: 'Fechar o escopo', agenda: ['Prazo']
    });
    expect(load().activeSessionId).toBe(session.id);
    expect(load().sessions.find(s => s.id === session.id)).toEqual(session);
    expect(load().scheduledMeetings![0]).toMatchObject({ status: 'started', sessionId: session.id });
  });

  it('sem participantes, a sala usa os papéis padrão', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    expect(startMeeting(projectId, meeting.id)!.participants).toEqual(['Entrevistador (PM)', 'Usuário']);
  });

  it('iniciar de novo devolve a mesma sala, sem duplicar', () => {
    const meeting = scheduleMeeting(projectId, base)!;

    const first = startMeeting(projectId, meeting.id)!;
    const second = startMeeting(projectId, meeting.id)!;

    expect(second.id).toBe(first.id);
    expect(load().sessions).toHaveLength(1);
  });

  it('reunião cancelada ou inexistente não abre sala', () => {
    const meeting = scheduleMeeting(projectId, base)!;
    cancelMeeting(projectId, meeting.id);

    expect(startMeeting(projectId, meeting.id)).toBeUndefined();
    expect(startMeeting(projectId, 'nao-existe')).toBeUndefined();
    expect(load().sessions).toHaveLength(0);
  });

  it('remover o stakeholder depois tira a pessoa da reunião agendada', () => {
    const ana = person('Ana');
    const meeting = scheduleMeeting(projectId, { ...base, participantIds: [ana.id] })!;

    removeStakeholder(projectId, ana.id);

    expect(load().scheduledMeetings!.find(m => m.id === meeting.id)!.participantIds).toEqual([]);
  });
});
