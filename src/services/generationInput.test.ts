import { describe, expect, it } from 'vitest';
import { buildGenerationInput } from './generationInput';
import type { JTBDItem, MeetingSession, PainPoint, TranscriptSegment } from '../types/discovery';

const seg = (id: string, speaker: TranscriptSegment['speaker'], text: string): TranscriptSegment => ({ id, speaker, text, timestamp: '00:01', isFinal: true });
const pain = (id: string, description: string): PainPoint => ({ id, description, severity: 'medium', frequencyScore: 1 });
const jtbd = (id: string, job: string): JTBDItem => ({ id, context: 'quando algo', job, outcome: 'para algo', frequency: 'semanal' });

const session = (id: string, title: string, over: Partial<MeetingSession> = {}): MeetingSession => ({
  id, title, date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

describe('buildGenerationInput', () => {
  it('sem sessões, a entrada vem vazia', () => {
    expect(buildGenerationInput([])).toEqual({ transcript: '', painPoints: [], jtbds: [], sessionCount: 0 });
  });

  it('com uma sessão, a transcrição é só as falas, como sempre foi', () => {
    const input = buildGenerationInput([session('s1', 'Kickoff', { rawTranscript: [seg('a', 'Entrevistador (PM)', 'Oi'), seg('b', 'Usuário / Stakeholder', 'Preciso disso')] })]);

    expect(input.transcript).toBe('Entrevistador (PM): Oi\nUsuário / Stakeholder: Preciso disso');
    expect(input.sessionCount).toBe(1);
  });

  it('com várias sessões, cada trecho vem sob o título da reunião de onde saiu', () => {
    const input = buildGenerationInput([
      session('s1', 'Kickoff', { rawTranscript: [seg('a', 'Usuário / Stakeholder', 'Primeira fala')] }),
      session('s2', 'Revisão', { rawTranscript: [seg('b', 'Usuário / Stakeholder', 'Segunda fala')] })
    ]);

    expect(input.transcript).toBe('### Reunião: Kickoff (01/01/2026)\nUsuário / Stakeholder: Primeira fala\n\n### Reunião: Revisão (01/01/2026)\nUsuário / Stakeholder: Segunda fala');
    expect(input.sessionCount).toBe(2);
  });

  it('junta as dores e os JTBDs de todas as sessões, sem repetir os iguais', () => {
    const input = buildGenerationInput([
      session('s1', 'A', { painPoints: [pain('p1', 'Fechamento manual')], jtbds: [jtbd('j1', 'Fechar o mês')] }),
      session('s2', 'B', { painPoints: [pain('p2', 'fechamento manual'), pain('p3', 'Repasse atrasado')], jtbds: [jtbd('j2', 'fechar o mês'), jtbd('j3', 'Avisar o cliente')] })
    ]);

    expect(input.painPoints.map(p => p.description)).toEqual(['Fechamento manual', 'Repasse atrasado']);
    expect(input.jtbds.map(j => j.job)).toEqual(['Fechar o mês', 'Avisar o cliente']);
  });

  it('sessão sem falas não deixa um título vazio na transcrição', () => {
    const input = buildGenerationInput([
      session('s1', 'Vazia'),
      session('s2', 'Com fala', { rawTranscript: [seg('a', 'Usuário / Stakeholder', 'Algo')] })
    ]);

    expect(input.transcript).toBe('### Reunião: Com fala (01/01/2026)\nUsuário / Stakeholder: Algo');
  });
});
