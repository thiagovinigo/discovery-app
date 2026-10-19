import type { JTBDItem, LiveQuestionSuggestion, MindMapNode, PainPoint, UserFlowStep } from '../../types/discovery';
import type { AnalysisResponse } from './types';

// Enhanced heuristic engine for rich real-time extraction across any domain
export function heuristicAnalysis(text: string): AnalysisResponse {
  const lower = text.toLowerCase();
  const questions: LiveQuestionSuggestion[] = [];
  const painPoints: PainPoint[] = [];
  const jtbds: JTBDItem[] = [];
  const mindMapNodes: MindMapNode[] = [];
  const userFlowSteps: UserFlowStep[] = [];

  const nowTimestamp = new Date().toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' });
  const cleanQuote = text.replace(/^(Usuário|Entrevistador|Stakeholder|PM)[\s\w()]*:\s*/i, '').replace(/["']/g, '').trim();

  // 1. Detecção de Tempo & Atraso (Horas, Dias, Espera, Lentidão)
  if (/(hora|horas|dia|dias|semana|semanas|tempo|demora|demorado|lento|lentidão|atraso|atrasa|espera|gargalo|fila)/i.test(lower)) {
    questions.push({
      id: 'hq-time-' + Date.now(),
      question: 'Quando essa demora acontece, qual é o impacto no restante da operação e quem fica bloqueado?',
      reason: 'The Mom Test: rastrear o efeito cascata do tempo perdido no fluxo de valor.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-time-' + Date.now(),
      description: 'Lentidão e gargalo de tempo que atrasam o ciclo de entrega para o cliente final.',
      severity: 'high',
      quote: cleanQuote.slice(0, 120),
      frequencyScore: 4
    });
    mindMapNodes.push({
      id: 'hm-time-' + Date.now(),
      label: 'Gargalo de Tempo & Demora',
      type: 'pain',
      x: 190 + (Math.random() * 40 - 20),
      y: 150 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
    userFlowSteps.push({
      id: 'hs-time-' + Date.now(),
      stepNumber: 2,
      title: 'Espera & Processamento Lento',
      actor: 'Operação / Sistema',
      systemAction: 'Aguardando liberação ou processamento demorado',
      frictionLevel: 'critical',
      painPointDetected: 'Gargalo de tempo'
    });
  }

  // 2. Detecção de Planilha, Excel, CSV ou Trabalho Manual
  if (/(planilha|excel|csv|manual|manualmente|digitar|mão|papel|copiar|colar|conferência|conferir)/i.test(lower)) {
    questions.push({
      id: 'hq-manual-' + Date.now(),
      question: 'Quantas pessoas se envolvem nessa conferência manual e o que acontece se alguém errar uma linha?',
      reason: 'Quantificação do risco operacional e custo oculto de retrabalho.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-manual-' + Date.now(),
      description: 'Dependência de conferência manual e planilhas sujeitas a falha humana e retrabalho.',
      severity: 'high',
      quote: cleanQuote.slice(0, 120),
      frequencyScore: 5
    });
    mindMapNodes.push({
      id: 'hm-manual-' + Date.now(),
      label: 'Dependência de Planilhas',
      type: 'pain',
      x: 180 + (Math.random() * 40 - 20),
      y: 330 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
    jtbds.push({
      id: 'hj-manual-' + Date.now(),
      context: 'Ao consolidar os dados da operação',
      job: 'Substituir conferência manual por importação e validação instantânea',
      outcome: 'Para eliminar horas de retrabalho e zerar divergências',
      frequency: 'Relato em discovery'
    });
  }

  // 3. Detecção de Erros, Travas, Bugs, Divergências e Inconsistências
  if (/(trava|travou|erro|falha|bug|diferen|divergência|diverge|centavo|quebra|rejeição|problema|inconsistente)/i.test(lower)) {
    questions.push({
      id: 'hq-error-' + Date.now(),
      question: 'Na última vez que travou ou deu erro, qual foi a gambiarra exata que vocês fizeram para não parar tudo?',
      reason: 'The Mom Test: identificar o comportamento de contorno (workaround) que prova a dor real.',
      category: 'mom_test',
      asked: false,
      timestamp: nowTimestamp
    });
    painPoints.push({
      id: 'hp-error-' + Date.now(),
      description: 'Interrupção do fluxo por divergências ou inconsistências que paralisam o processo.',
      severity: 'high',
      quote: cleanQuote.slice(0, 120),
      frequencyScore: 4
    });
    mindMapNodes.push({
      id: 'hm-error-' + Date.now(),
      label: 'Falhas & Travamento do Fluxo',
      type: 'pain',
      x: 230 + (Math.random() * 40 - 20),
      y: 240 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
  }

  // 4. Detecção de Custos, Dinheiro, Perdas, Taxas e Prejuízo
  if (/(dinheiro|custo|custos|perda|perdemos|prejuízo|gasto|taxa|multa|estorno|chargeback|valor|faturamento)/i.test(lower)) {
    questions.push({
      id: 'hq-cost-' + Date.now(),
      question: 'Você consegue estimar quanto dinheiro a empresa já perdeu ou deixou de ganhar por causa dessa falha?',
      reason: 'Quantificação financeira para cálculo de ROI e priorização no backlog.',
      category: 'quantification',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-cost-' + Date.now(),
      label: 'Impacto Financeiro Direto',
      type: 'pain',
      x: 380 + (Math.random() * 40 - 20),
      y: 110 + (Math.random() * 40 - 20),
      color: '#f43f5e'
    });
  }

  // 5. Detecção de Clientes, Lojistas, Suporte e Insatisfação
  if (/(cliente|clientes|usuário|usuários|lojista|lojistas|suporte|sac|reclamação|reclamam|furioso|insatisfeito|churn|cancelar)/i.test(lower)) {
    questions.push({
      id: 'hq-customer-' + Date.now(),
      question: 'O cliente já chegou a ameaçar cancelar ou buscar o concorrente por causa disso?',
      reason: 'Validação de risco de Churn e urgência da solução na percepção do usuário.',
      category: 'risk_validation',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-cust-' + Date.now(),
      label: 'Atrito com o Cliente',
      type: 'opportunity',
      x: 620 + (Math.random() * 40 - 20),
      y: 170 + (Math.random() * 40 - 20),
      color: '#8b5cf6'
    });
    jtbds.push({
      id: 'hj-cust-' + Date.now(),
      context: 'Durante a experiência de uso do cliente',
      job: 'Receber confirmação imediata e status transparente da transação',
      outcome: 'Para manter total confiança e não precisar abrir chamados de suporte',
      frequency: 'Ponto focal em discovery'
    });
  }

  // 6. Detecção de Desejo de Solução / Feature ("queria um botão", "precisamos de tela", etc.)
  if (/(queria|gostaria|se tivesse|precisamos|botão|tela|dashboard|notificação|funcionalidade|recurso)/i.test(lower)) {
    questions.push({
      id: 'hq-solution-' + Date.now(),
      question: 'Se não pudéssemos construir isso agora, qual seria a alternativa mínima aceitável para resolver o problema hoje?',
      reason: 'Desafiar soluções prematuras para entender a real necessidade de negócio por trás do pedido.',
      category: 'premature_solution',
      asked: false,
      timestamp: nowTimestamp
    });
    mindMapNodes.push({
      id: 'hm-sol-' + Date.now(),
      label: 'Demanda de Automação',
      type: 'solution',
      x: 420 + (Math.random() * 40 - 20),
      y: 390 + (Math.random() * 40 - 20),
      color: '#06b6d4'
    });
  }

  // 7. Universal Topic Extractor (Garante que QUALQUER fala adicione nó e gere pergunta rica)
  if (mindMapNodes.length === 0) {
    // Extrai palavras substantivas (> 3 letras que não sejam stopwords comuns)
    const stopWords = new Set(['para', 'como', 'mais', 'isso', 'esse', 'essa', 'este', 'esta', 'muito', 'tudo', 'onde', 'quando', 'quem', 'qual', 'pelo', 'pela', 'sobre', 'está', 'estava', 'fazer', 'vamos', 'você', 'eles', 'elas', 'nossa', 'nosso', 'minha', 'meu', 'pode', 'hoje']);
    const meaningfulWords = cleanQuote
      .split(/\s+/)
      .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ''))
      .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));

    const topicLabel = meaningfulWords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Processo Operacional';

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
      question: 'E por que isso é tão crítico para a estratégia da sua área neste momento do ano?',
      reason: '5 Porquês: conectar o detalhe operacional ao objetivo estratégico da liderança.',
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

/** Backlog de exemplo usado quando não há chave de API ou a IA falha. */
export function mockBacklogAndPRD(projectContext: string) {
  return {
    okrs: [
      {
        id: 'okr-gen-' + Date.now(),
        objective: 'Eliminar fricção operacional e acelerar o ciclo de entrega de valor para o cliente',
        keyResults: [
          {
            id: 'kr-1',
            description: 'Redução do tempo total de processamento da tarefa',
            baseline: '4 horas',
            target: '< 10 minutos',
            current: '4 horas'
          },
          {
            id: 'kr-2',
            description: 'Taxa de sucesso na primeira tentativa (First-Time Right)',
            baseline: '62%',
            target: '98%',
            current: '62%'
          }
        ]
      }
    ],
    epics: [
      {
        id: 'epic-gen-1',
        title: 'ÉPICO 01: Automação Inteligente do Fluxo Crítico',
        objective: 'Substituir etapas manuais propensas a erro por processamento resiliente orientado a eventos.',
        businessValue: 'Economia direta de horas da equipe e satisfação do cliente final.',
        targetDate: 'Sprint 1 a 3',
        status: 'ready_for_dev' as const,
        features: [
          {
            id: 'feat-gen-1',
            epicId: 'epic-gen-1',
            title: 'Validação e Tolerância Automática de Inconsistências',
            description: 'Regra de negócio configurável para aprovação com limites de segurança.',
            valueProposition: 'Evita travar lotes de dados por divergências secundárias.',
            effort: 'M' as const,
            riceScore: { reach: 500, impact: 3, confidence: 90, effort: 2, total: 675 },
            userStories: [
              {
                id: 'us-gen-1',
                featureId: 'feat-gen-1',
                title: 'Definir parâmetros de tolerância no fluxo',
                asA: 'Gestor Operacional',
                iWantTo: 'configurar regras de aprovação automática para microdivergências',
                soThat: 'o processo continue sem paralisar o atendimento',
                storyPoints: 5,
                acceptanceCriteria: [
                  {
                    id: 'ac-gen-1',
                    scenario: 'Processamento dentro da tolerância',
                    given: 'que uma inconsistência menor que o teto aprovado ocorre',
                    when: 'o sistema processa a transação',
                    then: 'o fluxo segue normalmente com log de auditoria registrado.'
                  }
                ],
                tasks: [
                  { id: 'task-gen-1', title: 'Criar engine de avaliação de regras de tolerância', type: 'backend' as const, status: 'todo' as const, estimatedHours: 8 },
                  { id: 'task-gen-2', title: 'Interface visual de configuração com validação', type: 'frontend' as const, status: 'todo' as const, estimatedHours: 6 }
                ]
              }
            ]
          }
        ]
      }
    ],
    prd: {
      id: 'prd-gen-' + Date.now(),
      title: `PRD: ${projectContext || 'Iniciativa de Produto Baseada em Discovery'}`,
      version: '1.0.0 (Gerado via Discovery ao Done)',
      lastUpdated: new Date().toLocaleDateString('pt-BR'),
      problemStatement: 'Identificou-se forte gargalo operacional e insatisfação de usuários durante as etapas de discovery.',
      targetAudience: 'Operação, Gestores e Usuários Finais.',
      valueProposition: 'Automação resiliente com 90% de ganho de eficiência e visibilidade completa.',
      inScope: [
        'Engine de regras de negócio automatizadas',
        'Dashboard de controle e auditoria',
        'Notificações em tempo real'
      ],
      outOfScope: ['Integrações com sistemas legados descontinuados'],
      successMetrics: ['Redução de 80% nos chamados de suporte', 'Tempo de ciclo < 15 min'],
      assumptions: ['Usuários possuem acesso estável à internet'],
      risksAndMitigations: [
        { risk: 'Resistência à mudança por parte dos operadores', mitigation: 'Treinamento guiado interativo no produto' }
      ]
    }
  };
}
