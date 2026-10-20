import {
  addStakeholder,
  removeStakeholder,
  updateStakeholder
} from '../services/stakeholderService';
import type { StakeholderInput } from '../services/stakeholderService';
import { applyAnswer, skipStep } from '../services/interviewService';
import { addNote, promoteToDecision, promoteToStory, removeNote, updateNote } from '../services/noteService';
import type { NoteInput } from '../services/noteService';
import { cancelMeeting, removeMeeting, scheduleMeeting, startMeeting } from '../services/meetingService';
import type { MeetingInput } from '../services/meetingService';
import { saveClosing } from '../services/meetingCopilotService';
import type { ClosingAnswers } from '../services/meetingCopilotService';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

type NoticeType = 'error' | 'info' | 'success';

export interface ProjectActionsDeps {
  project: DiscoveryProject;
  /** Sala ativa, se houver. */
  session?: MeetingSession;
  /** Relê os projetos do armazenamento depois de uma gravação feita por um serviço. */
  refresh: () => void;
  /** Grava um projeto inteiro já alterado (usado pela entrevista, que é uma função pura). */
  saveProject: (project: DiscoveryProject) => void;
  showNotice: (type: NoticeType, text: string) => void;
  openLiveRoom: () => void;
}

const messageOf = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback);

/**
 * Ações do PO sobre o projeto ativo (stakeholders, entrevista, anotações, agenda e fechamento). Cada uma chama o serviço,
 * atualiza a tela e avisa o resultado. Não é um hook: o `App` a chama depois de garantir que existe um projeto.
 */
export function createProjectActions({ project, session, refresh, saveProject, showNotice, openLiveRoom }: ProjectActionsDeps) {
  const projectId = project.id;

  /** Executa a ação; se o serviço lançar erro, mostra a mensagem em vez de quebrar a tela. */
  const attempt = (fallbackError: string, action: () => void) => {
    try {
      action();
    } catch (e: unknown) {
      showNotice('error', messageOf(e, fallbackError));
    }
  };

  return {
    handleAddStakeholder: (input: StakeholderInput) =>
      attempt('Não foi possível cadastrar o stakeholder.', () => {
        addStakeholder(projectId, input);
        refresh();
        showNotice('success', `${input.name} foi cadastrado(a) como stakeholder.`);
      }),

    handleUpdateStakeholder: (stakeholderId: string, changes: Partial<StakeholderInput>) =>
      attempt('Não foi possível atualizar o stakeholder.', () => {
        updateStakeholder(projectId, stakeholderId, changes);
        refresh();
        showNotice('success', 'Stakeholder atualizado.');
      }),

    handleRemoveStakeholder: (stakeholderId: string) => {
      removeStakeholder(projectId, stakeholderId);
      refresh();
      showNotice('info', 'Stakeholder removido.');
    },

    handleInterviewConfirm: (stepId: string, answer: string) => {
      saveProject(applyAnswer(project, stepId, answer));
      showNotice('success', 'Resposta salva no projeto.');
    },

    handleInterviewSkip: (stepId: string) => {
      saveProject(skipStep(project, stepId));
    },

    handleAddNote: (input: NoteInput) =>
      attempt('Não foi possível salvar a anotação.', () => {
        addNote(projectId, input);
        refresh();
        showNotice('success', 'Anotação salva.');
      }),

    handleUpdateNote: (noteId: string, changes: Pick<NoteInput, 'text' | 'tags'>) =>
      attempt('Não foi possível editar a anotação.', () => {
        updateNote(projectId, noteId, changes);
        refresh();
      }),

    handleRemoveNote: (noteId: string) => {
      removeNote(projectId, noteId);
      refresh();
      showNotice('info', 'Anotação excluída.');
    },

    handlePromoteNoteToDecision: (noteId: string) => {
      promoteToDecision(projectId, noteId);
      refresh();
      showNotice('success', 'Anotação registrada no Decision Log (PRD Vivo).');
    },

    handlePromoteNoteToStory: (noteId: string) => {
      promoteToStory(projectId, noteId);
      refresh();
      showNotice('success', 'História criada no épico "Anotações do projeto" do Backlog.');
    },

    handleScheduleMeeting: (input: MeetingInput) =>
      attempt('Não foi possível marcar a reunião.', () => {
        scheduleMeeting(projectId, input);
        refresh();
        showNotice('success', `Reunião "${input.title.trim()}" marcada.`);
      }),

    handleStartMeeting: (meetingId: string) => {
      const started = startMeeting(projectId, meetingId);
      refresh();
      if (!started) {
        showNotice('error', 'Não foi possível iniciar esta reunião.');
        return;
      }
      openLiveRoom();
      showNotice('success', `Sala "${started.title}" aberta com a pauta e os participantes da agenda.`);
    },

    handleCancelMeeting: (meetingId: string) => {
      cancelMeeting(projectId, meetingId);
      refresh();
      showNotice('info', 'Reunião cancelada.');
    },

    handleRemoveMeeting: (meetingId: string) => {
      removeMeeting(projectId, meetingId);
      refresh();
    },

    handleSaveClosing: (answers: ClosingAnswers) => {
      if (!session) return;
      attempt('Não foi possível salvar o fechamento.', () => {
        saveClosing(projectId, session, answers);
        refresh();
        showNotice('success', 'Fechamento da reunião salvo em Anotações.');
      });
    }
  };
}
