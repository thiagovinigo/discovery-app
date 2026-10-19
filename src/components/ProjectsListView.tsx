import React, { useState } from 'react';
import { FolderOpen, Plus, Radio, Zap, ArrowRight, Calendar } from 'lucide-react';
import { DiscoveryProject } from '../types/discovery';

interface ProjectsListViewProps {
  projects: DiscoveryProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string) => void;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({ projects, onOpenProject, onCreateProject }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject(name.trim(), description.trim());
    setName('');
    setDescription('');
    setCreating(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(15, 23, 42, 0.9)',
    color: 'var(--text-main)',
    fontSize: '0.88rem',
    outline: 'none'
  };

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 18px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Seus Projetos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Abra um projeto para ouvir reuniões, refinar o backlog e usar os agentes de IA.
          </p>
        </div>
        <button id="btn-new-project" className="btn btn-primary" onClick={() => setCreating(true)} style={{ gap: '6px' }}>
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      {creating && (
        <form onSubmit={submit} className="glass-panel animate-slide-down" style={{ padding: '18px', marginBottom: '18px', maxWidth: '560px' }}>
          <input
            id="input-project-name"
            autoFocus
            required
            placeholder="Nome do projeto / iniciativa"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, marginBottom: '10px' }}
          />
          <textarea
            rows={3}
            placeholder="Objetivo / contexto de descoberta"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: 'none', marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar e abrir</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {projects.map(p => {
          const stories = p.epics.reduce((n, e) => n + e.features.reduce((m, f) => m + f.userStories.length, 0), 0);
          const updated = new Date(p.updatedAt);
          return (
            <button
              key={p.id}
              id={`project-card-${p.id}`}
              onClick={() => onOpenProject(p.id)}
              className="glass-panel"
              style={{
                padding: '18px',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'transform .15s, border-color .15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 800, fontSize: '1rem', flex: 1 }}>{p.name}</span>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4, minHeight: '2.8em' }}>
                {p.description.length > 140 ? p.description.slice(0, 140) + '…' : p.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                <span className="badge badge-primary" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                  <Radio size={11} /> {p.sessions.length} reuniões
                </span>
                <span className="badge badge-primary" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                  <Zap size={11} /> {p.epics.length} épicos · {stories} histórias
                </span>
                {!isNaN(updated.getTime()) && (
                  <span style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} /> {updated.toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
