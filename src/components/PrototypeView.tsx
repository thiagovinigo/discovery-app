import React, { useMemo, useState } from 'react';
import { Code2, Download, FileDown, Loader2, Monitor, RefreshCw, Sparkles } from 'lucide-react';
import { exportHtmlToPdf } from '../services/minutesService';
import { buildOfflinePrototype } from '../services/prototypeService';
import type { MeetingSession } from '../types/discovery';

interface PrototypeViewProps {
  session: MeetingSession;
  projectName: string;
  isGenerating: boolean;
  onGenerateOffline: () => void;
  onGenerateAI: () => void;
}

export const PrototypeView: React.FC<PrototypeViewProps> = ({
  session,
  projectName,
  isGenerating,
  onGenerateOffline,
  onGenerateAI
}) => {
  const proto = useMemo(
    () => session.prototype ?? buildOfflinePrototype(session, projectName),
    [session, projectName]
  );
  const [selectedScreenIdx, setSelectedScreenIdx] = useState(0);

  const slug = session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'discovery';

  const handleDownloadHtml = () => {
    if (!proto.html) return;
    const blob = new Blob([proto.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prototipo-${slug}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!proto.html) return;
    exportHtmlToPdf(proto.html, `prototipo_${slug}`);
  };

  if (session.userFlowSteps.length === 0) {
    return (
      <section aria-label="Protótipo da sessão" className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Monitor size={16} color="var(--primary)" /> Protótipo Navegável
        </h3>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          O protótipo é montado a partir das etapas da Jornada e do Story Map. Quando houver etapas mapeadas na conversa, o wireframe navegável entre telas aparecerá aqui automaticamente.
        </p>
      </section>
    );
  }

  const activeScreen = proto.screens[selectedScreenIdx] ?? proto.screens[0];

  return (
    <section aria-label="Protótipo da sessão" className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={15} color="var(--primary)" /> Protótipo Navegável ({proto.screens.length} {proto.screens.length === 1 ? 'tela' : 'telas'})
          </h3>
          <span
            style={{
              display: 'inline-block',
              marginTop: '3px',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              color: proto.source === 'ai' ? '#c4b5fd' : '#fcd34d',
              background: proto.source === 'ai' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(245, 158, 11, 0.14)'
            }}
          >
            {proto.source === 'ai'
              ? 'Alta fidelidade (gerado com IA em quadro sandbox isolado)'
              : 'Wireframe de baixa fidelidade (gerado por regras locais, sem IA)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onGenerateOffline}
            disabled={isGenerating}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            <RefreshCw size={12} /> Atualizar wireframe (sem IA)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onGenerateAI}
            disabled={isGenerating}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Gerar HTML com IA
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadHtml}
            disabled={!proto.html}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            <Download size={12} /> Baixar HTML
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportPdf}
            disabled={!proto.html}
            style={{ fontSize: '0.74rem', padding: '5px 10px', gap: '5px' }}
          >
            <FileDown size={12} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Navegação rápida entre as telas estruturadas do wireframe */}
      {proto.screens.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {proto.screens.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setSelectedScreenIdx(idx)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: idx === selectedScreenIdx ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.05)',
                color: idx === selectedScreenIdx ? '#c4b5fd' : 'var(--text-muted)',
                border: idx === selectedScreenIdx ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent'
              }}
            >
              Tela {sc.stepNumber}: {sc.title}
            </button>
          ))}
        </div>
      )}

      {/* Resumo da especificação da tela selecionada */}
      {activeScreen && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <strong>Tela {activeScreen.stepNumber} ({activeScreen.actor}):</strong> {activeScreen.title} — <span style={{ color: 'var(--text-muted)' }}>{activeScreen.goal}</span>
          </div>
          {activeScreen.errorState && (
            <div style={{ color: '#fda4af' }}>
              <strong>Prevenção de fricção:</strong> {activeScreen.errorState}
            </div>
          )}
          <div style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Code2 size={12} /> Campos: {activeScreen.fields.join(' · ')} | Ação: {activeScreen.primaryAction}
          </div>
        </div>
      )}

      {/* Quadro isolado (sandbox): o HTML da IA ou do wireframe nunca roda fora do sandbox */}
      <div style={{ flex: 1, minHeight: '340px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#0f172a' }}>
        <iframe
          title="Quadro isolado do protótipo"
          sandbox="allow-scripts"
          srcDoc={proto.html}
          style={{ width: '100%', height: '100%', minHeight: '340px', border: 'none' }}
        />
      </div>
    </section>
  );
};
