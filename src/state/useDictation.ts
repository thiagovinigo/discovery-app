import { useCallback, useEffect, useRef, useState } from 'react';

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => RecognitionLike;

const UNSUPPORTED = 'Seu navegador não suporta ditado por voz. Use o Chrome ou o Edge, ou digite.';
const BLOCKED = 'Microfone bloqueado. Libere o acesso ao microfone nas permissões do navegador.';
const OFFLINE = 'O serviço de voz do navegador está sem conexão. Digite o texto ou tente de novo.';
/** Erros que só indicam silêncio ou parada normal: não são falha do usuário. */
const HARMLESS_ERRORS = new Set(['no-speech', 'aborted']);

function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const messageFor = (error: string): string => {
  if (error === 'not-allowed' || error === 'service-not-allowed') return BLOCKED;
  if (error === 'network') return OFFLINE;
  return `Falha no ditado por voz (${error}).`;
};

interface UseDictationOptions {
  /** Recebe cada frase pronta (sem espaços nas pontas). */
  onText: (text: string) => void;
  lang?: string;
}

/**
 * Ditado por voz com o reconhecimento de fala do navegador (Chrome e Edge). Escuta de forma contínua em português,
 * mostra o texto parcial enquanto a pessoa fala e entrega cada frase pronta. Se o navegador encerrar a escuta sozinho
 * (silêncio), religa enquanto o usuário não tiver parado. É independente da gravação da sala ao vivo.
 */
export function useDictation({ onText, lang = 'pt-BR' }: UseDictationOptions) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const wantedRef = useRef(false);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const supported = recognitionConstructor() !== null;

  const stop = useCallback(() => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setError(UNSUPPORTED);
      return;
    }
    if (wantedRef.current) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = event => {
      let finalText = '';
      let partialText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else partialText += result[0].transcript;
      }
      if (finalText.trim()) {
        setInterim('');
        onTextRef.current(finalText.trim());
      } else {
        setInterim(partialText.trim());
      }
    };

    recognition.onerror = event => {
      if (HARMLESS_ERRORS.has(event.error)) return;
      wantedRef.current = false;
      setListening(false);
      setInterim('');
      setError(messageFor(event.error));
    };

    recognition.onend = () => {
      if (wantedRef.current) {
        try {
          recognition.start();
        } catch {
          /* já em transição: o próximo ciclo religa */
        }
      } else {
        setListening(false);
        setInterim('');
      }
    };

    wantedRef.current = true;
    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    try {
      recognition.start();
    } catch (e) {
      wantedRef.current = false;
      setListening(false);
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar o ditado.');
    }
  }, [lang]);

  useEffect(() => () => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
