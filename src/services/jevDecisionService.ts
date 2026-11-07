import { parseJsonLoose } from './aiClient';
import { plain } from './knowledgeService';
import type {
  AutomationOpportunity,
  CandidateSolutionType,
  ProcessSheet,
  RoadmapWave
} from '../types/discovery';
import { suggestSolutionTypeForProcess } from './automationDiscoveryService';

export type JevAiCaller = (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<string>;

// =============================================================================================
// Primitivas System-One estilo Jev (TypeSafe AI): Noul, Choice<T>, Score
// =============================================================================================

/**
 * Primitiva `Noul` do Jev: decisão ternária (`yes` | `no` | `null` quando não há evidência suficiente),
 * acompanhada de probabilidade calibrada (0..1) para cada estado e fonte (`ai` ou `offline`).
 */
export interface JevNoulResult {
  answer: 'yes' | 'no' | 'null';
  confidence: number; // 0..1
  probabilities: {
    yes: number;
    no: number;
    null: number;
  };
  rationale: string;
  source: 'ai' | 'offline';
}

/**
 * Primitiva `Choice<T>` do Jev: escolhe exatamente 1 opção dentro de um conjunto fechado de candidatos `T[]`,
 * retornando a confiança da escolha vencedora e a distribuição de probabilidades entre todos os candidatos.
 */
export interface JevChoiceResult<T extends string> {
  choice: T;
  confidence: number; // 0..1
  probabilities: Record<T, number>;
  rationale: string;
  source: 'ai' | 'offline';
}

/**
 * Primitiva `Score` do Jev: avalia um estado contra uma rubrica explícita em uma escala inteira (`1 a 5`),
 * retornando a nota inteira calibrada e a confiança na nota atribuída.
 */
export interface JevScoreResult {
  score: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0..1
  rationale: string;
  source: 'ai' | 'offline';
}

const clamp01 = (n: number): number => Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;

const clampScore15 = (n: number): 1 | 2 | 3 | 4 | 5 => {
  const rounded = Math.round(n);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as 1 | 2 | 3 | 4 | 5;
};

// =============================================================================================
// 1. Execução genérica das 3 Primitivas (`jevNoul`, `jevChoice`, `jevScore`)
// =============================================================================================

export async function jevNoul(
  state: string,
  question: string,
  offlineFallback: () => Omit<JevNoulResult, 'source'>,
  callAi?: JevAiCaller
): Promise<JevNoulResult> {
  if (!callAi || !state.trim()) {
    return { ...offlineFallback(), source: 'offline' };
  }

  const sys = `Você é um motor de decisão rápida estilo Jev (System One / TypeSafe AI) executando a primitiva NOUL (yes | no | null).
Não escreva parágrafos. Analise o estado e responda se a afirmação/pergunta é verdadeira ("yes"), falsa ("no") ou se não há evidência suficiente ("null").
Retorne APENAS um JSON válido:
{ "answer": "yes" | "no" | "null", "confidence": 0.0 a 1.0, "probabilities": { "yes": 0.0, "no": 0.0, "null": 0.0 }, "rationale": "frase curta de até 15 palavras" }`;

  try {
    const raw = await callAi(sys, `ESTADO:\n${state}\n\nPERGUNTA NOUL:\n${question}`, 0.1);
    const parsed = parseJsonLoose(raw) as any;
    if (
      parsed &&
      (parsed.answer === 'yes' || parsed.answer === 'no' || parsed.answer === 'null') &&
      typeof parsed.confidence === 'number'
    ) {
      const pYes = clamp01(Number(parsed.probabilities?.yes ?? (parsed.answer === 'yes' ? parsed.confidence : 0.1)));
      const pNo = clamp01(Number(parsed.probabilities?.no ?? (parsed.answer === 'no' ? parsed.confidence : 0.1)));
      const pNull = clamp01(Number(parsed.probabilities?.null ?? (parsed.answer === 'null' ? parsed.confidence : 0.1)));
      return {
        answer: parsed.answer,
        confidence: clamp01(parsed.confidence),
        probabilities: { yes: pYes, no: pNo, null: pNull },
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'Decisão calculada via Jev.',
        source: 'ai'
      };
    }
  } catch {
    // Fallback determinístico local
  }
  return { ...offlineFallback(), source: 'offline' };
}

export async function jevChoice<T extends string>(
  state: string,
  question: string,
  candidates: readonly T[],
  offlineFallback: () => Omit<JevChoiceResult<T>, 'source'>,
  callAi?: JevAiCaller
): Promise<JevChoiceResult<T>> {
  if (!callAi || !state.trim() || candidates.length === 0) {
    return { ...offlineFallback(), source: 'offline' };
  }

  const sys = `Você é um motor de decisão rápida estilo Jev (System One / TypeSafe AI) executando a primitiva CHOICE.
Escolha EXATAMENTE UMA opção dentre os candidatos permitidos: ${JSON.stringify(candidates)}.
Retorne APENAS um JSON válido:
{ "choice": "<um dos candidatos>", "confidence": 0.0 a 1.0, "probabilities": { "<candidato>": 0.0 }, "rationale": "frase curta de até 15 palavras" }`;

  try {
    const raw = await callAi(sys, `ESTADO:\n${state}\n\nPERGUNTA CHOICE:\n${question}`, 0.1);
    const parsed = parseJsonLoose(raw) as any;
    if (parsed && candidates.includes(parsed.choice)) {
      const probs = {} as Record<T, number>;
      for (const c of candidates) {
        probs[c] = clamp01(Number(parsed.probabilities?.[c] ?? (c === parsed.choice ? parsed.confidence ?? 0.75 : 0.05)));
      }
      return {
        choice: parsed.choice as T,
        confidence: clamp01(Number(parsed.confidence ?? probs[parsed.choice as T] ?? 0.8)),
        probabilities: probs,
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'Escolha tipada via Jev.',
        source: 'ai'
      };
    }
  } catch {
    // Fallback determinístico local
  }
  return { ...offlineFallback(), source: 'offline' };
}

export async function jevScore(
  state: string,
  rubricQuestion: string,
  offlineFallback: () => Omit<JevScoreResult, 'source'>,
  callAi?: JevAiCaller
): Promise<JevScoreResult> {
  if (!callAi || !state.trim()) {
    return { ...offlineFallback(), source: 'offline' };
  }

  const sys = `Você é um motor de decisão rápida estilo Jev (System One / TypeSafe AI) executando a primitiva SCORE (escala inteira de 1 a 5).
Avalie o estado estritamente conforme a rubrica e retorne APENAS um JSON válido:
{ "score": 1 | 2 | 3 | 4 | 5, "confidence": 0.0 a 1.0, "rationale": "frase curta de até 15 palavras" }`;

  try {
    const raw = await callAi(sys, `ESTADO:\n${state}\n\nRUBRICA SCORE (1 a 5):\n${rubricQuestion}`, 0.1);
    const parsed = parseJsonLoose(raw) as any;
    if (parsed && typeof parsed.score === 'number') {
      return {
        score: clampScore15(parsed.score),
        confidence: clamp01(Number(parsed.confidence ?? 0.8)),
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'Score calibrado via Jev.',
        source: 'ai'
      };
    }
  } catch {
    // Fallback determinístico local
  }
  return { ...offlineFallback(), source: 'offline' };
}

// =============================================================================================
// 2. Aplicação 1: Veredito Completo de Oportunidade & Processo (Discovery de IA e Automação)
// =============================================================================================

export interface JevOpportunityVerdict {
  solutionChoice: JevChoiceResult<CandidateSolutionType>;
  impactScore: JevScoreResult;
  effortScore: JevScoreResult;
  riskScore: JevScoreResult;
  dataReadinessScore: JevScoreResult;
  waveChoice: JevChoiceResult<RoadmapWave>;
  goVerdict: JevNoulResult;
  overallConfidence: number;
  source: 'ai' | 'offline';
}

const SOLUTION_CANDIDATES: readonly CandidateSolutionType[] = [
  'Automação n8n',
  'Agente de IA',
  'Assistente Claude',
  'Analytics / BI',
  'Redesenho de processo'
];

const WAVE_CANDIDATES: readonly RoadmapWave[] = [
  '0–30 dias',
  '31–60 dias',
  '61–90 dias',
  'Backlog'
];

/**
 * Calcula de forma determinística (System-One local) o veredito completo do Jev para uma oportunidade
 * e seu processo vinculado, usando exatamente as réguas de 1 a 5 do Guia do Consultor.
 */
export function evaluateOpportunityWithJevOffline(
  opportunity: AutomationOpportunity,
  process: ProcessSheet | undefined,
  loadedHourlyCost = 45
): JevOpportunityVerdict {
  const bestSol = process ? suggestSolutionTypeForProcess(process) : opportunity.solutionType;
  const solProbs: Record<CandidateSolutionType, number> = {
    'Automação n8n': 0.1,
    'Agente de IA': 0.1,
    'Assistente Claude': 0.1,
    'Analytics / BI': 0.05,
    'Redesenho de processo': 0.05,
    'Não se aplica': 0.0
  };
  solProbs[bestSol] = 0.72;

  const hasNumbers =
    typeof process?.monthlyVolume === 'number' &&
    process.monthlyVolume > 0 &&
    typeof process?.standardMinutes === 'number' &&
    process.standardMinutes > 0;

  const currentHours = hasNumbers
    ? ((process!.monthlyVolume as number) * (process!.standardMinutes as number)) / 60
    : 0;
  const releasedHours = currentHours * (opportunity.automatizableFraction || 0.6);

  // 1. Score Impacto (régua do Guia: <10h=1, 10-25h=2, 25-60h=3, 60-120h=4, >120h=5)
  let impactVal: 1 | 2 | 3 | 4 | 5 = 3;
  if (releasedHours >= 120) impactVal = 5;
  else if (releasedHours >= 60) impactVal = 4;
  else if (releasedHours >= 25) impactVal = 3;
  else if (releasedHours >= 10) impactVal = 2;
  else if (hasNumbers) impactVal = 1;

  // 2. Score Dados prontos (régua: estruturado Sim=4..5, Parcial=3, Não=2)
  let dataVal: 1 | 2 | 3 | 4 | 5 = 3;
  if (process?.structuredData === 'Sim' && process?.documentedRules === 'Sim') dataVal = 5;
  else if (process?.structuredData === 'Sim') dataVal = 4;
  else if (process?.structuredData === 'Parcial') dataVal = 3;
  else if (process?.structuredData === 'Não') dataVal = 2;

  // 3. Score Esforço (1=simples/1 sistema, 2=integração simples, 3=múltiplos/IA, 4=complexo, 5=redesenho)
  const systemsCount = process?.systemsUsed
    ? process.systemsUsed.split(/[,;/]+/).filter(s => s.trim().length > 0).length
    : 1;
  let effortVal: 1 | 2 | 3 | 4 | 5 = 2;
  if (bestSol === 'Redesenho de processo') effortVal = 4;
  else if (systemsCount >= 4) effortVal = 4;
  else if (bestSol === 'Agente de IA' || systemsCount === 3) effortVal = 3;
  else if (bestSol === 'Automação n8n' && dataVal >= 4) effortVal = 2;
  else if (bestSol === 'Assistente Claude') effortVal = 2;

  // 4. Score Risco (analisa impacto do erro: fiscal/multa/LGPD/cliente -> 4..5, interno com revisão -> 2..3)
  const errText = plain(`${process?.errorImpact ?? ''} ${opportunity.title}`);
  let riskVal: 1 | 2 | 3 | 4 | 5 = 2;
  if (/\b(multa|fiscal|sefaz|juridic|lgpd|bloqueio judicial)\b/.test(errText)) riskVal = 4;
  else if (/\b(cliente|fornecedor|preco|pagamento|financeiro)\b/.test(errText)) riskVal = 3;
  else riskVal = 2;

  // Se há revisão humana explícita no título, reduz risco extremo de 5 para 3..4
  if (/\b(revisao humana|aprovacao|human-in-the-loop|alçada)\b/.test(plain(opportunity.title)) && riskVal > 2) {
    riskVal = clampScore15(riskVal - 1);
  }

  // Onda recomendada
  let wave: RoadmapWave = '31–60 dias';
  if (impactVal >= 4 && effortVal <= 2) wave = '0–30 dias';
  else if (impactVal >= 4 && effortVal === 3) wave = '31–60 dias';
  else if (impactVal >= 3 && effortVal >= 4) wave = '61–90 dias';
  else if (impactVal <= 2 && effortVal >= 3) wave = 'Backlog';

  const waveProbs: Record<RoadmapWave, number> = {
    '0–30 dias': 0.1,
    '31–60 dias': 0.1,
    '61–90 dias': 0.1,
    Backlog: 0.05
  };
  waveProbs[wave] = 0.75;

  const annualGain = releasedHours * loadedHourlyCost * 12;
  const goAnswer: 'yes' | 'no' | 'null' = !hasNumbers
    ? 'null'
    : impactVal >= 3 && effortVal <= 4
      ? 'yes'
      : 'no';

  const confBase = hasNumbers ? 0.84 : 0.55;

  return {
    solutionChoice: {
      choice: bestSol,
      confidence: clamp01(solProbs[bestSol]),
      probabilities: solProbs,
      rationale: `Dado estruturado=${process?.structuredData ?? '?'} e regra=${process?.documentedRules ?? '?'} apontam para ${bestSol}.`,
      source: 'offline'
    },
    impactScore: {
      score: impactVal,
      confidence: confBase,
      rationale: hasNumbers
        ? `Libera ~${Math.round(releasedHours)} h/mês (~R$ ${Math.round(annualGain).toLocaleString('pt-BR')}/ano).`
        : 'Estimativa preliminar (preencha os 4 números do processo para alta confiança).',
      source: 'offline'
    },
    effortScore: {
      score: effortVal,
      confidence: 0.78,
      rationale: `${systemsCount} sistema(s) envolvido(s) com solução tipo ${bestSol}.`,
      source: 'offline'
    },
    riskScore: {
      score: riskVal,
      confidence: 0.8,
      rationale: `Baseado no impacto de erro ("${(process?.errorImpact || 'interno').slice(0, 40)}") e controle humano.`,
      source: 'offline'
    },
    dataReadinessScore: {
      score: dataVal,
      confidence: 0.85,
      rationale: `Formato de entrada: ${process?.dataInputFormat || 'não especificado'} (estruturado: ${process?.structuredData ?? 'Parcial'}).`,
      source: 'offline'
    },
    waveChoice: {
      choice: wave,
      confidence: 0.75,
      probabilities: waveProbs,
      rationale: `Impacto ${impactVal}/5 vs Esforço ${effortVal}/5 aloca na onda ${wave}.`,
      source: 'offline'
    },
    goVerdict: {
      answer: goAnswer,
      confidence: confBase,
      probabilities: {
        yes: goAnswer === 'yes' ? 0.82 : 0.15,
        no: goAnswer === 'no' ? 0.78 : 0.1,
        null: goAnswer === 'null' ? 0.8 : 0.08
      },
      rationale:
        goAnswer === 'yes'
          ? 'GO: Retorno claro em horas liberadas com esforço/risco controlados.'
          : goAnswer === 'null'
            ? 'ABSTENÇÃO (NULL): Faltam os 4 números obrigatórios no processo para provar o ROI.'
            : 'NO-GO / BACKLOG: Baixo retorno frente ao esforço atual.',
      source: 'offline'
    },
    overallConfidence: confBase,
    source: 'offline'
  };
}

export async function evaluateOpportunityWithJev(
  opportunity: AutomationOpportunity,
  process: ProcessSheet | undefined,
  loadedHourlyCost = 45,
  callAi?: JevAiCaller
): Promise<JevOpportunityVerdict> {
  const fallback = evaluateOpportunityWithJevOffline(opportunity, process, loadedHourlyCost);
  if (!callAi) return fallback;

  const state = JSON.stringify(
    {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        automatizableFraction: opportunity.automatizableFraction,
        otherGains: opportunity.otherGains
      },
      process: process
        ? {
            id: process.id,
            area: process.area,
            name: process.name,
            monthlyVolume: process.monthlyVolume,
            standardMinutes: process.standardMinutes,
            peopleInvolved: process.peopleInvolved,
            exceptionRate: process.exceptionRate,
            systemsUsed: process.systemsUsed,
            dataInputFormat: process.dataInputFormat,
            structuredData: process.structuredData,
            documentedRules: process.documentedRules,
            bottlenecks: process.bottlenecks,
            errorImpact: process.errorImpact
          }
        : null,
      loadedHourlyCost
    },
    null,
    2
  );

  const sys = `Você é o motor Jev (System One / TypeSafe AI) aplicando decisões tipadas (Choice, Score 1..5 e Noul) sobre uma Oportunidade de Automação/IA.
Use estritamente as réguas:
- Impacto (1..5): 1 (<10h/mês), 2 (10-25h/mês), 3 (25-60h/mês), 4 (60-120h/mês), 5 (>120h/mês ou impacto crítico em margem/receita).
- Esforço (1..5): 1 (<=1 sem, 1 sistema), 2 (1-2 sem), 3 (3-4 sem, 2 sistemas), 4 (1-2 meses), 5 (>2 meses).
- Risco (1..5): 1 (interno sem dado pessoal), 2 (fácil detectar), 3 (operação interna com revisão humana), 4 (cliente/fornecedor/LGPD), 5 (fiscal/jurídico alto).
- Dados prontos (1..5): 1 (papel/áudio), 2 (PDF/WhatsApp sem padrão), 3 (planilha razoável), 4 (exportação confiável), 5 (API e dado limpo).
Retorne APENAS um JSON válido:
{
  "solutionType": "Automação n8n" | "Agente de IA" | "Assistente Claude" | "Analytics / BI" | "Redesenho de processo",
  "solutionConfidence": 0.85,
  "impact": 4,
  "effort": 2,
  "risk": 2,
  "dataReadiness": 4,
  "roadmapWave": "0–30 dias" | "31–60 dias" | "61–90 dias" | "Backlog",
  "go": "yes" | "no" | "null",
  "goConfidence": 0.88,
  "rationale": "Resumo objetivo de até 20 palavras"
}`;

  try {
    const raw = await callAi(sys, state, 0.1);
    const parsed = parseJsonLoose(raw) as any;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const sol: CandidateSolutionType = SOLUTION_CANDIDATES.includes(parsed.solutionType)
      ? parsed.solutionType
      : fallback.solutionChoice.choice;
    const wave: RoadmapWave = WAVE_CANDIDATES.includes(parsed.roadmapWave)
      ? parsed.roadmapWave
      : fallback.waveChoice.choice;
    const goAns: 'yes' | 'no' | 'null' =
      parsed.go === 'yes' || parsed.go === 'no' || parsed.go === 'null'
        ? parsed.go
        : fallback.goVerdict.answer;
    const conf = clamp01(Number(parsed.goConfidence ?? parsed.solutionConfidence ?? 0.85));

    return {
      ...fallback,
      solutionChoice: {
        ...fallback.solutionChoice,
        choice: sol,
        confidence: clamp01(Number(parsed.solutionConfidence ?? conf)),
        source: 'ai'
      },
      impactScore: {
        score: clampScore15(Number(parsed.impact ?? fallback.impactScore.score)),
        confidence: conf,
        rationale: parsed.rationale || fallback.impactScore.rationale,
        source: 'ai'
      },
      effortScore: {
        score: clampScore15(Number(parsed.effort ?? fallback.effortScore.score)),
        confidence: conf,
        rationale: fallback.effortScore.rationale,
        source: 'ai'
      },
      riskScore: {
        score: clampScore15(Number(parsed.risk ?? fallback.riskScore.score)),
        confidence: conf,
        rationale: fallback.riskScore.rationale,
        source: 'ai'
      },
      dataReadinessScore: {
        score: clampScore15(Number(parsed.dataReadiness ?? fallback.dataReadinessScore.score)),
        confidence: conf,
        rationale: fallback.dataReadinessScore.rationale,
        source: 'ai'
      },
      waveChoice: {
        ...fallback.waveChoice,
        choice: wave,
        confidence: conf,
        source: 'ai'
      },
      goVerdict: {
        answer: goAns,
        confidence: conf,
        probabilities: {
          yes: goAns === 'yes' ? conf : clamp01(1 - conf),
          no: goAns === 'no' ? conf : 0.1,
          null: goAns === 'null' ? conf : 0.05
        },
        rationale: parsed.rationale || fallback.goVerdict.rationale,
        source: 'ai'
      },
      overallConfidence: conf,
      source: 'ai'
    };
  } catch {
    return fallback;
  }
}

// =============================================================================================
// 3. Aplicação 2: Julgamento `Noul` de Evidências de Reunião vs Item do Backlog (E8.5)
// =============================================================================================

/**
 * Usa a primitiva `Noul` do Jev para julgar se uma fala do stakeholder:
 * - `'yes'` (`confirms`): confirma que o item do backlog é uma dor/necessidade real
 * - `'no'` (`contests`): contradiz ou rejeita a necessidade do item
 * - `'null'` (abstenção): não tem relação suficiente ou é neutra
 */
export async function judgeBacklogEvidenceWithJev(
  quote: string,
  itemTitle: string,
  itemDescription: string,
  callAi?: JevAiCaller
): Promise<JevNoulResult> {
  const offlineFallback = (): Omit<JevNoulResult, 'source'> => {
    const q = plain(quote);
    const hasContest = /\b(nao preciso|nao precisamos|nao faz sentido|desnecessario|ninguem usa|nao e problema)\b/.test(q);
    const hasConfirm = /\b(preciso|precisamos|toda semana|todo dia|perco tempo|demora|muito manual|dor de cabeca|atrapalha)\b/.test(q);

    if (hasContest) {
      return {
        answer: 'no',
        confidence: 0.82,
        probabilities: { yes: 0.08, no: 0.82, null: 0.1 },
        rationale: 'Sinal explícito de rejeição ou baixa utilidade na fala.'
      };
    }
    if (hasConfirm) {
      return {
        answer: 'yes',
        confidence: 0.8,
        probabilities: { yes: 0.8, no: 0.08, null: 0.12 },
        rationale: 'Fala confirma dor recorrente ou necessidade direta.'
      };
    }
    return {
      answer: 'null',
      confidence: 0.75,
      probabilities: { yes: 0.15, no: 0.1, null: 0.75 },
      rationale: 'Sem evidência conclusiva de confirmação ou rejeição.'
    };
  };

  return jevNoul(
    `Fala do entrevistado: "${quote}"\nItem do backlog: "${itemTitle}" (${itemDescription})`,
    'Esta fala confirma ("yes") que o item do backlog é necessário, contesta/rejeita ("no") a necessidade dele, ou é neutra/insuficiente ("null")?',
    offlineFallback,
    callAi
  );
}
