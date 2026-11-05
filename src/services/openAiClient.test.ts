import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRealtimeTranscriptionSession,
  inferSpeakerTurnsFromWhisper,
  transcribeAudioWithWhisper
} from './openAiClient';
import { MIN_AUDIO_BYTES } from './whisperFilter';

describe('transcribeAudioWithWhisper (E12.0 & E12.5)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('rejeita áudio minúsculo (< 1 KB) sem chamar a API da OpenAI', async () => {
    const tinyBlob = new Blob([new Uint8Array(100)], { type: 'audio/webm' });

    const result = await transcribeAudioWithWhisper(tinyBlob, 'sk-test');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ text: '', segments: [] });
  });

  it('filtra falas fantasma do Whisper e preserva o formato dos segmentos reais', async () => {
    const validBlob = new Blob([new Uint8Array(MIN_AUDIO_BYTES + 500)], { type: 'audio/webm' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        text: 'Obrigado por assistir! O fechamento atrasa duas horas toda sexta.',
        duration: 12.4,
        segments: [
          { id: 0, start: 0, end: 2, text: ' Obrigado por assistir! ' },
          { id: 1, start: 2, end: 9, text: ' O fechamento atrasa duas horas toda sexta. ' },
          { id: 2, start: 9, end: 12, text: '...' }
        ]
      })
    });

    const result = await transcribeAudioWithWhisper(validBlob, 'sk-test', 'entrevista.webm', {
      prompt: 'Projeto Logística, Camila Rocha'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const formData = init.body as FormData;
    expect(formData.get('prompt')).toBe('Projeto Logística, Camila Rocha');

    expect(result.segments).toEqual([
      { id: 1, start: 2, end: 9, text: 'O fechamento atrasa duas horas toda sexta.' }
    ]);
    expect(result.text).toBe('O fechamento atrasa duas horas toda sexta.');
  });

  it('tenta novamente com detecção automática de idioma quando a primeira resposta em pt vem vazia', async () => {
    const validBlob = new Blob([new Uint8Array(MIN_AUDIO_BYTES + 200)], { type: 'audio/mp3' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Obrigado por assistir!',
          segments: [{ id: 0, start: 0, end: 2, text: 'Obrigado por assistir!' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Precisamos revisar o cadastro de fornecedores hoje.',
          segments: [{ id: 0, start: 0, end: 5, text: 'Precisamos revisar o cadastro de fornecedores hoje.' }]
        })
      });

    const result = await transcribeAudioWithWhisper(validBlob, 'sk-test');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].text).toBe('Precisamos revisar o cadastro de fornecedores hoje.');
  });

  it('E12.5: createRealtimeTranscriptionSession pede token efêmero para transcrição em fluxo (WebRTC)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'sess_rt_1',
        client_secret: { value: 'ek_live_ephemeral_token', expires_at: 1999999999 }
      })
    });

    const session = await createRealtimeTranscriptionSession('sk-test', {
      prompt: 'Stakeholders: Ana Souza, Bruno'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(session.ephemeralToken).toBe('ek_live_ephemeral_token');
    expect(session.model).toBe('gpt-4o-transcribe');
  });

  it('E12.5: inferSpeakerTurnsFromWhisper separa turnos do entrevistador e entrevistado por diarização ou pistas de pergunta/pausa', () => {
    const turns = inferSpeakerTurnsFromWhisper([
      { id: 1, start: 0, end: 3, text: 'Me conta a última vez em que o cadastro travou?' },
      { id: 2, start: 4.8, end: 10, text: 'Na sexta passada ficamos três horas sem conseguir emitir pedido.' },
      { id: 3, start: 10.2, end: 14, text: 'Tivemos que anotar tudo em planilha.' }
    ]);

    expect(turns[0].speaker).toBe('Entrevistador (PM)');
    expect(turns[1].speaker).toBe('Usuário / Stakeholder');
    expect(turns[2].speaker).toBe('Usuário / Stakeholder');
  });
});
