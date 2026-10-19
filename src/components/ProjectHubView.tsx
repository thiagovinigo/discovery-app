import React, { useState } from 'react';
import { DiscoveryProject } from '../types/discovery';
import {
  Rocket,
  Target,
  Compass,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Flame,
  FileText,
  LayoutGrid,
  Zap,
  Radio,
  Bot
} from 'lucide-react';

interface ProjectHubViewProps {
  project: DiscoveryProject;
  onUpdateProject: (updated: DiscoveryProject) => void;
  onNavigateToView: (view: any) => void;
}

export const ProjectHubView: React.FC<ProjectHubViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToView
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [vision, setVision] = useState(project.prd.valueProposition || 'Solução inteligente de conciliação e liquidação D+0 para clientes B2B.');
  const [targetAudience, setTargetAudience] = useState(project.prd.targetAudience || 'CFOs, Gestores Financeiros e Redes de Lojistas credenciados.');
  const [northStar, setNorthStar] = useState('Tempo médio de liquidação e repasse aos lojistas (< 15 minutos com 99.5% de precisão)');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DiscoveryProject = {
      ...project,
      name,
      description: desc,
      prd: {
        ...project.prd,
        valueProposition: vision,
        targetAudience
      }
    };
    onUpdateProject(updated);
    setIsEditing(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Rocket size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Hub do Projeto & Produto Inicial</h2>
              <span className="badge badge-primary">Iniciativa Ativa</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Visão estratégica, escopo do MVP, metas do produto e conexão com artefatos de entrega
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              Editar Detalhes do Produto
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem' }}
            >
              Salvar Alterações
            </button>
          )}
        </div>
      </div>

      {/* Main Content Form / Display */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
        {/* Row 1: Product Pitch & Vision */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={16} /> Visão & Proposta de Valor do Produto Inicial (Pitch)
          </h3>

          {!isEditing ? (
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                {project.name}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>
                {project.description}
              </p>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Proposta Única de Valor: </strong>
                {project.prd.valueProposition}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Nome do Produto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Descrição / Problema</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.85rem', resize: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Proposta Única de Valor</label>
                <input
                  type="text"
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Row 2: North Star Metric & Target Personas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-emerald)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Target size={16} color="var(--accent-emerald)" />
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase' }}>
                North Star Metric (Métrica Estrela Guia)
              </h4>
            </div>
            {!isEditing ? (
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                {northStar}
              </p>
            ) : (
              <input
                type="text"
                value={northStar}
                onChange={(e) => setNorthStar(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.82rem' }}
              />
            )}
            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Métrica central que mede a geração de valor real para o usuário final.
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users size={16} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase' }}>
                Público Alvo & Personas
              </h4>
            </div>
            {!isEditing ? (
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                {project.prd.targetAudience}
              </p>
            ) : (
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.82rem' }}
              />
            )}
            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Personas que sentem a dor crítica e tomam a decisão de uso ou compra.
            </div>
          </div>
        </div>

        {/* Row 2.5: Calculadora de ROI de Discovery (Executive Dashboard) */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--accent-emerald)" />
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>
                Calculadora de ROI de Discovery & Retrabalho Evitado
              </h4>
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
              Economia Comprovada por Evidências
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
            Impacto econômico gerado ao validar hipóteses reais com stakeholders e descartar features prematuras antes de uma única linha de código ser escrita.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Horas Economizadas</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6ee7b7', marginTop: '2px' }}>160h</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>2 features prematuras descartadas</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Desperdício Evitado</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#67e8f9', marginTop: '2px' }}>R$ 24.000</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Custo médio squad R$ 150/hora</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Retorno do Discovery</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>12.4x ROI</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Custo do discovery vs retrabalho</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Clareza BDD Gherkin</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fcd34d', marginTop: '2px' }}>92%</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Redução de idas e vindas de QA</span>
            </div>
          </div>
        </div>

        {/* Row 3: MVP Horizons (Onda 1 MVP vs Onda 2 Escala) */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} /> Sequenciamento do Produto Inicial (Ondas do MVP - Lean Inception)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-emerald">ONDA 1: MVP ESSENCIAL (LANÇAMENTO)</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Sprints 1 a 3</span>
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {project.prd.inScope.slice(0, 3).map((item, idx) => (
                  <li key={idx}><strong>{item}</strong></li>
                ))}
              </ul>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-primary">ONDA 2: EXPANSÃO & ESCALA</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Pós-validação</span>
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {project.prd.outOfScope.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Row 4: Direct Launchpad to all project tools */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Ferramentas da Área de Trabalho deste Projeto:
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Ou navegue pelas etapas na barra lateral ao lado
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div
              id="hub-launch-live-room"
              onClick={() => onNavigateToView('live_room')}
              className="glass-card"
              style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(244, 63, 94, 0.3)', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Radio size={18} color="#f43f5e" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Gravações & Entrevistas</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Escuta ao vivo e Mom Test</span>
                </div>
              </div>
              <ArrowRight size={15} color="#fda4af" />
            </div>

            <div
              id="hub-launch-backlog"
              onClick={() => onNavigateToView('backlog')}
              className="glass-card"
              style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Backlog & Histórias BDD</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{project.epics.length} Épicos · Given/When/Then</span>
                </div>
              </div>
              <ArrowRight size={15} color="#6ee7b7" />
            </div>

            <div
              id="hub-launch-documentation"
              onClick={() => onNavigateToView('documentation')}
              className="glass-card"
              style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(6, 182, 212, 0.3)', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="var(--accent-cyan)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>PRD Vivo & SPEC para IA</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Exportação para agentes de IA</span>
                </div>
              </div>
              <ArrowRight size={15} color="var(--accent-cyan)" />
            </div>

            <div
              id="hub-launch-agent-studio"
              onClick={() => onNavigateToView('agent_studio')}
              className="glass-card"
              style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(192, 132, 252, 0.3)', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(192, 132, 252, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color="#c084fc" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>6 Agentes de IA & Git</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>PO, QA, Arquiteto & Repositório</span>
                </div>
              </div>
              <ArrowRight size={15} color="#c084fc" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
