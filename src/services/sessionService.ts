import { storageService } from './storageService';
import type { AnalysisResponse } from './geminiService';
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

/** Mescla o resultado de uma análise ao vivo na sessão, ignorando itens repetidos. */
function mergeAnalysis(session: MeetingSession, projectName: string, analysis: AnalysisResponse): MeetingSession {
  const mindMapNodes = [...session.mindMapNodes];
  let root = mindMapNodes.find(n => n.type === 'root');
  if (!root) {
    root = {
      id: 'm-root',
      label: session.title || projectName || 'Objetivo do Discovery',
      type: 'root',
      x: 400,
      y: 250,
      color: '#6366f1'
    };
    mindMapNodes.unshift(root);
  }
  const rootId = root.id;
  const mindMapEdges = [...session.mindMapEdges];
  for (const node of analysis.newMindMapNodes) {
    if (mindMapNodes.some(n => normalize(n.label) === normalize(node.label))) continue;
    mindMapNodes.push(node);
    mindMapEdges.push({
      id: 'edge-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      source: rootId,
      target: node.id
    });
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

  return {
    ...session,
    liveQuestions: [...freshQuestions, ...session.liveQuestions],
    painPoints: [...session.painPoints, ...freshPains],
    jtbds: [...session.jtbds, ...freshJobs],
    mindMapNodes,
    mindMapEdges,
    userFlowSteps
  };
}

/** Acrescenta uma fala ao fim da transcrição da sessão e persiste. */
export function appendSegment(
  projectId: string,
  sessionId: string,
  segment: TranscriptSegment
): DiscoveryProject | undefined {
  return updateSession(projectId, sessionId, s => ({ ...s, rawTranscript: [...s.rawTranscript, segment] }));
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
  return updateSession(projectId, sessionId, (s, p) => mergeAnalysis(s, p.name, analysis));
}
