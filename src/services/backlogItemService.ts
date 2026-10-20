import type { BacklogMeta, Epic, ItemChange, ValidationEvidence, ValidationStatus } from '../types/discovery';

export interface ValidationCounts extends Record<ValidationStatus, number> {
  total: number;
}

/** Estado de validação do item; sem metadados (dados antigos) conta como hipótese. */
export function validationOf(item: BacklogMeta): ValidationStatus {
  return item.validation?.status ?? 'hypothesis';
}

/** Estado que a evidência mais recente indica. Em empate de data vale a última registrada. */
function statusFromEvidences(evidences: ValidationEvidence[]): ValidationStatus {
  let latest = evidences[0];
  for (const evidence of evidences) if (evidence.at >= latest.at) latest = evidence;
  return latest.stance === 'confirms' ? 'validated' : 'contested';
}

/**
 * Acrescenta uma fala que confirma ou contesta o item e recalcula o estado pela evidência mais recente.
 * Item invalidado continua invalidado (essa decisão é do PO), mas a evidência fica guardada.
 */
export function recordEvidence<T extends BacklogMeta>(item: T, evidence: ValidationEvidence): T {
  const evidences = [...(item.validation?.evidences ?? []), evidence];
  const status = validationOf(item) === 'invalidated' ? 'invalidated' : statusFromEvidences(evidences);
  return { ...item, validation: { status, evidences } };
}

export function logChange<T extends BacklogMeta>(item: T, summary: string, at: string, sessionId?: string): T {
  const change: ItemChange = sessionId ? { at, summary, sessionId } : { at, summary };
  return { ...item, changes: [...(item.changes ?? []), change] };
}

/** Descarta o item do ponto de vista de validação, sem apagá-lo, e registra no histórico. */
export function invalidate<T extends BacklogMeta>(item: T, at: string): T {
  const marked: T = { ...item, validation: { status: 'invalidated', evidences: item.validation?.evidences ?? [] } };
  return logChange(marked, 'Item invalidado', at);
}

/** Registra de onde o item veio. Quem já tem origem a mantém. */
export function stampOrigin<T extends BacklogMeta>(
  item: T,
  origin: { author: 'ai' | 'user'; sessionId?: string; quote?: string; timestamp?: string },
  createdAt: string
): T {
  if (item.origin) return item;
  return { ...item, origin: { ...origin, createdAt } };
}

export interface ContestedItem {
  level: 'épico' | 'feature' | 'história';
  title: string;
  /** Fala mais recente que contesta o item. */
  quote?: string;
  sessionTitle?: string;
}

/** Épicos, features e histórias contestados. Continuam no backlog; aqui só são listados com a citação que os contesta. */
export function contestedItems(epics: Epic[]): ContestedItem[] {
  const items: ContestedItem[] = [];
  const add = (level: ContestedItem['level'], title: string, item: BacklogMeta) => {
    if (validationOf(item) !== 'contested') return;
    const contesting = (item.validation?.evidences ?? []).filter(e => e.stance === 'contests');
    const last = contesting[contesting.length - 1];
    items.push({ level, title, quote: last?.quote, sessionTitle: last?.sessionTitle });
  };
  for (const epic of epics) {
    add('épico', epic.title, epic);
    for (const feature of epic.features) {
      add('feature', feature.title, feature);
      for (const story of feature.userStories) add('história', story.title, story);
    }
  }
  return items;
}

/** Quantos itens, nos 4 níveis, estão em cada estado de validação. */
export function validationSummary(epics: Epic[]): ValidationCounts {
  const counts: ValidationCounts = { hypothesis: 0, validated: 0, contested: 0, invalidated: 0, total: 0 };
  const count = (item: BacklogMeta) => {
    counts[validationOf(item)]++;
    counts.total++;
  };
  for (const epic of epics) {
    count(epic);
    for (const feature of epic.features) {
      count(feature);
      for (const story of feature.userStories) {
        count(story);
        story.tasks.forEach(count);
      }
    }
  }
  return counts;
}
