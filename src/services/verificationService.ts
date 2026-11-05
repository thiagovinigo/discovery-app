import { isFilled } from './interviewService';
import type { Epic, UserStory } from '../types/discovery';

export type GapCode =
  | 'missing-statement'
  | 'vague-persona'
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

export interface TenPointCheckItem {
  id: string;
  label: string;
  passed: boolean;
}

export interface TenPointEvaluation {
  score: number;
  total: 10;
  /** GO quando a história atinge 7 ou mais dos 10 pontos (E12.7). */
  go: boolean;
  items: TenPointCheckItem[];
}

/** Acima disto a história é grande demais para uma sprint (INVEST: Small) e deveria ser fatiada. */
const MAX_STORY_POINTS = 8;

const VAGUE_PERSONAS = new Set([
  'usuario',
  'usuário',
  'user',
  'alguem',
  'alguém',
  'pessoa',
  'cliente generico',
  'cliente genérico'
]);

const isVaguePersona = (asA?: string): boolean => {
  if (!isFilled(asA)) return false;
  return VAGUE_PERSONAS.has(asA!.trim().toLowerCase());
};

const blocker = (code: GapCode, message: string): Gap => ({ code, severity: 'blocker', message });
const warning = (code: GapCode, message: string): Gap => ({ code, severity: 'warning', message });

/**
 * Avalia a história contra o Checklist de 10 pontos de qualidade (E12.7, GO com 7 ou mais):
 * 1. Persona específica no "Como"
 * 2. Ação clara no "Quero"
 * 3. Valor de negócio explícito no "Para que"
 * 4. Critérios de aceite presentes
 * 5. Gherkin completo (Dado / Quando / Então)
 * 6. Caso de borda, erro ou múltiplos cenários cobertos
 * 7. Estimada e cabe na sprint (<= 8 pontos)
 * 8. Decomposta em tasks técnicas
 * 9. Task de QA/teste cobrindo os critérios
 * 10. Evidência de discovery vinculada ou Definition of Ready sem pendências
 */
export function evaluateStoryTenPointChecklist(story: UserStory): TenPointEvaluation {
  const hasPersona = isFilled(story.asA) && !isVaguePersona(story.asA);
  const hasAction = isFilled(story.iWantTo);
  const hasValue = isFilled(story.soThat);
  const hasCriteria = story.acceptanceCriteria.length > 0;
  const gherkinComplete =
    hasCriteria &&
    story.acceptanceCriteria.every(c => [c.given, c.when, c.then].every(isFilled));
  const hasEdgeOrMultiCriteria =
    story.acceptanceCriteria.length >= 2 ||
    story.acceptanceCriteria.some(c =>
      /erro|falha|inválid|invalid|exceç|limite|vazio|bloque|rejeit/i.test(`${c.scenario} ${c.when} ${c.then}`)
    );
  const sizedForSprint = story.storyPoints !== undefined && story.storyPoints > 0 && story.storyPoints <= MAX_STORY_POINTS;
  const hasTechTasks = story.tasks.length > 0;
  const hasQaTask = story.tasks.some(t => t.type === 'qa');
  const openDor = (story.dorChecklist ?? []).filter(i => !i.checked);
  const hasEvidenceOrDor =
    isFilled(story.evidenceQuote?.text) ||
    story.validation?.status === 'validated' ||
    ((story.dorChecklist?.length ?? 0) > 0 && openDor.length === 0);

  const items: TenPointCheckItem[] = [
    { id: 'persona-specific', label: 'Persona específica no "Como"', passed: hasPersona },
    { id: 'action-clear', label: 'Ação clara no "Quero"', passed: hasAction },
    { id: 'value-clear', label: 'Valor de negócio explícito no "Para que"', passed: hasValue },
    { id: 'has-criteria', label: 'Possui critérios de aceite', passed: hasCriteria },
    { id: 'complete-gherkin', label: 'Critérios em Gherkin completo (Dado/Quando/Então)', passed: gherkinComplete },
    { id: 'edge-or-multi', label: 'Cobre caso de erro/borda ou múltiplos cenários', passed: hasEdgeOrMultiCriteria },
    { id: 'sized-for-sprint', label: `Estimada e cabe na sprint (≤ ${MAX_STORY_POINTS} pts)`, passed: sizedForSprint },
    { id: 'has-tech-tasks', label: 'Decomposta em tasks técnicas', passed: hasTechTasks },
    { id: 'has-qa-task', label: 'Possui task de QA/teste', passed: hasQaTask },
    { id: 'evidence-or-dor', label: 'Ancorada em evidência real ou DoR concluído', passed: hasEvidenceOrDor }
  ];

  const score = items.filter(i => i.passed).length;
  return {
    score,
    total: 10,
    go: score >= 7,
    items
  };
}

/**
 * Checagens determinísticas de qualidade de uma história (INVEST, Gherkin completo, tasks, persona específica e Definition of Ready).
 * Bloqueios impedem o "pronto para dev"; avisos apenas aparecem na lista de lacunas.
 */
export function verifyStory(story: UserStory): StoryVerification {
  const gaps: Gap[] = [];

  if (![story.asA, story.iWantTo, story.soThat].every(isFilled)) {
    gaps.push(blocker('missing-statement', 'Falta preencher "Como", "Quero" ou "Para que".'));
  } else if (isVaguePersona(story.asA)) {
    gaps.push(
      warning(
        'vague-persona',
        `Persona genérica no "Como" ("${story.asA.trim()}"): especifique quem realmente executa a ação.`
      )
    );
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
