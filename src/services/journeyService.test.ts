import { describe, expect, it } from 'vitest';
import { addStep, extractJourney, moveStep, removeStep, syncJourney, updateStep } from './journeyService';
import type { MeetingSession, TranscriptSegment, UserFlowStep } from '../types/discovery';

let counter = 0;
const talk = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder'): TranscriptSegment => ({
  id: `j${++counter}`, speaker, text, timestamp: '00:10', isFinal: true
});

const session = (segments: TranscriptSegment[], userFlowSteps: UserFlowStep[] = []): MeetingSession => ({
  id: 's1', title: 'Entrevista', date: '01/01/2026', durationSeconds: 0, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps
});

const TALK = [
  talk('Primeiro eu baixo o extrato do banco'),
  talk('Depois eu cole tudo na planilha na mão e isso demora duas horas'),
  talk('Em seguida confiro cada linha, a fórmula quebra toda semana'),
  talk('Por fim envio o relatório para o financeiro')
];

const manualStep = (over: Partial<UserFlowStep> = {}): UserFlowStep => ({
  id: 'step-1', stepNumber: 1, title: 'Abrir sistema', actor: 'Ana', systemAction: '', frictionLevel: 'smooth', manual: true, ...over
});

describe('extractJourney', () => {
  it('sem falas, não há etapas', () => {
    expect(extractJourney(session([]))).toEqual([]);
  });

  it('transforma a sequência contada pelo entrevistado em etapas na ordem', () => {
    const steps = extractJourney(session(TALK));

    expect(steps).toHaveLength(4);
    expect(steps.map(s => s.stepNumber)).toEqual([1, 2, 3, 4]);
    expect(steps[0].title.toLowerCase()).toContain('extrato');
    expect(steps[3].title.toLowerCase()).toContain('relatório');
  });

  it('ignora as falas do entrevistador', () => {
    const steps = extractJourney(session([talk('Primeiro me conte como começa?', 'Entrevistador (PM)'), ...TALK]));

    expect(steps).toHaveLength(4);
  });

  it('marca a fricção pelo que a pessoa disse e guarda a dor e a fala', () => {
    const steps = extractJourney(session(TALK));

    expect(steps[0].frictionLevel).toBe('smooth');
    expect(steps[1].frictionLevel).not.toBe('smooth');
    expect(steps[2].frictionLevel).toBe('critical');
    expect(steps[2].painPointDetected).toBeTruthy();
    expect(steps[2].quote).toContain('fórmula quebra');
  });

  it('os ids e o resultado são estáveis', () => {
    const s = session(TALK);

    expect(extractJourney(s)).toEqual(extractJourney(s));
  });

  it('um relato sem marcadores de sequência não vira jornada', () => {
    expect(extractJourney(session([talk('O cadastro de fornecedores é um problema sério')]))).toEqual([]);
  });
});

describe('syncJourney', () => {
  it('acrescenta as etapas da conversa e é idempotente', () => {
    const once = syncJourney(session(TALK));
    const twice = syncJourney(once);

    expect(once.userFlowSteps).toHaveLength(4);
    expect(twice.userFlowSteps).toEqual(once.userFlowSteps);
  });

  it('mantém as etapas do usuário e as etapas antigas da IA', () => {
    const legacy: UserFlowStep = { id: 'old', stepNumber: 2, title: 'Aprovar pagamento', actor: 'Gestor', systemAction: 'x', frictionLevel: 'warning' };
    const result = syncJourney(session(TALK, [manualStep(), legacy]));

    const titles = result.userFlowSteps.map(s => s.title);
    expect(titles).toContain('Abrir sistema');
    expect(titles).toContain('Aprovar pagamento');
    expect(result.userFlowSteps.map(s => s.stepNumber)).toEqual(result.userFlowSteps.map((_, i) => i + 1));
  });

  it('uma etapa derivada que o usuário apagou não volta', () => {
    const once = syncJourney(session(TALK));
    const gone = removeStep(once, once.userFlowSteps[0].id);

    expect(syncJourney(gone).userFlowSteps).toHaveLength(3);
  });

  it('uma etapa editada vira do usuário e não é sobrescrita', () => {
    const once = syncJourney(session(TALK));
    const edited = updateStep(once, once.userFlowSteps[0].id, { title: 'Baixar extrato OFX' });

    const again = syncJourney(edited);

    expect(again.userFlowSteps).toHaveLength(4);
    expect(again.userFlowSteps[0].title).toBe('Baixar extrato OFX');
    expect(again.userFlowSteps[0].manual).toBe(true);
  });
});

describe('edição da jornada', () => {
  it('adiciona etapa no fim, como do usuário, e ignora título em branco', () => {
    const base = session([], [manualStep()]);
    const added = addStep(base, { title: ' Revisar ', actor: 'Ana', frictionLevel: 'warning' });

    expect(added.userFlowSteps).toHaveLength(2);
    expect(added.userFlowSteps[1]).toMatchObject({ title: 'Revisar', stepNumber: 2, manual: true });
    expect(addStep(base, { title: '  ', actor: 'x', frictionLevel: 'smooth' })).toBe(base);
  });

  it('atualiza campos da etapa sem mexer na original', () => {
    const base = session([], [manualStep()]);
    const next = updateStep(base, 'step-1', { opportunity: 'Automatizar', frictionLevel: 'critical' });

    expect(next.userFlowSteps[0]).toMatchObject({ opportunity: 'Automatizar', frictionLevel: 'critical' });
    expect(base.userFlowSteps[0].frictionLevel).toBe('smooth');
  });

  it('não aceita título em branco nem id desconhecido', () => {
    const base = session([], [manualStep()]);

    expect(updateStep(base, 'step-1', { title: ' ' })).toBe(base);
    expect(updateStep(base, 'nope', { title: 'x' })).toBe(base);
  });

  it('remove e renumera', () => {
    const base = session([], [manualStep(), manualStep({ id: 'step-2', stepNumber: 2, title: 'B' })]);
    const next = removeStep(base, 'step-1');

    expect(next.userFlowSteps.map(s => [s.title, s.stepNumber])).toEqual([['B', 1]]);
  });

  it('move para cima e para baixo, respeitando as pontas', () => {
    const base = session([], [
      manualStep({ id: 'a', title: 'A' }), manualStep({ id: 'b', stepNumber: 2, title: 'B' }), manualStep({ id: 'c', stepNumber: 3, title: 'C' })
    ]);

    expect(moveStep(base, 'c', 'up').userFlowSteps.map(s => s.title)).toEqual(['A', 'C', 'B']);
    expect(moveStep(base, 'a', 'down').userFlowSteps.map(s => s.title)).toEqual(['B', 'A', 'C']);
    expect(moveStep(base, 'a', 'up')).toBe(base);
    expect(moveStep(base, 'c', 'down')).toBe(base);
    expect(moveStep(base, 'c', 'up').userFlowSteps.map(s => s.stepNumber)).toEqual([1, 2, 3]);
  });
});
