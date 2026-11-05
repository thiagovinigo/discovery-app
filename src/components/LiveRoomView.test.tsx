import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LiveRoomView } from './LiveRoomView';
import type { DiscoveryProject, MeetingSession } from '../types/discovery';

afterEach(cleanup);

const makeSession = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1',
  title: 'Entrevista Operacional',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: [],
  rawTranscript: [
    { id: 't1', speaker: 'Usuário / Stakeholder', text: 'Primeiro recebemos o pedido de compra.', timestamp: '00:10', isFinal: true }
  ],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: [
    { id: 'st1', stepNumber: 1, title: 'Receber pedido de compra', actor: 'Analista', systemAction: '', frictionLevel: 'smooth' }
  ],
  ...over
});

const makeProject = (sessions: MeetingSession[] = [makeSession()]): DiscoveryProject => ({
  id: 'p1',
  name: 'Portal Operacional',
  description: 'Gestão de pedidos',
  createdAt: '04/11/2026',
  updatedAt: '04/11/2026',
  activeSessionId: sessions[0]?.id,
  sessions,
  okrs: [],
  epics: [],
  prd: {
    id: 'prd-1',
    title: 'Portal Operacional',
    version: '1.0.0',
    lastUpdated: '04/11/2026',
    problemStatement: '',
    targetAudience: '',
    valueProposition: '',
    inScope: [],
    outOfScope: [],
    successMetrics: [],
    assumptions: [],
    risksAndMitigations: []
  },
  leanCanvas: {
    problem: [],
    existingAlternatives: [],
    solution: [],
    keyMetrics: [],
    uniqueValueProposition: '',
    highLevelConcept: '',
    unfairAdvantage: '',
    channels: [],
    customerSegments: [],
    earlyAdopters: [],
    costStructure: [],
    revenueStreams: []
  },
  decisionLog: [],
  personas: [],
  bugReports: []
});

describe('LiveRoomView (E11.9)', () => {
  it('mostra o estado vazio com botão "Iniciar primeira sessão" quando o projeto ainda não tem sessões', () => {
    const onStartFirstSession = vi.fn();
    render(
      <LiveRoomView
        project={makeProject([])}
        currentSession={undefined}
        isRecording={false}
        isFocusMode={false}
        isInformalChatMode={false}
        autoUpdateInterval={2}
        isTranscribingAudio={false}
        isAssistantBusy={false}
        isGeneratingBacklog={false}
        isAnalyzingLive={false}
        isGeneratingPrototype={false}
        onStartFirstSession={onStartFirstSession}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onRenameSession={vi.fn()}
        onToggleFocusMode={vi.fn()}
        onEndMeeting={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onIncomingTranscript={vi.fn()}
        onImportTranscriptFile={vi.fn()}
        onUploadAudioFile={vi.fn()}
        onToggleInformalMode={vi.fn()}
        onChangeAutoUpdateInterval={vi.fn()}
        onChangeParticipants={vi.fn()}
        onChangeSpeaker={vi.fn()}
        onChangeSessionType={vi.fn()}
        onToggleAssistant={vi.fn()}
        onRunAssistantNow={vi.fn()}
        onSaveClosing={vi.fn()}
        onGenerateBacklogWithAI={vi.fn()}
        onAssignSpeaker={vi.fn()}
        onApplySpeakerSuggestions={vi.fn()}
        onReportBug={vi.fn()}
        onAnalyzeSessionWithAI={vi.fn()}
        onClearCurrentSessionTranscript={vi.fn()}
        onMarkQuestionAsked={vi.fn()}
        onEditSession={vi.fn()}
        onRefreshMap={vi.fn()}
        onRefreshJourney={vi.fn()}
        onRefreshJourneyAI={vi.fn()}
        onRefreshStoryMap={vi.fn()}
        onProposeStoryMapToBacklog={vi.fn()}
        onGenerateOfflinePrototype={vi.fn()}
        onGenerateAIPrototype={vi.fn()}
        onGenerateMinutes={vi.fn()}
        onGenerateMinutesAI={vi.fn()}
      />
    );

    expect(screen.getByText(/Nenhuma sessão de discovery neste projeto/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar primeira sessão/i }));
    expect(onStartFirstSession).toHaveBeenCalledTimes(1);
  });

  it('alterna entre as 6 abas da sala ao vivo (Tópicos, Mapa mental, Jornada, Story Map, Protótipo e Ata) e aciona encerramento', () => {
    const onEndMeeting = vi.fn();
    render(
      <LiveRoomView
        project={makeProject()}
        currentSession={makeSession()}
        isRecording={false}
        isFocusMode={false}
        isInformalChatMode={false}
        autoUpdateInterval={2}
        isTranscribingAudio={false}
        isAssistantBusy={false}
        isGeneratingBacklog={false}
        isAnalyzingLive={false}
        isGeneratingPrototype={false}
        onStartFirstSession={vi.fn()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onRenameSession={vi.fn()}
        onToggleFocusMode={vi.fn()}
        onEndMeeting={onEndMeeting}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onIncomingTranscript={vi.fn()}
        onImportTranscriptFile={vi.fn()}
        onUploadAudioFile={vi.fn()}
        onToggleInformalMode={vi.fn()}
        onChangeAutoUpdateInterval={vi.fn()}
        onChangeParticipants={vi.fn()}
        onChangeSpeaker={vi.fn()}
        onChangeSessionType={vi.fn()}
        onToggleAssistant={vi.fn()}
        onRunAssistantNow={vi.fn()}
        onSaveClosing={vi.fn()}
        onGenerateBacklogWithAI={vi.fn()}
        onAssignSpeaker={vi.fn()}
        onApplySpeakerSuggestions={vi.fn()}
        onReportBug={vi.fn()}
        onAnalyzeSessionWithAI={vi.fn()}
        onClearCurrentSessionTranscript={vi.fn()}
        onMarkQuestionAsked={vi.fn()}
        onEditSession={vi.fn()}
        onRefreshMap={vi.fn()}
        onRefreshJourney={vi.fn()}
        onRefreshJourneyAI={vi.fn()}
        onRefreshStoryMap={vi.fn()}
        onProposeStoryMapToBacklog={vi.fn()}
        onGenerateOfflinePrototype={vi.fn()}
        onGenerateAIPrototype={vi.fn()}
        onGenerateMinutes={vi.fn()}
        onGenerateMinutesAI={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Jornada/i }));
    expect(screen.getByText(/Receber pedido de compra/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Story Map/i }));
    expect(screen.getByLabelText('User Story Mapping')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Protótipo/i }));
    expect(screen.getByLabelText('Protótipo da sessão')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Ata/i }));
    expect(screen.getByLabelText('Ata da reunião')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Encerrar reunião/i }));
    expect(onEndMeeting).toHaveBeenCalledTimes(1);
  });
});
