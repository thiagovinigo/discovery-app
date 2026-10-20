import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { ProjectNote } from '../types/discovery';
import { CLOSING_QUESTIONS } from '../services/meetingCopilotService';
import type { ClosingAnswers } from '../services/meetingCopilotService';

interface SessionClosingPanelProps {
  /** Fechamento já salvo para esta sala, se houver. */
  savedNote?: ProjectNote;
  onSave: (answers: ClosingAnswers) => void;
}

const EMPTY_ANSWERS: ClosingAnswers = { clear: '', open: '', nextAction: '' };

const fieldStyle: React.CSSProperties = {
  width: '100%', minHeight: '56px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.82rem'
};

/** Na sala ao vivo: o copiloto fecha a reunião perguntando o que ficou claro, o que ficou em aberto e a próxima ação. */
export const SessionClosingPanel: React.FC<SessionClosingPanelProps> = ({ savedNote, onSave }) => {
  const [answers, setAnswers] = useState<ClosingAnswers>(EMPTY_ANSWERS);
  const hasAnswer = Object.values(answers).some(value => value.trim());

  return (
    <details className="glass-panel" style={{ padding: '10px 14px' }}>
      <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ClipboardCheck size={15} color="var(--primary)" /> Encerrar reunião com o copiloto
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        {CLOSING_QUESTIONS.map(q => (
          <div key={q.key}>
            <label htmlFor={`closing-${q.key}`} style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>{q.label}</label>
            <textarea id={`closing-${q.key}`} value={answers[q.key]} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} style={fieldStyle} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={!hasAnswer} onClick={() => onSave(answers)}>
            {savedNote ? 'Atualizar fechamento' : 'Salvar fechamento'}
          </button>
          {savedNote && <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Fechamento já salvo em Anotações (etiqueta #fechamento).</span>}
        </div>
      </div>
    </details>
  );
};
