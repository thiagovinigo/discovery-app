import React, { useState, useEffect, useRef } from 'react';
import {
  DiscoveryProject,
  MeetingSession,
  TranscriptSegment,
  UserFlowStep
} from './types/discovery';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
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
  Zap,
  FileText,
  GitBranch,
  Workflow,
  Plus,
  BookOpen,
  Brain,
  Rocket,
  Bot,
  Maximize2,
  Minimize2,
  Keyboard,
  Coffee,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [activeProject, setActiveProject] = useState<DiscoveryProject | null>(null);
  const [activeView, setActiveView] = useState<AppView>('projects');
  const [activeRightTab, setActiveRightTab] = useState<'mindmap' | 'userflow'>('mindmap');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingBacklog, setIsGeneratingBacklog] = useState(false);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);

  // New Specialist backlog features: Focus Mode & Informal Chat Mode
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isInformalChatMode, setIsInformalChatMode] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const liveFileInputRef = useRef<HTMLInputElement | null>(null);

  const recordingTimerRef = useRef<any>(null);
  const noticeTimerRef = useRef<any>(null);
  const lastAiErrorRef = useRef<string>('');

  const showNotice = (type: 'error' | 'info' | 'success', text: string) => {
    setNotice({ type, text });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 8000);
  };

  // Initialize projects from storage
  useEffect(() => {
    const all = storageService.getAllProjects();
    setProjects(all);
    const active = storageService.getActiveProject();
    setActiveProject(active);
  }, []);

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
          const sess = activeProject?.sessions.find(s => s.id === activeProject.activeSessionId) || activeProject?.sessions[0];
          const unasked = sess?.liveQuestions.find(q => !q.asked);
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
  }, [activeView, isRecording, activeProject]);

  if (!activeProject) return null;

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
    const updated = storageService.getActiveProject();
    setActiveProject({ ...updated });
    setProjects(storageService.getAllProjects());
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

    const dor = story.dorChecklist || [];
    const dod = story.dodChecklist || [];

    if (type === 'dor') {
      story.dorChecklist = dor.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i);
    } else {
      story.dodChecklist = dod.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i);
    }

    storageService.saveActiveProject(activeProject);
    setActiveProject({ ...activeProject });
  };

  // Handlers for Projects
  const handleSelectProject = (projectId: string) => {
    storageService.setActiveProjectId(projectId);
    const selected = storageService.getActiveProject();
    setActiveProject(selected);
  };

  const handleOpenProject = (projectId: string, targetView: AppView = 'project_hub') => {
    handleSelectProject(projectId);
    if (targetView === 'live_room') {
      // Se já houver falas na sessão atual, ou se o usuário quiser nova reunião, deixamos preparado
      const proj = storageService.getActiveProject();
      const current = proj.sessions.find(s => s.id === proj.activeSessionId) || proj.sessions[0];
      if (current && current.rawTranscript.length > 0) {
        // Cria nova sessão para nova reunião se a anterior já foi encerrada com falas
        storageService.createNewSession(proj.id);
        const updated = storageService.getActiveProject();
        setActiveProject({ ...updated });
        setProjects(storageService.getAllProjects());
      }
    }
    setActiveView(targetView);
  };

  const handleCreateProject = (name: string, description: string) => {
    const newProj = storageService.createNewProject(name, description);
    setProjects(storageService.getAllProjects());
    setActiveProject(newProj);
    setActiveView('project_hub');
    showNotice('success', `Projeto "${newProj.name}" criado com sucesso!`);
  };

  const handleImportProjectJson = (jsonString: string) => {
    try {
      const imported = storageService.importProject(jsonString);
      setProjects(storageService.getAllProjects());
      setActiveProject(imported);
      showNotice('success', `Projeto "${imported.name}" importado com sucesso!`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Erro ao importar projeto.');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = storageService.deleteProject(projectId);
    setProjects(updated);
    const active = storageService.getActiveProject();
    setActiveProject(active);
    showNotice('info', 'Projeto excluído com sucesso.');
  };

  const handleResetForOfficialTests = () => {
    const clean = storageService.resetForOfficialTests();
    setProjects(storageService.getAllProjects());
    setActiveProject(clean);
    setActiveView('projects');
    showNotice('success', '🎉 Espaço 100% limpo e pronto para seus testes oficiais!');
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
    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
    setProjects(storageService.getAllProjects());
    showNotice('info', 'Falas e tópicos desta reunião foram limpos com sucesso.');
  };

  const handleSelectSession = (sessionId: string) => {
    const updated = { ...activeProject, activeSessionId: sessionId };
    setActiveProject(updated);
    storageService.saveActiveProject(updated);
  };

  const handleCreateSession = (title: string, participants: string[]) => {
    const session = storageService.createNewSession(activeProject.id, title, participants);
    const updated = storageService.getActiveProject();
    setActiveProject({ ...updated });
    setProjects(storageService.getAllProjects());
    showNotice('success', `Sala "${session.title}" criada e ativa!`);
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const updatedSessions = activeProject.sessions.map(s =>
      s.id === sessionId ? { ...s, title: newTitle } : s
    );
    const updatedProj = { ...activeProject, sessions: updatedSessions };
    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
    setProjects(storageService.getAllProjects());
    showNotice('success', `Sala renomeada para "${newTitle}".`);
  };

  // Audio Capture Controls
  const handleStartRecording = async (source: 'mic' | 'tab') => {
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
  };

  const handleStopRecording = () => {
    audioService.stopCapture();
    setIsRecording(false);
  };

  // Incoming Speech or Simulation Chunk
  const handleIncomingTranscript = async (
    speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder',
    text: string
  ) => {
    if (!currentSession) return;

    const newSeg: TranscriptSegment = {
      id: 'seg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' }),
      isFinal: true,
      highlightType: text.toLowerCase().includes('trava') || text.toLowerCase().includes('caos') || text.toLowerCase().includes('dor')
        ? 'pain'
        : text.toLowerCase().includes('queria') || text.toLowerCase().includes('se tivesse')
        ? 'jtbd'
        : undefined
    };

    const updatedTranscript = [...currentSession.rawTranscript, newSeg];

    // Se estiver no Modo Bate-Papo Informal, salva a fala sem acionar IA (economiza tokens e preserva foco)
    if (isInformalChatMode) {
      const updatedSession: MeetingSession = {
        ...currentSession,
        rawTranscript: updatedTranscript
      };
      const updatedProj: DiscoveryProject = {
        ...activeProject,
        sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
      };
      setActiveProject(updatedProj);
      storageService.saveActiveProject(updatedProj);
      setProjects(storageService.getAllProjects());
      return;
    }

    // Trigger AI / Heuristic Analysis
    const recent = updatedTranscript.slice(-4).map(s => ({ speaker: s.speaker, text: s.text }));
    const analysis = await geminiService.analyzeLiveConversation(recent, activeProject.description);
    if (analysis.error) {
      // Evita repetir o mesmo aviso a cada fala
      if (analysis.error !== lastAiErrorRef.current) {
        lastAiErrorRef.current = analysis.error;
        showNotice('info', `IA offline: ${analysis.error}`);
      }
    } else {
      lastAiErrorRef.current = '';
    }

    // Update Mind Map
    const updatedMindNodes = [...currentSession.mindMapNodes];
    let root = updatedMindNodes.find(n => n.type === 'root');
    if (!root) {
      root = {
        id: 'm-root',
        label: currentSession.title || activeProject.name || 'Objetivo do Discovery',
        type: 'root',
        x: 400,
        y: 250,
        color: '#6366f1'
      };
      updatedMindNodes.unshift(root);
    }
    const updatedMindEdges = [...currentSession.mindMapEdges];

    analysis.newMindMapNodes.forEach(newNode => {
      if (!updatedMindNodes.some(n => n.label.toLowerCase() === newNode.label.toLowerCase())) {
        updatedMindNodes.push(newNode);
        updatedMindEdges.push({
          id: 'edge-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          source: root!.id,
          target: newNode.id
        });
      }
    });

    // Update User Flow Steps
    const updatedUserFlow = [...currentSession.userFlowSteps];
    analysis.newUserFlowSteps.forEach(newStep => {
      if (!updatedUserFlow.some(s => s.title.toLowerCase() === newStep.title.toLowerCase())) {
        updatedUserFlow.push({
          ...newStep,
          stepNumber: updatedUserFlow.length + 1
        });
      }
    });

    // Deduplicate Questions
    const existingQTexts = new Set(currentSession.liveQuestions.map(q => q.question.toLowerCase().trim()));
    const freshQuestions = analysis.newQuestions.filter(q => !existingQTexts.has(q.question.toLowerCase().trim()));
    const updatedQuestions = [...freshQuestions, ...currentSession.liveQuestions];

    // Deduplicate Pain Points
    const existingPains = new Set(currentSession.painPoints.map(p => p.description.toLowerCase().trim()));
    const freshPains = analysis.newPainPoints.filter(p => !existingPains.has(p.description.toLowerCase().trim()));
    const updatedPainPoints = [...currentSession.painPoints, ...freshPains];

    // Deduplicate JTBDs
    const existingJobs = new Set(currentSession.jtbds.map(j => j.job.toLowerCase().trim()));
    const freshJobs = analysis.newJtbds.filter(j => !existingJobs.has(j.job.toLowerCase().trim()));
    const updatedJtbds = [...currentSession.jtbds, ...freshJobs];

    const updatedSession: MeetingSession = {
      ...currentSession,
      rawTranscript: updatedTranscript,
      liveQuestions: updatedQuestions,
      painPoints: updatedPainPoints,
      jtbds: updatedJtbds,
      mindMapNodes: updatedMindNodes,
      mindMapEdges: updatedMindEdges,
      userFlowSteps: updatedUserFlow
    };

    const updatedProj: DiscoveryProject = {
      ...activeProject,
      sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
    };

    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
    setProjects(storageService.getAllProjects());
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

      // Merge Mind Map Nodes
      const updatedMindNodes = [...currentSession.mindMapNodes];
      let root = updatedMindNodes.find(n => n.type === 'root');
      if (!root) {
        root = {
          id: 'm-root',
          label: currentSession.title || activeProject.name || 'Objetivo do Discovery',
          type: 'root',
          x: 400,
          y: 250,
          color: '#6366f1'
        };
        updatedMindNodes.unshift(root);
      }

      const updatedMindEdges = [...currentSession.mindMapEdges];
      let addedNodesCount = 0;

      analysis.newMindMapNodes.forEach(newNode => {
        if (!updatedMindNodes.some(n => n.label.toLowerCase() === newNode.label.toLowerCase())) {
          updatedMindNodes.push(newNode);
          updatedMindEdges.push({
            id: 'edge-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            source: root!.id,
            target: newNode.id
          });
          addedNodesCount++;
        }
      });

      // Deduplicate Questions
      const existingQTexts = new Set(currentSession.liveQuestions.map(q => q.question.toLowerCase().trim()));
      const filteredNewQuestions = analysis.newQuestions.filter(q => !existingQTexts.has(q.question.toLowerCase().trim()));
      const updatedQuestions = [...filteredNewQuestions, ...currentSession.liveQuestions];

      // Deduplicate Pain Points
      const existingPains = new Set(currentSession.painPoints.map(p => p.description.toLowerCase().trim()));
      const filteredNewPains = analysis.newPainPoints.filter(p => !existingPains.has(p.description.toLowerCase().trim()));
      const updatedPainPoints = [...currentSession.painPoints, ...filteredNewPains];

      // Deduplicate JTBDs
      const existingJobs = new Set(currentSession.jtbds.map(j => j.job.toLowerCase().trim()));
      const filteredNewJobs = analysis.newJtbds.filter(j => !existingJobs.has(j.job.toLowerCase().trim()));
      const updatedJtbds = [...currentSession.jtbds, ...filteredNewJobs];

      // Merge User Flow Steps
      const updatedUserFlow = [...currentSession.userFlowSteps];
      analysis.newUserFlowSteps.forEach(newStep => {
        if (!updatedUserFlow.some(s => s.title.toLowerCase() === newStep.title.toLowerCase())) {
          updatedUserFlow.push({
            ...newStep,
            stepNumber: updatedUserFlow.length + 1
          });
        }
      });

      const updatedSession: MeetingSession = {
        ...currentSession,
        liveQuestions: updatedQuestions,
        painPoints: updatedPainPoints,
        jtbds: updatedJtbds,
        mindMapNodes: updatedMindNodes,
        mindMapEdges: updatedMindEdges,
        userFlowSteps: updatedUserFlow
      };

      const updatedProj: DiscoveryProject = {
        ...activeProject,
        sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
      };

      setActiveProject(updatedProj);
      storageService.saveActiveProject(updatedProj);
      setProjects(storageService.getAllProjects());

      showNotice('success', `Análise concluída com sucesso! +${filteredNewQuestions.length} perguntas contextuais e +${addedNodesCount} nós no mapa mental.`);
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
      speaker: s.speaker as any,
      text: s.text,
      timestamp: s.timestamp,
      isFinal: true
    }));

    const updatedTranscript = [...currentSession.rawTranscript, ...converted];

    let updatedSession: MeetingSession = {
      ...currentSession,
      rawTranscript: updatedTranscript
    };

    let updatedProj: DiscoveryProject = {
      ...activeProject,
      sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
    };

    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
    setProjects(storageService.getAllProjects());

    showNotice('info', `${converted.length} falas importadas. Sintetizando mapa mental e perguntas...`);

    try {
      setIsAnalyzingLive(true);
      const speechSlice = updatedTranscript.slice(-12).map(s => ({ speaker: s.speaker, text: s.text }));
      const analysis = await geminiService.analyzeLiveConversation(speechSlice, activeProject.description);

      const updatedMindNodes = [...updatedSession.mindMapNodes];
      let root = updatedMindNodes.find(n => n.type === 'root');
      if (!root) {
        root = {
          id: 'm-root',
          label: updatedSession.title || activeProject.name,
          type: 'root',
          x: 400,
          y: 250,
          color: '#6366f1'
        };
        updatedMindNodes.unshift(root);
      }

      const updatedMindEdges = [...updatedSession.mindMapEdges];
      analysis.newMindMapNodes.forEach(newNode => {
        if (!updatedMindNodes.some(n => n.label.toLowerCase() === newNode.label.toLowerCase())) {
          updatedMindNodes.push(newNode);
          updatedMindEdges.push({
            id: 'edge-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            source: root!.id,
            target: newNode.id
          });
        }
      });

      const existingQTexts = new Set(updatedSession.liveQuestions.map(q => q.question.toLowerCase().trim()));
      const filteredNewQuestions = analysis.newQuestions.filter(q => !existingQTexts.has(q.question.toLowerCase().trim()));
      const updatedQuestions = [...filteredNewQuestions, ...updatedSession.liveQuestions];

      const existingPains = new Set(updatedSession.painPoints.map(p => p.description.toLowerCase().trim()));
      const filteredNewPains = analysis.newPainPoints.filter(p => !existingPains.has(p.description.toLowerCase().trim()));
      const updatedPainPoints = [...updatedSession.painPoints, ...filteredNewPains];

      const existingJobs = new Set(updatedSession.jtbds.map(j => j.job.toLowerCase().trim()));
      const filteredNewJobs = analysis.newJtbds.filter(j => !existingJobs.has(j.job.toLowerCase().trim()));
      const updatedJtbds = [...updatedSession.jtbds, ...filteredNewJobs];

      updatedSession = {
        ...updatedSession,
        liveQuestions: updatedQuestions,
        painPoints: updatedPainPoints,
        jtbds: updatedJtbds,
        mindMapNodes: updatedMindNodes,
        mindMapEdges: updatedMindEdges
      };

      updatedProj = {
        ...activeProject,
        sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
      };

      setActiveProject(updatedProj);
      storageService.saveActiveProject(updatedProj);
      setProjects(storageService.getAllProjects());
      showNotice('success', `Importação concluída! +${filteredNewQuestions.length} perguntas e +${analysis.newMindMapNodes.length} tópicos gerados no mapa.`);
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

  const handleMarkQuestionAsked = (questionId: string) => {
    if (!currentSession) return;
    const updatedQuestions = currentSession.liveQuestions.map(q =>
      q.id === questionId ? { ...q, asked: true } : q
    );
    const updatedSession = { ...currentSession, liveQuestions: updatedQuestions };
    const updatedProj = {
      ...activeProject,
      sessions: activeProject.sessions.map(s => s.id === currentSession.id ? updatedSession : s)
    };
    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
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
    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
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
    setActiveProject(updatedProj);
    storageService.saveActiveProject(updatedProj);
  };

  const handleGenerateBacklogWithAI = async () => {
    setIsGeneratingBacklog(true);
    try {
      const allTranscriptText = currentSession?.rawTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n') || '';
      const hasKey = !!storageService.getApiKey();
      const result = await geminiService.generateFullBacklogAndPRD(
        activeProject.name + ' - ' + activeProject.description,
        allTranscriptText,
        currentSession?.painPoints || [],
        currentSession?.jtbds || []
      );

      if (result.source === 'offline') {
        showNotice('error', result.error || 'Não foi possível gerar com a IA.');
        // Com chave configurada, a falha não deve sobrescrever dados do usuário com exemplo
        if (hasKey) return;
      } else {
        showNotice('success', 'Backlog e PRD gerados com a IA.');
      }

      const updatedProj: DiscoveryProject = {
        ...activeProject,
        okrs: result.okrs.length > 0 ? result.okrs : activeProject.okrs,
        epics: result.epics.length > 0 ? result.epics : activeProject.epics,
        prd: result.prd ? { ...result.prd, id: activeProject.prd.id } : activeProject.prd
      };

      setActiveProject(updatedProj);
      storageService.saveActiveProject(updatedProj);
      setProjects(storageService.getAllProjects());
      setActiveView('backlog');
    } catch (e: any) {
      console.error(e);
      showNotice('error', e?.message || 'Erro inesperado ao gerar o backlog.');
    } finally {
      setIsGeneratingBacklog(false);
    }
  };

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
            onResetAllData={handleResetForOfficialTests}
            onNavigateToKnowledge={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW 0: PROJETO & PRODUTO INICIAL */}
        {activeView === 'project_hub' && (
          <ProjectHubView
            project={activeProject}
            onUpdateProject={(updated) => {
              setActiveProject(updated);
              storageService.saveActiveProject(updated);
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
                    edges={currentSession?.mindMapEdges || []}
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
      {notice && (
        <div
          role="alert"
          onClick={() => setNotice(null)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            maxWidth: '420px',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            zIndex: 1100,
            backdropFilter: 'blur(10px)',
            background: notice.type === 'error' ? 'rgba(244, 63, 94, 0.2)' : notice.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            border: `1px solid ${notice.type === 'error' ? 'rgba(244, 63, 94, 0.5)' : notice.type === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(99, 102, 241, 0.5)'}`,
            color: notice.type === 'error' ? '#fda4af' : notice.type === 'success' ? '#6ee7b7' : '#c7d2fe'
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Settings Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={activeProject}
        onProjectImported={(imported) => {
          setProjects(storageService.getAllProjects());
          setActiveProject(imported);
          showNotice('success', `Projeto "${imported.name}" importado.`);
        }}
      />
    </div>
  );
};

export default App;
