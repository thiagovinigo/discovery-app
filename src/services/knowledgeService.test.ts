import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from './storageService';
import { addStakeholder, setCurrentSpeaker } from './stakeholderService';
import { appendSegment } from './sessionService';
import { searchProjectKnowledge } from './knowledgeService';
import type { DiscoveryProject, TranscriptSegment } from '../types/discovery';

let projectId: string;
let sessionId: string;

const load = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;
const seg = (id: string, text: string, speaker: TranscriptSegment['speaker'] = 'Usuário / Stakeholder'): TranscriptSegment => ({
  id, speaker, text, timestamp: '12:30', isFinal: true
});

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', '').id;
  sessionId = storageService.createNewSession(projectId, 'Entrevista inicial').id;
});

describe('searchProjectKnowledge', () => {
  it('acha uma fala e cita a reunião, o minuto e o nome de quem falou', () => {
    const ana = addStakeholder(projectId, { name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto' })!;
    setCurrentSpeaker(projectId, sessionId, ana.id);
    appendSegment(projectId, sessionId, seg('s1', 'O orçamento aprovado para este semestre é de cem mil reais'));

    const [hit] = searchProjectKnowledge(load(), 'qual o orçamento do semestre?');

    expect(hit.kind).toBe('fala');
    expect(hit.text).toContain('orçamento aprovado');
    expect(hit.source).toBe('Reunião "Entrevista inicial", 12:30, Ana');
  });

  it('sem nome cadastrado, cita o papel genérico da fala', () => {
    appendSegment(projectId, sessionId, seg('s1', 'A recepção perde tempo confirmando consultas'));

    const [hit] = searchProjectKnowledge(load(), 'recepção consultas');

    expect(hit.source).toBe('Reunião "Entrevista inicial", 12:30, Usuário / Stakeholder');
  });

  it('acha anotações (inclusive pelas etiquetas) e stakeholders', () => {
    addStakeholder(projectId, { name: 'Bruno', role: 'patrocinador', interest: 'alto', influence: 'alto', organization: 'Hospital Y', notes: 'Prefere reunião curta' });
    storageService.updateProject(projectId, p => ({
      ...p,
      notes: [{ id: 'n1', text: 'Ligar para o fornecedor', tags: ['compras'], createdAt: '2026-01-02T10:00:00.000Z', updatedAt: '2026-01-02T10:00:00.000Z' }]
    }));

    const byNote = searchProjectKnowledge(load(), 'compras');
    const byPerson = searchProjectKnowledge(load(), 'hospital');

    expect(byNote[0].kind).toBe('nota');
    expect(byPerson[0].kind).toBe('stakeholder');
    expect(byPerson[0].text).toContain('Bruno');
  });

  it('põe primeiro o que casa com mais palavras da pergunta', () => {
    appendSegment(projectId, sessionId, seg('a', 'Precisamos de relatório'));
    appendSegment(projectId, sessionId, seg('b', 'Precisamos de relatório semanal por e-mail'));

    const hits = searchProjectKnowledge(load(), 'relatório semanal e-mail');

    expect(hits[0].text).toContain('semanal');
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it('ignora acentos e maiúsculas', () => {
    appendSegment(projectId, sessionId, seg('a', 'O ORÇAMENTO foi cortado'));

    expect(searchProjectKnowledge(load(), 'orcamento')).toHaveLength(1);
  });

  it('pergunta só com palavras comuns, ou sem nenhuma correspondência, não devolve nada', () => {
    appendSegment(projectId, sessionId, seg('a', 'Falamos sobre prazos'));

    expect(searchProjectKnowledge(load(), 'o que é que você')).toEqual([]);
    expect(searchProjectKnowledge(load(), 'orçamento')).toEqual([]);
  });

  it('respeita o limite pedido', () => {
    for (let i = 0; i < 8; i++) appendSegment(projectId, sessionId, seg(`s${i}`, `Falamos do prazo ${i}`));

    expect(searchProjectKnowledge(load(), 'prazo', 3)).toHaveLength(3);
  });

  it('usa os campos do PRD que foram preenchidos e ignora os vazios', () => {
    storageService.updateProject(projectId, p => ({ ...p, prd: { ...p.prd, targetAudience: 'Recepcionistas de clínicas' } }));

    const hits = searchProjectKnowledge(load(), 'recepcionistas');

    expect(hits[0]).toMatchObject({ kind: 'prd', source: 'PRD' });
    expect(searchProjectKnowledge(load(), 'proposta valor')).toEqual([]);
  });
});
