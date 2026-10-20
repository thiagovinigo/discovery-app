import React from 'react';
import {
  Home,
  Rocket,
  Brain,
  Radio,
  Zap,
  FileText,
  BookOpen,
  Bot,
  History,
  Scissors,
  Sparkles,
  ShieldCheck,
  GitBranch,
  ArrowLeft,
  CalendarClock,
  MessageCircle,
  NotebookPen,
  Users
} from 'lucide-react';

export type AppView =
  | 'projects'
  | 'project_hub'
  | 'brain_dashboard'
  | 'live_room'
  | 'meetings'
  | 'backlog'
  | 'documentation'
  | 'refine'
  | 'po_space'
  | 'product_audit'
  | 'knowledge_hub'
  | 'agent_studio'
  | 'stakeholders'
  | 'interview'
  | 'notes'
  | 'agenda';

interface SidebarProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
  transcriptCount: number;
  epicCount: number;
  sessionCount: number;
  stakeholderCount?: number;
  noteCount?: number;
  upcomingMeetingCount?: number;
  projectName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onChange,
  transcriptCount,
  epicCount,
  sessionCount,
  stakeholderCount = 0,
  noteCount = 0,
  upcomingMeetingCount = 0,
  projectName
}) => {
  type Item = { id: AppView; label: string; icon: React.ReactNode; badge?: string; highlight?: boolean };

  const groups: { step: string; title: string; items: Item[] }[] = [
    {
      step: 'ETAPA 1',
      title: 'Setup & Visão Geral',
      items: [
        { id: 'project_hub', label: 'Hub do Projeto (Visão)', icon: <Rocket size={16} />, highlight: true },
        { id: 'stakeholders', label: 'Stakeholders', icon: <Users size={16} />, badge: stakeholderCount > 0 ? `${stakeholderCount}` : undefined },
        { id: 'notes', label: 'Anotações', icon: <NotebookPen size={16} />, badge: noteCount > 0 ? `${noteCount}` : undefined },
        { id: 'brain_dashboard', label: 'Segundo Cérebro (C.O.D.E.)', icon: <Brain size={16} /> }
      ]
    },
    {
      step: 'ETAPA 2',
      title: 'Gravações & Discovery',
      items: [
        { id: 'agenda', label: 'Agenda de Reuniões', icon: <CalendarClock size={16} />, badge: upcomingMeetingCount > 0 ? `${upcomingMeetingCount}` : undefined },
        { id: 'live_room', label: 'Gravação & Sala ao Vivo', icon: <Radio size={16} />, badge: transcriptCount > 0 ? `${transcriptCount}` : undefined },
        { id: 'meetings', label: 'Histórico de Entrevistas', icon: <History size={16} />, badge: sessionCount > 0 ? `${sessionCount}` : undefined }
      ]
    },
    {
      step: 'ETAPA 3',
      title: 'Backlog & Refinamento',
      items: [
        { id: 'backlog', label: 'Backlog & Histórias BDD', icon: <Zap size={16} />, badge: epicCount > 0 ? `${epicCount}` : undefined },
        { id: 'refine', label: 'Fatiar & Refinar (SPIDR)', icon: <Scissors size={16} /> },
        { id: 'documentation', label: 'PRD Vivo & SPEC.md (IA)', icon: <FileText size={16} /> }
      ]
    },
    {
      step: 'ETAPA 4',
      title: 'Copiloto de IA & PO',
      items: [
        { id: 'interview', label: 'Copiloto me entrevista', icon: <MessageCircle size={16} /> },
        { id: 'po_space', label: 'Espaço do PO (IA Copilot)', icon: <Sparkles size={16} /> },
        { id: 'product_audit', label: 'Banca Validadora PM/UX', icon: <ShieldCheck size={16} /> }
      ]
    },
    {
      step: 'ETAPA 5',
      title: 'Agentes & Material Git',
      items: [
        { id: 'agent_studio', label: 'Hub de Agentes & Git', icon: <Bot size={16} />, badge: '6 IAs' },
        { id: 'knowledge_hub', label: 'Acervo de Métodos Ágeis', icon: <BookOpen size={16} /> }
      ]
    }
  ];

  return (
    <nav className="sidebar" aria-label="Navegação principal">
      {/* Botão de Saída para Gestão de Projetos */}
      <div style={{ padding: '4px 6px 10px 6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '10px' }}>
        <button
          id="sidebar-btn-back-projects"
          onClick={() => onChange('projects')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
            e.currentTarget.style.color = '#a5b4fc';
          }}
          title="Sair do projeto atual e voltar para Gestão de Projetos"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} />
            <span>Gestão de Projetos</span>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>Sair</span>
        </button>

        {/* Active Project Ribbon */}
        <div style={{ marginTop: '10px', padding: '0 4px' }}>
          <div style={{ fontSize: '0.64rem', color: 'var(--accent-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
            Projeto Ativo:
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {projectName || 'Plataforma de Liquidação'}
          </div>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.title} className="sidebar-group" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              {group.step}
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', fontWeight: 600 }}>
              {group.title}
            </span>
          </div>

          {group.items.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`sidebar-item${activeView === item.id ? ' active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              {item.icon}
              <span className="sidebar-label">{item.label}</span>
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
};
