import { describe, expect, it } from 'vitest';
import {
  ROOT_ID,
  addChildNode,
  buildMindMap,
  deleteNode,
  layoutMindMap,
  mindMapBounds,
  renameNode,
  syncMindMap
} from './mindMapService';
import type { JTBDItem, MeetingSession, MindMapNode, PainPoint, TranscriptSegment } from '../types/discovery';

let counter = 0;
const talk = (text: string, over: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id: `g${++counter}`, speaker: 'Usuário / Stakeholder', text, timestamp: '04:12', isFinal: true, ...over
});
const pain = (id: string, description: string, over: Partial<PainPoint> = {}): PainPoint => ({ id, description, severity: 'high', frequencyScore: 3, ...over });
const jtbd = (id: string, job: string): JTBDItem => ({ id, context: 'Quando fecha o mês', job, outcome: 'Para entregar no prazo', frequency: 'mensal' });

const SHEETS = [
  'O fechamento do mês é feito em planilhas e demora quatro dias',
  'As planilhas quebram sempre que alguém muda uma fórmula no fechamento',
  'Eu perco metade do tempo conferindo planilhas na mão'
];
const SUPPORT = [
  'O suporte recebe muitos chamados de clientes confusos com o repasse',
  'Cada chamado de repasse atrasado ocupa o suporte por uma hora',
  'Os clientes ligam no suporte porque não sabem o status do repasse'
];

const session = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1', title: 'Entrevista com a Ana', date: '01/01/2026', durationSeconds: 0, participants: [],
  rawTranscript: [...SHEETS, ...SUPPORT].map(t => talk(t)),
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [], painPoints: [], jtbds: [], mindMapNodes: [], mindMapEdges: [], userFlowSteps: [], ...over
});

const byId = (nodes: MindMapNode[], id: string) => nodes.find(n => n.id === id);
const topicNode = (nodes: MindMapNode[], keyword: string) => nodes.find(n => n.type === 'topic' && n.id.includes(keyword))!;

describe('buildMindMap', () => {
  it('sem conversa nem dores, só a raiz, com o título da sessão', () => {
    const nodes = buildMindMap(session({ rawTranscript: [] }), 'Projeto X');

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: ROOT_ID, type: 'root', label: 'Entrevista com a Ana' });
  });

  it('a raiz usa o objetivo da reunião quando ele existe, e o nome do projeto na falta de título', () => {
    expect(buildMindMap(session({ objective: 'Entender o fechamento', rawTranscript: [] }), 'P')[0].label).toBe('Entender o fechamento');
    expect(buildMindMap(session({ title: '', rawTranscript: [] }), 'Projeto X')[0].label).toBe('Projeto X');
  });

  it('cada assunto da conversa vira um ramo ligado à raiz', () => {
    const nodes = buildMindMap(session(), 'P');

    const topics = nodes.filter(n => n.type === 'topic');
    expect(topics).toHaveLength(2);
    expect(topics.every(t => t.parentId === ROOT_ID)).toBe(true);
  });

  it('as dores entram como filhas do assunto de que tratam, guardando a fala, quem disse e quando', () => {
    const quote = 'Eu perco metade do tempo conferindo planilhas na mão';
    const nodes = buildMindMap(session({ painPoints: [pain('p1', 'Conferência manual das planilhas consome o tempo', { quote })] }), 'P');

    const painNode = nodes.find(n => n.type === 'pain')!;
    expect(painNode.parentId).toBe(topicNode(nodes, 'planilha').id);
    expect(painNode).toMatchObject({ quote, speaker: 'Entrevistado', timestamp: '04:12' });
  });

  it('o nome do stakeholder aparece quando a sala sabia quem falou', () => {
    const quote = 'Eu perco metade do tempo conferindo planilhas na mão';
    const s = session({
      rawTranscript: [...SHEETS, ...SUPPORT].map(t => talk(t, t === SHEETS[2] ? { speakerStakeholderId: 'stk-ana' } : {})),
      painPoints: [pain('p1', 'Conferência manual das planilhas', { quote })]
    });

    const nodes = buildMindMap(s, 'P', [{ id: 'stk-ana', name: 'Ana', role: 'usuario', interest: 'alto', influence: 'medio', createdAt: '2026-01-01T10:00:00.000Z' }]);

    expect(nodes.find(n => n.type === 'pain')!.speaker).toBe('Ana');
  });

  it('os JTBDs também entram sob o assunto certo', () => {
    const nodes = buildMindMap(session({ jtbds: [jtbd('j1', 'Fechar as planilhas do mês sem erro')] }), 'P');

    const jtbdNode = nodes.find(n => n.type === 'jtbd')!;
    expect(jtbdNode.parentId).toBe(topicNode(nodes, 'planilha').id);
    expect(jtbdNode.notes).toContain('Quando fecha o mês');
  });

  it('dor que não casa com nenhum assunto vai para o grupo "Outras dores"', () => {
    const nodes = buildMindMap(session({ painPoints: [pain('p9', 'Nenhuma ferramenta integra com o ERP')] }), 'P');

    const group = nodes.find(n => n.label === 'Outras dores')!;
    expect(group).toMatchObject({ type: 'topic', parentId: ROOT_ID });
    expect(nodes.find(n => n.type === 'pain')!.parentId).toBe(group.id);
  });

  it('só cria o grupo "Outras dores" quando é preciso', () => {
    expect(buildMindMap(session(), 'P').some(n => n.label === 'Outras dores')).toBe(false);
  });

  it('textos longos são encurtados no nó, mas o texto inteiro fica nas notas', () => {
    const long = 'Conferência manual das planilhas '.repeat(6).trim();
    const nodes = buildMindMap(session({ painPoints: [pain('p1', long)] }), 'P');

    const painNode = nodes.find(n => n.type === 'pain')!;
    expect(painNode.label.length).toBeLessThanOrEqual(61);
    expect(painNode.label.endsWith('…')).toBe(true);
    expect(painNode.notes).toBe(long);
  });

  it('ids estáveis: o mesmo conteúdo gera o mesmo mapa', () => {
    const s = session({ painPoints: [pain('p1', 'Conferência manual das planilhas')] });

    expect(buildMindMap(s, 'P').map(n => n.id)).toEqual(buildMindMap(s, 'P').map(n => n.id));
  });
});

describe('syncMindMap', () => {
  it('monta o mapa na sessão, com posições e as ligações pai-filho', () => {
    const synced = syncMindMap(session({ painPoints: [pain('p1', 'Conferência manual das planilhas')] }), 'P');

    expect(synced.mindMapNodes.length).toBeGreaterThan(2);
    expect(synced.mindMapNodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    for (const node of synced.mindMapNodes.filter(n => n.id !== ROOT_ID)) {
      expect(synced.mindMapEdges).toContainEqual(expect.objectContaining({ source: node.parentId ?? ROOT_ID, target: node.id }));
    }
  });

  it('rodar duas vezes dá o mesmo mapa', () => {
    const once = syncMindMap(session({ painPoints: [pain('p1', 'Conferência manual das planilhas')] }), 'P');

    expect(syncMindMap(once, 'P')).toEqual(once);
  });

  it('nós criados à mão ficam, e a análise nova não os apaga', () => {
    const synced = syncMindMap(session(), 'P');
    const withManual = addChildNode(synced, topicNode(synced.mindMapNodes, 'planilha').id, 'Ideia minha', 'opportunity');

    const resynced = syncMindMap({ ...withManual, painPoints: [pain('p1', 'Conferência manual das planilhas')] }, 'P');

    expect(resynced.mindMapNodes.some(n => n.label === 'Ideia minha' && n.manual)).toBe(true);
  });

  it('nó renomeado pelo usuário mantém o nome novo', () => {
    const synced = syncMindMap(session(), 'P');
    const topic = topicNode(synced.mindMapNodes, 'planilha');
    const renamed = renameNode(synced, topic.id, 'Fechamento é o gargalo');

    const resynced = syncMindMap(renamed, 'P');

    expect(byId(resynced.mindMapNodes, topic.id)).toMatchObject({ label: 'Fechamento é o gargalo', manual: true });
  });

  it('nó apagado pelo usuário não volta na próxima análise', () => {
    const synced = syncMindMap(session({ painPoints: [pain('p1', 'Conferência manual das planilhas')] }), 'P');
    const painNode = synced.mindMapNodes.find(n => n.type === 'pain')!;
    const deleted = deleteNode(synced, painNode.id);

    const resynced = syncMindMap(deleted, 'P');

    expect(byId(resynced.mindMapNodes, painNode.id)).toBeUndefined();
  });

  it('apagar um ramo apaga tudo o que está dentro dele, e isso também não volta', () => {
    const synced = syncMindMap(session({ painPoints: [pain('p1', 'Conferência manual das planilhas')] }), 'P');
    const topic = topicNode(synced.mindMapNodes, 'planilha');

    const resynced = syncMindMap(deleteNode(synced, topic.id), 'P');

    expect(byId(resynced.mindMapNodes, topic.id)).toBeUndefined();
    expect(resynced.mindMapNodes.some(n => n.type === 'pain')).toBe(false);
  });

  it('a raiz não pode ser apagada', () => {
    const synced = syncMindMap(session(), 'P');

    expect(deleteNode(synced, ROOT_ID).mindMapNodes.some(n => n.id === ROOT_ID)).toBe(true);
  });

  it('nós soltos de análises antigas ganham um pai: o assunto parecido, ou a raiz', () => {
    const legacy: MindMapNode[] = [
      { id: 'old-1', label: 'Planilha manual', type: 'pain', x: 10, y: 10 },
      { id: 'old-2', label: 'Assunto sem relação alguma', type: 'opportunity', x: 20, y: 20 }
    ];

    const synced = syncMindMap(session({ mindMapNodes: legacy }), 'P');

    expect(byId(synced.mindMapNodes, 'old-1')!.parentId).toBe(topicNode(synced.mindMapNodes, 'planilha').id);
    expect(byId(synced.mindMapNodes, 'old-2')!.parentId).toBe(ROOT_ID);
  });

  it('um nó antigo com o mesmo nome de um ramo novo não vira duplicata', () => {
    const synced = syncMindMap(session(), 'P');
    const topic = topicNode(synced.mindMapNodes, 'planilha');
    const legacy: MindMapNode = { id: 'old-1', label: topic.label, type: 'opportunity', x: 0, y: 0 };

    const resynced = syncMindMap({ ...synced, mindMapNodes: [...synced.mindMapNodes, legacy] }, 'P');

    expect(resynced.mindMapNodes.filter(n => n.label === topic.label)).toHaveLength(1);
  });
});

describe('edição dos nós', () => {
  it('adicionar um filho cria um nó manual ligado ao pai', () => {
    const synced = syncMindMap(session(), 'P');
    const topic = topicNode(synced.mindMapNodes, 'planilha');

    const next = addChildNode(synced, topic.id, '  Automatizar a conferência  ', 'solution');

    const added = next.mindMapNodes.find(n => n.label === 'Automatizar a conferência')!;
    expect(added).toMatchObject({ parentId: topic.id, type: 'solution', manual: true });
    expect(next.mindMapEdges).toContainEqual(expect.objectContaining({ source: topic.id, target: added.id }));
  });

  it('rótulo vazio ou pai inexistente não muda nada', () => {
    const synced = syncMindMap(session(), 'P');

    expect(addChildNode(synced, ROOT_ID, '   ')).toBe(synced);
    expect(addChildNode(synced, 'nao-existe', 'x')).toBe(synced);
    expect(renameNode(synced, ROOT_ID, '  ')).toBe(synced);
    expect(renameNode(synced, 'nao-existe', 'x')).toBe(synced);
  });

  it('não altera a sessão original', () => {
    const synced = syncMindMap(session(), 'P');
    const snapshot = JSON.stringify(synced);

    addChildNode(synced, ROOT_ID, 'Algo');
    renameNode(synced, ROOT_ID, 'Outro');
    deleteNode(synced, topicNode(synced.mindMapNodes, 'planilha').id);

    expect(JSON.stringify(synced)).toBe(snapshot);
  });
});

describe('layoutMindMap', () => {
  const tree = (branches: number, leaves: number): MindMapNode[] => {
    const nodes: MindMapNode[] = [{ id: ROOT_ID, label: 'Raiz', type: 'root', x: 0, y: 0 }];
    for (let b = 0; b < branches; b++) {
      nodes.push({ id: `t${b}`, label: `Ramo ${b}`, type: 'topic', x: 0, y: 0, parentId: ROOT_ID });
      for (let l = 0; l < leaves; l++) nodes.push({ id: `t${b}-l${l}`, label: `Folha ${b}.${l}`, type: 'pain', x: 0, y: 0, parentId: `t${b}` });
    }
    return nodes;
  };

  const distance = (a: MindMapNode, b: MindMapNode) => Math.hypot(a.x - b.x, a.y - b.y);

  it('a raiz fica no centro e os demais ao redor', () => {
    const laid = layoutMindMap(tree(4, 2));

    expect(laid[0]).toMatchObject({ x: 400, y: 250 });
    expect(laid.slice(1).every(n => distance(n, laid[0]) > 100)).toBe(true);
  });

  it('nenhum nó cai em cima de outro, mesmo com um mapa grande', () => {
    const laid = layoutMindMap(tree(7, 5));

    let smallest = Infinity;
    for (let i = 0; i < laid.length; i++) for (let j = i + 1; j < laid.length; j++) smallest = Math.min(smallest, distance(laid[i], laid[j]));

    expect(smallest).toBeGreaterThanOrEqual(60);
  });

  it('os filhos ficam mais longe do centro que o pai', () => {
    const laid = layoutMindMap(tree(3, 3));
    const root = laid[0];

    for (const leaf of laid.filter(n => n.type === 'pain')) {
      const parent = laid.find(n => n.id === leaf.parentId)!;
      expect(distance(leaf, root)).toBeGreaterThan(distance(parent, root));
    }
  });

  it('o mesmo mapa gera sempre as mesmas posições', () => {
    expect(layoutMindMap(tree(5, 4))).toEqual(layoutMindMap(tree(5, 4)));
  });

  it('mapa só com a raiz não quebra', () => {
    expect(layoutMindMap([{ id: ROOT_ID, label: 'Raiz', type: 'root', x: 0, y: 0 }])).toEqual([{ id: ROOT_ID, label: 'Raiz', type: 'root', x: 400, y: 250 }]);
    expect(layoutMindMap([])).toEqual([]);
  });
});

describe('mindMapBounds', () => {
  it('enquadra todos os nós com folga para os rótulos', () => {
    const laid = layoutMindMap([
      { id: ROOT_ID, label: 'Raiz', type: 'root', x: 0, y: 0 },
      { id: 'a', label: 'A', type: 'topic', x: 0, y: 0, parentId: ROOT_ID },
      { id: 'b', label: 'B', type: 'topic', x: 0, y: 0, parentId: ROOT_ID }
    ]);

    const box = mindMapBounds(laid);

    for (const n of laid) {
      expect(n.x).toBeGreaterThanOrEqual(box.x);
      expect(n.x).toBeLessThanOrEqual(box.x + box.width);
      expect(n.y).toBeGreaterThanOrEqual(box.y);
      expect(n.y).toBeLessThanOrEqual(box.y + box.height);
    }
    expect(box.width).toBeGreaterThanOrEqual(400);
  });
});
