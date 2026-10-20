import { storageService } from './storageService';
import { newId } from './ids';
import type { DiscoveryProject, Stakeholder, StakeholderLevel, StakeholderRole } from '../types/discovery';

export const ROLE_LABELS: Record<StakeholderRole, string> = {
  decisor: 'Decisor',
  patrocinador: 'Patrocinador',
  usuario: 'Usuário',
  especialista: 'Especialista',
  impactado: 'Impactado',
  outro: 'Outro'
};

export const LEVEL_LABELS: Record<StakeholderLevel, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto'
};

export type Quadrant = 'gerenciar_de_perto' | 'manter_satisfeito' | 'manter_informado' | 'monitorar';

export const QUADRANT_LABELS: Record<Quadrant, { title: string; hint: string }> = {
  gerenciar_de_perto: { title: 'Gerenciar de perto', hint: 'Muita influência e muito interesse: envolva nas decisões.' },
  manter_satisfeito: { title: 'Manter satisfeito', hint: 'Muita influência, pouco interesse: consulte nos marcos importantes.' },
  manter_informado: { title: 'Manter informado', hint: 'Pouca influência, muito interesse: mantenha atualizado e ouça.' },
  monitorar: { title: 'Monitorar', hint: 'Pouca influência e pouco interesse: acompanhe sem esforço extra.' }
};

export interface StakeholderInput {
  name: string;
  role: StakeholderRole;
  organization?: string;
  jobTitle?: string;
  interest: StakeholderLevel;
  influence: StakeholderLevel;
  contact?: string;
  notes?: string;
}

const requireName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Informe o nome do stakeholder.');
  return trimmed;
};

/** Cadastra um stakeholder no projeto. Lança erro se o nome estiver vazio; `undefined` se o projeto não existir. */
export function addStakeholder(projectId: string, input: StakeholderInput): Stakeholder | undefined {
  const created: Stakeholder = {
    ...input,
    id: newId('stk'),
    name: requireName(input.name),
    createdAt: new Date().toISOString()
  };
  const updated = storageService.updateProject(projectId, p => ({ ...p, stakeholders: [...(p.stakeholders ?? []), created] }));
  return updated ? created : undefined;
}

/** Altera só os campos informados. `undefined` se o projeto ou o stakeholder não existirem. */
export function updateStakeholder(projectId: string, stakeholderId: string, changes: Partial<StakeholderInput>): Stakeholder | undefined {
  const name = changes.name === undefined ? undefined : requireName(changes.name);
  let result: Stakeholder | undefined;
  storageService.updateProject(projectId, p => ({
    ...p,
    stakeholders: (p.stakeholders ?? []).map(s => {
      if (s.id !== stakeholderId) return s;
      result = { ...s, ...changes, ...(name === undefined ? {} : { name }) };
      return result;
    })
  }));
  return result;
}

/** Remove o stakeholder e as ligações dele com reuniões, agenda e anotações (as anotações continuam). */
export function removeStakeholder(projectId: string, stakeholderId: string): boolean {
  const current = storageService.getAllProjects().find(p => p.id === projectId);
  if (!current || !(current.stakeholders ?? []).some(s => s.id === stakeholderId)) return false;

  storageService.updateProject(projectId, p => ({
    ...p,
    stakeholders: (p.stakeholders ?? []).filter(s => s.id !== stakeholderId),
    sessions: p.sessions.map(s => ({
      ...s,
      participantIds: s.participantIds?.filter(id => id !== stakeholderId),
      currentSpeakerId: s.currentSpeakerId === stakeholderId ? undefined : s.currentSpeakerId
    })),
    scheduledMeetings: (p.scheduledMeetings ?? []).map(m => ({ ...m, participantIds: m.participantIds.filter(id => id !== stakeholderId) })),
    notes: (p.notes ?? []).map(n => (n.stakeholderId === stakeholderId ? { ...n, stakeholderId: undefined } : n))
  }));
  return true;
}

const isHigh = (level: StakeholderLevel): boolean => level !== 'baixo';

/** Quadrante da matriz interesse × influência. "Médio" conta como alto. */
export function quadrantOf(s: Pick<Stakeholder, 'interest' | 'influence'>): Quadrant {
  const influence = isHigh(s.influence);
  const interest = isHigh(s.interest);
  if (influence && interest) return 'gerenciar_de_perto';
  if (influence) return 'manter_satisfeito';
  if (interest) return 'manter_informado';
  return 'monitorar';
}

export function groupByQuadrant(stakeholders: Stakeholder[]): Record<Quadrant, Stakeholder[]> {
  const groups: Record<Quadrant, Stakeholder[]> = { gerenciar_de_perto: [], manter_satisfeito: [], manter_informado: [], monitorar: [] };
  for (const s of stakeholders) groups[quadrantOf(s)].push(s);
  return groups;
}

const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function roleFromText(text: string): StakeholderRole | undefined {
  const t = plain(text);
  if (t.includes('decis')) return 'decisor';
  if (t.includes('patrocin')) return 'patrocinador';
  if (t.includes('usuari')) return 'usuario';
  if (t.includes('especialista')) return 'especialista';
  if (t.includes('impactad')) return 'impactado';
  return undefined;
}

/**
 * Lê uma lista de pessoas, uma por linha: "Nome — papel — organização". Aceita os separadores "—", "-" (com
 * espaços), "," e ";", e marcadores no início da linha. Papel que não for reconhecido vira "outro" e o texto
 * é guardado como cargo.
 */
export function parseStakeholderLines(text: string): StakeholderInput[] {
  const result: StakeholderInput[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/^[-*•]\s+/, '');
    if (!line) continue;
    const [name, roleText, organization] = line.split(/\s+[—–-]\s+|\s*[;,]\s*/).map(part => part.trim());
    if (!name) continue;
    const role = roleText ? roleFromText(roleText) : undefined;
    result.push({
      name,
      role: role ?? 'outro',
      interest: 'medio',
      influence: 'medio',
      ...(roleText && !role ? { jobTitle: roleText } : {}),
      ...(organization ? { organization } : {})
    });
  }
  return result;
}

/** Define quem participa da reunião, ignorando ids que não são de stakeholders cadastrados. */
export function setSessionParticipants(projectId: string, sessionId: string, stakeholderIds: string[]): DiscoveryProject | undefined {
  return storageService.updateProject(projectId, p => {
    const known = new Set((p.stakeholders ?? []).map(s => s.id));
    return {
      ...p,
      sessions: p.sessions.map(s => (s.id === sessionId ? { ...s, participantIds: stakeholderIds.filter(id => known.has(id)) } : s))
    };
  });
}

/** Marca quem está falando agora; sem id (ou com id desconhecido), limpa a marcação. */
export function setCurrentSpeaker(projectId: string, sessionId: string, stakeholderId?: string): DiscoveryProject | undefined {
  return storageService.updateProject(projectId, p => {
    const speaker = (p.stakeholders ?? []).some(s => s.id === stakeholderId) ? stakeholderId : undefined;
    return { ...p, sessions: p.sessions.map(s => (s.id === sessionId ? { ...s, currentSpeakerId: speaker } : s)) };
  });
}

export function stakeholderName(project: DiscoveryProject, stakeholderId?: string): string | undefined {
  if (!stakeholderId) return undefined;
  return (project.stakeholders ?? []).find(s => s.id === stakeholderId)?.name;
}
