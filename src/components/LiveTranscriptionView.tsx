import React, { useRef, useEffect, useState } from 'react';
import { TranscriptSegment } from '../types/discovery';
import { MessageSquare, User, Send, Flame, Lightbulb, Mic, Upload, Edit3, Bug, Check, Sparkles, Trash2 } from 'lucide-react';

interface LiveTranscriptionViewProps {
  segments: TranscriptSegment[];
  onManualNoteSubmit: (speaker: 'Entrevistador (PM)' | 'Usuário / Stakeholder', text: string) => void;
  onActionStartMic?: () => void;
  onActionImportFile?: () => void;
  onReportBug?: (segment: TranscriptSegment) => void;
  onTriggerAnalysis?: () => void;
  onClearTranscript?: () => void;
  isAnalyzing?: boolean;
}

export const LiveTranscriptionView: React.FC<LiveTranscriptionViewProps> = ({
  segments,
  onManualNoteSubmit,
  onActionStartMic,
  onActionImportFile,
  onReportBug,
  onTriggerAnalysis,
  onClearTranscript,
  isAnalyzing = false
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputText, setInputText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'Entrevistador (PM)' | 'Usuário / Stakeholder'>('Usuário / Stakeholder');
  const [reportedBugSegId, setReportedBugSegId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onManualNoteSubmit(activeSpeaker, inputText.trim());
    setInputText('');
  };

  const handlePreFillNote = (sample: string) => {
    setInputText(sample);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBugClick = (seg: TranscriptSegment) => {
    if (onReportBug) {
      onReportBug(seg);
      setReportedBugSegId(seg.id);
      setTimeout(() => setReportedBugSegId(null), 2500);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Transcrição ao Vivo & Diálogo</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Capturando cada fala dos participantes</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onTriggerAnalysis && segments.length > 0 && (
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                gap: '5px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                color: '#67e8f9',
                fontWeight: 700
              }}
              title="Processa todas as falas registradas para extrair dores, atualizar mapa mental e perguntas"
            >
              <Sparkles size={13} color="var(--accent-cyan)" />
              {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
            </button>
          )}
          {onClearTranscript && segments.length > 0 && (
            <button
              onClick={onClearTranscript}
              className="btn btn-ghost"
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                gap: '4px',
                color: '#f43f5e',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                background: 'rgba(244, 63, 94, 0.06)'
              }}
              title="Limpar todas as falas desta sessão para começar uma nova gravação do zero"
            >
              <Trash2 size={12} />
              Limpar Falas
            </button>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {segments.length} {segments.length === 1 ? 'fala' : 'falas'}
          </span>
        </div>
      </div>

      {/* Transcript Stream */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingRight: '6px'
        }}
      >
        {segments.length === 0 ? (
          /* Empty State Guiado com 3 Cards Interativos */
          <div style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '420px', marginBottom: '6px' }}>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                🎙️ Esta sala ainda não tem áudio capturado
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Escolha uma das 3 formas rápidas abaixo para alimentar o Segundo Cérebro e gerar mapas mentais e perguntas em tempo real:
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', width: '100%' }}>
              {/* Card 1: Microfone */}
              <button
                type="button"
                onClick={onActionStartMic}
                className="glass-panel"
                style={{
                  padding: '16px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: 'inherit',
                  transition: 'all .15s'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={16} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>1. Gravar Microfone</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  Inicia a escuta da sua entrevista agora mesmo com fala contínua.
                </div>
              </button>

              {/* Card 2: Anotação rápida */}
              <button
                type="button"
                onClick={() => handlePreFillNote('Nossa maior dor hoje é que o fechamento manual leva 4 dias inteiros.')}
                className="glass-panel"
                style={{
                  padding: '16px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: 'inherit',
                  transition: 'all .15s'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={16} color="var(--accent-cyan)" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>2. Colar Anotação</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  Insere uma nota rápida ou citação direta do cliente no campo abaixo.
                </div>
              </button>

              {/* Card 3: Importar Arquivo */}
              <button
                type="button"
                onClick={onActionImportFile}
                className="glass-panel"
                style={{
                  padding: '16px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: 'inherit',
                  transition: 'all .15s'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={16} color="var(--accent-emerald)" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>3. Importar Arquivo</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  Carregue transcrições de áudio nos formatos TXT, VTT, SRT ou JSON.
                </div>
              </button>
            </div>
          </div>
        ) : (
          segments.map((seg) => {
            const isPM = seg.speaker.includes('PM') || seg.speaker.includes('Entrevistador');
            const isReported = reportedBugSegId === seg.id;
            return (
              <div
                key={seg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  alignSelf: isPM ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: isPM ? 'flex-end' : 'flex-start' }}>
                  <User size={12} color={isPM ? 'var(--primary)' : 'var(--accent-cyan)'} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isPM ? '#a5b4fc' : '#67e8f9' }}>
                    {seg.speaker}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {seg.timestamp}
                  </span>
                  {seg.highlightType === 'pain' && (
                    <span className="badge badge-rose" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      <Flame size={10} /> Dor
                    </span>
                  )}
                  {seg.highlightType === 'jtbd' && (
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      <Lightbulb size={10} /> JTBD
                    </span>
                  )}
                  {/* Botão Classificador Rápido: Bug de Produção */}
                  {onReportBug && !isPM && (
                    <button
                      type="button"
                      onClick={() => handleBugClick(seg)}
                      style={{
                        background: isReported ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.15)',
                        border: isReported ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(244, 63, 94, 0.3)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '0.63rem',
                        color: isReported ? '#6ee7b7' : '#fda4af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        transition: 'all .15s'
                      }}
                      title="Registrar esta reclamação/falha do cliente como um Bug de Produção no projeto"
                    >
                      {isReported ? <Check size={9} /> : <Bug size={9} />}
                      {isReported ? 'Bug Registrado!' : 'Reportar Bug'}
                    </button>
                  )}
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isPM ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: isPM
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.2))'
                      : 'rgba(30, 41, 59, 0.7)',
                    border: isPM ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    lineHeight: '1.45',
                    color: 'var(--text-main)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {seg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Input / Notes while in meeting */}
      <form onSubmit={handleSubmit} style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Quem está falando:</span>
          <button
            type="button"
            onClick={() => setActiveSpeaker('Entrevistador (PM)')}
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: activeSpeaker === 'Entrevistador (PM)' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            PM (Você)
          </button>
          <button
            type="button"
            onClick={() => setActiveSpeaker('Usuário / Stakeholder')}
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: activeSpeaker === 'Usuário / Stakeholder' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
              color: activeSpeaker === 'Usuário / Stakeholder' ? '#090d16' : 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Usuário / Cliente
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Digite uma anotação, quote ou fala rápida..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(15, 23, 42, 0.9)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 14px' }}
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};
