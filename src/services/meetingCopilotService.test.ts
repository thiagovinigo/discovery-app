import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import { applyAnswer, INTERVIEW_STEPS, skipStep } from './interviewService';
import { addNote } from './noteService';
import { buildAgenda, closingNoteText, saveClosing } from './meetingCopilotService';
import type { DiscoveryProject, Epic, LiveQuestionSuggestion, MeetingSession } from '../types/discovery';

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

const question = (text: string, asked: boolean): LiveQuestionSuggestion => ({
  id: `q-${text}`, question: text, reason: '', category: 'mom_test', asked, timestamp: ''
});

const withSessionQuestions = (project: DiscoveryProject, ...questions: LiveQuestionSuggestion[]): DiscoveryProject => ({
  ...project,
  sessions: [{ ...storageService.createNewSession(projectId, 'Anterior'), liveQuestions: questions }]
});

const allAnswered = (project: DiscoveryProject): DiscoveryProject => INTERVIEW_STEPS.map(s => s.id).reduce(skipStep, project);

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('buildAgenda: lacunas do projeto', () => {
  it('lista o que a entrevista ainda não cobriu, no máximo três pontos', () => {
    const agenda = buildAgenda(load(), 'alignment');

    expect(agenda.slice(0, 3)).toEqual([
      'Problema: Qual problema ou oportunidade você quer resolver?',
      'Público: Quem sente esse problema? Qual é o público principal?',
      'Proposta de valor: Qual é a sua proposta de valor? Por que alguém escolheria esta solução?'
    ]);
    expect(agenda.filter(item => /^(Problema|Público|Proposta de valor|North Star|Métricas)/.test(item))).toHaveLength(3);
  });

  it('o que já foi respondido não vira pauta', () => {
    const answered = applyAnswer(load(), 'problem', 'A recepção perde duas horas por dia confirmando consultas.');

    expect(buildAgenda(answered, 'alignment').some(item => item.startsWith('Problema:'))).toBe(false);
  });

  it('retoma as perguntas feitas em reuniões anteriores e ainda não respondidas', () => {
    const project = withSessionQuestions(allAnswered(load()), question('Qual o prazo do contrato?', false), question('Quem aprova?', true));

    const agenda = buildAgenda(project, 'alignment');

    expect(agenda).toContain('Retomar: Qual o prazo do contrato?');
    expect(agenda.some(item => item.includes('Quem aprova?'))).toBe(false);
  });

  it('não repete a mesma pergunta pendente', () => {
    const project = withSessionQuestions(allAnswered(load()), question('Qual o prazo?', false), question('Qual o prazo?', false));

    expect(buildAgenda(project, 'alignment').filter(item => item === 'Retomar: Qual o prazo?')).toHaveLength(1);
  });
});

describe('buildAgenda: por tipo de conversa', () => {
  it('discovery inclui o lembrete de pedir um caso concreto', () => {
    expect(buildAgenda(allAnswered(load()), 'discovery').some(item => /caso concreto/i.test(item))).toBe(true);
  });

  it('alinhamento revisita decisões marcadas para revisão', () => {
    const project: DiscoveryProject = {
      ...allAnswered(load()),
      decisionLog: [
        { id: 'd1', date: '01/01/2026', decision: 'Adiar o lançamento', context: '', driver: '', consequences: '', status: 'revisiting' },
        { id: 'd2', date: '01/01/2026', decision: 'Cortar relatórios', context: '', driver: '', consequences: '', status: 'approved' }
      ]
    };

    const agenda = buildAgenda(project, 'alignment');

    expect(agenda).toContain('Revisar decisão: Adiar o lançamento');
    expect(agenda.some(item => item.includes('Cortar relatórios'))).toBe(false);
  });

  it('refinamento aponta histórias sem critérios de aceite', () => {
    const epic: Epic = {
      id: 'e1', title: 'Épico', objective: '', businessValue: '', status: 'discovery',
      features: [{
        id: 'f1', epicId: 'e1', title: 'F', description: '', valueProposition: '', effort: 'S',
        userStories: [
          { id: 's1', featureId: 'f1', title: 'Exportar PDF', asA: '', iWantTo: '', soThat: '', acceptanceCriteria: [], tasks: [] },
          { id: 's2', featureId: 'f1', title: 'Filtrar lista', asA: '', iWantTo: '', soThat: '',
            acceptanceCriteria: [{ id: 'a1', scenario: 'x', given: 'g', when: 'w', then: 't' }], tasks: [] }
        ]
      }]
    };

    const agenda = buildAgenda({ ...allAnswered(load()), epics: [epic] }, 'refinement');

    expect(agenda).toContain('Detalhar critérios de aceite: Exportar PDF');
    expect(agenda.some(item => item.includes('Filtrar lista'))).toBe(false);
  });

  it('nunca passa de oito itens nem repete', () => {
    const questions = ['a', 'b', 'c', 'd', 'e'].map(t => question(`Pergunta ${t}?`, false));
    const agenda = buildAgenda(withSessionQuestions(load(), ...questions), 'discovery');

    expect(agenda.length).toBeLessThanOrEqual(8);
    expect(new Set(agenda).size).toBe(agenda.length);
  });
});

describe('closingNoteText', () => {
  const session = { title: 'Kickoff' } as MeetingSession;

  it('monta o texto só com o que foi respondido', () => {
    const text = closingNoteText(session, { clear: ' Escopo fechado ', open: '', nextAction: 'Ana envia o contrato' });

    expect(text).toBe('Fechamento: Kickoff\nO que ficou claro: Escopo fechado\nPróxima ação: Ana envia o contrato');
  });
});

describe('saveClosing', () => {
  it('guarda o fechamento como anotação etiquetada e ligada à sala', () => {
    const session = storageService.createNewSession(projectId, 'Kickoff');

    const note = saveClosing(projectId, session, { clear: 'Escopo fechado', open: 'Prazo do contrato', nextAction: '' })!;

    expect(note).toMatchObject({ tags: ['fechamento'], sessionId: session.id });
    expect(note.text).toContain('O que ficou em aberto: Prazo do contrato');
    expect(load().notes).toEqual([note]);
  });

  it('exige ao menos uma resposta', () => {
    const session = storageService.createNewSession(projectId, 'Kickoff');

    expect(() => saveClosing(projectId, session, { clear: ' ', open: '', nextAction: '' })).toThrow(/ao menos uma/i);
    expect(load().notes ?? []).toEqual([]);
  });

  it('salvar de novo substitui o fechamento da mesma sala em vez de duplicar', () => {
    const session = storageService.createNewSession(projectId, 'Kickoff');
    addNote(projectId, { text: 'Outra anotação' });

    saveClosing(projectId, session, { clear: 'Primeira versão', open: '', nextAction: '' });
    saveClosing(projectId, session, { clear: 'Segunda versão', open: '', nextAction: '' });

    const closings = load().notes!.filter(n => n.tags.includes('fechamento'));
    expect(closings).toHaveLength(1);
    expect(closings[0].text).toContain('Segunda versão');
    expect(load().notes).toHaveLength(2);
  });
});
