import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageService } from '../services/storageService';
import { createProjectActions } from './projectActions';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

let projectId: string;
const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

function setup(session?: MeetingSession) {
  const deps = {
    project: load(),
    session,
    refresh: vi.fn(),
    saveProject: vi.fn(),
    showNotice: vi.fn(),
    openLiveRoom: vi.fn()
  };
  return { deps, actions: createProjectActions(deps) };
}

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', 'Descrição').id;
});

describe('createProjectActions: stakeholders', () => {
  it('cadastrar grava, atualiza a tela e avisa', () => {
    const { actions, deps } = setup();

    actions.handleAddStakeholder({ name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto' });

    expect(load().stakeholders).toHaveLength(1);
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(deps.showNotice).toHaveBeenCalledWith('success', expect.stringContaining('Ana'));
  });

  it('nome vazio mostra o erro e não atualiza a tela', () => {
    const { actions, deps } = setup();

    actions.handleAddStakeholder({ name: ' ', role: 'outro', interest: 'medio', influence: 'medio' });

    expect(deps.showNotice).toHaveBeenCalledWith('error', expect.stringMatching(/nome/i));
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(load().stakeholders).toEqual([]);
  });
});

describe('createProjectActions: entrevista', () => {
  it('pular uma pergunta salva o projeto com a etapa marcada', () => {
    const { actions, deps } = setup();

    actions.handleInterviewSkip('problem');

    const saved = deps.saveProject.mock.calls[0][0] as DiscoveryProject;
    expect(saved.interview?.skipped).toEqual(['problem']);
  });

  it('confirmar uma resposta salva o PRD e avisa', () => {
    const { actions, deps } = setup();

    actions.handleInterviewConfirm('problem', 'Faltas sem aviso');

    expect((deps.saveProject.mock.calls[0][0] as DiscoveryProject).prd.problemStatement).toBe('Faltas sem aviso');
    expect(deps.showNotice).toHaveBeenCalledWith('success', expect.any(String));
  });
});

describe('createProjectActions: reuniões', () => {
  it('iniciar uma reunião que não existe mostra erro e não abre a sala', () => {
    const { actions, deps } = setup();

    actions.handleStartMeeting('nao-existe');

    expect(deps.showNotice).toHaveBeenCalledWith('error', expect.any(String));
    expect(deps.openLiveRoom).not.toHaveBeenCalled();
  });

  it('marcar e iniciar abre a sala', () => {
    const { actions, deps } = setup();
    actions.handleScheduleMeeting({ title: 'Kickoff', type: 'alignment', startsAt: '2099-03-10T14:00' });
    const meetingId = load().scheduledMeetings![0].id;

    actions.handleStartMeeting(meetingId);

    expect(deps.openLiveRoom).toHaveBeenCalledTimes(1);
    expect(load().sessions[0].title).toBe('Kickoff');
  });

  it('fechamento sem sala ativa não faz nada; sem respostas mostra erro', () => {
    const none = setup();
    none.actions.handleSaveClosing({ clear: 'x', open: '', nextAction: '' });
    expect(none.deps.showNotice).not.toHaveBeenCalled();

    const session = storageService.createNewSession(projectId, 'Sala');
    const withSession = setup(session);
    withSession.actions.handleSaveClosing({ clear: ' ', open: '', nextAction: '' });
    expect(withSession.deps.showNotice).toHaveBeenCalledWith('error', expect.stringMatching(/ao menos uma/i));
  });
});

describe('createProjectActions: anotações', () => {
  it('anotar e promover a decisão e a história atualiza a tela a cada passo', () => {
    const { actions, deps } = setup();

    actions.handleAddNote({ text: 'Adiar o lançamento', tags: [] });
    const noteId = load().notes![0].id;
    actions.handlePromoteNoteToDecision(noteId);
    actions.handlePromoteNoteToStory(noteId);

    expect(load().decisionLog).toHaveLength(1);
    expect(load().epics.some(e => e.title === 'Anotações do projeto')).toBe(true);
    expect(deps.refresh).toHaveBeenCalledTimes(3);
  });
});
