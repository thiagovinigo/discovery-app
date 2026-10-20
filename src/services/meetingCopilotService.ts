import { storageService } from './storageService';
import { addNote, updateNote } from './noteService';
import { INTERVIEW_STEPS, stepAnswered } from './interviewService';
import type { DiscoveryProject, MeetingSession, MeetingType, ProjectNote } from '../types/discovery';

export interface ClosingAnswers {
  clear: string;
  open: string;
  nextAction: string;
}

const MAX_GAPS = 3;
const MAX_PENDING_QUESTIONS = 3;
const MAX_TYPE_ITEMS = 3;
const MAX_AGENDA_ITEMS = 8;
const CLOSING_TAG = 'fechamento';

export const CLOSING_QUESTIONS: { key: keyof ClosingAnswers; label: string }[] = [
  { key: 'clear', label: 'O que ficou claro?' },
  { key: 'open', label: 'O que ficou em aberto?' },
  { key: 'nextAction', label: 'Qual é a próxima ação e quem cuida dela?' }
];

const typeItems = (project: DiscoveryProject, type: MeetingType): string[] => {
  switch (type) {
    case 'discovery':
      return ['Pedir um caso concreto do último episódio (Mom Test), e não opiniões'];
    case 'interview':
      return ['Separar exemplos reais para ilustrar cada resposta'];
    case 'alignment':
      return project.decisionLog
        .filter(d => d.status === 'revisiting')
        .slice(0, MAX_TYPE_ITEMS)
        .map(d => `Revisar decisão: ${d.decision}`);
    case 'refinement':
      return project.epics
        .flatMap(e => e.features)
        .flatMap(f => f.userStories)
        .filter(s => s.acceptanceCriteria.length === 0)
        .slice(0, MAX_TYPE_ITEMS)
        .map(s => `Detalhar critérios de aceite: ${s.title}`);
  }
};

/**
 * Sugere a pauta a partir do que ainda falta saber: pontos da entrevista do PRD sem resposta, perguntas de reuniões
 * anteriores que ficaram sem ser feitas e itens próprios do tipo da conversa. Regras locais, sem IA.
 */
export function buildAgenda(project: DiscoveryProject, type: MeetingType): string[] {
  const gaps = INTERVIEW_STEPS
    .filter(step => !stepAnswered(project, step))
    .slice(0, MAX_GAPS)
    .map(step => `${step.title}: ${step.question}`);

  const pending = project.sessions
    .flatMap(s => s.liveQuestions)
    .filter(q => !q.asked)
    .map(q => `Retomar: ${q.question}`);

  const items = [...gaps, ...[...new Set(pending)].slice(0, MAX_PENDING_QUESTIONS), ...typeItems(project, type)];
  return [...new Set(items)].slice(0, MAX_AGENDA_ITEMS);
}

/** Texto do fechamento, só com as perguntas que foram respondidas. */
export function closingNoteText(session: Pick<MeetingSession, 'title'>, answers: ClosingAnswers): string {
  const lines = [`Fechamento: ${session.title}`];
  const sections: [string, string][] = [
    ['O que ficou claro', answers.clear],
    ['O que ficou em aberto', answers.open],
    ['Próxima ação', answers.nextAction]
  ];
  for (const [label, value] of sections) {
    if (value.trim()) lines.push(`${label}: ${value.trim()}`);
  }
  return lines.join('\n');
}

/** A anotação de fechamento desta sala, se já existir. */
export function closingOf(notes: ProjectNote[], sessionId: string): ProjectNote | undefined {
  return notes.find(n => n.sessionId === sessionId && n.tags.includes(CLOSING_TAG));
}

/** Guarda o fechamento como anotação etiquetada e ligada à sala; fechar de novo atualiza a mesma anotação. */
export function saveClosing(projectId: string, session: MeetingSession, answers: ClosingAnswers): ProjectNote | undefined {
  if (!answers.clear.trim() && !answers.open.trim() && !answers.nextAction.trim()) {
    throw new Error('Responda ao menos uma pergunta do fechamento.');
  }
  const text = closingNoteText(session, answers);
  const notes = storageService.getAllProjects().find(p => p.id === projectId)?.notes ?? [];
  const existing = closingOf(notes, session.id);
  return existing
    ? updateNote(projectId, existing.id, { text })
    : addNote(projectId, { text, tags: [CLOSING_TAG], sessionId: session.id });
}
