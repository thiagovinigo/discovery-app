import { describe, expect, it } from 'vitest';
import { verifyBacklog, verifyStory } from './verificationService';
import type { AcceptanceCriteria, Epic, TechnicalTask, UserStory } from '../types/discovery';

const criterion = (over: Partial<AcceptanceCriteria> = {}): AcceptanceCriteria => ({
  id: 'a1', scenario: 'Exporta o relatório', given: 'um relatório pronto', when: 'clico em exportar', then: 'recebo o PDF', ...over
});
const task = (over: Partial<TechnicalTask> = {}): TechnicalTask => ({ id: 't1', title: 'Gerar PDF', type: 'backend', status: 'todo', ...over });

const readyStory = (over: Partial<UserStory> = {}): UserStory => ({
  id: 's1', featureId: 'f1', title: 'Exportar PDF', asA: 'diretor', iWantTo: 'exportar o relatório', soThat: 'enviar ao conselho',
  acceptanceCriteria: [criterion()], tasks: [task(), task({ id: 't2', type: 'qa', title: 'Testar o PDF' })], storyPoints: 3, ...over
});

const codes = (story: UserStory) => verifyStory(story).gaps.map(g => g.code);

describe('verifyStory', () => {
  it('história completa está pronta para dev, sem lacunas', () => {
    expect(verifyStory(readyStory())).toEqual({ gaps: [], ready: true });
  });

  it('sem critério de aceite é bloqueio e a história não fica pronta', () => {
    const result = verifyStory(readyStory({ acceptanceCriteria: [] }));

    expect(result.ready).toBe(false);
    expect(result.gaps).toContainEqual(expect.objectContaining({ code: 'no-criteria', severity: 'blocker' }));
  });

  it('critério sem Dado, Quando ou Então é bloqueio e cita o cenário', () => {
    const result = verifyStory(readyStory({ acceptanceCriteria: [criterion({ then: ' ' })] }));

    expect(result.ready).toBe(false);
    expect(result.gaps).toContainEqual(expect.objectContaining({ code: 'incomplete-gherkin', message: expect.stringContaining('Exporta o relatório') }));
  });

  it('falta de "Como", "Quero" ou "Para que" é bloqueio', () => {
    expect(codes(readyStory({ soThat: '' }))).toContain('missing-statement');
    expect(verifyStory(readyStory({ asA: '  ' })).ready).toBe(false);
  });

  it('sem estimativa, grande demais, sem tasks ou sem task de teste são só avisos: a história continua pronta', () => {
    expect(codes(readyStory({ storyPoints: undefined }))).toEqual(['no-estimate']);
    expect(codes(readyStory({ storyPoints: 13 }))).toEqual(['too-big']);
    expect(codes(readyStory({ tasks: [] }))).toEqual(['no-tasks']);
    expect(codes(readyStory({ tasks: [task()] }))).toEqual(['no-qa-task']);
    expect(verifyStory(readyStory({ storyPoints: 13 })).ready).toBe(true);
  });

  it('Definition of Ready com itens em aberto é aviso', () => {
    const result = verifyStory(readyStory({ dorChecklist: [{ id: 'd1', label: 'Mockup aprovado', checked: false }, { id: 'd2', label: 'Dependências', checked: true }] }));

    expect(result.gaps).toEqual([expect.objectContaining({ code: 'dor-open', severity: 'warning', message: expect.stringContaining('Mockup aprovado') })]);
    expect(result.ready).toBe(true);
  });

  it('o texto de preenchimento antigo ("Descreva…") não conta como preenchido', () => {
    expect(codes(readyStory({ iWantTo: 'Descreva o que o usuário quer' }))).toContain('missing-statement');
  });

  it('lista todas as lacunas de uma vez', () => {
    const bad = readyStory({ acceptanceCriteria: [], tasks: [], storyPoints: undefined, soThat: '' });

    expect(codes(bad).sort()).toEqual(['missing-statement', 'no-criteria', 'no-estimate', 'no-tasks']);
  });
});

describe('verifyBacklog', () => {
  const epic = (stories: UserStory[]): Epic => ({
    id: 'e1', title: 'Épico', objective: '', businessValue: '', status: 'discovery',
    features: [{ id: 'f1', epicId: 'e1', title: 'F', description: '', valueProposition: '', effort: 'S', userStories: stories }]
  });

  it('resume quantas histórias estão prontas e lista as que não estão, com as lacunas', () => {
    const result = verifyBacklog([epic([readyStory({ id: 's1' }), readyStory({ id: 's2', title: 'Sem critério', acceptanceCriteria: [] })])]);

    expect(result.ready).toBe(1);
    expect(result.notReady).toBe(1);
    expect(result.stories.find(s => s.storyId === 's2')).toMatchObject({ title: 'Sem critério', ready: false });
    expect(result.stories.find(s => s.storyId === 's1')).toMatchObject({ ready: true, gaps: [] });
  });

  it('backlog vazio não tem nada pronto nem pendente', () => {
    expect(verifyBacklog([])).toEqual({ stories: [], ready: 0, notReady: 0 });
  });
});
