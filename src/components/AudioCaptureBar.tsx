import React, { useRef, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  ScreenShare,
  Upload,
  Play,
  Square,
  Sparkles,
  Info,
  Coffee,
  Activity,
  Loader2,
  FileAudio
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { SIMULATION_SCENARIOS } from '../services/mockDataService';

interface AudioCaptureBarProps {
  isRecording: boolean;
  onStartRecording: (source: 'mic' | 'tab') => void;
  onStopRecording: () => void;
  onNewTranscriptSegment: (speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder', text: string) => void;
  onImportTranscriptFile: (segments: { speaker: string; text: string; timestamp: string }[]) => void;
  onUploadAudioFile?: (file: File) => Promise<void>;
  isTranscribingAudio?: boolean;
  isInformalMode?: boolean;
  onToggleInformalMode?: () => void;
}

export const AudioCaptureBar: React.FC<AudioCaptureBarProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onNewTranscriptSegment,
  onImportTranscriptFile,
  onUploadAudioFile,
  isTranscribingAudio = false,
  isInformalMode = false,
  onToggleInformalMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState(SIMULATION_SCENARIOS[0].id);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<any>(null);

  // Audio Equalizer Visualizer Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const freqData = audioService.getAudioFrequencyData();
          const barWidth = 4;
          const barGap = 3;
          const barsCount = Math.floor(canvas.width / (barWidth + barGap));

          for (let i = 0; i < barsCount; i++) {
            let barHeight = 4;
            if (isRecording && freqData) {
              const dataIdx = Math.floor((i / barsCount) * freqData.length);
              barHeight = Math.max(4, (freqData[dataIdx] / 255) * canvas.height * 0.85);
            } else if (isSimulating) {
              barHeight = Math.max(4, Math.sin(Date.now() / 150 + i) * 15 + 12);
            }

            const x = i * (barWidth + barGap);
            const y = canvas.height - barHeight;

            // Gradient for audio bars
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            if (isRecording) {
              gradient.addColorStop(0, '#f43f5e');
              gradient.addColorStop(1, '#06b6d4');
            } else if (isSimulating) {
              gradient.addColorStop(0, '#6366f1');
              gradient.addColorStop(1, '#10b981');
            } else {
              gradient.addColorStop(0, '#334155');
              gradient.addColorStop(1, '#1e293b');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRecording, isSimulating]);

  // Handle Simulation
  const handleStartSimulation = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
      return;
    }

    const scenario = SIMULATION_SCENARIOS.find(s => s.id === selectedScenarioId) || SIMULATION_SCENARIOS[0];
    setIsSimulating(true);

    let stepIndex = 0;
    // Emit first segment immediately
    const first = scenario.segments[0];
    onNewTranscriptSegment(first.speaker as any, first.text);
    stepIndex++;

    simulationTimerRef.current = setInterval(() => {
      if (stepIndex >= scenario.segments.length) {
        clearInterval(simulationTimerRef.current);
        setIsSimulating(false);
        return;
      }
      const seg = scenario.segments[stepIndex];
      onNewTranscriptSegment(seg.speaker as any, seg.text);
      stepIndex++;
    }, 4500); // New statement every 4.5 seconds for real-time feel
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioService.isAudioFile(file)) {
      if (onUploadAudioFile) {
        await onUploadAudioFile(file);
      }
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = audioService.parseTranscriptFile(content);
        onImportTranscriptFile(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="glass-panel" style={{ padding: '12px 20px', margin: '0 20px 14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      {/* Left: Capture Triggers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isRecording ? (
          <>
            <button
              onClick={() => onStartRecording('mic')}
              className="btn btn-primary"
              style={{ gap: '8px' }}
              title="Ativa o microfone local para ouvir a entrevista"
            >
              <Mic size={16} />
              Ouvir Microfone
            </button>

            <button
              onClick={() => onStartRecording('tab')}
              className="btn btn-secondary"
              style={{ gap: '8px' }}
              title="Compartilhe a aba do Google Meet, Zoom ou Teams para capturar o áudio dos participantes"
            >
              <ScreenShare size={16} color="var(--accent-cyan)" />
              Capturar Aba (Meet/Zoom)
            </button>
          </>
        ) : (
          <button
            onClick={onStopRecording}
            className="btn btn-danger"
            style={{ gap: '8px' }}
          >
            <Square size={16} />
            Pausar Escuta
          </button>
        )}

        {/* Upload Transcrição / Áudio Whisper */}
        {isTranscribingAudio ? (
          <button
            disabled
            className="btn btn-secondary"
            style={{ gap: '6px', opacity: 0.85, border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
          >
            <Loader2 className="animate-spin" size={15} />
            Transcrevendo Whisper AI...
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ gap: '6px' }}
            title="Upload de gravações de áudio (.mp3, .wav, .m4a) com OpenAI Whisper ou arquivos de texto (.txt, .vtt, .srt)"
          >
            <Upload size={15} />
            Importar Áudio / Transcrição
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,.txt,.vtt,.srt,.json"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Center: Audio Waveform Equalizer & Informal Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <canvas
            ref={canvasRef}
            width={170}
            height={32}
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '6px',
              border: isRecording ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid var(--border-subtle)',
              boxShadow: isRecording ? '0 0 14px rgba(244, 63, 94, 0.25)' : 'none',
              transition: 'all .25s'
            }}
          />
          {isRecording && (
            <span style={{ fontSize: '0.74rem', color: isInformalMode ? '#fbbf24' : 'var(--accent-rose)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} className="animate-pulse" />
              {isInformalMode ? 'IA Pausada' : 'Escuta ativa'}
            </span>
          )}
        </div>

        {/* Botão Modo Bate-Papo Informal */}
        {onToggleInformalMode && (
          <button
            onClick={onToggleInformalMode}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.74rem',
              fontWeight: 700,
              gap: '6px',
              borderRadius: '8px',
              background: isInformalMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: isInformalMode ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid var(--border-subtle)',
              color: isInformalMode ? '#fbbf24' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all .15s'
            }}
            title={isInformalMode ? "Clique para reativar análise de IA e geração contínua" : "Pausa a IA durante amenidades no início da reunião para não queimar tokens nem poluir o mapa mental"}
          >
            <Coffee size={13} color={isInformalMode ? '#fbbf24' : 'var(--text-muted)'} />
            {isInformalMode ? 'Bate-Papo (IA Pausada)' : 'Pausar IA no Bate-Papo'}
          </button>
        )}
      </div>

      {/* Right: Realistic Simulation Tester */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.6)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        <Sparkles size={16} color="var(--accent-amber)" />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Simulação:</span>
        <select
          value={selectedScenarioId}
          onChange={(e) => setSelectedScenarioId(e.target.value)}
          disabled={isSimulating}
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.78rem',
            outline: 'none',
            cursor: 'pointer',
            maxWidth: '220px'
          }}
        >
          {SIMULATION_SCENARIOS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <button
          onClick={handleStartSimulation}
          className={`btn ${isSimulating ? 'btn-danger' : 'btn-secondary'}`}
          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          title="Simula uma conversa real de discovery ao vivo para você ver as sugestões, mapas e tarefas sendo gerados em tempo real!"
        >
          {isSimulating ? <Square size={13} /> : <Play size={13} color="var(--accent-emerald)" />}
          {isSimulating ? 'Parar Simulação' : 'Testar ao Vivo'}
        </button>

        <div title="Dica: Você pode testar agora mesmo clicando em 'Testar ao Vivo' para ver a IA ouvindo e reagindo à conversa!">
          <Info size={14} color="var(--text-dim)" style={{ cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
};
