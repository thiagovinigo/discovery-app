import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChecklistItem,
  DiscoveryProject,
  MeetingSession,
  StoryMapRelease,
  TranscriptSegment
} from './types/discovery';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import {
  appendSegments,
  applyLiveAnalysis,
  closeMeeting,
  editMindMap,
  getActiveSessionContext,
  getLiveAutoInterval,
  markQuestionAsked,
  recordIncomingSegment,
  refreshJourney,
  refreshMindMap,
  refreshStoryMap,
  setLiveAutoInterval
} from './services/sessionService';
import { generateJourneyWithAI } from './services/journeyService';
import { proposeStoryMapToBacklog, syncStoryMap } from './services/storyMapService';
import { buildOfflinePrototype, generatePrototypeWithAI } from './services/prototypeService';
import { buildWhisperPrompt } from './services/whisperFilter';
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
import { setCurrentSpeaker, setSessionParticipants } from './services/stakeholderService';
import { MEETING_TYPE_LABELS, runAssistant, setAssistantEnabled, setSessionType } from './services/assistantService';
import type { MeetingType } from './types/discovery';
import { audioService, type AudioStatus } from './services/audioService';
import { inferSpeakerTurnsFromWhisper, transcribeAudioWithWhisper } from './services/openAiClient';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
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
import { ProductAuditView } from './components/ProductAuditView';
import { LiveRoomView } from './components/LiveRoomView';
import type { RightTab } from './components/LiveRoomView';
import type { AppView } from './components/Sidebar';
import { AutomationDiscoveryView } from './components/AutomationDiscoveryView';
import { getProjectBlueprint, type ProjectBlueprintId } from './services/projectBlueprints';
import { applySuggestions, assignSpeaker, suggestSpeakers } from './services/speakerService';
import { generateMinutesWithAI, withMinutes } from './services/minutesService';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useHashView();
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('topics');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingBacklog, setIsGeneratingBacklog] = useState(false);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isAssistantBusy, setIsAssistantBusy] = useState(false);
  const [isGeneratingPrototype, setIsGeneratingPrototype] = useState(false);
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
  const [autoUpdateInterval, setAutoUpdateIntervalState] = useState<number>(() => getLiveAutoInterval());

  const recordingTimerRef = useRef<any>(null);
  const noticeTimerRef = useRef<any>(null);
  const lastAiErrorRef = useRef<string>('');
  // O callback de áudio nasce uma vez e enxergaria o valor antigo do estado; o ref sempre tem o atual
  const isInformalChatRef = useRef(false);
  const autoUpdateIntervalRef = useRef(autoUpdateInterval);
  useEffect(() => {
    isInformalChatRef.current = isInformalChatMode;
  }, [isInformalChatMode]);
  useEffect(() => {
    autoUpdateIntervalRef.current = autoUpdateInterval;
  }, [autoUpdateInterval]);

  const handleChangeAutoUpdateInterval = (nextInterval: number) => {
    setLiveAutoInterval(nextInterval);
    setAutoUpdateIntervalState(getLiveAutoInterval());
  };

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

    const { project: withSegment, triggeredAutoUpdate } = recordIncomingSegment(project.id, session.id, newSeg, {
      autoInterval: autoUpdateIntervalRef.current,
      paused: isInformalChatRef.current
    });
    if (withSegment) refresh();

    // Modo Bate-Papo Informal (pausado): salva a fala sem acionar IA (economiza tokens e preserva foco)
    if (isInformalChatRef.current) return;

    // Assistente ligado: acompanha cada fala nova, conforme o tipo da conversa
    if (session.assistant?.enabled) {
      void runAssistant(project.id, session.id).then(updated => {
        if (updated) refresh();
      });
    }

    if (!triggeredAutoUpdate) return;

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

  const handleCreateProject = (name: string, description: string, blueprintId?: ProjectBlueprintId) => {
    const newProj = create(name, description, blueprintId);
    setActiveView(blueprintId && blueprintId !== 'blank' ? getProjectBlueprint(blueprintId).recommendedEntryView : 'project_hub');
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

      const prompt = buildWhisperPrompt(activeProject, currentSession);
      const result = await transcribeAudioWithWhisper(file, key, file.name, { prompt });

      if (!result.text && (!result.segments || result.segments.length === 0)) {
        showNotice('error', 'Nenhuma fala audível detectada neste arquivo de áudio.');
        return;
      }

      let parsedSegments: { speaker: string; text: string; timestamp: string }[] = [];

      if (result.segments && result.segments.length > 0) {
        const turns = inferSpeakerTurnsFromWhisper(result.segments);
        parsedSegments = turns.map(turn => ({
          speaker: turn.speaker,
          text: turn.text,
          timestamp: audioService.formatSecondsToTimestamp(turn.start)
        }));
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

  const handleEditSession = (edit: (session: MeetingSession) => MeetingSession) => {
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

  const handleAssignSpeaker = (segmentId: string, stakeholderId: string | undefined) =>
    handleEditSession(s => assignSpeaker(s, segmentId, stakeholderId));

  const handleApplySpeakerSuggestions = () => {
    const stakeholders = activeProject.stakeholders ?? [];
    handleEditSession(s => applySuggestions(s, suggestSpeakers(s, stakeholders)));
    showNotice('success', 'Falas identificadas pelo que foi dito. Confira e ajuste se algo estiver errado.');
  };

  const handleGenerateMinutes = () => {
    handleEditSession(s => withMinutes(s, activeProject.stakeholders ?? []));
    showNotice('success', 'Ata gerada a partir da conversa.');
  };

  const handleGenerateMinutesAI = async () => {
    if (!currentSession) return;
    const enriched = await generateMinutesWithAI(currentSession, activeProject.stakeholders ?? []);
    handleEditSession(s => ({ ...s, minutes: enriched }));
    showNotice('success', 'Ata enriquecida com decisões, ações e prazos!');
  };

  // Encerra: para a gravação, refaz mapa e jornada com tudo o que foi dito e gera a ata
  const handleEndMeeting = () => {
    if (!currentSession) return;
    if (isRecording) handleStopRecording();
    closeMeeting(activeProject.id, currentSession.id);
    refresh();
    setActiveRightTab('minutes');
    showNotice('success', 'Reunião encerrada: mapa, jornada, story map e ata atualizados. Revise e gere o backlog se fizer sentido.');
  };

  const handleRefreshJourney = () => {
    if (!currentSession) return;
    refreshJourney(activeProject.id, currentSession.id);
    refresh();
    showNotice('success', 'Jornada e Story Map atualizados com a sequência contada até agora.');
  };

  const handleRefreshJourneyAI = async () => {
    if (!currentSession) return;
    const withAiJourney = await generateJourneyWithAI(currentSession, activeProject.stakeholders ?? []);
    handleEditSession(() => syncStoryMap(withAiJourney));
    showNotice('success', 'Jornada e Story Map enriquecidos com IA!');
  };

  const handleRefreshStoryMap = () => {
    if (!currentSession) return;
    refreshStoryMap(activeProject.id, currentSession.id);
    refresh();
    showNotice('success', 'User Story Map atualizado a partir da jornada, dores e JTBDs.');
  };

  const handleProposeStoryMapToBacklog = (release: StoryMapRelease | 'all') => {
    if (!currentSession) return;
    const proposals = proposeStoryMapToBacklog(activeProject, currentSession, release);
    if (proposals.length === 0) {
      showNotice('info', 'Nenhuma proposta nova para enviar: as histórias já estão no backlog ou não há cartões nesta faixa.');
      return;
    }
    setPendingReview({
      projectId: activeProject.id,
      sessionId: currentSession.id,
      type: currentSession.type,
      proposals
    });
    setActiveView('backlog');
    showNotice('success', `${proposals.length} propostas do Story Map enviadas para revisão do backlog!`);
  };

  const handleGenerateOfflinePrototype = () => {
    if (!currentSession) return;
    const proto = buildOfflinePrototype(currentSession, activeProject.name);
    handleEditSession(s => ({ ...s, prototype: proto }));
    showNotice('success', 'Wireframe navegável (baixa fidelidade, sem IA) atualizado.');
  };

  const handleGenerateAIPrototype = async () => {
    if (!currentSession) return;
    setIsGeneratingPrototype(true);
    try {
      const proto = await generatePrototypeWithAI(currentSession, activeProject);
      handleEditSession(s => ({ ...s, prototype: proto }));
      showNotice(
        'success',
        proto.source === 'ai'
          ? 'Protótipo HTML de alta fidelidade gerado com IA!'
          : 'Sem chave de IA configurada: wireframe de baixa fidelidade atualizado.'
      );
    } finally {
      setIsGeneratingPrototype(false);
    }
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

        {/* VIEW: DISCOVERY DE IA E AUTOMAÇÃO (ÉPICO E13) */}
        {activeView === 'automation_discovery' && (
          <AutomationDiscoveryView
            project={activeProject}
            activeSession={currentSession}
            onSaveAutomationDiscovery={(nextData) => {
              saveProject({ ...activeProject, automationDiscovery: nextData });
            }}
            onProposeToBacklog={(proposals) => {
              setPendingReview({
                projectId: activeProject.id,
                proposals,
                sessionId: currentSession?.id,
                type: 'discovery'
              });
              setActiveView('backlog');
            }}
            onNotify={(type, text) => showNotice(type, text)}
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

        {/* VIEW 1: LIVE ROOM (E11.9: extraído para LiveRoomView) */}
        {activeView === 'live_room' && (
          <LiveRoomView
            project={activeProject}
            currentSession={currentSession}
            activeRightTab={activeRightTab}
            onChangeRightTab={setActiveRightTab}
            isRecording={isRecording}
            isFocusMode={isFocusMode}
            isInformalChatMode={isInformalChatMode}
            autoUpdateInterval={autoUpdateInterval}
            isTranscribingAudio={isTranscribingAudio}
            isAssistantBusy={isAssistantBusy}
            isGeneratingBacklog={isGeneratingBacklog}
            isAnalyzingLive={isAnalyzingLive}
            isGeneratingPrototype={isGeneratingPrototype}
            onStartFirstSession={handleStartFirstSession}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onRenameSession={handleRenameSession}
            onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
            onEndMeeting={handleEndMeeting}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onIncomingTranscript={handleIncomingTranscript}
            onImportTranscriptFile={handleImportTranscriptFile}
            onUploadAudioFile={handleAudioWhisperUpload}
            onToggleInformalMode={() => {
              const next = !isInformalChatMode;
              setIsInformalChatMode(next);
              showNotice('info', next ? '☕ Modo Bate-Papo ativado: IA pausada para economizar tokens.' : '🎯 Modo Entrevista ativado: IA analisando falas em tempo real.');
            }}
            onChangeAutoUpdateInterval={handleChangeAutoUpdateInterval}
            onChangeParticipants={(ids) => {
              if (!currentSession) return;
              setSessionParticipants(activeProject.id, currentSession.id, ids);
              refresh();
            }}
            onChangeSpeaker={(id) => {
              if (!currentSession) return;
              setCurrentSpeaker(activeProject.id, currentSession.id, id);
              refresh();
            }}
            onChangeSessionType={(type) => currentSession && handleChangeSessionType(currentSession.id, type)}
            onToggleAssistant={(enabled) => currentSession && handleToggleAssistant(currentSession.id, enabled)}
            onRunAssistantNow={() => currentSession && handleRunAssistantNow(currentSession.id)}
            onSaveClosing={handleSaveClosing}
            onGenerateBacklogWithAI={handleGenerateBacklogWithAI}
            onAssignSpeaker={handleAssignSpeaker}
            onApplySpeakerSuggestions={handleApplySpeakerSuggestions}
            onReportBug={handleReportBug}
            onAnalyzeSessionWithAI={handleAnalyzeSessionWithAI}
            onClearCurrentSessionTranscript={handleClearCurrentSessionTranscript}
            onMarkQuestionAsked={handleMarkQuestionAsked}
            onEditSession={handleEditSession}
            onRefreshMap={handleRefreshMap}
            onRefreshJourney={handleRefreshJourney}
            onRefreshJourneyAI={handleRefreshJourneyAI}
            onRefreshStoryMap={handleRefreshStoryMap}
            onProposeStoryMapToBacklog={handleProposeStoryMapToBacklog}
            onGenerateOfflinePrototype={handleGenerateOfflinePrototype}
            onGenerateAIPrototype={handleGenerateAIPrototype}
            onGenerateMinutes={handleGenerateMinutes}
            onGenerateMinutesAI={handleGenerateMinutesAI}
          />
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
