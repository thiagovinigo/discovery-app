import { planBacklogProposals } from './backlogProposals';
import type { Proposal } from './backlogProposals';
import { newId } from './ids';
import { plain, tokens } from './knowledgeService';
import { shorten } from './mindMapService';
import type {
  DiscoveryProject,
  Epic,
  Feature,
  MeetingSession,
  StoryMapCard,
  StoryMapRelease,
  UserFlowStep,
  UserStory
} from '../types/discovery';

const DERIVED_PREFIX = 'sm-';

export const RELEASE_LABELS: Record<StoryMapRelease, string> = {
  mvp: 'MVP (Agora)',
  next: 'Depois (Próximas entregas)'
};

function stepTerms(step: UserFlowStep): Set<string> {
  return new Set(tokens(`${step.title} ${step.painPointDetected ?? ''} ${step.opportunity ?? ''} ${step.quote ?? ''}`));
}

function bestStepFor(text: string, steps: UserFlowStep[]): UserFlowStep {
  const words = tokens(text);
  let best = steps[0];
  let bestScore = -1;

  for (const step of steps) {
    const terms = stepTerms(step);
    let score = words.filter(w => terms.has(w)).length * 10;
    if (step.frictionLevel === 'critical') score += 2;
    else if (step.frictionLevel === 'warning') score += 1;
    if (score > bestScore) {
      best = step;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Monta os cartões do User Story Mapping a partir da espinha (etapas da jornada),
 * alocando dores e JTBDs nas colunas correspondentes e separando em MVP vs Depois.
 */
export function extractStoryMap(session: MeetingSession): StoryMapCard[] {
  const steps = [...session.userFlowSteps].sort((a, b) => a.stepNumber - b.stepNumber);
  if (steps.length === 0) return [];

  const cards: StoryMapCard[] = [];
  const coveredStepIds = new Set<string>();

  for (const pain of session.painPoints) {
    const step = bestStepFor(`${pain.description} ${pain.quote ?? ''}`, steps);
    coveredStepIds.add(step.id);
    const release: StoryMapRelease = pain.severity === 'high' ? 'mvp' : 'next';
    cards.push({
      id: `${DERIVED_PREFIX}pain-${pain.id}`,
      stepId: step.id,
      title: shorten(`Resolver: ${pain.description}`),
      asA: step.actor || 'Usuário do processo',
      iWantTo: `eliminar o problema "${pain.description.slice(0, 90)}" na etapa "${step.title}"`,
      soThat: 'eu conclua esta etapa sem bloqueio ou retrabalho',
      release,
      quote: pain.quote ?? pain.description
    });
  }

  for (const jtbd of session.jtbds) {
    const step = bestStepFor(`${jtbd.context} ${jtbd.job} ${jtbd.outcome}`, steps);
    coveredStepIds.add(step.id);
    cards.push({
      id: `${DERIVED_PREFIX}jtbd-${jtbd.id}`,
      stepId: step.id,
      title: shorten(jtbd.job),
      asA: step.actor || 'Usuário do processo',
      iWantTo: jtbd.job,
      soThat: jtbd.outcome || 'alcançar o resultado esperado na etapa',
      release: 'mvp'
    });
  }

  for (const step of steps) {
    if (coveredStepIds.has(step.id) && !step.opportunity) continue;
    const release: StoryMapRelease = step.frictionLevel === 'smooth' ? 'next' : 'mvp';
    const actionText = step.opportunity?.trim() || step.painPointDetected?.trim() || step.title;
    cards.push({
      id: `${DERIVED_PREFIX}step-${step.id}`,
      stepId: step.id,
      title: shorten(step.opportunity?.trim() ? `Oportunidade: ${step.opportunity}` : `Fluxo: ${step.title}`),
      asA: step.actor || 'Usuário do processo',
      iWantTo: `executar "${step.title}" (${actionText.slice(0, 80)})`,
      soThat: 'a jornada avance com fluidez para o próximo passo',
      release,
      quote: step.quote
    });
  }

  return cards;
}

/**
 * Sincroniza o Story Map da sessão preservando cartões editados/criados pelo usuário (`manual: true`)
 * e respeitando os apagados (`storyMapHiddenIds`).
 */
export function syncStoryMap(session: MeetingSession): MeetingSession {
  const steps = session.userFlowSteps;
  if (steps.length === 0) {
    return session.storyMapCards?.length ? { ...session, storyMapCards: [] } : session;
  }

  const validStepIds = new Set(steps.map(s => s.id));
  const fallbackStepId = steps[0].id;
  const hidden = new Set(session.storyMapHiddenIds ?? []);
  const derived = extractStoryMap(session).filter(c => !hidden.has(c.id));
  const freshById = new Map(derived.map(c => [c.id, c]));

  const existing = session.storyMapCards ?? [];
  const kept: StoryMapCard[] = [];

  for (const card of existing) {
    const normalizedStepId = validStepIds.has(card.stepId) ? card.stepId : fallbackStepId;
    if (card.id.startsWith(DERIVED_PREFIX) && !card.manual) {
      const refreshed = freshById.get(card.id);
      if (refreshed) kept.push({ ...refreshed, stepId: validStepIds.has(refreshed.stepId) ? refreshed.stepId : fallbackStepId });
    } else if (!hidden.has(card.id)) {
      kept.push({ ...card, stepId: normalizedStepId });
    }
  }

  const haveIds = new Set(kept.map(c => c.id));
  const haveTitles = new Set(kept.map(c => plain(c.title).trim()));
  for (const card of derived) {
    if (haveIds.has(card.id) || haveTitles.has(plain(card.title).trim())) continue;
    kept.push(card);
    haveTitles.add(plain(card.title).trim());
  }

  return { ...session, storyMapCards: kept };
}

export function addStoryMapCard(
  session: MeetingSession,
  data: {
    stepId: string;
    title: string;
    release?: StoryMapRelease;
    asA?: string;
    iWantTo?: string;
    soThat?: string;
  }
): MeetingSession {
  const title = data.title.trim();
  if (!title || !session.userFlowSteps.some(s => s.id === data.stepId)) return session;
  const step = session.userFlowSteps.find(s => s.id === data.stepId)!;
  const card: StoryMapCard = {
    id: newId('smcard'),
    stepId: data.stepId,
    title,
    asA: data.asA?.trim() || step.actor || 'Usuário',
    iWantTo: data.iWantTo?.trim() || title,
    soThat: data.soThat?.trim() || `concluir a etapa "${step.title}" com sucesso`,
    release: data.release ?? 'mvp',
    manual: true
  };
  return { ...session, storyMapCards: [...(session.storyMapCards ?? []), card] };
}

export function updateStoryMapCard(
  session: MeetingSession,
  cardId: string,
  patch: Partial<Omit<StoryMapCard, 'id'>>
): MeetingSession {
  const cards = session.storyMapCards ?? [];
  if (!cards.some(c => c.id === cardId)) return session;
  if (patch.title !== undefined && !patch.title.trim()) return session;
  return {
    ...session,
    storyMapCards: cards.map(c =>
      c.id === cardId
        ? { ...c, ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}), manual: true }
        : c
    )
  };
}

export function moveStoryMapCard(
  session: MeetingSession,
  cardId: string,
  target: { stepId?: string; release?: StoryMapRelease }
): MeetingSession {
  const cards = session.storyMapCards ?? [];
  if (!cards.some(c => c.id === cardId)) return session;
  if (target.stepId && !session.userFlowSteps.some(s => s.id === target.stepId)) return session;
  return updateStoryMapCard(session, cardId, target);
}

export function removeStoryMapCard(session: MeetingSession, cardId: string): MeetingSession {
  const cards = session.storyMapCards ?? [];
  if (!cards.some(c => c.id === cardId)) return session;
  const hidden = cardId.startsWith(DERIVED_PREFIX)
    ? [...new Set([...(session.storyMapHiddenIds ?? []), cardId])]
    : session.storyMapHiddenIds;
  return {
    ...session,
    storyMapCards: cards.filter(c => c.id !== cardId),
    ...(hidden ? { storyMapHiddenIds: hidden } : {})
  };
}

/**
 * Converte os cartões do Story Map (todos ou apenas os do MVP) em propostas de backlog (E8.4),
 * organizando cada etapa da jornada como uma Feature e cada cartão como uma UserStory.
 * Não altera o backlog diretamente: devolve `Proposal[]` para revisão do PO.
 */
export function proposeStoryMapToBacklog(
  project: DiscoveryProject,
  session: MeetingSession,
  filterRelease: StoryMapRelease | 'all' = 'mvp'
): Proposal[] {
  const synced = session.storyMapCards ? session : syncStoryMap(session);
  const cards = (synced.storyMapCards ?? []).filter(c => filterRelease === 'all' || c.release === filterRelease);
  if (cards.length === 0 || session.userFlowSteps.length === 0) return [];

  const epicId = `epic-sm-${session.id}`;
  const features: Feature[] = [];

  for (const step of [...session.userFlowSteps].sort((a, b) => a.stepNumber - b.stepNumber)) {
    const stepCards = cards.filter(c => c.stepId === step.id);
    if (stepCards.length === 0) continue;

    const featureId = `feat-sm-${step.id}`;
    const userStories: UserStory[] = stepCards.map((card, idx) => ({
      id: `us-sm-${card.id}`,
      featureId,
      title: card.title,
      asA: card.asA,
      iWantTo: card.iWantTo,
      soThat: card.soThat,
      storyPoints: card.release === 'mvp' ? 3 : 5,
      ...(card.quote
        ? {
            evidenceQuote: {
              speaker: step.actor || 'Entrevistado',
              text: card.quote,
              sessionTitle: session.title
            }
          }
        : {}),
      acceptanceCriteria: [
        {
          id: `ac-sm-${card.id}-1`,
          scenario: `Execução de "${card.title}" na etapa "${step.title}"`,
          given: `que ${card.asA} está na etapa "${step.title}"`,
          when: `executa a ação para ${card.iWantTo}`,
          then: `${card.soThat}`
        }
      ],
      tasks: [
        {
          id: `task-sm-${card.id}-${idx + 1}`,
          title: `Implementar suporte a "${card.title}"`,
          type: 'frontend',
          status: 'todo',
          estimatedHours: 4
        }
      ]
    }));

    features.push({
      id: featureId,
      epicId,
      title: `Etapa ${step.stepNumber}: ${step.title}`,
      description: step.painPointDetected || `Suporte à etapa "${step.title}" da jornada do usuário.`,
      valueProposition: step.opportunity || `Reduzir fricção na etapa "${step.title}".`,
      effort: 'M',
      userStories
    });
  }

  if (features.length === 0) return [];

  const epic: Epic = {
    id: epicId,
    title: `Story Map: ${session.title}`,
    objective: session.objective || `Entregar a jornada mapeada em "${session.title}".`,
    businessValue: 'Cobertura ponta a ponta das etapas da jornada do usuário.',
    targetDate: filterRelease === 'mvp' ? 'Release MVP' : 'Próximas Releases',
    status: 'discovery',
    features
  };

  return planBacklogProposals(
    { okrs: project.okrs, epics: project.epics, prd: project.prd },
    { okrs: [], epics: [epic], prd: project.prd }
  );
}
