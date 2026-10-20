import React, { useState } from 'react';
import { ClipboardCheck, Copy, Download, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { minutesToMarkdown } from '../services/minutesService';
import type { MeetingSession } from '../types/discovery';

interface MinutesPanelProps {
  session: MeetingSession;
  /** Gera (ou gera de novo) a ata a partir da conversa. */
  onGenerate: () => void;
  /** Leva o que a reunião trouxe para o backlog, pelo painel de revisão. */
  onGenerateBacklog?: () => void;
  isGeneratingBacklog?: boolean;
}

const COPIED_MS = 2500;

const heading: React.CSSProperties = { margin: '10px 0 4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' };
const list: React.CSSProperties = { margin: 0, paddingLeft: '18px', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 };

const Section: React.FC<{ title: string; items: React.ReactNode[] }> = ({ title, items }) =>
  items.length === 0 ? null : (
    <>
      <h4 style={heading}>{title}</h4>
      <ul style={list}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </>
  );

export const MinutesPanel: React.FC<MinutesPanelProps> = ({ session, onGenerate, onGenerateBacklog, isGeneratingBacklog = false }) => {
  const [copied, setCopied] = useState(false);
  const minutes = session.minutes;

  const markdown = () => (minutes ? minutesToMarkdown(minutes, session) : '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown());
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ata_${session.title.replace(/[^\p{L}\p{N}]+/gu, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Ata da reunião" className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--accent-emerald)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Ata da reunião</h3>
        </div>
        {minutes && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={onGenerate}>
              <RefreshCw size={12} /> Atualizar ata
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={copy}>
              {copied ? <ClipboardCheck size={12} /> : <Copy size={12} />} {copied ? 'Copiado!' : 'Copiar Markdown'}
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={download}>
              <Download size={12} /> Baixar .md
            </button>
          </div>
        )}
      </div>

      {!minutes ? (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Esta reunião ainda não tem ata. Ela reúne participantes, assuntos, decisões, ações com responsável e prazo, perguntas em aberto, dores e jobs, tudo a partir do que foi dito.
          </p>
          <button className="btn btn-primary" style={{ gap: '6px' }} onClick={onGenerate}>
            <Sparkles size={14} /> Gerar ata
          </button>
        </div>
      ) : (
        <>
          <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: 'var(--text-dim)' }}>{minutes.summary}</p>
          {minutes.participants.length > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: '0.76rem' }}><strong>Participantes:</strong> {minutes.participants.join(', ')}</p>
          )}

          {minutes.topics.length > 0 && <h4 style={heading}>Assuntos tratados</h4>}
          {minutes.topics.map(topic => (
            <div key={topic.title} style={{ marginBottom: '4px' }}>
              <strong style={{ fontSize: '0.78rem' }}>{topic.title}</strong>
              <ul style={list}>
                {topic.statements.map((s, i) => <li key={i}><em>{s.speaker}</em> ({s.timestamp}): {s.text}</li>)}
              </ul>
            </div>
          ))}

          <Section title="Decisões" items={minutes.decisions.map(d => `${d.text} — ${d.speaker}`)} />
          {minutes.actionItems.length > 0 && (
            <>
              <h4 style={heading}>Ações combinadas</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}><th>Ação</th><th>Responsável</th><th>Prazo</th></tr>
                </thead>
                <tbody>
                  {minutes.actionItems.map((a, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '4px 6px 4px 0' }}>{a.item}</td><td>{a.owner}</td><td>{a.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <Section title="Perguntas em aberto" items={minutes.openQuestions} />
          <Section title="Dores identificadas" items={minutes.painPoints} />
          <Section title="Jobs a serem feitos" items={minutes.jobs} />

          {onGenerateBacklog && (
            <button className="btn btn-primary" style={{ marginTop: '14px', alignSelf: 'flex-start', gap: '6px' }} disabled={isGeneratingBacklog} onClick={onGenerateBacklog}>
              <Sparkles size={14} /> {isGeneratingBacklog ? 'Gerando backlog...' : 'Gerar backlog desta reunião'}
            </button>
          )}
        </>
      )}
    </section>
  );
};
