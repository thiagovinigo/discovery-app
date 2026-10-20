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
  type: 'root' | 'pain' | 'jtbd' | 'opportunity' | 'solution' | 'metric';
  x: number;
  y: number;
  notes?: string;
  children?: string[]; // IDs
  color?: string;
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
}

export interface AcceptanceCriteria {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

export interface TechnicalTask {
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

export interface UserStory {
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

export interface Feature {
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

export interface Epic {
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
  type?: MeetingType;
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
  createdAt: string;
  updatedAt: string;
}

export type MeetingType = 'discovery' | 'alignment' | 'refinement';

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
}
