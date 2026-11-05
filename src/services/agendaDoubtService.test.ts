import { describe, expect, it } from 'vitest';
import { AGENDA_STATUS_LABELS, buildLiveAgenda, extractDoubts } from './agendaDoubtService';
import type { MeetingSession, TranscriptSegment } from '../types/discovery';

let seq = 0;
const talk = (
  text: string,
  speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder',
  timestamp = '01:00'
): TranscriptSegment => ({
  id: `seg-${++seq}`,
  speaker,
  text,
  timestamp,
  isFinal: true
});

const makeSession = (segments: TranscriptSegment[], agenda: string[] = []): MeetingSession => ({
  id: 'sess-1',
  title: 'Entrevista de Discovery',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: ['Entrevistador (PM)', 'Usuário / Stakeholder'],
  rawTranscript: segments,
  agenda,
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: []
});

describe('buildLiveAgenda — pauta viva com status automático (E12.1)', () => {
  it('item da pauta ainda não mencionado começa como "pending" (A tratar)', () => {
    const s = makeSession([], ['Cadastro de fornecedores', 'Aprovação de alçada']);

    const items = buildLiveAgenda(s);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Cadastro de fornecedores', status: 'pending', origin: 'agenda' });
    expect(AGENDA_STATUS_LABELS[items[0].status]).toBe('A tratar');
  });

  it('muda o status de "pending" → "in_progress" → "covered" → "decided" conforme a conversa avança', () => {
    const agenda = ['Cadastro de fornecedores'];

    // 1. Primeira menção: entra em andamento
    const step1 = buildLiveAgenda(
      makeSession([talk('O cadastro de fornecedores está dando dor de cabeça')], agenda)
    );
    expect(step1[0].status).toBe('in_progress');

    // 2. Com caso real, frequência e impacto cobertos: passa a tratado
    const step2 = buildLiveAgenda(
      makeSession(
        [
          talk('Na semana passada o cadastro de fornecedores travou toda a compra'),
          talk('Isso acontece toda semana no cadastro de fornecedores e perdemos 3 horas na mão')
        ],
        agenda
      )
    );
    expect(step2[0].status).toBe('covered');

    // 3. Com decisão explícita: passa a decidido
    const step3 = buildLiveAgenda(
      makeSession(
        [
          talk('Na semana passada o cadastro de fornecedores travou toda a compra'),
          talk('Isso acontece toda semana no cadastro de fornecedores e perdemos 3 horas na mão'),
          talk('Decidimos unificar o cadastro de fornecedores numa tela única até sexta')
        ],
        agenda
      )
    );
    expect(step3[0].status).toBe('decided');
  });

  it('inclui tópicos emergentes da conversa mesmo quando a reunião começou sem pauta prévia', () => {
    const s = makeSession([
      talk('O fechamento em planilhas atrasa toda semana'),
      talk('Perdemos quatro horas conferindo planilhas na mão')
    ]);

    const items = buildLiveAgenda(s);

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].origin).toBe('topic');
    expect(['in_progress', 'covered']).toContain(items[0].status);
  });
});

describe('extractDoubts — dúvidas abertas e resolvidas automaticamente (E12.1)', () => {
  it('detecta dúvida levantada pelo entrevistado e a resolve quando uma fala posterior responde', () => {
    const beforeAnswer = makeSession([
      talk('Como fica a aprovação de compras quando o diretor está de férias?', 'Usuário / Stakeholder', '02:10')
    ]);

    const openDoubts = extractDoubts(beforeAnswer);
    expect(openDoubts.some(d => d.status === 'open' && d.kind === 'interviewee_question')).toBe(true);

    const afterAnswer = makeSession([
      talk('Como fica a aprovação de compras quando o diretor está de férias?', 'Usuário / Stakeholder', '02:10'),
      talk('Na aprovação de compras durante férias, o gerente financeiro assume a alçada no sistema.', 'Entrevistador (PM)', '02:45')
    ]);

    const updated = extractDoubts(afterAnswer);
    const resolved = updated.find(d => d.kind === 'interviewee_question');
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedAnswer).toContain('gerente financeiro');
    expect(resolved?.resolvedTimestamp).toBe('02:45');
  });

  it('detecta contradição numérica no mesmo assunto e marca como resolvida após esclarecimento', () => {
    const s1 = makeSession([
      talk('O fechamento do relatório leva 2 dias de trabalho.', 'Usuário / Stakeholder', '01:00'),
      talk('O fechamento do relatório leva 5 dias de trabalho.', 'Usuário / Stakeholder', '03:00')
    ]);

    const doubts1 = extractDoubts(s1);
    const contradiction = doubts1.find(d => d.kind === 'contradiction');
    expect(contradiction).toBeDefined();
    expect(contradiction?.status).toBe('open');

    const s2 = makeSession([
      ...s1.rawTranscript,
      talk('Corrigindo sobre o fechamento do relatório: são 2 dias normais e 5 dias só no fim do ano.', 'Usuário / Stakeholder', '04:00')
    ]);

    const doubts2 = extractDoubts(s2);
    const contradictionAfter = doubts2.find(d => d.kind === 'contradiction');
    expect(contradictionAfter?.status).toBe('resolved');
    expect(contradictionAfter?.resolvedAnswer).toContain('2 dias normais');
  });

  it('abre dúvida de lacuna quando falta impacto de um tópico e a move para resolvida quando o impacto é dito depois', () => {
    const sOpen = makeSession([
      talk('O cadastro de fornecedores trava bastante', 'Usuário / Stakeholder', '01:00'),
      talk('O cadastro de fornecedores incomoda a equipe', 'Usuário / Stakeholder', '01:30')
    ]);

    const openList = extractDoubts(sOpen).filter(d => d.status === 'open');
    expect(openList.some(d => d.kind === 'gap' && d.text.toLowerCase().includes('cadastro'))).toBe(true);

    const sResolved = makeSession([
      ...sOpen.rawTranscript,
      talk('Na semana passada o cadastro de fornecedores custou 4 horas de retrabalho para cada analista', 'Usuário / Stakeholder', '02:20')
    ]);

    const after = extractDoubts(sResolved);
    const resolvedGaps = after.filter(d => d.kind === 'gap' && d.status === 'resolved');
    expect(resolvedGaps.length).toBeGreaterThan(0);
    expect(resolvedGaps[0].resolvedAnswer).toContain('4 horas');
  });
});
