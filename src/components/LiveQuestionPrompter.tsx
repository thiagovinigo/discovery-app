import React from 'react';
import { LiveQuestionSuggestion } from '../types/discovery';
import {
  HelpCircle,
  CheckCircle,
  Copy,
  Check,
  Target,
  AlertTriangle,
  DollarSign,
  Search,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface LiveQuestionPrompterProps {
  questions: LiveQuestionSuggestion[];
  onMarkAsked: (id: string) => void;
  onTriggerAnalysis?: () => void;
  isAnalyzing?: boolean;
}

export const LiveQuestionPrompter: React.FC<LiveQuestionPrompterProps> = ({
  questions,
  onMarkAsked,
  onTriggerAnalysis,
  isAnalyzing = false
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (category: LiveQuestionSuggestion['category']) => {
    switch (category) {
      case 'mom_test':
        return (
          <span className="badge badge-primary">
            <Target size={12} /> The Mom Test
          </span>
        );
      case 'five_whys':
        return (
          <span className="badge badge-cyan">
            <Search size={12} /> 5 Porquês
          </span>
        );
      case 'quantification':
        return (
          <span className="badge badge-amber">
            <DollarSign size={12} /> Quantificação / Impacto
          </span>
        );
      case 'premature_solution':
        return (
          <span className="badge badge-rose">
            <AlertTriangle size={12} /> Desafio de Solução
          </span>
        );
      case 'risk_validation':
        return (
          <span className="badge badge-emerald">
            <ShieldCheck size={12} /> Validação de Risco
          </span>
        );
      default:
        return (
          <span className="badge badge-primary">
            <HelpCircle size={12} /> Investigação
          </span>
        );
    }
  };

  const activeQuestions = questions.filter(q => !q.asked);
  const askedQuestions = questions.filter(q => q.asked);

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={18} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Copiloto de Perguntas ao Vivo</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mom Test & Investigação tática de discovery</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onTriggerAnalysis && (
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                gap: '5px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#c7d2fe',
                fontWeight: 700
              }}
              title="Analisa a conversa e gera novas perguntas imediatas do Mom Test"
            >
              <Sparkles size={13} color="var(--accent-cyan)" />
              {isAnalyzing ? 'Analisando...' : 'Gerar Perguntas com IA'}
            </button>
          )}
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            {activeQuestions.length} sugeridas
          </span>
        </div>
      </div>

      {/* Questions Stack */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {activeQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Ouvindo a conversa...</p>
            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)', maxWidth: '340px' }}>
              Assim que o entrevistado compartilhar dores ou soluções, novas perguntas do Mom Test aparecerão aqui.
            </p>
            {onTriggerAnalysis && (
              <button
                onClick={onTriggerAnalysis}
                disabled={isAnalyzing}
                className="btn btn-primary"
                style={{ fontSize: '0.76rem', padding: '6px 12px', gap: '6px' }}
              >
                <Sparkles size={13} />
                {isAnalyzing ? 'Analisando...' : 'Gerar Perguntas com base nas falas atuais'}
              </button>
            )}
          </div>
        ) : (
          activeQuestions.map((q) => (
            <div
              key={q.id}
              className="glass-card animate-slide-down"
              style={{
                padding: '12px 14px',
                borderLeft: '4px solid var(--primary)',
                background: 'rgba(15, 23, 42, 0.75)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                {getCategoryBadge(q.category)}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{q.timestamp}</span>
              </div>

              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4', marginBottom: '8px' }}>
                "{q.question}"
              </p>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#a5b4fc' }}>Por que perguntar: </span>
                {q.reason}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => handleCopy(q.id, q.question)}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  title="Copiar texto da pergunta"
                >
                  {copiedId === q.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  {copiedId === q.id ? 'Copiado!' : 'Copiar'}
                </button>

                <button
                  onClick={() => onMarkAsked(q.id)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
                >
                  <CheckCircle size={13} color="var(--accent-emerald)" />
                  Feita!
                </button>
              </div>
            </div>
          ))
        )}

        {/* Asked questions section */}
        {askedQuestions.length > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Perguntas já exploradas ({askedQuestions.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {askedQuestions.map(q => (
                <div
                  key={q.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    fontSize: '0.78rem',
                    color: 'var(--text-dim)',
                    textDecoration: 'line-through',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle size={12} color="var(--accent-emerald)" />
                  <span>{q.question}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
