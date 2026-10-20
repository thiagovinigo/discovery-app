import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { planBacklogMerge } from '../services/backlogMerge';
import { applyProposals, mergeStories, planBacklogProposals } from '../services/backlogProposals';
import { changeWithSnapshot, lastSnapshot, undoLast } from '../services/backlogHistoryService';
import { applyEvidence, suggestEvidence } from '../services/evidenceService';
import type { EvidenceSuggestion } from '../services/evidenceService';
import { buildGenerationInput } from '../services/generationInput';
import { sliceStory } from '../services/slicingService';
import type { StorySlicePart } from '../services/slicingService';
import type { PendingReview } from './pendingReviewStore';
import type { DiscoveryProject, MeetingSession, UserStory } from '../types/discovery';

type NoticeType = 'error' | 'info' | 'success';

export interface BacklogActionsDeps {
  project: DiscoveryProject;
  session?: MeetingSession;
  pendingReview: PendingReview | null;
  pendingEvidence: { projectId: string; suggestions: EvidenceSuggestion[] } | null;
  /** História aberta na janela de fatiar. */
  slicingStory?: UserStory;
  /** Reuniões que alimentam a geração do backlog. Vazio ou ausente: só a sala ativa. */
  generationSessions?: MeetingSession[];
  /** Aplica uma mudança ao projeto (sobre o estado mais recente) e grava. */
  update: (projectId: string, change: (project: DiscoveryProject) => DiscoveryProject) => void;
  showNotice: (type: NoticeType, text: string) => void;
  setPendingReview: (review: PendingReview | null) => void;
  setPendingEvidence: (pending: { projectId: string; suggestions: EvidenceSuggestion[] } | null) => void;
  setSlicingStoryId: (id: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  openBacklog: () => void;
}

const UNDO_HINT = 'Dá para desfazer no painel de saúde do backlog.';

/**
 * Ações sobre o backlog: gerar propostas com a IA, aplicar a revisão, registrar evidências, fatiar, mesclar duplicadas e
 * desfazer. Toda mudança grande passa por `changeWithSnapshot`, então pode ser desfeita. Não é um hook: o `App` a chama
 * depois de garantir que existe um projeto.
 */
export function createBacklogActions(deps: BacklogActionsDeps) {
  const { project, session, update, showNotice } = deps;

  const handleSliceStory = (parts: StorySlicePart[]) => {
    const story = deps.slicingStory;
    if (!story) return;
    const at = new Date().toISOString();
    try {
      update(project.id, p =>
        changeWithSnapshot(p, `Fatiou "${story.title}" em ${parts.length} histórias`, at, q => ({
          ...q,
          epics: sliceStory(q.epics, story.id, parts, { at, sessionId: session?.id })
        }))
      );
      deps.setSlicingStoryId(null);
      showNotice('success', `História fatiada em ${parts.length}. ${UNDO_HINT}`);
    } catch (e: unknown) {
      showNotice('error', e instanceof Error ? e.message : 'Não foi possível fatiar a história.');
    }
  };

  const handleMergeDuplicate = (keepId: string, dropId: string) => {
    const at = new Date().toISOString();
    update(project.id, p =>
      changeWithSnapshot(p, 'Mesclou histórias duplicadas', at, q => ({ ...q, epics: mergeStories(q.epics, keepId, dropId, { at, sessionId: session?.id }) }))
    );
    showNotice('success', `Histórias mescladas. ${UNDO_HINT}`);
  };

  const handleUndoBacklog = () => {
    const snapshot = lastSnapshot(project);
    if (!snapshot) return;
    update(project.id, p => undoLast(p).project);
    showNotice('info', `Desfeito: ${snapshot.label}.`);
  };

  const handleFindEvidence = () => {
    const suggestions = suggestEvidence(project);
    if (suggestions.length === 0) {
      deps.setPendingEvidence(null);
      showNotice('info', 'Nenhuma fala nova nas reuniões confirma ou contesta itens do backlog.');
      return;
    }
    deps.setPendingEvidence({ projectId: project.id, suggestions });
  };

  const handleApplyEvidence = (acceptedIds: string[]) => {
    if (!deps.pendingEvidence) return;
    const { suggestions } = deps.pendingEvidence;
    const at = new Date().toISOString();
    update(project.id, p =>
      changeWithSnapshot(p, `Registrou ${acceptedIds.length} evidência(s) de reunião`, at, q => ({ ...q, epics: applyEvidence(q.epics, suggestions, acceptedIds, at) }))
    );
    deps.setPendingEvidence(null);
    showNotice('success', `${acceptedIds.length} evidência(s) registrada(s) no backlog.`);
  };

  const handleApplyReview = (acceptedIds: string[]) => {
    if (!deps.pendingReview) return;
    const { proposals, sessionId } = deps.pendingReview;
    const at = new Date().toISOString();
    update(project.id, p =>
      changeWithSnapshot(p, `Aplicou ${acceptedIds.length} proposta(s) da IA`, at, q => {
        const next = applyProposals({ okrs: q.okrs, epics: q.epics, prd: q.prd }, proposals, acceptedIds, { at, sessionId });
        return { ...q, okrs: next.okrs, epics: next.epics };
      })
    );
    deps.setPendingReview(null);
    showNotice('success', `${acceptedIds.length} de ${proposals.length} proposta(s) aplicada(s) ao backlog.`);
  };

  const handleGenerateBacklogWithAI = async () => {
    deps.setIsGenerating(true);
    try {
      // As reuniões escolhidas pelo usuário; sem escolha, só a sala ativa
      const sources = deps.generationSessions?.length ? deps.generationSessions : session ? [session] : [];
      const input = buildGenerationInput(sources);
      const hasKey = !!storageService.getApiKey();
      const result = await geminiService.generateFullBacklogAndPRD(
        project.name + ' - ' + project.description,
        input.transcript,
        input.painPoints,
        input.jtbds
      );

      if (result.source === 'offline') {
        showNotice('error', result.error || 'Não foi possível gerar com a IA.');
        // Com chave configurada, a falha não deve sobrescrever dados do usuário com exemplo
        if (hasKey) return;
      } else {
        showNotice('success', 'Backlog e PRD gerados com a IA.');
      }

      // Nada entra no backlog sem o aceite do usuário: a IA gera propostas item a item, e a tela de revisão
      // aplica só as aceitas, sobre o estado mais recente (o que ele editou durante a geração não é pisado).
      const latest = storageService.getAllProjects().find(p => p.id === project.id) ?? project;
      const latestData = { okrs: latest.okrs, epics: latest.epics, prd: latest.prd };

      // O PRD só é preenchido quando ainda é um rascunho vazio; um PRD que o usuário escreveu não é tocado.
      const prd = planBacklogMerge(latestData, result).merged.prd;
      if (prd !== latest.prd) update(project.id, p => ({ ...p, prd }));

      const proposals = planBacklogProposals(latestData, result);
      deps.openBacklog();
      if (proposals.length === 0) {
        deps.setPendingReview(null);
        showNotice('info', 'A IA não trouxe nada novo nem diferente para o backlog.');
      } else {
        deps.setPendingReview({ projectId: project.id, sessionId: session?.id, type: session?.type, proposals });
        showNotice('info', `A IA fez ${proposals.length} proposta(s) para o backlog. Revise e aplique o que quiser.`);
      }
    } catch (e: unknown) {
      console.error(e);
      showNotice('error', e instanceof Error ? e.message : 'Erro inesperado ao gerar o backlog.');
    } finally {
      deps.setIsGenerating(false);
    }
  };

  return {
    handleSliceStory,
    handleMergeDuplicate,
    handleUndoBacklog,
    handleFindEvidence,
    handleApplyEvidence,
    handleApplyReview,
    handleGenerateBacklogWithAI
  };
}
