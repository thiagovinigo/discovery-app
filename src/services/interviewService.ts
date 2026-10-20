import { callAI } from './aiClient';
import { newId } from './ids';
import { parseStakeholderLines } from './stakeholderService';
import { storageService } from './storageService';
import type { DiscoveryProject, Stakeholder } from '../types/discovery';

export interface InterviewStep {
  id: string;
  title: string;
  question: string;
  /** Orientação curta de como responder bem. */
  hint: string;
  /** `text` = resposta livre; `list` = um item por linha; `people` = uma pessoa por linha ("nome — papel — organização"). */
  kind: 'text' | 'list' | 'people';
}

export const INTERVIEW_STEPS: InterviewStep[] = [
  { id: 'problem', title: 'Problema', kind: 'text', question: 'Qual problema ou oportunidade você quer resolver?', hint: 'Conte a situação de hoje, quem sofre com ela e qual o impacto. Um caso real ajuda mais que uma opinião.' },
  { id: 'audience', title: 'Público', kind: 'text', question: 'Quem sente esse problema? Qual é o público principal?', hint: 'Quem usa, em que momento do dia e com que frequência.' },
  { id: 'value', title: 'Proposta de valor', kind: 'text', question: 'Qual é a sua proposta de valor? Por que alguém escolheria esta solução?', hint: 'O que muda para o usuário e por que seria melhor que o que ele faz hoje.' },
  { id: 'northStar', title: 'North Star', kind: 'text', question: 'Como saber que está dando certo? Qual é a métrica principal?', hint: 'Uma métrica que meça valor real para o usuário, com o valor de hoje e a meta.' },
  { id: 'metrics', title: 'Métricas de sucesso', kind: 'list', question: 'Que outras métricas mostram sucesso?', hint: 'Uma métrica por linha.' },
  { id: 'stakeholders', title: 'Pessoas envolvidas', kind: 'people', question: 'Quem são as pessoas envolvidas: quem decide, patrocina, usa ou é impactado?', hint: 'Uma pessoa por linha: nome — papel — organização.' },
  { id: 'scope', title: 'Escopo', kind: 'list', question: 'O que precisa estar na primeira entrega?', hint: 'Um item por linha. Só o essencial para validar a ideia.' },
  { id: 'outOfScope', title: 'Fora do escopo', kind: 'list', question: 'O que fica de fora da primeira entrega?', hint: 'Um item por linha. Deixar claro evita o escopo crescer sem querer.' },
  { id: 'assumptions', title: 'Premissas', kind: 'list', question: 'O que você está assumindo sem ter confirmado com ninguém?', hint: 'Uma premissa por linha. São o que mais precisa ser validado.' },
  { id: 'risks', title: 'Riscos', kind: 'list', question: 'Quais riscos podem fazer isso dar errado?', hint: 'Um risco por linha.' }
];

/** Texto realmente preenchido: não vazio e que não seja o texto de preenchimento antigo do PRD ("Descreva…"). */
export const isFilled = (text?: string): boolean => !!text && text.trim() !== '' && !/^descreva\b/i.test(text.trim());

/** O projeto já tem a informação que esta etapa pediria, ou o usuário escolheu pular? */
export function stepAnswered(project: DiscoveryProject, step: InterviewStep): boolean {
  if ((project.interview?.skipped ?? []).includes(step.id)) return true;
  const prd = project.prd;
  switch (step.id) {
    case 'problem': return isFilled(prd.problemStatement);
    case 'audience': return isFilled(prd.targetAudience);
    case 'value': return isFilled(prd.valueProposition);
    case 'northStar': return isFilled(prd.northStarMetric);
    case 'metrics': return prd.successMetrics.length > 0;
    case 'stakeholders': return (project.stakeholders ?? []).length > 0;
    case 'scope': return prd.inScope.length > 0;
    case 'outOfScope': return prd.outOfScope.length > 0;
    case 'assumptions': return prd.assumptions.length > 0;
    case 'risks': return prd.risksAndMitigations.length > 0;
    default: return false;
  }
}

/** Próxima pergunta da entrevista, pulando o que já está respondido. `undefined` quando acabou. */
export function nextStep(project: DiscoveryProject): InterviewStep | undefined {
  return INTERVIEW_STEPS.find(step => !stepAnswered(project, step));
}

export function interviewProgress(project: DiscoveryProject): { done: number; total: number } {
  return { done: INTERVIEW_STEPS.filter(step => stepAnswered(project, step)).length, total: INTERVIEW_STEPS.length };
}

/** Marca a conclusão quando não sobrou nenhuma pergunta. */
const withCompletion = (project: DiscoveryProject): DiscoveryProject => {
  if (nextStep(project) || project.interview?.completedAt) return project;
  return {
    ...project,
    interview: { answers: project.interview?.answers ?? {}, skipped: project.interview?.skipped ?? [], completedAt: new Date().toISOString() }
  };
};

export function skipStep(project: DiscoveryProject, stepId: string): DiscoveryProject {
  const skipped = project.interview?.skipped ?? [];
  if (skipped.includes(stepId)) return project;
  return withCompletion({
    ...project,
    interview: { answers: project.interview?.answers ?? {}, skipped: [...skipped, stepId], completedAt: project.interview?.completedAt }
  });
}

/** Itens de uma resposta em lista: um por linha ou separados por ";", sem marcadores, vazios nem repetidos. */
export function parseListAnswer(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of text.split(/\n|;/)) {
    const item = raw.trim().replace(/^[-*•]\s*/, '').trim();
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    items.push(item);
  }
  return items;
}

const mergeUnique = (existing: string[], incoming: string[]): string[] => {
  const seen = new Set(existing.map(e => e.toLowerCase()));
  return [...existing, ...incoming.filter(item => !seen.has(item.toLowerCase()))];
};

/**
 * Aplica a resposta confirmada ao projeto, sem alterá-lo no lugar: texto vai para o campo do PRD, listas se somam
 * ao que já existia e pessoas viram stakeholders. A resposta crua também fica guardada.
 */
export function applyAnswer(project: DiscoveryProject, stepId: string, answer: string): DiscoveryProject {
  const text = answer.trim();
  const prd = project.prd;
  let next: DiscoveryProject;

  switch (stepId) {
    case 'problem': next = { ...project, prd: { ...prd, problemStatement: text } }; break;
    case 'audience': next = { ...project, prd: { ...prd, targetAudience: text } }; break;
    case 'value': next = { ...project, prd: { ...prd, valueProposition: text } }; break;
    case 'northStar': next = { ...project, prd: { ...prd, northStarMetric: text } }; break;
    case 'metrics': next = { ...project, prd: { ...prd, successMetrics: mergeUnique(prd.successMetrics, parseListAnswer(text)) } }; break;
    case 'scope': next = { ...project, prd: { ...prd, inScope: mergeUnique(prd.inScope, parseListAnswer(text)) } }; break;
    case 'outOfScope': next = { ...project, prd: { ...prd, outOfScope: mergeUnique(prd.outOfScope, parseListAnswer(text)) } }; break;
    case 'assumptions': next = { ...project, prd: { ...prd, assumptions: mergeUnique(prd.assumptions, parseListAnswer(text)) } }; break;
    case 'risks': {
      const known = new Set(prd.risksAndMitigations.map(r => r.risk.toLowerCase()));
      const added = parseListAnswer(text).filter(r => !known.has(r.toLowerCase())).map(risk => ({ risk, mitigation: '' }));
      next = { ...project, prd: { ...prd, risksAndMitigations: [...prd.risksAndMitigations, ...added] } };
      break;
    }
    case 'stakeholders': {
      const existing = project.stakeholders ?? [];
      const known = new Set(existing.map(s => s.name.toLowerCase()));
      const created: Stakeholder[] = parseStakeholderLines(text)
        .filter(s => !known.has(s.name.toLowerCase()))
        .map(s => ({ ...s, id: newId('stk'), createdAt: new Date().toISOString() }));
      next = { ...project, stakeholders: [...existing, ...created] };
      break;
    }
    default: return project;
  }

  return withCompletion({
    ...next,
    interview: {
      answers: { ...(project.interview?.answers ?? {}), [stepId]: text },
      skipped: project.interview?.skipped ?? [],
      completedAt: project.interview?.completedAt
    }
  });
}

const SHORT_ANSWER_LENGTH = 40;

const TEXT_FOLLOW_UPS: Record<string, string> = {
  problem: 'Pode dar um exemplo concreto de quando isso aconteceu e qual foi o impacto (tempo, custo, erro)?',
  audience: 'Quem exatamente é a pessoa que mais sofre com isso e em que momento do dia ela enfrenta o problema?',
  value: 'O que muda na vida dessa pessoa depois que a solução existir? Como ela notaria a diferença?',
  northStar: 'Qual é o valor de hoje dessa métrica e qual meta você consideraria um sucesso?'
};

/** Pergunta de aprofundamento por regras locais (sem IA), ou `null` se a resposta já está boa. */
export function followUpFor(step: InterviewStep, answer: string): string | null {
  if (step.kind === 'text') {
    return answer.trim().length < SHORT_ANSWER_LENGTH ? TEXT_FOLLOW_UPS[step.id] ?? null : null;
  }
  if (step.kind === 'list') {
    return parseListAnswer(answer).length === 1 ? 'Há mais algum? Pode listar um por linha.' : null;
  }
  const people = parseStakeholderLines(answer);
  const noDetails = people.length > 0 && people.every(p => p.role === 'outro' && !p.jobTitle && !p.organization);
  return noDetails ? 'Qual é o papel de cada pessoa (decide, patrocina, usa ou é impactada) e de qual organização?' : null;
}

/** Com chave de IA, pede UMA pergunta de aprofundamento; sem chave, ou se a IA falhar, usa as regras locais. */
export async function aiFollowUp(step: InterviewStep, answer: string, project: DiscoveryProject): Promise<string | null> {
  if (!storageService.getApiKey()) return followUpFor(step, answer);

  try {
    const text = (await callAI({
      json: false,
      temperature: 0.5,
      systemPrompt:
        'Você é um entrevistador de produto experiente (Mom Test). O Product Owner respondeu a uma pergunta de preenchimento do projeto. ' +
        'Se a resposta já for específica e verificável, responda exatamente "OK". Caso contrário, faça UMA pergunta curta de aprofundamento, ' +
        'em português, que peça um exemplo concreto, um número ou um fato do passado. Não repita a pergunta original.',
      userPrompt: `Projeto: ${project.name}\nPergunta feita: ${step.question}\nResposta do PO: ${answer}`
    })).trim();
    return /^ok\b/i.test(text) ? null : text;
  } catch (e: unknown) {
    console.warn('Entrevista: a IA falhou, usando regra local:', e);
    return followUpFor(step, answer);
  }
}
