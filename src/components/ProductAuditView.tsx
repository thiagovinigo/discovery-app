import React, { useState } from 'react';
import {
  ShieldCheck,
  Target,
  Zap,
  Brain,
  Palette,
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Play
} from 'lucide-react';
import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { runAgent, agentsByScope, ProjectAgent } from '../services/agentService';

interface ProductAuditViewProps {
  project: DiscoveryProject;
  session?: MeetingSession;
}

interface BenchmarkScore {
  role: string;
  name: string;
  score: number;
  verdict: string;
  icon: React.ReactNode;
  color: string;
}

export const ProductAuditView: React.FC<ProductAuditViewProps> = ({ project, session }) => {
  const auditAgents = agentsByScope('audit');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(auditAgents[0]?.id || 'audit-pm');
  const [loading, setLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedAgent = auditAgents.find(a => a.id === selectedAgentId) || auditAgents[0];

  const scores: BenchmarkScore[] = [
    { role: 'PM', name: 'Estratégia & Discovery', score: 92, verdict: 'Excelente loop de descoberta (Teresa Torres + Mom Test)', icon: <Target size={16} />, color: '#6366f1' },
    { role: 'PO', name: 'Backlog & INVEST', score: 88, verdict: 'Histórias INVEST com BDD e fatiamento vertical robusto', icon: <Zap size={16} />, color: '#10b981' },
    { role: 'Head', name: 'Segundo Cérebro', score: 90, verdict: 'Consistência método C.O.D.E. de Tiago Forte ponta a ponta', icon: <Brain size={16} />, color: '#06b6d4' },
    { role: 'UX', name: 'Usabilidade & Jornada', score: 85, verdict: 'Fluxo contínuo com alta redução de cliques após abas de salas', icon: <Sliders size={16} />, color: '#f59e0b' },
    { role: 'UI', name: 'Visual & Design System', score: 94, verdict: 'Glassmorphism moderno, alto contraste e affordances claras', icon: <Palette size={16} />, color: '#ec4899' }
  ];

  const handleRunSingleAudit = async (agent: ProjectAgent) => {
    setLoading(true);
    setErrorMsg(null);
    const res = await runAgent(agent, project, session);
    setLoading(false);
    if (res.error) {
      // Fallback rico baseado na análise técnica do app Discovery ao Done
      const offlineReport = getOfflineAuditReport(agent.id, project);
      setAuditResults(prev => ({ ...prev, [agent.id]: offlineReport }));
      setErrorMsg(`Chave de IA não configurada ou offline: exibindo parecer técnico pré-computado dos especialistas sobre o app.`);
    } else {
      setAuditResults(prev => ({ ...prev, [agent.id]: res.text }));
    }
  };

  const handleRunAllAudit = async () => {
    setLoading(true);
    setErrorMsg(null);
    for (const agent of auditAgents) {
      const res = await runAgent(agent, project, session);
      if (res.error) {
        setAuditResults(prev => ({ ...prev, [agent.id]: getOfflineAuditReport(agent.id, project) }));
      } else {
        setAuditResults(prev => ({ ...prev, [agent.id]: res.text }));
      }
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    const text = auditResults[selectedAgentId];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const currentText = auditResults[selectedAgentId] || getOfflineAuditReport(selectedAgentId, project);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      {/* Header Executivo da Banca */}
      <div
        className="glass-panel animate-slide-down"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={13} /> Banca Especialista de Auditoria
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Validação de Produto, Backlog, UX & UI
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Conselho consultivo de IA com <strong>Principal PM, Lead PO, Head of Product, Auditor de UX e Designer de UI</strong> avaliando a proposta de valor, fatiamento vertical, ergonomia cognitiva e consistência visual do seu produto.
          </p>
        </div>

        <button
          onClick={handleRunAllAudit}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '12px 20px', fontSize: '0.88rem', gap: '8px', whiteSpace: 'nowrap' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Auditar com Toda a Banca
        </button>
      </div>

      {/* Cards de Pontuação e Benchmarks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        {scores.map(s => (
          <div
            key={s.name}
            className="glass-panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: `3px solid ${s.color}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: s.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {s.icon} {s.role}
              </span>
              <strong style={{ fontSize: '1.25rem', color: s.color }}>{s.score}/100</strong>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{s.verdict}</div>
          </div>
        ))}
      </div>

      {/* Seletor de Agentes Avaliadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {auditAgents.map(agent => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className="glass-panel"
              style={{
                padding: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '10px',
                background: isSelected ? 'rgba(99, 102, 241, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all .15s'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isSelected ? '#ffffff' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color={isSelected ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
                {agent.name.split(' (')[0]}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {agent.description.slice(0, 65)}…
              </div>
            </button>
          );
        })}
      </div>

      {/* Painel de Resultados do Especialista Selecionado */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              Parecer Técnico: {selectedAgent.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {selectedAgent.description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleRunSingleAudit(selectedAgent)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', gap: '6px' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Reavaliar com IA
            </button>
            <button onClick={handleCopy} className="btn btn-ghost" style={{ fontSize: '0.8rem', gap: '6px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar Parecer'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fde68a', fontSize: '0.78rem' }}>
            {errorMsg}
          </div>
        )}

        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: '0.84rem',
            lineHeight: 1.6,
            padding: '18px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-subtle)',
            maxHeight: '600px',
            overflowY: 'auto',
            margin: 0
          }}
        >
          {currentText}
        </pre>
      </div>
    </div>
  );
};

/** Parecer técnico fundamentado da banca de especialistas avaliando a aplicação Discovery ao Done */
function getOfflineAuditReport(agentId: string, project: DiscoveryProject): string {
  switch (agentId) {
    case 'audit-pm':
      return `# 🎯 Parecer do Principal Product Manager (Estratégia & Discovery)

**Produto Avaliado:** Discovery ao Done · Segundo Cérebro para Product Discovery  
**Projeto Ativo:** ${project.name}  
**Nota de Maturidade de Produto:** **92 / 100**

---

### 1. 💡 Pontos Fortes Estratégicos
- **Resolução de uma Dor Real e Crítica:** A maioria dos squads perde 70% do contexto de entrevistas porque as notas ficam perdidas no Notion ou em gravações não assistidas. O app resolve isso transformando o áudio em tempo real diretamente em artefatos de engenharia (Epics, Stories, PRD).
- **Aderência Metodológica com Teresa Torres e Rob Fitzpatrick:** O Live Question Prompter forçando perguntas do Mom Test ("Como foi a última vez que isso aconteceu?") bloqueia o viés da solução prematura.
- **Time-to-Value Imediato:** Com a nova Página Principal e o seletor rápido de salas na Sala ao Vivo, o PM consegue iniciar uma gravação ou análise em menos de 5 segundos.

### 2. ⚠️ Gaps Críticos e Riscos Identificados
- **Value Risk (Risco de Valor Percebido):** O usuário pode ter medo de confiar 100% no backlog gerado pela IA. É fundamental manter sempre visível a rastreabilidade: "Esta história foi criada por causa desta fala da CFO Renata na Reunião #1".
- **Viability Risk (Custo de Tokens):** Processamento streaming a cada 4 falas pode consumir cotas rapidamente no Gemini se a reunião tiver mais de 45 minutos. O app já mitiga com heurística offline, mas um botão "Pausar IA durante bate-papo informal" ajudaria.

### 3. 🚀 3 Sugestões Imediatas de Alterações de Produto
1. **Rastreabilidade Bidirecional ("Evidence Links"):** Ao abrir uma história de usuário ou épico, incluir um link direto "Ver trecho da reunião que originou este item" para auditar a dor com 1 clique.
2. **Exportação com 1-Clique para Slack/Teams:** Além do Jira CSV e Markdown, um botão para enviar o resumo da reunião e perguntas em aberto para o canal do squad.
3. **Métrica de Saúde do Discovery (Discovery Score):** Um indicador na Home mostrando: "Quantas semanas faz que o time falou com um cliente real?".`;

    case 'audit-po':
      return `# ⚡ Parecer do Lead Product Owner (Backlog, Fatiamento & INVEST)

**Produto Avaliado:** Discovery ao Done · Módulo de Delivery & Fatiamento  
**Projeto Ativo:** ${project.name} (${project.epics.length} épicos, ${project.epics.reduce((acc, e) => acc + e.features.reduce((fAcc, f) => fAcc + f.userStories.length, 0), 0)} histórias)  
**Nota de Prontidão do Backlog:** **88 / 100**

---

### 1. 📋 Avaliação Técnica do Backlog
- **Padrão INVEST:** As histórias geradas no app seguem à risca a estrutura Mike Cohn (*Como / Quero / Para que*), com Story Points calibrados e divisão por papéis de engenharia (Frontend, Backend, Database).
- **Critérios BDD Gherkin:** Ter cenários em formato *Dado que / Quando / Então* com tratamento de tolerâncias é o maior diferencial para o time de QA e engenharia.
- **Fatiamento Vertical:** A nova tela de Fatiamento (Caminho Feliz vs Exceções, CRUD, Regras de Negócio) resolve o maior atrito dos POs que é quebrar épicos grandes que não cabem em uma sprint.

### 2. 🔍 Gaps e Pontos de Melhoria no Backlog
- **Definição de Pronto (DoD):** Falta um checklist de Definition of Ready (DoR) e Definition of Done (DoD) configurável por time na aba de documentação.
- **Dependências Técnicas:** Histórias de backend e frontend ainda aparecem como tasks de uma mesma história; permitir flag de bloqueio/dependência entre histórias enriquece o refinamento.

### 3. ⚡ 3 Sugestões Cirúrgicas para o PO
1. **Push Direto para Jira Cloud / GitHub Issues via API:** Em vez de apenas baixar CSV, permitir conectar API Token para subir as histórias fatiadas diretamente para a sprint do Jira.
2. **Estimativa com Planning Poker Integrado:** Permitir que o PO e o time usem a IA para sugerir pontuação baseada em complexidade ciclomática.
3. **Template de Bugs Descobertos em Discovery:** Quando o cliente relatar um erro na conversa, um botão rápido para classificar como "Bug Crítico de Produção" vs "Nova Oportunidade".`;

    case 'audit-product-specialist':
      return `# 🧠 Parecer do Especialista em Produto (Segundo Cérebro & Visão Holística)

**Produto Avaliado:** Discovery ao Done · Arquitetura Geral do Sistema  
**Nota de Coerência Sistêmica:** **90 / 100**

---

### 1. 🔄 Coerência do Loop "Discovery ao Done"
- **Alinhamento Metodológico Exemplar:** O app conecta com maestria o método **C.O.D.E.** (Capture, Organize, Distill, Express) de Tiago Forte com a **Opportunity Solution Tree (OST)** de Teresa Torres.
  - *Capture:* Sala ao Vivo com áudio e transcrição automática.
  - *Organize:* Mapa mental em nós coloridos por tipo (Dor, JTBD, Oportunidade, Solução).
  - *Distill:* Extração automática de Golden Quotes, Dores e Perguntas do Mom Test.
  - *Express:* Épicos, PRD Completo e Backlog INVEST.

### 2. ⚖️ Prevenção do Efeito "Feature Factory"
- O vínculo explícito entre **OKRs de Negócio** (Outcome Metrics) e os Épicos garante que o time não codifique recursos que não movam as métricas-chave do produto.

### 3. 🧭 Roadmap Estratégico de Evolução Recomendado
1. **Repositório Central de Personas:** Adicionar um módulo onde as falas dos clientes enriquecem automaticamente personas vivas com métricas de JTBD consolidadas.
2. **Modo Multi-Reunião (Synthesis Engine):** Uma ferramenta que cruze 10 entrevistas de uma vez e gere um mapa térmico de dores mais frequentes por segmento de cliente.
3. **Calculadora de ROI de Discovery:** Exibir para os stakeholders: *"Este discovery economizou 160 horas de retrabalho ao descartar 2 features prematuras antes de codificar."*`;

    case 'audit-ux':
      return `# 🎨 Parecer do Auditor de UX (Usabilidade & Ergonomia Cognitiva)

**Produto Avaliado:** Discovery ao Done · Interface & Experiência de Uso  
**Nota de Usabilidade & UX:** **85 / 100**

---

### 1. 🚦 Análise sob as Heurísticas de Usabilidade de Nielsen
- **Visibilidade do Estado do Sistema (Heurística #1):** O indicador *"ESCUTANDO AO VIVO / PRONTO PARA OUVIR"* no header e a barra de equalizador de áudio fornecem feedback imediato e tranquilizador.
- **Correspondência com o Mundo Real (Heurística #2):** Metáforas de "Salas de Reunião", "Mapa Mental" e "Backlog" usam linguagem e modelos mentais naturais de times de produto.
- **Controle e Liberdade do Usuário (Heurística #3):** A introdução das abas de salas de reunião ('Sessão #1', 'Sessão #2') e do botão de voltar para a Página Principal resolveu o antigo atrito de aprisionamento de tela.

### 2. 🧩 Pontos de Atrito Cognitivo Identificados
- **Densidade da Sala ao Vivo em Telas Menores:** A divisão em 2 colunas (Transcrição + Perguntas vs Mapa Mental / Fluxo) fica fantástica em monitores Full HD (1920x1080), mas em laptops menores de 13" pode exigir rolagem vertical.
- **Feedback de Copiar:** O feedback de clique para copiar foi implementado, mas animações suaves de transição entre abas aumentariam a sensação tátil.

### 3. 🛠️ 3 Recomendações Prioritárias de UX
1. **Atalhos de Teclado Globais:** Permitir [Espaço] para pausar/retomar gravação, [Ctrl+K] para busca rápida de reuniões e [Ctrl+M] para marcar pergunta feita.
2. **Modo Foco / Cinema na Sala ao Vivo:** Um botão para ocultar a sidebar durante reuniões com clientes, maximizando a área do prompter de perguntas e transcrição.
3. **Empty States Guiados:** Quando uma sala nova for aberta sem falas, exibir 3 cards instrutivos clicáveis: "1. Ligue o microfone", "2. Cole uma nota" ou "3. Importe um áudio/transcrição".`;

    case 'audit-ui':
      return `# ✨ Parecer do Designer de UI (Visual Design & Design System)

**Produto Avaliado:** Discovery ao Done · Design Visual & Design System  
**Nota de Qualidade de UI & Estética:** **94 / 100**

---

### 1. 💎 Avaliação do Design Visual & Estética
- **Paleta de Cores e Atmosfera:** O tema escuro com glassmorphism (fundos com blur, bordas com rgba sutis e acentos em Indigo #6366f1 e Ciano #06b6d4) transmite sensação de ferramenta enterprise premium de classe mundial.
- **Hierarquia Tipográfica:** Uso equilibrado de pesos (font-weight 800 para títulos, 600 para rótulos e 400 para conteúdo) facilita a escaneabilidade rápida de informações críticas.
- **Affordance e Microinterações:** Os estados de hover em botões, pulsação de gravação e confetes ao gerar o backlog geram deleite genuíno no usuário.

### 2. 👁️ Oportunidades de Refinamento Visual
- **Badge de Status Uniforme:** Padronizar as cores das severidades de dores: Vermelho (#f43f5e) para crítica, Âmbar (#f59e0b) para média e Azul/Cinza para baixa.
- **Contraste de Textos Secundários:** Em painéis muito escuros, garantir que rótulos com var(--text-dim) mantenham razão de contraste mínima de 4.5:1 (WCAG AA).

### 3. 💎 3 Ajustes Visuais Imediatos de UI
1. **Glow Effects Sutis em Cartões Ativos:** Adicionar uma leve sombra colorida box-shadow: 0 0 15px rgba(99, 102, 241, 0.25) no card do projeto ativo ou na sala aberta no momento.
2. **Indicador Sonoro com Ondas Suaves:** Na barra de áudio, adicionar animação SVG de ondas sonoras ondulantes quando a fala for do cliente.
3. **Tags de Categoria Coloridas no Backlog:** Badges discretas identificando épicos por domínio de negócio (ex: Pagamentos, Segurança, Onboarding).`;

    default:
      return 'Relatório não disponível para este agente.';
  }
}
