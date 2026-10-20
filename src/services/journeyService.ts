import { newId } from './ids';
import { plain } from './knowledgeService';
import { shorten } from './mindMapService';
import type { MeetingSession, Stakeholder, TranscriptSegment, UserFlowStep } from '../types/discovery';

const DERIVED_PREFIX = 'jf-';
const INTERVIEWER: TranscriptSegment['speaker'] = 'Entrevistador (PM)';

/** Palavras que abrem um passo de uma sequência contada ("primeiro...", "depois...", "por fim..."). */
const SEQUENCE_START = /^(primeiro|primeiramente|antes de tudo|depois|logo depois|em seguida|a seguir|na sequencia|ai|entao|por fim|finalmente|no final|por ultimo)\b[\s,]*/;

const CRITICAL = /trava|quebra|erro|falha|demora|\bdias\b|perco|perdi|bloqueia|impossivel|retrabalho|prejuizo|multa|nunca funciona/;
const WARNING = /manual|na mao|planilha|confer|copio|\bcolo\b|\bcole\b|repito|lento|\bhoras?\b|dificil|confus|gambiarra/;

type Friction = UserFlowStep['frictionLevel'];

function frictionOf(text: string): Friction {
  const t = plain(text);
  if (CRITICAL.test(t)) return 'critical';
  return WARNING.test(t) ? 'warning' : 'smooth';
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Tira o marcador de sequência e o "eu" do começo, para sobrar a ação. */
function actionOf(sentence: string): string {
  const withoutMarker = sentence.replace(/^\s*(primeiramente|primeiro|antes de tudo|logo depois|depois|em seguida|a seguir|na sequência|aí|ai|então|entao|por fim|finalmente|no final|por último)\b[\s,]*/i, '');
  return capitalize(withoutMarker.replace(/^eu\s+/i, '').replace(/[.!?]+$/, '').trim());
}

/**
 * A sequência que o entrevistado contou, passo a passo, a partir das frases que começam com "primeiro", "depois",
 * "em seguida", "por fim" e parecidos. A fricção de cada etapa vem do que a pessoa disse sobre ela. Sem esses
 * marcadores não há jornada para tirar: inventar etapas seria pior do que mostrar vazio.
 */
export function extractJourney(session: MeetingSession, stakeholders: Stakeholder[] = []): UserFlowStep[] {
  const steps: UserFlowStep[] = [];
  for (const segment of session.rawTranscript) {
    if (segment.speaker === INTERVIEWER || !segment.text.trim()) continue;
    const actor = stakeholders.find(s => s.id === segment.speakerStakeholderId)?.name ?? 'Entrevistado';
    segment.text.split(/(?<=[.!?])\s+/).forEach((sentence, index) => {
      if (!SEQUENCE_START.test(plain(sentence).trim())) return;
      const title = shorten(actionOf(sentence));
      if (!title) return;
      const friction = frictionOf(sentence);
      steps.push({
        id: `${DERIVED_PREFIX}${segment.id}-${index}`,
        stepNumber: steps.length + 1,
        title,
        actor,
        systemAction: '',
        frictionLevel: friction,
        painPointDetected: friction === 'smooth' ? undefined : sentence.trim().replace(/[.!?]+$/, ''),
        quote: sentence.trim()
      });
    });
  }
  return steps;
}

const renumber = (steps: UserFlowStep[]): UserFlowStep[] => steps.map((s, i) => (s.stepNumber === i + 1 ? s : { ...s, stepNumber: i + 1 }));
const norm = (text: string): string => plain(text).trim();

/**
 * Junta a jornada da conversa com a que já existe: as etapas do usuário e as que a IA criou ficam, as que vieram da
 * conversa são refeitas, o que o usuário apagou não volta e rodar de novo não muda nada.
 */
export function syncJourney(session: MeetingSession, stakeholders: Stakeholder[] = []): MeetingSession {
  const hidden = new Set(session.userFlowHiddenIds ?? []);
  const derived = extractJourney(session, stakeholders).filter(s => !hidden.has(s.id));
  const fresh = new Map(derived.map(s => [s.id, s]));

  const kept: UserFlowStep[] = [];
  for (const step of session.userFlowSteps) {
    if (step.id.startsWith(DERIVED_PREFIX) && !step.manual) {
      const refreshed = fresh.get(step.id);
      if (refreshed) kept.push(refreshed);
    } else {
      kept.push(step);
    }
  }
  const have = new Set(kept.map(s => s.id));
  const titles = new Set(kept.map(s => norm(s.title)));
  for (const step of derived) {
    if (have.has(step.id) || titles.has(norm(step.title))) continue;
    kept.push(step);
    titles.add(norm(step.title));
  }
  return { ...session, userFlowSteps: renumber(kept) };
}

export type StepPatch = Partial<Omit<UserFlowStep, 'id' | 'stepNumber'>>;

/** Edita a etapa. Ela passa a ser sua: a análise não a sobrescreve mais. */
export function updateStep(session: MeetingSession, stepId: string, patch: StepPatch): MeetingSession {
  if (!session.userFlowSteps.some(s => s.id === stepId)) return session;
  if (patch.title !== undefined && !patch.title.trim()) return session;
  const next = { ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}) };
  return { ...session, userFlowSteps: session.userFlowSteps.map(s => (s.id === stepId ? { ...s, ...next, manual: true } : s)) };
}

export function addStep(session: MeetingSession, data: Pick<UserFlowStep, 'title' | 'actor' | 'frictionLevel'> & StepPatch): MeetingSession {
  const title = data.title.trim();
  if (!title) return session;
  const step: UserFlowStep = { systemAction: '', ...data, id: newId('step'), stepNumber: session.userFlowSteps.length + 1, title, manual: true };
  return { ...session, userFlowSteps: [...session.userFlowSteps, step] };
}

/** Apaga a etapa e renumera. Se veio da conversa, anota para a análise não trazê-la de volta. */
export function removeStep(session: MeetingSession, stepId: string): MeetingSession {
  if (!session.userFlowSteps.some(s => s.id === stepId)) return session;
  const hidden = stepId.startsWith(DERIVED_PREFIX) ? [...(session.userFlowHiddenIds ?? []), stepId] : session.userFlowHiddenIds;
  return {
    ...session,
    userFlowSteps: renumber(session.userFlowSteps.filter(s => s.id !== stepId)),
    ...(hidden ? { userFlowHiddenIds: hidden } : {})
  };
}

export function moveStep(session: MeetingSession, stepId: string, direction: 'up' | 'down'): MeetingSession {
  const index = session.userFlowSteps.findIndex(s => s.id === stepId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= session.userFlowSteps.length) return session;
  const steps = [...session.userFlowSteps];
  [steps[index], steps[target]] = [steps[target], steps[index]];
  return { ...session, userFlowSteps: renumber(steps) };
}
