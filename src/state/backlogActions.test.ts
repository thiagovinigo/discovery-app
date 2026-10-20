import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { changeWithSnapshot } from '../services/backlogHistoryService';
import { createBacklogActions } from './backlogActions';
import type { BacklogActionsDeps } from './backlogActions';
import type { PendingReview } from './pendingReviewStore';
import type { EvidenceSuggestion } from '../services/evidenceService';
import type { Proposal } from '../services/backlogProposals';
import type { AcceptanceCriteria, DiscoveryProject, Epic, MeetingSession, UserStory } from '../types/discovery';

vi.mock('../services/geminiService', () => ({ geminiService: { generateFullBacklogAndPRD: vi.fn() } }));
const generateMock = vi.mocked(geminiService.generateFullBacklogAndPRD);

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

const crit = (id: string): AcceptanceCriteria => ({ id, scenario: `Cenário ${id}`, given: 'g', when: 'w', then: 't' });
const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Gerenciar relatórios', asA: 'diretor', iWantTo: 'gerenciar', soThat: 'decidir',
  acceptanceCriteria: [crit('a'), crit('b')], tasks: [], storyPoints: 4, ...over
});
const epicWith = (stories: UserStory[]): Epic => ({
  id: 'e1', title: 'Relatórios', objective: 'obj', businessValue: 'bv', status: 'discovery',
  features: [{ id: 'f1', epicId: 'e1', title: 'Gestão', description: 'd', valueProposition: 'v', effort: 'M', userStories: stories }]
});

/** `update` grava no armazenamento real a função que a ação passou, como o `useProjects` faria. */
function setup(over: Partial<BacklogActionsDeps> = {}, withEpics: Epic[] = []) {
  if (withEpics.length) storageService.updateProject(projectId, p => ({ ...p, epics: withEpics }));
  const deps = {
    project: load(),
    session: undefined,
    pendingReview: null,
    pendingEvidence: null,
    slicingStory: undefined,
    update: vi.fn((id: string, fn: (p: DiscoveryProject) => DiscoveryProject) => {
      storageService.updateProject(id, fn);
    }),
    showNotice: vi.fn(),
    setPendingReview: vi.fn(),
    setPendingEvidence: vi.fn(),
    setSlicingStoryId: vi.fn(),
    setIsGenerating: vi.fn(),
    openBacklog: vi.fn(),
    ...over
  } satisfies BacklogActionsDeps;
  return { deps, actions: createBacklogActions(deps) };
}

beforeEach(() => {
  localStorage.clear();
  generateMock.mockReset();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('desfazer', () => {
  it('devolve o backlog ao estado anterior e diz o que foi desfeito', () => {
    const before = load();
    storageService.updateProject(projectId, p => changeWithSnapshot(p, 'Aplicou 2 propostas da IA', '2026-03-01T10:00:00.000Z', q => ({ ...q, epics: [epicWith([story()])] })));
    const { actions, deps } = setup({ project: load() });

    actions.handleUndoBacklog();

    expect(load().epics).toEqual(before.epics);
    expect(deps.showNotice).toHaveBeenCalledWith('info', 'Desfeito: Aplicou 2 propostas da IA.');
  });

  it('sem nada a desfazer, não faz nada', () => {
    const { actions, deps } = setup();

    actions.handleUndoBacklog();

    expect(deps.update).not.toHaveBeenCalled();
    expect(deps.showNotice).not.toHaveBeenCalled();
  });
});

describe('fatiar e mesclar', () => {
  it('fatiar troca a história pelas filhas, com instantâneo, e fecha a janela', () => {
    const original = story();
    const { actions, deps } = setup({ slicingStory: original }, [epicWith([original])]);

    actions.handleSliceStory([
      { title: 'Parte a', storyPoints: 2, criteriaIds: ['a'], taskIds: [] },
      { title: 'Parte b', storyPoints: 2, criteriaIds: ['b'], taskIds: [] }
    ]);

    const stories = load().epics[0].features[0].userStories;
    expect(stories.map(s => s.title)).toEqual(['Parte a', 'Parte b']);
    expect(load().backlogHistory?.[0].label).toBe('Fatiou "Gerenciar relatórios" em 2 histórias');
    expect(deps.setSlicingStoryId).toHaveBeenCalledWith(null);
  });

  it('fatiamento inválido mostra o motivo e mantém a janela aberta', () => {
    const original = story();
    const { actions, deps } = setup({ slicingStory: original }, [epicWith([original])]);

    actions.handleSliceStory([
      { title: 'Parte a', storyPoints: 1, criteriaIds: ['a'], taskIds: [] },
      { title: 'Parte b', storyPoints: 1, criteriaIds: ['b'], taskIds: [] }
    ]);

    expect(deps.showNotice).toHaveBeenCalledWith('error', expect.stringMatching(/pontos/i));
    expect(deps.setSlicingStoryId).not.toHaveBeenCalled();
    expect(load().epics[0].features[0].userStories).toHaveLength(1);
  });

  it('mesclar duplicadas junta as histórias e guarda o instantâneo', () => {
    const a = story({ id: 'a', title: 'Exportar relatório em PDF' });
    const b = story({ id: 'b', title: 'Exportar o relatório em PDF' });
    const { actions } = setup({}, [epicWith([a, b])]);

    actions.handleMergeDuplicate('a', 'b');

    expect(load().epics[0].features[0].userStories.map(s => s.id)).toEqual(['a']);
    expect(load().backlogHistory?.[0].label).toBe('Mesclou histórias duplicadas');
  });
});

describe('evidências', () => {
  const suggestion: EvidenceSuggestion = {
    id: 'ev:s1:sess-1:g1', level: 'história', itemId: 's1', itemTitle: 'Gerenciar relatórios', stance: 'confirms',
    quote: 'Preciso gerenciar relatórios', speaker: 'Ana', timestamp: '01:00', sessionId: 'sess-1', sessionTitle: 'Kickoff'
  };

  it('sem falas que casem, avisa e limpa as sugestões', () => {
    const { actions, deps } = setup();

    actions.handleFindEvidence();

    expect(deps.setPendingEvidence).toHaveBeenCalledWith(null);
    expect(deps.showNotice).toHaveBeenCalledWith('info', expect.stringContaining('Nenhuma fala nova'));
  });

  it('registrar as aceitas valida o item, guarda o instantâneo e limpa as sugestões', () => {
    const { actions, deps } = setup({ pendingEvidence: { projectId, suggestions: [suggestion] } }, [epicWith([story()])]);

    actions.handleApplyEvidence([suggestion.id]);

    expect(load().epics[0].features[0].userStories[0].validation?.status).toBe('validated');
    expect(load().backlogHistory?.[0].label).toBe('Registrou 1 evidência(s) de reunião');
    expect(deps.setPendingEvidence).toHaveBeenCalledWith(null);
  });

  it('sem sugestões pendentes, registrar não faz nada', () => {
    const { actions, deps } = setup();

    actions.handleApplyEvidence(['x']);

    expect(deps.update).not.toHaveBeenCalled();
  });
});

describe('revisão do que a IA propôs', () => {
  const addEpic: Proposal = { id: 'add:epic:root:novo', kind: 'add', level: 'epic', label: 'Novo', item: epicWith([]) };
  const pending = (): PendingReview => ({ projectId, proposals: [addEpic] });

  it('aplicar as aceitas muda o backlog, guarda o instantâneo e limpa o pacote', () => {
    const { actions, deps } = setup({ pendingReview: pending() });

    actions.handleApplyReview([addEpic.id]);

    expect(load().epics).toHaveLength(1);
    expect(load().backlogHistory?.[0].label).toBe('Aplicou 1 proposta(s) da IA');
    expect(deps.setPendingReview).toHaveBeenCalledWith(null);
    expect(deps.showNotice).toHaveBeenCalledWith('success', '1 de 1 proposta(s) aplicada(s) ao backlog.');
  });

  it('o que não foi aceito não entra', () => {
    const { actions } = setup({ pendingReview: pending() });

    actions.handleApplyReview([]);

    expect(load().epics).toHaveLength(0);
  });

  it('sem pacote pendente, não faz nada', () => {
    const { actions, deps } = setup();

    actions.handleApplyReview([addEpic.id]);

    expect(deps.update).not.toHaveBeenCalled();
  });
});

describe('gerar propostas com a IA', () => {
  it('guarda o pacote de propostas para revisar e abre o backlog, sem alterar o backlog', async () => {
    generateMock.mockResolvedValue({ okrs: [], epics: [epicWith([story()])], prd: load().prd, source: 'ai' } as never);
    const { actions, deps } = setup();

    await actions.handleGenerateBacklogWithAI();

    expect(load().epics).toEqual([]);
    expect(deps.setPendingReview).toHaveBeenCalledWith(expect.objectContaining({ projectId, proposals: [expect.objectContaining({ kind: 'add', level: 'epic' })] }));
    expect(deps.openBacklog).toHaveBeenCalled();
    expect(deps.setIsGenerating).toHaveBeenNthCalledWith(1, true);
    expect(deps.setIsGenerating).toHaveBeenLastCalledWith(false);
  });

  it('com várias sessões escolhidas, a IA recebe as falas de todas, cada uma sob o título da sua reunião', async () => {
    generateMock.mockResolvedValue({ okrs: [], epics: [], prd: load().prd, source: 'ai' } as never);
    const talk = (id: string, title: string, text: string): MeetingSession => ({
      ...storageService.createNewSession(projectId, title),
      id,
      rawTranscript: [{ id: `seg-${id}`, speaker: 'Usuário / Stakeholder', text, timestamp: '00:01', isFinal: true }],
      painPoints: [{ id: `p-${id}`, description: `Dor de ${title}`, severity: 'medium', frequencyScore: 1 }]
    });
    const { actions } = setup({ generationSessions: [talk('a', 'Kickoff', 'Primeira fala'), talk('b', 'Revisão', 'Segunda fala')] });

    await actions.handleGenerateBacklogWithAI();

    const [, transcript, pains] = generateMock.mock.calls[0];
    expect(transcript).toContain('### Reunião: Kickoff');
    expect(transcript).toContain('Primeira fala');
    expect(transcript).toContain('### Reunião: Revisão');
    expect(transcript).toContain('Segunda fala');
    expect(pains).toHaveLength(2);
  });

  it('sem sessões escolhidas, usa só a sala ativa, como antes', async () => {
    generateMock.mockResolvedValue({ okrs: [], epics: [], prd: load().prd, source: 'ai' } as never);
    const active = { ...storageService.createNewSession(projectId, 'Ativa'), rawTranscript: [{ id: 's', speaker: 'Usuário / Stakeholder' as const, text: 'Só esta', timestamp: '00:01', isFinal: true }] };
    const { actions } = setup({ session: active });

    await actions.handleGenerateBacklogWithAI();

    expect(generateMock.mock.calls[0][1]).toBe('Usuário / Stakeholder: Só esta');
  });

  it('falha da IA com chave configurada não gera pacote nem mexe no backlog', async () => {
    storageService.setApiKey('sk-teste');
    generateMock.mockResolvedValue({ okrs: [], epics: [epicWith([story()])], prd: load().prd, source: 'offline', error: 'cota excedida' } as never);
    const { actions, deps } = setup();

    await actions.handleGenerateBacklogWithAI();

    expect(deps.showNotice).toHaveBeenCalledWith('error', 'cota excedida');
    expect(deps.setPendingReview).not.toHaveBeenCalled();
    expect(deps.setIsGenerating).toHaveBeenLastCalledWith(false);
  });

  it('quando a IA não traz nada diferente, avisa e não abre revisão vazia', async () => {
    const same = epicWith([story()]);
    const { actions, deps } = setup({}, [same]);
    generateMock.mockResolvedValue({ okrs: [], epics: [same], prd: load().prd, source: 'ai' } as never);

    await actions.handleGenerateBacklogWithAI();

    expect(deps.setPendingReview).toHaveBeenCalledWith(null);
    expect(deps.showNotice).toHaveBeenCalledWith('info', 'A IA não trouxe nada novo nem diferente para o backlog.');
  });

  it('erro inesperado vira aviso e libera o botão', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    generateMock.mockRejectedValue(new Error('sem rede'));
    const { actions, deps } = setup();

    await actions.handleGenerateBacklogWithAI();

    expect(deps.showNotice).toHaveBeenCalledWith('error', 'sem rede');
    expect(deps.setIsGenerating).toHaveBeenLastCalledWith(false);
  });
});
