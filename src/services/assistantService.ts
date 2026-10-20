import { callAI, parseJsonLoose } from './aiClient';
import { buildProjectContext } from './agentService';
import { newId } from './ids';
import { filterQuestions } from './interviewQuestionService';
import { plain, searchProjectKnowledge } from './knowledgeService';
import { storageService } from './storageService';
import type {
  AssistantAnswer,
  AssistantOutput,
  AssistantProbe,
  AssistantTopic,
  DiscoveryProject,
  MeetingType,
  TranscriptSegment
} from '../types/discovery';

export const MEETING_TYPE_LABELS: Record<MeetingType, { title: string; description: string }> = {
  discovery: { title: 'Discovery (eu entrevisto)', description: 'O assistente sugere perguntas profundas pensando no PRD e na SPEC.' },
  interview: { title: 'Entrevista (sou entrevistado)', description: 'O assistente responde às perguntas feitas a você e dá exemplos.' },
  alignment: { title: 'Alinhamento', description: 'O assistente organiza tópicos com as ideias embaixo de cada um.' },
  refinement: { title: 'Refinamento', description: 'O assistente levanta critérios de aceite, dependências e dúvidas de escopo.' }
};

const MAX_PROBES = 4;
const MAX_OUTPUTS = 20;
const MAX_SEGMENTS_PER_RUN = 12;
const MIN_SENTENCE_LENGTH = 12;

// ---------------------------------------------------------------------------------------------
// Entrevista: responder às perguntas e dar exemplo
// ---------------------------------------------------------------------------------------------

const QUESTION_STARTS = [
  'qual', 'quais', 'como', 'quando', 'onde', 'por que', 'porque', 'quem', 'quanto', 'quantos', 'quantas',
  'o que', 'voce', 'voces', 'pode', 'poderia', 'existe', 'tem '
];

/** Frases que são perguntas: terminam em "?" ou começam com palavra interrogativa. */
export function extractQuestions(texts: string[]): string[] {
  return texts
    .map(t => t.trim())
    .filter(t => t.endsWith('?') || QUESTION_STARTS.some(start => plain(t).startsWith(start)));
}

type Intent = 'problem' | 'audience' | 'value' | 'metric' | 'scope' | 'risk' | 'deadline' | 'budget' | 'integration' | 'unknown';

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['metric', /metric|sucesso|medir|medem|resultado|indicador|\bmeta/],
  ['budget', /orcamento|custo|investimento|verba|quanto custa/],
  ['deadline', /prazo|quando|cronograma|\bdata\b/],
  ['risk', /risco|preocup|bloqueio/],
  ['integration', /integra|sistema|ferramenta|tecnologia|\bdados\b/],
  ['scope', /escopo|entrega|\bmvp\b|primeira versao|funcionalidade|incluir/],
  ['value', /valor|beneficio|proposta|diferencial|escolher/],
  ['audience', /quem usa|publico|usuario|cliente|persona|quem sofre|quem precisa/],
  ['problem', /problema|\bdor\b|desafio|oportunidade/]
];

const intentOf = (question: string): Intent => {
  const q = plain(question);
  return INTENT_PATTERNS.find(([, pattern]) => pattern.test(q))?.[0] ?? 'unknown';
};

const EXAMPLES: Record<Intent, string> = {
  problem: 'Exemplo ilustrativo: "Hoje a recepção gasta cerca de 2 horas por dia ligando para confirmar consultas, e mesmo assim 1 em cada 5 pacientes falta sem avisar."',
  audience: 'Exemplo ilustrativo: "Quem usa é a recepcionista da clínica, todos os dias, no início do expediente; o decisor é a gerente administrativa."',
  value: 'Exemplo ilustrativo: "Em vez de ligar paciente por paciente, a clínica confirma tudo em minutos e reduz as faltas."',
  metric: 'Exemplo ilustrativo: "Taxa de comparecimento: hoje 80%, meta de 92% em 3 meses, medida pela agenda."',
  scope: 'Exemplo ilustrativo: "Na primeira versão: lembrete automático e confirmação por mensagem. Fica para depois: remarcação pelo paciente."',
  risk: 'Exemplo ilustrativo: "Risco: pacientes ignorarem as mensagens. Mitigação: testar o horário e o canal com um grupo pequeno antes."',
  deadline: 'Exemplo ilustrativo: "Primeira versão em 3 meses, com um marco de validação no fim do primeiro mês."',
  budget: 'Exemplo ilustrativo: "Há uma verba de X para o semestre, aprovada por Y, com margem de ajuste de até Z%."',
  integration: 'Exemplo ilustrativo: "Hoje os dados vêm de uma planilha exportada do sistema de agenda uma vez por dia; a ideia é ler direto da agenda."',
  unknown: 'Exemplo ilustrativo: responda com um caso real recente: o que aconteceu, quem estava envolvido e qual foi o resultado.'
};

const MISSING_LABELS: Record<Intent, string> = {
  problem: 'o problema', audience: 'o público', value: 'a proposta de valor', metric: 'as métricas de sucesso', scope: 'o escopo',
  risk: 'os riscos', deadline: 'o prazo', budget: 'o orçamento', integration: 'as integrações e dados', unknown: 'essa informação'
};

const MISSING_ADVICE: Record<Intent, string> = {
  problem: 'descreva a situação atual, quem sofre com ela e o impacto',
  audience: 'diga quem usa, quem decide e com que frequência',
  value: 'diga o que muda para o usuário e por que escolheria esta solução',
  metric: 'diga a métrica principal, o valor de hoje e a meta',
  scope: 'separe o que entra na primeira entrega do que fica para depois',
  risk: 'liste o que pode dar errado e como evitar ou reduzir',
  deadline: 'diga a data desejada e o que a justifica',
  budget: 'diga o valor disponível, quem aprova e se há margem',
  integration: 'liste os sistemas envolvidos, os dados que trafegam e a frequência',
  unknown: 'responda com um fato concreto do passado recente, não com uma opinião'
};

/** O que o projeto já registra sobre cada tema, vindo do PRD (vazio se o usuário ainda não escreveu). */
function prdFact(project: DiscoveryProject, intent: Intent): string {
  const prd = project.prd;
  switch (intent) {
    case 'problem': return (prd.problemStatement || project.description || '').trim();
    case 'audience': return prd.targetAudience.trim();
    case 'value': return prd.valueProposition.trim();
    case 'metric': return [prd.northStarMetric, ...prd.successMetrics].filter(Boolean).join('; ');
    case 'scope': return prd.inScope.join('; ');
    case 'risk': return prd.risksAndMitigations.map(r => r.risk).filter(Boolean).join('; ');
    default: return '';
  }
}

/**
 * Para cada pergunta, monta uma resposta a partir do que o projeto JÁ registra (PRD ou falas, citando a fonte),
 * mais um exemplo ilustrativo. Quando não há registro, diz isso e orienta como responder, sem inventar dados.
 */
export function suggestAnswers(project: DiscoveryProject, questions: string[]): AssistantAnswer[] {
  return questions.map(question => {
    const intent = intentOf(question);
    const fact = prdFact(project, intent);
    if (fact) {
      return { question, answer: `Pelo que está registrado no PRD: ${fact}`, example: EXAMPLES[intent] };
    }

    const hits = searchProjectKnowledge(project, question, 2);
    if (hits.length > 0) {
      const cited = hits.map(h => `Segundo ${h.source}: "${h.text}"`).join('\n');
      return { question, answer: cited, example: EXAMPLES[intent] };
    }

    return {
      question,
      answer: `Ainda não há informação sobre ${MISSING_LABELS[intent]} registrada no projeto. Para responder, ${MISSING_ADVICE[intent]}.`,
      example: EXAMPLES[intent]
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Alinhamento: tópicos com ideias embaixo
// ---------------------------------------------------------------------------------------------

const THEMES: { title: string; pattern: RegExp }[] = [
  { title: 'Prazo e cronograma', pattern: /\b(prazo|cronograma|entrega|fase|sprint|semana|deadline|marco|lancamento)/g },
  { title: 'Orçamento e custos', pattern: /\b(orcamento|custo|verba|investimento|preco|caro|pagar|gasto)/g },
  { title: 'Escopo e prioridades', pattern: /\b(escopo|funcionalidade|requisito|mvp|prioridade|prioriz|incluir|feature)/g },
  { title: 'Pessoas e responsabilidades', pattern: /\b(responsavel|equipe|time|contrat|freelancer|papel|dono|quem vai)/g },
  { title: 'Riscos e dependências', pattern: /\b(risco|bloqueio|dependenc|atraso|preocup|impedimento)/g },
  { title: 'Tecnologia e integrações', pattern: /\b(sistema|integra|api|banco de dados|servidor|tecnologia|ferramenta|plataforma)/g },
  { title: 'Usuários e clientes', pattern: /\b(usuario|cliente|publico|persona|paciente)/g },
  { title: 'Qualidade e testes', pattern: /\b(teste|qualidade|bug|erro|validac)/g }
];

const OTHER_TOPIC = 'Outros pontos';

/** Agrupa o que foi dito em tópicos por tema; cada frase vira uma ideia embaixo do tópico. */
export function groupTopics(texts: string[]): AssistantTopic[] {
  const byTitle = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const raw of texts) {
    const sentence = raw.trim();
    if (sentence.length < MIN_SENTENCE_LENGTH || seen.has(sentence)) continue;
    seen.add(sentence);

    const text = plain(sentence);
    let best = { title: OTHER_TOPIC, matches: 0 };
    for (const theme of THEMES) {
      const matches = (text.match(theme.pattern) ?? []).length;
      if (matches > best.matches) best = { title: theme.title, matches };
    }
    byTitle.set(best.title, [...(byTitle.get(best.title) ?? []), sentence]);
  }

  const order = [...THEMES.map(t => t.title), OTHER_TOPIC];
  return order
    .filter(title => byTitle.has(title))
    .map(title => ({ title, ideas: byTitle.get(title)! }))
    .sort((a, b) => (a.title === OTHER_TOPIC ? 1 : b.title === OTHER_TOPIC ? -1 : b.ideas.length - a.ideas.length));
}

// ---------------------------------------------------------------------------------------------
// Discovery: perguntas profundas para o PRD e a SPEC
// ---------------------------------------------------------------------------------------------

interface ProbeRule {
  pattern: RegExp;
  probe: AssistantProbe;
}

const SPEC_RULES: ProbeRule[] = [
  {
    pattern: /integr|sistema|planilha|\bapi\b|\berp\b|banco de dados/,
    probe: { target: 'spec', question: 'Com quais sistemas isso se integra, que dados trafegam entre eles e com que frequência?', why: 'A SPEC precisa dos contratos de integração: origem, formato e periodicidade dos dados.' }
  },
  {
    pattern: /regra|sempre|nunca|exce[cç]/,
    probe: { target: 'spec', question: 'Quais são as exceções a essa regra e o que deve acontecer quando ela falha?', why: 'Regras de negócio sem exceções definidas viram bugs; a SPEC precisa dos casos de borda.' }
  },
  {
    pattern: /perfil|permiss|acesso|login|aprov/,
    probe: { target: 'spec', question: 'Quais perfis de usuário existem e o que cada um pode ver, criar e aprovar?', why: 'A SPEC precisa da matriz de permissões por perfil.' }
  },
  {
    pattern: /\bdado|cadastro|campo|informac/,
    probe: { target: 'spec', question: 'Quais informações (campos) são obrigatórias, de onde vêm e quem pode alterá-las?', why: 'A SPEC precisa do modelo de dados: entidades, campos e origem de cada um.' }
  },
  {
    pattern: /volume|rapid|lent|milhares|por dia|por mes|tempo de resposta/,
    probe: { target: 'spec', question: 'Qual volume, tempo de resposta e disponibilidade são aceitáveis para isso funcionar bem?', why: 'Requisitos não funcionais (desempenho e disponibilidade) precisam de números na SPEC.' }
  },
  {
    pattern: /erro|falha|\blog\b|auditoria|rastre/,
    probe: { target: 'spec', question: 'O que precisa ser registrado para auditoria e como o sistema deve reagir a erros?', why: 'A SPEC precisa de regras de registro (auditoria) e de tratamento de falhas.' }
  }
];

const PRD_RULES: ProbeRule[] = [
  {
    pattern: /problema|\bdor\b|dificuldade|demora|atraso|perda/,
    probe: { target: 'prd', question: 'Na última vez que isso aconteceu, quanto tempo, dinheiro ou retrabalho custou? E quantas vezes por mês acontece?', why: 'O PRD precisa de um problema quantificado para justificar a prioridade.' }
  },
  {
    pattern: /usuario|cliente|pessoa|equipe|recepc|paciente/,
    probe: { target: 'prd', question: 'Quem exatamente passa por isso, em que momento do dia e como resolve hoje?', why: 'O PRD precisa de um público específico e do contexto de uso.' }
  },
  {
    pattern: /botao|\btela\b|\bapp\b|aplicativo|dashboard|funcionalidade|quero um/,
    probe: { target: 'prd', question: 'O que você faz hoje, na prática, para resolver isso? Descreva a última vez, passo a passo.', why: 'Separa a necessidade real da solução sugerida (Mom Test): o que a pessoa faz hoje vale mais do que o que ela diz que faria.' }
  },
  {
    pattern: /\d+ ?(%|horas|dias|reais|r\$|mil)/,
    probe: { target: 'prd', question: 'De onde vem esse número e como ele foi medido?', why: 'Números sem origem enfraquecem as metas e as premissas do PRD.' }
  },
  {
    pattern: /prazo|\bmvp\b|primeira versao|escopo/,
    probe: { target: 'prd', question: 'O que precisa estar pronto na primeira entrega e o que pode esperar?', why: 'O PRD precisa separar o escopo da primeira entrega do que fica para depois.' }
  }
];

const GENERIC_PROBE: AssistantProbe = {
  target: 'prd',
  question: 'Pode me contar, passo a passo, a última vez em que isso aconteceu na prática?',
  why: 'Mom Test: fatos concretos do passado recente revelam mais do que opiniões.'
};

function gapProbes(project: DiscoveryProject): AssistantProbe[] {
  const prd = project.prd;
  const gaps: AssistantProbe[] = [];
  if (prd.successMetrics.length === 0 && !prd.northStarMetric) {
    gaps.push({ target: 'prd', question: 'Hoje, que número vocês olham para saber se isso está bom ou ruim? Qual foi o valor no último mês?', why: 'O PRD ainda não tem métricas de sucesso.' });
  }
  if (prd.inScope.length === 0) {
    gaps.push({ target: 'prd', question: 'O que entra e o que fica de fora da primeira versão?', why: 'O PRD ainda não define o escopo.' });
  }
  if (prd.assumptions.length === 0) {
    gaps.push({ target: 'prd', question: 'Qual parte disso vocês acreditam ser verdade, mas nunca mediram ou confirmaram com dados? Qual foi a última vez que alguém conferiu?', why: 'O PRD ainda não registra premissas.' });
  }
  return gaps;
}

/**
 * Perguntas profundas para o discovery, a partir do que acabou de ser dito e do que falta no PRD. Mistura
 * perguntas de negócio (PRD) e de comportamento técnico (SPEC), sem repetir o que já foi perguntado.
 */
export function deepProbes(project: DiscoveryProject, texts: string[], alreadyAsked: string[]): AssistantProbe[] {
  const said = plain(texts.join(' \n '));
  const asked = new Set(alreadyAsked);
  const fresh = (list: AssistantProbe[]) => list.filter(p => !asked.has(p.question));

  const triggeredSpec = fresh(SPEC_RULES.filter(r => r.pattern.test(said)).map(r => r.probe));
  const triggeredPrd = fresh(PRD_RULES.filter(r => r.pattern.test(said)).map(r => r.probe));
  const gaps = texts.length > 0 ? fresh(gapProbes(project)) : [];

  const picked: AssistantProbe[] = [...triggeredSpec.slice(0, 2), ...triggeredPrd.slice(0, 2)];
  for (const candidate of [...triggeredSpec.slice(2), ...triggeredPrd.slice(2), ...gaps]) {
    if (picked.length >= MAX_PROBES) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }

  if (picked.length === 0 && !asked.has(GENERIC_PROBE.question)) picked.push(GENERIC_PROBE);
  return picked.slice(0, MAX_PROBES);
}

// ---------------------------------------------------------------------------------------------
// Refinamento
// ---------------------------------------------------------------------------------------------

const REFINEMENT_PROBES: AssistantProbe[] = [
  { target: 'spec', question: 'Qual é o critério de aceite observável que mostra que isso está pronto?', why: 'Sem critério de aceite, a história não pode ser verificada.' },
  { target: 'spec', question: 'De que outras partes do sistema ou de quais times essa entrega depende?', why: 'Dependências escondidas são a principal causa de atraso.' },
  { target: 'spec', question: 'É possível dividir isso em partes menores que entreguem valor sozinhas?', why: 'Histórias menores são mais fáceis de estimar e validar (INVEST).' },
  { target: 'spec', question: 'O que está de fora desta história e fica para depois?', why: 'Deixar o limite explícito evita que o escopo cresça sem querer.' },
  { target: 'spec', question: 'Que partes dessa entrega o time já fez antes, e quanto tempo levaram? O que é novo e ainda incerto?', why: 'A incerteza declarada mostra onde falta conversar antes de começar.' }
];

function refinementProbes(alreadyAsked: string[]): AssistantProbe[] {
  const asked = new Set(alreadyAsked);
  return REFINEMENT_PROBES.filter(p => !asked.has(p.question)).slice(0, MAX_PROBES);
}

// ---------------------------------------------------------------------------------------------
// Orquestração: regras locais ou IA
// ---------------------------------------------------------------------------------------------

/** Gera a ajuda do tipo de conversa só com regras locais, sem IA. */
export function assistOffline(
  mode: MeetingType,
  project: DiscoveryProject,
  segments: TranscriptSegment[],
  alreadyAsked: string[] = []
): AssistantOutput {
  const texts = segments.map(s => s.text);
  const base = {
    id: newId('ast'),
    mode,
    createdAt: new Date().toISOString(),
    source: 'offline' as const,
    basedOnSegmentIds: segments.map(s => s.id)
  };

  switch (mode) {
    case 'interview': return { ...base, answers: suggestAnswers(project, extractQuestions(texts)) };
    case 'alignment': return { ...base, topics: groupTopics(texts) };
    case 'refinement': return { ...base, probes: refinementProbes(alreadyAsked) };
    default: return { ...base, probes: deepProbes(project, texts, alreadyAsked) };
  }
}

/** Regras que toda pergunta de entrevista sugerida pela IA deve seguir (também usadas no prompt da análise ao vivo). */
export const INTERVIEW_QUESTION_RULES =
  'REGRAS PARA CADA PERGUNTA: (1) pergunte sobre fatos do passado recente, nunca sobre o que a pessoa faria, usaria ou pagaria; ' +
  '(2) cite as palavras do entrevistado entre aspas, para ancorar a pergunta no que ele disse; (3) peça número, data, nome, ' +
  'tempo ou o passo a passo do último caso, em vez de opinião ("o que você acha"); (4) evite perguntas de sim ou não e ' +
  'perguntas que sopram a resposta ("você não acha que..."); (5) uma pergunta só, sem juntar várias. ' +
  'Ruim: "Você usaria um app para isso?" Bom: "Quando foi a última vez que o fechamento travou? Quanto tempo levou para resolver?".';

const SYSTEM_PROMPTS: Record<MeetingType, string> = {
  interview:
    'Você é o assistente de quem está SENDO ENTREVISTADO (o Product Owner). Leia o trecho da conversa e, para cada pergunta ' +
    'feita ao PO, escreva uma resposta objetiva em português, usando SOMENTE os dados do contexto do projeto. Se o contexto não ' +
    'tiver o dado, diga que falta e oriente como responder; nunca invente números. Dê também um exemplo concreto, começando por ' +
    '"Exemplo ilustrativo:". Responda só com JSON: {"answers":[{"question":"...","answer":"...","example":"..."}]}.',
  alignment:
    'Você acompanha uma reunião de ALINHAMENTO. Leia o trecho e organize o que foi dito em tópicos, com as ideias e decisões ' +
    'embaixo de cada tópico, em português e sem inventar nada que não foi dito. Responda só com JSON: ' +
    '{"topics":[{"title":"...","ideas":["...","..."]}]}.',
  discovery:
    'Você acompanha uma entrevista de DISCOVERY conduzida pelo Product Owner. Leia o trecho e sugira até 4 perguntas profundas ' +
    'e específicas (Mom Test, 5 porquês), pensando no que falta para escrever o PRD (problema, público, métricas, escopo, riscos) ' +
    'e a SPEC (dados, regras, integrações, permissões, exceções, requisitos não funcionais). Não repita perguntas já feitas. ' +
    INTERVIEW_QUESTION_RULES + ' ' +
    'Responda só com JSON: {"probes":[{"question":"...","why":"...","target":"prd"|"spec"}]}.',
  refinement:
    'Você acompanha uma reunião de REFINAMENTO. Leia o trecho e sugira até 4 perguntas sobre critérios de aceite, dependências, ' +
    'divisão em partes menores, limites de escopo e incertezas de estimativa. Não repita perguntas já feitas. Responda só com JSON: ' +
    '{"probes":[{"question":"...","why":"...","target":"spec"}]}.'
};

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function parseAiOutput(mode: MeetingType, parsed: any): Pick<AssistantOutput, 'answers' | 'topics' | 'probes'> {
  if (mode === 'interview') {
    const answers = (Array.isArray(parsed?.answers) ? parsed.answers : [])
      .map((a: any) => ({ question: asText(a?.question), answer: asText(a?.answer), example: asText(a?.example) }))
      .filter((a: AssistantAnswer) => a.question && a.answer);
    return { answers };
  }
  if (mode === 'alignment') {
    const topics = (Array.isArray(parsed?.topics) ? parsed.topics : [])
      .map((t: any) => ({
        title: asText(t?.title),
        ideas: (Array.isArray(t?.ideas) ? t.ideas : []).map(asText).filter(Boolean)
      }))
      .filter((t: AssistantTopic) => t.title && t.ideas.length > 0);
    return { topics };
  }
  const valid: AssistantProbe[] = (Array.isArray(parsed?.probes) ? parsed.probes : [])
    .map((p: any) => ({ question: asText(p?.question), why: asText(p?.why), target: p?.target }))
    .filter((p: AssistantProbe) => p.question && (p.target === 'prd' || p.target === 'spec'));
  // Tira as perguntas subjetivas (hipotéticas, de opinião, indutivas) que a IA ainda assim devolver
  const probes = (mode === 'discovery' ? filterQuestions(valid) : valid).slice(0, MAX_PROBES);
  return { probes };
}

/** Gera a ajuda com a IA quando há chave; sem chave, ou se a IA falhar, usa as regras locais. */
export async function assist(
  mode: MeetingType,
  project: DiscoveryProject,
  segments: TranscriptSegment[],
  alreadyAsked: string[]
): Promise<AssistantOutput> {
  if (!storageService.getApiKey()) return assistOffline(mode, project, segments, alreadyAsked);

  try {
    const recent = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    const asked = alreadyAsked.length ? `\n\nPERGUNTAS JÁ FEITAS (não repetir):\n${alreadyAsked.map(q => `- ${q}`).join('\n')}` : '';
    const raw = await callAI({
      systemPrompt: SYSTEM_PROMPTS[mode],
      userPrompt: `CONTEXTO DO PROJETO:\n${buildProjectContext(project)}${asked}\n\nTRECHO RECENTE DA CONVERSA:\n${recent}`,
      temperature: 0.4
    });
    return {
      id: newId('ast'),
      mode,
      createdAt: new Date().toISOString(),
      source: 'ai',
      basedOnSegmentIds: segments.map(s => s.id),
      ...parseAiOutput(mode, parseJsonLoose(raw))
    };
  } catch (e: unknown) {
    console.warn('Assistente: a IA falhou, usando regras locais:', e);
    return { ...assistOffline(mode, project, segments, alreadyAsked), error: (e as { message?: string } | null)?.message || 'Erro ao consultar a IA.' };
  }
}

// ---------------------------------------------------------------------------------------------
// Controle na sala (grava na sessão)
// ---------------------------------------------------------------------------------------------

export function setSessionType(projectId: string, sessionId: string, type: MeetingType): DiscoveryProject | undefined {
  return storageService.updateProject(projectId, p => ({
    ...p,
    sessions: p.sessions.map(s => (s.id === sessionId ? { ...s, type } : s))
  }));
}

/** Liga ou desliga o assistente. Ao ligar, ele passa a ouvir dali em diante, sem reler o que já foi dito. */
export function setAssistantEnabled(projectId: string, sessionId: string, enabled: boolean): DiscoveryProject | undefined {
  return storageService.updateProject(projectId, p => ({
    ...p,
    sessions: p.sessions.map(s => {
      if (s.id !== sessionId) return s;
      const lastSpoken = s.rawTranscript[s.rawTranscript.length - 1]?.id;
      return {
        ...s,
        assistant: {
          enabled,
          lastSegmentId: enabled ? lastSpoken : s.assistant?.lastSegmentId,
          outputs: s.assistant?.outputs ?? []
        }
      };
    })
  }));
}

const running = new Set<string>();

/**
 * Roda o assistente sobre as falas novas da sala (até 12) e guarda o resultado. Sem fala nova não faz nada,
 * a menos que `force` peça uma análise das últimas falas. Duas execuções ao mesmo tempo na mesma sala não se
 * atropelam: a segunda é ignorada.
 */
export async function runAssistant(
  projectId: string,
  sessionId: string,
  options: { force?: boolean } = {}
): Promise<DiscoveryProject | undefined> {
  const key = `${projectId}:${sessionId}`;
  if (running.has(key)) return undefined;

  const project = storageService.getAllProjects().find(p => p.id === projectId);
  const session = project?.sessions.find(s => s.id === sessionId);
  if (!project || !session) return undefined;

  const all = session.rawTranscript;
  const lastIndex = session.assistant?.lastSegmentId ? all.findIndex(s => s.id === session.assistant?.lastSegmentId) : -1;
  let fresh = all.slice(lastIndex + 1);
  if (fresh.length === 0) {
    if (!options.force || all.length === 0) return undefined;
    fresh = all.slice(-6);
  }
  const segments = fresh.slice(-MAX_SEGMENTS_PER_RUN);
  const lastSeen = all[all.length - 1]?.id;

  running.add(key);
  try {
    const previous = (session.assistant?.outputs ?? []).flatMap(o => o.probes?.map(p => p.question) ?? []);
    const asked = [...previous, ...session.liveQuestions.map(q => q.question)];
    const output = await assist(session.type ?? 'discovery', project, segments, asked);

    return storageService.updateProject(projectId, p => ({
      ...p,
      sessions: p.sessions.map(s => (s.id !== sessionId ? s : {
        ...s,
        assistant: {
          enabled: s.assistant?.enabled ?? false,
          lastSegmentId: lastSeen ?? s.assistant?.lastSegmentId,
          outputs: [...(s.assistant?.outputs ?? []), output].slice(-MAX_OUTPUTS)
        }
      }))
    }));
  } finally {
    running.delete(key);
  }
}
