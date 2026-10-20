import type { Proposal } from '../services/backlogProposals';
import type { MeetingType } from '../types/discovery';

/** Pacote de propostas da IA esperando o usuário revisar. Fica guardado para sobreviver a recarregar a página. */
export interface PendingReview {
  projectId: string;
  /** Reunião de onde veio a geração, se houver. */
  sessionId?: string;
  /** Tipo da conversa, que define quais propostas aparecem primeiro. */
  type?: MeetingType;
  proposals: Proposal[];
}

const KEY = 'discovery_done_pending_review_v1';

const isPendingReview = (value: unknown): value is PendingReview => {
  const candidate = value as Partial<PendingReview> | null;
  return !!candidate && typeof candidate.projectId === 'string' && Array.isArray(candidate.proposals);
};

export function savePendingReview(review: PendingReview): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(review));
  } catch (e) {
    console.warn('Não foi possível guardar o pacote de revisão do backlog:', e);
  }
}

export function loadPendingReview(): PendingReview | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPendingReview(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingReview(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento: nada a limpar */
  }
}
