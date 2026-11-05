import type { JTBDItem, LiveQuestionSuggestion, MindMapNode, PainPoint, UserFlowStep } from '../../types/discovery';
import type { AnalysisResponse } from './types';

const STOP_WORDS = new Set([
  'para', 'como', 'mais', 'isso', 'esse', 'essa', 'este', 'esta', 'muito', 'muita', 'tudo', 'onde', 'quando',
  'quem', 'qual', 'pelo', 'pela', 'sobre', 'está', 'estava', 'fazer', 'fazemos', 'vamos', 'você', 'eles',
  'elas', 'nossa', 'nosso', 'minha', 'meu', 'pode', 'hoje', 'ontem', 'sempre', 'toda', 'todo', 'numa', 'num',
  'porque', 'então', 'aqui', 'ali', 'cada', 'outro', 'outra', 'mesmo', 'ainda', 'depois', 'antes'
]);

const cleanSpeakerPrefix = (line: string): string =>
  line.replace(/^(Usuário|Entrevistador|Stakeholder|PM|Entrevistado)[\s\w()/]*:\s*/i, '').replace(/["']/g, '').trim();

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Separa o bloco de falas em frases limpas (sem o rótulo do falante). */
function splitClauses(rawText: string): string[] {
  return rawText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(cleanSpeakerPrefix)
    .map(s => s.replace(/[.!?]+$/, '').trim())
    .filter(Boolean);
}

/** Encontra a última frase que bate no padrão, ou usa a última fala disponível. */
function findClause(clauses: string[], pattern: RegExp, fallback: string): string {
  for (let i = clauses.length - 1; i >= 0; i--) {
    if (pattern.test(clauses[i])) return clauses[i];
  }
  return fallback;
}

/** Extrai de 2 a 4 palavras substantivas da frase para nomear nós ou etapas com os termos reais da conversa. */
function extractKeyPhrase(clause: string, fallback: string): string {
  const words = clause
    .split(/\s+/)
    .map(w => w.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ''))
    .filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return fallback;
  return words
    .slice(0, 4)
    .map(w => capitalize(w.toLowerCase()))
    .join(' ')
    .slice(0, 48);
}

// Motor heurístico offline agnóstico de domínio: extrai dores, JTBDs, nós e etapas a partir das próprias falas
export function heuristicAnalysis(text: string): AnalysisResponse {
  const clauses = splitClauses(text);
  const cleanQuote = clauses.join('. ').trim() || cleanSpeakerPrefix(text);
  const lower = cleanQuote.toLowerCase();

  const questions: LiveQuestionSuggestion[] = [];
  const painPoints: PainPoint[] = [];
  const jtbds: JTBDItem[] = [];
  const mindMapNodes: MindMapNode[] = [];
  const userFlowSteps: UserFlowStep[] = [];

  const nowTimestamp = new Date().toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' });

  // 1. Detecção de Tempo, Espera, Fila ou Atraso
  const timeRegex = /\b(hora|horas|dia|dias|semana|semanas|tempo|demora|demorado|lento|lentidão|atraso|atrasa|espera|gargalo|fila)\b/i;
  if (timeRegex.test(lower)) {
    const clause = findClause(clauses, timeRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Demora no Processo');
    questions.push({
      id: 'hq-time-' + Date.now(),
      question: 'Quando essa demora acontece, qual é o impacto no restante do trabalho e quem fica bloqueado?',
      reason: 'The Mom Test: rastrear o efeito real do tempo perdido no fluxo.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-time-' + Date.now(),
      description: capitalize(clause).slice(0, 120),
      severity: 'high',
      quote: clause.slice(0, 120),
      frequencyScore: 4
    });
    mindMapNodes.push({
      id: 'hm-time-' + Date.now(),
      label: `Demora: ${phrase}`.slice(0, 48),
      type: 'pain',
      x: 190 + (Math.random() * 40 - 20),
      y: 150 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
    userFlowSteps.push({
      id: 'hs-time-' + Date.now(),
      stepNumber: 2,
      title: phrase,
      actor: 'Entrevistado',
      systemAction: capitalize(clause).slice(0, 90),
      frictionLevel: 'critical',
      painPointDetected: capitalize(clause).slice(0, 90)
    });
  }

  // 2. Detecção de Planilha, Trabalho Manual ou Conferência
  const manualRegex = /\b(planilha|planilhas|excel|csv|manual|manualmente|digitar|mão|papel|copiar|colar|conferência|conferir)\b/i;
  if (manualRegex.test(lower)) {
    const clause = findClause(clauses, manualRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Trabalho Manual');
    questions.push({
      id: 'hq-manual-' + Date.now(),
      question: 'Quantas pessoas se envolvem nessa etapa manual e o que acontece quando alguém comete um erro?',
      reason: 'Quantificação do esforço operacional e do retrabalho.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-manual-' + Date.now(),
      description: capitalize(clause).slice(0, 120),
      severity: 'high',
      quote: clause.slice(0, 120),
      frequencyScore: 5
    });
    mindMapNodes.push({
      id: 'hm-manual-' + Date.now(),
      label: `Manual: ${phrase}`.slice(0, 48),
      type: 'pain',
      x: 180 + (Math.random() * 40 - 20),
      y: 330 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
    jtbds.push({
      id: 'hj-manual-' + Date.now(),
      context: `Ao executar ${phrase.toLowerCase()}`,
      job: `Deixar de depender de controle manual: ${capitalize(clause).slice(0, 90)}`,
      outcome: 'Reduzir retrabalho e erros manuais relatados na entrevista',
      frequency: 'Relato em discovery'
    });
  }

  // 3. Detecção de Erros, Travas, Bugs ou Falhas
  const errorRegex = /\b(trava|travou|erro|falha|bug|quebra|rejeição|problema|inconsistente)\b/i;
  if (errorRegex.test(lower)) {
    const clause = findClause(clauses, errorRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Falha Relatada');
    questions.push({
      id: 'hq-error-' + Date.now(),
      question: 'Na última vez que travou ou deu erro, qual foi o contorno exato que vocês fizeram para continuar?',
      reason: 'The Mom Test: identificar o comportamento de contorno (workaround) que comprova a dor.',
      category: 'mom_test',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-error-' + Date.now(),
      description: capitalize(clause).slice(0, 120),
      severity: 'high',
      quote: clause.slice(0, 120),
      frequencyScore: 4
    });
    mindMapNodes.push({
      id: 'hm-error-' + Date.now(),
      label: `Falha: ${phrase}`.slice(0, 48),
      type: 'pain',
      x: 230 + (Math.random() * 40 - 20),
      y: 240 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
  }

  // 4. Detecção de Custos, Perdas ou Multas
  const costRegex = /\b(dinheiro|custo|custos|perda|perdemos|prejuízo|gasto|taxa|multa|estorno|valor|faturamento)\b/i;
  if (costRegex.test(lower)) {
    const clause = findClause(clauses, costRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Custo Relatado');
    questions.push({
      id: 'hq-cost-' + Date.now(),
      question: 'Na última vez que isso aconteceu, qual foi a perda estimada e como vocês chegaram nesse número?',
      reason: 'Quantificação de impacto real para priorização.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-cost-' + Date.now(),
      label: `Impacto: ${phrase}`.slice(0, 48),
      type: 'pain',
      x: 380 + (Math.random() * 40 - 20),
      y: 110 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
  }

  // 5. Detecção de Clientes, Usuários, Suporte ou Reclamação
  const customerRegex = /\b(cliente|clientes|usuário|usuários|lojista|lojistas|paciente|pacientes|aluno|alunos|suporte|sac|reclamação|reclamam|reclama|furioso|insatisfeito|churn|cancelar)\b/i;
  if (customerRegex.test(lower)) {
    const clause = findClause(clauses, customerRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Experiência do Usuário');
    questions.push({
      id: 'hq-customer-' + Date.now(),
      question: 'Qual foi o último caso de reclamação disso? O que a pessoa disse, o que vocês responderam e o que aconteceu depois?',
      reason: 'Validação de risco e urgência na percepção de quem sofre o problema.',
      category: 'risk_validation',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-cust-' + Date.now(),
      label: `Relato: ${phrase}`.slice(0, 48),
      type: 'opportunity',
      x: 620 + (Math.random() * 40 - 20),
      y: 170 + (Math.random() * 40 - 20),
      color: '#8b5cf6'
    });
    jtbds.push({
      id: 'hj-cust-' + Date.now(),
      context: `Quando ocorre ${phrase.toLowerCase()}`,
      job: `Resolver o problema relatado: ${capitalize(clause).slice(0, 90)}`,
      outcome: 'Evitar insatisfação, retrabalho no suporte ou cancelamento',
      frequency: 'Ponto focal em discovery'
    });
  }

  // 6. Detecção de Desejo de Solução / Feature ("queria um botão", "precisamos de tela", etc.)
  const solutionRegex = /\b(queria|gostaria|se tivesse|precisamos|botão|tela|dashboard|notificação|funcionalidade|recurso|aplicativo)\b/i;
  if (solutionRegex.test(lower)) {
    const clause = findClause(clauses, solutionRegex, cleanQuote);
    const phrase = extractKeyPhrase(clause, 'Pedido de Solução');
    questions.push({
      id: 'hq-solution-' + Date.now(),
      question: 'O que vocês fazem hoje para contornar isso? Descreva o passo a passo da última vez e onde deu errado.',
      reason: 'Desafiar soluções prematuras para entender a real necessidade por trás do pedido.',
      category: 'premature_solution',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-sol-' + Date.now(),
      label: `Pedido: ${phrase}`.slice(0, 48),
      type: 'solution',
      x: 420 + (Math.random() * 40 - 20),
      y: 390 + (Math.random() * 40 - 20),
      color: '#06b6d4'
    });
  }

  // 7. Extrator Universal de Tópico (garante que qualquer fala adicione nó e pergunta contextual)
  if (mindMapNodes.length === 0) {
    const topicLabel = extractKeyPhrase(cleanQuote, 'Assunto Relatado');

    mindMapNodes.push({
      id: 'hm-topic-' + Date.now(),
      label: topicLabel.slice(0, 24),
      type: 'opportunity',
      x: 600 + (Math.random() * 40 - 20),
      y: 250 + (Math.random() * 60 - 30),
      color: '#10b981'
    });

    questions.push({
      id: 'hq-topic-' + Date.now(),
      question: `Pode me descrever com detalhes o último caso real em que você vivenciou essa situação de "${topicLabel}"?`,
      reason: 'The Mom Test: buscar fatos concretos do passado recente em vez de opiniões genéricas.',
      category: 'mom_test',
      asked: false,
      timestamp: nowTimestamp
    });
  }

  // 8. Pergunta de 5 Porquês para aprofundamento contínuo
  if (questions.length < 2) {
    questions.push({
      id: 'hq-5w-' + Date.now(),
      question: 'Que decisão, prazo ou meta da sua área foi afetada por isso na última vez? Me dê um exemplo recente.',
      reason: '5 Porquês: conectar o detalhe operacional ao objetivo da área.',
      category: 'five_whys',
      asked: false,
      timestamp: nowTimestamp
    });
  }

  return {
    newQuestions: questions,
    newPainPoints: painPoints,
    newJtbds: jtbds,
    newMindMapNodes: mindMapNodes,
    newUserFlowSteps: userFlowSteps
  };
}

/** Backlog inicial usado quando não há chave de API ou a IA falha. */
export function mockBacklogAndPRD(projectContext: string) {
  const titleContext = projectContext?.trim() || 'Iniciativa de Produto Baseada em Discovery';
  return {
    okrs: [
      {
        id: 'okr-gen-' + Date.now(),
        objective: `Resolver as principais dores mapeadas em ${titleContext}`,
        keyResults: [
          {
            id: 'kr-1',
            description: 'Redução do tempo gasto nas etapas críticas relatadas nas entrevistas',
            baseline: 'A medir',
            target: 'Redução de 50%',
            current: 'A medir'
          },
          {
            id: 'kr-2',
            description: 'Redução de retrabalho e ocorrências manuais no fluxo principal',
            baseline: 'A medir',
            target: 'Zero bloqueios críticos',
            current: 'A medir'
          }
        ]
      }
    ],
    epics: [
      {
        id: 'epic-gen-1',
        title: `ÉPICO 01: Fluxo Principal — ${titleContext.slice(0, 48)}`,
        objective: 'Atender às necessidades prioritárias identificadas nas sessões de discovery.',
        businessValue: 'Eliminação de retrabalho e redução do atrito relatado pelos participantes.',
        targetDate: 'Sprint 1 a 3',
        status: 'discovery' as const,
        features: [
          {
            id: 'feat-gen-1',
            epicId: 'epic-gen-1',
            title: 'Simplificação e Automação da Etapa Crítica',
            description: 'Substituição dos contornos manuais mapeados nas entrevistas por fluxo guiado.',
            valueProposition: 'Evita paradas e retrabalho nas etapas mais frequentes.',
            effort: 'M' as const,
            riceScore: { reach: 100, impact: 3, confidence: 80, effort: 2, total: 120 },
            userStories: [
              {
                id: 'us-gen-1',
                featureId: 'feat-gen-1',
                title: 'Executar etapa principal sem retrabalho manual',
                asA: 'Usuário participante do processo',
                iWantTo: 'concluir a etapa principal com validação clara dos dados necessários',
                soThat: 'eu não precise refazer o trabalho em planilhas ou controles paralelos',
                storyPoints: 5,
                acceptanceCriteria: [
                  {
                    id: 'ac-gen-1',
                    scenario: 'Conclusão do fluxo principal com dados válidos',
                    given: 'que o usuário preencheu as informações obrigatórias da etapa',
                    when: 'ele confirma o envio no sistema',
                    then: 'o registro é salvo imediatamente e o próximo passo é liberado sem conferência manual.'
                  }
                ],
                tasks: [
                  { id: 'task-gen-1', title: 'Implementar regras de validação da etapa principal', type: 'backend' as const, status: 'todo' as const, estimatedHours: 6 },
                  { id: 'task-gen-2', title: 'Construir formulário e feedback visual da etapa', type: 'frontend' as const, status: 'todo' as const, estimatedHours: 6 }
                ]
              }
            ]
          }
        ]
      }
    ],
    prd: {
      id: 'prd-gen-' + Date.now(),
      title: `PRD: ${titleContext}`,
      version: '1.0.0 (Gerado via Discovery ao Done)',
      lastUpdated: new Date().toLocaleDateString('pt-BR'),
      problemStatement: 'Dores operacionais e etapas manuais identificadas durante as sessões de discovery.',
      targetAudience: 'Usuários e stakeholders entrevistados no projeto.',
      valueProposition: 'Redução de retrabalho e visibilidade ponta a ponta do fluxo.',
      inScope: [
        'Fluxo principal mapeado nas entrevistas',
        'Validações automáticas para evitar retrabalho'
      ],
      outOfScope: ['Integrações externas não validadas no discovery'],
      successMetrics: ['Redução no tempo de conclusão da tarefa', 'Queda nas reclamações recorrentes'],
      assumptions: ['Os fluxos relatados nas entrevistas refletem a rotina real da operação'],
      risksAndMitigations: [
        { risk: 'Adoção parcial pelos usuários acostumados ao controle antigo', mitigation: 'Fluxo simples validado com os entrevistados' }
      ]
    }
  };
}
