import { newId } from './ids';
import { plain, tokens } from './knowledgeService';
import { extractTopics } from './topicService';
import type { SessionTopic } from './topicService';
import type { MeetingSession, MindMapEdge, MindMapNode, Stakeholder, TranscriptSegment } from '../types/discovery';

export const ROOT_ID = 'm-root';
/** Prefixo dos nós que a análise cria sozinha; o que o usuário escreve nunca usa esse prefixo. */
const DERIVED_PREFIX = 'mm-';

const CENTER = { x: 400, y: 250 };
/** Distância da raiz por nível. Níveis mais fundos crescem de 100 em 100. */
const BASE_RADII = [0, 170, 300, 410, 500];
const RING_STEP = 120;
const MIN_NODE_GAP = 70;
const MAX_RADIUS = 1400;
const LABEL_MAX = 60;
const BOUNDS_PADDING = 140;
const MIN_BOUNDS = { width: 400, height: 300 };

export const NODE_COLORS: Record<MindMapNode['type'], string> = {
  root: '#6366f1',
  topic: '#3b82f6',
  pain: '#f43f5e',
  jtbd: '#10b981',
  opportunity: '#8b5cf6',
  solution: '#06b6d4',
  metric: '#f59e0b'
};

const norm = (text: string): string => plain(text).trim();

/** Corta no limite sem partir palavra e marca com reticências. */
function shorten(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= LABEL_MAX) return clean;
  const cut = clean.slice(0, LABEL_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > LABEL_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const SPEAKER_LABELS: Record<TranscriptSegment['speaker'], string | undefined> = {
  'Entrevistador (PM)': 'Entrevistador',
  'Usuário / Stakeholder': 'Entrevistado',
  Desconhecido: undefined
};

/** Quem disse a fala e quando, se a citação aparece na transcrição. */
function originOf(session: MeetingSession, quote: string | undefined, stakeholders: Stakeholder[]): { speaker?: string; timestamp?: string } {
  if (!quote?.trim()) return {};
  const wanted = norm(quote);
  const segment = session.rawTranscript.find(s => norm(s.text).includes(wanted));
  if (!segment) return {};
  const named = stakeholders.find(s => s.id === segment.speakerStakeholderId)?.name;
  return { speaker: named ?? SPEAKER_LABELS[segment.speaker], timestamp: segment.timestamp };
}

function bestTopic(text: string, topics: SessionTopic[]): SessionTopic | undefined {
  const words = new Set(tokens(text));
  let best: SessionTopic | undefined;
  let bestScore = 0;
  for (const topic of topics) {
    const score = topic.keywords.filter(keyword => words.has(keyword)).length;
    if (score > bestScore || (score === bestScore && score > 0 && best && topic.mentions > best.mentions)) {
      best = topic;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : undefined;
}

const make = (node: Omit<MindMapNode, 'x' | 'y' | 'color'>): MindMapNode => ({ ...node, x: 0, y: 0, color: NODE_COLORS[node.type] });

interface Derived {
  nodes: MindMapNode[];
  topics: SessionTopic[];
}

/** O mapa que a conversa e a análise sustentam: raiz → assuntos → dores e JTBDs. Sem posições ainda. */
function derive(session: MeetingSession, projectName: string, stakeholders: Stakeholder[]): Derived {
  const root = make({
    id: ROOT_ID,
    label: session.objective?.trim() || session.title?.trim() || projectName || 'Objetivo do Discovery',
    type: 'root'
  });
  const topics = extractTopics(session);
  const nodes: MindMapNode[] = [root];
  const topicNodeId = (topic: SessionTopic) => `${DERIVED_PREFIX}${topic.id}`;
  for (const topic of topics) nodes.push(make({ id: topicNodeId(topic), label: topic.title, type: 'topic', parentId: ROOT_ID }));

  const children: MindMapNode[] = [];
  const groups = { pain: false, jtbd: false };

  for (const p of session.painPoints) {
    const topic = bestTopic(`${p.description} ${p.quote ?? ''}`, topics);
    if (!topic) groups.pain = true;
    const label = shorten(p.description);
    children.push(make({
      id: `${DERIVED_PREFIX}pain-${p.id}`,
      label,
      type: 'pain',
      parentId: topic ? topicNodeId(topic) : `${DERIVED_PREFIX}group-pain`,
      notes: label === p.description.trim() ? undefined : p.description,
      quote: p.quote,
      ...originOf(session, p.quote, stakeholders)
    }));
  }

  for (const j of session.jtbds) {
    const topic = bestTopic(`${j.job} ${j.context} ${j.outcome}`, topics);
    if (!topic) groups.jtbd = true;
    children.push(make({
      id: `${DERIVED_PREFIX}jtbd-${j.id}`,
      label: shorten(j.job),
      type: 'jtbd',
      parentId: topic ? topicNodeId(topic) : `${DERIVED_PREFIX}group-jtbd`,
      notes: `${j.context} · ${j.outcome}`
    }));
  }

  if (groups.pain) nodes.push(make({ id: `${DERIVED_PREFIX}group-pain`, label: 'Outras dores', type: 'topic', parentId: ROOT_ID }));
  if (groups.jtbd) nodes.push(make({ id: `${DERIVED_PREFIX}group-jtbd`, label: 'Outros jobs', type: 'topic', parentId: ROOT_ID }));

  return { nodes: [...nodes, ...children], topics };
}

/** O mapa mental derivado da reunião, sem posições. Os mesmos dados dão sempre os mesmos ids. */
export function buildMindMap(session: MeetingSession, projectName: string, stakeholders: Stakeholder[] = []): MindMapNode[] {
  return derive(session, projectName, stakeholders).nodes;
}

export function edgesOf(nodes: MindMapNode[]): MindMapEdge[] {
  return nodes
    .filter(n => n.id !== ROOT_ID && n.type !== 'root')
    .map(n => ({ id: `edge-${n.parentId ?? ROOT_ID}-${n.id}`, source: n.parentId ?? ROOT_ID, target: n.id }));
}

/**
 * Dispõe os nós em círculos ao redor da raiz: cada ramo ganha uma fatia proporcional ao que tem dentro, os filhos ficam
 * na fatia do pai e cada nível se afasta o bastante para nenhum nó cair em cima de outro. Mesmo mapa, mesmas posições.
 */
export function layoutMindMap(nodes: MindMapNode[]): MindMapNode[] {
  if (nodes.length === 0) return [];
  const root = nodes.find(n => n.type === 'root') ?? nodes[0];

  const childrenOf = new Map<string, MindMapNode[]>();
  for (const node of nodes) {
    if (node.id === root.id) continue;
    const parent = node.parentId && nodes.some(n => n.id === node.parentId) ? node.parentId : root.id;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), node]);
  }

  const weights = new Map<string, number>();
  const weightOf = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 1;
    seen.add(id);
    const kids = childrenOf.get(id) ?? [];
    const w = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + weightOf(kid.id, seen), 0);
    weights.set(id, w);
    return w;
  };
  weightOf(root.id, new Set());

  const angles = new Map<string, number>();
  const depths = new Map<string, number>([[root.id, 0]]);
  const place = (id: string, start: number, end: number, depth: number, seen: Set<string>) => {
    const kids = (childrenOf.get(id) ?? []).filter(kid => !seen.has(kid.id));
    const total = kids.reduce((sum, kid) => sum + (weights.get(kid.id) ?? 1), 0);
    let cursor = start;
    for (const kid of kids) {
      seen.add(kid.id);
      const span = ((end - start) * (weights.get(kid.id) ?? 1)) / total;
      angles.set(kid.id, cursor + span / 2);
      depths.set(kid.id, depth + 1);
      place(kid.id, cursor, cursor + span, depth + 1, seen);
      cursor += span;
    }
  };
  place(root.id, -Math.PI / 2, (3 * Math.PI) / 2, 0, new Set([root.id]));

  const maxDepth = Math.max(...depths.values());
  const radii: number[] = [0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const sorted = nodes.filter(n => depths.get(n.id) === depth).map(n => angles.get(n.id)!).sort((a, b) => a - b);
    let smallestGap = 2 * Math.PI;
    for (let i = 0; i < sorted.length; i++) {
      const next = i === sorted.length - 1 ? sorted[0] + 2 * Math.PI : sorted[i + 1];
      if (sorted.length > 1) smallestGap = Math.min(smallestGap, next - sorted[i]);
    }
    const needed = sorted.length > 1 ? MIN_NODE_GAP / (2 * Math.sin(Math.min(smallestGap, Math.PI) / 2)) : 0;
    const base = BASE_RADII[depth] ?? BASE_RADII[BASE_RADII.length - 1] + (depth - BASE_RADII.length + 1) * 100;
    radii[depth] = Math.min(MAX_RADIUS, Math.max(base, radii[depth - 1] + RING_STEP, needed));
  }

  return nodes.map(node => {
    if (node.id === root.id) return { ...node, x: CENTER.x, y: CENTER.y };
    const depth = depths.get(node.id);
    const angle = angles.get(node.id);
    if (depth === undefined || angle === undefined) return { ...node, x: CENTER.x, y: CENTER.y };
    return { ...node, x: Math.round(CENTER.x + radii[depth] * Math.cos(angle)), y: Math.round(CENTER.y + radii[depth] * Math.sin(angle)) };
  });
}

/** Retângulo que enquadra todos os nós, com folga para os rótulos. */
export function mindMapBounds(nodes: MindMapNode[]): { x: number; y: number; width: number; height: number } {
  if (nodes.length === 0) return { x: 0, y: 0, ...MIN_BOUNDS };
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - BOUNDS_PADDING;
  const maxX = Math.max(...xs) + BOUNDS_PADDING;
  const minY = Math.min(...ys) - BOUNDS_PADDING;
  const maxY = Math.max(...ys) + BOUNDS_PADDING;
  const width = Math.max(maxX - minX, MIN_BOUNDS.width);
  const height = Math.max(maxY - minY, MIN_BOUNDS.height);
  return { x: Math.round((minX + maxX) / 2 - width / 2), y: Math.round((minY + maxY) / 2 - height / 2), width: Math.round(width), height: Math.round(height) };
}

const withLayout = (session: MeetingSession, nodes: MindMapNode[], hidden?: string[]): MeetingSession => {
  const laidOut = layoutMindMap(nodes);
  return { ...session, mindMapNodes: laidOut, mindMapEdges: edgesOf(laidOut), ...(hidden ? { mindMapHiddenIds: hidden } : {}) };
};

/** Fica só com os nós ligados à raiz: apagar um ramo leva junto tudo o que está dentro dele. */
function reachable(nodes: MindMapNode[]): MindMapNode[] {
  const keep = new Set<string>(nodes.filter(n => n.type === 'root').map(n => n.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (keep.has(node.id)) continue;
      const parent = node.parentId ?? ROOT_ID;
      if (keep.has(parent)) {
        keep.add(node.id);
        changed = true;
      }
    }
  }
  return nodes.filter(n => keep.has(n.id));
}

/**
 * Atualiza o mapa da sessão com o que a conversa tem agora. O que a análise cria é refeito (ids estáveis); o que o
 * usuário escreveu, renomeou ou apagou é respeitado; nós soltos de análises antigas ganham um pai, o assunto parecido
 * ou a raiz. Rodar de novo sem mudanças dá o mesmo mapa.
 */
export function syncMindMap(session: MeetingSession, projectName: string, stakeholders: Stakeholder[] = []): MeetingSession {
  const hidden = new Set(session.mindMapHiddenIds ?? []);
  const { nodes: derived, topics } = derive(session, projectName, stakeholders);
  const existing = session.mindMapNodes;

  const manual = existing.filter(n => n.manual);
  const manualIds = new Set(manual.map(n => n.id));
  const root = manual.find(n => n.id === ROOT_ID) ?? derived[0];

  const fresh = derived.filter(n => n.id !== ROOT_ID && !hidden.has(n.id) && !manualIds.has(n.id));
  const takenLabels = new Set([...fresh, ...manual].map(n => norm(n.label)));

  const topicNodeId = (topic: SessionTopic) => `${DERIVED_PREFIX}${topic.id}`;
  const legacy = existing
    .filter(n => !n.manual && n.id !== ROOT_ID && n.type !== 'root' && !n.id.startsWith(DERIVED_PREFIX))
    .filter(n => !takenLabels.has(norm(n.label)))
    .map(n => {
      if (n.parentId) return n;
      const topic = bestTopic(n.label, topics);
      return { ...n, parentId: topic && !hidden.has(topicNodeId(topic)) ? topicNodeId(topic) : ROOT_ID };
    });

  const kept = reachable([root, ...fresh, ...manual.filter(n => n.id !== ROOT_ID), ...legacy]);
  const keptIds = new Set(kept.map(n => n.id));
  const removedDerived = derived.filter(n => n.id !== ROOT_ID && !keptIds.has(n.id) && !manualIds.has(n.id)).map(n => n.id);
  const nextHidden = [...new Set([...hidden, ...removedDerived.filter(id => hidden.has(id) || fresh.every(f => f.id !== id))])];

  return withLayout(session, kept, nextHidden.length ? nextHidden : session.mindMapHiddenIds);
}

/** Renomeia o nó. O nó passa a ser seu: a análise não o sobrescreve mais. */
export function renameNode(session: MeetingSession, nodeId: string, label: string): MeetingSession {
  const text = label.trim();
  if (!text || !session.mindMapNodes.some(n => n.id === nodeId)) return session;
  return withLayout(session, session.mindMapNodes.map(n => (n.id === nodeId ? { ...n, label: text, manual: true } : n)));
}

/** Acrescenta um nó seu sob o pai. Ele fica mesmo quando a análise refaz o mapa. */
export function addChildNode(session: MeetingSession, parentId: string, label: string, type: MindMapNode['type'] = 'opportunity'): MeetingSession {
  const text = label.trim();
  if (!text || !session.mindMapNodes.some(n => n.id === parentId)) return session;
  const node = make({ id: newId('mapnode'), label: text, type, parentId, manual: true });
  return withLayout(session, [...session.mindMapNodes, node]);
}

/** Apaga o nó e tudo o que está dentro dele. A raiz não se apaga. Nós automáticos apagados não voltam. */
export function deleteNode(session: MeetingSession, nodeId: string): MeetingSession {
  if (nodeId === ROOT_ID || !session.mindMapNodes.some(n => n.id === nodeId)) return session;
  const remaining = reachable(session.mindMapNodes.filter(n => n.id !== nodeId));
  const keptIds = new Set(remaining.map(n => n.id));
  const removed = session.mindMapNodes.filter(n => !keptIds.has(n.id)).map(n => n.id);
  const hidden = [...new Set([...(session.mindMapHiddenIds ?? []), ...removed.filter(id => id.startsWith(DERIVED_PREFIX))])];
  return withLayout(session, remaining, hidden);
}
