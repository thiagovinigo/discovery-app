import { newId } from './ids';
import type { BacklogSnapshot, DiscoveryProject } from '../types/discovery';

/** Quantas mudanças ficam disponíveis para desfazer. Cada uma guarda uma cópia do backlog, então o limite é baixo. */
const MAX_SNAPSHOTS = 5;

const sameBacklog = (a: DiscoveryProject, b: DiscoveryProject): boolean =>
  a === b || (a.epics === b.epics && a.okrs === b.okrs) || JSON.stringify([a.okrs, a.epics]) === JSON.stringify([b.okrs, b.epics]);

/**
 * Aplica `change` ao projeto guardando antes uma cópia do backlog (OKRs, épicos, features, histórias e tasks),
 * para a mudança poder ser desfeita. Se a mudança não alterar o backlog, nada é guardado.
 */
export function changeWithSnapshot(
  project: DiscoveryProject,
  label: string,
  at: string,
  change: (project: DiscoveryProject) => DiscoveryProject
): DiscoveryProject {
  const next = change(project);
  if (sameBacklog(project, next)) return next;

  const snapshot: BacklogSnapshot = {
    id: newId('snap'),
    at,
    label,
    okrs: structuredClone(project.okrs),
    epics: structuredClone(project.epics)
  };
  return { ...next, backlogHistory: [snapshot, ...(project.backlogHistory ?? [])].slice(0, MAX_SNAPSHOTS) };
}

/** A mudança mais recente que ainda pode ser desfeita. */
export function lastSnapshot(project: DiscoveryProject): BacklogSnapshot | undefined {
  return project.backlogHistory?.[0];
}

/** Devolve o backlog ao estado anterior à última mudança e remove esse instantâneo. O resto do projeto não muda. */
export function undoLast(project: DiscoveryProject): { project: DiscoveryProject; undone?: BacklogSnapshot } {
  const [undone, ...rest] = project.backlogHistory ?? [];
  if (!undone) return { project, undone: undefined };
  return {
    project: { ...project, okrs: structuredClone(undone.okrs), epics: structuredClone(undone.epics), backlogHistory: rest },
    undone
  };
}
