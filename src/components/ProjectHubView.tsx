import React, { useState } from 'react';
import { DiscoveryProject } from '../types/discovery';
import {
  Rocket,
  Target,
  Compass,
  Users,
  Layers,
  ArrowRight,
  FileText,
  Zap,
  Radio,
  Brain,
  GitBranch,
  Workflow
} from 'lucide-react';

interface ProjectHubViewProps {
  project: DiscoveryProject;
  onUpdateProject: (updated: DiscoveryProject) => void;
  onNavigateToView: (view: any) => void;
  onOpenMindMap?: () => void;
}

/** Marca um campo que o usuário ainda não preencheu, em vez de mostrar texto de preenchimento como se fosse conteúdo. */
const NotInformed: React.FC = () => (
  <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontWeight: 400 }}>
    Ainda não informado. Use "Editar Detalhes do Produto" para preencher.
  </span>
);

export const ProjectHubView: React.FC<ProjectHubViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToView,
  onOpenMindMap
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [vision, setVision] = useState(project.prd.valueProposition ?? '');
  const [targetAudience, setTargetAudience] = useState(project.prd.targetAudience ?? '');
  const [northStar, setNorthStar] = useState(project.prd.northStarMetric ?? '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DiscoveryProject = {
      ...project,
      name,
      description: desc,
      prd: {
        ...project.prd,
        valueProposition: vision,
        targetAudience,
        northStarMetric: northStar
      }
    };
    onUpdateProject(updated);
    setIsEditing(false);
  };

  const totalNotes = (project.notes ?? []).length + (project.decisionLog ?? []).length;
  const totalTranscriptSegments = project.sessions.reduce((acc, s) => acc + s.rawTranscript.length, 0);
  const totalMindMapNodes = project.sessions.reduce(
    (acc, s) => acc + s.mindMapNodes.filter(n => n.type !== 'root').length,
    0
  );
  const totalStories = project.epics.reduce(
    (acc, e) => acc + e.features.reduce((fAcc, f) => fAcc + f.userStories.length, 0),
    0
  );

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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Hub do Projeto & Fluxo do PO</h2>
              <span className="badge badge-primary">Iniciativa Ativa</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Memória viva do projeto ➔ Voz/Transcrição ➔ Mapa Mental ➔ Refinar & Higienizar Backlog ➔ PRD.md & SPEC.md
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onNavigateToView('interview')}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            Preencher com Copiloto Entrevistador
          </button>
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
        {/* 5-Step Focused PO Workflow Pipeline */}
        <section
          aria-label="Fluxo principal do PO"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc' }}>
              Fluxo Principal do PO (5 Etapas Conectadas)
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Clique em qualquer etapa para avançar no refinamento
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '10px' }}>
            {/* Step 1: Project Memory */}
            <div
              id="hub-step-memory"
              onClick={() => onNavigateToView('brain_dashboard')}
              className="glass-card"
              style={{ padding: '12px 14px', cursor: 'pointer', border: '1px solid rgba(99, 102, 241, 0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>PASSO 1</span>
                <Brain size={16} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>1. Memória do Projeto</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  Notas, decisões, stakeholders e busca semântica viva ({totalNotes} registros)
                </p>
              </div>
            </div>

            {/* Step 2: Voice / Recording / Transcript */}
            <div
              id="hub-launch-live-room"
              onClick={() => onNavigateToView('live_room')}
              className="glass-card"
              style={{ padding: '12px 14px', cursor: 'pointer', border: '1px solid rgba(244, 63, 94, 0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.18)', color: '#fda4af' }}>PASSO 2</span>
                <Radio size={16} color="#f43f5e" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>2. Voz, Gravação & Transcrição</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  Microfone ao vivo, áudio Whisper ou importar transcrição ({totalTranscriptSegments} falas)
                </p>
              </div>
            </div>

            {/* Step 3: Mind Map Meeting Refinement */}
            <div
              id="hub-step-mindmap"
              onClick={() => (onOpenMindMap ? onOpenMindMap() : onNavigateToView('live_room'))}
              className="glass-card"
              style={{ padding: '12px 14px', cursor: 'pointer', border: '1px solid rgba(168, 85, 247, 0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.18)', color: '#d8b4fe' }}>PASSO 3</span>
                <GitBranch size={16} color="#c084fc" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>3. Mapa Mental (Refinar)</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  Refine assuntos, dores e JTBDs da reunião e envie nós ao Backlog ({totalMindMapNodes} nós)
                </p>
              </div>
            </div>

            {/* Step 4: Create, Refine & Sanitize Backlog */}
            <div
              id="hub-launch-backlog"
              onClick={() => onNavigateToView('backlog')}
              className="glass-card"
              style={{ padding: '12px 14px', cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>PASSO 4</span>
                <Zap size={16} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>4. Criar & Higienizar Backlog</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  Higienize INVEST, Gherkin BDD, tasks de QA e duplicadas ({totalStories} histórias)
                </p>
              </div>
            </div>

            {/* Step 5: Generate PRD.md & SPEC.md */}
            <div
              id="hub-launch-documentation"
              onClick={() => onNavigateToView('documentation')}
              className="glass-card"
              style={{ padding: '12px 14px', cursor: 'pointer', border: '1px solid rgba(6, 182, 212, 0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.18)', color: '#67e8f9' }}>PASSO 5</span>
                <FileText size={16} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>5. Gerar PRD.md & SPEC.md</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                  Documento executivo + Especificação técnica pronta para IA implementar
                </p>
              </div>
            </div>
          </div>
        </section>

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
                {project.description || <NotInformed />}
              </p>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Proposta Única de Valor: </strong>
                {project.prd.valueProposition || <NotInformed />}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Nome do Produto</label>
                <input
                  type="text"
                  aria-label="Nome do Produto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Descrição / Problema</label>
                <textarea
                  rows={2}
                  aria-label="Descrição / Problema"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.9)', color: 'white', fontSize: '0.85rem', resize: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Proposta Única de Valor</label>
                <input
                  type="text"
                  aria-label="Proposta Única de Valor"
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
                {project.prd.northStarMetric || <NotInformed />}
              </p>
            ) : (
              <input
                type="text"
                aria-label="North Star Metric"
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
                {project.prd.targetAudience || <NotInformed />}
              </p>
            ) : (
              <input
                type="text"
                aria-label="Público Alvo"
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

        {/* Row 3: MVP Horizons (Onda 1 MVP vs Onda 2 Escala) */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} /> Sequenciamento do Produto Inicial (Ondas do MVP - Lean Inception)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-emerald">ONDA 1: MVP ESSENCIAL (LANÇAMENTO)</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Primeira entrega</span>
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {project.prd.inScope.slice(0, 3).map((item, idx) => (
                  <li key={idx}><strong>{item}</strong></li>
                ))}
                {project.prd.inScope.length === 0 && (
                  <li style={{ listStyle: 'none', marginLeft: '-16px' }}><NotInformed /></li>
                )}
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
                {project.prd.outOfScope.length === 0 && (
                  <li style={{ listStyle: 'none', marginLeft: '-16px' }}><NotInformed /></li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Secondary link for Automation Discovery */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            id="hub-launch-automation-discovery"
            onClick={() => onNavigateToView('automation_discovery')}
            className="glass-card"
            style={{ flex: '1 1 260px', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(99, 102, 241, 0.35)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Workflow size={18} color="#818cf8" />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>Discovery de IA & Automação (Motor Jev)</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Matriz P×I, 4 Números, árvore determinística/LLM e gerador de épicos</span>
              </div>
            </div>
            <ArrowRight size={15} color="#a5b4fc" />
          </div>
        </div>
      </div>
    </div>
  );
};
