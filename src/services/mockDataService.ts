import { DiscoveryProject, MeetingSession, LiveQuestionSuggestion, MindMapNode, UserFlowStep, Epic, OKR, PRDDocument, LeanCanvas } from '../types/discovery';

export const INITIAL_MOCK_PROJECT: DiscoveryProject = {
  id: 'proj-1',
  name: 'Plataforma de Liquidação & Conciliação Inteligente',
  description: 'Eliminar gargalos manuais no fechamento financeiro de lojistas B2B através de conciliação em tempo real e automação de split.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activeSessionId: 'sess-1',
  sessions: [
    {
      id: 'sess-1',
      title: 'Entrevista de Discovery: Diretor Financeiro (CFO) - Lojas Alpha',
      date: new Date().toLocaleDateString('pt-BR'),
      durationSeconds: 1420,
      participants: ['Carlos PM (Entrevistador)', 'Renata S. (CFO Alpha)', 'Mariana (Tech Lead)'],
      rawTranscript: [
        {
          id: 't-1',
          speaker: 'Entrevistador (PM)',
          text: 'Renata, obrigado pelo tempo. Me conta um pouco: como foi a última vez que vocês fecharam a conciliação mensal dos lojistas?',
          timestamp: '00:15',
          isFinal: true
        },
        {
          id: 't-2',
          speaker: 'Usuário / Stakeholder',
          text: 'Nossa, foi um caos completo. Levamos 4 dias inteiros. Todo dia 30 a gente precisa exportar três planilhas CSV gigantescas dos adquirentes e cruzar na unha no Excel.',
          timestamp: '00:38',
          isFinal: true,
          highlightType: 'pain'
        },
        {
          id: 't-3',
          speaker: 'Entrevistador (PM)',
          text: 'Quatro dias inteiros? O que especificamente mais trava nessa planilha?',
          timestamp: '01:05',
          isFinal: true
        },
        {
          id: 't-4',
          speaker: 'Usuário / Stakeholder',
          text: 'As divergências de centavos e chargebacks que caem sem aviso prévio. Quando dá diferença de R$ 0,05, o sistema trava o lote todo de 200 lojas e ninguém recebe no dia 1º.',
          timestamp: '01:32',
          isFinal: true,
          highlightType: 'pain'
        },
        {
          id: 't-5',
          speaker: 'Usuário / Stakeholder',
          text: 'O que eu queria de verdade era não ter que olhar planilha. Se tivesse uma regra que aprovasse automático divergências menores que R$ 1,00 e avisasse os lojistas por webhook, economizaria 40 horas do meu time.',
          timestamp: '02:10',
          isFinal: true,
          highlightType: 'jtbd'
        }
      ],
      summary: {
        tldr: 'O fechamento financeiro atual consome 4 dias/mês de 3 analistas devido a divergências de centavos em planilhas CSV manuais, gerando atrasos em pagamentos e tickets de suporte furiosos.',
        mainTakeaways: [
          'Fechamento manual em Excel trava lotes inteiros por divergências ínfimas de centavos.',
          'Lojistas ficam sem receber no 1º dia útil gerando 60+ chamados de emergência.',
          'Regra de tolerância configurável (ex: até R$ 1,00) resolveria 85% dos travamentos automáticos.',
          'Notificação proativa (webhook/email) diminuiria a ansiedade do financeiro dos lojistas.'
        ],
        actionItems: [
          { item: 'Mapear layout dos 3 adquirentes principais (Cielo, Stone, Rede)', owner: 'Mariana (Tech Lead)', deadline: 'Sexta-feira' },
          { item: 'Desenhar protótipo de tela de tolerância de divergência e conciliação em lote', owner: 'Carlos PM', deadline: 'Próxima terça' },
          { item: 'Validar com Jurídico e Compliance regra de aprovação de centavos', owner: 'Renata (CFO)', deadline: 'Em 10 dias' }
        ],
        goldenQuotes: [
          { speaker: 'Renata (CFO)', quote: 'Quando dá diferença de R$ 0,05, o sistema trava o lote todo de 200 lojas e ninguém recebe no dia 1º.', context: 'Ao relatar a dor crítica do fechamento mensal' },
          { speaker: 'Renata (CFO)', quote: 'Se tivesse uma regra automática, economizaria 40 horas por mês da minha equipe.', context: 'Quantificação do impacto e valor gerado' }
        ]
      },
      liveQuestions: [
        {
          id: 'q-1',
          question: 'Quanto custa financeiramente para a empresa atrasar esse pagamento para os lojistas em 24h a 48h?',
          reason: 'Quantificação de dano e SLA para calibrar prioridade do Épico',
          category: 'quantification',
          asked: true,
          timestamp: '01:45'
        },
        {
          id: 'q-2',
          question: 'Como a equipe de atendimento lida hoje quando as 200 lojas ligam perguntando do repasse?',
          reason: 'Identificar custos ocultos de suporte e desgaste de marca (JTBD secundário)',
          category: 'mom_test',
          asked: false,
          timestamp: '02:15'
        },
        {
          id: 'q-3',
          question: 'O cliente sugeriu "aprovar divergências menores que R$ 1". Pergunte: se houver 1.000 transações de R$ 0,90 somando R$ 900, o que o compliance exigiria?',
          reason: 'Desafiar solução prematura e identificar regras de segurança/fraude',
          category: 'premature_solution',
          asked: false,
          timestamp: '02:40'
        }
      ],
      painPoints: [
        {
          id: 'p-1',
          description: 'Lotes de pagamentos de centenas de lojas travados por divergências de centavos em planilhas CSV',
          severity: 'high',
          quote: 'Diferença de R$ 0,05 trava o lote todo de 200 lojas',
          frequencyScore: 5
        },
        {
          id: 'p-2',
          description: 'Demora de 4 dias inteiros dedicados unicamente a cruzar planilhas manuais todo final de mês',
          severity: 'high',
          quote: 'Levamos 4 dias inteiros cruzando três planilhas gigantes no Excel',
          frequencyScore: 4
        },
        {
          id: 'p-3',
          description: 'Chargebacks e cancelamentos caem sem aviso prévio e quebram a conciliação programada',
          severity: 'medium',
          quote: 'Chargebacks caem sem aviso prévio',
          frequencyScore: 3
        }
      ],
      jtbds: [
        {
          id: 'j-1',
          context: 'Quando fecho o faturamento no último dia útil do mês',
          job: 'Quero conciliar transações e chargebacks de múltiplos adquirentes automaticamente com tolerância configurável',
          outcome: 'Para que nenhum lojista fique com o repasse retido e meu time não gaste 40 horas em planilhas',
          frequency: '100% dos entrevistados'
        },
        {
          id: 'j-2',
          context: 'Quando ocorre um chargeback inesperado',
          job: 'Quero saber o motivo e a loja de origem instantaneamente',
          outcome: 'Para debitar na fatura correta sem paralisar o lote global de pagamentos',
          frequency: '4/5 entrevistados'
        }
      ],
      mindMapNodes: [
        { id: 'm-root', label: 'Conciliação & Repasse B2B', type: 'root', x: 400, y: 250, color: '#6366f1' },
        { id: 'm-pain-1', label: 'Trava de Lote por Centavos', type: 'pain', x: 180, y: 150, color: '#f43f5e' },
        { id: 'm-pain-2', label: '4 Dias Cruzando CSV Manual', type: 'pain', x: 160, y: 350, color: '#f43f5e' },
        { id: 'm-jtbd-1', label: 'Repasse Pontual no Dia 1º', type: 'jtbd', x: 620, y: 140, color: '#10b981' },
        { id: 'm-jtbd-2', label: 'Eliminar 40h de Esforço Manual', type: 'jtbd', x: 630, y: 360, color: '#10b981' },
        { id: 'm-opp-1', label: 'Motor de Tolerância Configurável', type: 'opportunity', x: 400, y: 80, color: '#8b5cf6' },
        { id: 'm-sol-1', label: 'Conciliador Automático de CSV/API', type: 'solution', x: 400, y: 420, color: '#06b6d4' }
      ],
      mindMapEdges: [
        { id: 'e-1', source: 'm-root', target: 'm-pain-1' },
        { id: 'e-2', source: 'm-root', target: 'm-pain-2' },
        { id: 'e-3', source: 'm-root', target: 'm-jtbd-1' },
        { id: 'e-4', source: 'm-root', target: 'm-jtbd-2' },
        { id: 'e-5', source: 'm-pain-1', target: 'm-opp-1' },
        { id: 'e-6', source: 'm-opp-1', target: 'm-sol-1' }
      ],
      userFlowSteps: [
        {
          id: 'step-1',
          stepNumber: 1,
          title: 'Exportação dos Adquirentes',
          actor: 'Analista Financeiro',
          systemAction: 'Baixa 3 arquivos CSV de Cielo, Stone e Rede',
          frictionLevel: 'smooth'
        },
        {
          id: 'step-2',
          stepNumber: 2,
          title: 'Carga & Cruzamento no Excel',
          actor: 'Analista Financeiro',
          systemAction: 'Executa PROCV e macros manuais para cruzar com pedidos internos',
          frictionLevel: 'warning',
          painPointDetected: 'Planilha trava frequentemente com mais de 50k linhas'
        },
        {
          id: 'step-3',
          stepNumber: 3,
          title: 'Identificação de Centavos e Erros',
          actor: 'CFO / Analista',
          systemAction: 'Busca manual de linhas que não bateram por R$ 0,01 a R$ 0,50',
          frictionLevel: 'critical',
          painPointDetected: 'Lote inteiro de 200 lojas fica congelado até achar a diferença'
        },
        {
          id: 'step-4',
          stepNumber: 4,
          title: 'Aprovação e Envio de Remessa Bancária',
          actor: 'Diretor Financeiro',
          systemAction: 'Gera arquivo CNAB 240 e envia ao Internet Banking',
          frictionLevel: 'warning',
          painPointDetected: 'Atraso de 48h a 72h em relação à data prometida'
        }
      ]
    }
  ],
  okrs: [
    {
      id: 'okr-1',
      objective: 'Reduzir o ciclo de fechamento e repasse financeiro de dias para minutos com zero erro humano',
      keyResults: [
        {
          id: 'kr-1',
          description: 'Tempo médio de conciliação mensal',
          baseline: '4 dias úteis (32 horas)',
          target: '< 15 minutos',
          current: '4 dias úteis'
        },
        {
          id: 'kr-2',
          description: 'Taxa de liquidação no dia prometido (D+0)',
          baseline: '74%',
          target: '99.5%',
          current: '74%'
        },
        {
          id: 'kr-3',
          description: 'Volume de tickets de suporte por divergência de repasse',
          baseline: '68 chamados/mês',
          target: '< 5 chamados/mês',
          current: '68 chamados/mês'
        }
      ]
    }
  ],
  epics: [
    {
      id: 'epic-1',
      title: 'ÉPICO 01: Motor Inteligente de Conciliação e Tolerância de Centavos',
      objective: 'Automatizar o matching de transações financeiras e permitir liquidação de lotes mesmo com variações residuais configuradas.',
      businessValue: 'Destrava 100% dos lotes no 1º dia útil e economiza 40h de esforço da equipe financeira.',
      targetDate: 'Q1 Sprint 3',
      status: 'ready_for_dev',
      features: [
        {
          id: 'feat-1',
          epicId: 'epic-1',
          title: 'Importador Multiformato & Normalizador de Extratos (CNAB/CSV/API)',
          description: 'Interface e background job para upload ou sincronização automática via webhook/SFTP dos principais adquirentes.',
          valueProposition: 'Elimina a necessidade de abrir o Excel para padronizar colunas e formatos de moeda.',
          effort: 'M',
          domain: 'operations',
          riceScore: { reach: 800, impact: 3, confidence: 90, effort: 3, total: 720 },
          userStories: [
            {
              id: 'us-1',
              featureId: 'feat-1',
              title: 'Upload e Parsing automático de arquivos de adquirentes',
              asA: 'Analista de Operações Financeiras',
              iWantTo: 'fazer upload direto de arquivos de extrato ou conectar via API',
              soThat: 'o sistema identifique o layout e processe os dados sem intervenção manual',
              storyPoints: 5,
              domain: 'operations',
              evidenceQuote: {
                speaker: 'Renata S. (CFO Alpha)',
                text: 'Todo dia 30 a gente precisa exportar três planilhas CSV gigantescas dos adquirentes e cruzar na unha no Excel. Levamos 4 dias inteiros.',
                timestamp: '00:38',
                sessionTitle: 'Entrevista de Discovery: Diretor Financeiro (CFO)'
              },
              dorChecklist: [
                { id: 'dor-1', label: 'Problema e persona claramente identificados', checked: true },
                { id: 'dor-2', label: 'Critérios de aceite em formato BDD Gherkin', checked: true },
                { id: 'dor-3', label: 'Layouts dos adquirentes mapeados (Cielo, Stone, Rede)', checked: true },
                { id: 'dor-4', label: 'Estimativa de Story Points calibrada (5 pts)', checked: true }
              ],
              dodChecklist: [
                { id: 'dod-1', label: 'Testes unitários de parser com cobertura > 85%', checked: true },
                { id: 'dod-2', label: 'Tratamento de arquivos corrompidos com log de auditoria', checked: true },
                { id: 'dod-3', label: 'Revisão de código (PR) aprovada por 2 pares', checked: false },
                { id: 'dod-4', label: 'Teste de estresse com 50.000 linhas em Staging', checked: false }
              ],
              acceptanceCriteria: [
                {
                  id: 'ac-1',
                  scenario: 'Upload com sucesso de extrato reconhecido',
                  given: 'que o usuário tem um arquivo CSV da Cielo ou Stone',
                  when: 'ele arrasta o arquivo para a área de importação',
                  then: 'o sistema deve validar o cabeçalho, processar as linhas e exibir resumo de transações importadas com sucesso em até 5 segundos.'
                },
                {
                  id: 'ac-2',
                  scenario: 'Arquivo com formatação corrompida',
                  given: 'que o usuário envia um arquivo sem as colunas obrigatórias',
                  when: 'o parser inicia a leitura',
                  then: 'o sistema deve rejeitar a importação antes de gravar no banco e indicar exatamente as linhas faltantes.'
                }
              ],
              tasks: [
                { id: 'task-1', title: 'Criar parser de CSV streaming com suporte a 100k linhas', type: 'backend', status: 'todo', estimatedHours: 8 },
                { id: 'task-2', title: 'Componente Drag-and-Drop com barra de progresso em tempo real', type: 'frontend', status: 'todo', estimatedHours: 6 },
                { id: 'task-3', title: 'Tabela de auditoria de arquivos importados e logs de erro', type: 'database', status: 'todo', estimatedHours: 4 }
              ]
            }
          ]
        },
        {
          id: 'feat-2',
          epicId: 'epic-1',
          title: 'Regras de Tolerância e Resolução Automática de Divergências',
          description: 'Permite ao CFO configurar threshold de diferença (ex: até R$ 1,00 por lojista) para autoliquidação sem travar o lote global.',
          valueProposition: 'Evita paralisar repasses de centenas de parceiros idôneos por divergências irrisórias.',
          effort: 'S',
          domain: 'checkout',
          riceScore: { reach: 600, impact: 4, confidence: 95, effort: 2, total: 1140 },
          userStories: [
            {
              id: 'us-2',
              featureId: 'feat-2',
              title: 'Configurar teto de tolerância e conta de ajuste contábil',
              asA: 'CFO da empresa',
              iWantTo: 'definir um valor máximo de divergência automática por loja e global',
              soThat: 'o lote seja liberado para pagamento sem travar o financeiro',
              storyPoints: 3,
              domain: 'checkout',
              evidenceQuote: {
                speaker: 'Renata S. (CFO Alpha)',
                text: 'Quando dá diferença de R$ 0,05, o sistema trava o lote todo de 200 lojas e ninguém recebe no dia 1º. Se tivesse uma regra que aprovasse automático divergências menores que R$ 1,00, economizaria 40 horas do meu time.',
                timestamp: '01:32',
                sessionTitle: 'Entrevista de Discovery: Diretor Financeiro (CFO)'
              },
              dorChecklist: [
                { id: 'dor-5', label: 'Regra de negócio validada pelo CFO e Compliance', checked: true },
                { id: 'dor-6', label: 'Critérios BDD com cenário de conta transitória de ajuste', checked: true },
                { id: 'dor-7', label: 'Autenticação com duplo fator para mudança de teto', checked: true }
              ],
              dodChecklist: [
                { id: 'dod-5', label: 'Matching engine validando centavos com tolerância', checked: true },
                { id: 'dod-6', label: 'Lançamentos contábeis auditáveis em tabela imutável', checked: false },
                { id: 'dod-7', label: 'Disparo de webhook para lojistas notificados', checked: false }
              ],
              acceptanceCriteria: [
                {
                  id: 'ac-3',
                  scenario: 'Divergência abaixo da tolerância aprovada',
                  given: 'que o teto configurado é R$ 1,00 e o lote da loja Alpha tem divergência de R$ 0,18',
                  when: 'o motor de conciliação processa o lote',
                  then: 'o repasse é aprovado automaticamente, a diferença de R$ 0,18 é lançada na conta transitória de ajuste e notificação é gerada.'
                }
              ],
              tasks: [
                { id: 'task-4', title: 'Implementar lógica de threshold no matching engine', type: 'backend', status: 'todo', estimatedHours: 6 },
                { id: 'task-5', title: 'Tela de configuração de parâmetros e limites de alçada com 2FA', type: 'frontend', status: 'todo', estimatedHours: 6 }
              ]
            }
          ]
        }
      ]
    }
  ],
  prd: {
    id: 'prd-1',
    title: 'PRD: Motor de Conciliação em Tempo Real & Liquidação sem Fricção',
    version: '1.0.0 (Discovery Validado)',
    lastUpdated: new Date().toLocaleDateString('pt-BR'),
    problemStatement: 'Atualmente o fechamento financeiro de repasses consome 4 dias úteis/mês de 3 analistas seniores. Divergências de centavos travam lotes globais, atrasando repasses de centenas de lojistas, gerando dezenas de chamados e atrito de relacionamento.',
    targetAudience: 'Diretores Financeiros (CFOs), Analistas de Tesouraria/Conciliação e Lojistas B2B credenciados.',
    valueProposition: 'Reduz o tempo de conciliação de 4 dias para 15 minutos, viabiliza repasse em D+0 com 99.5% de pontualidade e automatiza 90% das microdivergências.',
    inScope: [
      'Upload e ingestão de extratos dos adquirentes (Cielo, Stone, Rede)',
      'Algoritmo de matching de transações (ID de autorização, NSU, valor líquido, taxa de MDR)',
      'Parâmetro de tolerância de divergência configurável pelo CFO',
      'Geração de arquivo CNAB 240 para liquidação bancária automatizada',
      'Dashboard com status dos lotes, divergências e logs de auditoria'
    ],
    outOfScope: [
      'Emissão de notas fiscais de serviço municipais (Fase 2)',
      'Antecipação de recebíveis própria com risco de crédito (Fase 3)'
    ],
    successMetrics: [
      'Tempo de fechamento mensal < 30 minutos',
      'Volume de chamados de atraso reduzido em 90%',
      '100% de rastreabilidade e compliance com auditoria'
    ],
    assumptions: [
      'Os arquivos de extrato dos adquirentes possuem identificador único (NSU / TID) consistente.',
      'O departamento jurídico e contábil aprova absorção ou ajuste de diferenças até R$ 1,00.'
    ],
    risksAndMitigations: [
      {
        risk: 'Mudança de layout ou campos sem aviso pelos adquirentes de cartão',
        mitigation: 'Implementar validação de schema antes da execução e fallback com alerta imediato'
      },
      {
        risk: 'Fraude ou acúmulo de microdivergências intencionais',
        mitigation: 'Definir limite cumulativo máximo por lojista no mês (ex: máximo R$ 20,00/mês)'
      }
    ]
  },
  leanCanvas: {
    problem: [
      'Conciliação manual leva 4 dias por mês',
      'Diferença de centavos trava o pagamento de 200 lojas',
      'Chargebacks repentinos quebram o fechamento'
    ],
    existingAlternatives: [
      'Planilhas de Excel com macros manuais',
      'Sistemas de ERP legados e inflexíveis',
      'Resolução reativa via chamado de suporte'
    ],
    customerSegments: [
      'Empresas B2B com marketplaces ou redes de lojistas',
      'CFOs e Gerentes de Operações Financeiras',
      'Lojistas e parceiros que dependem de repasse pontual'
    ],
    earlyAdopters: [
      'Plataformas B2B que processam mais de R$ 5M/mês e sofrem com atrasos no dia 1º'
    ],
    uniqueValueProposition: 'Liquidação pontual no D+0 com conciliação inteligente em minutos e zero paradas por centavos.',
    highLevelConcept: 'O "Stripe Billing" para conciliação e liquidação B2B.',
    solution: [
      'Motor de conciliação automática com tolerância configurável',
      'Ingestão contínua de extratos via API/SFTP',
      'Notificação instantânea de chargebacks e inconsistências'
    ],
    channels: [
      'Indicação de integradores bancários',
      'Comunidades de CFOs e Gestores Financeiros',
      'Vendas B2B diretas para plataformas de e-commerce'
    ],
    revenueStreams: [
      'Mensalidade SaaS por volume de transações conciliadas (Tiered Pricing)',
      'Taxa por lote liquidado com sucesso'
    ],
    costStructure: [
      'Infraestrutura em nuvem e processamento de dados',
      'Equipe de engenharia e suporte especializado',
      'Certificações de segurança PCI-DSS e SOC2'
    ],
    keyMetrics: [
      'Tempo médio de conciliação mensal',
      'Taxa de pontualidade no pagamento (D+0)',
      'Net Promoter Score (NPS) dos lojistas'
    ],
    unfairAdvantage: 'Algoritmo proprietário de tolerância adaptativa com auditoria contábil certificada.'
  },
  decisionLog: [
    {
      id: 'dec-1',
      date: new Date().toLocaleDateString('pt-BR'),
      decision: 'Aprovar criação de tolerância automática de centavos até R$ 1,00',
      context: 'Identificado durante discovery com CFO Renata que 85% dos travamentos eram por diferenças de centavos',
      driver: 'CFO Renata S. / Entrevista de Discovery',
      consequences: 'Elimina 40h de trabalho manual e destrava pagamentos no dia 1º',
      status: 'approved'
    },
    {
      id: 'dec-2',
      date: new Date().toLocaleDateString('pt-BR'),
      decision: 'Postergar emissão de NF-e para a Fase 2',
      context: 'Equipe de engenharia indicou alto risco de integração municipal no prazo de lançamento do MVP',
      driver: 'Mariana (Tech Lead)',
      consequences: 'Permite entregar o motor de conciliação 6 semanas mais rápido',
      status: 'approved'
    }
  ],
  personas: [
    {
      id: 'pers-1',
      name: 'Renata Silveira',
      role: 'Chief Financial Officer (CFO)',
      avatarColor: '#6366f1',
      segment: 'Grandes Varejistas & Franquias B2B (Faturamento > R$ 50M)',
      goals: [
        'Garantir liquidação pontual em D+0 para 100% dos lojistas parceiros',
        'Reduzir custo operacional de fechamento financeiro e risco de autuações',
        'Eliminar horas extras da equipe contábil no final do mês'
      ],
      painPoints: [
        'Travamento global de lotes por divergências ínfimas de centavos no Excel',
        'Demora de 4 dias inteiros cruzando arquivos CSV de 3 adquirentes',
        'Falta de visibilidade e previsibilidade dos chargebacks'
      ],
      jtbds: [
        'Quando chega o último dia do mês, quero conciliar transações com tolerância configurável para repassar sem atrasos.',
        'Quando há divergência contábil, quero isolar apenas a loja divergente para não punir a rede inteira.'
      ],
      quotes: [
        'Quando dá diferença de R$ 0,05, o sistema trava o lote todo de 200 lojas e ninguém recebe no dia 1º.',
        'Se tivesse uma regra automática, economizaria 40 horas por mês da minha equipe.'
      ]
    },
    {
      id: 'pers-2',
      name: 'Carlos Eduardo',
      role: 'Analista Sênior de Conciliação e Tesouraria',
      avatarColor: '#10b981',
      segment: 'Operações Financeiras Internas',
      goals: [
        'Identificar divergências de extratos bancários em segundos',
        'Automatizar o matching entre pedidos da plataforma e repasses de adquirentes'
      ],
      painPoints: [
        'Planilhas de 50.000 linhas travando o computador constantemente',
        'Necessidade de rodar macros manuais e PROCVs propensos a erro de digitação'
      ],
      jtbds: [
        'Quando recebo arquivos de Cielo e Stone, quero importar diretamente sem precisar abrir o Excel.'
      ],
      quotes: [
        'Passo o dia 30 inteirinho caçando centavo em planilha enquanto o telefone do suporte não para de tocar.'
      ]
    },
    {
      id: 'pers-3',
      name: 'Rodrigo Lima',
      role: 'Lojista B2B Credenciado (Parceiro)',
      avatarColor: '#f59e0b',
      segment: 'Pequenos e Médios Lojistas',
      goals: [
        'Receber o repasse pontualmente na manhã do dia 1º para pagar fornecedores e folha',
        'Ter extrato transparente de taxas e descontos aplicados'
      ],
      painPoints: [
        'Insegurança sobre a data exata do repasse',
        'Falta de justificativa clara quando há retenção temporária'
      ],
      jtbds: [
        'Quando minhas vendas são liquidadas, quero receber notificação proativa com o valor líquido no banco.'
      ],
      quotes: [
        'Se o dinheiro não cai no dia 1º, meus cheques para fornecedores voltam e minha operação para.'
      ]
    }
  ],
  bugReports: [
    {
      id: 'bug-1',
      title: 'Macro de PROCV quebra ao ler arquivos CSV com codificação UTF-8 com BOM da adquirente Stone',
      severity: 'critical',
      speaker: 'Renata S. (CFO Alpha)',
      quote: 'Quando dá diferença de R$ 0,05, o sistema trava o lote todo de 200 lojas e ninguém recebe no dia 1º.',
      sessionTitle: 'Entrevista de Discovery: Diretor Financeiro (CFO)',
      timestamp: '01:32',
      status: 'open'
    },
    {
      id: 'bug-2',
      title: 'Falta de timeout em lote manual com mais de 50k linhas congela a interface',
      severity: 'high',
      speaker: 'Carlos Eduardo (Analista)',
      quote: 'A planilha trava frequentemente com mais de 50k linhas gerando perda de dados',
      sessionTitle: 'Entrevista de Discovery: Diretor Financeiro (CFO)',
      timestamp: '00:38',
      status: 'investigating'
    }
  ]
};

export const SIMULATION_SCENARIOS = [
  {
    id: 'sim-fintech',
    name: '💳 Fintech B2B: Fricção em Conciliação e Split',
    description: 'Entrevista com CFO sobre atrasos de 4 dias no fechamento financeiro mensal e travamentos por centavos.',
    segments: [
      { speaker: 'Entrevistador (PM)', text: 'Olá Renata, vamos focar em como você gerencia o repasse dos lojistas hoje. Qual é a maior dor no final do mês?' },
      { speaker: 'Usuário / Stakeholder', text: 'Sem dúvida é o fechamento dos dias 28 a 31. Gastamos quase 4 dias inteiros cruzando planilhas manuais da Cielo e Stone com nosso banco de pedidos.' },
      { speaker: 'Entrevistador (PM)', text: 'E o que acontece quando há alguma divergência de valores nessas planilhas?' },
      { speaker: 'Usuário / Stakeholder', text: 'Se houver uma diferença de apenas 5 centavos, a macro trava e o lote inteiro de 200 lojistas é retido. Ninguém recebe no dia 1º e nosso suporte recebe mais de 60 ligações desesperadas!' },
      { speaker: 'Entrevistador (PM)', text: 'Quanto tempo da sua equipe é consumido apenas para achar esses 5 centavos?' },
      { speaker: 'Usuário / Stakeholder', text: 'Pelo menos 40 horas no mês. O que nós precisamos urgentemente é de uma tolerância automática para valores menores que R$ 1,00, notificando por webhook.' }
    ]
  },
  {
    id: 'sim-health',
    name: '🏥 Healthtech: Onboarding de Clínicas & Prontuário',
    description: 'Entrevista com Diretora Clínica sobre desistência de médicos no preenchimento de anamnese e integração.',
    segments: [
      { speaker: 'Entrevistador (PM)', text: 'Dra. Camila, como tem sido a adesão dos médicos especialistas ao novo prontuário eletrônico?' },
      { speaker: 'Usuário / Stakeholder', text: 'Muito difícil. Os médicos gastam mais tempo olhando para a tela e clicando em 8 menus do que olhando no olho do paciente durante a consulta.' },
      { speaker: 'Entrevistador (PM)', text: 'Em que momento específico da consulta eles mais sentem que o software atrapalha?' },
      { speaker: 'Usuário / Stakeholder', text: 'Na prescrição de medicamentos controlados. O sistema exige selecionar 6 campos obrigatórios de dosagem e via de administração que poderiam vir pré-preenchidos.' },
      { speaker: 'Entrevistador (PM)', text: 'E qual é a consequência disso na rotina da clínica?' },
      { speaker: 'Usuário / Stakeholder', text: 'A consulta atrasa 15 minutos em média, a sala de espera lota e 3 médicos ameaçaram voltar para o bloco de papel se não simplificarmos isso em 30 dias.' }
    ]
  },
  {
    id: 'sim-logistics',
    name: '📦 E-commerce: Logística Reversa & Devoluções',
    description: 'Entrevista com Gerente de Logística sobre custos de devoluções e ansiedade do consumidor.',
    segments: [
      { speaker: 'Entrevistador (PM)', text: 'Roberto, me conta sobre o processo de troca e devolução: o que mais gera custo e insatisfação hoje?' },
      { speaker: 'Usuário / Stakeholder', text: 'O cliente envia o produto de volta pelos Correios e fica no escuro por 12 dias. Ele não sabe se chegou no galpão nem quando o estorno no cartão vai cair.' },
      { speaker: 'Entrevistador (PM)', text: 'Como o time de logística descobre que o pacote chegou ao centro de distribuição?' },
      { speaker: 'Usuário / Stakeholder', text: 'Um funcionário abre pacote por pacote fisicamente com estilete e digita o código de rastreio num sistema legado. Demora 3 dias só pra dar entrada.' },
      { speaker: 'Entrevistador (PM)', text: 'Quantas devoluções vocês processam por semana nesse modelo?' },
      { speaker: 'Usuário / Stakeholder', text: 'Cerca de 1.200 pacotes por semana. O índice de reclamação no Reclame Aqui sobre devoluções representa 45% de todas as nossas queixas.' }
    ]
  }
];
