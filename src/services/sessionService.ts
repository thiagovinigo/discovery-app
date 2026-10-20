import { storageService } from './storageService';
import type { AnalysisResponse } from './geminiService';
import { syncMindMap } from './mindMapService';
import { suggestTopicQuestions } from './topicService';
import type { DiscoveryProject, MeetingSession, TranscriptSegment } from '../types/discovery';

/**
 * Atualiza uma sessão lendo sempre o estado mais recente do storage. Assim, callbacks de longa
 * duração (captura de áudio, resposta da IA) nunca gravam em cima de uma cópia desatualizada.
 * Devolve `undefined` se o projeto ou a sessão não existirem.
 */
function updateSession(
  projectId: string,
  sessionId: string,
  update: (session: MeetingSession, project: DiscoveryProject) => MeetingSession
): DiscoveryProject | undefined {
  const project = storageService.getAllProjects().find(p => p.id === projectId);
  if (!project || !project.sessions.some(s => s.id === sessionId)) return undefined;
  return storageService.updateProject(projectId, p => ({
    ...p,
    sessions: p.sessions.map(s => (s.id === sessionId ? update(s, p) : s))
  }));
}

const normalize = (text: string): string => text.toLowerCase().trim();

/** A fala do entrevistado leva o id de quem a sala marcou como "falando agora", se houver. */
function withSpeaker(segment: TranscriptSegment, session: MeetingSession): TranscriptSegment {
  const isInterviewee = segment.speaker === 'Usuário / Stakeholder';
  if (!isInterviewee || !session.currentSpeakerId || segment.speakerStakeholderId) return segment;
  return { ...segment, speakerStakeholderId: session.currentSpeakerId };
}

/** Mescla o resultado de uma análise ao vivo na sessão, ignorando itens repetidos. */
function mergeAnalysis(session: MeetingSession, project: DiscoveryProject, analysis: AnalysisResponse): MeetingSession {
  const mindMapNodes = [...session.mindMapNodes];
  for (const node of analysis.newMindMapNodes) {
    if (mindMapNodes.some(n => normalize(n.label) === normalize(node.label))) continue;
    mindMapNodes.push(node);
  }

  const userFlowSteps = [...session.userFlowSteps];
  for (const step of analysis.newUserFlowSteps) {
    if (userFlowSteps.some(s => normalize(s.title) === normalize(step.title))) continue;
    userFlowSteps.push({ ...step, stepNumber: userFlowSteps.length + 1 });
  }

  const knownQuestions = new Set(session.liveQuestions.map(q => normalize(q.question)));
  const freshQuestions = analysis.newQuestions.filter(q => !knownQuestions.has(normalize(q.question)));

  const knownPains = new Set(session.painPoints.map(p => normalize(p.description)));
  const freshPains = analysis.newPainPoints.filter(p => !knownPains.has(normalize(p.description)));

  const knownJobs = new Set(session.jtbds.map(j => normalize(j.job)));
  const freshJobs = analysis.newJtbds.filter(j => !knownJobs.has(normalize(j.job)));

  const merged: MeetingSession = {
    ...session,
    liveQuestions: [...freshQuestions, ...session.liveQuestions],
    painPoints: [...session.painPoints, ...freshPains],
    jtbds: [...session.jtbds, ...freshJobs],
    mindMapNodes,
    userFlowSteps
  };
  // Perguntas pelo que a conversa ainda não respondeu, em cada assunto que ela já tem
  const withQuestions: MeetingSession = {
    ...merged,
    liveQuestions: [...suggestTopicQuestions(merged), ...merged.liveQuestions]
  };
  return syncMindMap(withQuestions, project.name, project.stakeholders ?? []);
}

/** Refaz o mapa mental com o que a sessão tem agora (transcrição, dores, JTBDs), sem chamar IA. */
export function refreshMindMap(projectId: string, sessionId: string): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, (s, p) => syncMindMap(s, p.name, p.stakeholders ?? []));
}

/** Edições do usuário no mapa: renomear, acrescentar e apagar nós. Valem mesmo quando a análise refaz o mapa. */
export function editMindMap(
  projectId: string,
  sessionId: string,
  edit: (session: MeetingSession) => MeetingSession
): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, s => edit(s));
}

/**
 * Projeto ativo e a sessão em andamento dele, lidos do storage. Quando nenhuma sessão está marcada como ativa,
 * vale a primeira. Devolve `null` se não há projeto ou se o projeto ainda não tem sessões.
 */
export function getActiveSessionContext(): { project: DiscoveryProject; session: MeetingSession } | null {
  const project = storageService.getActiveProject();
  if (!project) return null;
  const session = project.sessions.find(s => s.id === project.activeSessionId) || project.sessions[0];
  return session ? { project, session } : null;
}

/** Acrescenta várias falas, em ordem, ao fim da transcrição da sessão e persiste. */
export function appendSegments(
  projectId: string,
  sessionId: string,
  segments: TranscriptSegment[]
): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, s => ({
    ...s,
    rawTranscript: [...s.rawTranscript, ...segments.map(seg => withSpeaker(seg, s))]
  }));
}

/** Acrescenta uma fala ao fim da transcrição da sessão e persiste. */
export function appendSegment(
  projectId: string,
  sessionId: string,
  segment: TranscriptSegment
): DiscoveryProject | undefined {
  return appendSegments(projectId, sessionId, [segment]);
}

/** Marca uma pergunta do prompter como já feita. */
export function markQuestionAsked(
  projectId: string,
  sessionId: string,
  questionId: string
): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, s => ({
    ...s,
    liveQuestions: s.liveQuestions.map(q => (q.id === questionId ? { ...q, asked: true } : q))
  }));
}

/** Aplica o resultado de uma análise ao vivo sem tocar na transcrição, que pode ter crescido enquanto a IA respondia. */
export function applyLiveAnalysis(
  projectId: string,
  sessionId: string,
  analysis: AnalysisResponse
): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, (s, p) => mergeAnalysis(s, p, analysis));
}
