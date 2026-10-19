import { storageService } from './storageService';
import { callAI, parseJsonLoose } from './aiClient';
import { heuristicAnalysis, mockBacklogAndPRD } from './ai/heuristics';
import { normalizeEpics, normalizeOkrs, normalizePrd } from './ai/normalizers';
import { BACKLOG_SYSTEM_PROMPT, LIVE_ANALYSIS_SYSTEM_PROMPT } from './ai/prompts';
import type { AnalysisResponse, BacklogResponse } from './ai/types';
import type { JTBDItem, PainPoint } from '../types/discovery';

export type { AnalysisResponse, BacklogResponse, ResultSource } from './ai/types';

const errorMessage = (e: unknown, fallback: string): string => (e as { message?: string } | null)?.message || fallback;

/** Fachada das chamadas de IA do app: monta o pedido, trata a resposta e cai na heurística offline quando preciso. */
export const geminiService = {
  async testApiKey(apiKey: string, model?: string, provider?: 'openai' | 'gemini'): Promise<{ success: boolean; message: string }> {
    if (!apiKey) return { success: false, message: 'Chave de API não informada.' };
    const activeProvider = provider || (apiKey.startsWith('sk-') ? 'openai' : storageService.getAiProvider());
    const activeModel = model || (activeProvider === 'openai' ? storageService.getOpenAiModel() : storageService.getGeminiModel());
    try {
      await callAI({
        provider: activeProvider,
        apiKey,
        model: activeModel,
        retries: 0,
        json: false,
        userPrompt: 'Responda apenas "OK" em português se você está ativo.'
      });
      const provName = activeProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
      return { success: true, message: `Conexão com ${provName} (${activeModel}) estabelecida com sucesso!` };
    } catch (e: unknown) {
      return { success: false, message: errorMessage(e, 'Falha de conexão com a API de IA.') };
    }
  },

  async analyzeLiveConversation(
    recentTranscripts: { speaker: string; text: string }[],
    projectContext: string
  ): Promise<AnalysisResponse> {
    const apiKey = storageService.getApiKey();
    const model = storageService.getModel();
    const provider = storageService.getAiProvider();

    const conversationText = recentTranscripts
      .map(t => `${t.speaker}: "${t.text}"`)
      .join('\n');

    // A heurística olha só o que foi dito: com o rótulo do falante, "Usuário" disparava a regra de cliente
    const spokenText = recentTranscripts.map(t => t.text).join('\n');

    if (!apiKey) {
      return { ...heuristicAnalysis(spokenText), source: 'offline' };
    }

    try {
      const rawText = await callAI({
        provider,
        apiKey,
        model,
        systemPrompt: LIVE_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: `Contexto do Projeto: ${projectContext}\n\nTrecho recente da conversa:\n${conversationText}`
      });

      const parsed = parseJsonLoose(rawText);
      return {
        source: 'ai',
        newQuestions: (parsed.newQuestions || []).map((q: any, i: number) => ({ ...q, id: 'gem-q-' + Date.now() + '-' + i })),
        newPainPoints: (parsed.newPainPoints || []).map((p: any, i: number) => ({ ...p, id: 'gem-p-' + Date.now() + '-' + i })),
        newJtbds: (parsed.newJtbds || []).map((j: any, i: number) => ({ ...j, id: 'gem-j-' + Date.now() + '-' + i })),
        newMindMapNodes: (parsed.newMindMapNodes || []).map((m: any, i: number) => ({
          ...m,
          id: 'gem-m-' + Date.now() + '-' + i,
          x: 200 + (Math.random() * 400),
          y: 100 + (Math.random() * 300)
        })),
        newUserFlowSteps: (parsed.newUserFlowSteps || []).map((s: any, i: number) => ({ ...s, id: 'gem-s-' + Date.now() + '-' + i }))
      };
    } catch (e: unknown) {
      console.warn('Erro ao processar com IA, acionando heurística offline:', e);
      return {
        ...heuristicAnalysis(spokenText),
        source: 'offline',
        error: errorMessage(e, 'Erro inesperado ao processar com a IA.')
      };
    }
  },

  async generateFullBacklogAndPRD(
    projectContext: string,
    allTranscripts: string,
    painPoints: PainPoint[],
    jtbds: JTBDItem[]
  ): Promise<BacklogResponse> {
    const apiKey = storageService.getApiKey();
    const model = storageService.getModel();
    const provider = storageService.getAiProvider();

    if (!apiKey) {
      return {
        ...mockBacklogAndPRD(projectContext),
        source: 'offline',
        error: 'Nenhuma chave de API configurada: exibindo backlog de exemplo.'
      };
    }

    try {
      const rawText = await callAI({
        provider,
        apiKey,
        model,
        systemPrompt: BACKLOG_SYSTEM_PROMPT,
        userPrompt: `Projeto: ${projectContext}\n\nDores: ${JSON.stringify(painPoints)}\n\nJTBDs: ${JSON.stringify(jtbds)}\n\nTranscrições:\n${allTranscripts.slice(0, 20000)}`
      });

      const parsed = parseJsonLoose(rawText);
      const epics = normalizeEpics(parsed.epics);
      const prd = normalizePrd(parsed.prd, projectContext);
      if (epics.length === 0 || !prd) {
        throw new Error('A IA não retornou épicos/PRD utilizáveis. Tente novamente com mais conteúdo na conversa.');
      }
      return { okrs: normalizeOkrs(parsed.okrs), epics, prd, source: 'ai' };
    } catch (e: unknown) {
      console.error('Falha na geração do backlog com IA:', e);
      return {
        ...mockBacklogAndPRD(projectContext),
        source: 'offline',
        error: errorMessage(e, 'Erro inesperado ao gerar o backlog.')
      };
    }
  }
};
