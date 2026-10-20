import { isFilled } from './interviewService';
import type { Epic, UserStory } from '../types/discovery';

export type GapCode =
  | 'missing-statement'
  | 'no-criteria'
  | 'incomplete-gherkin'
  | 'no-estimate'
  | 'too-big'
  | 'no-tasks'
  | 'no-qa-task'
  | 'dor-open';

export interface Gap {
  code: GapCode;
  /** `blocker` impede o "pronto para dev"; `warning` só recomenda ajustar. */
  severity: 'blocker' | 'warning';
  message: string;
}

export interface StoryVerification {
  gaps: Gap[];
  ready: boolean;
}

export interface BacklogVerification {
  stories: { storyId: string; title: string; gaps: Gap[]; ready: boolean }[];
  ready: number;
  notReady: number;
}

/** Acima disto a história é grande demais para uma sprint (INVEST: Small) e deveria ser fatiada. */
const MAX_STORY_POINTS = 8;

const blocker = (code: GapCode, message: string): Gap => ({ code, severity: 'blocker', message });
const warning = (code: GapCode, message: string): Gap => ({ code, severity: 'warning', message });

/**
 * Checagens determinísticas de qualidade de uma história (INVEST, Gherkin completo, tasks e Definition of Ready).
 * Bloqueios impedem o "pronto para dev"; avisos apenas aparecem na lista de lacunas.
 */
export function verifyStory(story: UserStory): StoryVerification {
  const gaps: Gap[] = [];

  if (![story.asA, story.iWantTo, story.soThat].every(isFilled)) {
    gaps.push(blocker('missing-statement', 'Falta preencher "Como", "Quero" ou "Para que".'));
  }

  if (story.acceptanceCriteria.length === 0) {
    gaps.push(blocker('no-criteria', 'Sem critério de aceite.'));
  }
  for (const criterion of story.acceptanceCriteria) {
    if (![criterion.given, criterion.when, criterion.then].every(isFilled)) {
      gaps.push(blocker('incomplete-gherkin', `Critério incompleto (Dado/Quando/Então): "${criterion.scenario}".`));
    }
  }

  if (story.storyPoints === undefined) {
    gaps.push(warning('no-estimate', 'Sem estimativa de pontos.'));
  } else if (story.storyPoints > MAX_STORY_POINTS) {
    gaps.push(warning('too-big', `Grande demais (${story.storyPoints} pontos): considere fatiar.`));
  }

  if (story.tasks.length === 0) {
    gaps.push(warning('no-tasks', 'Sem tasks técnicas.'));
  } else if (story.acceptanceCriteria.length > 0 && !story.tasks.some(t => t.type === 'qa')) {
    gaps.push(warning('no-qa-task', 'Nenhuma task de teste (qa) cobre os critérios de aceite.'));
  }

  const openDor = (story.dorChecklist ?? []).filter(item => !item.checked);
  if (openDor.length > 0) {
    gaps.push(warning('dor-open', `Definition of Ready em aberto: ${openDor.map(i => i.label).join('; ')}.`));
  }

  return { gaps, ready: !gaps.some(g => g.severity === 'blocker') };
}

/** Verifica todas as histórias do backlog e conta quantas estão prontas para dev. */
export function verifyBacklog(epics: Epic[]): BacklogVerification {
  const stories = epics
    .flatMap(e => e.features)
    .flatMap(f => f.userStories)
    .map(story => ({ storyId: story.id, title: story.title, ...verifyStory(story) }));
  const ready = stories.filter(s => s.ready).length;
  return { stories, ready, notReady: stories.length - ready };
}
