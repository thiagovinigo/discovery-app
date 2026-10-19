import React, { useState } from 'react';
import { UserFlowStep } from '../types/discovery';
import {
  Workflow,
  Plus,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Cpu
} from 'lucide-react';

interface UserFlowViewProps {
  steps: UserFlowStep[];
  onAddStep: (step: Omit<UserFlowStep, 'id'>) => void;
}

export const UserFlowView: React.FC<UserFlowViewProps> = ({
  steps,
  onAddStep
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [actor, setActor] = useState('Usuário / Operador');
  const [systemAction, setSystemAction] = useState('');
  const [frictionLevel, setFrictionLevel] = useState<'smooth' | 'warning' | 'critical'>('warning');
  const [painPoint, setPainPoint] = useState('');

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddStep({
      stepNumber: steps.length + 1,
      title: title.trim(),
      actor: actor.trim(),
      systemAction: systemAction.trim(),
      frictionLevel,
      painPointDetected: painPoint.trim() ? painPoint.trim() : undefined
    });

    setTitle('');
    setSystemAction('');
    setPainPoint('');
    setShowAddModal(false);
  };

  const getFrictionBadge = (level: UserFlowStep['frictionLevel']) => {
    switch (level) {
      case 'smooth':
        return (
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} /> Fluido
          </span>
        );
      case 'warning':
        return (
          <span className="badge badge-amber">
            <AlertCircle size={12} /> Fricção Moderada
          </span>
        );
      case 'critical':
        return (
          <span className="badge badge-rose">
            <XCircle size={12} /> Gargalo Crítico
          </span>
        );
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '440px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Workflow size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Fluxo do Usuário & Processo Real</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mapeamento das etapas reveladas pelo entrevistado</span>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-secondary"
          style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '5px' }}
        >
          <Plus size={14} />
          Adicionar Etapa
        </button>
      </div>

      {/* Steps Pipeline */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px' }}>
        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Nenhum fluxo mapeado ainda.</p>
            <p style={{ fontSize: '0.75rem' }}>Ao ouvir o entrevistado descrever o processo ou iniciar uma simulação, as etapas aparecerão conectadas aqui.</p>
          </div>
        ) : (
          steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div
                className="glass-card animate-slide-down"
                style={{
                  padding: '14px 16px',
                  borderLeft: `4px solid ${
                    step.frictionLevel === 'critical'
                      ? 'var(--accent-rose)'
                      : step.frictionLevel === 'warning'
                      ? 'var(--accent-amber)'
                      : 'var(--accent-emerald)'
                  }`,
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--text-main)'
                    }}>
                      {step.stepNumber}
                    </span>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>{step.title}</h4>
                  </div>

                  {getFrictionBadge(step.frictionLevel)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <User size={13} color="var(--primary)" />
                    <span><strong>Ator:</strong> {step.actor}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Cpu size={13} color="var(--accent-cyan)" />
                    <span><strong>Ação/Sistema:</strong> {step.systemAction}</span>
                  </div>
                </div>

                {step.painPointDetected && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.78rem',
                    color: '#fda4af'
                  }}>
                    <Flame size={14} color="var(--accent-rose)" />
                    <span><strong>Ponto de Quebra:</strong> "{step.painPointDetected}"</span>
                  </div>
                )}
              </div>

              {idx < steps.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ArrowRight size={13} color="var(--text-dim)" style={{ transform: 'rotate(90deg)' }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Add Step Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-slide-down" style={{ width: '460px', padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Workflow size={18} color="var(--accent-cyan)" />
              Nova Etapa do Fluxo
            </h3>
            <form onSubmit={handleCreateStep}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>
                  Título da Etapa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conciliação de Centavos no Excel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>
                    Ator Responsável
                  </label>
                  <input
                    type="text"
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.9)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>
                    Nível de Fricção
                  </label>
                  <select
                    value={frictionLevel}
                    onChange={(e) => setFrictionLevel(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.9)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="smooth">Fluido (Sem problemas)</option>
                    <option value="warning">Atrito Moderado (Retrabalho)</option>
                    <option value="critical">Gargalo Crítico (Trava tudo)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>
                  Ação do Sistema / Software
                </label>
                <input
                  type="text"
                  placeholder="Ex: Executa busca manual por linhas com divergência"
                  value={systemAction}
                  onChange={(e) => setSystemAction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>
                  Dor ou Gargalo Específico (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lote de 200 lojas fica congelado"
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Salvar Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
