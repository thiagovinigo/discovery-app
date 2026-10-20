import React, { useMemo, useRef, useState } from 'react';
import { GitBranch, Maximize2, RefreshCw, Sparkles, Trash2, ZoomIn, ZoomOut, Download, Plus } from 'lucide-react';
import type { MindMapNode } from '../types/discovery';
import { mindMapBounds, NODE_COLORS, ROOT_ID } from '../services/mindMapService';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onRename?: (nodeId: string, label: string) => void;
  onAddChild?: (parentId: string, label: string) => void;
  onDelete?: (nodeId: string) => void;
  /** Refaz o mapa com o que a conversa tem agora, sem IA. */
  onRefresh?: () => void;
  onTriggerAnalysis?: () => void;
  isAnalyzing?: boolean;
}

const TYPE_NAMES: Record<MindMapNode['type'], string> = {
  root: 'Objetivo',
  topic: 'Assunto',
  pain: 'Dor',
  jtbd: 'Job a ser feito',
  opportunity: 'Oportunidade',
  solution: 'Solução',
  metric: 'Métrica'
};

const LEGEND: MindMapNode['type'][] = ['root', 'topic', 'pain', 'jtbd', 'opportunity'];
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
const LINE_CHARS = 22;
const MAX_LINES = 3;
const CHAR_WIDTH = 6.6;

/** Quebra o rótulo em até três linhas, sem partir palavras. */
function wrapLabel(label: string): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of label.split(/\s+/)) {
    if (current && `${current} ${word}`.length > LINE_CHARS) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES - 1), `${lines.slice(MAX_LINES - 1).join(' ').slice(0, LINE_CHARS - 1)}…`];
}

interface DetailProps {
  node: MindMapNode;
  onRename?: (nodeId: string, label: string) => void;
  onAddChild?: (parentId: string, label: string) => void;
  onDelete?: (nodeId: string) => void;
}

const NodeDetail: React.FC<DetailProps> = ({ node, onRename, onAddChild, onDelete }) => {
  const [name, setName] = useState(node.label);
  const [child, setChild] = useState('');
  const [confirming, setConfirming] = useState(false);
  const canSaveName = name.trim() !== '' && name.trim() !== node.label;
  const canAdd = child.trim() !== '';

  return (
    <section role="region" aria-label="Detalhe do nó" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: NODE_COLORS[node.type], fontWeight: 700 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS[node.type] }} />
        {TYPE_NAMES[node.type]}{node.manual ? ' · seu' : ''}
      </div>
      <strong style={{ fontSize: '0.88rem', lineHeight: 1.3 }}>{node.label}</strong>

      {node.quote && (
        <blockquote style={{ margin: 0, padding: '6px 10px', borderLeft: '3px solid var(--accent-violet)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          “{node.quote}”
          {(node.speaker || node.timestamp) && (
            <footer style={{ marginTop: '4px', fontStyle: 'normal', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {[node.speaker, node.timestamp].filter(Boolean).join(' · ')}
            </footer>
          )}
        </blockquote>
      )}
      {node.notes && <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.4 }}>{node.notes}</p>}

      {onRename && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            aria-label="Nome do nó"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSaveName) onRename(node.id, name); }}
            style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.78rem' }}
          />
          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} disabled={!canSaveName} onClick={() => onRename(node.id, name)}>
            Salvar nome
          </button>
        </div>
      )}

      {onAddChild && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            aria-label="Novo nó filho"
            placeholder="Ex.: ideia, oportunidade, pergunta"
            value={child}
            onChange={e => setChild(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && canAdd) { onAddChild(node.id, child); setChild(''); }
            }}
            style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.78rem' }}
          />
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }}
            disabled={!canAdd}
            onClick={() => { onAddChild(node.id, child); setChild(''); }}
          >
            <Plus size={12} /> Adicionar filho
          </button>
        </div>
      )}

      {onDelete && node.id !== ROOT_ID && node.type !== 'root' && (
        confirming ? (
          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#fda4af', borderColor: 'rgba(244,63,94,0.5)' }} onClick={() => { onDelete(node.id); setConfirming(false); }}>
            Confirmar: apagar com tudo que está dentro
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', color: '#fda4af' }} onClick={() => setConfirming(true)}>
            <Trash2 size={12} /> Apagar nó
          </button>
        )
      )}
    </section>
  );
};

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ nodes, onRename, onAddChild, onDelete, onRefresh, onTriggerAnalysis, isAnalyzing = false }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const bounds = useMemo(() => mindMapBounds(nodes), [nodes]);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const root = nodes.find(n => n.type === 'root');
  const edges = nodes.filter(n => n.type !== 'root').map(n => ({ child: n, parent: byId.get(n.parentId ?? '') ?? root })).filter(e => e.parent);

  // O quadro mostra a área do mapa; zoom encolhe a janela ao redor do centro e pan a desloca
  const width = bounds.width / zoom;
  const height = bounds.height / zoom;
  const viewBox = [
    Math.round(bounds.x + (bounds.width - width) / 2 - pan.x),
    Math.round(bounds.y + (bounds.height - height) / 2 - pan.y),
    Math.round(width),
    Math.round(height)
  ].join(' ');

  const onPointerDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const onPointerMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const pixels = svgRef.current?.getBoundingClientRect().width || 0;
    const scale = pixels > 0 ? width / pixels : 1;
    const dx = (e.clientX - drag.current.x) * scale;
    const dy = (e.clientY - drag.current.y) * scale;
    drag.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };
  const endDrag = () => { drag.current = null; };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const exportSvg = () => {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapa_mental_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onlyRoot = nodes.length <= 1;

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '320px', position: 'relative', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={18} color="var(--accent-violet)" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Mapa mental</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assuntos da conversa, com as dores e jobs de cada um</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {onRefresh && (
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={onRefresh} title="Reorganiza o mapa com o que foi dito até agora, sem IA">
              <RefreshCw size={12} /> Atualizar mapa
            </button>
          )}
          {onTriggerAnalysis && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', color: '#c4b5fd' }}
              disabled={isAnalyzing}
              onClick={onTriggerAnalysis}
              title="Analisa as falas com IA e acrescenta dores, jobs e perguntas"
            >
              <Sparkles size={12} /> {isAnalyzing ? 'Atualizando...' : 'Atualizar com IA'}
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '5px' }} aria-label="Aumentar zoom" onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))}><ZoomIn size={15} /></button>
          <button className="btn btn-ghost" style={{ padding: '5px' }} aria-label="Diminuir zoom" onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))}><ZoomOut size={15} /></button>
          <button className="btn btn-ghost" style={{ padding: '5px' }} aria-label="Enquadrar o mapa" onClick={resetView}><Maximize2 size={15} /></button>
          <button className="btn btn-ghost" style={{ padding: '5px' }} aria-label="Baixar mapa em SVG" onClick={exportSvg}><Download size={15} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        {LEGEND.map(type => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: NODE_COLORS[type] }} /> {TYPE_NAMES[type]}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '2 1 360px', minHeight: '260px', position: 'relative', overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--border-subtle)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px) 0 0 / 24px 24px, #0b1120', cursor: 'grab'
          }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', minHeight: '260px' }}>
            {edges.map(({ child, parent }) => {
              const from = parent!;
              const mid = (from.x + child.x) / 2;
              return (
                <path
                  key={`${from.id}-${child.id}`}
                  data-edge
                  d={`M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${child.y}, ${child.x} ${child.y}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={2}
                />
              );
            })}

            {nodes.map(n => {
              const isRoot = n.type === 'root';
              const color = NODE_COLORS[n.type] ?? n.color;
              const isSelected = n.id === selectedId;
              const lines = wrapLabel(n.label);
              const labelWidth = Math.max(...lines.map(l => l.length)) * CHAR_WIDTH + 14;
              const radius = isRoot ? 22 : n.type === 'topic' ? 16 : 11;
              const labelTop = radius + 6;
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${TYPE_NAMES[n.type]}: ${n.label}`}
                  aria-pressed={isSelected}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: 'pointer', outline: 'none' }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setSelectedId(n.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(n.id); } }}
                >
                  <circle r={radius + 6} fill={color} fillOpacity={isSelected ? 0.35 : 0.14} stroke={isSelected ? '#fff' : color} strokeWidth={isSelected ? 2 : 1} />
                  <circle r={radius} fill={color} />
                  <rect x={-labelWidth / 2} y={labelTop} width={labelWidth} height={lines.length * 14 + 8} rx={6} fill="rgba(15,23,42,0.94)" stroke={color} strokeOpacity={0.5} />
                  <text textAnchor="middle" fill="#e5e7eb" fontSize={11} fontWeight={isRoot || n.type === 'topic' ? 700 : 500}>
                    {lines.map((line, i) => <tspan key={i} x={0} y={labelTop + 16 + i * 14}>{line}</tspan>)}
                  </text>
                </g>
              );
            })}
          </svg>

          {onlyRoot && (
            <div style={{ position: 'absolute', left: '50%', bottom: '14px', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(139,92,246,0.4)', padding: '10px 14px', borderRadius: '10px', textAlign: 'center', maxWidth: '320px', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Conforme a conversa avança, os assuntos aparecem aqui com as dores e jobs de cada um.
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '6px', right: '10px', fontSize: '0.66rem', color: 'var(--text-dim)' }}>
            {Math.round(zoom * 100)}% · arraste para mover · {nodes.length} nós
          </div>
        </div>

        <div style={{ flex: '1 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', overflowY: 'auto' }}>
          {selected ? (
            <NodeDetail key={`${selected.id}:${selected.label}`} node={selected} onRename={onRename} onAddChild={onAddChild} onDelete={onDelete} />
          ) : (
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Clique num nó para ver a fala que o originou, renomear, acrescentar uma ideia ou apagar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
