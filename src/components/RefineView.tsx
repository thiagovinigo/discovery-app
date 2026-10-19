import React, { useState } from 'react';
import {
  Wrench,
  Scissors,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DiscoveryProject, MeetingSession, UserStory } from '../types/discovery';
import { AgentPanel } from './AgentPanel';
import { runAgent } from '../services/agentService';

interface RefineViewProps {
  project: DiscoveryProject;
  session?: MeetingSession;
  onGoToBacklog: () => void;
  onUpdateProject?: (updated: DiscoveryProject) => void;
}

export const RefineView: React.FC<RefineViewProps> = ({
  project,
  session,
  onGoToBacklog
}) => {
  const [activeTab, setActiveTab] = useState<'slicing' | 'invest' | 'agents'>('slicing');

  // Coleta todas as histórias do projeto
  const allStories: { story: UserStory; epicTitle: string; featureTitle: string }[] = [];
  project.epics.forEach(e => {
    e.features.forEach(f => {
      f.userStories.forEach(s => {
        allStories.push({ story: s, epicTitle: e.title, featureTitle: f.title });
      });
    });
  });

  // Estado do Fatiador de Histórias
  const [selectedStoryId, setSelectedStoryId] = useState<string>(allStories[0]?.story.id || '');
  const [customStoryText, setCustomStoryText] = useState<string>('');
  const [slicingStrategy, setSlicingStrategy] = useState<'workflow' | 'crud' | 'rules' | 'variations'>('workflow');
  const [slicingResult, setSlicingResult] = useState<string | null>(null);
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [slicingError, setSlicingError] = useState<string | null>(null);
  const [copiedSlice, setCopiedSlice] = useState(false);

  const currentSelectedStory = allStories.find(item => item.story.id === selectedStoryId);

  const handleRunSlicing = async () => {
    setIsSlicing(true);
    setSlicingError(null);
    setSlicingResult(null);

    const targetText = customStoryText.trim()
      ? customStoryText
      : currentSelectedStory
      ? `História: "${currentSelectedStory.story.title}"\nComo ${currentSelectedStory.story.asA}, quero ${currentSelectedStory.story.iWantTo}, para que ${currentSelectedStory.story.soThat}.\nCritérios atuais: ${JSON.stringify(currentSelectedStory.story.acceptanceCriteria)}`
      : 'História genérica do fluxo principal do projeto';

    const strategyInstructions = {
      workflow: 'Caminho Feliz vs Caminhos Alternativos e Tratamento de Exceções.',
      crud: 'Operações Incrementais (ex: primeiro criar/visualizar básico, depois editar, depois auditoria/exclusão).',
      rules: 'Regras de Negócio Básicas (MVP com regras padrão) vs Regras Complexas (customizações e tolerâncias).',
      variations: 'Variações de Dados / Canais (ex: primeiro fluxo para formato padrão, depois formatos secundários).'
    }[slicingStrategy];

    const prompt = `Você é um Agile Coach especialista em Fatiamento Vertical de Histórias de Usuário (Vertical Slicing / Richard Lawrence / Humanizing Work).
Seu objetivo é pegar a história/épico abaixo e fatiá-la em 2 a 4 HISTÓRIAS MENORES, INDEPENDENTES e QUE ENTREGAM VALOR DE NEGÓCIO REAL (Princípio INVEST).

ESTRATÉGIA DE FATIAMENTO APLICADA: ${strategyInstructions}

HISTÓRIA A FATIAR:
${targetText}

Para cada fatia gerada, forneça estritamente no padrão:
### [Fatia X] Título conciso da história menor
- **Como** [persona], **eu quero** [ação reduzida de alto valor], **para que** [benefício claro].
- **Story Points Sugeridos:** [1, 2, 3 ou 5 pts]
- **Valor de Negócio:** [Por que essa fatia pode ser entregue isoladamente em produção]
- **Critérios de Aceite Gherkin:**
  \`\`\`gherkin
  Cenário: [Nome do cenário principal]
  Dado que [contexto inicial]
  Quando [ação realizada]
  Então [resultado mensurável esperado]
  \`\`\`
- **Tasks Técnicas Recomendadas:** (Frontend, Backend, Database)`;

    const res = await runAgent({ prompt }, project, session);
    setIsSlicing(false);
    if (res.error) {
      setSlicingError(res.error);
    } else {
      setSlicingResult(res.text);
    }
  };

  const copySlicing = async () => {
    if (!slicingResult) return;
    try {
      await navigator.clipboard.writeText(slicingResult);
      setCopiedSlice(true);
      setTimeout(() => setCopiedSlice(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header com Abas */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={20} color="var(--primary)" />
              Refinamento & Fatiamento de Backlog
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Decomponha histórias grandes em fatias finas de valor (INVEST), detalhe critérios BDD e garanta qualidade antes de puxar para desenvolvimento.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('slicing')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                gap: '6px',
                background: activeTab === 'slicing' ? 'rgba(99, 102, 241, 0.25)' : undefined,
                borderColor: activeTab === 'slicing' ? 'var(--primary)' : undefined,
                color: activeTab === 'slicing' ? '#c4b5fd' : undefined
              }}
            >
              <Scissors size={14} /> Fatiador Vertical de Histórias
            </button>

            <button
              onClick={() => setActiveTab('invest')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                gap: '6px',
                background: activeTab === 'invest' ? 'rgba(16, 185, 129, 0.25)' : undefined,
                borderColor: activeTab === 'invest' ? '#10b981' : undefined,
                color: activeTab === 'invest' ? '#6ee7b7' : undefined
              }}
            >
              <CheckCircle2 size={14} /> Auditoria INVEST ({allStories.length})
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                gap: '6px',
                background: activeTab === 'agents' ? 'rgba(6, 182, 212, 0.25)' : undefined,
                borderColor: activeTab === 'agents' ? 'var(--accent-cyan)' : undefined,
                color: activeTab === 'agents' ? '#67e8f9' : undefined
              }}
            >
              <Sparkles size={14} /> Agentes Especialistas
            </button>
          </div>
        </div>
      </div>

      {/* ABA 1: FATIADOR VERTICAL */}
      {activeTab === 'slicing' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.4fr)', gap: '16px', alignItems: 'start' }}>
          {/* Coluna Configuração de Fatiamento */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scissors size={16} color="var(--primary)" /> Configurar Fatiamento
            </h3>

            {allStories.length > 0 ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Escolher história do backlog atual:
                </label>
                <select
                  value={selectedStoryId}
                  onChange={e => {
                    setSelectedStoryId(e.target.value);
                    setCustomStoryText('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {allStories.map(item => (
                    <option key={item.story.id} value={item.story.id}>
                      [{item.epicTitle.slice(0, 20)}...] {item.story.title} ({item.story.storyPoints || 3} pts)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#fcd34d' }}>
                Nenhuma história cadastrada no backlog ainda. Você pode digitar uma história abaixo ou{' '}
                <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.78rem' }} onClick={onGoToBacklog}>
                  gerar o backlog com IA
                </button>.
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Ou digite uma história/épico grande para fatiar:
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Como lojista, quero conciliar automaticamente todas as vendas de adquirentes e receber alertas de inconsistências..."
                value={customStoryText}
                onChange={e => setCustomStoryText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Estratégia de Fatiamento Vertical:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSlicingStrategy('workflow')}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    padding: '8px',
                    borderColor: slicingStrategy === 'workflow' ? 'var(--primary)' : undefined,
                    background: slicingStrategy === 'workflow' ? 'rgba(99, 102, 241, 0.2)' : undefined
                  }}
                >
                  <strong>Caminho Feliz vs Exceções</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>Fluxo principal primeiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSlicingStrategy('crud')}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    padding: '8px',
                    borderColor: slicingStrategy === 'crud' ? 'var(--primary)' : undefined,
                    background: slicingStrategy === 'crud' ? 'rgba(99, 102, 241, 0.2)' : undefined
                  }}
                >
                  <strong>Fatiamento CRUD</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>Criar/Ver antes de Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSlicingStrategy('rules')}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    padding: '8px',
                    borderColor: slicingStrategy === 'rules' ? 'var(--primary)' : undefined,
                    background: slicingStrategy === 'rules' ? 'rgba(99, 102, 241, 0.2)' : undefined
                  }}
                >
                  <strong>Regras Básicas vs Avançadas</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>MVP sem complexidade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSlicingStrategy('variations')}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    padding: '8px',
                    borderColor: slicingStrategy === 'variations' ? 'var(--primary)' : undefined,
                    background: slicingStrategy === 'variations' ? 'rgba(99, 102, 241, 0.2)' : undefined
                  }}
                >
                  <strong>Variações de Dados</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>Formatos mais frequentes</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleRunSlicing}
              disabled={isSlicing}
              className="btn btn-primary"
              style={{ padding: '10px', fontSize: '0.85rem', gap: '8px', justifyContent: 'center' }}
            >
              {isSlicing ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
              {isSlicing ? 'Fatiando História com IA...' : 'Fatiar em Histórias INVEST Menores'}
            </button>
          </div>

          {/* Coluna Resultado do Fatiamento */}
          <div className="glass-panel" style={{ padding: '20px', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Fatias Verticais Geradas</h3>
              {slicingResult && (
                <button onClick={copySlicing} className="btn btn-ghost" style={{ fontSize: '0.75rem', gap: '4px' }}>
                  {copiedSlice ? <Check size={12} /> : <Copy size={12} />} {copiedSlice ? 'Copiado!' : 'Copiar Tudo'}
                </button>
              )}
            </div>

            {slicingError && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af', fontSize: '0.82rem', marginBottom: '12px' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                {slicingError}
              </div>
            )}

            {isSlicing && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px' }}>
                <Loader2 size={28} className="animate-spin" color="var(--primary)" />
                <span style={{ fontSize: '0.85rem' }}>Analisando fluxo e fatiando em fatias verticais com Given/When/Then...</span>
              </div>
            )}

            {!isSlicing && !slicingResult && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px', textAlign: 'center', padding: '20px' }}>
                <Layers size={32} color="var(--text-dim)" />
                <p style={{ fontSize: '0.82rem', maxWidth: '340px' }}>
                  Selecione uma história ou digite um texto à esquerda e clique em <strong>Fatiar</strong> para receber 2 a 4 fatias finas prontas para sprint.
                </p>
              </div>
            )}

            {slicingResult && !isSlicing && (
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '520px',
                  overflowY: 'auto',
                  margin: 0
                }}
              >
                {slicingResult}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: AUDITORIA INVEST */}
      {activeTab === 'invest' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>
            Checklist de Qualidade INVEST para o Backlog
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
            Histórias bem fatiadas devem ser: <strong>Independent</strong> (independentes), <strong>Negotiable</strong> (negociáveis), <strong>Valuable</strong> (valor claro), <strong>Estimable</strong> (estimáveis), <strong>Small</strong> (pequenas para caber na sprint) e <strong>Testable</strong> (testáveis com critérios Given/When/Then).
          </p>

          {allStories.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma história encontrada. Vá até o Backlog e clique em Gerar Backlog.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allStories.map(({ story, epicTitle, featureTitle }, idx) => {
                const hasCriteria = story.acceptanceCriteria.length > 0;
                const isSmall = (story.storyPoints || 3) <= 5;
                const hasTasks = story.tasks.length > 0;

                return (
                  <div
                    key={story.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>#{idx + 1}</span>
                        <strong style={{ fontSize: '0.9rem' }}>{story.title}</strong>
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                          {story.storyPoints || 3} pts
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {epicTitle} · {featureTitle}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      <strong>Como</strong> {story.asA}, <strong>quero</strong> {story.iWantTo}, <strong>para que</strong> {story.soThat}.
                    </p>

                    {/* Indicadores INVEST */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px', fontSize: '0.72rem' }}>
                      <span style={{ color: hasCriteria ? '#6ee7b7' : '#fda4af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Testable: {hasCriteria ? `${story.acceptanceCriteria.length} critérios BDD` : 'Sem critérios!'}
                      </span>
                      <span style={{ color: isSmall ? '#6ee7b7' : '#fcd34d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Small: {isSmall ? 'Tamanho ideal (≤ 5pts)' : 'Muito grande para 1 sprint (> 5pts)'}
                      </span>
                      <span style={{ color: hasTasks ? '#6ee7b7' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Estimable: {hasTasks ? `${story.tasks.length} tasks mapeadas` : 'Sem tasks de engenharia'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: AGENTES ESPECIALISTAS */}
      {activeTab === 'agents' && (
        <AgentPanel
          scope="backlog"
          title="Agentes Especialistas de Backlog & Refinamento"
          project={project}
          session={session}
          resultMaxHeight={520}
        />
      )}
    </div>
  );
};
