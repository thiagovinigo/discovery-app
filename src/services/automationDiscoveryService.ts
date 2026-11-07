import { parseJsonLoose } from './aiClient';
import { planBacklogProposals } from './backlogProposals';
import type { Proposal } from './backlogProposals';
import { newId } from './ids';
import { plain } from './knowledgeService';
import type {
  AutomationDiscoveryData,
  AutomationOpportunity,
  CandidateSolutionType,
  ChecklistItemStatus,
  DiscoveryArea,
  DiscoveryChecklistItem,
  DiscoveryPremises,
  DiscoveryProject,
  DiscoverySystem,
  Epic,
  Feature,
  InterviewScriptQuestion,
  MeetingSession,
  OpportunityQuadrant,
  ProcessFrequency,
  ProcessSheet,
  RoadmapWave,
  SystemCategory,
  UserStory,
  YesPartialNo
} from '../types/discovery';

export type AiTextCaller = (systemPrompt: string, userMessage: string, temperature?: number) => Promise<string>;

// =============================================================================================
// 1. Checklist de 17 Itens (Antes, Durante, Depois da Entrevista)
// =============================================================================================

export const DEFAULT_INTERVIEW_CHECKLIST: Omit<DiscoveryChecklistItem, 'owner' | 'status' | 'notes'>[] = [
  // ANTES (1 a 7)
  {
    number: 1,
    phase: 'Antes',
    item: 'Confirmar data, duração (2h) e participantes: o gestor e uma pessoa que executa o processo',
    why: 'O gestor conhece a estratégia; quem executa conhece o passo a passo real'
  },
  {
    number: 2,
    phase: 'Antes',
    item: 'Pedir o organograma e o tamanho do time',
    why: 'Evita gastar tempo da entrevista com perguntas básicas'
  },
  {
    number: 3,
    phase: 'Antes',
    item: 'Pedir os indicadores da área e o último resultado',
    why: 'Conecta as oportunidades às metas da área'
  },
  {
    number: 4,
    phase: 'Antes',
    item: 'Pedir os relatórios e planilhas usados no dia a dia',
    why: 'Planilhas críticas revelam trabalho manual e sistemas desconectados'
  },
  {
    number: 5,
    phase: 'Antes',
    item: 'Pedir a lista de sistemas e quem é o dono técnico de cada um',
    why: 'Adianta o preenchimento da aba Sistemas e Dados'
  },
  {
    number: 6,
    phase: 'Antes',
    item: 'Pedir 2 ou 3 exemplos reais de documentos do processo, sem dados pessoais',
    why: 'Ver o documento real mostra a dificuldade melhor que o relato'
  },
  {
    number: 7,
    phase: 'Antes',
    item: 'Preencher a Ficha da Área e anotar 3 hipóteses de oportunidade',
    why: 'Você entra na reunião preparado para testar hipóteses'
  },
  // DURANTE (8 a 12)
  {
    number: 8,
    phase: 'Durante',
    item: 'Combinar a gravação logo no início: Plaud no presencial, Granola no remoto (ou um anotador)',
    why: 'A gravação permite que a IA preencha a planilha depois e libera você para conduzir'
  },
  {
    number: 9,
    phase: 'Durante',
    item: 'Pedir para ver o processo rodando na tela por 5 minutos',
    why: 'O processo real quase sempre tem mais passos que o descrito'
  },
  {
    number: 10,
    phase: 'Durante',
    item: 'Preencher a ficha de cada processo citado, com volume, frequência e tempo',
    why: 'Sem número não há cálculo de horas nem de retorno'
  },
  {
    number: 11,
    phase: 'Durante',
    item: 'Anotar as frases literais das dores',
    why: 'Frases reais convencem a diretoria no relatório final'
  },
  {
    number: 12,
    phase: 'Durante',
    item: 'Fechar com o recap dos 3 achados e os documentos pendentes',
    why: 'Valida o entendimento na hora'
  },
  // DEPOIS (13 a 17)
  {
    number: 13,
    phase: 'Depois',
    item: 'Completar as fichas de processo e a aba Sistemas em até 24 horas (a IA preenche a partir da transcrição)',
    why: 'Depois de 24 horas você esquece os detalhes que não ficaram claros no áudio'
  },
  {
    number: 14,
    phase: 'Depois',
    item: 'Lançar as oportunidades com notas de 1 a 5',
    why: 'Alimenta o score, a matriz e o resumo automaticamente'
  },
  {
    number: 15,
    phase: 'Depois',
    item: 'Validar números e achados com o gestor por mensagem',
    why: 'Evita contestação na apresentação executiva'
  },
  {
    number: 16,
    phase: 'Depois',
    item: 'Atualizar o status na Ficha da Área',
    why: 'Mantém o controle de avanço do discovery'
  },
  {
    number: 17,
    phase: 'Depois',
    item: 'Agendar a validação de 15 minutos com o gestor',
    why: 'O gestor vira aliado da proposta'
  }
];

// =============================================================================================
// 2. Roteiro 2h por Área (40 perguntas em 8 blocos de tempo = 120 minutos)
// =============================================================================================

export const INTERVIEW_SCRIPT_40_QUESTIONS: InterviewScriptQuestion[] = [
  // B1 — Abertura e combinados (10 min)
  {
    blockId: 'B1',
    blockTitle: 'B1. Abertura e combinados',
    blockMinutes: 10,
    number: '1.1',
    question: 'Explicar o objetivo do discovery: mapear processos, identificar oportunidades de IA e automação e montar o plano de 90 dias.',
    whatToLookFor: 'Alinhar expectativa: não é auditoria nem corte de pessoas; é liberar tempo de trabalho repetitivo.',
    probing: 'Ficou claro o objetivo? Alguma preocupação antes de começarmos?',
    feedsTab: '—'
  },
  {
    blockId: 'B1',
    blockTitle: 'B1. Abertura e combinados',
    blockMinutes: 10,
    number: '1.2',
    question: 'Combinar a gravação da conversa: no presencial, ativar o Plaud na mesa; no remoto, ativar o Granola. Explicar que o áudio vira transcrição para preencher o diagnóstico sem perder detalhes.',
    whatToLookFor: 'Consentimento explícito dos participantes antes de começar a gravar. Se alguém não autorizar, seguir só com anotador humano.',
    probing: 'Tudo bem gravarmos a conversa apenas para fins do diagnóstico?',
    feedsTab: 'Checklist'
  },
  {
    blockId: 'B1',
    blockTitle: 'B1. Abertura e combinados',
    blockMinutes: 10,
    number: '1.3',
    question: 'Confirmar a agenda das 2 horas e quem está na sala (cargo e papel de cada pessoa).',
    whatToLookFor: 'Garantir que há visão de gestão e visão de execução real do processo.',
    probing: 'Tem algum processo importante da área que ninguém aqui executa diretamente?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B1',
    blockTitle: 'B1. Abertura e combinados',
    blockMinutes: 10,
    number: '1.4',
    question: 'Combinar a regra do jogo: exemplos reais, números aproximados quando não houver exatos e mostrar a tela quando possível.',
    whatToLookFor: 'Permissão para pedir tela compartilhada e exemplos concretos.',
    probing: 'Podemos abrir um exemplo real quando chegarmos nos processos?',
    feedsTab: '—'
  },
  // B2 — Contexto e estratégia da área (15 min)
  {
    blockId: 'B2',
    blockTitle: 'B2. Contexto e estratégia da área',
    blockMinutes: 15,
    number: '2.1',
    question: 'Qual é a missão da área dentro da operação e o que ela entrega para as outras áreas ou para o cliente final?',
    whatToLookFor: 'Papel da área na cadeia de valor (compra, estoque, loja, financeiro, atendimento etc.).',
    probing: 'Quem é o principal cliente interno da sua área? O que acontece se a sua área parar por um dia?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B2',
    blockTitle: 'B2. Contexto e estratégia da área',
    blockMinutes: 15,
    number: '2.2',
    question: 'Quais são os 3 a 5 indicadores pelos quais a área é cobrada? Qual é a meta e o resultado atual de cada um?',
    whatToLookFor: 'KPIs reais com número: margem, ruptura, perda, SLA, produtividade, DSO, NPS, giro.',
    probing: 'Qual desses indicadores mais tira o sono da diretoria hoje?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B2',
    blockTitle: 'B2. Contexto e estratégia da área',
    blockMinutes: 15,
    number: '2.3',
    question: 'Como o time está organizado hoje? Quantas pessoas em cada função e onde ficam (matriz, CD, lojas)?',
    whatToLookFor: 'Tamanho do time, distribuição por função, turnos e concentração de pessoas em tarefas operacionais.',
    probing: 'Onde tem mais gente fazendo o mesmo tipo de tarefa todos os dias?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B2',
    blockTitle: 'B2. Contexto e estratégia da área',
    blockMinutes: 15,
    number: '2.4',
    question: 'Quais são as metas ou projetos prioritários da área para os próximos 6 a 12 meses?',
    whatToLookFor: 'Crescimento planejado, abertura de lojas, troca de sistema, redução de custo, auditoria.',
    probing: 'O que precisa dar certo este ano para a área entregar a meta?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B2',
    blockTitle: 'B2. Contexto e estratégia da área',
    blockMinutes: 15,
    number: '2.5',
    question: 'A área já usa alguma automação, robô, ChatGPT, Claude ou ferramenta de IA hoje, mesmo que informal?',
    whatToLookFor: 'Maturidade digital, iniciativas existentes, uso informal de IA e campeões internos.',
    probing: 'O que funcionou e o que foi abandonado? Por quê?',
    feedsTab: 'Ficha da Área'
  },
  // B3 — Mapa de processos (40 min)
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.1',
    question: 'Quais são os 5 a 8 processos principais que consomem a maior parte do tempo do time toda semana?',
    whatToLookFor: 'Lista inicial de processos candidatos para abrir ficha na aba Processos.',
    probing: 'Se você somar esses processos, eles explicam mais da metade da semana do time?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.2',
    question: 'Dos processos listados, quais são os 3 que mais consomem horas, geram erro ou atrasam decisões? Vamos abrir a ficha de cada um.',
    whatToLookFor: 'Priorizar os 3 a 5 processos que terão ficha completa preenchida na aba Processos.',
    probing: 'Se pudéssemos resolver só dois processos nos próximos 60 dias, quais seriam?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.3',
    question: 'Para cada processo prioritário: como começa (gatilho), quais são os passos do início ao fim e qual é a entrega final?',
    whatToLookFor: 'Fluxo real passo a passo, não o fluxo ideal.',
    probing: 'Me conta o último caso real que aconteceu ontem ou esta semana.',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.4',
    question: 'Você pode compartilhar a tela por 5 minutos e mostrar um caso real desse processo acontecendo?',
    whatToLookFor: 'Cliques manuais, copiar e colar entre sistemas, planilhas paralelas, leitura de PDF/e-mail/WhatsApp.',
    probing: 'Por que você precisou abrir essa outra tela ou planilha aqui?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.5',
    question: 'Com que frequência esse processo roda, qual é o volume por mês, quanto tempo leva cada execução e quantas pessoas fazem?',
    whatToLookFor: 'Os 4 números obrigatórios: frequência, volume mensal, minutos por execução e pessoas envolvidas.',
    probing: 'Em dia de pico ou fechamento, esse volume muda quanto?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.6',
    question: 'Que percentual dos casos segue o caminho padrão e que percentual vira exceção? O que causa a exceção?',
    whatToLookFor: 'Taxa de exceção e complexidade do caso difícil.',
    probing: 'De cada 10 casos, quantos vão direto sem precisar perguntar para ninguém?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B3',
    blockTitle: 'B3. Mapa de processos',
    blockMinutes: 40,
    number: '3.7',
    question: 'As regras de decisão desse processo estão escritas em algum lugar ou estão na cabeça das pessoas mais experientes?',
    whatToLookFor: 'Se a regra é clara (automação n8n) ou exige interpretação e contexto (agente/assistente de IA).',
    probing: 'Uma pessoa nova no time consegue executar em quanto tempo?',
    feedsTab: 'Processos'
  },
  // B4 — Dados, sistemas e integrações (15 min)
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.1',
    question: 'Quais sistemas, portais e planilhas o time abre todos os dias para trabalhar?',
    whatToLookFor: 'ERP, WMS, PDV, CRM, BI, portais de fornecedores/bancos, planilhas críticas, WhatsApp, e-mail.',
    probing: 'Tem alguma planilha que, se corromper hoje, para a área?',
    feedsTab: 'Sistemas e Dados'
  },
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.2',
    question: 'Onde o time precisa copiar informação de um lugar e digitar em outro?',
    whatToLookFor: 'Integrações inexistentes que viram trabalho manual de digitação ou conciliação.',
    probing: 'Quantas vezes por dia alguém faz esse copiar e colar?',
    feedsTab: 'Sistemas e Dados'
  },
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.3',
    question: 'Quais informações chegam em formato desestruturado: PDF, foto, nota fiscal, áudio, WhatsApp ou texto livre de e-mail?',
    whatToLookFor: 'Candidatos diretos para agentes de IA com leitura e interpretação de documentos ou mensagens.',
    probing: 'Quem lê esses arquivos hoje e o que faz com a informação depois?',
    feedsTab: 'Sistemas e Dados'
  },
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.4',
    question: 'De 1 a 5, quão confiáveis são os dados que vocês usam? Onde o dado vem errado, atrasado ou incompleto?',
    whatToLookFor: 'Qualidade de dados, cadastros sujos, divergência entre relatórios e necessidade de limpeza.',
    probing: 'Vocês confiam no número que sai do sistema ou conferem na planilha antes de decidir?',
    feedsTab: 'Sistemas e Dados'
  },
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.5',
    question: 'Esses sistemas têm API, exportação automática ou acesso a banco de dados? Quem é o dono técnico na TI ou fornecedor?',
    whatToLookFor: 'Viabilidade técnica de integração e quem precisa aprovar ou liberar acesso.',
    probing: 'Quando vocês precisam de um campo novo ou integração, quem faz e quanto tempo demora?',
    feedsTab: 'Sistemas e Dados'
  },
  {
    blockId: 'B4',
    blockTitle: 'B4. Dados, sistemas e integrações',
    blockMinutes: 15,
    number: '4.6',
    question: 'Algum processo lida com dados pessoais (CPF, nome, salário, saúde) ou informações confidenciais de preço e contrato?',
    whatToLookFor: 'Restrições de LGPD, sigilo comercial e governança de dados.',
    probing: 'Existe alguma política interna sobre onde esses dados podem circular?',
    feedsTab: 'Sistemas e Dados'
  },
  // B5 — Dores, gargalos e custo do problema (15 min)
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.1',
    question: 'Onde o trabalho trava esperando aprovação, resposta de outra área, fornecedor ou loja?',
    whatToLookFor: 'Filas de espera, gargalos entre áreas e SLAs informais.',
    probing: 'Quanto tempo fica parado em média esperando essa resposta?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.2',
    question: 'Quais erros ou retrabalhos acontecem todo mês? Qual foi o último erro caro ou desgastante?',
    whatToLookFor: 'Custo real do erro: multa, perda de mercadoria, pagamento errado, ruptura, reclamação de cliente.',
    probing: 'Quanto isso custou em dinheiro, tempo ou desgaste com cliente/fornecedor?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.3',
    question: 'Quais perguntas a diretoria ou outras áreas fazem toda semana e que dão trabalho para responder?',
    whatToLookFor: 'Candidatos para assistente de IA / BI conversacional / relatórios automáticos.',
    probing: 'Quanto tempo alguém gasta para montar essa resposta quando pedem de última hora?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.4',
    question: 'Quais decisões importantes hoje são tomadas no sentimento porque o dado demora ou dá trabalho levantar?',
    whatToLookFor: 'Oportunidades de decisão assistida por IA ou alertas preditivos.',
    probing: 'Que informação você gostaria de receber pronta toda segunda-feira às 8h?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.5',
    question: 'Quando tem pico (fim de mês, promoção, sazonalidade, inventário), o que quebra primeiro?',
    whatToLookFor: 'Restrições de capacidade, horas extras e risco operacional em momentos críticos.',
    probing: 'Vocês fazem hora extra ou deixam atividade para trás nesses períodos?',
    feedsTab: 'Processos'
  },
  {
    blockId: 'B5',
    blockTitle: 'B5. Dores, gargalos e custo do problema',
    blockMinutes: 15,
    number: '5.6',
    question: 'Se a empresa crescer 30% no próximo ano sem contratar ninguém na sua área, o que inviabiliza a operação?',
    whatToLookFor: 'Processos que não escalam e justificam investimento imediato em automação.',
    probing: 'Qual tarefa teria que parar de ser manual para a área aguentar esse crescimento?',
    feedsTab: 'Oportunidades'
  },
  // B6 — Oportunidades e visão de futuro (15 min)
  {
    blockId: 'B6',
    blockTitle: 'B6. Oportunidades e visão de futuro',
    blockMinutes: 15,
    number: '6.1',
    question: 'Se você pudesse tirar 3 tarefas repetitivas da frente do seu time amanhã, quais seriam?',
    whatToLookFor: 'Desejo explícito do gestor; geralmente aponta quick wins com alta adesão.',
    probing: 'O que o time faria com as horas liberadas dessas 3 tarefas?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B6',
    blockTitle: 'B6. Oportunidades e visão de futuro',
    blockMinutes: 15,
    number: '6.2',
    question: 'Onde um assistente de IA ajudaria mais hoje: responder dúvidas sobre regras internas, analisar documentos, preparar relatórios ou revisar exceções?',
    whatToLookFor: 'Separar casos de Assistente Claude, Agente de IA, Automação n8n e Analytics.',
    probing: 'Quem usaria esse assistente no dia a dia: analista, comprador, gerente de loja, atendimento?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B6',
    blockTitle: 'B6. Oportunidades e visão de futuro',
    blockMinutes: 15,
    number: '6.3',
    question: 'Das hipóteses que trouxemos para testar com vocês, quais fazem sentido na prática e quais não param em pé?',
    whatToLookFor: 'Validar ou descartar com humildade as hipóteses preparadas antes da entrevista.',
    probing: 'O que impediria essa ideia de funcionar na rotina real de vocês?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B6',
    blockTitle: 'B6. Oportunidades e visão de futuro',
    blockMinutes: 15,
    number: '6.4',
    question: 'Para as melhores oportunidades, qual seria o resultado ideal em 30 dias (piloto) e em 90 dias (escala)?',
    whatToLookFor: 'Critério de sucesso claro e escopo enxuto para a primeira entrega.',
    probing: 'Com qual loja, categoria, fornecedor ou equipe vale começar o piloto?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B6',
    blockTitle: 'B6. Oportunidades e visão de futuro',
    blockMinutes: 15,
    number: '6.5',
    question: 'Em quais decisões a IA pode agir sozinha e onde precisa obrigatoriamente de aprovação humana?',
    whatToLookFor: 'Desenho de controle humano (human-in-the-loop) e alçadas de aprovação.',
    probing: 'Até que valor ou tipo de caso pode ir no automático sem alguém revisar?',
    feedsTab: 'Oportunidades'
  },
  // B7 — Riscos, governança e pessoas (5 min)
  {
    blockId: 'B7',
    blockTitle: 'B7. Riscos, governança e pessoas',
    blockMinutes: 5,
    number: '7.1',
    question: 'O que não pode dar errado de jeito nenhum se automatizarmos parte desses processos?',
    whatToLookFor: 'Riscos operacionais, fiscais, financeiros, jurídicos ou de imagem.',
    probing: 'Qual seria o plano de contingência se a automação falhar por duas horas?',
    feedsTab: 'Oportunidades'
  },
  {
    blockId: 'B7',
    blockTitle: 'B7. Riscos, governança e pessoas',
    blockMinutes: 5,
    number: '7.2',
    question: 'Como você imagina a reação do time? Quem na equipe seria o campeão para testar primeiro?',
    whatToLookFor: 'Resistência cultural, necessidade de treinamento e identificação do usuário-chave.',
    probing: 'Quem é a pessoa do time que mais gosta de testar ferramenta nova?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B7',
    blockTitle: 'B7. Riscos, governança e pessoas',
    blockMinutes: 5,
    number: '7.3',
    question: 'Existe alguma mudança prevista (troca de ERP, reestruturação, auditoria) que afete esses processos nos próximos meses?',
    whatToLookFor: 'Dependências externas que podem bloquear ou adiar uma iniciativa.',
    probing: 'Vale esperar essa mudança ou fazer uma solução rápida antes?',
    feedsTab: 'Oportunidades'
  },
  // B8 — Fechamento e próximos passos (5 min)
  {
    blockId: 'B8',
    blockTitle: 'B8. Fechamento e próximos passos',
    blockMinutes: 5,
    number: '8.1',
    question: 'Recapitular em voz alta os 3 principais processos e as 2 ou 3 oportunidades mais fortes identificadas na conversa.',
    whatToLookFor: 'Confirmação imediata do gestor de que o retrato está fiel.',
    probing: 'Se eu apresentar exatamente assim para a diretoria, representa bem a realidade da área?',
    feedsTab: 'Checklist'
  },
  {
    blockId: 'B8',
    blockTitle: 'B8. Fechamento e próximos passos',
    blockMinutes: 5,
    number: '8.2',
    question: 'Listar os documentos, relatórios ou exemplos de arquivos que ficaram de ser enviados após a reunião.',
    whatToLookFor: 'Responsável e data de entrega dos materiais pendentes.',
    probing: 'Quem do time consegue me mandar esses exemplos até amanhã?',
    feedsTab: 'Checklist'
  },
  {
    blockId: 'B8',
    blockTitle: 'B8. Fechamento e próximos passos',
    blockMinutes: 5,
    number: '8.3',
    question: 'Indicar quem devemos procurar se surgir dúvida de detalhe técnico ou de volume durante a consolidação.',
    whatToLookFor: 'Ponto focal operacional para validação rápida.',
    probing: 'Posso chamar essa pessoa direto no WhatsApp ou e-mail para tirar dúvidas pontuais?',
    feedsTab: 'Ficha da Área'
  },
  {
    blockId: 'B8',
    blockTitle: 'B8. Fechamento e próximos passos',
    blockMinutes: 5,
    number: '8.4',
    question: 'Tem algo importante sobre a rotina da área que eu não perguntei e deveria saber?',
    whatToLookFor: 'Pergunta final aberta; costuma revelar a dor mais política ou o problema que ninguém colocou no papel.',
    probing: 'Silêncio de 5 segundos após perguntar — deixe o entrevistado pensar.',
    feedsTab: 'Ficha da Área'
  }
];

// =============================================================================================
// 3. Ficha de Processo (22 perguntas padrão e metadados)
// =============================================================================================

export interface ProcessQuestionMeta {
  number: number;
  field: keyof ProcessSheet;
  label: string;
  tip: string;
  feedsColumn: string;
  isGoldenFour?: boolean;
}

export const PROCESS_SHEET_22_QUESTIONS: ProcessQuestionMeta[] = [
  { number: 1, field: 'area', label: 'Área', tip: 'Ex.: Comercial / Compras, Financeiro, Operações de Loja', feedsColumn: 'Área' },
  { number: 2, field: 'name', label: 'Nome do processo (verbo + objeto)', tip: 'Ex.: Cadastrar produto novo, Conciliar notas fiscais, Responder cliente', feedsColumn: 'Processo' },
  { number: 3, field: 'trigger', label: 'O que dispara o processo? (gatilho)', tip: 'Ex.: E-mail do fornecedor, pedido no portal, fechamento do dia', feedsColumn: 'Descrição' },
  { number: 4, field: 'mainSteps', label: 'Quais são as etapas principais? (3 a 6 passos)', tip: 'Descreva na ordem real em que acontece na tela', feedsColumn: 'Descrição' },
  { number: 5, field: 'finalDeliverable', label: 'Qual é a entrega final?', tip: 'Ex.: Pedido emitido no ERP, relatório enviado, título baixado', feedsColumn: 'Descrição' },
  { number: 6, field: 'ownerRole', label: 'Quem é o dono do processo? (cargo, não nome)', tip: 'Cargo responsável pelo resultado do processo', feedsColumn: 'Dono' },
  { number: 7, field: 'frequency', label: 'Qual é a frequência?', tip: 'Selecione: Diária, Semanal, Quinzenal, Mensal ou Por evento', feedsColumn: 'Frequência' },
  { number: 8, field: 'monthlyVolume', label: 'Quantas vezes roda por mês? (volume mensal)', tip: 'Número inteiro. Se for diário em 22 dias úteis, multiplique por 22', feedsColumn: 'Volume/mês', isGoldenFour: true },
  { number: 9, field: 'standardMinutes', label: 'Quantos minutos leva uma execução no caso padrão?', tip: 'Número em minutos. Ex.: 15 para quinze minutos, 90 para 1h30', feedsColumn: 'Min/execução', isGoldenFour: true },
  { number: 10, field: 'peopleInvolved', label: 'Quantas pessoas executam esse processo?', tip: 'Quantidade de pessoas que fazem essa atividade', feedsColumn: 'Pessoas', isGoldenFour: true },
  { number: 11, field: 'exceptionRate', label: 'Que % dos casos foge do padrão (vira exceção)?', tip: 'Ex.: 20% — casos que exigem análise manual, aprovação ou retrabalho', feedsColumn: '% exceção', isGoldenFour: true },
  { number: 12, field: 'exceptionMinutes', label: 'Quantos minutos leva um caso com exceção?', tip: 'Número em minutos para resolver o caso difícil', feedsColumn: 'Exceção / gargalo' },
  { number: 13, field: 'systemsUsed', label: 'Quais sistemas o processo usa?', tip: 'Liste na ordem de uso: ERP, WMS, Planilha, WhatsApp, E-mail, Portal', feedsColumn: 'Sistemas' },
  { number: 14, field: 'dataInputFormat', label: 'De onde vêm os dados e em que formato?', tip: 'Ex.: PDF por e-mail, planilha Excel, tela do ERP, foto no WhatsApp', feedsColumn: 'Entrada de dados' },
  { number: 15, field: 'structuredData', label: 'Os dados já estão estruturados (campos fixos)?', tip: 'Selecione: Sim, Parcial ou Não', feedsColumn: 'Dado estruturado?' },
  { number: 16, field: 'documentedRules', label: 'As regras de decisão são claras e documentadas?', tip: 'Selecione: Sim, Parcial ou Não', feedsColumn: 'Regra clara?' },
  { number: 17, field: 'bottlenecks', label: 'Onde o processo trava ou espera alguém?', tip: 'Filas de aprovação, resposta de fornecedor, conferência manual', feedsColumn: 'Exceção / gargalo' },
  { number: 18, field: 'errorImpact', label: 'O que acontece quando dá erro? Qual é o impacto?', tip: 'Multa, perda, ruptura, atraso, retrabalho, insatisfação do cliente', feedsColumn: 'Impacto do erro' },
  { number: 19, field: 'literalPainQuote', label: 'Qual é a dor, nas palavras do time? (frase literal)', tip: 'Anote entre aspas como a pessoa falou na entrevista', feedsColumn: 'Frase da dor' },
  { number: 20, field: 'seasonality', label: 'Tem pico ou sazonalidade?', tip: 'Ex.: fim do mês, segunda-feira, campanhas promocionais, safra', feedsColumn: 'Exceção / gargalo' },
  { number: 21, field: 'customHourlyCost', label: 'Custo-hora diferente da Capa (R$)? (opcional)', tip: 'Deixe em branco para usar o custo-hora padrão da aba Capa', feedsColumn: 'Custo/hora' },
  { number: 22, field: 'candidateSolution', label: 'Qual tipo de solução parece mais adequado?', tip: 'Selecione: Automação n8n, Agente de IA, Assistente Claude, Analytics / BI, Redesenho de processo ou Não se aplica', feedsColumn: 'Solução candidata' }
];

// =============================================================================================
// 4. Inicialização e Premissas (Capa)
// =============================================================================================

export function createDefaultPremises(projectName = ''): DiscoveryPremises {
  return {
    clientName: projectName.trim(),
    discoveryPeriod: '',
    consultant: '',
    loadedHourlyCost: 45,
    hourlyCostSource: 'Padrão R$ 45/h — ajustar com RH ou controladoria',
    weightImpact: 0.40,
    weightDataReadiness: 0.20,
    weightEffort: 0.25,
    weightRisk: 0.15,
    highImpactCutoff: 4,
    lowEffortCutoff: 2
  };
}

export function createDefaultChecklist(): DiscoveryChecklistItem[] {
  return DEFAULT_INTERVIEW_CHECKLIST.map(item => ({
    ...item,
    owner: '',
    status: 'Pendente',
    notes: ''
  }));
}

export function initAutomationDiscovery(projectName = ''): AutomationDiscoveryData {
  return {
    premises: createDefaultPremises(projectName),
    checklist: createDefaultChecklist(),
    areas: [],
    scriptAnswersByArea: {},
    processes: [],
    systems: [],
    opportunities: [],
    updatedAt: new Date().toISOString()
  };
}

export function ensureAutomationDiscovery(project: DiscoveryProject): AutomationDiscoveryData {
  if (!project.automationDiscovery) {
    return initAutomationDiscovery(project.name);
  }
  const current = project.automationDiscovery;
  return {
    premises: {
      ...createDefaultPremises(project.name),
      ...current.premises
    },
    checklist:
      Array.isArray(current.checklist) && current.checklist.length === 17
        ? current.checklist
        : createDefaultChecklist(),
    areas: Array.isArray(current.areas) ? current.areas : [],
    scriptAnswersByArea: current.scriptAnswersByArea ?? {},
    processes: Array.isArray(current.processes) ? current.processes : [],
    systems: Array.isArray(current.systems) ? current.systems : [],
    opportunities: Array.isArray(current.opportunities) ? current.opportunities : [],
    updatedAt: current.updatedAt || new Date().toISOString()
  };
}

export function validatePremisesWeights(premises: DiscoveryPremises): {
  sum: number;
  isValid: boolean;
  message: string;
} {
  const sum = Math.round(
    (premises.weightImpact + premises.weightDataReadiness + premises.weightEffort + premises.weightRisk) * 100
  ) / 100;
  const isValid = Math.abs(sum - 1) < 0.001;
  return {
    sum,
    isValid,
    message: isValid ? 'OK (soma 100%)' : `Ajustar pesos: soma atual ${(sum * 100).toFixed(0)}% (deve somar 100%)`
  };
}

// =============================================================================================
// 5. Operações de Mutação Imutável (Áreas, Roteiro, Processos, Sistemas, Oportunidades)
// =============================================================================================

export function updateDiscoveryPremises(
  data: AutomationDiscoveryData,
  patch: Partial<DiscoveryPremises>
): AutomationDiscoveryData {
  return {
    ...data,
    premises: { ...data.premises, ...patch },
    updatedAt: new Date().toISOString()
  };
}

export function updateChecklistItem(
  data: AutomationDiscoveryData,
  number: number,
  patch: Partial<Pick<DiscoveryChecklistItem, 'status' | 'owner' | 'notes'>>
): AutomationDiscoveryData {
  return {
    ...data,
    checklist: data.checklist.map(item => (item.number === number ? { ...item, ...patch } : item)),
    updatedAt: new Date().toISOString()
  };
}

export function addDiscoveryArea(
  data: AutomationDiscoveryData,
  partial: Partial<Omit<DiscoveryArea, 'id'>> & { name: string }
): AutomationDiscoveryData {
  const area: DiscoveryArea = {
    id: newId('area'),
    name: partial.name.trim(),
    managerName: partial.managerName?.trim() ?? '',
    role: partial.role?.trim() ?? '',
    executiveSponsor: partial.executiveSponsor?.trim() ?? '',
    interviewDate: partial.interviewDate?.trim() ?? '',
    status: partial.status ?? 'A agendar',
    headcount: partial.headcount ?? 0,
    location: partial.location?.trim() ?? '',
    mainKpis: partial.mainKpis?.trim() ?? '',
    yearGoals: partial.yearGoals?.trim() ?? '',
    mainSystems: partial.mainSystems?.trim() ?? '',
    currentAiUsage: partial.currentAiUsage?.trim() ?? '',
    digitalMaturity: partial.digitalMaturity ?? 2,
    declaredPain: partial.declaredPain?.trim() ?? '',
    followUpContacts: partial.followUpContacts?.trim() ?? '',
    notes: partial.notes?.trim() ?? ''
  };
  return {
    ...data,
    areas: [...data.areas, area],
    updatedAt: new Date().toISOString()
  };
}

export function updateDiscoveryArea(
  data: AutomationDiscoveryData,
  areaId: string,
  patch: Partial<Omit<DiscoveryArea, 'id'>>
): AutomationDiscoveryData {
  return {
    ...data,
    areas: data.areas.map(a => (a.id === areaId ? { ...a, ...patch } : a)),
    updatedAt: new Date().toISOString()
  };
}

export function removeDiscoveryArea(data: AutomationDiscoveryData, areaId: string): AutomationDiscoveryData {
  const nextAnswers = { ...data.scriptAnswersByArea };
  delete nextAnswers[areaId];
  return {
    ...data,
    areas: data.areas.filter(a => a.id !== areaId),
    scriptAnswersByArea: nextAnswers,
    updatedAt: new Date().toISOString()
  };
}

export function saveAreaScriptAnswer(
  data: AutomationDiscoveryData,
  areaId: string,
  questionNumber: string,
  notes: string
): AutomationDiscoveryData {
  const prevAreaAnswers = data.scriptAnswersByArea[areaId] ?? {};
  return {
    ...data,
    scriptAnswersByArea: {
      ...data.scriptAnswersByArea,
      [areaId]: {
        ...prevAreaAnswers,
        [questionNumber]: notes
      }
    },
    updatedAt: new Date().toISOString()
  };
}

export function nextProcessId(processes: ProcessSheet[]): string {
  const used = new Set(processes.map(p => p.id));
  for (let i = 1; i <= 999; i++) {
    const candidate = `P-${String(i).padStart(2, '0')}`;
    if (!used.has(candidate)) return candidate;
  }
  return `P-${processes.length + 1}`;
}

export function nextOpportunityId(opportunities: AutomationOpportunity[]): string {
  const used = new Set(opportunities.map(o => o.id));
  for (let i = 1; i <= 999; i++) {
    const candidate = `O-${String(i).padStart(2, '0')}`;
    if (!used.has(candidate)) return candidate;
  }
  return `O-${opportunities.length + 1}`;
}

/**
 * Heurística do Guia do Consultor (pergunta Q22 da ficha de processo):
 * - Dados estruturados ('Sim') + regra clara ('Sim') -> 'Automação n8n'
 * - PDF, imagem, áudio, WhatsApp ou texto livre, ou julgamento parcial -> 'Agente de IA'
 * - Dúvidas repetidas que chegam ao time -> 'Assistente Claude'
 * - Decisão tomada sem dado ou dado atrasado -> 'Analytics / BI'
 * - Processo quebrado, sem dono ou sem regra ('Não' e sem dono) -> 'Redesenho de processo'
 */
export function suggestSolutionTypeForProcess(process: Partial<ProcessSheet>): CandidateSolutionType {
  const combined = plain(
    `${process.name ?? ''} ${process.trigger ?? ''} ${process.mainSteps ?? ''} ${process.dataInputFormat ?? ''} ${process.bottlenecks ?? ''} ${process.literalPainQuote ?? ''}`
  );
  if (
    process.structuredData === 'Não' &&
    process.documentedRules === 'Não' &&
    !(process.ownerRole ?? '').trim()
  ) {
    return 'Redesenho de processo';
  }
  if (/\b(duvida|pergunta|consulta|politica|procedimento|atendimento interno)\b/.test(combined)) {
    return 'Assistente Claude';
  }
  if (/\b(relatorio|dashboard|indicador|kpi|bi|decisao no escuro|fechamento|consolidar planilha)\b/.test(combined) && process.structuredData === 'Sim' && process.documentedRules !== 'Sim') {
    return 'Analytics / BI';
  }
  if (process.structuredData === 'Sim' && process.documentedRules === 'Sim') {
    return 'Automação n8n';
  }
  if (
    /\b(pdf|foto|imagem|audio|whatsapp|texto livre|nota fiscal|xml|e-mail|email|laudo|contrato)\b/.test(combined) ||
    process.structuredData === 'Não' ||
    process.structuredData === 'Parcial' ||
    process.documentedRules === 'Parcial'
  ) {
    return 'Agente de IA';
  }
  if (process.documentedRules === 'Não') {
    return 'Redesenho de processo';
  }
  return 'Automação n8n';
}

export function addProcessSheet(
  data: AutomationDiscoveryData,
  partial: Partial<Omit<ProcessSheet, 'id'>> = {}
): AutomationDiscoveryData {
  const id = nextProcessId(data.processes);
  const sheet: ProcessSheet = {
    id,
    area: partial.area?.trim() ?? (data.areas[0]?.name ?? ''),
    name: partial.name?.trim() ?? '',
    trigger: partial.trigger?.trim() ?? '',
    mainSteps: partial.mainSteps?.trim() ?? '',
    finalDeliverable: partial.finalDeliverable?.trim() ?? '',
    ownerRole: partial.ownerRole?.trim() ?? '',
    frequency: partial.frequency ?? 'Diária',
    monthlyVolume: partial.monthlyVolume,
    standardMinutes: partial.standardMinutes,
    peopleInvolved: partial.peopleInvolved,
    exceptionRate: partial.exceptionRate,
    exceptionMinutes: partial.exceptionMinutes,
    systemsUsed: partial.systemsUsed?.trim() ?? '',
    dataInputFormat: partial.dataInputFormat?.trim() ?? '',
    structuredData: partial.structuredData ?? 'Parcial',
    documentedRules: partial.documentedRules ?? 'Parcial',
    bottlenecks: partial.bottlenecks?.trim() ?? '',
    errorImpact: partial.errorImpact?.trim() ?? '',
    literalPainQuote: partial.literalPainQuote?.trim() ?? '',
    seasonality: partial.seasonality?.trim() ?? '',
    customHourlyCost: partial.customHourlyCost,
    candidateSolution: partial.candidateSolution ?? suggestSolutionTypeForProcess(partial)
  };
  return {
    ...data,
    processes: [...data.processes, sheet],
    updatedAt: new Date().toISOString()
  };
}

export function updateProcessSheet(
  data: AutomationDiscoveryData,
  processId: string,
  patch: Partial<Omit<ProcessSheet, 'id'>>
): AutomationDiscoveryData {
  return {
    ...data,
    processes: data.processes.map(p => (p.id === processId ? { ...p, ...patch } : p)),
    updatedAt: new Date().toISOString()
  };
}

export function removeProcessSheet(data: AutomationDiscoveryData, processId: string): AutomationDiscoveryData {
  return {
    ...data,
    processes: data.processes.filter(p => p.id !== processId),
    updatedAt: new Date().toISOString()
  };
}

export function addDiscoverySystem(
  data: AutomationDiscoveryData,
  partial: Partial<Omit<DiscoverySystem, 'id'>> & { name: string }
): AutomationDiscoveryData {
  const system: DiscoverySystem = {
    id: newId('sys'),
    name: partial.name.trim(),
    type: partial.type ?? 'ERP',
    areasUsing: partial.areasUsing?.trim() ?? '',
    purpose: partial.purpose?.trim() ?? '',
    technicalOwner: partial.technicalOwner?.trim() ?? '',
    hasApi: partial.hasApi ?? 'Não sei',
    dataQuality: partial.dataQuality ?? 3,
    hasPersonalDataLgpd: partial.hasPersonalDataLgpd ?? 'Não',
    securityRestrictions: partial.securityRestrictions?.trim() ?? '',
    notes: partial.notes?.trim() ?? ''
  };
  return {
    ...data,
    systems: [...data.systems, system],
    updatedAt: new Date().toISOString()
  };
}

export function updateDiscoverySystem(
  data: AutomationDiscoveryData,
  systemId: string,
  patch: Partial<Omit<DiscoverySystem, 'id'>>
): AutomationDiscoveryData {
  return {
    ...data,
    systems: data.systems.map(s => (s.id === systemId ? { ...s, ...patch } : s)),
    updatedAt: new Date().toISOString()
  };
}

export function removeDiscoverySystem(data: AutomationDiscoveryData, systemId: string): AutomationDiscoveryData {
  return {
    ...data,
    systems: data.systems.filter(s => s.id !== systemId),
    updatedAt: new Date().toISOString()
  };
}

export function addAutomationOpportunity(
  data: AutomationDiscoveryData,
  partial: Partial<Omit<AutomationOpportunity, 'id'>> & { title: string; processId: string }
): AutomationDiscoveryData {
  const id = nextOpportunityId(data.opportunities);
  const linkedProcess = data.processes.find(p => p.id === partial.processId);
  const opp: AutomationOpportunity = {
    id,
    title: partial.title.trim(),
    processId: partial.processId,
    solutionType: partial.solutionType ?? linkedProcess?.candidateSolution ?? 'Automação n8n',
    automatizableFraction: partial.automatizableFraction ?? 0.6,
    otherGains: partial.otherGains?.trim() ?? '',
    impact: partial.impact,
    effort: partial.effort,
    risk: partial.risk,
    dataReadiness: partial.dataReadiness,
    roadmapWave: partial.roadmapWave ?? '0–30 dias',
    ownerSponsor: partial.ownerSponsor?.trim() ?? '',
    nextStep: partial.nextStep?.trim() ?? '',
    status: partial.status ?? 'Mapeada'
  };
  return {
    ...data,
    opportunities: [...data.opportunities, opp],
    updatedAt: new Date().toISOString()
  };
}

export function updateAutomationOpportunity(
  data: AutomationDiscoveryData,
  opportunityId: string,
  patch: Partial<Omit<AutomationOpportunity, 'id'>>
): AutomationDiscoveryData {
  return {
    ...data,
    opportunities: data.opportunities.map(o => (o.id === opportunityId ? { ...o, ...patch } : o)),
    updatedAt: new Date().toISOString()
  };
}

export function removeAutomationOpportunity(
  data: AutomationDiscoveryData,
  opportunityId: string
): AutomationDiscoveryData {
  return {
    ...data,
    opportunities: data.opportunities.filter(o => o.id !== opportunityId),
    updatedAt: new Date().toISOString()
  };
}

// =============================================================================================
// 6. Cálculos do Inventário de Processos e das Oportunidades (Fórmulas idênticas à Planilha)
// =============================================================================================

export interface ComputedProcessInventoryRow {
  process: ProcessSheet;
  answeredCount: number;
  hasFourGoldenNumbers: boolean;
  headerBadge: string; // ex: '21 de 22 respondidas · 4 números ok' ou '10 de 22 respondidas · faltam números'
  description: string; // Gatilho → Etapas → Entrega final
  hoursPerMonth: number; // (volume * standardMinutes) / 60
  effectiveHourlyCost: number; // customHourlyCost ?? premises.loadedHourlyCost
  monthlyCost: number; // hoursPerMonth * effectiveHourlyCost
  exceptionBottleneckPeak: string;
  hoursPerPersonPerMonth: number;
  exceedsMonthlyWorkdayLimit: boolean; // > 176h por pessoa/mês
}

export function computeProcessInventoryRow(
  process: ProcessSheet,
  premises: DiscoveryPremises
): ComputedProcessInventoryRow {
  let answeredCount = 0;
  for (const q of PROCESS_SHEET_22_QUESTIONS) {
    const val = process[q.field];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      answeredCount++;
    }
  }

  const hasVolume = typeof process.monthlyVolume === 'number' && process.monthlyVolume > 0;
  const hasMinutes = typeof process.standardMinutes === 'number' && process.standardMinutes > 0;
  const hasPeople = typeof process.peopleInvolved === 'number' && process.peopleInvolved > 0;
  const hasExceptionRate = typeof process.exceptionRate === 'number' && process.exceptionRate >= 0;

  const hasFourGoldenNumbers = hasVolume && hasMinutes && hasPeople && hasExceptionRate;
  const headerBadge = `${answeredCount} de 22 respondidas · ${
    hasFourGoldenNumbers ? '4 números ok' : 'faltam números'
  }`;

  const descParts = [process.trigger, process.mainSteps, process.finalDeliverable]
    .map(s => s?.trim())
    .filter(Boolean);
  const description = descParts.join(' → ');

  // Regra conservadora do Guia do Consultor: Horas/mês usa apenas o tempo do caso padrão (Q8 * Q9 / 60)
  const hoursPerMonth =
    hasVolume && hasMinutes ? ((process.monthlyVolume as number) * (process.standardMinutes as number)) / 60 : 0;

  const effectiveHourlyCost =
    typeof process.customHourlyCost === 'number' && process.customHourlyCost > 0
      ? process.customHourlyCost
      : premises.loadedHourlyCost;

  const monthlyCost = hoursPerMonth * effectiveHourlyCost;

  const excParts: string[] = [];
  if (typeof process.exceptionMinutes === 'number' && process.exceptionMinutes > 0) {
    excParts.push(`Exceção: ${process.exceptionMinutes} min`);
  }
  if (process.bottlenecks?.trim()) {
    excParts.push(`Gargalo: ${process.bottlenecks.trim()}`);
  }
  if (process.seasonality?.trim()) {
    excParts.push(`Pico: ${process.seasonality.trim()}`);
  }
  const exceptionBottleneckPeak = excParts.join(' | ');

  const hoursPerPersonPerMonth =
    hasPeople && (process.peopleInvolved as number) > 0 ? hoursPerMonth / (process.peopleInvolved as number) : 0;

  const exceedsMonthlyWorkdayLimit = hoursPerPersonPerMonth > 176;

  return {
    process,
    answeredCount,
    hasFourGoldenNumbers,
    headerBadge,
    description,
    hoursPerMonth,
    effectiveHourlyCost,
    monthlyCost,
    exceptionBottleneckPeak,
    hoursPerPersonPerMonth,
    exceedsMonthlyWorkdayLimit
  };
}

export interface ComputedOpportunityRow {
  opportunity: AutomationOpportunity;
  linkedProcess?: ProcessSheet;
  area: string;
  processName: string;
  currentHoursPerMonth: number;
  releasedHoursPerMonth: number;
  estimatedMonthlyGain: number;
  estimatedAnnualGain: number;
  score: number | null;
  quadrant: OpportunityQuadrant | null;
  ranking: number | null;
  exceeds80PercentWarning: boolean;
}

export function classifyQuadrant(
  impact: number | undefined,
  effort: number | undefined,
  premises: DiscoveryPremises
): OpportunityQuadrant | null {
  if (typeof impact !== 'number' || typeof effort !== 'number') return null;
  if (impact >= premises.highImpactCutoff && effort <= premises.lowEffortCutoff) {
    return 'Quick win';
  }
  if (impact >= premises.highImpactCutoff && effort > premises.lowEffortCutoff) {
    return 'Projeto estratégico';
  }
  if (impact < premises.highImpactCutoff && effort <= premises.lowEffortCutoff) {
    return 'Melhoria incremental';
  }
  return 'Rever / backlog';
}

export function computeOpportunityScore(
  opp: AutomationOpportunity,
  premises: DiscoveryPremises
): number | null {
  if (
    typeof opp.impact !== 'number' ||
    typeof opp.effort !== 'number' ||
    typeof opp.risk !== 'number' ||
    typeof opp.dataReadiness !== 'number'
  ) {
    return null;
  }
  const raw =
    opp.impact * premises.weightImpact +
    opp.dataReadiness * premises.weightDataReadiness +
    (6 - opp.effort) * premises.weightEffort +
    (6 - opp.risk) * premises.weightRisk;
  return Math.round(raw * 100) / 100;
}

export function computeOpportunitiesTable(
  data: AutomationDiscoveryData
): ComputedOpportunityRow[] {
  const processMap = new Map<string, ComputedProcessInventoryRow>();
  for (const p of data.processes) {
    processMap.set(p.id, computeProcessInventoryRow(p, data.premises));
  }

  const rows: ComputedOpportunityRow[] = data.opportunities.map(opp => {
    const procRow = processMap.get(opp.processId);
    const currentHoursPerMonth = procRow ? procRow.hoursPerMonth : 0;
    const processMonthlyCost = procRow ? procRow.monthlyCost : 0;
    const fraction = Math.max(0, Math.min(1, opp.automatizableFraction || 0));
    const releasedHoursPerMonth = currentHoursPerMonth * fraction;
    const estimatedMonthlyGain = processMonthlyCost * fraction;
    const estimatedAnnualGain = estimatedMonthlyGain * 12;
    const score = computeOpportunityScore(opp, data.premises);
    const quadrant = classifyQuadrant(opp.impact, opp.effort, data.premises);

    return {
      opportunity: opp,
      linkedProcess: procRow?.process,
      area: procRow?.process.area || '',
      processName: procRow?.process.name || '',
      currentHoursPerMonth,
      releasedHoursPerMonth,
      estimatedMonthlyGain,
      estimatedAnnualGain,
      score,
      quadrant,
      ranking: null,
      exceeds80PercentWarning: fraction > 0.8
    };
  });

  // Ranking: 1 = maior score entre oportunidades não descartadas com score válido; empate desempatado pela ordem na lista
  const activeScored = rows
    .map((r, index) => ({ r, index }))
    .filter(item => item.r.opportunity.status !== 'Descartada' && item.r.score !== null)
    .sort((a, b) => {
      const diff = (b.r.score as number) - (a.r.score as number);
      return diff !== 0 ? diff : a.index - b.index;
    });

  activeScored.forEach((item, rankIdx) => {
    item.r.ranking = rankIdx + 1;
  });

  return rows;
}

// =============================================================================================
// 7. Priorização (Matriz Impacto × Esforço, Top 10) & Resumo Executivo do Discovery
// =============================================================================================

export interface QuadrantSummary {
  quadrant: OpportunityQuadrant;
  meaning: string;
  count: number;
  annualGain: number;
}

export interface AreaSummaryRow {
  area: string;
  status: string;
  mappedProcessesCount: number;
  currentHoursPerMonth: number;
  opportunitiesCount: number;
  releasedHoursPerMonth: number;
  estimatedAnnualGain: number;
}

export interface WaveSummaryRow {
  wave: RoadmapWave;
  opportunitiesCount: number;
  releasedHoursPerMonth: number;
  estimatedAnnualGain: number;
}

export interface SolutionTypeSummaryRow {
  solutionType: CandidateSolutionType;
  opportunitiesCount: number;
  releasedHoursPerMonth: number;
  estimatedAnnualGain: number;
}

export interface DuplicateProcessAllocationWarning {
  processId: string;
  processName: string;
  totalFraction: number;
  opportunityIds: string[];
}

export interface DiscoverySummaryReport {
  scopedAreasCount: number;
  interviewedAreasCount: number; // Realizada ou Consolidada
  mappedProcessesCount: number;
  totalMappedHoursPerMonth: number;
  totalMonthlyProcessCost: number;
  activeOpportunitiesCount: number;
  totalReleasedHoursPerMonth: number;
  totalEstimatedMonthlyGain: number;
  totalEstimatedAnnualGain: number;
  equivalentFteReleased: number; // totalReleasedHoursPerMonth / 176
  quickWinsCount: number;
  quadrants: QuadrantSummary[];
  top10Opportunities: ComputedOpportunityRow[];
  byArea: AreaSummaryRow[];
  byWave: WaveSummaryRow[];
  bySolutionType: SolutionTypeSummaryRow[];
  overAllocatedProcesses: DuplicateProcessAllocationWarning[];
}

export function computeDiscoverySummary(data: AutomationDiscoveryData): DiscoverySummaryReport {
  const namedAreas = data.areas.filter(a => a.name.trim().length > 0);
  const namedProcesses = data.processes.filter(p => p.name.trim().length > 0);
  const inventoryRows = namedProcesses.map(p => computeProcessInventoryRow(p, data.premises));
  const oppRows = computeOpportunitiesTable(data);
  const activeOpps = oppRows.filter(
    r => r.opportunity.title.trim().length > 0 && r.opportunity.status !== 'Descartada'
  );

  const scopedAreasCount = namedAreas.length;
  const interviewedAreasCount = namedAreas.filter(
    a => a.status === 'Realizada' || a.status === 'Consolidada'
  ).length;
  const mappedProcessesCount = inventoryRows.length;
  const totalMappedHoursPerMonth = inventoryRows.reduce((acc, r) => acc + r.hoursPerMonth, 0);
  const totalMonthlyProcessCost = inventoryRows.reduce((acc, r) => acc + r.monthlyCost, 0);

  const activeOpportunitiesCount = activeOpps.length;
  const totalReleasedHoursPerMonth = activeOpps.reduce((acc, r) => acc + r.releasedHoursPerMonth, 0);
  const totalEstimatedMonthlyGain = activeOpps.reduce((acc, r) => acc + r.estimatedMonthlyGain, 0);
  const totalEstimatedAnnualGain = activeOpps.reduce((acc, r) => acc + r.estimatedAnnualGain, 0);
  const equivalentFteReleased = totalReleasedHoursPerMonth / 176;

  const quadrantDefs: { quadrant: OpportunityQuadrant; meaning: string }[] = [
    { quadrant: 'Quick win', meaning: 'Alto impacto e baixo esforço — priorizar nos primeiros 30 dias' },
    { quadrant: 'Projeto estratégico', meaning: 'Alto impacto e alto esforço — planejar para 31–90 dias' },
    { quadrant: 'Melhoria incremental', meaning: 'Baixo impacto e baixo esforço — fazer se sobrar capacidade' },
    { quadrant: 'Rever / backlog', meaning: 'Baixo impacto e alto esforço — evitar agora' }
  ];

  const quadrants: QuadrantSummary[] = quadrantDefs.map(def => {
    const matches = activeOpps.filter(r => r.quadrant === def.quadrant);
    return {
      quadrant: def.quadrant,
      meaning: def.meaning,
      count: matches.length,
      annualGain: matches.reduce((acc, r) => acc + r.estimatedAnnualGain, 0)
    };
  });

  const quickWinsCount = quadrants.find(q => q.quadrant === 'Quick win')?.count ?? 0;

  const top10Opportunities = [...activeOpps]
    .filter(r => r.ranking !== null)
    .sort((a, b) => (a.ranking as number) - (b.ranking as number))
    .slice(0, 10);

  // Resumo por área (inclui áreas cadastradas e áreas avulsas mencionadas em processos)
  const areaNames = Array.from(
    new Set([
      ...namedAreas.map(a => a.name.trim()),
      ...namedProcesses.map(p => p.area.trim()).filter(Boolean)
    ])
  );

  const byArea: AreaSummaryRow[] = areaNames.map(areaName => {
    const areaObj = namedAreas.find(a => plain(a.name) === plain(areaName));
    const procs = inventoryRows.filter(r => plain(r.process.area) === plain(areaName));
    const opps = activeOpps.filter(r => plain(r.area) === plain(areaName));
    return {
      area: areaName,
      status: areaObj?.status ?? 'A agendar',
      mappedProcessesCount: procs.length,
      currentHoursPerMonth: procs.reduce((acc, r) => acc + r.hoursPerMonth, 0),
      opportunitiesCount: opps.length,
      releasedHoursPerMonth: opps.reduce((acc, r) => acc + r.releasedHoursPerMonth, 0),
      estimatedAnnualGain: opps.reduce((acc, r) => acc + r.estimatedAnnualGain, 0)
    };
  });

  const waves: RoadmapWave[] = ['0–30 dias', '31–60 dias', '61–90 dias', 'Backlog'];
  const byWave: WaveSummaryRow[] = waves.map(wave => {
    const opps = activeOpps.filter(r => r.opportunity.roadmapWave === wave);
    return {
      wave,
      opportunitiesCount: opps.length,
      releasedHoursPerMonth: opps.reduce((acc, r) => acc + r.releasedHoursPerMonth, 0),
      estimatedAnnualGain: opps.reduce((acc, r) => acc + r.estimatedAnnualGain, 0)
    };
  });

  const solutionTypes: CandidateSolutionType[] = [
    'Automação n8n',
    'Agente de IA',
    'Assistente Claude',
    'Analytics / BI',
    'Redesenho de processo'
  ];
  const bySolutionType: SolutionTypeSummaryRow[] = solutionTypes.map(solutionType => {
    const opps = activeOpps.filter(r => r.opportunity.solutionType === solutionType);
    return {
      solutionType,
      opportunitiesCount: opps.length,
      releasedHoursPerMonth: opps.reduce((acc, r) => acc + r.releasedHoursPerMonth, 0),
      estimatedAnnualGain: opps.reduce((acc, r) => acc + r.estimatedAnnualGain, 0)
    };
  });

  // Checa se mais de uma oportunidade aponta para o mesmo processo somando > 100% de automação
  const allocByProc = new Map<string, { totalFraction: number; opportunityIds: string[] }>();
  for (const r of activeOpps) {
    if (!r.opportunity.processId) continue;
    const prev = allocByProc.get(r.opportunity.processId) ?? { totalFraction: 0, opportunityIds: [] };
    prev.totalFraction += r.opportunity.automatizableFraction || 0;
    prev.opportunityIds.push(r.opportunity.id);
    allocByProc.set(r.opportunity.processId, prev);
  }
  const overAllocatedProcesses: DuplicateProcessAllocationWarning[] = [];
  for (const [processId, info] of allocByProc.entries()) {
    if (info.totalFraction > 1.001) {
      const proc = namedProcesses.find(p => p.id === processId);
      overAllocatedProcesses.push({
        processId,
        processName: proc?.name || processId,
        totalFraction: info.totalFraction,
        opportunityIds: info.opportunityIds
      });
    }
  }

  return {
    scopedAreasCount,
    interviewedAreasCount,
    mappedProcessesCount,
    totalMappedHoursPerMonth,
    totalMonthlyProcessCost,
    activeOpportunitiesCount,
    totalReleasedHoursPerMonth,
    totalEstimatedMonthlyGain,
    totalEstimatedAnnualGain,
    equivalentFteReleased,
    quickWinsCount,
    quadrants,
    top10Opportunities,
    byArea,
    byWave,
    bySolutionType,
    overAllocatedProcesses
  };
}

// =============================================================================================
// 8. Checklist de Qualidade Antes do Readout (12 verificações obrigatórias do Guia do Consultor)
// =============================================================================================

export interface ReadoutQualityCheckItem {
  number: number;
  label: string;
  passed: boolean;
  detail: string;
}

export function evaluateReadoutQualityChecklist(
  data: AutomationDiscoveryData
): ReadoutQualityCheckItem[] {
  const summary = computeDiscoverySummary(data);
  const namedAreas = data.areas.filter(a => a.name.trim().length > 0);
  const namedProcesses = data.processes.filter(p => p.name.trim().length > 0);
  const invRows = namedProcesses.map(p => computeProcessInventoryRow(p, data.premises));
  const oppRows = computeOpportunitiesTable(data);
  const activeOpps = oppRows.filter(
    r => r.opportunity.title.trim().length > 0 && r.opportunity.status !== 'Descartada'
  );

  // 1. Todas as áreas do escopo estão com status Consolidada
  const unconsolidatedAreas = namedAreas.filter(a => a.status !== 'Consolidada');
  const check1: ReadoutQualityCheckItem = {
    number: 1,
    label: 'Todas as áreas do escopo estão com status Consolidada na Ficha da Área',
    passed: namedAreas.length > 0 && unconsolidatedAreas.length === 0,
    detail:
      namedAreas.length === 0
        ? 'Nenhuma área cadastrada'
        : unconsolidatedAreas.length === 0
          ? `${namedAreas.length} área(s) consolidada(s)`
          : `${unconsolidatedAreas.length} área(s) pendente(s): ${unconsolidatedAreas.map(a => a.name).join(', ')}`
  };

  // 2. Todas as fichas de processo têm "4 números ok"
  const missingNumbers = invRows.filter(r => !r.hasFourGoldenNumbers);
  const check2: ReadoutQualityCheckItem = {
    number: 2,
    label: 'Todas as fichas de processo preenchidas têm "4 números ok" no cabeçalho',
    passed: invRows.length > 0 && missingNumbers.length === 0,
    detail:
      invRows.length === 0
        ? 'Nenhum processo cadastrado'
        : missingNumbers.length === 0
          ? `Todos os ${invRows.length} processos com 4 números ok`
          : `Faltam números em: ${missingNumbers.map(r => r.process.id).join(', ')}`
  };

  // 3. Os volumes mensais dos 10 maiores processos foram conferidos
  const topProcesses = [...invRows].sort((a, b) => b.hoursPerMonth - a.hoursPerMonth).slice(0, 10);
  const check3: ReadoutQualityCheckItem = {
    number: 3,
    label: 'Os volumes mensais dos 10 maiores processos estão preenchidos e conferidos',
    passed: topProcesses.length > 0 && topProcesses.every(r => r.hoursPerMonth > 0),
    detail:
      topProcesses.length === 0
        ? 'Sem processos mapeados'
        : `${topProcesses.length} maiores processos somam ${Math.round(topProcesses.reduce((a, b) => a + b.hoursPerMonth, 0))} h/mês`
  };

  // 4. Nenhum processo consome mais de 176 horas/mês por pessoa sem justificativa
  const over176 = invRows.filter(r => r.exceedsMonthlyWorkdayLimit);
  const check4: ReadoutQualityCheckItem = {
    number: 4,
    label: 'Nenhum processo consome mais de 176 horas/mês por pessoa (sanidade de jornada)',
    passed: over176.length === 0,
    detail:
      over176.length === 0
        ? 'Dentro do limite de 176h/pessoa/mês'
        : `Atenção (>176h/pessoa): ${over176.map(r => `${r.process.id} (${Math.round(r.hoursPerPersonPerMonth)}h/pessoa)`).join(', ')}`
  };

  // 5. Nenhuma oportunidade ativa está com ID do processo vazio ou inválido
  const invalidProcOpps = activeOpps.filter(r => !r.linkedProcess || !r.linkedProcess.name.trim());
  const check5: ReadoutQualityCheckItem = {
    number: 5,
    label: 'Nenhuma oportunidade está com ID do processo vazio ou inválido',
    passed: activeOpps.length > 0 && invalidProcOpps.length === 0,
    detail:
      activeOpps.length === 0
        ? 'Nenhuma oportunidade ativa'
        : invalidProcOpps.length === 0
          ? 'Todas as oportunidades vinculadas a processos válidos'
          : `Vínculo inválido em: ${invalidProcOpps.map(r => r.opportunity.id).join(', ')}`
  };

  // 6. Nenhum % automatizável está acima de 80% sem revisão técnica
  const over80 = activeOpps.filter(r => r.exceeds80PercentWarning);
  const check6: ReadoutQualityCheckItem = {
    number: 6,
    label: 'Nenhum % automatizável está acima de 80% sem revisão técnica',
    passed: over80.length === 0,
    detail:
      over80.length === 0
        ? 'Todos os percentuais <= 80% (conservador)'
        : `Acima de 80%: ${over80.map(r => `${r.opportunity.id} (${Math.round(r.opportunity.automatizableFraction * 100)}%)`).join(', ')}`
  };

  // 7. Nenhum processo tem duas oportunidades somando mais de 100% das horas
  const check7: ReadoutQualityCheckItem = {
    number: 7,
    label: 'Nenhum processo tem múltiplas oportunidades somando mais de 100% das horas',
    passed: summary.overAllocatedProcesses.length === 0,
    detail:
      summary.overAllocatedProcesses.length === 0
        ? 'Sem dupla contagem de horas em processos'
        : `Soma > 100% em: ${summary.overAllocatedProcesses.map(w => `${w.processId} (${Math.round(w.totalFraction * 100)}%)`).join(', ')}`
  };

  // 8. Oportunidades descartadas estão com status Descartada
  const discardedCount = data.opportunities.filter(o => o.status === 'Descartada').length;
  const check8: ReadoutQualityCheckItem = {
    number: 8,
    label: 'Oportunidades descartadas estão marcadas como "Descartada" (fora dos totais)',
    passed: true,
    detail:
      discardedCount > 0
        ? `${discardedCount} oportunidade(s) descartada(s) excluída(s) dos cálculos`
        : 'Nenhuma oportunidade descartada até o momento'
  };

  // 9. Pesos do score na Capa somam 100%
  const weightCheck = validatePremisesWeights(data.premises);
  const check9: ReadoutQualityCheckItem = {
    number: 9,
    label: 'Os pesos do score na Capa somam 100% ("OK (soma 100%)")',
    passed: weightCheck.isValid,
    detail: weightCheck.message
  };

  // 10. Custo-hora na Capa tem fonte anotada
  const hasCostSource =
    data.premises.loadedHourlyCost > 0 && data.premises.hourlyCostSource.trim().length > 0;
  const check10: ReadoutQualityCheckItem = {
    number: 10,
    label: 'O custo-hora na Capa tem fonte anotada (RH, controladoria ou estimativa)',
    passed: hasCostSource,
    detail: hasCostSource
      ? `R$ ${data.premises.loadedHourlyCost}/h (${data.premises.hourlyCostSource})`
      : 'Preencha o custo-hora e a fonte na aba Capa'
  };

  // 11. Distribuição da matriz Impacto × Esforço é plausível (Quick wins <= 50% quando há >= 4 oportunidades)
  const qwRatio = activeOpps.length >= 4 ? summary.quickWinsCount / activeOpps.length : 0;
  const check11: ReadoutQualityCheckItem = {
    number: 11,
    label: 'A distribuição da matriz Impacto × Esforço é plausível (sem inflar Quick Wins)',
    passed: activeOpps.length > 0 && qwRatio <= 0.5,
    detail:
      activeOpps.length === 0
        ? 'Sem oportunidades avaliadas'
        : qwRatio <= 0.5
          ? `${summary.quickWinsCount} Quick Win(s) de ${activeOpps.length} oportunidades (${Math.round(qwRatio * 100)}%)`
          : `Mais da metade (${Math.round(qwRatio * 100)}%) são Quick Wins — revise as notas de esforço`
  };

  // 12. As 5 prioridades do roadmap têm dono/sponsor e próximo passo definidos
  const top5 = summary.top10Opportunities.slice(0, 5);
  const missingOwnerOrStep = top5.filter(
    r => !r.opportunity.ownerSponsor.trim() || !r.opportunity.nextStep.trim()
  );
  const check12: ReadoutQualityCheckItem = {
    number: 12,
    label: 'As 5 prioridades do roadmap têm dono/sponsor e próximo passo definidos',
    passed: top5.length > 0 && missingOwnerOrStep.length === 0,
    detail:
      top5.length === 0
        ? 'Nenhuma oportunidade pontuada com as 4 notas (1 a 5)'
        : missingOwnerOrStep.length === 0
          ? `Top ${top5.length} prioridades com dono e próximo passo preenchidos`
          : `Preencher dono/próximo passo em: ${missingOwnerOrStep.map(r => r.opportunity.id).join(', ')}`
  };

  return [
    check1,
    check2,
    check3,
    check4,
    check5,
    check6,
    check7,
    check8,
    check9,
    check10,
    check11,
    check12
  ];
}

// =============================================================================================
// 9. Skill `discovery-preencher-planilha`: Extração da Transcrição (Regras Locais + IA)
// =============================================================================================

export interface TranscriptExtractionSummary {
  data: AutomationDiscoveryData;
  source: 'offline' | 'ai';
  addedAreas: number;
  updatedScriptNotes: number;
  addedProcesses: number;
  addedSystems: number;
  addedOpportunities: number;
}

/**
 * Converte menções de tempo da fala em volume mensal e minutos por execução.
 * Regra do Guia do Consultor: se o entrevistado disse apenas "gasto 40 horas no mês nisso",
 * registra volume = 1 e minutos = 2400 para que a fórmula `volume * minutos / 60` resulte em 40h/mês.
 */
export function parseSpokenVolumeAndMinutes(text: string): {
  frequency?: ProcessFrequency;
  monthlyVolume?: number;
  standardMinutes?: number;
  peopleInvolved?: number;
  exceptionRate?: number;
} {
  const result: {
    frequency?: ProcessFrequency;
    monthlyVolume?: number;
    standardMinutes?: number;
    peopleInvolved?: number;
    exceptionRate?: number;
  } = {};

  if (/\b(todo dia|todos os dias|diariament|diaria|por dia)\b/i.test(text)) {
    result.frequency = 'Diária';
  } else if (/\b(toda semana|semanal|por semana)\b/i.test(text)) {
    result.frequency = 'Semanal';
  } else if (/\b(quinzenal|a cada 15 dias)\b/i.test(text)) {
    result.frequency = 'Quinzenal';
  } else if (/\b(todo mes|mensal|fechamento do mes|por mes)\b/i.test(text)) {
    result.frequency = 'Mensal';
  }

  const peopleMatch = /(\d{1,3})\s*(?:pessoas|analistas|compradores|operadores|assistentes|colaboradores)/i.exec(text);
  if (peopleMatch) {
    result.peopleInvolved = Number(peopleMatch[1]);
  }

  const excMatch = /(\d{1,2})\s*%\s*(?:de excec|fogem|excecao|erro|problema|fora do padrao)/i.exec(plain(text));
  if (excMatch) {
    result.exceptionRate = Number(excMatch[1]) / 100;
  }

  const volPerMonthMatch = /(\d{1,5})\s*(?:vezes|casos|notas|pedidos|chamados|clientes|cadastros|itens)?\s*por\s*m[eê]s/i.exec(text);
  const volPerDayMatch = /(\d{1,4})\s*(?:vezes|casos|notas|pedidos|chamados|clientes|cadastros|itens)?\s*por\s*dia/i.exec(text);
  const minMatch = /(\d{1,3})\s*minutos?\b/i.exec(text);
  const hoursMonthTotalMatch = /(\d{1,3})\s*horas?\s*(?:no\s*m[eê]s|por\s*m[eê]s|mensais)/i.exec(text);

  if (volPerMonthMatch) {
    result.monthlyVolume = Number(volPerMonthMatch[1]);
  } else if (volPerDayMatch) {
    result.monthlyVolume = Number(volPerDayMatch[1]) * 22;
    result.frequency = result.frequency ?? 'Diária';
  }

  if (minMatch) {
    result.standardMinutes = Number(minMatch[1]);
  }

  // Regra "40 horas no mês" -> volume = 1, minutos = horas * 60
  if (!result.monthlyVolume && !result.standardMinutes && hoursMonthTotalMatch) {
    const hours = Number(hoursMonthTotalMatch[1]);
    result.monthlyVolume = 1;
    result.standardMinutes = hours * 60;
    result.frequency = result.frequency ?? 'Mensal';
  }

  return result;
}

const KNOWN_SYSTEM_PATTERNS: { pattern: RegExp; name: string; type: SystemCategory }[] = [
  { pattern: /\b(sap|totvs|protheus|winthor|consinco|sankhya|senior|linx|erp)\b/i, name: 'ERP', type: 'ERP' },
  { pattern: /\b(wms)\b/i, name: 'WMS', type: 'WMS' },
  { pattern: /\b(pdv|frente de caixa)\b/i, name: 'PDV', type: 'PDV' },
  { pattern: /\b(salesforce|hubspot|rd station|pipedrive|crm)\b/i, name: 'CRM', type: 'CRM' },
  { pattern: /\b(power\s*bi|metabase|looker|tableau|qlik)\b/i, name: 'Power BI / BI', type: 'BI' },
  { pattern: /\b(excel|planilha|google sheets)\b/i, name: 'Planilha Excel / Sheets', type: 'Planilha' },
  { pattern: /\b(whatsapp|zap)\b/i, name: 'WhatsApp', type: 'Comunicação' },
  { pattern: /\b(e-mail|email|outlook|gmail)\b/i, name: 'E-mail', type: 'Comunicação' },
  { pattern: /\b(portal|sefaz)\b/i, name: 'Portal Externo / SEFAZ', type: 'Portal externo' }
];

export function extractAutomationDiscoveryOffline(
  currentData: AutomationDiscoveryData,
  session: MeetingSession
): TranscriptExtractionSummary {
  let next = ensureAutomationDiscovery({
    id: 'tmp',
    name: currentData.premises.clientName,
    description: '',
    createdAt: '',
    updatedAt: '',
    sessions: [],
    okrs: [],
    epics: [],
    prd: {} as any,
    leanCanvas: {} as any,
    decisionLog: [],
    automationDiscovery: currentData
  });

  const fullText = session.rawTranscript.map(s => s.text).join('\n');
  let addedAreas = 0;
  let updatedScriptNotes = 0;
  let addedProcesses = 0;
  let addedSystems = 0;
  let addedOpportunities = 0;

  // 1. Garante uma Área para a sessão se ainda não houver nenhuma
  let targetArea = next.areas[0];
  if (!targetArea) {
    const inferredAreaName = session.title.replace(/^entrevista\s*[-:–]?\s*/i, '').trim() || 'Área Entrevistada';
    next = addDiscoveryArea(next, {
      name: inferredAreaName,
      managerName: session.participants[0] ?? '',
      interviewDate: session.date || new Date().toISOString().slice(0, 10),
      status: session.rawTranscript.length > 0 ? 'Realizada' : 'Agendada',
      declaredPain: session.painPoints[0]?.description ?? ''
    });
    targetArea = next.areas[next.areas.length - 1];
    addedAreas++;
  }

  // 2. Mapeia sistemas citados na conversa sem inventar dados
  const existingSystemNames = new Set(next.systems.map(s => plain(s.name)));
  const detectedSystems: string[] = [];
  for (const sys of KNOWN_SYSTEM_PATTERNS) {
    if (sys.pattern.test(fullText)) {
      detectedSystems.push(sys.name);
      if (!existingSystemNames.has(plain(sys.name))) {
        const hasLgpd = /\b(cpf|rg|salario|dados pessoais|lgpd|cliente pessoa fisica)\b/i.test(fullText) ? 'Sim' : 'Não';
        next = addDiscoverySystem(next, {
          name: sys.name,
          type: sys.type,
          areasUsing: targetArea.name,
          purpose: 'Citado na transcrição da entrevista',
          hasApi: 'Não sei',
          dataQuality: 3,
          hasPersonalDataLgpd: hasLgpd
        });
        existingSystemNames.add(plain(sys.name));
        addedSystems++;
      }
    }
  }

  // 3. Cria processos a partir de etapas da jornada ou falas com números/dores
  const parsedNumbers = parseSpokenVolumeAndMinutes(fullText);
  const existingProcNames = new Set(next.processes.map(p => plain(p.name)));

  const candidateSteps =
    session.userFlowSteps.length > 0
      ? session.userFlowSteps.slice(0, 5)
      : session.painPoints.slice(0, 3).map((p, idx) => ({
          id: p.id,
          stepNumber: idx + 1,
          title: p.description.slice(0, 60),
          actor: targetArea.role || 'Analista da área',
          systemAction: p.description,
          painPointDetected: p.description,
          frictionLevel: 'critical' as const,
          quote: p.quote
        }));

  for (const step of candidateSteps) {
    const procName = step.title.trim();
    if (!procName || existingProcNames.has(plain(procName))) continue;

    const stepText = `${step.title} ${step.systemAction} ${step.painPointDetected ?? ''} ${step.quote ?? ''}`;
    const stepNums = parseSpokenVolumeAndMinutes(stepText);
    const structured: YesPartialNo = /\b(pdf|foto|whatsapp|audio|texto livre|papel)\b/i.test(stepText)
      ? 'Não'
      : 'Parcial';

    next = addProcessSheet(next, {
      area: targetArea.name,
      name: procName,
      trigger: `Início da atividade (${step.actor || 'time'})`,
      mainSteps: step.systemAction || procName,
      finalDeliverable: ' Etapa concluída no fluxo da área',
      ownerRole: step.actor || '',
      frequency: stepNums.frequency ?? parsedNumbers.frequency ?? 'Diária',
      monthlyVolume: stepNums.monthlyVolume ?? parsedNumbers.monthlyVolume,
      standardMinutes: stepNums.standardMinutes ?? parsedNumbers.standardMinutes,
      peopleInvolved: stepNums.peopleInvolved ?? parsedNumbers.peopleInvolved,
      exceptionRate: stepNums.exceptionRate ?? parsedNumbers.exceptionRate,
      systemsUsed: detectedSystems.join(', '),
      dataInputFormat: structured === 'Não' ? 'Documentos / mensagens desestruturadas' : 'Sistemas e planilhas da área',
      structuredData: structured,
      documentedRules: 'Parcial',
      bottlenecks: step.painPointDetected ?? '',
      literalPainQuote: step.quote ?? session.painPoints[0]?.quote ?? '',
      candidateSolution: suggestSolutionTypeForProcess({
        name: procName,
        mainSteps: step.systemAction,
        dataInputFormat: stepText,
        structuredData: structured,
        documentedRules: 'Parcial'
      })
    });
    existingProcNames.add(plain(procName));
    addedProcesses++;

    // 4. Para cada processo com dor/oportunidade, cria oportunidade candidata (sem inventar notas 1 a 5)
    const createdProc = next.processes[next.processes.length - 1];
    const oppTitle = `${createdProc.candidateSolution} para ${createdProc.name} (com revisão humana nas exceções)`;
    next = addAutomationOpportunity(next, {
      title: oppTitle,
      processId: createdProc.id,
      solutionType: createdProc.candidateSolution,
      automatizableFraction: 0.6,
      otherGains: step.painPointDetected ? `Reduzir gargalo: ${step.painPointDetected}` : 'Redução de retrabalho manual',
      roadmapWave: '0–30 dias',
      status: 'Mapeada'
    });
    addedOpportunities++;
  }

  // 5. Registra anotações chave no Roteiro 2h da área
  if (session.painPoints.length > 0) {
    const painSummary = session.painPoints.map(p => `${p.description}${p.quote ? ` ("${p.quote}")` : ''}`).join(' | ');
    next = saveAreaScriptAnswer(next, targetArea.id, '5.2', painSummary);
    updatedScriptNotes++;
  }
  if (detectedSystems.length > 0) {
    next = saveAreaScriptAnswer(next, targetArea.id, '4.1', `Sistemas identificados: ${detectedSystems.join(', ')}`);
    updatedScriptNotes++;
  }

  // Marca item 8 e 13 do checklist como Em andamento / Feito quando há transcrição
  if (session.rawTranscript.length > 0) {
    next = updateChecklistItem(next, 8, { status: 'Feito' });
    next = updateChecklistItem(next, 13, { status: 'Em andamento' });
  }

  return {
    data: next,
    source: 'offline',
    addedAreas,
    updatedScriptNotes,
    addedProcesses,
    addedSystems,
    addedOpportunities
  };
}

export async function extractAutomationDiscoveryWithAI(
  currentData: AutomationDiscoveryData,
  session: MeetingSession,
  callAi?: AiTextCaller
): Promise<TranscriptExtractionSummary> {
  if (!callAi || session.rawTranscript.length === 0) {
    return extractAutomationDiscoveryOffline(currentData, session);
  }

  const transcriptText = session.rawTranscript
    .map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
    .join('\n');

  const systemPrompt = `Você é um consultor sênior executando a skill "discovery-preencher-planilha" da metodologia Discovery de IA e Automação.
REGRAS DE OURO:
1. NUNCA invente números que não foram ditos na transcrição. Se volume, minutos, pessoas ou % de exceção não foram ditos, retorne null nesses campos.
2. Se o entrevistado disse horas totais por mês (ex.: "gasto 40 horas no mês nisso") sem dizer volume e minutos separados, converta em monthlyVolume = 1 e standardMinutes = horas * 60 (ex.: 2400).
3. Frase da dor (literalPainQuote) deve usar as palavras literais do entrevistado.
4. Deixe as notas de 1 a 5 das oportunidades em branco (não invente scores sem validação do consultor).
5. Retorne APENAS um JSON válido com a estrutura:
{
  "area": { "name": "...", "managerName": "...", "role": "...", "headcount": 0, "mainKpis": "...", "declaredPain": "..." },
  "scriptAnswers": { "2.2": "...", "3.1": "...", "4.1": "...", "5.2": "...", "6.1": "..." },
  "processes": [
    {
      "name": "Verbo + objeto",
      "trigger": "...",
      "mainSteps": "...",
      "finalDeliverable": "...",
      "ownerRole": "...",
      "frequency": "Diária",
      "monthlyVolume": null,
      "standardMinutes": null,
      "peopleInvolved": null,
      "exceptionRate": null,
      "systemsUsed": "...",
      "dataInputFormat": "...",
      "structuredData": "Sim | Parcial | Não",
      "documentedRules": "Sim | Parcial | Não",
      "bottlenecks": "...",
      "errorImpact": "...",
      "literalPainQuote": "...",
      "seasonality": "...",
      "candidateSolution": "Automação n8n | Agente de IA | Assistente Claude | Analytics / BI | Redesenho de processo"
    }
  ],
  "systems": [
    { "name": "...", "type": "ERP | WMS | PDV | CRM | BI | Planilha | Portal externo | Comunicação | RH | Outro", "purpose": "...", "hasApi": "Sim | Não | Não sei", "hasPersonalDataLgpd": "Sim | Não" }
  ],
  "opportunities": [
    { "title": "O que faz, sobre qual processo e onde fica o controle humano", "processName": "...", "solutionType": "Automação n8n", "automatizableFraction": 0.6, "otherGains": "..." }
  ]
}`;

  try {
    const raw = await callAi(systemPrompt, `Título da sessão: ${session.title}\nTranscrição:\n${transcriptText}`, 0.2);
    const parsed = parseJsonLoose(raw) as any;
    if (!parsed || typeof parsed !== 'object') {
      return extractAutomationDiscoveryOffline(currentData, session);
    }

    let next = currentData;
    let addedAreas = 0;
    let updatedScriptNotes = 0;
    let addedProcesses = 0;
    let addedSystems = 0;
    let addedOpportunities = 0;

    const areaName = parsed.area?.name?.trim() || session.title || 'Área Entrevistada';
    let targetArea = next.areas.find(a => plain(a.name) === plain(areaName));
    if (!targetArea) {
      next = addDiscoveryArea(next, {
        name: areaName,
        managerName: parsed.area?.managerName || '',
        role: parsed.area?.role || '',
        headcount: Number(parsed.area?.headcount) || 0,
        mainKpis: parsed.area?.mainKpis || '',
        declaredPain: parsed.area?.declaredPain || '',
        interviewDate: session.date || new Date().toISOString().slice(0, 10),
        status: 'Realizada'
      });
      targetArea = next.areas[next.areas.length - 1];
      addedAreas++;
    }

    if (parsed.scriptAnswers && typeof parsed.scriptAnswers === 'object') {
      for (const [qNum, ans] of Object.entries(parsed.scriptAnswers)) {
        if (typeof ans === 'string' && ans.trim()) {
          next = saveAreaScriptAnswer(next, targetArea.id, qNum, ans.trim());
          updatedScriptNotes++;
        }
      }
    }

    if (Array.isArray(parsed.systems)) {
      const existingSys = new Set(next.systems.map(s => plain(s.name)));
      for (const s of parsed.systems) {
        if (!s?.name || existingSys.has(plain(s.name))) continue;
        next = addDiscoverySystem(next, {
          name: s.name,
          type: s.type || 'Outro',
          areasUsing: targetArea.name,
          purpose: s.purpose || '',
          hasApi: s.hasApi === 'Sim' || s.hasApi === 'Não' ? s.hasApi : 'Não sei',
          hasPersonalDataLgpd: s.hasPersonalDataLgpd === 'Sim' ? 'Sim' : 'Não'
        });
        existingSys.add(plain(s.name));
        addedSystems++;
      }
    }

    if (Array.isArray(parsed.processes)) {
      for (const p of parsed.processes) {
        if (!p?.name) continue;
        next = addProcessSheet(next, {
          area: targetArea.name,
          name: p.name,
          trigger: p.trigger || '',
          mainSteps: p.mainSteps || '',
          finalDeliverable: p.finalDeliverable || '',
          ownerRole: p.ownerRole || '',
          frequency: p.frequency || 'Diária',
          monthlyVolume: typeof p.monthlyVolume === 'number' ? p.monthlyVolume : undefined,
          standardMinutes: typeof p.standardMinutes === 'number' ? p.standardMinutes : undefined,
          peopleInvolved: typeof p.peopleInvolved === 'number' ? p.peopleInvolved : undefined,
          exceptionRate: typeof p.exceptionRate === 'number' ? p.exceptionRate : undefined,
          systemsUsed: p.systemsUsed || '',
          dataInputFormat: p.dataInputFormat || '',
          structuredData: p.structuredData === 'Sim' || p.structuredData === 'Não' ? p.structuredData : 'Parcial',
          documentedRules: p.documentedRules === 'Sim' || p.documentedRules === 'Não' ? p.documentedRules : 'Parcial',
          bottlenecks: p.bottlenecks || '',
          errorImpact: p.errorImpact || '',
          literalPainQuote: p.literalPainQuote || '',
          seasonality: p.seasonality || '',
          candidateSolution: p.candidateSolution || undefined
        });
        addedProcesses++;
      }
    }

    if (Array.isArray(parsed.opportunities)) {
      for (const o of parsed.opportunities) {
        if (!o?.title) continue;
        const matchedProc =
          next.processes.find(p => o.processName && plain(p.name) === plain(o.processName)) ??
          next.processes[next.processes.length - 1];
        if (!matchedProc) continue;
        next = addAutomationOpportunity(next, {
          title: o.title,
          processId: matchedProc.id,
          solutionType: o.solutionType || matchedProc.candidateSolution,
          automatizableFraction:
            typeof o.automatizableFraction === 'number' ? o.automatizableFraction : 0.6,
          otherGains: o.otherGains || '',
          status: 'Mapeada'
        });
        addedOpportunities++;
      }
    }

    return {
      data: next,
      source: 'ai',
      addedAreas,
      updatedScriptNotes,
      addedProcesses,
      addedSystems,
      addedOpportunities
    };
  } catch {
    return extractAutomationDiscoveryOffline(currentData, session);
  }
}

// =============================================================================================
// 10. Skill `discovery-readout-executivo`: Relatório Executivo de Readout (8 seções + Anexos)
// =============================================================================================

const brl = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function generateExecutiveReadoutMarkdown(data: AutomationDiscoveryData): string {
  const summary = computeDiscoverySummary(data);
  const invRows = data.processes
    .filter(p => p.name.trim().length > 0)
    .map(p => computeProcessInventoryRow(p, data.premises))
    .sort((a, b) => b.hoursPerMonth - a.hoursPerMonth);

  const client = data.premises.clientName || 'Cliente';
  const period = data.premises.discoveryPeriod || 'Período atual';
  const consultant = data.premises.consultant || 'Consultoria de IA & Automação';

  const top5 = summary.top10Opportunities.slice(0, 5);
  const wave030 = summary.byWave.find(w => w.wave === '0–30 dias');

  const lines: string[] = [
    `# Diagnóstico de Oportunidades de IA e Automação — ${client}`,
    ``,
    `**Período:** ${period} | **Responsável:** ${consultant} | **Data:** ${new Date().toLocaleDateString('pt-BR')}`,
    ``,
    `---`,
    ``,
    `## 1. Sumário Executivo`,
    ``,
    `> **Manchete Executiva:** O discovery mapeou **${summary.mappedProcessesCount} processos** em **${summary.scopedAreasCount} área(s)** (${Math.round(summary.totalMappedHoursPerMonth)} h/mês, equivalente a ${brl(summary.totalMonthlyProcessCost)}/mês em tempo operacional) e identificou **${summary.activeOpportunitiesCount} oportunidades de IA e automação** com potencial de liberar **${Math.round(summary.totalReleasedHoursPerMonth)} horas/mês** (**${summary.equivalentFteReleased.toFixed(1)} FTE equivalentes** em capacidade liberada) e **${brl(summary.totalEstimatedAnnualGain)}/ano** em produtividade.`,
    ``,
    `### Cinco Indicadores do Discovery`,
    `- **Áreas entrevistadas:** ${summary.interviewedAreasCount} de ${summary.scopedAreasCount}`,
    `- **Processos mapeados:** ${summary.mappedProcessesCount} (${Math.round(summary.totalMappedHoursPerMonth)} horas/mês)`,
    `- **Oportunidades priorizadas:** ${summary.activeOpportunitiesCount} (${summary.quickWinsCount} Quick Wins)`,
    `- **Capacidade liberável:** ${Math.round(summary.totalReleasedHoursPerMonth)} horas/mês (${summary.equivalentFteReleased.toFixed(1)} FTE equivalentes)`,
    `- **Ganho anual estimado em capacidade liberada:** ${brl(summary.totalEstimatedAnnualGain)}/ano`,
    ``,
    `### Recomendação e Decisão Pedida à Diretoria`,
    `- Aprovar o início imediato da **Onda 1 (0–30 dias)** com **${wave030?.opportunitiesCount ?? 0} iniciativa(s)** e potencial de liberar **${Math.round(wave030?.releasedHoursPerMonth ?? 0)} h/mês** (${brl(wave030?.estimatedAnnualGain ?? 0)}/ano).`,
    `- Confirmar os patrocinadores (sponsors) das 5 prioridades e liberar os acessos técnicos de leitura/API junto à TI.`,
    ``,
    `## 2. Escopo, Método e Premissas`,
    ``,
    `- **Método:** Entrevistas estruturadas de 2 horas por área com gestor e executor, observação de tela, inventário dos 4 números por processo e priorização ponderada.`,
    `- **Custo-hora carregado utilizado:** R$ ${data.premises.loadedHourlyCost}/h (*Fonte: ${data.premises.hourlyCostSource}*).`,
    `- **Regra de cálculo:** $\\text{Horas/mês} = (\\text{Volume mensal} \\times \\text{Minutos no caso padrão}) \\div 60$. Os tempos de exceção são documentados separadamente para manter a estimativa conservadora e defensável.`,
    `- **Pesos do Score (1 a 5):** Impacto ${(data.premises.weightImpact * 100).toFixed(0)}%, Dados prontos ${(data.premises.weightDataReadiness * 100).toFixed(0)}%, Esforço invertido ${(data.premises.weightEffort * 100).toFixed(0)}%, Risco invertido ${(data.premises.weightRisk * 100).toFixed(0)}%.`,
    ``,
    `## 3. Onde o Tempo Está Hoje`,
    ``,
    `| Área | Status | Processos | Horas atuais/mês | Oportunidades | Horas liberáveis/mês | Ganho anual (R$) |`,
    `|---|---|---:|---:|---:|---:|---:|`,
    ...summary.byArea.map(
      a =>
        `| ${a.area} | ${a.status} | ${a.mappedProcessesCount} | ${Math.round(a.currentHoursPerMonth)} h | ${a.opportunitiesCount} | ${Math.round(a.releasedHoursPerMonth)} h | ${brl(a.estimatedAnnualGain)} |`
    ),
    ``,
    `### Maiores Processos Mapeados e Voz do Time`,
    ...invRows.slice(0, 8).map(
      r =>
        `- **${r.process.id} — ${r.process.name}** (${r.process.area}): **${Math.round(r.hoursPerMonth)} h/mês** (${brl(r.monthlyCost)}/mês)${
          r.process.literalPainQuote ? ` — *"${r.process.literalPainQuote}"*` : ''
        }`
    ),
    ``,
    `## 4. Mapa de Oportunidades (Matriz Impacto × Esforço)`,
    ``,
    `| Quadrante | Significado | Qtd. Oportunidades | Ganho Anual Estimado |`,
    `|---|---|---:|---:|`,
    ...summary.quadrants.map(
      q => `| **${q.quadrant}** | ${q.meaning} | ${q.count} | ${brl(q.annualGain)} |`
    ),
    ``,
    `### Por Tipo de Solução`,
    `| Tipo de Solução | Oportunidades | Horas liberáveis/mês | Ganho Anual Estimado |`,
    `|---|---:|---:|---:|`,
    ...summary.bySolutionType.map(
      s =>
        `| ${s.solutionType} | ${s.opportunitiesCount} | ${Math.round(s.releasedHoursPerMonth)} h | ${brl(s.estimatedAnnualGain)} |`
    ),
    ``,
    `## 5. As Cinco Prioridades`,
    ``,
    ...(top5.length === 0
      ? [`*Preencha as 4 notas (Impacto, Esforço, Risco e Dados) nas oportunidades para ranquear as 5 prioridades.*`]
      : top5.flatMap(r => [
          `### #${r.ranking} — ${r.opportunity.id}: ${r.opportunity.title}`,
          `- **Processo base:** ${r.opportunity.processId} (${r.processName} — ${r.area})`,
          `- **Tipo de solução:** ${r.opportunity.solutionType} | **Quadrante:** ${r.quadrant} | **Score:** ${r.score?.toFixed(2)}`,
          `- **Capacidade liberada:** ${Math.round(r.releasedHoursPerMonth)} h/mês de ${Math.round(r.currentHoursPerMonth)} h/mês (${Math.round(r.opportunity.automatizableFraction * 100)}% automatizável) → **${brl(r.estimatedAnnualGain)}/ano**`,
          `- **Outros ganhos:** ${r.opportunity.otherGains || 'Redução de erro e maior velocidade operacional'}`,
          `- **Dono / Sponsor:** ${r.opportunity.ownerSponsor || 'A definir'} | **Próximo passo:** ${r.opportunity.nextStep || 'A definir'}`,
          ``
        ])),
    `## 6. Roadmap de 90 Dias`,
    ``,
    `| Onda | Oportunidades | Horas liberáveis/mês | Ganho Anual Estimado |`,
    `|---|---:|---:|---:|`,
    ...summary.byWave.map(
      w =>
        `| **${w.wave}** | ${w.opportunitiesCount} | ${Math.round(w.releasedHoursPerMonth)} h | ${brl(w.estimatedAnnualGain)} |`
    ),
    ``,
    `## 7. Dados, Sistemas e Governança (LGPD)`,
    ``,
    ...(data.systems.length === 0
      ? [`*Nenhum sistema cadastrado na aba Sistemas e Dados.*`]
      : [
          `| Sistema | Tipo | Áreas | Tem API? | Qualidade (1–5) | Dados pessoais (LGPD)? | Restrições / Dono técnico |`,
          `|---|---|---|---|---:|---|---|`,
          ...data.systems.map(
            s =>
              `| ${s.name} | ${s.type} | ${s.areasUsing} | ${s.hasApi} | ${s.dataQuality} | ${s.hasPersonalDataLgpd} | ${s.technicalOwner || '—'} ${s.securityRestrictions ? `(${s.securityRestrictions})` : ''} |`
          )
        ]),
    ``,
    `## 8. Decisão e Próximos Passos`,
    ``,
    `1. **Aprovar o escopo da Onda 1 (0–30 dias)** e validar os sponsors de negócio.`,
    `2. **Liberar acessos técnicos e credenciais de homologação** junto aos responsáveis de TI dos sistemas mapeados.`,
    `3. **Definir o rito semanal de acompanhamento** dos pilotos com medição antes/depois das horas liberadas.`
  ];

  return lines.join('\n');
}

export function exportProcessesInventoryToCsv(data: AutomationDiscoveryData): string {
  const headers = [
    'ID',
    'Área',
    'Processo',
    'Descrição (Gatilho -> Etapas -> Entrega)',
    'Dono (Cargo)',
    'Frequência',
    'Volume/mês',
    'Min/execução (padrão)',
    'Pessoas',
    'Horas/mês',
    'Custo/hora (R$)',
    'Custo mensal (R$)',
    '% Exceção',
    'Exceção / Gargalo / Pico',
    'Sistemas usados',
    'Entrada de dados',
    'Dado estruturado?',
    'Regra clara?',
    'Impacto do erro',
    'Frase literal da dor',
    'Solução candidata',
    'Status da Ficha'
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === undefined || val === null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = data.processes
    .filter(p => p.name.trim().length > 0)
    .map(p => {
      const r = computeProcessInventoryRow(p, data.premises);
      return [
        p.id,
        p.area,
        p.name,
        r.description,
        p.ownerRole,
        p.frequency,
        p.monthlyVolume ?? '',
        p.standardMinutes ?? '',
        p.peopleInvolved ?? '',
        r.hoursPerMonth.toFixed(1),
        r.effectiveHourlyCost.toFixed(2),
        r.monthlyCost.toFixed(2),
        p.exceptionRate !== undefined ? `${Math.round(p.exceptionRate * 100)}%` : '',
        r.exceptionBottleneckPeak,
        p.systemsUsed,
        p.dataInputFormat,
        p.structuredData,
        p.documentedRules,
        p.errorImpact,
        p.literalPainQuote,
        p.candidateSolution,
        r.headerBadge
      ].map(escapeCsv).join(';');
    });

  return [headers.map(escapeCsv).join(';'), ...rows].join('\n');
}

// =============================================================================================
// 11. Ponte com o Backlog (Transforma Oportunidades Priorizadas em Propostas E8.4)
// =============================================================================================

export function proposeAutomationOpportunitiesToBacklog(
  project: DiscoveryProject,
  data: AutomationDiscoveryData
): Proposal[] {
  const rows = computeOpportunitiesTable(data).filter(
    r => r.opportunity.title.trim().length > 0 && r.opportunity.status !== 'Descartada'
  );
  if (rows.length === 0) return [];

  const storiesByWave = new Map<RoadmapWave, UserStory[]>();
  for (const r of rows) {
    const wave = r.opportunity.roadmapWave;
    const list = storiesByWave.get(wave) ?? [];
    list.push({
      id: newId('us'),
      featureId: '',
      title: `${r.opportunity.id} — ${r.opportunity.title}`,
      asA: r.linkedProcess?.ownerRole || `Gestor de ${r.area || 'Operações'}`,
      iWantTo: `implementar ${r.opportunity.solutionType} no processo "${r.processName || r.opportunity.processId}"`,
      soThat: `liberemos ${Math.round(r.releasedHoursPerMonth)} h/mês (${brl(r.estimatedAnnualGain)}/ano) com controle humano`,
      storyPoints: r.opportunity.effort ? Math.max(1, r.opportunity.effort * 2) : 5,
      acceptanceCriteria: [
        {
          id: newId('ac'),
          scenario: `Automação de ${Math.round(r.opportunity.automatizableFraction * 100)}% do processo ${r.opportunity.processId}`,
          given: `que o processo "${r.processName || r.opportunity.processId}" consome ${Math.round(r.currentHoursPerMonth)} h/mês`,
          when: `a solução (${r.opportunity.solutionType}) processar os casos padrão`,
          then: `as exceções são encaminhadas para revisão humana (${r.opportunity.ownerSponsor || 'responsável da área'})`
        }
      ],
      tasks: [
        {
          id: newId('tsk'),
          title: r.opportunity.nextStep || `Configurar fluxo e integração para ${r.opportunity.id}`,
          type: 'backend',
          status: 'todo'
        }
      ]
    });
    storiesByWave.set(wave, list);
  }

  const features: Feature[] = [];
  for (const [wave, stories] of storiesByWave.entries()) {
    const featureId = newId('feat');
    features.push({
      id: featureId,
      epicId: '',
      title: `Onda Roadmap ${wave} — IA & Automação`,
      description: `Entregas priorizadas para a janela de ${wave} no Discovery de IA e Automação.`,
      valueProposition: `Liberar horas operacionais e reduzir retrabalho na onda ${wave}.`,
      effort: wave === '0–30 dias' ? 'S' : wave === '31–60 dias' ? 'M' : 'L',
      userStories: stories.map(s => ({ ...s, featureId }))
    });
  }

  const epicId = newId('epic');
  const candidateEpic: Epic = {
    id: epicId,
    title: 'Roadmap de IA e Automação (90 dias)',
    objective: 'Transformar os processos mapeados no Discovery em automações n8n, agentes e assistentes de IA.',
    businessValue: 'Capacidade operacional liberada com retorno medido em horas/mês e R$/ano.',
    status: 'discovery',
    features: features.map(f => ({ ...f, epicId }))
  };

  return planBacklogProposals(
    { okrs: project.okrs, epics: project.epics, prd: project.prd },
    { okrs: [], epics: [candidateEpic], prd: project.prd }
  );
}
