import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageService } from '../services/storageService';
import type { DiscoveryProject } from '../types/discovery';

interface ProjectsSnapshot {
  projects: DiscoveryProject[];
  activeId: string | null;
}

export interface UseProjectsOptions {
  /** Chamado quando projetos foram recuperados do IndexedDB durante a carga inicial. */
  onRestored?: () => void;
}

const NO_PROJECTS: DiscoveryProject[] = [];

/** Lê o storage de uma vez. Se o id ativo salvo não existe mais, o ativo é o primeiro projeto. */
function readSnapshot(): ProjectsSnapshot {
  const projects = storageService.getAllProjects();
  const stored = storageService.getActiveProjectId();
  const activeId = projects.some(p => p.id === stored) ? stored : (projects[0]?.id ?? null);
  return { projects, activeId };
}

/**
 * Fonte única do estado de projetos na interface. O storage continua sendo a persistência, e este hook guarda
 * apenas uma cópia da lista; o projeto ativo é DERIVADO dela, então nunca diverge da lista.
 * Toda escrita passa por aqui (ou por um serviço seguido de `refresh`).
 */
export function useProjects(options: UseProjectsOptions = {}) {
  const [snapshot, setSnapshot] = useState<ProjectsSnapshot | null>(null);

  // O callback pode mudar a cada render; o efeito de carga roda uma vez e lê o mais recente por aqui
  const onRestoredRef = useRef(options.onRestored);
  useEffect(() => {
    onRestoredRef.current = options.onRestored;
  });

  const refresh = useCallback(() => setSnapshot(readSnapshot()), []);

  // Carga inicial: antes de ler, recupera do IndexedDB o que o localStorage perdeu
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await storageService.restoreFromIndexedDb();
      // Avisa mesmo se esta execução foi cancelada: no StrictMode a seguinte já encontraria tudo restaurado
      if (restored) onRestoredRef.current?.();
      if (!cancelled) refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const select = useCallback((id: string) => {
    storageService.setActiveProjectId(id);
    refresh();
  }, [refresh]);

  const create = useCallback((name: string, description: string): DiscoveryProject => {
    const created = storageService.createNewProject(name, description);
    refresh();
    return created;
  }, [refresh]);

  /** Importa um projeto exportado em JSON. Lança erro se o arquivo for inválido. */
  const importFromJson = useCallback((json: string): DiscoveryProject => {
    const imported = storageService.importProject(json);
    refresh();
    return imported;
  }, [refresh]);

  const remove = useCallback((projectId: string) => {
    storageService.deleteProject(projectId);
    refresh();
  }, [refresh]);

  const reset = useCallback((): DiscoveryProject => {
    const clean = storageService.resetForOfficialTests();
    refresh();
    return clean;
  }, [refresh]);

  /** Grava o projeto inteiro (substitui o de mesmo id). */
  const saveProject = useCallback((project: DiscoveryProject) => {
    storageService.saveActiveProject(project);
    refresh();
  }, [refresh]);

  /** Atualiza um projeto por id, de forma imutável, a partir do estado mais recente do storage. */
  const update = useCallback((projectId: string, change: (project: DiscoveryProject) => DiscoveryProject) => {
    const updated = storageService.updateProject(projectId, change);
    refresh();
    return updated;
  }, [refresh]);

  const activeProject = useMemo(
    () => snapshot?.projects.find(p => p.id === snapshot.activeId) ?? null,
    [snapshot]
  );

  return {
    projects: snapshot?.projects ?? NO_PROJECTS,
    activeProject,
    ready: snapshot !== null,
    refresh,
    select,
    create,
    importFromJson,
    remove,
    reset,
    saveProject,
    update
  };
}
