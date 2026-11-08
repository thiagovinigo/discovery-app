import React, { useRef, useState } from 'react';
import {
  FileText,
  Flag,
  GitBranch,
  Keyboard,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  Radio,
  Workflow
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  DiscoveryProject,
  MeetingMinutes,
  MeetingSession,
  MeetingType,
  StoryMapRelease,
  TranscriptSegment
} from '../types/discovery';
import { audioService } from '../services/audioService';
import { addStep, moveStep, removeStep, updateStep } from '../services/journeyService';
import { closingOf } from '../services/meetingCopilotService';
import type { ClosingAnswers } from '../services/meetingCopilotService';
import { addChildNode, deleteNode, renameNode } from '../services/mindMapService';
import { updateMinutes } from '../services/minutesService';
import { suggestSpeakers } from '../services/speakerService';
import {
  addStoryMapCard,
  moveStoryMapCard,
  removeStoryMapCard,
  updateStoryMapCard
} from '../services/storyMapService';
import { AgentPanel } from './AgentPanel';
import { AssistantPanel } from './AssistantPanel';
import { AudioCaptureBar } from './AudioCaptureBar';
import { LiveQuestionPrompter } from './LiveQuestionPrompter';
import { LiveSessionsManager } from './LiveSessionsManager';
import { LiveTranscriptionView } from './LiveTranscriptionView';
import { MindMapCanvas } from './MindMapCanvas';
import { MinutesPanel } from './MinutesPanel';
import { PrototypeView } from './PrototypeView';
import { SessionAgendaCard } from './SessionAgendaCard';
import { SessionClosingPanel } from './SessionClosingPanel';
import { SessionPeopleBar } from './SessionPeopleBar';
import { StoryMapView } from './StoryMapView';
import { TopicsPanel } from './TopicsPanel';
import { UserFlowView } from './UserFlowView';

export type RightTab = 'topics' | 'mindmap' | 'userflow' | 'storymap' | 'prototype' | 'minutes';

const RIGHT_TABS: { id: RightTab; label: string; Icon: LucideIcon; count: (s: MeetingSession) => string }[] = [
  { id: 'topics', label: 'Tópicos & Perguntas', Icon: Layers, count: s => `${s.liveQuestions.filter(q => !q.asked).length} a fazer` },
  { id: 'mindmap', label: 'Mapa mental', Icon: GitBranch, count: s => `${s.mindMapNodes.length} nós` },
  { id: 'userflow', label: 'Jornada', Icon: Workflow, count: s => `${s.userFlowSteps.length} etapas` },
  { id: 'storymap', label: 'Story Map', Icon: LayoutGrid, count: s => `${(s.storyMapCards ?? []).length} histórias` },
  { id: 'prototype', label: 'Protótipo', Icon: Monitor, count: s => `${s.userFlowSteps.length} telas` },
  { id: 'minutes', label: 'Ata', Icon: FileText, count: s => (s.minutes ? 'pronta' : 'a gerar') }
];

export interface LiveRoomViewProps {
  project: DiscoveryProject;
  currentSession?: MeetingSession;
  activeRightTab?: RightTab;
  onChangeRightTab?: (tab: RightTab) => void;
  isRecording: boolean;
  isFocusMode: boolean;
  isInformalChatMode: boolean;
  autoUpdateInterval: number;
  isTranscribingAudio: boolean;
  isAssistantBusy: boolean;
  isGeneratingBacklog: boolean;
  isAnalyzingLive: boolean;
  isGeneratingPrototype: boolean;
  onStartFirstSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (title: string, participants: string[]) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onToggleFocusMode: () => void;
  onEndMeeting: () => void;
  onStartRecording: (source: 'mic' | 'tab') => void;
  onStopRecording: () => void;
  onIncomingTranscript: (speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder', text: string) => void;
  onImportTranscriptFile: (segments: { speaker: string; text: string; timestamp: string }[]) => void;
  onUploadAudioFile: (file: File) => Promise<void>;
  onToggleInformalMode: () => void;
  onChangeAutoUpdateInterval: (interval: number) => void;
  onChangeParticipants: (ids: string[]) => void;
  onChangeSpeaker: (id: string | undefined) => void;
  onChangeSessionType: (type: MeetingType) => void;
  onToggleAssistant: (enabled: boolean) => void;
  onRunAssistantNow: () => void;
  onSaveClosing: (answers: ClosingAnswers) => void;
  onGenerateBacklogWithAI: () => void;
  onAssignSpeaker: (segmentId: string, stakeholderId: string | undefined) => void;
  onApplySpeakerSuggestions: () => void;
  onReportBug: (seg: TranscriptSegment) => void;
  onAnalyzeSessionWithAI: () => void;
  onClearCurrentSessionTranscript: () => void;
  onMarkQuestionAsked: (questionId: string) => void;
  onEditSession: (edit: (session: MeetingSession) => MeetingSession) => void;
  onRefreshMap: () => void;
  onRefreshJourney: () => void;
  onRefreshJourneyAI?: () => void;
  onRefreshStoryMap: () => void;
  onProposeStoryMapToBacklog: (release: StoryMapRelease | 'all') => void;
  onProposeMindMapNodeToBacklog?: (nodeId: string) => void;
  onGenerateOfflinePrototype: () => void;
  onGenerateAIPrototype: () => void;
  onGenerateMinutes: () => void;
  onGenerateMinutesAI?: () => void;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  project,
  currentSession,
  activeRightTab: controlledTab,
  onChangeRightTab,
  isRecording,
  isFocusMode,
  isInformalChatMode,
  autoUpdateInterval,
  isTranscribingAudio,
  isAssistantBusy,
  isGeneratingBacklog,
  isAnalyzingLive,
  isGeneratingPrototype,
  onStartFirstSession,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onToggleFocusMode,
  onEndMeeting,
  onStartRecording,
  onStopRecording,
  onIncomingTranscript,
  onImportTranscriptFile,
  onUploadAudioFile,
  onToggleInformalMode,
  onChangeAutoUpdateInterval,
  onChangeParticipants,
  onChangeSpeaker,
  onChangeSessionType,
  onToggleAssistant,
  onRunAssistantNow,
  onSaveClosing,
  onGenerateBacklogWithAI,
  onAssignSpeaker,
  onApplySpeakerSuggestions,
  onReportBug,
  onAnalyzeSessionWithAI,
  onClearCurrentSessionTranscript,
  onMarkQuestionAsked,
  onEditSession,
  onRefreshMap,
  onRefreshJourney,
  onRefreshJourneyAI,
  onRefreshStoryMap,
  onProposeStoryMapToBacklog,
  onProposeMindMapNodeToBacklog,
  onGenerateOfflinePrototype,
  onGenerateAIPrototype,
  onGenerateMinutes,
  onGenerateMinutesAI
}) => {
  const [internalTab, setInternalTab] = useState<RightTab>('topics');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const liveFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeRightTab = controlledTab ?? internalTab;
  const setActiveRightTab = (tab: RightTab) => {
    setInternalTab(tab);
    onChangeRightTab?.(tab);
  };

  if (!currentSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '64px 16px', textAlign: 'center' }}>
        <Radio size={32} />
        <h2 style={{ margin: 0 }}>Nenhuma sessão de discovery neste projeto</h2>
        <p style={{ margin: 0, maxWidth: '460px', color: 'var(--text-muted)' }}>
          Crie a primeira sessão para gravar, digitar notas ou importar uma transcrição.
        </p>
        <button className="btn btn-primary" onClick={onStartFirstSession}>
          <Plus size={14} /> Iniciar primeira sessão
        </button>
      </div>
    );
  }

  const speakerSuggestions = suggestSpeakers(currentSession, project.stakeholders ?? []);

  const handleFileUploadInApp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioService.isAudioFile(file)) {
      await onUploadAudioFile(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = audioService.parseTranscriptFile(content);
        onImportTranscriptFile(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpdateMinutes = (patch: Partial<MeetingMinutes>) => {
    onEditSession(s => updateMinutes(s, patch));
  };

  return (
    <>
      <LiveSessionsManager
        project={project}
        activeSession={currentSession}
        onSelectSession={onSelectSession}
        onCreateSession={onCreateSession}
        onRenameSession={onRenameSession}
      />

      {/* Barra de controle fixa: gravar, encerrar e modo foco ficam sempre à mão */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, margin: '0 -20px 10px', padding: '6px 20px 8px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onToggleFocusMode}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                gap: '6px',
                background: isFocusMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: isFocusMode ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                color: isFocusMode ? '#c4b5fd' : 'var(--text-main)'
              }}
              title="Oculta a barra lateral para dar 100% de tela à entrevista (Atalho: Alt + F)"
            >
              {isFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFocusMode ? 'Sair do Modo Foco' : 'Modo Foco'}
            </button>
            <button
              onClick={() => setShowShortcutsHelp(prev => !prev)}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', color: 'var(--text-dim)' }}
              title="Ver atalhos de teclado da reunião"
            >
              <Keyboard size={13} /> Atalhos
            </button>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '6px' }}
            disabled={currentSession.rawTranscript.length === 0}
            onClick={() => {
              onEndMeeting();
              setActiveRightTab('minutes');
            }}
            title="Para a gravação, atualiza mapa e jornada e gera a ata com decisões, ações e perguntas em aberto"
          >
            <Flag size={13} /> Encerrar reunião
          </button>
        </div>

        {showShortcutsHelp && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Espaço</kbd> Gravar/Pausar</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Ctrl + M</kbd> Marcar Pergunta</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Alt + F</kbd> Modo Foco</span>
          </div>
        )}

        <AudioCaptureBar
          isRecording={isRecording}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onNewTranscriptSegment={onIncomingTranscript}
          onImportTranscriptFile={onImportTranscriptFile}
          onUploadAudioFile={onUploadAudioFile}
          isTranscribingAudio={isTranscribingAudio}
          isInformalMode={isInformalChatMode}
          onToggleInformalMode={onToggleInformalMode}
          autoUpdateInterval={autoUpdateInterval}
          onChangeAutoUpdateInterval={onChangeAutoUpdateInterval}
        />
      </div>

      {/* Preparação da sala: aberta antes da conversa, recolhe sozinha quando a primeira fala chega */}
      <details key={`${currentSession.id}:${currentSession.rawTranscript.length > 0}`} open={currentSession.rawTranscript.length === 0} style={{ marginBottom: '10px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>
          Preparação da sala: pessoas, pauta, assistente e fechamento
        </summary>
        <SessionPeopleBar
          stakeholders={project.stakeholders ?? []}
          participantIds={currentSession.participantIds ?? []}
          currentSpeakerId={currentSession.currentSpeakerId}
          onChangeParticipants={onChangeParticipants}
          onChangeSpeaker={onChangeSpeaker}
        />

        <SessionAgendaCard session={currentSession} />

        <AssistantPanel
          session={currentSession}
          busy={isAssistantBusy}
          onChangeType={onChangeSessionType}
          onToggle={onToggleAssistant}
          onRunNow={onRunAssistantNow}
        />

        <SessionClosingPanel
          key={currentSession.id}
          savedNote={closingOf(project.notes ?? [], currentSession.id)}
          onSave={onSaveClosing}
          onReviewBacklog={onGenerateBacklogWithAI}
          isGenerating={isGeneratingBacklog}
        />
      </details>

      {/* Input oculto para importação rápida via Empty State */}
      <input
        ref={liveFileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,.txt,.vtt,.srt,.json"
        onChange={handleFileUploadInApp}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: '16px', height: 'calc(100vh - 210px)', minHeight: '560px' }}>
        {/* Esquerda: a conversa, com quem falou em cada fala */}
        <div style={{ height: '100%', minHeight: 0 }}>
          <LiveTranscriptionView
            segments={currentSession.rawTranscript}
            stakeholders={project.stakeholders ?? []}
            onAssignSpeaker={onAssignSpeaker}
            speakerSuggestions={speakerSuggestions}
            onApplySuggestions={onApplySpeakerSuggestions}
            onManualNoteSubmit={onIncomingTranscript}
            onActionStartMic={() => onStartRecording('mic')}
            onActionImportFile={() => liveFileInputRef.current?.click()}
            onReportBug={onReportBug}
            onTriggerAnalysis={onAnalyzeSessionWithAI}
            onClearTranscript={onClearCurrentSessionTranscript}
            isAnalyzing={isAnalyzingLive}
          />
        </div>

        {/* Direita: o que a conversa vai produzindo */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div role="tablist" aria-label="Painéis da reunião" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {RIGHT_TABS.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeRightTab === id}
                onClick={() => setActiveRightTab(id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: activeRightTab === id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.05)',
                  color: activeRightTab === id ? '#c4b5fd' : 'var(--text-muted)',
                  border: activeRightTab === id ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Icon size={13} />
                {label}
                <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)' }}>
                  {count(currentSession)}
                </span>
              </button>
            ))}
          </div>

          <div role="tabpanel" style={{ flex: 1, minHeight: 0, overflowY: activeRightTab === 'topics' ? 'auto' : 'hidden' }}>
            {activeRightTab === 'topics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <TopicsPanel session={currentSession} />
                <div style={{ minHeight: '340px' }}>
                  <LiveQuestionPrompter
                    questions={currentSession.liveQuestions}
                    onMarkAsked={onMarkQuestionAsked}
                    onTriggerAnalysis={onAnalyzeSessionWithAI}
                    isAnalyzing={isAnalyzingLive}
                  />
                </div>
              </div>
            )}
            {activeRightTab === 'mindmap' && (
              <MindMapCanvas
                nodes={currentSession.mindMapNodes}
                onRename={(id, label) => onEditSession(s => renameNode(s, id, label))}
                onAddChild={(parentId, label) => onEditSession(s => addChildNode(s, parentId, label))}
                onDelete={id => onEditSession(s => deleteNode(s, id))}
                onPromoteToBacklog={onProposeMindMapNodeToBacklog}
                onRefresh={onRefreshMap}
                onTriggerAnalysis={onAnalyzeSessionWithAI}
                isAnalyzing={isAnalyzingLive}
              />
            )}
            {activeRightTab === 'userflow' && (
              <UserFlowView
                steps={currentSession.userFlowSteps}
                onAdd={data => onEditSession(s => addStep(s, data))}
                onUpdate={(id, patch) => onEditSession(s => updateStep(s, id, patch))}
                onRemove={id => onEditSession(s => removeStep(s, id))}
                onMove={(id, dir) => onEditSession(s => moveStep(s, id, dir))}
                onRefresh={onRefreshJourney}
                onRefreshAI={onRefreshJourneyAI}
              />
            )}
            {activeRightTab === 'storymap' && (
              <StoryMapView
                session={currentSession}
                onAddCard={data => onEditSession(s => addStoryMapCard(s, data))}
                onUpdateCard={(cardId, patch) => onEditSession(s => updateStoryMapCard(s, cardId, patch))}
                onMoveCard={(cardId, target) => onEditSession(s => moveStoryMapCard(s, cardId, target))}
                onRemoveCard={cardId => onEditSession(s => removeStoryMapCard(s, cardId))}
                onRefresh={onRefreshStoryMap}
                onProposeBacklog={onProposeStoryMapToBacklog}
              />
            )}
            {activeRightTab === 'prototype' && (
              <PrototypeView
                session={currentSession}
                projectName={project.name}
                isGenerating={isGeneratingPrototype}
                onGenerateOffline={onGenerateOfflinePrototype}
                onGenerateAI={onGenerateAIPrototype}
              />
            )}
            {activeRightTab === 'minutes' && (
              <MinutesPanel
                session={currentSession}
                projectName={project.name}
                onGenerate={onGenerateMinutes}
                onGenerateAI={onGenerateMinutesAI}
                onUpdateMinutes={handleUpdateMinutes}
                onGenerateBacklog={onGenerateBacklogWithAI}
                isGeneratingBacklog={isGeneratingBacklog}
              />
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '16px' }}>
        <AgentPanel scope="meeting" title="Agentes de reunião (sobre a sessão atual)" project={project} session={currentSession} />
      </div>
    </>
  );
};
