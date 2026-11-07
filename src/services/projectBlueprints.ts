import {
  addDiscoveryArea,
  addDiscoverySystem,
  initAutomationDiscovery
} from './automationDiscoveryService';
import { newId } from './ids';
import type {
  DiscoveryProject,
  MeetingSession,
  ScheduledMeeting,
  Stakeholder,
  SystemCategory
} from '../types/discovery';

export type ProjectBlueprintId =
  | 'blank'
  | 'ai_automation_discovery'
  | 'saas_mvp_zero_to_one'
  | 'operations_erp'
  | 'fintech_b2b'
  | 'healthtech_clinical';

export interface ProjectBlueprintSpec {
  id: ProjectBlueprintId;
  badge: string;
  title: string;
  subtitle: string;
  defaultName: string;
  defaultDescription: string;
  recommendedEntryView: 'project_hub' | 'automation_discovery' | 'live_room' | 'interview';
  highlights: string[];
  areas: { name: string; role: string; mainKpis: string; notes: string }[];
  systems: { name: string; type: SystemCategory; purpose: string; hasPersonalDataLgpd: 'Sim' | 'Não' }[];
  stakeholderRoles: { name: string; role: Stakeholder['role']; jobTitle: string; notes: string }[];
  firstSessionTitle: string;
  firstSessionObjective: string;
  firstSessionAgenda: string[];
}

export const PROJECT_BLUEPRINTS: ProjectBlueprintSpec[] = [
  {
    id: 'ai_automation_discovery',
    badge: 'METODOLOGIA 3 SEMANAS · 10 ABAS',
    title: '🤖 Consultoria: Discovery de IA & Automação',
    subtitle: 'Diagnóstico executivo de processos (P-01..), sistemas/LGPD, oportunidades (O-01..) com Jev e Readout de 90 dias.',
    defaultName: 'Discovery de IA e Automação — Diagnóstico Operacional',
    defaultDescription: 'Mapear processos críticos com os 4 números obrigatórios, identificar oportunidades de automação n8n e agentes de IA e estruturar o roadmap de 90 dias.',
    recommendedEntryView: 'automation_discovery',
    highlights: [
      '5 áreas-base pré-cadastradas (Comercial, Financeiro, Operações, Atendimento, RH/TI) com status "A agendar"',
      'Checklist de 17 itens (Antes, Durante e Depois da entrevista) pronto para uso',
      '1ª sessão de entrevista de 2 horas preparada com os 8 blocos do Roteiro na pauta',
      '4 categorias de sistemas base (ERP, Planilhas Excel, WhatsApp, E-mail) prontas para avaliar API e LGPD'
    ],
    areas: [
      {
        name: 'Comercial / Compras',
        role: 'Gestor Comercial / Comprador',
        mainKpis: 'Margem bruta, ruptura, giro de estoque, SLA de cadastro',
        notes: 'Hipóteses a validar: (1) cadastro manual de itens/preços; (2) cotação e pedido por planilha; (3) atendimento de dúvidas da equipe.'
      },
      {
        name: 'Financeiro / Fiscal',
        role: 'Controller / Coordenador Financeiro',
        mainKpis: 'Prazo de fechamento mensal, conciliação diária, erros de NF',
        notes: 'Hipóteses a validar: (1) conciliação manual de extratos/cartões/Pix; (2) conferência de NF/XML contra pedido; (3) cobrança e baixa manual.'
      },
      {
        name: 'Operações / Logística',
        role: 'Gerente de Operações',
        mainKpis: 'Produtividade por turno, OTIF, perdas e avarias, horas extras',
        notes: 'Hipóteses a validar: (1) apontamento em papel ou planilha; (2) fila de aprovação de divergências; (3) relatórios manuais de turno.'
      },
      {
        name: 'Atendimento / Suporte ao Cliente',
        role: 'Coordenador de Atendimento',
        mainKpis: 'TMA, SLA de primeira resposta, FCR, NPS',
        notes: 'Hipóteses a validar: (1) triagem manual de WhatsApp/e-mail; (2) consulta em múltiplos sistemas para responder; (3) dúvidas repetitivas.'
      },
      {
        name: 'RH / Administrativo & TI',
        role: 'Gestor de RH / TI',
        mainKpis: 'SLA de admissão/chamados, retrabalho de folha, chamados de 1º nível',
        notes: 'Hipóteses a validar: (1) coleta e conferência de documentos por WhatsApp/PDF; (2) dúvidas sobre políticas internas; (3) chamados repetitivos.'
      }
    ],
    systems: [
      { name: 'ERP Principal (a identificar)', type: 'ERP', purpose: 'Gestão central de pedidos, estoque, fiscal e financeiro', hasPersonalDataLgpd: 'Sim' },
      { name: 'Planilhas Operacionais (Excel / Sheets)', type: 'Planilha', purpose: 'Controles paralelos, conciliações e relatórios manuais', hasPersonalDataLgpd: 'Não' },
      { name: 'WhatsApp Corporativo / Grupos', type: 'Comunicação', purpose: 'Recebimento de solicitações, fotos, comprovantes e aprovações', hasPersonalDataLgpd: 'Sim' },
      { name: 'E-mail Corporativo', type: 'Comunicação', purpose: 'Recebimento de notas fiscais (PDF/XML), tabelas e cotações', hasPersonalDataLgpd: 'Sim' }
    ],
    stakeholderRoles: [
      { name: 'Patrocinador Executivo (Sponsor)', role: 'patrocinador', jobTitle: 'Diretoria / C-Level', notes: 'Aprova o escopo das 3 semanas e decide sobre o Roadmap de 90 dias no Readout.' },
      { name: 'Ponto Focal de TI / Sistemas', role: 'especialista', jobTitle: 'Líder de TI / Integrações', notes: 'Informa disponibilidade de APIs, bancos de dados e restrições de LGPD.' },
      { name: 'Gestor de Área Entrevistada', role: 'decisor', jobTitle: 'Gerente / Coordenador de Área', notes: 'Valida os números de volume, tempo e priorização das oportunidades da área.' }
    ],
    firstSessionTitle: 'Entrevista 2h — Área 1 (Roteiro Estruturado B1 a B8)',
    firstSessionObjective: 'Mapear os 3 a 5 maiores processos da área com os 4 números obrigatórios (volume, minutos, pessoas e % exceção), sistemas e dores literais.',
    firstSessionAgenda: [
      'B1 (10 min): Abertura, alinhamento de expectativa e autorização de gravação',
      'B2 (15 min): Contexto, missão da área, 3 a 5 KPIs e tamanho do time',
      'B3 (40 min): Mapa de processos, observação de tela por 5 min e coleta dos 4 números',
      'B4 (15 min): Sistemas, planilhas críticas, PDFs/WhatsApp, qualidade de dados (1–5) e LGPD',
      'B5 (15 min): Dores, gargalos, custo do erro e picos de sazonalidade',
      'B6 (15 min): Oportunidades candidatas, visão de 30/90 dias e controle humano',
      'B7 (05 min): Riscos operacionais, reação do time e campeão interno',
      'B8 (05 min): Recapitulação dos 3 achados e documentos pendentes'
    ]
  },
  {
    id: 'saas_mvp_zero_to_one',
    badge: 'PRODUTO DIGITAL · LEAN INCEPTION',
    title: '🚀 Produto Digital: SaaS / App (Zero ao MVP)',
    subtitle: 'Descoberta de produto com Mom Test, JTBD, Mapa Mental, Jornada, Story Mapping e Protótipo Navegável.',
    defaultName: 'Novo Produto Digital (Discovery & MVP)',
    defaultDescription: 'Validar dores reais com usuários-alvo, mapear a jornada ponta a ponta, fatiar o MVP com User Story Mapping e gerar especificações Gherkin.',
    recommendedEntryView: 'project_hub',
    highlights: [
      '1ª sessão de entrevista Mom Test configurada com pauta de fatos recentes (sem perguntas hipotéticas)',
      'Papéis de Stakeholders essenciais (Decisor, Usuário Final e Especialista) estruturados',
      'Fluxo conectado com Mapa Mental → Jornada → Story Map → Protótipo → Backlog BDD'
    ],
    areas: [],
    systems: [],
    stakeholderRoles: [
      { name: 'Sponsor do Produto', role: 'patrocinador', jobTitle: 'Head de Produto / Fundador', notes: 'Define visão, restrições de negócio e apetite de prazo do MVP.' },
      { name: 'Usuário-Alvo Principal (Early Adopter)', role: 'usuario', jobTitle: 'Profissional que executa o job no dia a dia', notes: 'Entrevistado na Sala ao Vivo para validar frequência e severidade da dor.' },
      { name: 'Tech Lead / Arquiteto', role: 'especialista', jobTitle: 'Engenharia', notes: 'Avalia viabilidade técnica, riscos e fatiamento vertical das histórias.' }
    ],
    firstSessionTitle: 'Entrevista de Discovery #01 — Mom Test & Jornada Real',
    firstSessionObjective: 'Entender como o usuário resolve o problema hoje, qual foi o último episódio real de atrito e quanto tempo/dinheiro perde com a alternativa atual.',
    firstSessionAgenda: [
      'Contexto: Como é a sua rotina hoje quando precisa realizar esta atividade?',
      'Último caso concreto: Conte como foi a última vez que isso aconteceu do início ao fim',
      'Fricção e contorno atual: Onde travou e que planilha ou ferramenta paralela você usou?',
      'Quantificação: Quantas vezes por semana/mês isso acontece e quanto tempo leva?',
      'Próximos passos: Pedir para ver um exemplo real na tela'
    ]
  },
  {
    id: 'operations_erp',
    badge: 'OPERAÇÕES · SLA & INTEGRAÇÃO',
    title: '⚙️ Transformação Operacional & Integração ERP',
    subtitle: 'Eliminação de retrabalho entre áreas, conciliação de dados, automação de backoffice e redução de SLA.',
    defaultName: 'Modernização Operacional & Integração de Fluxos',
    defaultDescription: 'Mapear gargalos entre sistemas legados e planilhas paralelas, padronizar regras de negócio e automatizar aprovações e conciliações.',
    recommendedEntryView: 'automation_discovery',
    highlights: [
      'Áreas de Backoffice, Fiscal/Financeiro e Operações pré-estruturadas',
      'Foco híbrido: Inventário de Processos + Jornada do Usuário + Requisitos de Integração',
      'Pauta de sessão focada em exceções, retrabalho e transferência manual entre sistemas'
    ],
    areas: [
      { name: 'Backoffice / Cadastro', role: 'Coordenador Operacional', mainKpis: 'SLA de atendimento interno, taxa de retrabalho', notes: '' },
      { name: 'Controladoria / Fiscal', role: 'Especialista Fiscal', mainKpis: 'Conformidade fiscal, tempo de fechamento', notes: '' }
    ],
    systems: [
      { name: 'ERP Core', type: 'ERP', purpose: 'Sistema transacional principal', hasPersonalDataLgpd: 'Sim' },
      { name: 'Planilhas de Conciliação', type: 'Planilha', purpose: 'Cruzamento manual de dados entre áreas', hasPersonalDataLgpd: 'Não' }
    ],
    stakeholderRoles: [
      { name: 'Gerente de Operações', role: 'decisor', jobTitle: 'Operações', notes: 'Dono do processo ponta a ponta.' },
      { name: 'Analista Executor Sênior', role: 'usuario', jobTitle: 'Backoffice', notes: 'Conhece todas as exceções e regras não documentadas.' }
    ],
    firstSessionTitle: 'Mapeamento de Fluxo Operacional & Exceções',
    firstSessionObjective: 'Levantar o passo a passo na tela, onde os dados são copiados manualmente e quais regras determinam as exceções.',
    firstSessionAgenda: [
      'Gatilho e entrada de dados: de onde chega a demanda e em qual formato?',
      'Observação na tela: passo a passo real no ERP e planilhas de apoio',
      'Volume mensal, tempo padrão, quantidade de pessoas e % de casos que viram exceção',
      'Impacto do erro e gargalos de aprovação entre áreas'
    ]
  },
  {
    id: 'fintech_b2b',
    badge: 'VERTICAL · FINTECH & FINANCEIRO',
    title: '💳 Fintech & Serviços Financeiros B2B',
    subtitle: 'Liquidação, conciliação de recebíveis (Pix/Cartões/Boletos), split de pagamento, risco e compliance.',
    defaultName: 'Iniciativa Fintech & Operações Financeiras',
    defaultDescription: 'Reduzir divergências financeiras, automatizar conciliação e batimento de recebíveis com trilha de auditoria e controle de alçada.',
    recommendedEntryView: 'project_hub',
    highlights: [
      ' Áreas de Tesouraria, Risco/Compliance e Atendimento Financeiro pré-cadastradas',
      'Sistemas típicos (ERP Financeiro, Adquirentes/Portais Bancários, BI) mapeados para avaliação LGPD',
      'Pauta focada em conciliação, divergências de taxas, chargeback e fechamento D+1'
    ],
    areas: [
      { name: 'Tesouraria & Conciliação', role: 'Coordenador de Tesouraria', mainKpis: 'Divergência de caixa, SLA de fechamento D+1', notes: '' },
      { name: 'Risco, Prevenção & Compliance (PLD)', role: 'Especialista de Risco', mainKpis: 'SLA de análise de onboarding, taxa de falso positivo', notes: '' }
    ],
    systems: [
      { name: 'ERP / Core Financeiro', type: 'ERP', purpose: 'Contas a pagar, receber e razão contábil', hasPersonalDataLgpd: 'Sim' },
      { name: 'Portais Bancários & Adquirentes (EDI)', type: 'Portal externo', purpose: 'Extratos de cartões, Pix e liquidação', hasPersonalDataLgpd: 'Sim' }
    ],
    stakeholderRoles: [
      { name: 'CFO / Diretor Financeiro', role: 'patrocinador', jobTitle: 'Diretoria Financeira', notes: 'Patrocinador executivo.' },
      { name: 'Especialista de Conciliação / Tesouraria', role: 'usuario', jobTitle: 'Tesouraria', notes: 'Executa o batimento diário.' }
    ],
    firstSessionTitle: 'Discovery Financeiro — Conciliação, Liquidação & Exceções',
    firstSessionObjective: 'Mapear o ciclo de fechamento diário, volume de transações, tempo gasto em divergências e regras de alçada.',
    firstSessionAgenda: [
      'Rotina de abertura e batimento D+1 (extratos vs ERP)',
      'Volume mensal de transações/lotes e tempo gasto nas divergências de taxa/split',
      'Restrições de auditoria, LGPD e alçadas de aprovação humana',
      'Oportunidades de automação na ingestão de arquivos EDI e conciliação'
    ]
  },
  {
    id: 'healthtech_clinical',
    badge: 'VERTICAL · SAÚDE & CLÍNICAS',
    title: '🏥 Healthtech: Jornada Clínica & Atendimento',
    subtitle: 'Agendamento, recepção, triagem, prontuário eletrônico, faturamento TISS/glosas e relacionamento com paciente.',
    defaultName: 'Jornada Clínica & Eficiência Operacional em Saúde',
    defaultDescription: 'Reduzir absenteísmo (no-show), agilizar triagem e prontuário e eliminar retrabalho no faturamento de guias e glosas.',
    recommendedEntryView: 'project_hub',
    highlights: [
      'Áreas de Agendamento/Recepção, Corpo Clínico e Faturamento/Glosas pré-estruturadas',
      'Atenção especial a dados sensíveis de saúde (LGPD = Sim) nos sistemas',
      'Pauta voltada para jornada do paciente, tempo de atendimento e redução de glosas'
    ],
    areas: [
      { name: 'Central de Agendamento & Recepção', role: 'Coordenador de Atendimento', mainKpis: 'Taxa de no-show, tempo de espera na recepção, conversão de agenda', notes: '' },
      { name: 'Faturamento Hospitalar / Clínico (TISS & Glosas)', role: 'Coordenador de Faturamento', mainKpis: 'Índice de glosa, prazo de envio de lotes, recuperação de glosas', notes: '' }
    ],
    systems: [
      { name: 'Sistema de Gestão Clínica / PEP (Prontuário)', type: 'ERP', purpose: 'Agenda médica, prontuário e faturamento TISS', hasPersonalDataLgpd: 'Sim' },
      { name: 'WhatsApp de Confirmação & Atendimento', type: 'Comunicação', purpose: 'Confirmação de consultas, envio de exames e dúvidas', hasPersonalDataLgpd: 'Sim' },
      { name: 'Portais de Operadoras / Convênios', type: 'Portal externo', purpose: 'Elegibilidade, autorização de guias e recurso de glosas', hasPersonalDataLgpd: 'Sim' }
    ],
    stakeholderRoles: [
      { name: 'Diretor Clínico / Operações', role: 'patrocinador', jobTitle: 'Direção', notes: 'Patrocinador do projeto.' },
      { name: 'Líder de Recepção / Faturamento', role: 'usuario', jobTitle: 'Operações Clínicas', notes: 'Vive as filas de autorização e confirmação.' }
    ],
    firstSessionTitle: 'Discovery da Jornada do Paciente & Backoffice de Saúde',
    firstSessionObjective: 'Identificar onde a recepção, médicos e faturamento perdem mais tempo manual com operadoras e pacientes.',
    firstSessionAgenda: [
      'Fluxo de agendamento, confirmação via WhatsApp e elegibilidade no convênio',
      'Atendimento e registro em prontuário: principais cliques e gargalos',
      'Conferência de guias TISS, anexos e tratamento de glosas',
      'Cuidados obrigatórios com dados sensíveis de saúde (LGPD)'
    ]
  },
  {
    id: 'blank',
    badge: '100% PERSONALIZADO',
    title: '⚡ Projeto em Branco (Começar do Zero)',
    subtitle: 'Estrutura totalmente limpa sem áreas ou sessões pré-criadas — monte tudo do seu jeito.',
    defaultName: '',
    defaultDescription: '',
    recommendedEntryView: 'project_hub',
    highlights: [
      'Começo 100% limpo',
      'Você escolhe se quer iniciar pelo Copiloto Entrevistador, Sala ao Vivo ou Discovery de IA'
    ],
    areas: [],
    systems: [],
    stakeholderRoles: [],
    firstSessionTitle: '',
    firstSessionObjective: '',
    firstSessionAgenda: []
  }
];

export function getProjectBlueprint(id: ProjectBlueprintId): ProjectBlueprintSpec {
  return PROJECT_BLUEPRINTS.find(b => b.id === id) ?? PROJECT_BLUEPRINTS[PROJECT_BLUEPRINTS.length - 1];
}

/**
 * Aplica a estrutura metodológica de um Blueprint sobre um projeto recém-criado,
 * sem inventar métricas falsas, dores não ditas nem itens de backlog artificiais.
 */
export function applyBlueprintToNewProject(
  project: DiscoveryProject,
  blueprintId: ProjectBlueprintId
): DiscoveryProject {
  const spec = getProjectBlueprint(blueprintId);
  let automationData = initAutomationDiscovery(project.name);

  for (const area of spec.areas) {
    automationData = addDiscoveryArea(automationData, {
      name: area.name,
      role: area.role,
      mainKpis: area.mainKpis,
      notes: area.notes,
      status: 'A agendar'
    });
  }

  for (const sys of spec.systems) {
    automationData = addDiscoverySystem(automationData, {
      name: sys.name,
      type: sys.type,
      purpose: sys.purpose,
      areasUsing: spec.areas.map(a => a.name).slice(0, 2).join(', '),
      hasApi: 'Não sei',
      dataQuality: 3,
      hasPersonalDataLgpd: sys.hasPersonalDataLgpd
    });
  }

  const nowIso = new Date().toISOString();
  const stakeholders: Stakeholder[] = spec.stakeholderRoles.map(st => ({
    id: newId('stk'),
    name: st.name,
    role: st.role,
    jobTitle: st.jobTitle,
    interest: 'alto',
    influence: st.role === 'patrocinador' || st.role === 'decisor' ? 'alto' : 'medio',
    notes: st.notes,
    createdAt: nowIso
  }));

  const sessions: MeetingSession[] = [];
  const scheduledMeetings: ScheduledMeeting[] = [];
  let activeSessionId: string | undefined = undefined;

  if (spec.firstSessionTitle) {
    const sessionId = newId('sess');
    const meetingId = newId('mtg');
    activeSessionId = sessionId;

    sessions.push({
      id: sessionId,
      title: spec.firstSessionTitle,
      date: nowIso.slice(0, 10),
      durationSeconds: 0,
      participants: stakeholders.map(s => s.name),
      participantIds: stakeholders.map(s => s.id),
      scheduledMeetingId: meetingId,
      objective: spec.firstSessionObjective,
      agenda: [...spec.firstSessionAgenda],
      type: 'discovery',
      rawTranscript: [],
      summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
      liveQuestions: [],
      painPoints: [],
      jtbds: [],
      mindMapNodes: [],
      mindMapEdges: [],
      userFlowSteps: []
    });

    scheduledMeetings.push({
      id: meetingId,
      title: spec.firstSessionTitle,
      type: 'discovery',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      objective: spec.firstSessionObjective,
      agenda: [...spec.firstSessionAgenda],
      participantIds: stakeholders.map(s => s.id),
      status: 'started',
      sessionId,
      createdAt: nowIso
    });
  }

  return {
    ...project,
    activeSessionId,
    sessions,
    stakeholders,
    scheduledMeetings,
    automationDiscovery: automationData,
    updatedAt: nowIso
  };
}
