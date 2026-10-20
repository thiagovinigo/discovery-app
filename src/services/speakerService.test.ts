import { describe, expect, it } from 'vitest';
import { applySuggestions, assignSpeaker, suggestSpeakers } from './speakerService';
import type { MeetingSession, Stakeholder, TranscriptSegment } from '../types/discovery';

let counter = 0;
const seg = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder', extra: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id: `sp${++counter}`, speaker, text, timestamp: '00:10', isFinal: true, ...extra
});

const person = (id: string, name: string): Stakeholder => ({ id, name, role: 'usuario', interest: 'alto', influence: 'medio', createdAt: '2026-01-01' });
const ANA = person('sh-ana', 'Ana Souza');
const BRUNO = person('sh-bruno', 'Bruno Lima');

const session = (segments: TranscriptSegment[]): MeetingSession => ({
  id: 's1', title: 'Reunião', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: []
});

describe('suggestSpeakers', () => {
  it('sem pessoas cadastradas, não há o que sugerir', () => {
    expect(suggestSpeakers(session([seg('Aqui é a Ana')]), [])).toEqual([]);
  });

  it('quem se apresenta é identificado pelo nome', () => {
    const s = session([seg('Oi, aqui é a Ana, eu cuido do financeiro'), seg('Meu nome é Bruno e sou do suporte')]);

    const result = suggestSpeakers(s, [ANA, BRUNO]);

    expect(result.map(r => [r.segmentId, r.stakeholderId])).toEqual([
      [s.rawTranscript[0].id, 'sh-ana'], [s.rawTranscript[1].id, 'sh-bruno']
    ]);
    expect(result[0].reason).toMatch(/apresent/i);
  });

  it('a fala seguinte a alguém chamado pelo nome é atribuída a essa pessoa', () => {
    const s = session([seg('Obrigado, Bruno. E sobre o prazo?', 'Entrevistador (PM)'), seg('O prazo é curto demais')]);

    const result = suggestSpeakers(s, [ANA, BRUNO]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ segmentId: s.rawTranscript[1].id, stakeholderId: 'sh-bruno' });
    expect(result[0].reason).toMatch(/chamad/i);
  });

  it('não sugere para falas que já têm quem falou', () => {
    const s = session([seg('Aqui é a Ana', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-bruno' })]);

    expect(suggestSpeakers(s, [ANA, BRUNO])).toEqual([]);
  });

  it('nome repetido entre duas pessoas é ambíguo e não gera sugestão', () => {
    const s = session([seg('Aqui é a Ana')]);

    expect(suggestSpeakers(s, [ANA, person('sh-ana2', 'Ana Paula')])).toEqual([]);
  });

  it('citar o nome de alguém no meio de um relato não vira sugestão', () => {
    const s = session([seg('Ontem a Ana me mandou a planilha errada'), seg('O problema se repete')]);

    expect(suggestSpeakers(s, [ANA, BRUNO])).toEqual([]);
  });
});

describe('assignSpeaker', () => {
  it('marca quem disse a fala sem alterar a original', () => {
    const base = session([seg('Uma fala')]);
    const id = base.rawTranscript[0].id;

    const next = assignSpeaker(base, id, 'sh-ana');

    expect(next.rawTranscript[0].speakerStakeholderId).toBe('sh-ana');
    expect(base.rawTranscript[0].speakerStakeholderId).toBeUndefined();
  });

  it('fala sem identificação passa a ser do entrevistado ao receber uma pessoa', () => {
    const base = session([seg('Uma fala', 'Desconhecido')]);

    expect(assignSpeaker(base, base.rawTranscript[0].id, 'sh-ana').rawTranscript[0].speaker).toBe('Usuário / Stakeholder');
  });

  it('limpa a atribuição quando recebe undefined', () => {
    const base = session([seg('Uma fala', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' })]);

    expect(assignSpeaker(base, base.rawTranscript[0].id, undefined).rawTranscript[0].speakerStakeholderId).toBeUndefined();
  });

  it('id desconhecido devolve a mesma sessão', () => {
    const base = session([seg('Uma fala')]);

    expect(assignSpeaker(base, 'nope', 'sh-ana')).toBe(base);
  });
});

describe('applySuggestions', () => {
  it('aplica todas as sugestões, sem sobrescrever o que já estava atribuído', () => {
    const s = session([seg('Aqui é a Ana'), seg('Meu nome é Bruno', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' })]);
    const suggestions = [
      { segmentId: s.rawTranscript[0].id, stakeholderId: 'sh-ana', reason: 'x' },
      { segmentId: s.rawTranscript[1].id, stakeholderId: 'sh-bruno', reason: 'y' }
    ];

    const next = applySuggestions(s, suggestions);

    expect(next.rawTranscript.map(r => r.speakerStakeholderId)).toEqual(['sh-ana', 'sh-ana']);
  });
});
