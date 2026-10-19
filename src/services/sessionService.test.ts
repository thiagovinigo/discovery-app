import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import { applyLiveAnalysis, appendSegment } from './sessionService';
import type { AnalysisResponse } from './geminiService';
import type { TranscriptSegment } from '../types/discovery';

const segment = (n: number): TranscriptSegment => ({
  id: `seg-${n}`,
  speaker: 'Usuário / Stakeholder',
  text: `fala ${n}`,
  timestamp: '00:00',
  isFinal: true,
});

const emptyAnalysis = (): AnalysisResponse => ({
  newQuestions: [],
  newPainPoints: [],
  newJtbds: [],
  newMindMapNodes: [],
  newUserFlowSteps: [],
});

const question = (text: string) => ({
  id: `q-${text}`, question: text, reason: 'r', category: 'mom_test' as const, asked: false, timestamp: '00:00',
});
const pain = (description: string) => ({ id: `p-${description}`, description, severity: 'high' }) as never;
const jtbd = (job: string) => ({ id: `j-${job}`, job, context: 'c', outcome: 'o' }) as never;
const node = (label: string) => ({ id: `n-${label}`, label, type: 'pain' as const, x: 1, y: 1 });
const step = (title: string) => ({
  id: `s-${title}`, stepNumber: 0, title, actor: 'a', systemAction: 's', frictionLevel: 'smooth' as const,
});

let projectId: string;
let sessionId: string;

const currentSession = () =>
  storageService.getAllProjects().find(p => p.id === projectId)!.sessions.find(s => s.id === sessionId)!;

beforeEach(() => {
  localStorage.clear();
  const project = storageService.createNewProject('Projeto', 'Desc');
  projectId = project.id;
  sessionId = storageService.createNewSession(projectId, 'Entrevista').id;
});

describe('appendSegment', () => {
  it('adiciona a fala ao fim da transcrição e persiste', () => {
    appendSegment(projectId, sessionId, segment(1));

    expect(currentSession().rawTranscript.map(s => s.id)).toEqual(['seg-1']);
  });

  it('não perde nenhuma de 50 falas seguidas, em ordem (E3.1)', () => {
    for (let n = 1; n <= 50; n++) appendSegment(projectId, sessionId, segment(n));

    const ids = currentSession().rawTranscript.map(s => s.id);
    expect(ids).toHaveLength(50);
    expect(ids[0]).toBe('seg-1');
    expect(ids[49]).toBe('seg-50');
  });

  it('devolve undefined e não altera nada quando o projeto ou a sessão não existem', () => {
    expect(appendSegment('nao-existe', sessionId, segment(1))).toBeUndefined();
    expect(appendSegment(projectId, 'nao-existe', segment(1))).toBeUndefined();
    expect(currentSession().rawTranscript).toEqual([]);
  });

  it('não mexe nas outras sessões do projeto', () => {
    const other = storageService.createNewSession(projectId, 'Outra');

    appendSegment(projectId, sessionId, segment(1));

    const otherSaved = storageService.getAllProjects().find(p => p.id === projectId)!.sessions.find(s => s.id === other.id)!;
    expect(otherSaved.rawTranscript).toEqual([]);
  });
});

describe('applyLiveAnalysis', () => {
  it('uma análise tardia não apaga falas gravadas enquanto a IA respondia (E3.1)', () => {
    appendSegment(projectId, sessionId, segment(1));
    // a IA ainda está analisando a fala 1; o usuário continua falando
    for (let n = 2; n <= 50; n++) appendSegment(projectId, sessionId, segment(n));

    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newQuestions: [question('Por quê?')] });

    const session = currentSession();
    expect(session.rawTranscript).toHaveLength(50);
    expect(session.liveQuestions.map(q => q.question)).toEqual(['Por quê?']);
  });

  it('ignora perguntas, dores e jobs repetidos, sem diferenciar maiúsculas', () => {
    applyLiveAnalysis(projectId, sessionId, {
      ...emptyAnalysis(),
      newQuestions: [question('Quanto custa?')],
      newPainPoints: [pain('Planilha trava')],
      newJtbds: [jtbd('Fechar o mês')],
    });
    applyLiveAnalysis(projectId, sessionId, {
      ...emptyAnalysis(),
      newQuestions: [question('  QUANTO CUSTA?  ')],
      newPainPoints: [pain('planilha TRAVA')],
      newJtbds: [jtbd('fechar o mês')],
    });

    const session = currentSession();
    expect(session.liveQuestions).toHaveLength(1);
    expect(session.painPoints).toHaveLength(1);
    expect(session.jtbds).toHaveLength(1);
  });

  it('coloca perguntas novas no topo e dores novas no fim', () => {
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newQuestions: [question('A')], newPainPoints: [pain('p1')] });
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newQuestions: [question('B')], newPainPoints: [pain('p2')] });

    const session = currentSession();
    expect(session.liveQuestions.map(q => q.question)).toEqual(['B', 'A']);
    expect(session.painPoints.map(p => p.description)).toEqual(['p1', 'p2']);
  });

  it('liga cada nó novo do mapa mental à raiz e não repete rótulos', () => {
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newMindMapNodes: [node('Dor X')] });
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newMindMapNodes: [node('dor x'), node('Dor Y')] });

    const session = currentSession();
    const root = session.mindMapNodes.find(n => n.type === 'root')!;
    expect(session.mindMapNodes.map(n => n.label)).toEqual([root.label, 'Dor X', 'Dor Y']);
    expect(session.mindMapEdges).toHaveLength(2);
    expect(session.mindMapEdges.every(e => e.source === root.id)).toBe(true);
  });

  it('cria a raiz do mapa quando a sessão veio sem ela', () => {
    storageService.updateProject(projectId, p => ({
      ...p,
      sessions: p.sessions.map(s => (s.id === sessionId ? { ...s, mindMapNodes: [] } : s)),
    }));

    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newMindMapNodes: [node('Dor X')] });

    const session = currentSession();
    expect(session.mindMapNodes[0].type).toBe('root');
    expect(session.mindMapEdges[0].source).toBe(session.mindMapNodes[0].id);
  });

  it('numera as etapas novas do fluxo em sequência e ignora títulos repetidos', () => {
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newUserFlowSteps: [step('Abrir'), step('Enviar')] });
    applyLiveAnalysis(projectId, sessionId, { ...emptyAnalysis(), newUserFlowSteps: [step('ABRIR'), step('Revisar')] });

    expect(currentSession().userFlowSteps.map(s => [s.title, s.stepNumber])).toEqual([
      ['Abrir', 1], ['Enviar', 2], ['Revisar', 3],
    ]);
  });

  it('devolve undefined quando a sessão não existe', () => {
    expect(applyLiveAnalysis(projectId, 'nao-existe', emptyAnalysis())).toBeUndefined();
  });
});
