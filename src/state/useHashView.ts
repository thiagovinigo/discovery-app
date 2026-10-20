import { useCallback, useEffect, useState } from 'react';
import type { AppView } from '../components/Sidebar';

// Registro exaustivo: se uma tela nova entrar em `AppView` e faltar aqui, o TypeScript acusa.
const VIEW_REGISTRY: Record<AppView, true> = {
  projects: true,
  project_hub: true,
  brain_dashboard: true,
  live_room: true,
  meetings: true,
  backlog: true,
  documentation: true,
  refine: true,
  po_space: true,
  product_audit: true,
  knowledge_hub: true,
  agent_studio: true,
  stakeholders: true,
  interview: true,
  notes: true,
  agenda: true
};

export const APP_VIEWS = Object.keys(VIEW_REGISTRY) as AppView[];

const HOME: AppView = 'projects';
const HOME_HASH = '#/';

/** `#/backlog` vira `backlog`; hash vazio ou `#/` é a tela inicial; qualquer outra coisa não é uma tela (`null`). */
export function viewFromHash(hash: string): AppView | null {
  if (hash === '' || hash === '#' || hash === HOME_HASH) return HOME;
  const match = /^#\/([a-z_]+)$/.exec(hash);
  const name = match?.[1] as AppView | undefined;
  return name && name in VIEW_REGISTRY ? name : null;
}

export function hashForView(view: AppView): string {
  return view === HOME ? HOME_HASH : `#/${view}`;
}

/**
 * A tela ativa vive na URL (`#/backlog`): o botão voltar do navegador funciona, recarregar mantém a tela e dá para
 * abrir um link direto. Um hash desconhecido cai na tela inicial. Sem dependência de biblioteca de rotas.
 */
export function useHashView(): [AppView, (view: AppView) => void] {
  const [view, setViewState] = useState<AppView>(() => viewFromHash(window.location.hash) ?? HOME);

  useEffect(() => {
    const onHashChange = () => setViewState(viewFromHash(window.location.hash) ?? HOME);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setView = useCallback((next: AppView) => {
    setViewState(next);
    const hash = hashForView(next);
    const alreadyThere = viewFromHash(window.location.hash) === next;
    if (!alreadyThere) window.location.hash = hash;
  }, []);

  return [view, setView];
}
