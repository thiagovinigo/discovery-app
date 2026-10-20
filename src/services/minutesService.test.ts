import { describe, expect, it } from 'vitest';
import { buildMinutes, minutesToMarkdown, withMinutes } from './minutesService';
import type { MeetingSession, Stakeholder, TranscriptSegment } from '../types/discovery';

let counter = 0;
const seg = (text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder', extra: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id: `m${++counter}`, speaker, text, timestamp: '00:10', isFinal: true, ...extra
});

const ana: Stakeholder = { id: 'sh-ana', name: 'Ana Souza', role: 'usuario', interest: 'alto', influence: 'medio', createdAt: '2026-01-01' };

const session = (segments: TranscriptSegment[], over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1', title: 'Discovery do fechamento', date: '01/02/2026', durationSeconds: 600, participants: [], rawTranscript: segments,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

const NOW = new Date('2026-02-01T15:00:00Z');

describe('buildMinutes', () => {
  it('reunião vazia gera uma ata vazia, sem inventar nada', () => {
    const m = buildMinutes(session([]), [], NOW);

    expect(m.topics).toEqual([]);
    expect(m.decisions).toEqual([]);
    expect(m.actionItems).toEqual([]);
    expect(m.openQuestions).toEqual([]);
    expect(m.generatedAt).toBe(NOW.toISOString());
  });

  it('lista os participantes cadastrados e quem apareceu falando, sem repetir', () => {
    const s = session(
      [seg('Eu cuido do fechamento', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' })],
      { participantIds: ['sh-ana'], participants: ['Bruno'] }
    );

    expect(buildMinutes(s, [ana], NOW).participants).toEqual(['Ana Souza', 'Bruno']);
  });

  it('tira os assuntos tratados, com as principais falas de cada um e quem disse', () => {
    const s = session([
      seg('O fechamento é feito em planilhas e demora quatro dias', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' }),
      seg('As planilhas quebram quando alguém muda uma fórmula do fechamento'),
      seg('Perco metade do tempo conferindo planilhas')
    ]);

    const m = buildMinutes(s, [ana], NOW);

    expect(m.topics.length).toBeGreaterThan(0);
    expect(m.topics[0].statements[0].speaker).toBe('Ana Souza');
    expect(m.topics[0].statements.length).toBeLessThanOrEqual(3);
  });

  it('reconhece decisões ditas por qualquer pessoa', () => {
    const s = session([
      seg('Então ficou decidido que vamos usar a conciliação automática', 'Entrevistador (PM)'),
      seg('O cadastro é um problema')
    ]);

    const m = buildMinutes(s, [], NOW);

    expect(m.decisions).toHaveLength(1);
    expect(m.decisions[0].text).toContain('conciliação automática');
  });

  it('reconhece combinados com responsável e prazo', () => {
    const s = session([
      seg('Eu vou mandar o extrato até sexta', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' }),
      seg('Bruno fica de revisar o relatório na semana que vem', 'Entrevistador (PM)')
    ]);

    const m = buildMinutes(s, [ana], NOW);

    expect(m.actionItems).toHaveLength(2);
    expect(m.actionItems[0]).toMatchObject({ owner: 'Ana Souza' });
    expect(m.actionItems[0].deadline.toLowerCase()).toContain('sexta');
    expect(m.actionItems[1].owner).toBe('Bruno');
    expect(m.actionItems[1].deadline.toLowerCase()).toContain('semana que vem');
  });

  it('combinado sem dono nem prazo aparece como "A definir"', () => {
    const m = buildMinutes(session([seg('Precisamos enviar o contrato', 'Desconhecido')]), [], NOW);

    expect(m.actionItems[0]).toMatchObject({ owner: 'A definir', deadline: 'A definir' });
  });

  it('perguntas em aberto: dúvidas do entrevistado e perguntas sugeridas que ninguém fez', () => {
    const s = session(
      [seg('Será que o banco libera a API?')],
      { liveQuestions: [
        { id: 'q1', question: 'Qual o impacto em reais?', reason: '', category: 'quantification', asked: false, timestamp: '' },
        { id: 'q2', question: 'Já foi feito?', reason: '', category: 'mom_test', asked: true, timestamp: '' }
      ] }
    );

    const m = buildMinutes(s, [], NOW);

    expect(m.openQuestions).toContain('Será que o banco libera a API?');
    expect(m.openQuestions).toContain('Qual o impacto em reais?');
    expect(m.openQuestions).not.toContain('Já foi feito?');
  });

  it('leva as dores e os jobs identificados', () => {
    const s = session([], {
      painPoints: [{ id: 'p', description: 'Fórmula quebra', severity: 'high', frequencyScore: 3 } as MeetingSession['painPoints'][number]],
      jtbds: [{ id: 'j', context: 'x', job: 'Fechar o mês sem erro', outcome: 'y', frequency: 'mensal' }]
    });

    const m = buildMinutes(s, [], NOW);

    expect(m.painPoints).toEqual(['Fórmula quebra']);
    expect(m.jobs).toEqual(['Fechar o mês sem erro']);
  });

  it('o resumo conta o que foi tratado', () => {
    const m = buildMinutes(session([seg('Ficou decidido que vamos adotar o novo fluxo')]), [], NOW);

    expect(m.summary).toMatch(/1 fala/);
    expect(m.summary).toMatch(/1 decisão/);
  });
});

describe('withMinutes', () => {
  it('guarda a ata na sessão sem mexer na original', () => {
    const base = session([seg('Ficou decidido que vamos adotar o novo fluxo')]);

    const next = withMinutes(base, [], NOW);

    expect(next.minutes?.decisions).toHaveLength(1);
    expect(base.minutes).toBeUndefined();
  });
});

describe('minutesToMarkdown', () => {
  it('monta um documento com título, participantes e as seções preenchidas', () => {
    const s = session(
      [seg('Eu vou mandar o extrato até sexta', 'Usuário / Stakeholder', { speakerStakeholderId: 'sh-ana' }), seg('Ficou decidido que vamos adotar o novo fluxo')],
      { participantIds: ['sh-ana'], objective: 'Entender o fechamento' }
    );

    const md = minutesToMarkdown(buildMinutes(s, [ana], NOW), s);

    expect(md).toContain('# Ata: Discovery do fechamento');
    expect(md).toContain('Ana Souza');
    expect(md).toContain('Entender o fechamento');
    expect(md).toContain('## Decisões');
    expect(md).toContain('## Ações combinadas');
    expect(md).toContain('| Ana Souza |');
  });

  it('omite as seções sem conteúdo', () => {
    const s = session([]);

    const md = minutesToMarkdown(buildMinutes(s, [], NOW), s);

    expect(md).not.toContain('## Decisões');
    expect(md).not.toContain('## Ações combinadas');
  });
});
