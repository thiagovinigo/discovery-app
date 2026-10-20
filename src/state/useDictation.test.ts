import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDictation } from './useDictation';

interface FakeResult {
  isFinal: boolean;
  0: { transcript: string };
}

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  started = false;
  onresult: ((event: { resultIndex: number; results: FakeResult[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
    this.onend?.();
  }
  say(transcript: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
  }
}

const latest = () => FakeRecognition.instances[FakeRecognition.instances.length - 1];

beforeEach(() => {
  FakeRecognition.instances = [];
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe('useDictation', () => {
  it('sem suporte do navegador, avisa e não tenta ouvir', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));

    expect(result.current.supported).toBe(false);
    act(() => result.current.start());

    expect(result.current.listening).toBe(false);
    expect(result.current.error).toMatch(/não suporta/i);
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it('começa a ouvir em português, de forma contínua e com resultados parciais', () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));

    act(() => result.current.start());

    expect(result.current.supported).toBe(true);
    expect(result.current.listening).toBe(true);
    expect(latest()).toMatchObject({ lang: 'pt-BR', continuous: true, interimResults: true, started: true });
  });

  it('entrega o texto final ao fim de cada frase, sem espaços nas pontas', () => {
    const onText = vi.fn();
    const { result } = renderHook(() => useDictation({ onText }));
    act(() => result.current.start());

    act(() => latest().say('  preciso exportar o relatório  ', true));

    expect(onText).toHaveBeenCalledWith('preciso exportar o relatório');
  });

  it('o texto parcial aparece enquanto a pessoa fala e some quando a frase fecha', () => {
    const onText = vi.fn();
    const { result } = renderHook(() => useDictation({ onText }));
    act(() => result.current.start());

    act(() => latest().say('preciso exportar', false));
    expect(result.current.interim).toBe('preciso exportar');
    expect(onText).not.toHaveBeenCalled();

    act(() => latest().say('preciso exportar o relatório', true));
    expect(result.current.interim).toBe('');
  });

  it('parar encerra a escuta', () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));
    act(() => result.current.start());

    act(() => result.current.stop());

    expect(result.current.listening).toBe(false);
    expect(latest().started).toBe(false);
  });

  it('se o navegador encerrar a escuta sozinho (silêncio), religa enquanto o usuário não parou', () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));
    act(() => result.current.start());
    const recognition = latest();

    act(() => {
      recognition.started = false;
      recognition.onend?.();
    });

    expect(recognition.started).toBe(true);
    expect(result.current.listening).toBe(true);
  });

  it('microfone bloqueado vira mensagem clara e para de ouvir', () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));
    act(() => result.current.start());

    act(() => latest().onerror?.({ error: 'not-allowed' }));

    expect(result.current.error).toMatch(/microfone/i);
    expect(result.current.listening).toBe(false);
  });

  it('silêncio sem fala ("no-speech") não é erro', () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));
    act(() => result.current.start());

    act(() => latest().onerror?.({ error: 'no-speech' }));

    expect(result.current.error).toBeNull();
  });

  it('sair da tela encerra a escuta', () => {
    const { result, unmount } = renderHook(() => useDictation({ onText: vi.fn() }));
    act(() => result.current.start());
    const recognition = latest();

    unmount();

    expect(recognition.started).toBe(false);
  });

  it('o prefixo webkit também vale (Chrome e Edge)', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;

    const { result } = renderHook(() => useDictation({ onText: vi.fn() }));

    expect(result.current.supported).toBe(true);
  });
});
