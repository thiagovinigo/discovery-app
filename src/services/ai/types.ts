import type { LiveQuestionSuggestion, PainPoint, JTBDItem, MindMapNode, UserFlowStep, Epic, OKR, PRDDocument } from '../../types/discovery';

/** 'ai' = resposta real do Gemini; 'offline' = heurística/mock local (sem chave ou com erro). */
export type ResultSource = 'ai' | 'offline';

export interface AnalysisResponse {
  newQuestions: LiveQuestionSuggestion[];
  newPainPoints: PainPoint[];
  newJtbds: JTBDItem[];
  newMindMapNodes: MindMapNode[];
  newUserFlowSteps: UserFlowStep[];
  source?: ResultSource;
  error?: string;
}

export interface BacklogResponse {
  okrs: OKR[];
  epics: Epic[];
  prd: PRDDocument;
  source?: ResultSource;
  error?: string;
}
