import { validationOf } from './backlogItemService';
import type { BacklogMeta, DiscoveryProject, Epic, Feature, UserStory, ValidationStatus } from '../types/discovery';

export interface ExportOptions {
  /** Itens invalidados ficam de fora do export, a menos que se peça o contrário. */
  includeInvalidated?: boolean;
}

const STATUS_LABELS: Record<ValidationStatus, string> = {
  hypothesis: 'hipótese',
  validated: 'validado',
  contested: 'contestado',
  invalidated: 'invalidado'
};

/** Rótulo curto do estado de validação, para etiquetas dos exports. */
export const validationLabel = (item: BacklogMeta): string => STATUS_LABELS[validationOf(item)];

/**
 * Linhas de rastreabilidade de um item para os exports: estado de validação com a citação que o sustenta, de onde
 * veio o fatiamento e quem criou. Item sem nada disso (hipótese sem origem, dados antigos) não gera linhas,
 * então a saída dos exports só muda para quem tem esses dados.
 */
export function traceLines(item: BacklogMeta): string[] {
  const lines: string[] = [];
  const status = validationOf(item);

  if (status !== 'hypothesis') {
    lines.push(`Validação: ${STATUS_LABELS[status]}`);
    const wanted = status === 'contested' ? 'contests' : 'confirms';
    const evidences = (item.validation?.evidences ?? []).filter(e => e.stance === wanted);
    const evidence = evidences[evidences.length - 1];
    if (evidence) {
      const where = [evidence.sessionTitle, evidence.timestamp].filter(Boolean).join(', ');
      lines.push(`Evidência: "${evidence.quote}"${where ? ` (${where})` : ''}`);
    }
  }

  if (item.sliceOf) {
    const note = [...(item.changes ?? [])].reverse().find(c => c.summary.startsWith('Fatiada de'));
    lines.push(note ? `Fatiado: ${note.summary}` : `Fatiado do item ${item.sliceOf}`);
  }

  if (item.origin) {
    lines.push(`Origem: ${item.origin.author === 'ai' ? 'IA' : 'usuário'}${item.origin.quote ? ` — "${item.origin.quote}"` : ''}`);
  }

  return lines;
}

const isInvalidated = (item: BacklogMeta): boolean => validationOf(item) === 'invalidated';

/**
 * Devolve o projeto sem os épicos, features, histórias e tasks invalidados (e tudo que há dentro deles), para os
 * exports. Se nada for removido, devolve o próprio projeto. Não altera o original.
 */
export function withoutInvalidated(project: DiscoveryProject, options: ExportOptions = {}): DiscoveryProject {
  if (options.includeInvalidated) return project;

  let removed = false;
  const keep = <T extends BacklogMeta>(items: T[]): T[] => {
    const kept = items.filter(item => !isInvalidated(item));
    if (kept.length !== items.length) removed = true;
    return kept;
  };

  const epics: Epic[] = keep(project.epics).map(epic => ({
    ...epic,
    features: keep(epic.features).map(
      (feature): Feature => ({
        ...feature,
        userStories: keep(feature.userStories).map((story): UserStory => ({ ...story, tasks: keep(story.tasks) }))
      })
    )
  }));

  return removed ? { ...project, epics } : project;
}
