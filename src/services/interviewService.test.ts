import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from './storageService';
import { callAI } from './aiClient';
import {
  INTERVIEW_STEPS,
  aiFollowUp,
  applyAnswer,
  followUpFor,
  interviewProgress,
  nextStep,
  parseListAnswer,
  skipStep,
  stepAnswered
} from './interviewService';
import type { DiscoveryProject } from '../types/discovery';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});
const callAIMock = vi.mocked(callAI);

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;
const step = (id: string) => INTERVIEW_STEPS.find(s => s.id === id)!;

beforeEach(() => {
  localStorage.clear();
  callAIMock.mockReset();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('roteiro da entrevista', () => {
  it('tem as 10 etapas, cada uma com pergunta e dica, começando pelo problema', () => {
    expect(INTERVIEW_STEPS).toHaveLength(10);
    expect(INTERVIEW_STEPS[0].id).toBe('problem');
    expect(INTERVIEW_STEPS.every(s => s.question.endsWith('?') && s.hint.length > 0)).toBe(true);
    expect(new Set(INTERVIEW_STEPS.map(s => s.id)).size).toBe(10);
  });

  it('em projeto novo, a primeira pergunta é a do problema e nada está respondido', () => {
    expect(nextStep(load())?.id).toBe('problem');
    expect(interviewProgress(load())).toEqual({ done: 0, total: 10 });
  });

  it('pula as etapas cujo dado o projeto já tem', () => {
    const answered = applyAnswer(load(), 'problem', 'Pacientes faltam às consultas');

    expect(stepAnswered(answered, step('problem'))).toBe(true);
    expect(nextStep(answered)?.id).toBe('audience');
    expect(interviewProgress(answered).done).toBe(1);
  });

  it('trata o texto de preenchimento antigo do PRD como não respondido', () => {
    const legacy = { ...load(), prd: { ...load().prd, problemStatement: 'Descreva aqui o problema principal identificado nas sessões.' } };

    expect(stepAnswered(legacy, step('problem'))).toBe(false);
  });

  it('pular uma etapa a conta como concluída e segue para a próxima', () => {
    const skipped = skipStep(load(), 'problem');

    expect(nextStep(skipped)?.id).toBe('audience');
    expect(skipped.interview?.skipped).toEqual(['problem']);
    expect(skipStep(skipped, 'problem').interview?.skipped).toEqual(['problem']);
  });

  it('ao terminar todas as etapas, não há próxima pergunta e a conclusão é registrada', () => {
    let project = load();
    for (const s of INTERVIEW_STEPS) project = skipStep(project, s.id);

    expect(nextStep(project)).toBeUndefined();
    expect(project.interview?.completedAt).toBeDefined();
  });
});

describe('parseListAnswer', () => {
  it('separa por linha, ponto e vírgula e marcadores, sem itens vazios nem repetidos', () => {
    expect(parseListAnswer('- reduzir faltas\n• aumentar receita; melhorar o atendimento\n\n- reduzir faltas')).toEqual([
      'reduzir faltas', 'aumentar receita', 'melhorar o atendimento'
    ]);
  });

  it('uma linha só continua sendo um item', () => {
    expect(parseListAnswer('  Só isso  ')).toEqual(['Só isso']);
  });

  it('entrada vazia dá lista vazia', () => {
    expect(parseListAnswer('  \n ')).toEqual([]);
  });
});

describe('applyAnswer', () => {
  it('grava as respostas de texto nos campos certos do PRD e guarda a resposta crua', () => {
    let project = load();
    project = applyAnswer(project, 'problem', 'Faltas sem aviso');
    project = applyAnswer(project, 'audience', 'Recepcionistas');
    project = applyAnswer(project, 'value', 'Confirmar em minutos');
    project = applyAnswer(project, 'northStar', 'Taxa de comparecimento');

    expect(project.prd).toMatchObject({
      problemStatement: 'Faltas sem aviso', targetAudience: 'Recepcionistas', valueProposition: 'Confirmar em minutos', northStarMetric: 'Taxa de comparecimento'
    });
    expect(project.interview?.answers.problem).toBe('Faltas sem aviso');
  });

  it('listas entram como itens separados e se somam ao que já existia, sem duplicar', () => {
    let project = applyAnswer(load(), 'metrics', '- comparecimento\n- tempo de confirmação');
    project = applyAnswer(project, 'metrics', 'Comparecimento\nsatisfação');

    expect(project.prd.successMetrics).toEqual(['comparecimento', 'tempo de confirmação', 'satisfação']);
  });

  it('escopo, fora do escopo e premissas vão para os campos próprios', () => {
    let project = applyAnswer(load(), 'scope', 'lembrete\nconfirmação');
    project = applyAnswer(project, 'outOfScope', 'remarcação');
    project = applyAnswer(project, 'assumptions', 'pacientes têm celular');

    expect(project.prd.inScope).toEqual(['lembrete', 'confirmação']);
    expect(project.prd.outOfScope).toEqual(['remarcação']);
    expect(project.prd.assumptions).toEqual(['pacientes têm celular']);
  });

  it('riscos entram sem mitigação e não se repetem', () => {
    let project = applyAnswer(load(), 'risks', 'ignorarem as mensagens');
    project = applyAnswer(project, 'risks', 'Ignorarem as mensagens');

    expect(project.prd.risksAndMitigations).toEqual([{ risk: 'ignorarem as mensagens', mitigation: '' }]);
  });

  it('pessoas viram stakeholders, ignorando quem já está cadastrado', () => {
    let project = applyAnswer(load(), 'stakeholders', 'Ana Souza — decisora — Clínica X\nBruno, usuário');
    project = applyAnswer(project, 'stakeholders', 'ana souza — decisora\nCarla — especialista');

    expect(project.stakeholders!.map(s => [s.name, s.role])).toEqual([['Ana Souza', 'decisor'], ['Bruno', 'usuario'], ['Carla', 'especialista']]);
    expect(project.stakeholders!.every(s => s.id.startsWith('stk-'))).toBe(true);
  });

  it('não altera o projeto original (sem mutação)', () => {
    const before = load();
    const snapshot = JSON.stringify(before);

    applyAnswer(before, 'problem', 'Algo');

    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('etapa desconhecida devolve o projeto sem alteração', () => {
    const before = load();

    expect(applyAnswer(before, 'nao-existe', 'x')).toEqual(before);
  });
});

describe('followUpFor (aprofundamento sem IA)', () => {
  it('resposta curta de texto pede um exemplo concreto, específico da etapa', () => {
    expect(followUpFor(step('problem'), 'Faltas')).toMatch(/exemplo concreto/i);
    expect(followUpFor(step('northStar'), 'Comparecimento')).toMatch(/meta/i);
  });

  it('resposta de texto já detalhada não gera nova pergunta', () => {
    const longAnswer = 'A recepção gasta duas horas por dia ligando para confirmar consultas e ainda assim um em cada cinco pacientes falta.';

    expect(followUpFor(step('problem'), longAnswer)).toBeNull();
  });

  it('lista com um só item pergunta se há mais', () => {
    expect(followUpFor(step('scope'), 'lembrete')).toMatch(/mais algum/i);
    expect(followUpFor(step('scope'), 'lembrete\nconfirmação')).toBeNull();
  });

  it('pessoas sem papel informado pedem papel e organização', () => {
    expect(followUpFor(step('stakeholders'), 'Ana\nBruno')).toMatch(/papel/i);
    expect(followUpFor(step('stakeholders'), 'Ana — decisora\nBruno — usuário')).toBeNull();
  });
});

describe('aiFollowUp', () => {
  it('sem chave, usa a regra local', async () => {
    expect(await aiFollowUp(step('problem'), 'Faltas', load())).toMatch(/exemplo concreto/i);
    expect(callAIMock).not.toHaveBeenCalled();
  });

  it('com chave, devolve a pergunta da IA; "OK" significa que não precisa aprofundar', async () => {
    storageService.setApiKey('sk-teste');
    callAIMock.mockResolvedValueOnce('Quantas vezes por semana isso acontece?');
    expect(await aiFollowUp(step('problem'), 'Faltas', load())).toBe('Quantas vezes por semana isso acontece?');

    callAIMock.mockResolvedValueOnce('OK');
    expect(await aiFollowUp(step('problem'), 'Faltas', load())).toBeNull();
  });

  it('se a IA falhar, volta para a regra local', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageService.setApiKey('sk-teste');
    callAIMock.mockRejectedValue(new Error('sem rede'));

    expect(await aiFollowUp(step('problem'), 'Faltas', load())).toMatch(/exemplo concreto/i);
  });
});
