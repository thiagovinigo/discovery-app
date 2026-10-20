import { storageService } from './storageService';
import { parseListAnswer } from './interviewService';
import { newId } from './ids';
import type { DiscoveryProject, MeetingSession, MeetingType, ScheduledMeeting } from '../types/discovery';

export interface MeetingInput {
  title: string;
  type: MeetingType;
  /** Data e hora marcadas. Aceita o valor de um campo `datetime-local` ("2026-03-10T14:00") ou ISO-8601. */
  startsAt: string;
  objective?: string;
  agenda?: string[];
  participantIds?: string[];
}

/** Pauta digitada: um item por linha, sem marcadores, vazios nem repetidos. */
export const parseAgenda = parseListAnswer;

const requireTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Informe o título da reunião.');
  return trimmed;
};

const toIso = (startsAt: string): string => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) throw new Error('Informe uma data e hora válidas.');
  return date.toISOString();
};

const knownParticipants = (project: DiscoveryProject, ids: string[]): string[] => {
  const known = new Set((project.stakeholders ?? []).map(s => s.id));
  return ids.filter(id => known.has(id));
};

const loadProject = (projectId: string): DiscoveryProject | undefined =>
  storageService.getAllProjects().find(p => p.id === projectId);

const findMeeting = (project: DiscoveryProject | undefined, meetingId: string): ScheduledMeeting | undefined =>
  project?.scheduledMeetings?.find(m => m.id === meetingId);

/** Marca uma reunião futura. Lança erro sem título ou com data inválida; `undefined` se o projeto não existir. */
export function scheduleMeeting(projectId: string, input: MeetingInput): ScheduledMeeting | undefined {
  const project = loadProject(projectId);
  if (!project) return undefined;

  const meeting: ScheduledMeeting = {
    id: newId('meet'),
    title: requireTitle(input.title),
    type: input.type,
    startsAt: toIso(input.startsAt),
    objective: (input.objective ?? '').trim(),
    agenda: input.agenda ?? [],
    participantIds: knownParticipants(project, input.participantIds ?? []),
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  storageService.updateProject(projectId, p => ({ ...p, scheduledMeetings: [...(p.scheduledMeetings ?? []), meeting] }));
  return meeting;
}

/** Altera só o que foi informado, e só enquanto a reunião está agendada. `undefined` se não puder editar. */
export function updateMeeting(projectId: string, meetingId: string, changes: Partial<MeetingInput>): ScheduledMeeting | undefined {
  const project = loadProject(projectId);
  const current = findMeeting(project, meetingId);
  if (!project || !current || current.status !== 'scheduled') return undefined;

  const next: ScheduledMeeting = {
    ...current,
    ...(changes.title === undefined ? {} : { title: requireTitle(changes.title) }),
    ...(changes.type === undefined ? {} : { type: changes.type }),
    ...(changes.startsAt === undefined ? {} : { startsAt: toIso(changes.startsAt) }),
    ...(changes.objective === undefined ? {} : { objective: changes.objective.trim() }),
    ...(changes.agenda === undefined ? {} : { agenda: changes.agenda }),
    ...(changes.participantIds === undefined ? {} : { participantIds: knownParticipants(project, changes.participantIds) })
  };
  storageService.updateProject(projectId, p => ({
    ...p,
    scheduledMeetings: (p.scheduledMeetings ?? []).map(m => (m.id === meetingId ? next : m))
  }));
  return next;
}

/** Cancela uma reunião ainda agendada. */
export function cancelMeeting(projectId: string, meetingId: string): boolean {
  if (findMeeting(loadProject(projectId), meetingId)?.status !== 'scheduled') return false;
  storageService.updateProject(projectId, p => ({
    ...p,
    scheduledMeetings: (p.scheduledMeetings ?? []).map(m => (m.id === meetingId ? { ...m, status: 'cancelled' as const } : m))
  }));
  return true;
}

export function removeMeeting(projectId: string, meetingId: string): boolean {
  if (!findMeeting(loadProject(projectId), meetingId)) return false;
  storageService.updateProject(projectId, p => ({
    ...p,
    scheduledMeetings: (p.scheduledMeetings ?? []).filter(m => m.id !== meetingId)
  }));
  return true;
}

/** Próximas = ainda agendadas, da mais cedo para a mais tarde. Passadas = iniciadas ou canceladas, da mais recente para a mais antiga. */
export function splitMeetings(meetings: ScheduledMeeting[]): { upcoming: ScheduledMeeting[]; past: ScheduledMeeting[] } {
  const byDate = (a: ScheduledMeeting, b: ScheduledMeeting) => a.startsAt.localeCompare(b.startsAt);
  return {
    upcoming: meetings.filter(m => m.status === 'scheduled').sort(byDate),
    past: meetings.filter(m => m.status !== 'scheduled').sort((a, b) => byDate(b, a))
  };
}

/** Ainda agendada, mas a data já passou. */
export function isOverdue(meeting: ScheduledMeeting, now: Date = new Date()): boolean {
  return meeting.status === 'scheduled' && new Date(meeting.startsAt).getTime() < now.getTime();
}

/**
 * Abre a sala a partir da reunião agendada, já com título, tipo, participantes, objetivo e pauta, e a deixa ativa.
 * Iniciar de novo devolve a mesma sala. Reunião cancelada ou inexistente devolve `undefined`.
 */
export function startMeeting(projectId: string, meetingId: string): MeetingSession | undefined {
  const project = loadProject(projectId);
  const meeting = findMeeting(project, meetingId);
  if (!project || !meeting || meeting.status === 'cancelled') return undefined;

  if (meeting.status === 'started') {
    const existing = project.sessions.find(s => s.id === meeting.sessionId);
    if (existing) return existing;
  }

  const names = (project.stakeholders ?? []).filter(s => meeting.participantIds.includes(s.id)).map(s => s.name);
  const created = storageService.createNewSession(projectId, meeting.title, names);
  const session: MeetingSession = {
    ...created,
    type: meeting.type,
    participantIds: meeting.participantIds,
    scheduledMeetingId: meeting.id,
    objective: meeting.objective,
    agenda: meeting.agenda
  };

  storageService.updateProject(projectId, p => ({
    ...p,
    sessions: p.sessions.map(s => (s.id === session.id ? session : s)),
    scheduledMeetings: (p.scheduledMeetings ?? []).map(m =>
      m.id === meetingId ? { ...m, status: 'started' as const, sessionId: session.id } : m
    )
  }));
  return session;
}
