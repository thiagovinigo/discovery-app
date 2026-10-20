import { describe, expect, it } from 'vitest';
import { applyEvidence, suggestEvidence } from './evidenceService';
import { recordEvidence, validationOf } from './backlogItemService';
import type { DiscoveryProject, Epic, MeetingSession, TranscriptSegment, UserStory } from '../types/discovery';

const segment = (id: string, text: string, over: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id, speaker: 'Usuário / Stakeholder', text, timestamp: '04:12', isFinal: true, ...over
});

const session = (segments: TranscriptSegment[], over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 'sess-1', title: 'Kickoff', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

const story = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Exportar relatório em PDF', asA: 'diretor', iWantTo: 'exportar o relatório', soThat: 'enviar ao conselho',
  acceptanceCriteria: [], tasks: [], ...over
});

const epicsWith = (stories: UserStory[]): Epic[] => [{
  id: 'e1', title: 'Relatórios', objective: 'Dar visibilidade à diretoria', businessValue: '', status: 'discovery',
  features: [{ id: 'f1', epicId: 'e1', title: 'Exportação', description: 'Exportar dados', valueProposition: '', effort: 'S', userStories: stories }]
}];

const project = (segments: TranscriptSegment[], stories: UserStory[] = [story()], extra: Partial<DiscoveryProject> = {}): DiscoveryProject =>
  ({ id: 'p1', name: 'P', description: '', sessions: [session(segments)], epics: epicsWith(stories), stakeholders: [], ...extra } as unknown as DiscoveryProject);

const NOW = '2026-03-01T10:00:00.000Z';

describe('suggestEvidence', () => {
  it('uma fala que fala do item e demonstra necessidade confirma o item, com citação, reunião e minuto', () => {
    const suggestions = suggestEvidence(project([segment('g1', 'Eu preciso exportar o relatório em PDF toda semana')]));

    expect(suggestions).toEqual([expect.objectContaining({
      level: 'história', itemId: 's1', itemTitle: 'Exportar relatório em PDF', stance: 'confirms',
      quote: 'Eu preciso exportar o relatório em PDF toda semana', sessionId: 'sess-1', sessionTitle: 'Kickoff', timestamp: '04:12'
    })]);
  });

  it('uma fala que nega a necessidade contesta o item', () => {
    const [suggestion] = suggestEvidence(project([segment('g1', 'Na verdade não preciso exportar o relatório em PDF')]));

    expect(suggestion.stance).toBe('contests');
  });

  it('ignora as falas do entrevistador', () => {
    const suggestions = suggestEvidence(project([segment('g1', 'Você precisa exportar o relatório em PDF toda semana?', { speaker: 'Entrevistador (PM)' })]));

    expect(suggestions).toEqual([]);
  });

  it('fala sem sinal de necessidade ou de rejeição não vira evidência', () => {
    expect(suggestEvidence(project([segment('g1', 'O relatório em PDF fica na pasta compartilhada')]))).toEqual([]);
  });

  it('fala com sinal, mas sobre outro assunto, não casa com o item', () => {
    expect(suggestEvidence(project([segment('g1', 'Preciso de um café toda semana')]))).toEqual([]);
  });

  it('não sugere de novo uma fala que já está registrada como evidência do item', () => {
    const quote = 'Eu preciso exportar o relatório em PDF toda semana';
    const already = recordEvidence(story(), { stance: 'confirms', quote, sessionId: 'sess-1', at: NOW });

    expect(suggestEvidence(project([segment('g1', quote)], [already]))).toEqual([]);
  });

  it('mostra o nome do stakeholder quando a sala sabia quem falou', () => {
    const p = project(
      [segment('g1', 'Eu preciso exportar o relatório em PDF toda semana', { speakerStakeholderId: 'stk-ana' })],
      [story()],
      { stakeholders: [{ id: 'stk-ana', name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto', createdAt: NOW }] }
    );

    expect(suggestEvidence(p)[0].speaker).toBe('Ana');
  });

  it('sem stakeholder, mostra o papel da fala', () => {
    expect(suggestEvidence(project([segment('g1', 'Eu preciso exportar o relatório em PDF toda semana')]))[0].speaker).toBe('Usuário / Stakeholder');
  });

  it('por item e por posição, guarda só a fala mais aderente', () => {
    const suggestions = suggestEvidence(project([
      segment('g1', 'Preciso exportar relatório'),
      segment('g2', 'Eu preciso exportar o relatório em PDF toda semana para enviar ao conselho')
    ]));

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].quote).toContain('para enviar ao conselho');
  });

  it('o mesmo texto pode confirmar uma história e também a feature e o épico que o contêm', () => {
    const levels = suggestEvidence(project([segment('g1', 'Preciso da exportação para dar visibilidade à diretoria no relatório')])).map(s => s.level);

    expect(levels.length).toBeGreaterThan(0);
    expect(new Set(levels).size).toBe(levels.length);
  });

  it('projeto sem reuniões ou sem backlog não sugere nada', () => {
    expect(suggestEvidence(project([]))).toEqual([]);
    expect(suggestEvidence(project([segment('g1', 'Eu preciso exportar o relatório em PDF')], []))).toEqual([]);
  });
});

describe('applyEvidence', () => {
  const quoteA = 'Eu preciso exportar o relatório em PDF toda semana';
  const base = () => project([segment('g1', quoteA)]);

  it('aplica a evidência aceita: o item vira validado, com a citação e o histórico', () => {
    const p = base();
    const [suggestion] = suggestEvidence(p);

    const epics = applyEvidence(p.epics, [suggestion], [suggestion.id], NOW);

    const updated = epics[0].features[0].userStories[0];
    expect(validationOf(updated)).toBe('validated');
    expect(updated.validation!.evidences).toEqual([
      expect.objectContaining({ stance: 'confirms', quote: quoteA, sessionId: 'sess-1', sessionTitle: 'Kickoff', timestamp: '04:12', at: NOW })
    ]);
    expect(updated.changes).toEqual([expect.objectContaining({ at: NOW, sessionId: 'sess-1', summary: expect.stringContaining('confirmada') })]);
  });

  it('o que não foi aceito não muda; "all" aceita tudo', () => {
    const p = base();
    const suggestions = suggestEvidence(p);

    expect(applyEvidence(p.epics, suggestions, [], NOW)).toEqual(p.epics);
    expect(validationOf(applyEvidence(p.epics, suggestions, 'all', NOW)[0].features[0].userStories[0])).toBe('validated');
  });

  it('item invalidado continua invalidado, mesmo com evidência aceita', () => {
    const invalidated = { ...story(), validation: { status: 'invalidated' as const, evidences: [] } };
    const p = project([segment('g1', quoteA)], [invalidated]);

    const epics = applyEvidence(p.epics, suggestEvidence(p), 'all', NOW);

    expect(validationOf(epics[0].features[0].userStories[0])).toBe('invalidated');
  });

  it('não altera o backlog original', () => {
    const p = base();
    const snapshot = JSON.stringify(p.epics);

    applyEvidence(p.epics, suggestEvidence(p), 'all', NOW);

    expect(JSON.stringify(p.epics)).toBe(snapshot);
  });
});
