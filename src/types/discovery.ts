export type PriorityLevel = 'high' | 'medium' | 'low';

export interface TranscriptSegment {
  id: string;
  speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder' | 'Desconhecido';
  text: string;
  timestamp: string; // e.g. "04:12"
  isFinal: boolean;
  /** Stakeholder cadastrado que disse a fala, quando a sala sabia quem estava falando. */
  speakerStakeholderId?: string;
  highlightType?: 'pain' | 'jtbd' | 'solution' | 'metric';
}

export interface LiveQuestionSuggestion {
  id: string;
  question: string;
  reason: string; // Por que fazer essa pergunta agora
  category: 'mom_test' | 'five_whys' | 'jtbd' | 'quantification' | 'premature_solution' | 'risk_validation';
  asked: boolean;
  timestamp: string;
}

export interface PainPoint {
  id: string;
  description: string;
  severity: PriorityLevel;
  quote?: string;
  frequencyScore: number;
}

export interface JTBDItem {
  id: string;
  context: string; // Quando [contexto]
  job: string;     // Eu quero [job]
  outcome: string; // Para que [outcome]
  frequency: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'topic' | 'pain' | 'jtbd' | 'opportunity' | 'solution' | 'metric';
  x: number;
  y: number;
  notes?: string;
  children?: string[]; // IDs
  color?: string;
  /** Nó de quem este é ramo. Sem pai, o nó é filho direto da raiz. */
  parentId?: string;
  /** Escrito ou editado pelo usuário: a análise automática não o apaga nem o sobrescreve. */
  manual?: boolean;
  /** Fala que originou o nó, com quem disse e quando. */
  quote?: string;
  speaker?: string;
  timestamp?: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface UserFlowStep {
  id: string;
  stepNumber: number;
  title: string;
  actor: string;
  systemAction: string;
  painPointDetected?: string;
  frictionLevel: 'smooth' | 'warning' | 'critical';
  notes?: string;
  /** Fala do entrevistado que originou a etapa. */
  quote?: string;
  /** O que melhorar nesta etapa. */
  opportunity?: string;
  /** Etapa escrita ou editada pelo usuário: a análise não a sobrescreve. */
  manual?: boolean;
}

export interface AcceptanceCriteria {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/** `hypothesis`: sem evidência; `validated`: uma reunião confirmou; `contested`: uma fala contradiz; `invalidated`: descartado. */
export type ValidationStatus = 'hypothesis' | 'validated' | 'contested' | 'invalidated';

/** Uma fala que confirma ou contesta um item do backlog. */
export interface ValidationEvidence {
  stance: 'confirms' | 'contests';
  quote: string;
  sessionId?: string;
  sessionTitle?: string;
  timestamp?: string;
  /** Quando a evidência foi registrada, em ISO-8601. */
  at: string;
}

export interface ItemChange {
  /** ISO-8601. */
  at: string;
  summary: string;
  sessionId?: string;
}

/**
 * Metadados comuns aos 4 níveis do backlog (épico, feature, história e task). Todos opcionais: item sem
 * `validation` conta como `hypothesis` e sem `origin` como de origem desconhecida, então dados antigos abrem como estão.
 */
export interface BacklogMeta {
  origin?: { author: 'ai' | 'user'; sessionId?: string; quote?: string; timestamp?: string; createdAt: string };
  validation?: { status: ValidationStatus; evidences: ValidationEvidence[] };
  /** Última verificação de qualidade, em ISO-8601. */
  verifiedAt?: string;
  /** Id do item de origem quando este nasceu de um fatiamento. */
  sliceOf?: string;
  changes?: ItemChange[];
}

export interface TechnicalTask extends BacklogMeta {
  id: string;
  title: string;
  type: 'frontend' | 'backend' | 'database' | 'analytics' | 'qa' | 'infra';
  status: 'todo' | 'in_progress' | 'done';
  estimatedHours?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export type DomainCategory = 'checkout' | 'onboarding' | 'security' | 'operations' | 'core' | 'analytics';

export interface UserStory extends BacklogMeta {
  id: string;
  featureId: string;
  title: string;
  asA: string;
  iWantTo: string;
  soThat: string;
  acceptanceCriteria: AcceptanceCriteria[];
  tasks: TechnicalTask[];
  storyPoints?: number;
  domain?: DomainCategory;
  evidenceQuote?: {
    speaker: string;
    text: string;
    timestamp?: string;
    sessionTitle?: string;
  };
  dorChecklist?: ChecklistItem[];
  dodChecklist?: ChecklistItem[];
  isBug?: boolean;
}

export interface Feature extends BacklogMeta {
  id: string;
  epicId: string;
  title: string;
  description: string;
  valueProposition: string;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
  domain?: DomainCategory;
  riceScore?: {
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    total: number;
  };
  userStories: UserStory[];
}

export interface Epic extends BacklogMeta {
  id: string;
  title: string;
  objective: string;
  businessValue: string;
  targetDate?: string;
  status: 'discovery' | 'ready_for_dev' | 'in_progress' | 'done';
  features: Feature[];
}

export interface OKR {
  id: string;
  objective: string;
  keyResults: {
    id: string;
    description: string;
    baseline: string;
    target: string;
    current: string;
  }[];
}

export interface PRDDocument {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  problemStatement: string;
  targetAudience: string;
  valueProposition: string;
  /** Métrica que mede o valor real entregue ao usuário final. Opcional: só existe se o usuário a informou. */
  northStarMetric?: string;
  inScope: string[];
  outOfScope: string[];
  successMetrics: string[];
  assumptions: string[];
  risksAndMitigations: { risk: string; mitigation: string }[];
}

export interface LeanCanvas {
  problem: string[];
  existingAlternatives: string[];
  customerSegments: string[];
  earlyAdopters: string[];
  uniqueValueProposition: string;
  highLevelConcept: string;
  solution: string[];
  channels: string[];
  revenueStreams: string[];
  costStructure: string[];
  keyMetrics: string[];
  unfairAdvantage: string;
}

/** Cópia do backlog tirada antes de uma mudança grande (revisão, evidência, mescla, fatiamento), para poder desfazer. */
export interface BacklogSnapshot {
  id: string;
  /** ISO-8601. */
  at: string;
  /** O que a mudança fez, para o botão de desfazer dizer o que desfaz. */
  label: string;
  okrs: OKR[];
  epics: Epic[];
}

export interface DecisionLogEntry {
  id: string;
  date: string;
  decision: string;
  context: string;
  driver: string; // Quem ou qual insight motivou
  consequences: string;
  status: 'approved' | 'superseded' | 'revisiting';
}

export interface MeetingSession {
  id: string;
  title: string;
  date: string;
  durationSeconds: number;
  participants: string[];
  rawTranscript: TranscriptSegment[];
  summary: {
    tldr: string;
    mainTakeaways: string[];
    actionItems: { item: string; owner: string; deadline: string }[];
    goldenQuotes: { speaker: string; quote: string; context: string }[];
  };
  liveQuestions: LiveQuestionSuggestion[];
  painPoints: PainPoint[];
  jtbds: JTBDItem[];
  mindMapNodes: MindMapNode[];
  mindMapEdges: MindMapEdge[];
  userFlowSteps: UserFlowStep[];
  /** Stakeholders cadastrados que participam desta reunião. */
  participantIds?: string[];
  /** Stakeholder que está falando agora; as próximas falas de "Usuário / Stakeholder" levam este id. */
  currentSpeakerId?: string;
  /** Reunião agendada que originou esta sala. */
  scheduledMeetingId?: string;
  /** Objetivo e pauta combinados na agenda; aparecem na sala. */
  objective?: string;
  agenda?: string[];
  /** Ids de nós gerados automaticamente que o usuário apagou, para a análise não os recriar. */
  mindMapHiddenIds?: string[];
  /** Etapas da jornada tiradas da conversa que o usuário apagou; a análise não as traz de volta. */
  userFlowHiddenIds?: string[];
  type?: MeetingType;
  assistant?: AssistantState;
}

export type StakeholderRole = 'decisor' | 'patrocinador' | 'usuario' | 'especialista' | 'impactado' | 'outro';
export type StakeholderLevel = 'baixo' | 'medio' | 'alto';

export interface Stakeholder {
  id: string;
  name: string;
  role: StakeholderRole;
  organization?: string;
  jobTitle?: string;
  interest: StakeholderLevel;
  influence: StakeholderLevel;
  /** Como prefere ser contatado. */
  contact?: string;
  notes?: string;
  createdAt: string;
}

/** Anotação livre do projeto, opcionalmente ligada a um stakeholder, reunião ou história. */
export interface ProjectNote {
  id: string;
  text: string;
  tags: string[];
  stakeholderId?: string;
  sessionId?: string;
  storyId?: string;
  /** Decisão do Decision Log criada a partir desta anotação. */
  decisionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipo da conversa, que define o que o assistente faz:
 * - `discovery`: o PO entrevista; o assistente sugere perguntas profundas para o PRD e a SPEC.
 * - `interview`: o PO é entrevistado; o assistente responde às perguntas e dá exemplos.
 * - `alignment`: reunião de alinhamento; o assistente organiza tópicos com ideias embaixo.
 * - `refinement`: refinamento; o assistente levanta critérios de aceite, dúvidas de escopo e dependências.
 */
export type MeetingType = 'discovery' | 'interview' | 'alignment' | 'refinement';

export interface AssistantAnswer {
  question: string;
  answer: string;
  example: string;
}

export interface AssistantTopic {
  title: string;
  ideas: string[];
}

export interface AssistantProbe {
  question: string;
  why: string;
  /** O que a resposta alimenta: o PRD (negócio) ou a SPEC (comportamento técnico). */
  target: 'prd' | 'spec';
}

export interface AssistantOutput {
  id: string;
  mode: MeetingType;
  createdAt: string;
  /** 'ai' = resposta da IA; 'offline' = gerada por regras locais, sem IA. */
  source: 'ai' | 'offline';
  error?: string;
  /** Ids das falas que o assistente leu para gerar isto. */
  basedOnSegmentIds: string[];
  answers?: AssistantAnswer[];
  topics?: AssistantTopic[];
  probes?: AssistantProbe[];
}

export interface AssistantState {
  /** Quando ligado, o assistente analisa cada fala nova da reunião. */
  enabled: boolean;
  lastSegmentId?: string;
  outputs: AssistantOutput[];
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  type: MeetingType;
  /** Data e hora marcadas, em ISO-8601. */
  startsAt: string;
  objective: string;
  agenda: string[];
  participantIds: string[];
  status: 'scheduled' | 'started' | 'cancelled';
  /** Sala criada quando a reunião foi iniciada. */
  sessionId?: string;
  createdAt: string;
}

/** Respostas dadas ao copiloto entrevistador, por etapa. */
export interface InterviewState {
  answers: Record<string, string>;
  skipped: string[];
  completedAt?: string;
}

export interface PersonaItem {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  segment: string;
  goals: string[];
  painPoints: string[];
  jtbds: string[];
  quotes: string[];
}

export interface BugReportItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  speaker: string;
  quote: string;
  sessionTitle: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
}

export interface DiscoveryProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  activeSessionId?: string;
  sessions: MeetingSession[];
  okrs: OKR[];
  epics: Epic[];
  prd: PRDDocument;
  leanCanvas: LeanCanvas;
  decisionLog: DecisionLogEntry[];
  personas?: PersonaItem[];
  bugReports?: BugReportItem[];
  stakeholders?: Stakeholder[];
  notes?: ProjectNote[];
  scheduledMeetings?: ScheduledMeeting[];
  interview?: InterviewState;
  /** Mais recente primeiro. */
  backlogHistory?: BacklogSnapshot[];
}
