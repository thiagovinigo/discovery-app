import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChecklistItem,
  DiscoveryProject,
  MeetingSession,
  TranscriptSegment,
  UserFlowStep
} from './types/discovery';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import {
  appendSegment,
  appendSegments,
  applyLiveAnalysis,
  editMindMap,
  getActiveSessionContext,
  markQuestionAsked,
  refreshMindMap
} from './services/sessionService';
import { addChildNode, deleteNode, renameNode } from './services/mindMapService';
import { useProjects } from './state/useProjects';
import { NoticeToast } from './components/NoticeToast';
import { StakeholdersView } from './components/StakeholdersView';
import { InterviewView } from './components/InterviewView';
import { createProjectActions } from './state/projectActions';
import { useHashView } from './state/useHashView';
import { createBacklogActions } from './state/backlogActions';
import { NotesView } from './components/NotesView';
import { BacklogHealthPanel } from './components/BacklogHealthPanel';
import { BacklogReviewPanel } from './components/BacklogReviewPanel';
import { EvidencePanel } from './components/EvidencePanel';
import { lastSnapshot } from './services/backlogHistoryService';
import { StorySliceDialog } from './components/StorySliceDialog';
import { SessionSourcePicker } from './components/SessionSourcePicker';
import type { EvidenceSuggestion } from './services/evidenceService';
import { proposalsForMeetingType } from './services/backlogProposals';
import { clearPendingReview, loadPendingReview, savePendingReview } from './state/pendingReviewStore';
import type { PendingReview } from './state/pendingReviewStore';
import { AgendaView } from './components/AgendaView';
import { SessionAgendaCard } from './components/SessionAgendaCard';
import { SessionClosingPanel } from './components/SessionClosingPanel';
import { closingOf } from './services/meetingCopilotService';
import { SessionPeopleBar } from './components/SessionPeopleBar';
import { setCurrentSpeaker, setSessionParticipants } from './services/stakeholderService';
import { AssistantPanel } from './components/AssistantPanel';
import { MEETING_TYPE_LABELS, runAssistant, setAssistantEnabled, setSessionType } from './services/assistantService';
import type { MeetingType } from './types/discovery';
import { audioService, type AudioStatus } from './services/audioService';
import { transcribeAudioWithWhisper } from './services/openAiClient';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AudioCaptureBar } from './components/AudioCaptureBar';
import { LiveQuestionPrompter } from './components/LiveQuestionPrompter';
import { LiveTranscriptionView } from './components/LiveTranscriptionView';
import { MindMapCanvas } from './components/MindMapCanvas';
import { UserFlowView } from './components/UserFlowView';
import { DiscoveryToDoneView } from './components/DiscoveryToDoneView';
import { ProjectDocumentationView } from './components/ProjectDocumentationView';
import { AgileKnowledgeHubView } from './components/AgileKnowledgeHubView';
import { SecondBrainDashboardView } from './components/SecondBrainDashboardView';
import { ProjectHubView } from './components/ProjectHubView';
import { AgentStudioView } from './components/AgentStudioView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ProjectsHomeView } from './components/ProjectsHomeView';
import { MeetingsView } from './components/MeetingsView';
import { RefineView } from './components/RefineView';
import { POSpaceView } from './components/POSpaceView';
import { AgentPanel } from './components/AgentPanel';
import { LiveSessionsManager } from './components/LiveSessionsManager';
import { ProductAuditView } from './components/ProductAuditView';
import type { AppView } from './components/Sidebar';

import {
  Radio,
  GitBranch,
  Workflow,
  Plus,
  Maximize2,
  Minimize2,
  Keyboard
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useHashView();
  const [activeRightTab, setActiveRightTab] = useState<'mindmap' | 'userflow'>('mindmap');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingBacklog, setIsGeneratingBacklog] = useState(false);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isAssistantBusy, setIsAssistantBusy] = useState(false);
  // O pacote de propostas da IA fica guardado: sobrevive a recarregar a página até o usuário revisar ou descartar
  const [pendingReview, setPendingReviewState] = useState<PendingReview | null>(() => loadPendingReview());
  const [showAllProposals, setShowAllProposals] = useState(false);
  const setPendingReview = (next: PendingReview | null) => {
    setPendingReviewState(next);
    setShowAllProposals(false);
    if (next) savePendingReview(next);
    else clearPendingReview();
  };
  const [slicingStoryId, setSlicingStoryId] = useState<string | null>(null);
  const [generationSessionIds, setGenerationSessionIds] = useState<string[]>([]);
  const [pendingEvidence, setPendingEvidence] = useState<{ projectId: string; suggestions: EvidenceSuggestion[] } | null>(null);
  const [notice, setNotice] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);

  // New Specialist backlog features: Focus Mode & Informal Chat Mode
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isInformalChatMode, setIsInformalChatMode] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const liveFileInputRef = useRef<HTMLInputElement | null>(null);

  const recordingTimerRef = useRef<any>(null);
  const noticeTimerRef = useRef<any>(null);
  const lastAiErrorRef = useRef<string>('');
  // O callback de áudio nasce uma vez e enxergaria o valor antigo do estado; o ref sempre tem o atual
  const isInformalChatRef = useRef(false);
  useEffect(() => {
    isInformalChatRef.current = isInformalChatMode;
  }, [isInformalChatMode]);

  const showNotice = useCallback((type: 'error' | 'info' | 'success', text: string) => {
    setNotice({ type, text });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 8000);
  }, []);

  // Fonte única do estado de projetos: a lista, e o projeto ativo derivado dela
  const { projects, activeProject, ready, refresh, select, create, importFromJson, remove, clearAll, saveProject, update } = useProjects({
    onRestored: () => showNotice('info', 'Seus projetos foram recuperados da cópia de segurança do navegador.')
  });

  // Scroll to top automatically whenever activeView changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView]);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Incoming Speech or Simulation Chunk.
  // O callback de áudio é criado uma única vez ao iniciar a gravação e guarda cópias antigas do estado
  // do React, por isso a sessão é lida do storage a cada fala. A fala é gravada antes de esperar a IA, e a
  // análise é mesclada depois sobre a sessão atual, sem tocar na transcrição.
  const handleIncomingTranscript = useCallback(async (
    speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder',
    text: string
  ) => {
    const context = getActiveSessionContext();
    if (!context) return;
    const { project, session } = context;

    const lowered = text.toLowerCase();
    const newSeg: TranscriptSegment = {
      id: 'seg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' }),
      isFinal: true,
      highlightType: lowered.includes('trava') || lowered.includes('caos') || lowered.includes('dor')
        ? 'pain'
        : lowered.includes('queria') || lowered.includes('se tivesse')
        ? 'jtbd'
        : undefined
    };

    const withSegment = appendSegment(project.id, session.id, newSeg);
    if (withSegment) refresh();

    // Assistente ligado: acompanha cada fala nova, conforme o tipo da conversa
    if (session.assistant?.enabled) {
      void runAssistant(project.id, session.id).then(updated => {
        if (updated) refresh();
      });
    }

    // Modo Bate-Papo Informal: salva a fala sem acionar IA (economiza tokens e preserva foco)
    if (isInformalChatRef.current) return;

    const recent = [...session.rawTranscript, newSeg].slice(-4).map(s => ({ speaker: s.speaker, text: s.text }));
    const analysis = await geminiService.analyzeLiveConversation(recent, project.description);
    if (analysis.error) {
      // Evita repetir o mesmo aviso a cada fala
      if (analysis.error !== lastAiErrorRef.current) {
        lastAiErrorRef.current = analysis.error;
        showNotice('info', `IA offline: ${analysis.error}`);
      }
    } else {
      lastAiErrorRef.current = '';
    }

    const withAnalysis = applyLiveAnalysis(project.id, session.id, analysis);
    if (withAnalysis) refresh();
  }, [showNotice, refresh]);

  // Audio Capture Controls
  const handleStartRecording = useCallback(async (source: 'mic' | 'tab') => {
    try {
      const onTranscript = (text: string, isFinal: boolean) => {
        if (!text.trim()) return;
        if (isFinal) {
          handleIncomingTranscript('Usuário / Stakeholder', text);
        }
      };

      const onStatus = (status: AudioStatus) => {
        if (status.state === 'listening') {
          showNotice('success', status.message || 'Microfone conectado! Falando agora...');
        } else if (status.state === 'error') {
          showNotice('error', status.message || 'Erro na captura de áudio.');
          setIsRecording(false);
        } else if (status.state === 'unsupported') {
          showNotice('error', status.message || 'Navegador não suporta Web Speech API.');
          setIsRecording(false);
        } else if (status.state === 'stopped') {
          setIsRecording(false);
        }
      };

      if (source === 'mic') {
        await audioService.startMicrophoneCapture(onTranscript, onStatus);
      } else {
        await audioService.startTabAudioCapture(onTranscript, onStatus);
      }

      setIsRecording(true);
    } catch (e: any) {
      showNotice('error', `Não foi possível iniciar a captura: ${e?.message || e}`);
      setIsRecording(false);
    }
  }, [handleIncomingTranscript, showNotice]);

  const handleStopRecording = useCallback(() => {
    audioService.stopCapture();
    setIsRecording(false);
  }, []);

  const handleMarkQuestionAsked = useCallback((questionId: string) => {
    const context = getActiveSessionContext();
    if (!context) return;
    const updated = markQuestionAsked(context.project.id, context.session.id, questionId);
    if (updated) refresh();
  }, [refresh]);

  // Global Keyboard Shortcuts (Atalhos Globais recomendados pelo Especialista de UX)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);

      // Alt + F: Alternar Modo Foco / Cinema
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
        return;
      }

      // Atalhos ativos na Sala ao Vivo
      if (activeView === 'live_room' && !isInput) {
        // Barra de Espaço: Iniciar/Pausar Gravação
        if (e.code === 'Space') {
          e.preventDefault();
          if (isRecording) {
            handleStopRecording();
            showNotice('info', 'Gravação pausada via teclado (Espaço).');
          } else {
            handleStartRecording('mic');
            showNotice('info', 'Escuta iniciada via teclado (Espaço).');
          }
          return;
        }

        // Ctrl + M ou Alt + M: Marcar próxima pergunta do Prompter como feita
        if ((e.ctrlKey || e.altKey) && (e.key === 'm' || e.key === 'M')) {
          e.preventDefault();
          const unasked = getActiveSessionContext()?.session.liveQuestions.find(q => !q.asked);
          if (unasked) {
            handleMarkQuestionAsked(unasked.id);
            showNotice('success', 'Pergunta do Prompter marcada como realizada!');
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isRecording, handleStartRecording, handleStopRecording, handleMarkQuestionAsked, showNotice]);

  // Handlers de projeto: ficam antes do retorno antecipado porque a tela vazia também os usa
  const handleSelectProject = (projectId: string) => {
    select(projectId);
  };

  const handleOpenProject = (projectId: string, targetView: AppView = 'project_hub') => {
    handleSelectProject(projectId);
    if (targetView === 'live_room') {
      // Se já houver falas na sessão atual, ou se o usuário quiser nova reunião, deixamos preparado
      const proj = storageService.getActiveProject();
      const current = proj?.sessions.find(s => s.id === proj.activeSessionId) || proj?.sessions[0];
      if (proj && current && current.rawTranscript.length > 0) {
        // Cria nova sessão para nova reunião se a anterior já foi encerrada com falas
        storageService.createNewSession(proj.id);
        refresh();
      }
    }
    setActiveView(targetView);
  };

  const handleCreateProject = (name: string, description: string) => {
    const newProj = create(name, description);
    setActiveView('project_hub');
    showNotice('success', `Projeto "${newProj.name}" criado com sucesso!`);
  };

  const handleImportProjectJson = (jsonString: string) => {
    try {
      const imported = importFromJson(jsonString);
      showNotice('success', `Projeto "${imported.name}" importado com sucesso!`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Erro ao importar projeto.');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    remove(projectId);
    showNotice('info', 'Projeto excluído com sucesso.');
  };

  const handleClearAllProjects = () => {
    clearAll();
    setActiveView('projects');
    showNotice('success', 'Todos os projetos foram apagados. Crie o seu para começar do zero.');
  };

  // Mapas de versões antigas (nós soltos, sem pai) ganham a estrutura em árvore ao abrir a sala
  const legacyMapSessionId = activeProject?.sessions.find(
    s => s.id === (activeProject.activeSessionId || activeProject.sessions[0]?.id)
  )?.mindMapNodes.some(n => n.type !== 'root' && !n.parentId)
    ? (activeProject.activeSessionId || activeProject.sessions[0]?.id)
    : undefined;
  useEffect(() => {
    if (!activeProject || !legacyMapSessionId) return;
    refreshMindMap(activeProject.id, legacyMapSessionId);
    refresh();
  }, [activeProject, legacyMapSessionId, refresh]);

  // Sem nenhum projeto: mostra só a tela inicial, para o usuário criar ou importar o primeiro
  if (!activeProject) {
    if (!ready) return null;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          project={null}
          projects={projects}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onGoHome={() => setActiveView('projects')}
          isRecording={false}
          recordingDuration={0}
        />
        <main style={{ flex: 1, minWidth: 0, padding: '0 24px 32px 24px', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <ProjectsHomeView
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onImportProject={handleImportProjectJson}
            onDeleteProject={handleDeleteProject}
            onResetAllData={handleClearAllProjects}
            onNavigateToKnowledge={(view) => setActiveView(view)}
          />
        </main>
        <NoticeToast notice={notice} onDismiss={() => setNotice(null)} />
        <ApiKeyModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          project={null}
          onProjectImported={(imported) => {
            refresh();
            showNotice('success', `Projeto "${imported.name}" importado.`);
          }}
        />
      </div>
    );
  }

  const currentSession: MeetingSession | undefined =
    activeProject.sessions.find(s => s.id === activeProject.activeSessionId) ||
    activeProject.sessions[0];

  // Handler para Relatar Bug de Produção a partir de fala do cliente
  const handleReportBug = (seg: TranscriptSegment) => {
    if (!activeProject || !currentSession) return;
    storageService.addBugReport(activeProject.id, {
      title: seg.text.length > 70 ? seg.text.slice(0, 67) + '...' : seg.text,
      severity: seg.highlightType === 'pain' ? 'critical' : 'high',
      speaker: seg.speaker,
      quote: seg.text,
      sessionTitle: currentSession.title,
      timestamp: seg.timestamp,
      status: 'open'
    });
    refresh();
    showNotice('success', 'Bug de Produção registrado no catálogo técnico com evidência!');
  };

  // Handler para atualizar DoR / DoD nas histórias de usuário
  const handleToggleStoryChecklist = (
    epicId: string,
    featId: string,
    storyId: string,
    type: 'dor' | 'dod',
    itemId: string
  ) => {
    if (!activeProject) return;
    const epic = activeProject.epics.find(e => e.id === epicId);
    if (!epic) return;
    const feat = epic.features.find(f => f.id === featId);
    if (!feat) return;
    const story = feat.userStories.find(s => s.id === storyId);
    if (!story) return;

    const toggle = (items: ChecklistItem[]) => items.map(i => (i.id === itemId ? { ...i, checked: !i.checked } : i));
    const dor = story.dorChecklist || [];
    const dod = story.dodChecklist || [];

    // Imutável: o objeto da história pertence ao estado do React e não pode ser alterado no lugar
    storageService.updateStoryChecklists(
      activeProject.id, epicId, featId, storyId,
      type === 'dor' ? toggle(dor) : dor,
      type === 'dod' ? toggle(dod) : dod
    );
    refresh();
  };

  const {
    handleAddStakeholder,
    handleUpdateStakeholder,
    handleRemoveStakeholder,
    handleInterviewConfirm,
    handleInterviewSkip,
    handleAddNote,
    handleUpdateNote,
    handleRemoveNote,
    handlePromoteNoteToDecision,
    handlePromoteNoteToStory,
    handleScheduleMeeting,
    handleStartMeeting,
    handleCancelMeeting,
    handleRemoveMeeting,
    handleSaveClosing
  } = createProjectActions({
    project: activeProject,
    session: currentSession,
    refresh,
    saveProject,
    showNotice,
    openLiveRoom: () => setActiveView('live_room')
  });

  const handleChangeSessionType = (sessionId: string, type: MeetingType) => {
    setSessionType(activeProject.id, sessionId, type);
    refresh();
  };

  const handleToggleAssistant = (sessionId: string, enabled: boolean) => {
    setAssistantEnabled(activeProject.id, sessionId, enabled);
    refresh();
    showNotice('info', enabled ? 'Assistente ligado: ele acompanha cada fala nova.' : 'Assistente desligado.');
  };

  const handleRunAssistantNow = async (sessionId: string) => {
    setIsAssistantBusy(true);
    try {
      const updated = await runAssistant(activeProject.id, sessionId, { force: true });
      if (updated) refresh();
      else showNotice('info', 'Não há falas para o assistente analisar ainda.');
    } finally {
      setIsAssistantBusy(false);
    }
  };

  const handleStartFirstSession = () => {
    storageService.createNewSession(activeProject.id);
    refresh();
  };

  const handleClearCurrentSessionTranscript = () => {
    if (!currentSession || !activeProject) return;
    const updatedSession: MeetingSession = {
      ...currentSession,
      rawTranscript: [],
      painPoints: [],
      jtbds: [],
      liveQuestions: [],
      mindMapNodes: currentSession.mindMapNodes.filter(n => n.type === 'root'),
      mindMapEdges: []
    };
    const updatedProj: DiscoveryProject = {
      ...activeProject,
      sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
    };
    saveProject(updatedProj);
    showNotice('info', 'Falas e tópicos desta reunião foram limpos com sucesso.');
  };

  const handleSelectSession = (sessionId: string) => {
    const updated = { ...activeProject, activeSessionId: sessionId };
    saveProject(updated);
  };

  const handleCreateSession = (title: string, participants: string[]) => {
    const session = storageService.createNewSession(activeProject.id, title, participants);
    refresh();
    showNotice('success', `Sala "${session.title}" criada e ativa!`);
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const updatedSessions = activeProject.sessions.map(s =>
      s.id === sessionId ? { ...s, title: newTitle } : s
    );
    const updatedProj = { ...activeProject, sessions: updatedSessions };
    saveProject(updatedProj);
    showNotice('success', `Sala renomeada para "${newTitle}".`);
  };

  // Análise manual ou por lote acionada pelo usuário para toda a conversa
  const handleAnalyzeSessionWithAI = async () => {
    if (!currentSession || !activeProject) return;

    if (currentSession.rawTranscript.length === 0) {
      showNotice('info', 'Nenhuma fala registrada nesta sessão. Grave pelo microfone, anote um insight ou importe um arquivo.');
      return;
    }

    setIsAnalyzingLive(true);
    try {
      const speechSlice = currentSession.rawTranscript.slice(-12).map(s => ({
        speaker: s.speaker,
        text: s.text
      }));

      const analysis = await geminiService.analyzeLiveConversation(speechSlice, activeProject.description);

      if (analysis.error) {
        showNotice('info', `Análise local offline realizada (${analysis.error})`);
      }

      // O merge lê a sessão mais recente do storage: falas gravadas enquanto a IA respondia não se perdem
      const updated = applyLiveAnalysis(activeProject.id, currentSession.id, analysis);
      refresh();

      const after = updated?.sessions.find(s => s.id === currentSession.id);
      const hadRoot = currentSession.mindMapNodes.some(n => n.type === 'root');
      const addedQuestions = Math.max(0, (after?.liveQuestions.length ?? 0) - currentSession.liveQuestions.length);
      const addedNodes = Math.max(0, (after?.mindMapNodes.length ?? 0) - currentSession.mindMapNodes.length - (hadRoot ? 0 : 1));

      showNotice('success', `Análise concluída com sucesso! +${addedQuestions} perguntas contextuais e +${addedNodes} nós no mapa mental.`);
    } catch (err: any) {
      console.error('Erro na análise da sessão:', err);
      showNotice('error', `Falha ao processar análise: ${err?.message || err}`);
    } finally {
      setIsAnalyzingLive(false);
    }
  };

  const handleImportTranscriptFile = async (segments: { speaker: string; text: string; timestamp: string }[]) => {
    if (!currentSession || !activeProject) return;
    const converted: TranscriptSegment[] = segments.map((s, idx) => ({
      id: 'import-' + Date.now() + '-' + idx,
      speaker: s.speaker as TranscriptSegment['speaker'],
      text: s.text,
      timestamp: s.timestamp,
      isFinal: true
    }));

    appendSegments(activeProject.id, currentSession.id, converted);
    refresh();

    showNotice('info', `${converted.length} falas importadas. Sintetizando mapa mental e perguntas...`);

    try {
      setIsAnalyzingLive(true);
      const speechSlice = [...currentSession.rawTranscript, ...converted].slice(-12).map(s => ({ speaker: s.speaker, text: s.text }));
      const analysis = await geminiService.analyzeLiveConversation(speechSlice, activeProject.description);

      const updated = applyLiveAnalysis(activeProject.id, currentSession.id, analysis);
      refresh();

      const after = updated?.sessions.find(s => s.id === currentSession.id);
      const addedQuestions = Math.max(0, (after?.liveQuestions.length ?? 0) - currentSession.liveQuestions.length);
      showNotice('success', `Importação concluída! +${addedQuestions} perguntas e +${analysis.newMindMapNodes.length} tópicos gerados no mapa.`);
    } catch (e: any) {
      console.error('Erro ao analisar falas importadas:', e);
    } finally {
      setIsAnalyzingLive(false);
    }
  };

  const handleAudioWhisperUpload = async (file: File) => {
    const key = storageService.getOpenAiApiKey();
    if (!key) {
      showNotice('error', 'Chave da OpenAI não configurada. Configure sua chave nas Configurações para transcrever arquivos de áudio via Whisper.');
      setIsSettingsOpen(true);
      return;
    }

    try {
      setIsTranscribingAudio(true);
      showNotice('info', `🎙️ Enviando áudio "${file.name}" para o OpenAI Whisper... Transcrevendo com alta precisão...`);

      const result = await transcribeAudioWithWhisper(file, key);

      if (!result.text && (!result.segments || result.segments.length === 0)) {
        showNotice('error', 'Nenhuma fala audível detectada neste arquivo de áudio.');
        return;
      }

      let parsedSegments: { speaker: string; text: string; timestamp: string }[] = [];

      if (result.segments && result.segments.length > 0) {
        parsedSegments = result.segments.map((seg, idx) => {
          const timestamp = audioService.formatSecondsToTimestamp(seg.start);
          const isQuestion = seg.text.includes('?');
          const speaker = isQuestion
            ? 'Entrevistador (PM)'
            : (idx % 2 === 0 ? 'Usuário / Stakeholder' : 'Entrevistador (PM)');
          return {
            speaker,
            text: seg.text,
            timestamp
          };
        });
      } else {
        const sentences = result.text.split(/(?<=[.?!])\s+/);
        parsedSegments = sentences.filter(s => s.trim().length > 0).map((sentence, idx) => ({
          speaker: idx % 2 === 0 ? 'Usuário / Stakeholder' : 'Entrevistador (PM)',
          text: sentence.trim(),
          timestamp: audioService.formatSecondsToTimestamp(idx * 8)
        }));
      }

      await handleImportTranscriptFile(parsedSegments);
      showNotice('success', `🎉 Transcrição Whisper concluída! ${parsedSegments.length} falas extraídas com precisão e sintetizadas.`);
    } catch (err: any) {
      console.error('Erro no upload Whisper:', err);
      showNotice('error', `Falha ao transcrever áudio com Whisper: ${err?.message || err}`);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const handleFileUploadInApp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioService.isAudioFile(file)) {
      await handleAudioWhisperUpload(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = audioService.parseTranscriptFile(content);
        handleImportTranscriptFile(parsed);
        showNotice('success', `${parsed.length} falas importadas com sucesso!`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleEditMap = (edit: (session: MeetingSession) => MeetingSession) => {
    if (!currentSession) return;
    editMindMap(activeProject.id, currentSession.id, edit);
    refresh();
  };

  const handleRefreshMap = () => {
    if (!currentSession) return;
    refreshMindMap(activeProject.id, currentSession.id);
    refresh();
    showNotice('success', 'Mapa mental atualizado com o que foi dito até agora.');
  };

  const handleAddFlowStep = (stepData: Omit<UserFlowStep, 'id'>) => {
    if (!currentSession) return;
    const newStep: UserFlowStep = {
      ...stepData,
      id: 'step-' + Date.now()
    };
    const updatedSession = {
      ...currentSession,
      userFlowSteps: [...currentSession.userFlowSteps, newStep]
    };
    const updatedProj = {
      ...activeProject,
      sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
    };
    saveProject(updatedProj);
  };

  const handleUpdateTaskStatus = (
    epicId: string,
    featId: string,
    storyId: string,
    taskId: string,
    newStatus: 'todo' | 'in_progress' | 'done'
  ) => {
    const updatedEpics = activeProject.epics.map(epic => {
      if (epic.id !== epicId) return epic;
      return {
        ...epic,
        features: epic.features.map(feat => {
          if (feat.id !== featId) return feat;
          return {
            ...feat,
            userStories: feat.userStories.map(story => {
              if (story.id !== storyId) return story;
              return {
                ...story,
                tasks: story.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
              };
            })
          };
        })
      };
    });

    const updatedProj = { ...activeProject, epics: updatedEpics };
    saveProject(updatedProj);
  };

  const slicingStory = slicingStoryId
    ? activeProject.epics.flatMap(e => e.features).flatMap(f => f.userStories).find(s => s.id === slicingStoryId)
    : undefined;

  const {
    handleSliceStory,
    handleMergeDuplicate,
    handleUndoBacklog,
    handleFindEvidence,
    handleApplyEvidence,
    handleApplyReview,
    handleGenerateBacklogWithAI
  } = createBacklogActions({
    project: activeProject,
    session: currentSession,
    pendingReview,
    pendingEvidence,
    slicingStory,
    generationSessions: activeProject.sessions.filter(s => generationSessionIds.includes(s.id)),
    update,
    showNotice,
    setPendingReview,
    setPendingEvidence,
    setSlicingStoryId,
    setIsGenerating: setIsGeneratingBacklog,
    openBacklog: () => setActiveView('backlog')
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <Header
        project={activeProject}
        projects={projects}
        activeView={activeView}
        onNavigate={setActiveView}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onGoHome={() => setActiveView('projects')}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />

      <div className="app-body">
      {activeView !== 'projects' && !isFocusMode && activeProject && (
        <Sidebar
          activeView={activeView}
          onChange={setActiveView}
          transcriptCount={currentSession?.rawTranscript.length || 0}
          epicCount={activeProject.epics.length}
          sessionCount={activeProject.sessions.length}
          stakeholderCount={(activeProject.stakeholders ?? []).length}
          noteCount={(activeProject.notes ?? []).length}
          upcomingMeetingCount={(activeProject.scheduledMeetings ?? []).filter(m => m.status === 'scheduled').length}
          projectName={activeProject.name}
        />
      )}
      <main style={{
        flex: 1,
        minWidth: 0,
        padding: activeView === 'projects' ? '0 24px 32px 24px' : (isFocusMode ? '10px 24px 20px 24px' : '0 20px 20px 20px'),
        maxWidth: activeView === 'projects' ? '1440px' : undefined,
        margin: activeView === 'projects' ? '0 auto' : undefined,
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* VIEW: PÁGINA PRINCIPAL / HUB GERAL */}
        {activeView === 'projects' && (
          <ProjectsHomeView
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onImportProject={handleImportProjectJson}
            onDeleteProject={handleDeleteProject}
            onResetAllData={handleClearAllProjects}
            onNavigateToKnowledge={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW 0: PROJETO & PRODUTO INICIAL */}
        {activeView === 'project_hub' && (
          <ProjectHubView
            key={activeProject.id}
            project={activeProject}
            onUpdateProject={(updated) => {
              saveProject(updated);
            }}
            onNavigateToView={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW: SEGUNDO CÉREBRO DASHBOARD */}
        {activeView === 'brain_dashboard' && (
          <SecondBrainDashboardView
            project={activeProject}
            activeSession={currentSession}
            onNavigateToView={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW: STAKEHOLDERS */}
        {activeView === 'stakeholders' && (
          <StakeholdersView
            project={activeProject}
            onAdd={handleAddStakeholder}
            onUpdate={handleUpdateStakeholder}
            onRemove={handleRemoveStakeholder}
            onOpenInterview={() => setActiveView('interview')}
          />
        )}

        {/* VIEW: AGENDA DE REUNIÕES */}
        {activeView === 'agenda' && (
          <AgendaView
            project={activeProject}
            onSchedule={handleScheduleMeeting}
            onStart={handleStartMeeting}
            onCancel={handleCancelMeeting}
            onRemove={handleRemoveMeeting}
          />
        )}

        {/* VIEW: ANOTAÇÕES */}
        {activeView === 'notes' && (
          <NotesView
            project={activeProject}
            onAdd={handleAddNote}
            onUpdate={handleUpdateNote}
            onRemove={handleRemoveNote}
            onPromoteToDecision={handlePromoteNoteToDecision}
            onPromoteToStory={handlePromoteNoteToStory}
          />
        )}

        {/* VIEW: COPILOTO ENTREVISTADOR */}
        {activeView === 'interview' && (
          <InterviewView
            project={activeProject}
            onConfirm={handleInterviewConfirm}
            onSkip={handleInterviewSkip}
            onNavigateToView={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW 1: LIVE ROOM — projeto ainda sem nenhuma sessão */}
        {activeView === 'live_room' && !currentSession && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '64px 16px', textAlign: 'center' }}>
            <Radio size={32} />
            <h2 style={{ margin: 0 }}>Nenhuma sessão de discovery neste projeto</h2>
            <p style={{ margin: 0, maxWidth: '460px', color: 'var(--text-muted)' }}>
              Crie a primeira sessão para gravar, digitar notas ou importar uma transcrição.
            </p>
            <button className="btn btn-primary" onClick={handleStartFirstSession}>
              <Plus size={14} /> Iniciar primeira sessão
            </button>
          </div>
        )}

        {/* VIEW 1: LIVE ROOM */}
        {activeView === 'live_room' && currentSession && (
          <>
          {/* Barra de Modo Foco e Atalhos Globais de UX */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsFocusMode(prev => !prev)}
                className="btn btn-secondary"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  gap: '6px',
                  background: isFocusMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: isFocusMode ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  color: isFocusMode ? '#c4b5fd' : 'var(--text-main)'
                }}
                title="Oculta a barra lateral para dar 100% de tela à entrevista e ao prompter de perguntas (Atalho: Alt + F)"
              >
                {isFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {isFocusMode ? 'Sair do Modo Foco (Alt + F)' : 'Modo Foco / Cinema (Alt + F)'}
              </button>

              <button
                onClick={() => setShowShortcutsHelp(prev => !prev)}
                className="btn btn-ghost"
                style={{ padding: '5px 8px', fontSize: '0.72rem', gap: '4px', color: 'var(--text-dim)' }}
                title="Ver atalhos de teclado da reunião"
              >
                <Keyboard size={13} /> Atalhos
              </button>
            </div>

            {showShortcutsHelp && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Espaço</kbd> Gravar/Pausar</span>
                <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Ctrl + M</kbd> Marcar Pergunta</span>
                <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Alt + F</kbd> Modo Foco</span>
              </div>
            )}
          </div>

          {/* Gerenciador de Salas de Reunião: Abas, Seleção, Criação e Visualização */}
          <LiveSessionsManager
            project={activeProject}
            activeSession={currentSession}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onRenameSession={handleRenameSession}
          />

          <SessionPeopleBar
            stakeholders={activeProject.stakeholders ?? []}
            participantIds={currentSession.participantIds ?? []}
            currentSpeakerId={currentSession.currentSpeakerId}
            onChangeParticipants={(ids) => {
              setSessionParticipants(activeProject.id, currentSession.id, ids);
              refresh();
            }}
            onChangeSpeaker={(id) => {
              setCurrentSpeaker(activeProject.id, currentSession.id, id);
              refresh();
            }}
          />

          <SessionAgendaCard session={currentSession} />

          <AssistantPanel
            session={currentSession}
            busy={isAssistantBusy}
            onChangeType={(type) => handleChangeSessionType(currentSession.id, type)}
            onToggle={(enabled) => handleToggleAssistant(currentSession.id, enabled)}
            onRunNow={() => handleRunAssistantNow(currentSession.id)}
          />

          <SessionClosingPanel
            key={currentSession.id}
            savedNote={closingOf(activeProject.notes ?? [], currentSession.id)}
            onSave={handleSaveClosing}
            onReviewBacklog={handleGenerateBacklogWithAI}
            isGenerating={isGeneratingBacklog}
          />

          <div style={{ margin: '0 -20px' }}>
            <AudioCaptureBar
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onNewTranscriptSegment={handleIncomingTranscript}
              onImportTranscriptFile={handleImportTranscriptFile}
              onUploadAudioFile={handleAudioWhisperUpload}
              isTranscribingAudio={isTranscribingAudio}
              isInformalMode={isInformalChatMode}
              onToggleInformalMode={() => {
                const next = !isInformalChatMode;
                setIsInformalChatMode(next);
                showNotice('info', next ? '☕ Modo Bate-Papo ativado: IA pausada para economizar tokens.' : '🎯 Modo Entrevista ativado: IA analisando falas em tempo real.');
              }}
            />
          </div>

          {/* Input oculto para importação rápida via Empty State */}
          <input
            ref={liveFileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,.txt,.vtt,.srt,.json"
            onChange={handleFileUploadInApp}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: '16px', height: 'calc(100vh - 240px)', minHeight: '560px', maxHeight: '820px' }}>
            {/* Left Column: Transcription + Question Prompter */}
            <div style={{ display: 'grid', gridTemplateRows: '1.05fr 1fr', gap: '14px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <LiveTranscriptionView
                segments={currentSession?.rawTranscript || []}
                onManualNoteSubmit={handleIncomingTranscript}
                onActionStartMic={() => handleStartRecording('mic')}
                onActionImportFile={() => liveFileInputRef.current?.click()}
                onReportBug={handleReportBug}
                onTriggerAnalysis={handleAnalyzeSessionWithAI}
                onClearTranscript={handleClearCurrentSessionTranscript}
                isAnalyzing={isAnalyzingLive}
              />
              <LiveQuestionPrompter
                questions={currentSession?.liveQuestions || []}
                onMarkAsked={handleMarkQuestionAsked}
                onTriggerAnalysis={handleAnalyzeSessionWithAI}
                isAnalyzing={isAnalyzingLive}
              />
            </div>

            {/* Right Column: Mind Map or User Flow Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => setActiveRightTab('mindmap')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: activeRightTab === 'mindmap' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: activeRightTab === 'mindmap' ? '#c4b5fd' : 'var(--text-muted)',
                    border: activeRightTab === 'mindmap' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <GitBranch size={13} />
                  Mapa Mental
                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)' }}>
                    {currentSession?.mindMapNodes.length || 0} nós
                  </span>
                </button>

                <button
                  onClick={() => setActiveRightTab('userflow')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: activeRightTab === 'userflow' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: activeRightTab === 'userflow' ? '#67e8f9' : 'var(--text-muted)',
                    border: activeRightTab === 'userflow' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Workflow size={13} />
                  Fluxo do Usuário
                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)' }}>
                    {currentSession?.userFlowSteps.length || 0} etapas
                  </span>
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                {activeRightTab === 'mindmap' ? (
                  <MindMapCanvas
                    nodes={currentSession?.mindMapNodes || []}
                    onRename={(id, label) => handleEditMap(s => renameNode(s, id, label))}
                    onAddChild={(parentId, label) => handleEditMap(s => addChildNode(s, parentId, label))}
                    onDelete={id => handleEditMap(s => deleteNode(s, id))}
                    onRefresh={handleRefreshMap}
                    onTriggerAnalysis={handleAnalyzeSessionWithAI}
                    isAnalyzing={isAnalyzingLive}
                  />
                ) : (
                  <UserFlowView
                    steps={currentSession?.userFlowSteps || []}
                    onAddStep={handleAddFlowStep}
                  />
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <AgentPanel scope="meeting" title="Agentes de reunião (sobre a sessão atual)" project={activeProject} session={currentSession} />
          </div>
          </>
        )}

        {/* VIEW: HISTÓRICO DE REUNIÕES & FOLLOW-UP */}
        {activeView === 'meetings' && (
          <MeetingsView
            project={activeProject}
            selectedSessionId={currentSession?.id}
            onSelectSession={handleSelectSession}
            onGoLive={() => setActiveView('live_room')}
          />
        )}

        {/* VIEW: REFINAR */}
        {activeView === 'refine' && (
          <RefineView
            project={activeProject}
            session={currentSession}
            onGoToBacklog={() => setActiveView('backlog')}
          />
        )}

        {/* VIEW: ESPAÇO DO PO */}
        {activeView === 'po_space' && (
          <POSpaceView project={activeProject} session={currentSession} />
        )}

        {/* VIEW: BANCA DE VALIDAÇÃO DE PRODUTO & UX/UI */}
        {activeView === 'product_audit' && (
          <ProductAuditView
            project={activeProject}
            session={currentSession}
          />
        )}

        {/* VIEW 2: BACKLOG & OKRS (DISCOVERY AO DONE) */}
        {activeView === 'backlog' && (
          <>
          {pendingReview && pendingReview.projectId === activeProject.id && (() => {
            const filtered = showAllProposals ? pendingReview.proposals : proposalsForMeetingType(pendingReview.proposals, pendingReview.type);
            // Se o filtro do tipo esconderia tudo, mostra tudo em vez de uma tela vazia
            const visible = filtered.length > 0 ? filtered : pendingReview.proposals;
            return (
              <BacklogReviewPanel
                key={`${showAllProposals}-${visible.map(p => p.id).join('|')}`}
                proposals={visible}
                onApply={handleApplyReview}
                onDiscard={() => setPendingReview(null)}
                hiddenCount={pendingReview.proposals.length - visible.length}
                typeLabel={pendingReview.type ? MEETING_TYPE_LABELS[pendingReview.type].title.split(' (')[0] : undefined}
                onShowAll={() => setShowAllProposals(true)}
              />
            );
          })()}
          {pendingEvidence && pendingEvidence.projectId === activeProject.id && (
            <EvidencePanel
              key={pendingEvidence.suggestions.map(s => s.id).join('|')}
              suggestions={pendingEvidence.suggestions}
              onApply={handleApplyEvidence}
              onDiscard={() => setPendingEvidence(null)}
            />
          )}
          <SessionSourcePicker sessions={activeProject.sessions} selectedIds={generationSessionIds} onChange={setGenerationSessionIds} />
          <BacklogHealthPanel
            epics={activeProject.epics}
            onFindEvidence={handleFindEvidence}
            undoLabel={lastSnapshot(activeProject)?.label}
            onUndo={handleUndoBacklog}
            onSliceStory={setSlicingStoryId}
            onMergeDuplicate={handleMergeDuplicate}
          />
          {slicingStory && (
            <StorySliceDialog key={slicingStory.id} story={slicingStory} onConfirm={handleSliceStory} onCancel={() => setSlicingStoryId(null)} />
          )}
          <DiscoveryToDoneView
            okrs={activeProject.okrs}
            epics={activeProject.epics}
            project={activeProject}
            onGenerateBacklogWithAI={handleGenerateBacklogWithAI}
            isGenerating={isGeneratingBacklog}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onToggleChecklistItem={handleToggleStoryChecklist}
            onNavigateToLiveRoom={() => setActiveView('live_room')}
          />
          </>
        )}

        {/* VIEW 3: PROJECT DOCUMENTATION & HISTORY */}
        {activeView === 'documentation' && (
          <ProjectDocumentationView
            project={activeProject}
            activeSession={currentSession}
            prd={activeProject.prd}
            leanCanvas={activeProject.leanCanvas}
            decisionLog={activeProject.decisionLog}
            personas={activeProject.personas || []}
            bugReports={activeProject.bugReports || []}
          />
        )}

        {/* VIEW 4: AGILE & AI KNOWLEDGE HUB */}
        {activeView === 'knowledge_hub' && (
          <AgileKnowledgeHubView />
        )}

        {/* VIEW 5: AGENTS & GITHUB CRAWLER */}
        {activeView === 'agent_studio' && (
          <AgentStudioView
            onNavigateToKnowledgeHub={() => setActiveView('knowledge_hub')}
          />
        )}
      </main>
      </div>

      {/* Notificações */}
      <NoticeToast notice={notice} onDismiss={() => setNotice(null)} />

      {/* Settings Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={activeProject}
        onProjectImported={(imported) => {
          refresh();
          showNotice('success', `Projeto "${imported.name}" importado.`);
        }}
      />
    </div>
  );
};

export default App;
