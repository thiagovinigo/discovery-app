import React, { useState } from 'react';
import { DiscoveryProject } from '../types/discovery';
import { AppView } from './Sidebar';
import {
  Brain,
  Sparkles,
  Settings,
  FolderOpen,
  Plus,
  Download,
  Share2,
  FileText,
  X,
  CreditCard,
  Heart,
  Package,
  ArrowLeft
} from 'lucide-react';
import { exportService } from '../services/exportService';

interface HeaderProps {
  project?: DiscoveryProject | null;
  projects: DiscoveryProject[];
  activeView?: AppView;
  onNavigate?: (view: AppView) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string) => void;
  onOpenSettings: () => void;
  onGoHome?: () => void;
  isRecording: boolean;
  recordingDuration: number;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  projects,
  activeView,
  onNavigate,
  onSelectProject,
  onCreateProject,
  onOpenSettings,
  onGoHome,
  isRecording,
  recordingDuration
}) => {
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim(), newProjDesc.trim());
    setNewProjName('');
    setNewProjDesc('');
    setShowNewProjModal(false);
  };

  const handleApplyTemplate = (title: string, desc: string) => {
    setNewProjName(title);
    setNewProjDesc(desc);
  };

  const handleExportJira = () => {
    if (!project) return;
    const csv = exportService.exportToJiraCsv(project);
    exportService.downloadFile(csv, `${project.name.toLowerCase().replace(/\s+/g, '_')}_jira_backlog.csv`, 'text/csv');
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    if (!project) return;
    const md = exportService.exportToMarkdown(project);
    exportService.downloadFile(md, `${project.name.toLowerCase().replace(/\s+/g, '_')}_discovery.md`, 'text/markdown');
    setShowExportMenu(false);
  };

  const renderNewProjectModal = () => (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel animate-slide-down" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Novo Projeto de Discovery</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Inicie uma iniciativa nova ou selecione um template acelerador
              </p>
            </div>
          </div>

          <button onClick={() => setShowNewProjModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Quick Chips */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Ou acelere escolhendo um template pronto:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleApplyTemplate(
                'Plataforma de Liquidação & Conciliação Inteligente',
                'Eliminar gargalos manuais no fechamento financeiro de lojistas B2B através de conciliação em tempo real e automação de split.'
              )}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                fontSize: '0.75rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CreditCard size={14} /> Fintech B2B (Conciliação)
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate(
                'Healthtech: Onboarding Clínico & Prontuário Ágil',
                'Reduzir tempo de anamnese e eliminar abandono de médicos especialistas na prescrição digital.'
              )}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                fontSize: '0.75rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Heart size={14} /> Healthtech (Prontuário)
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate(
                'E-commerce: Logística Reversa & Trocas Automáticas',
                'Eliminar 12 dias de espera do consumidor em trocas e reduzir custos de SAC em 45%.'
              )}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fcd34d',
                fontSize: '0.75rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Package size={14} /> E-commerce (Logística)
            </button>

            <button
              type="button"
              onClick={() => {
                setNewProjName('');
                setNewProjDesc('');
              }}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} /> Projeto em Branco
            </button>
          </div>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Nome do Projeto / Produto
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Checkout One-Click para Mobile"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Problema Central a Descobrir / Resolver
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Entender gargalos na conciliação ou conversão de novos usuários..."
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowNewProjModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
            >
              Criar e Iniciar Jornada
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderExportMenu = () => (
    <div
      className="glass-panel animate-slide-down"
      style={{
        position: 'absolute',
        top: '44px',
        right: '70px',
        width: '230px',
        padding: '8px',
        zIndex: 100,
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
      }}
    >
      <button
        onClick={handleExportJira}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontSize: '0.82rem',
          borderRadius: '6px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Share2 size={15} color="var(--accent-cyan)" />
        Jira Cloud (CSV)
      </button>
      <button
        onClick={handleExportMarkdown}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontSize: '0.82rem',
          borderRadius: '6px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <FileText size={15} color="var(--primary)" />
        Relatório de Discovery (.md)
      </button>
    </div>
  );

  // MODO 1: PÁGINA DE GESTÃO DE PROJETOS (Portal do Workspace)
  const isManagementMode = activeView === 'projects' || !project;

  if (isManagementMode) {
    return (
      <header
        className="header-container glass-panel"
        style={{
          margin: '16px 24px 16px 24px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          zIndex: 50
        }}
      >
        {/* Brand & Portal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(99, 102, 241, 0.4)'
          }}>
            <Brain className="animate-brain" size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Discovery ao Done
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px', fontWeight: 700 }}>
                Portal de Gestão de Projetos
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Crie, gerencie ou selecione um projeto abaixo para abrir a área de trabalho com IA
            </p>
          </div>
        </div>

        {/* Management Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <FolderOpen size={15} color="var(--accent-cyan)" />
            <span><strong>{projects.length}</strong> {projects.length === 1 ? 'projeto cadastrado' : 'projetos cadastrados'}</span>
          </div>

          <button
            id="btn-header-new-project"
            onClick={() => setShowNewProjModal(true)}
            className="btn btn-primary"
            style={{
              fontSize: '0.85rem',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.35)',
              fontWeight: 700
            }}
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
            title="Configurações da Chave de API Gemini"
          >
            <Settings size={16} />
          </button>
        </div>

        {showNewProjModal && renderNewProjectModal()}
      </header>
    );
  }

  // MODO 2: ÁREA DE TRABALHO DO PROJETO SELECIONADO
  return (
    <header
      className="header-container glass-panel"
      style={{
        margin: '16px 20px 10px 20px',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 50
      }}
    >
      {/* Top Row: Back to Projects, Active Project Name & Quick Tools */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Left: Back button + Breadcrumb + Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            id="header-btn-back-to-projects"
            onClick={() => onNavigate ? onNavigate('projects') : onGoHome && onGoHome()}
            className="btn btn-secondary"
            style={{
              padding: '7px 14px',
              fontSize: '0.82rem',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.18))',
              border: '1px solid rgba(99, 102, 241, 0.45)',
              color: '#c7d2fe',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Sair da área de trabalho deste projeto e voltar para o Portal de Gestão de Projetos"
          >
            <ArrowLeft size={15} />
            <span>← Gestão de Projetos</span>
          </button>

          <div style={{ height: '22px', width: '1px', background: 'var(--border-subtle)' }} />

          {/* Breadcrumb & Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Projeto:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                id="header-select-active-project"
                value={project.id}
                onChange={(e) => onSelectProject(e.target.value)}
                style={{
                  background: 'rgba(30, 41, 59, 0.95)',
                  color: '#ffffff',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '260px'
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Badge */}
          {isRecording ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              padding: '5px 12px',
              borderRadius: '999px',
              color: '#fda4af',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} className="animate-pulse-glow" />
              <span>ESCUTANDO AO VIVO: {formatTime(recordingDuration)}</span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '4px 10px',
              borderRadius: '999px',
              color: '#6ee7b7',
              fontSize: '0.74rem',
              fontWeight: 600
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>SALA PRONTA</span>
            </div>
          )}
        </div>

        {/* Right: Quick Tools Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <button
            id="btn-header-new-project-in-workspace"
            onClick={() => setShowNewProjModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', gap: '5px' }}
            title="Criar novo projeto"
          >
            <Plus size={14} />
            <span>Novo Projeto</span>
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
          >
            <Download size={14} />
            Exportar
          </button>

          {showExportMenu && renderExportMenu()}

          <button
            onClick={onOpenSettings}
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
            title="Configurações da Chave de API Gemini"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {showNewProjModal && renderNewProjectModal()}
    </header>
  );
};
