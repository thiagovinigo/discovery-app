import { describe, expect, it } from 'vitest';
import {
  MIN_AUDIO_BYTES,
  buildWhisperPrompt,
  filterWhisperSegments,
  isAudioBlobValid,
  isWhisperHallucination
} from './whisperFilter';

describe('isWhisperHallucination', () => {
  it('rejeita textos vazios, só pontuação ou com menos de 4 caracteres úteis', () => {
    expect(isWhisperHallucination('')).toBe(true);
    expect(isWhisperHallucination('   ')).toBe(true);
    expect(isWhisperHallucination('...')).toBe(true);
    expect(isWhisperHallucination('oi')).toBe(true);
    expect(isWhisperHallucination('hm.')).toBe(true);
  });

  it('rejeita alucinações clássicas do Whisper em silêncio (YouTube, legendas, música)', () => {
    expect(isWhisperHallucination('Obrigado por assistir!')).toBe(true);
    expect(isWhisperHallucination('Obrigada por assistir ao vídeo')).toBe(true);
    expect(isWhisperHallucination('Inscreva-se no canal e deixe seu like')).toBe(true);
    expect(isWhisperHallucination('Legendas pela comunidade Amara.org')).toBe(true);
    expect(isWhisperHallucination('Subtitles by the Amara.org community')).toBe(true);
    expect(isWhisperHallucination('Thank you for watching.')).toBe(true);
    expect(isWhisperHallucination('♪ ♪ ♪')).toBe(true);
    expect(isWhisperHallucination('[Música]')).toBe(true);
    expect(isWhisperHallucination('[Silêncio]')).toBe(true);
  });

  it('rejeita repetições em loop geradas pelo decodificador', () => {
    expect(isWhisperHallucination('sim sim sim sim sim')).toBe(true);
    expect(isWhisperHallucination('não, não, não, não')).toBe(true);
    expect(isWhisperHallucination('tá bom tá bom tá bom tá bom')).toBe(true);
  });

  it('aceita falas reais de entrevista, mesmo curtas', () => {
    expect(isWhisperHallucination('Demora duas horas por dia.')).toBe(false);
    expect(isWhisperHallucination('Sim, acontece toda segunda-feira.')).toBe(false);
    expect(isWhisperHallucination('Eu uso planilha para conferir.')).toBe(false);
    expect(isWhisperHallucination('Obrigado pelo convite, vamos falar do processo.')).toBe(false);
  });
});

describe('filterWhisperSegments', () => {
  it('remove segmentos fantasma e limpa espaços mantendo os segmentos válidos', () => {
    const raw = [
      { id: 1, start: 0, end: 2, text: '  Obrigado por assistir! ' },
      { id: 2, start: 2, end: 6, text: ' Nosso fechamento leva três dias. ' },
      { id: 3, start: 6, end: 8, text: '...' },
      { id: 4, start: 8, end: 12, text: 'Toda sexta precisamos conferir tudo na mão.' }
    ];

    const filtered = filterWhisperSegments(raw);

    expect(filtered).toEqual([
      { id: 2, start: 2, end: 6, text: 'Nosso fechamento leva três dias.' },
      { id: 4, start: 8, end: 12, text: 'Toda sexta precisamos conferir tudo na mão.' }
    ]);
  });
});

describe('isAudioBlobValid', () => {
  it('rejeita arquivos vazios ou menores que o mínimo de bytes de áudio real', () => {
    expect(isAudioBlobValid({ size: 0 })).toBe(false);
    expect(isAudioBlobValid({ size: MIN_AUDIO_BYTES - 1 })).toBe(false);
    expect(isAudioBlobValid({ size: MIN_AUDIO_BYTES })).toBe(true);
    expect(isAudioBlobValid({ size: 24_000 })).toBe(true);
  });
});

describe('buildWhisperPrompt', () => {
  it('monta vocabulário apenas com dados reais do projeto e da sessão (sem termos fixos)', () => {
    const prompt = buildWhisperPrompt(
      {
        name: 'Portal Logístico Atlas',
        description: 'Rastreamento de cargas',
        stakeholders: [
          {
            id: 'st-1',
            name: 'Camila Rocha',
            role: 'usuario',
            organization: 'TransSul',
            interest: 'alto',
            influence: 'medio',
            createdAt: '2026-01-01'
          }
        ]
      },
      {
        title: 'Entrevista Operação de Pátio',
        agenda: ['Romaneio de saída', 'Conferência de nota']
      }
    );

    expect(prompt).toContain('Portal Logístico Atlas');
    expect(prompt).toContain('Camila Rocha');
    expect(prompt).toContain('TransSul');
    expect(prompt).toContain('Entrevista Operação de Pátio');
    expect(prompt).toContain('Romaneio de saída');
    expect(prompt.toLowerCase()).not.toContain('conciliação');
  });

  it('devolve string vazia quando não há dados no projeto', () => {
    expect(buildWhisperPrompt(undefined, undefined)).toBe('');
  });
});
