import React, { useState } from 'react';
import { Loader2, MessageCircle, Sparkles } from 'lucide-react';
import type { DiscoveryProject } from '../types/discovery';
import type { AppView } from './Sidebar';
import {
  INTERVIEW_STEPS,
  aiFollowUp,
  interviewProgress,
  nextStep,
  parseListAnswer
} from '../services/interviewService';
import type { InterviewStep } from '../services/interviewService';
import { ROLE_LABELS, parseStakeholderLines } from '../services/stakeholderService';

interface InterviewViewProps {
  project: DiscoveryProject;
  /** O PO confirmou a resposta: a tela grava no projeto. */
  onConfirm: (stepId: string, answer: string) => void;
  onSkip: (stepId: string) => void;
  onNavigateToView: (view: AppView) => void;
}

type Stage = 'answer' | 'followup' | 'review';

/** Onde cada resposta vai parar, dito ao PO antes de gravar. */
const DESTINATIONS: Record<string, string> = {
  problem: 'Problema no PRD',
  audience: 'Público-alvo no PRD',
  value: 'Proposta de valor no PRD',
  northStar: 'North Star no PRD e no Hub do Projeto',
  metrics: 'Métricas de sucesso no PRD',
  stakeholders: 'Lista de Stakeholders',
  scope: 'Escopo no PRD',
  outOfScope: 'Fora do escopo no PRD',
  assumptions: 'Premissas no PRD',
  risks: 'Riscos no PRD'
};

const fieldStyle: React.CSSProperties = {
  width: '100%', minHeight: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.88rem', resize: 'vertical'
};
const bubbleStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.35)'
};

const joinAnswer = (step: InterviewStep, base: string, extra: string): string =>
  `${base.trim()}${step.kind === 'text' ? ' ' : '\n'}${extra.trim()}`;

function Preview({ step, answer }: { step: InterviewStep; answer: string }) {
  if (step.kind === 'text') return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{answer}</p>;
  if (step.kind === 'list') {
    return <ul style={{ margin: 0, paddingLeft: '18px' }}>{parseListAnswer(answer).map(item => <li key={item}>{item}</li>)}</ul>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: '18px' }}>
      {parseStakeholderLines(answer).map(p => (
        <li key={p.name}>{p.role === 'outro' ? p.name : `${p.name} (${ROLE_LABELS[p.role]})`}</li>
      ))}
    </ul>
  );
}

interface StepCardProps {
  step: InterviewStep;
  project: DiscoveryProject;
  onConfirm: (stepId: string, answer: string) => void;
  onSkip: (stepId: string) => void;
}

function StepCard({ step, project, onConfirm, onSkip }: StepCardProps) {
  const [stage, setStage] = useState<Stage>('answer');
  const [draft, setDraft] = useState('');
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [complement, setComplement] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const send = async () => {
    setIsChecking(true);
    const question = await aiFollowUp(step, draft, project);
    setIsChecking(false);
    setFollowUp(question);
    setStage(question ? 'followup' : 'review');
  };

  const addComplement = () => {
    if (complement.trim()) setDraft(joinAnswer(step, draft, complement));
    setComplement('');
    setStage('review');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={bubbleStyle}>
        <strong style={{ display: 'block', fontSize: '0.98rem' }}>{step.question}</strong>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{step.hint}</span>
      </div>

      {stage === 'answer' && (
        <>
          <div>
            <label htmlFor="interview-answer" style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Sua resposta</label>
            <textarea id="interview-answer" value={draft} onChange={e => setDraft(e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!draft.trim() || isChecking} onClick={send} style={{ gap: '6px' }}>
              {isChecking ? <><Loader2 size={14} className="animate-spin" /> Pensando…</> : 'Enviar resposta'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onSkip(step.id)}>Pular esta pergunta</button>
          </div>
        </>
      )}

      {stage === 'followup' && followUp && (
        <>
          <div style={{ ...bubbleStyle, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <strong style={{ fontSize: '0.9rem' }}>{followUp}</strong>
          </div>
          <div>
            <label htmlFor="interview-complement" style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Complemento</label>
            <textarea id="interview-complement" value={complement} onChange={e => setComplement(e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!complement.trim()} onClick={addComplement}>Adicionar e continuar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setStage('review')}>Seguir sem complementar</button>
          </div>
        </>
      )}

      {stage === 'review' && (
        <>
          <section aria-label="Conferência da resposta" style={{ ...bubbleStyle, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
            <h3 style={{ fontSize: '0.84rem', fontWeight: 800, margin: '0 0 6px 0' }}>Entendi assim</h3>
            <Preview step={step} answer={draft} />
            <p style={{ margin: '8px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>Vou salvar em: {DESTINATIONS[step.id]}</p>
          </section>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => onConfirm(step.id, draft)}>Salvar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setStage('answer')}>Editar</button>
          </div>
        </>
      )}
    </div>
  );
}

/** O copiloto entrevista o PO, uma pergunta por vez, e preenche o projeto com o que foi confirmado. */
export const InterviewView: React.FC<InterviewViewProps> = ({ project, onConfirm, onSkip, onNavigateToView }) => {
  const step = nextStep(project);
  const { done, total } = interviewProgress(project);
  const skippedCount = project.interview?.skipped.length ?? 0;

  return (
    <section aria-label="Entrevista do copiloto" style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      <header>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
          <Sparkles size={18} color="var(--primary)" /> Entrevista do copiloto
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Responda no seu ritmo: o copiloto pergunta uma coisa por vez e só salva o que você confirmar. Pode parar e voltar depois.
        </p>
        <progress value={done} max={total} aria-label="Andamento da entrevista" style={{ width: '100%', marginTop: '10px' }} />
      </header>

      {step ? (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700 }}>
            <MessageCircle size={14} />
            <span>{`Pergunta ${done + 1} de ${total}`}</span>
            <span style={{ color: 'var(--text-muted)' }}>· {step.title}</span>
          </div>
          <StepCard key={step.id} step={step} project={project} onConfirm={onConfirm} onSkip={onSkip} />
        </>
      ) : (
        <div style={{ ...bubbleStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Entrevista concluída</h3>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>
            {`${INTERVIEW_STEPS.length - skippedCount} de ${INTERVIEW_STEPS.length} perguntas respondidas`}
            {skippedCount > 0 ? ` e ${skippedCount} puladas.` : '.'} O que você confirmou já está no PRD e na lista de stakeholders.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => onNavigateToView('documentation')}>Ver o PRD</button>
            <button type="button" className="btn btn-secondary" onClick={() => onNavigateToView('stakeholders')}>Ver stakeholders</button>
          </div>
        </div>
      )}
    </section>
  );
};
