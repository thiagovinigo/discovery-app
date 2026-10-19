// Web Audio API & Speech Recognition Service

export interface AudioVisualizerData {
  frequencyData: Uint8Array;
}

export type TranscriptCallback = (text: string, isFinal: boolean) => void;

export interface AudioStatus {
  state: 'listening' | 'error' | 'unsupported' | 'stopped';
  message?: string;
}

export type AudioStatusCallback = (status: AudioStatus) => void;

class AudioService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: any = null;
  private isRecording: boolean = false;
  private onTranscriptCallback: TranscriptCallback | null = null;
  private onStatusCallback: AudioStatusCallback | null = null;
  private interimTimeoutRef: any = null;
  private lastInterimText: string = '';

  public isSpeechRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  public async startMicrophoneCapture(
    onTranscript: TranscriptCallback,
    onStatus?: AudioStatusCallback
  ): Promise<boolean> {
    try {
      this.onTranscriptCallback = onTranscript;
      this.onStatusCallback = onStatus || null;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.setupAudioAnalyser(this.mediaStream);
      this.startSpeechRecognition();
      this.isRecording = true;
      if (this.onStatusCallback) {
        this.onStatusCallback({ state: 'listening', message: 'Microfone ativo e ouvindo voz...' });
      }
      return true;
    } catch (e: any) {
      console.error('Falha ao acessar microfone:', e);
      if (this.onStatusCallback) {
        this.onStatusCallback({
          state: 'error',
          message: e?.name === 'NotAllowedError'
            ? 'Permissão de microfone negada. Conceda permissão no navegador.'
            : (e?.message || 'Falha ao acessar dispositivo de áudio.')
        });
      }
      throw e;
    }
  }

  public async startTabAudioCapture(
    onTranscript: TranscriptCallback,
    onStatus?: AudioStatusCallback
  ): Promise<boolean> {
    try {
      this.onTranscriptCallback = onTranscript;
      this.onStatusCallback = onStatus || null;
      // Captura áudio da aba da reunião (Google Meet, Zoom Web, Teams)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('Nenhum áudio foi compartilhado na aba selecionada. Lembre-se de marcar "Compartilhar áudio da aba".');
      }

      this.mediaStream = new MediaStream(audioTracks);
      this.setupAudioAnalyser(this.mediaStream);
      this.startSpeechRecognition();
      this.isRecording = true;
      if (this.onStatusCallback) {
        this.onStatusCallback({ state: 'listening', message: 'Capturando áudio da aba de reunião...' });
      }
      return true;
    } catch (e: any) {
      console.error('Falha ao capturar áudio da aba:', e);
      if (this.onStatusCallback) {
        this.onStatusCallback({ state: 'error', message: e?.message || 'Falha ao capturar áudio da aba.' });
      }
      throw e;
    }
  }

  private setupAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
    } catch (e) {
      console.warn('Não foi possível inicializar AudioAnalyser:', e);
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  private startSpeechRecognition() {
    if (!this.isSpeechRecognitionSupported()) {
      console.warn('SpeechRecognition não é suportado nativamente neste navegador.');
      if (this.onStatusCallback) {
        this.onStatusCallback({
          state: 'unsupported',
          message: 'SpeechRecognition não suportado neste navegador. Use digitação ou simulação.'
        });
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'pt-BR';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        if (this.interimTimeoutRef) clearTimeout(this.interimTimeoutRef);
        this.lastInterimText = '';
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(finalTranscript.trim(), true);
        }
      } else if (interimTranscript.trim()) {
        this.lastInterimText = interimTranscript.trim();
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(this.lastInterimText, false);
        }
        // Se o interim durar mais de 1.8 segundos sem o provedor marcar isFinal, comitamos como final
        if (this.interimTimeoutRef) clearTimeout(this.interimTimeoutRef);
        this.interimTimeoutRef = setTimeout(() => {
          if (this.lastInterimText && this.onTranscriptCallback) {
            this.onTranscriptCallback(this.lastInterimText, true);
            this.lastInterimText = '';
          }
        }, 1800);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition status/error:', event.error);
      if (this.onStatusCallback && event.error !== 'no-speech') {
        const errorMsg = event.error === 'not-allowed'
          ? 'Microfone bloqueado. Habilite o acesso nas permissões do navegador.'
          : event.error === 'network'
          ? 'Serviço de voz do navegador sem conexão de rede. Você pode digitar ou usar a simulação.'
          : `Aviso no reconhecimento de voz: ${event.error}`;
        this.onStatusCallback({ state: 'error', message: errorMsg });
      }
    };

    this.recognition.onend = () => {
      // Se ainda estiver gravando, reinicia automaticamente para streaming contínuo
      if (this.isRecording) {
        try {
          this.recognition.start();
        } catch {
          // Já iniciado ou em transição
        }
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Erro ao disparar SpeechRecognition:', e);
    }
  }

  public stopCapture() {
    this.isRecording = false;
    if (this.interimTimeoutRef) clearTimeout(this.interimTimeoutRef);
    this.lastInterimText = '';

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn(e);
      }
      this.recognition = null;
    }

    if (this.onStatusCallback) {
      this.onStatusCallback({ state: 'stopped', message: 'Escuta pausada.' });
    }
    this.onStatusCallback = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.onTranscriptCallback = null;
  }

  public parseTranscriptFile(content: string): { speaker: string; text: string; timestamp: string }[] {
    const lines = content.split('\n');
    const result: { speaker: string; text: string; timestamp: string }[] = [];

    // Suporta VTT, SRT ou texto corrido
    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (!clean || clean.startsWith('WEBVTT') || /^\d+$/.test(clean) || clean.includes('-->')) {
        return;
      }

      // Procura formato "Nome: Fala"
      const matchSpeaker = clean.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (matchSpeaker) {
        result.push({
          speaker: matchSpeaker[1].trim(),
          text: matchSpeaker[2].trim(),
          timestamp: `0${Math.floor(idx / 2)}:00`
        });
      } else {
        result.push({
          speaker: 'Usuário / Stakeholder',
          text: clean,
          timestamp: `0${Math.floor(idx / 2)}:00`
        });
      }
    });

    return result;
  }

  public isAudioFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'aac', 'opus', 'wma'];
    return audioExts.includes(ext || '') || file.type.startsWith('audio/');
  }

  public formatSecondsToTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const audioService = new AudioService();
