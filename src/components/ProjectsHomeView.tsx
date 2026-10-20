import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Radio,
  Zap,
  ArrowRight,
  Calendar,
  Sparkles,
  Flame,
  Target,
  Layers,
  Brain,
  Upload,
  BookOpen,
  Bot,
  PlayCircle,
  FileText,
  ShieldCheck,
  Rocket,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { DiscoveryProject } from '../types/discovery';

interface ProjectsHomeViewProps {
  projects: DiscoveryProject[];
  onOpenProject: (projectId: string, targetView?: any) => void;
  onCreateProject: (name: string, description: string) => void;
  onImportProject: (jsonString: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onResetAllData?: () => void;
  onNavigateToKnowledge: (view: 'knowledge_hub' | 'agent_studio' | 'brain_dashboard' | 'product_audit') => void;
}

export const ProjectsHomeView: React.FC<ProjectsHomeViewProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onImportProject,
  onDeleteProject,
  onResetAllData,
  onNavigateToKnowledge
}) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSessions = projects.reduce((acc, p) => acc + p.sessions.length, 0);
  const totalEpics = projects.reduce((acc, p) => acc + p.epics.length, 0);
  const totalStories = projects.reduce(
    (acc, p) => acc + p.epics.reduce((eAcc, e) => eAcc + e.features.reduce((fAcc, f) => fAcc + f.userStories.length, 0), 0),
    0
  );
  const totalPains = projects.reduce(
    (acc, p) => acc + p.sessions.reduce((sAcc, s) => sAcc + s.painPoints.length, 0),
    0
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject(name.trim(), description.trim());
    setName('');
    setDescription('');
    setCreating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportProject(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(15, 23, 42, 0.9)',
    color: 'var(--text-main)',
    fontSize: '0.88rem',
    outline: 'none'
  };

  return (
    <div style={{ padding: '4px 0 32px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Banner Executivo */}
      <div
        className="glass-panel animate-slide-down"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="badge badge-primary" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
              Discovery ao Done · Central de Produtos
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Transforme conversas com clientes em backlogs acionáveis
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Escolha um projeto existente ou crie um novo para conduzir novas entrevistas ao vivo com escuta de áudio, mapear mapas mentais, fatiar histórias no padrão INVEST com critérios Given/When/Then e coordenar entregas com copiloto de IA.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
          <button
            id="btn-hero-new-project"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            style={{ padding: '12px 18px', fontSize: '0.9rem', gap: '8px', justifyContent: 'center' }}
          >
            <Plus size={18} /> Novo Projeto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.82rem', gap: '8px', justifyContent: 'center' }}
          >
            <Upload size={15} /> Importar Projeto JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Estatísticas Globais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={22} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{projects.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projetos Ativos</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={22} color="#f43f5e" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalSessions}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reuniões Gravadas</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalPains}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dores Mapeadas</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalStories}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Histórias ({totalEpics} Épicos)</div>
          </div>
        </div>
      </div>

      {/* Guia Arquitetural: Separação Clara entre Gestão de Projetos e Ferramentas do Projeto */}
      <div className="glass-panel" style={{ padding: '22px 24px', border: '1px solid rgba(6, 182, 212, 0.35)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem', fontWeight: 800 }}>ARQUITETURA DE TRABALHO</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Como Funciona a Separação em 2 Ambientes</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '3px' }}>
              Gerencie seus projetos nesta página e entre em qualquer um para ter acesso total a todas as ferramentas com IA
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Passo 1 */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.35)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                1
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 800 }}>Ambiente 1 · Você está aqui</span>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Portal de Gestão de Projetos</h4>
              </div>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: '4px 0 0 0' }}>
              Crie novas iniciativas, importe projetos em JSON e visualize o resumo de dores e épicos cadastrados no seu portfólio.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <button
                onClick={() => setCreating(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.76rem', gap: '6px', width: '100%', justifyContent: 'center' }}
              >
                <Plus size={14} /> + Criar Novo Projeto
              </button>
            </div>
          </div>

          {/* Passo 2 */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.35)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.25)', color: '#67e8f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                2
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#67e8f9', textTransform: 'uppercase', fontWeight: 800 }}>Transição de Página</span>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Entrar no Projeto</h4>
              </div>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: '4px 0 0 0' }}>
              Nos cartões abaixo, clique no botão principal <strong>"Entrar no Projeto & Abrir Ferramentas"</strong> para abrir a área de trabalho dedicada à iniciativa selecionada.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '0.72rem', color: '#67e8f9', background: 'rgba(6, 182, 212, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
              💡 Você pode retornar à Gestão de Projetos a qualquer momento clicando em <strong>[← Gestão de Projetos]</strong>.
            </div>
          </div>

          {/* Passo 3 */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                3
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 800 }}>Ambiente 2 · Dentro do Projeto</span>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Área de Trabalho & Ferramentas</h4>
              </div>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: '4px 0 0 0' }}>
              Ao entrar no projeto, a barra lateral e o cabeçalho ativam todas as ferramentas específicas daquele projeto:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>🎙️ <strong>Gravações ao Vivo:</strong> Transcrição, dores literais e Mom Test</span>
              <span>⚡ <strong>Backlog BDD:</strong> Épicos, Stories Given/When/Then e RICE</span>
              <span>📄 <strong>PRD & SPEC:</strong> Especificações prontas para Cursor/Claude</span>
              <span>🤖 <strong>6 Agentes IA:</strong> PO Copilot, Arquiteto, QA e Git Crawler</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Criação Rápida */}
      {creating && (
        <form onSubmit={submit} className="glass-panel animate-slide-down" style={{ padding: '24px', maxWidth: '680px', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Criar Novo Projeto de Discovery</h3>
          </div>

          {/* Templates Aceleradores */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Selecione um template para preencher automaticamente:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setName('Plataforma de Liquidação & Conciliação Inteligente');
                  setDescription('Eliminar gargalos manuais no fechamento financeiro de lojistas B2B através de conciliação em tempo real e automação de split.');
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer' }}
              >
                💳 Fintech B2B (Conciliação & Lotes)
              </button>
              <button
                type="button"
                onClick={() => {
                  setName('Healthtech: Onboarding Clínico & Prontuário Ágil');
                  setDescription('Reduzir tempo de anamnese e eliminar abandono de médicos especialistas na prescrição digital.');
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer' }}
              >
                🏥 Healthtech (Prontuário Médico)
              </button>
              <button
                type="button"
                onClick={() => {
                  setName('E-commerce: Logística Reversa & Trocas Automáticas');
                  setDescription('Eliminar 12 dias de espera do consumidor em trocas e reduzir custos de SAC em 45%.');
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer' }}
              >
                📦 E-commerce (Logística Reversa)
              </button>
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setDescription('');
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer' }}
              >
                ⚡ Projeto em Branco (Customizado)
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="input-project-name" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Nome do Projeto / Iniciativa
            </label>
            <input
              id="input-project-name"
              autoFocus
              required
              placeholder="Ex: Aplicativo de agendamento para clínicas"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="input-project-description" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Objetivo / Desafio de Negócio
            </label>
            <textarea
              id="input-project-description"
              rows={3}
              placeholder="Ex: Reduzir o tempo que a recepção gasta confirmando consultas por telefone..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
              <Plus size={16} /> Criar e Começar Trabalho
            </button>
          </div>
        </form>
      )}

      {/* Seção Principal: Meus Projetos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={20} color="var(--accent-cyan)" />
              Seus Projetos de Discovery & Delivery
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Selecione onde você deseja trabalhar com novas reuniões, fatiamento de backlog ou copiloto de IA:
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onResetAllData && projects.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Apagar TODOS os projetos deste navegador? Isso não pode ser desfeito. Exporte um backup em JSON antes, se precisar.')) {
                    onResetAllData();
                  }
                }}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  gap: '6px',
                  color: '#f43f5e',
                  borderColor: 'rgba(244, 63, 94, 0.35)',
                  background: 'rgba(244, 63, 94, 0.08)'
                }}
                title="Apaga todos os projetos e reuniões deste navegador, deixando o app vazio"
              >
                <Trash2 size={14} />
                Apagar todos os projetos
              </button>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
            <FolderOpen size={44} color="var(--accent-cyan)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Nenhum projeto cadastrado</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 20px auto' }}>
              Comece criando o seu primeiro projeto: descreva o objetivo, cadastre as pessoas envolvidas, marque reuniões e monte o backlog a partir do que ouvir.
            </p>
            <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ gap: '8px', margin: '0 auto' }}>
              <Plus size={16} /> Criar Meu Primeiro Projeto
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
            {projects.map(p => {
              const stories = p.epics.reduce((n, e) => n + e.features.reduce((m, f) => m + f.userStories.length, 0), 0);
              const pains = p.sessions.reduce((n, s) => n + s.painPoints.length, 0);
              const updated = new Date(p.updatedAt);

              return (
                <div
                  key={p.id}
                  id={`project-card-${p.id}`}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    transition: 'all .2s ease'
                  }}
                >
                  {/* Cabeçalho do Card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FolderOpen size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{p.name}</h3>
                        {!isNaN(updated.getTime()) && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} /> Atualizado em {updated.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Tem certeza que deseja excluir o projeto "${p.name}"?`)) {
                            onDeleteProject(p.id);
                          }
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '6px', color: '#f43f5e', opacity: 0.6 }}
                        title="Excluir este projeto"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                {/* Descrição */}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45, minHeight: '2.9em' }}>
                  {p.description.length > 150 ? p.description.slice(0, 150) + '…' : p.description}
                </p>

                {/* Badges de Indicadores */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <span className="badge badge-primary" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                    <Radio size={12} /> {p.sessions.length} reuniões
                  </span>
                  <span className="badge badge-primary" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                    <Zap size={12} /> {p.epics.length} épicos · {stories} histórias
                  </span>
                  <span className="badge badge-primary" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                    <Flame size={12} color="#f43f5e" /> {pains} dores
                  </span>
                </div>

                {/* Botões de Ação Direta no Projeto */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                  <button
                    id={`btn-enter-project-${p.id}`}
                    onClick={() => onOpenProject(p.id, 'project_hub')}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      gap: '8px',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                      boxShadow: '0 0 16px rgba(6, 182, 212, 0.3)',
                      cursor: 'pointer'
                    }}
                  >
                    <Rocket size={16} />
                    <span>Entrar no Projeto & Abrir Ferramentas ➔</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Criado com Discovery ao Done
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const json = JSON.stringify(p, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', gap: '4px', color: 'var(--text-dim)' }}
                      title="Exportar backup completo deste projeto em JSON"
                    >
                      <Upload size={12} style={{ transform: 'rotate(180deg)' }} /> Exportar JSON
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  );
};
