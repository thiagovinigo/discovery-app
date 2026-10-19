import React, { useState, useRef } from 'react';
import { MindMapNode, MindMapEdge } from '../types/discovery';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Flame,
  Lightbulb,
  Sparkles,
  Layers,
  Download
} from 'lucide-react';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  onAddNode?: (label: string, type: MindMapNode['type']) => void;
  onTriggerAnalysis?: () => void;
  isAnalyzing?: boolean;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  edges,
  onAddNode,
  onTriggerAnalysis,
  isAnalyzing = false
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Layout balanceado automático em órbita radial ao redor do objetivo central (400, 250)
  const displayNodes = React.useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return [{ id: 'm-root', label: 'Objetivo de Discovery', type: 'root' as const, x: 400, y: 250, color: '#6366f1' }];
    }
    const root = nodes.find(n => n.type === 'root') || nodes[0];
    const children = nodes.filter(n => n.id !== root.id);

    if (children.length === 0) {
      return [{ ...root, x: 400, y: 250 }];
    }

    return [
      { ...root, x: 400, y: 250 },
      ...children.map((child, idx) => {
        const total = children.length;
        const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
        // Alterna o raio para evitar colisão visual de labels
        const radius = total > 5 ? (idx % 2 === 0 ? 175 : 215) : 185;
        const calcX = Math.round(400 + radius * Math.cos(angle));
        const calcY = Math.round(250 + radius * Math.sin(angle));
        return {
          ...child,
          x: calcX,
          y: calcY
        };
      })
    ];
  }, [nodes]);

  // Garante que cada nó esteja conectado por uma aresta bezier ao nó raiz
  const displayEdges = React.useMemo(() => {
    const root = displayNodes.find(n => n.type === 'root') || displayNodes[0];
    if (!root) return edges;
    const result = [...edges];

    displayNodes.forEach(node => {
      if (node.id !== root.id && !result.some(e => e.target === node.id || e.source === node.id)) {
        result.push({
          id: `auto-edge-${root.id}-${node.id}`,
          source: root.id,
          target: node.id
        });
      }
    });

    return result;
  }, [displayNodes, edges]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const exportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapa_mental_discovery_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getNodeColor = (type: MindMapNode['type']) => {
    switch (type) {
      case 'root':
        return '#6366f1';
      case 'pain':
        return '#f43f5e';
      case 'jtbd':
        return '#10b981';
      case 'opportunity':
        return '#8b5cf6';
      case 'solution':
        return '#06b6d4';
      default:
        return '#94a3b8';
    }
  };

  const getNodeIcon = (type: MindMapNode['type']) => {
    switch (type) {
      case 'root':
        return <Layers size={14} color="#ffffff" />;
      case 'pain':
        return <Flame size={14} color="#ffffff" />;
      case 'jtbd':
        return <Lightbulb size={14} color="#ffffff" />;
      case 'opportunity':
        return <Sparkles size={14} color="#ffffff" />;
      case 'solution':
        return <GitBranch size={14} color="#ffffff" />;
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '260px', position: 'relative' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={18} color="var(--accent-violet)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Mapa Mental Dinâmico de Discovery</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Construído ao vivo com base na conversa</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onTriggerAnalysis && (
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', color: '#c4b5fd' }}
              title="Analisa as falas e sintetiza novos nós no mapa mental"
            >
              <Sparkles size={12} />
              {isAnalyzing ? 'Atualizando...' : 'Atualizar com IA'}
            </button>
          )}

          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.15, 2.5))}
            className="btn btn-ghost"
            style={{ padding: '5px' }}
            title="Aumentar Zoom"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.5))}
            className="btn btn-ghost"
            style={{ padding: '5px' }}
            title="Diminuir Zoom"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={resetView}
            className="btn btn-ghost"
            style={{ padding: '5px' }}
            title="Centralizar Visualização"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={exportSvg}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.74rem', gap: '4px' }}
            title="Baixar Mapa em SVG"
          >
            <Download size={12} />
            SVG
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a5b4fc' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1' }} /> Objetivo Central
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fda4af' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f43f5e' }} /> Dores & Fricções
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6ee7b7' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} /> JTBDs
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c4b5fd' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8b5cf6' }} /> Oportunidades
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#67e8f9' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#06b6d4' }} /> Ideias de Solução
        </span>
      </div>

      {/* Canvas Area */}
      <div
        style={{
          flex: 1,
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px) 0 0 / 24px 24px, #0b1120',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {displayEdges.map(edge => {
              const srcNode = displayNodes.find(n => n.id === edge.source);
              const tgtNode = displayNodes.find(n => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              // Cubic bezier curved line
              const dx = tgtNode.x - srcNode.x;
              const dy = tgtNode.y - srcNode.y;
              const cx1 = srcNode.x + dx * 0.5;
              const cy1 = srcNode.y;
              const cx2 = srcNode.x + dx * 0.5;
              const cy2 = tgtNode.y;

              return (
                <path
                  key={edge.id}
                  d={`M ${srcNode.x} ${srcNode.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgtNode.x} ${tgtNode.y}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="2"
                  strokeDasharray={srcNode.type === 'opportunity' ? '4 4' : 'none'}
                />
              );
            })}

            {/* Nodes */}
            {displayNodes.map(node => {
              const isRoot = node.type === 'root';
              const color = getNodeColor(node.type);

              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  {/* Outer glow ring */}
                  <circle
                    r={isRoot ? 36 : 28}
                    fill={color}
                    fillOpacity="0.18"
                    stroke={color}
                    strokeWidth="1.5"
                  />

                  {/* Inner solid node */}
                  <circle
                    r={isRoot ? 24 : 18}
                    fill={color}
                    filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
                  />

                  {/* Icon inside circle */}
                  <foreignObject
                    x={isRoot ? -10 : -7}
                    y={isRoot ? -10 : -7}
                    width={isRoot ? 20 : 14}
                    height={isRoot ? 20 : 14}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getNodeIcon(node.type)}
                    </div>
                  </foreignObject>

                  {/* Label pill under or next to node */}
                  <foreignObject
                    x={-85}
                    y={isRoot ? 32 : 24}
                    width={170}
                    height={44}
                  >
                    <div style={{
                      textAlign: 'center',
                      background: 'rgba(15, 23, 42, 0.92)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${color}55`,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {node.label}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Empty state overlay when only root exists */}
        {displayNodes.length <= 1 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            padding: '18px 22px',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '360px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <Sparkles size={22} color="var(--accent-violet)" style={{ marginBottom: '6px' }} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>
              Mapa Mental de Discovery
            </h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '12px' }}>
              Conforme as falas forem capturadas, este mapa se ramificará em Dores, JTBDs e Oportunidades.
            </p>
            {onTriggerAnalysis && (
              <button
                onClick={onTriggerAnalysis}
                disabled={isAnalyzing}
                className="btn btn-primary"
                style={{ fontSize: '0.76rem', padding: '6px 14px', gap: '6px' }}
              >
                <Sparkles size={13} />
                {isAnalyzing ? 'Mapeando com IA...' : 'Gerar Mapa com Falas Atuais'}
              </button>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
          Zoom: {Math.round(zoom * 100)}% • Arraste para mover • {displayNodes.length} nós no mapa
        </div>
      </div>
    </div>
  );
};

