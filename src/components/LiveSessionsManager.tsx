import React, { useState } from 'react';
import {
  Radio,
  Plus,
  Layers,
  Calendar,
  Users,
  Edit2,
  Check,
  X,
  Flame,
  MessageSquare,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { MeetingSession, DiscoveryProject } from '../types/discovery';

interface LiveSessionsManagerProps {
  project: DiscoveryProject;
  activeSession: MeetingSession;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (title: string, participants: string[]) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export const LiveSessionsManager: React.FC<LiveSessionsManagerProps> = ({
  project,
  activeSession,
  onSelectSession,
  onCreateSession,
  onRenameSession
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newParticipants, setNewParticipants] = useState('Entrevistador (PM), Usuário / Stakeholder');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState(activeSession.title);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `Sessão de Discovery #${project.sessions.length + 1}`;
    const participants = newParticipants
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    onCreateSession(title, participants.length ? participants : ['Entrevistador (PM)', 'Usuário']);
    setNewTitle('');
    setNewParticipants('Entrevistador (PM), Usuário / Stakeholder');
    setShowCreateModal(false);
  };

  const handleSaveRename = () => {
    if (editingTitleText.trim()) {
      onRenameSession(activeSession.id, editingTitleText.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Barra de Abas de Salas (Pills horizontais) */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '80%' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Radio size={13} color="#f43f5e" /> Salas:
          </span>

          {project.sessions.map((session, idx) => {
            const isActive = session.id === activeSession.id;
            return (
              <button
                key={session.id}
                id={`session-tab-${session.id}`}
                onClick={() => onSelectSession(session.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(6, 182, 212, 0.25))'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isActive ? '#10b981' : 'var(--text-dim)'
                  }}
                />
                <span>{session.title.length > 24 ? session.title.slice(0, 24) + '…' : session.title}</span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: isActive ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#c4b5fd' : 'var(--text-dim)'
                  }}
                >
                  {session.rawTranscript.length} falas
                </span>
              </button>
            );
          })}
        </div>

        {/* Botões de Ação para as Salas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="btn-view-all-sessions"
            onClick={() => setShowAllModal(true)}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.76rem', gap: '5px' }}
            title="Visualizar detalhes de todas as salas"
          >
            <Layers size={13} />
            Visualizar Salas ({project.sessions.length})
          </button>

          <button
            id="btn-create-new-session"
            onClick={() => {
              setNewTitle(`Sessão #${project.sessions.length + 1} - `);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '5px' }}
          >
            <Plus size={14} />
            Nova Sala
          </button>
        </div>
      </div>

      {/* Faixa Informativa da Sala Ativa com Capacidade de Renomear */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.78rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-dim)' }}>Sala Ativa:</span>
          {!isEditingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>{activeSession.title}</strong>
              <button
                onClick={() => {
                  setEditingTitleText(activeSession.title);
                  setIsEditingTitle(true);
                }}
                className="btn btn-ghost"
                style={{ padding: '2px 5px', color: 'var(--text-dim)' }}
                title="Renomear esta sala"
              >
                <Edit2 size={12} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="text"
                value={editingTitleText}
                onChange={e => setEditingTitleText(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: '1px solid var(--primary)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
              <button onClick={handleSaveRename} className="btn btn-primary" style={{ padding: '3px 7px' }}>
                <Check size={12} />
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="btn btn-ghost" style={{ padding: '3px 7px' }}>
                <X size={12} />
              </button>
            </div>
          )}

          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={11} /> {activeSession.date}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={11} /> {activeSession.participants.join(', ')}
          </span>
        </div>

        {/* Métricas rápidas da sala */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={11} color="var(--accent-cyan)" /> {activeSession.rawTranscript.length} falas
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={11} color="#f43f5e" /> {activeSession.painPoints.length} dores
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={11} color="#f59e0b" /> {activeSession.liveQuestions.length} perguntas
          </span>
        </div>
      </div>

      {/* Modal: Criar Nova Sala */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <form
            onSubmit={handleCreateSubmit}
            className="glass-panel animate-slide-down"
            style={{ width: '460px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#f43f5e" />
                Criar Nova Sala de Reunião
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Crie uma sala dedicada para gravar um novo áudio, entrevistar stakeholders ou colar notas de discovery. A sala anterior continuará salva e acessível a qualquer momento.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
                Nome / Título da Sala
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Entrevista com Lojista #4 - Fechamento Mensal"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
                Participantes (separados por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: PM, Designer, Renata (CFO)"
                value={newParticipants}
                onChange={e => setNewParticipants(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', gap: '6px' }}
              >
                <Plus size={14} /> Criar Sala e Iniciar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Visualizar Todas as Salas */}
      {showAllModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="glass-panel animate-slide-down"
            style={{ width: '600px', maxHeight: '80vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-cyan)" />
                  Salas de Reunião do Projeto ({project.sessions.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Alterne para qualquer sala para ver transcrições, mapa mental e dores correspondentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', flex: 1 }}>
              {project.sessions.map((sess, idx) => {
                const isSelected = sess.id === activeSession.id;
                return (
                  <div
                    key={sess.id}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.65)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>#{idx + 1}</span>
                        <strong style={{ fontSize: '0.88rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                          {sess.title}
                        </strong>
                        {isSelected && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Aberta Agora</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span>📅 {sess.date}</span>
                        <span>👥 {sess.participants.join(', ')}</span>
                        <span>💬 {sess.rawTranscript.length} falas</span>
                        <span>🔥 {sess.painPoints.length} dores</span>
                        <span>🎯 {sess.jtbds.length} JTBDs</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectSession(sess.id);
                        setShowAllModal(false);
                      }}
                      className={isSelected ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{ fontSize: '0.78rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    >
                      {isSelected ? 'Já Aberta' : 'Abrir Esta Sala'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                onClick={() => {
                  setShowAllModal(false);
                  setShowCreateModal(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', gap: '6px' }}
              >
                <Plus size={14} /> + Criar Outra Sala
              </button>

              <button
                onClick={() => setShowAllModal(false)}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
