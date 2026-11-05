import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioService, CHUNK_AUDIO_BITS_PER_SECOND } from './audioService';
import { MIN_AUDIO_BYTES } from './whisperFilter';

describe('audioService (E12.0)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('usa 64 kbps como taxa de bits padrão para gravação de voz', () => {
    expect(CHUNK_AUDIO_BITS_PER_SECOND).toBe(64_000);
  });

  it('grava em trechos reiniciando o MediaRecorder a cada ciclo (para cada trecho ter cabeçalho WebM íntegro)', () => {
    const instances: any[] = [];
    class FakeMediaRecorder {
      static isTypeSupported = vi.fn((mime: string) => mime.includes('opus'));
      state: 'inactive' | 'recording' = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      options: any;
      constructor(_stream: MediaStream, options?: any) {
        this.options = options;
        instances.push(this);
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array(MIN_AUDIO_BYTES + 200)], { type: 'audio/webm;codecs=opus' });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const onChunk = vi.fn();
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream;

    const controller = audioService.startChunkedRecorder(fakeStream, onChunk, 5000);

    expect(instances).toHaveLength(1);
    expect(instances[0].options).toMatchObject({
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64_000
    });

    // Avança 1 ciclo: fecha o gravador 1 (entregando blob com cabeçalho próprio) e cria o gravador 2
    vi.advanceTimersByTime(5000);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(2);
    expect(instances[1].state).toBe('recording');

    controller.stop();
    expect(onChunk).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('descarta trechos minúsculos de silêncio (< 1 KB) sem acionar o callback', () => {
    class SilentMediaRecorder {
      static isTypeSupported = () => true;
      state: 'inactive' | 'recording' = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([new Uint8Array(120)], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }

    vi.stubGlobal('MediaRecorder', SilentMediaRecorder);
    const onChunk = vi.fn();
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream;

    const controller = audioService.startChunkedRecorder(fakeStream, onChunk, 4000);
    controller.stop();

    expect(onChunk).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
