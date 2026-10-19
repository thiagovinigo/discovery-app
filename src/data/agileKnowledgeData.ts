export interface AgileMethodItem {
  id: string;
  category: 'scale' | 'discovery' | 'facilitation' | 'ai_superpowers';
  title: string;
  creatorOrOrigin: string;
  badge: string;
  icon: string;
  summary: string;
  whenToUse: string;
  coreConcepts: string[];
  stepByStep: string[];
  practicalExample: string;
  aiPromptTemplate?: string;
}

export const AGILE_KNOWLEDGE_BASE: AgileMethodItem[] = [
  // ==========================================
  // 🌐 FRAMEWORKS ÁGEIS DE ESCALA
  // ==========================================
  {
    id: 'scale-safe',
    category: 'scale',
    title: 'SAFe 6.0 (Scaled Agile Framework)',
    creatorOrOrigin: 'Dean Leffingwell / Scaled Agile, Inc.',
    badge: 'Enterprise Scale',
    icon: '🏢',
    summary: 'O framework de escala mais adotado por grandes corporações globais. Organiza múltiplos times (50 a 125+ pessoas) em torno de trens de entrega contínua de valor (Agile Release Trains - ARTs).',
    whenToUse: 'Quando a organização tem mais de 5 a 10 squads trabalhando no mesmo produto/solução, com dependências arquiteturais complexas, orçamentos corporativos e necessidade de alinhamento estratégico trimestral.',
    coreConcepts: [
      'Agile Release Train (ART): Equipe de equipes alinhada a um fluxo de valor comum.',
      'PI Planning (Program Increment Planning): Evento de 2 dias onde todos os times planejam juntos o próximo trimestre (8 a 12 semanas) e mapeiam dependências.',
      'WSJF (Weighted Shortest Job First): Fórmula matemática de priorização pelo Custo do Atraso dividido pela Duração do Trabalho.',
      'Lean Portfolio Management (LPM): Gestão de investimentos orientada a horizontes e orçamentos dinâmicos.'
    ],
    stepByStep: [
      '1. Definir o Fluxo de Valor Operacional e de Desenvolvimento (Value Streams).',
      '2. Lançar o primeiro Agile Release Train (ART) com 5 a 12 squads.',
      '3. Executar o evento trimestral de PI Planning com visão executiva e objetivos de PI.',
      '4. Monitorar o System Demo e sincronizar os times via Scrum of Scrums e PO Sync.',
      '5. Conduzir a sessão de Inspect & Adapt (I&A) ao final do PI para melhoria contínua.'
    ],
    practicalExample: 'Um banco com 12 squads migrando sua infraestrutura de pagamentos uniu todos os times em um PI Planning presencial de 2 dias. Descobriram 14 dependências críticas de segurança e arquitetura antes de escrever qualquer código, evitando 3 meses de retrabalho.',
    aiPromptTemplate: `Você é um SAFe Practice Consultant (SPC). Analise o seguinte Épico/Iniciativa e calcule o WSJF detalhado (User-Business Value + Time Criticality + Risk Reduction / Job Size) e mapeie as principais dependências entre squads que devem entrar no Program Board do PI Planning:\n\n[INSERIR INICIATIVA AQUI]`
  },
  {
    id: 'scale-flight-levels',
    category: 'scale',
    title: 'Flight Levels (Níveis de Voo)',
    creatorOrOrigin: 'Klaus Leopold',
    badge: 'Coordenação Sistêmica',
    icon: '✈️',
    summary: 'Framework focado em como o trabalho FLUI entre os times, e não em reorganizar pessoas em novas estruturas burocráticas. Baseado no princípio de que "times ágeis isolados não tornam a empresa ágil".',
    whenToUse: 'Quando cada squad é ágil individualmente, mas a entrega para o cliente continua lenta porque os gargalos acontecem NAS PASSAGENS DE BASTÃO entre os times e na falta de priorização estratégica.',
    coreConcepts: [
      'Flight Level 1 (Nível Operacional): Onde o trabalho é executado (squads, boards de desenvolvimento).',
      'Flight Level 2 (Coordenação entre Times): Onde as dependências entre diferentes squads são gerenciadas para entregar produtos ponta a ponta.',
      'Flight Level 3 (Direcionamento Estratégico): Onde os OKRs, apostas estratégicas e investimentos da liderança são decididos e monitorados.',
      'Loops de Feedback: Cadências de alinhamento vertical e horizontal conectando os 3 níveis.'
    ],
    stepByStep: [
      '1. Mapear o fluxo de valor de ponta a ponta: do pedido do cliente à entrega.',
      '2. Criar o Board de Coordenação (Flight Level 2) com as iniciativas cross-squad.',
      '3. Limitar o Trabalho em Progresso (WIP) no nível 2 para evitar que 20 projetos comecem ao mesmo tempo.',
      '4. Estabelecer reuniões de sincronização rápidas entre representantes dos squads no Board L2.',
      '5. Conectar o L2 com o portfólio estratégico (L3) para garantir que apenas o essencial seja puxado.'
    ],
    practicalExample: 'Uma empresa de SaaS tinha 8 squads com velocidade alta, mas os clientes esperavam 9 meses por uma feature completa. Ao criar um quadro de Flight Level 2 para visualizar dependências entre front, back, mobile e dados, reduziram o tempo de entrega para 4 semanas sem mexer no organograma da empresa.',
    aiPromptTemplate: `Você é um Flight Levels Coach. Analise as iniciativas em andamento na empresa e estruture um Flight Level 2 (Coordenação entre Times) identificando os gargalos nas transições de bastão e limites de WIP recomendados:\n\n[INSERIR FLUXO E SQUADS AQUI]`
  },
  {
    id: 'scale-spotify',
    category: 'scale',
    title: 'Modelo Spotify (Tribos, Squads, Chapters e Guilds)',
    creatorOrOrigin: 'Henrik Kniberg & Anders Ivarsson (Spotify)',
    badge: 'Cultura & Autonomia',
    icon: '🎧',
    summary: 'Estrutura matricial pioneira focada em manter a cultura de startup e autonomia de squads mesmo após o crescimento para centenas de desenvolvedores.',
    whenToUse: 'Quando a empresa precisa balancear máxima autonomia para cada squad resolver problemas com alinhamento técnico e governança de carreira sem criar silos funcionais rígidos.',
    coreConcepts: [
      'Squad: Unidade básica multifuncional (PO, Designer, Devs, QA) responsável por uma missão específica.',
      'Tribe (Tribo): Conjunto de squads (máximo 100-150 pessoas, número de Dunbar) operando no mesmo domínio de negócio.',
      'Chapter (Capítulo): Linha de competência técnica (ex: Chapter de iOS, Chapter de QA) liderada pelo Chapter Lead para desenvolvimento de carreira.',
      'Guild (Guilda): Comunidade de interesse voluntária que cruza toda a empresa (ex: Guilda de IA, Guilda de Segurança).'
    ],
    stepByStep: [
      '1. Dividir a organização em Squads com missões de longo prazo orientadas a outcomes.',
      '2. Agrupar squads correlatos em Tribos lideradas por um Trio de Tribo (Produto, Engenharia e Design).',
      '3. Formar Chapters para que os especialistas tenham mentoria técnica e plano de desenvolvimento.',
      '4. Estimular Guildas para disseminação de boas práticas e inovações transversais.',
      '5. Fomentar alinhamento com rituais de Demo de Tribo e Hack Days.'
    ],
    practicalExample: 'No aplicativo do Spotify, a Squad "Search" cuida apenas da busca, enquanto a Squad "Playlist" cuida das listas. Os desenvolvedores iOS de ambas as squads se encontram semanalmente no Chapter de iOS para garantir consistência de código e arquitetura.',
    aiPromptTemplate: `Você é um consultor organizacional ágil. Baseado nos domínios do nosso produto, proponha um desenho de Squads, Tribos e Chapters detalhando missões, papéis e interfaces de comunicação:\n\n[DESCREVER PRODUTO E EQUIPES]`
  },
  {
    id: 'scale-less',
    category: 'scale',
    title: 'LeSS (Large-Scale Scrum)',
    creatorOrOrigin: 'Craig Larman & Bas Vodde',
    badge: 'Desescalada & Simplicidade',
    icon: '⚡',
    summary: 'Princípio de "mais com menos": em vez de criar novas camadas gerenciais para escalar, o LeSS defende manter o Scrum puro, com MÚLTIPLOS TIMES compartilhando um ÚNICO Backlog de Produto e um ÚNICO Product Owner.',
    whenToUse: 'Quando você quer evitar a burocracia pesada de frameworks tradicionais e busca que 2 a 8 squads colaborem diretamente no mesmo backlog sem intermediários ou sobrecarga de papéis.',
    coreConcepts: [
      'Um único Product Owner para múltiplos times de desenvolvimento.',
      'Um único Product Backlog priorizado.',
      'Sprint Planning compartilhado (Parte 1 juntos, Parte 2 por time).',
      'Overall Sprint Review e Overall Retrospective para alinhar o sistema como um todo.'
    ],
    stepByStep: [
      '1. Consolidar todos os backlogs individuais dos times em uma única lista priorizada.',
      '2. Designar um único PO responsável pelo valor global do produto.',
      '3. Conduzir o Sprint Planning 1 com representantes de todos os times para dividir itens.',
      '4. Times realizam refinamento conjunto (Multi-Team PBR) para entender dependências.',
      '5. Entregar um incremento único integrado e potencialmente publicável a cada Sprint.'
    ],
    practicalExample: 'Uma empresa com 4 squads que tinham 4 backlogs conflitantes adotou LeSS. Eliminaram reuniões duplicadas e passaram a ter um único alinhamento semanal com o PO, aumentando a entrega de funcionalidades prioritárias em 40%.',
    aiPromptTemplate: `Você é um coach de LeSS (Large-Scale Scrum). Como estruturar um Sprint Planning compartilhado e um único Backlog para 4 squads que hoje trabalham em silos? Detalhe a facilitação e a governança:\n\n[CONTEXTO DOS TIMES]`
  },

  // ==========================================
  // 🎯 MÉTODOS DE PRODUCT DISCOVERY & DELIVERY
  // ==========================================
  {
    id: 'disc-continuous-discovery',
    category: 'discovery',
    title: 'Continuous Discovery Habits & OST',
    creatorOrOrigin: 'Teresa Torres',
    badge: 'Hábito Semanal de Pesquisa',
    icon: '🌳',
    summary: 'Transforma o discovery de um projeto pontual para um hábito semanal contínuo realizado pelo Product Trio (PM, Designer e Tech Lead), conectando métricas de negócio a oportunidades e soluções com a Opportunity Solution Tree.',
    whenToUse: 'Sempre! É a metodologia fundamental para evitar o viés da solução e garantir que o time fale semanalmente com clientes reais antes de comprometer horas de desenvolvimento.',
    coreConcepts: [
      'Product Trio: PM, Designer e Tech Lead descobrindo juntos desde o primeiro minuto.',
      'Opportunity Solution Tree (OST): Outcome (Objetivo) ➔ Oportunidades (Dores) ➔ Soluções ➔ Experimentos de Suposição.',
      'Story-based Interviewing: Pedir histórias reais passadas em vez de opiniões ou pedidos de features.',
      'Assumption Testing: Testar as premissas mais arriscadas (valor, usabilidade, viabilidade, tecnologia) em 24h a 48h antes de codificar.'
    ],
    stepByStep: [
      '1. Definir o Outcome de Negócio claro (ex: Aumentar retenção de D7 em 15%).',
      '2. Conduzir pelo menos 1 a 2 conversas com clientes por semana com o Product Trio.',
      '3. Mapear as dores em nós de Oportunidades na árvore OST.',
      '4. Gerar 3 a 5 ideias de solução diferentes para cada oportunidade escolhida.',
      '5. Isolar as premissas não testadas e rodar experimentos lean rápidos.'
    ],
    practicalExample: 'Em vez de criar um formulário gigante de onboarding porque a diretoria pediu, o time entrevistou 3 clientes, descobriu que o medo real era receber cobrança indevida, testou um aviso de "Zero cobrança no trial" e a conversão saltou 32% sem alterar o fluxo.',
    aiPromptTemplate: `Você é Teresa Torres. Com base no seguinte objetivo de negócio e falas de clientes, construa uma Opportunity Solution Tree (OST) completa e desenhe 2 testes de premissas arriscadas de até 48 horas:\n\n[OBJETIVO E ENTREVISTAS]`
  },
  {
    id: 'disc-dual-track',
    category: 'discovery',
    title: 'Dual-Track Agile (Discovery & Delivery)',
    creatorOrOrigin: 'Marty Cagan & Jeff Patton',
    badge: 'Fluxos Paralelos',
    icon: '🔄',
    summary: 'Divide o trabalho do time de produto em duas trilhas contínuas e simultâneas: Trilha de Descoberta (validar o que construir) e Trilha de Entrega (construir com qualidade, escala e confiabilidade).',
    whenToUse: 'Quando os desenvolvedores reclamam que o backlog chega mal refinado ou o PM sente que a equipe gasta semanas codificando features que ninguém usa.',
    coreConcepts: [
      'Trilha 1: Discovery (Rápido, barato, focado em mitigar 4 riscos: Valor, Usabilidade, Viabilidade Técnica e Viabilidade de Negócio).',
      'Trilha 2: Delivery (Robusto, testado, com código de produção, escalável e documentado).',
      'Engenheiros participam ativamente do Discovery para avaliar viabilidade técnica imediata.'
    ],
    stepByStep: [
      '1. O Product Trio atua no Discovery validando hipóteses com protótipos e entrevistas.',
      '2. Itens validados e sem incerteza migram para o Delivery Backlog com critérios de aceite BDD prontos.',
      '3. Durante as Sprints de Delivery, os desenvolvedores constroem as histórias refinadas.',
      '4. O time retroalimenta o Discovery com dados de telemetria e métricas do que foi lançado.'
    ],
    practicalExample: 'Enquanto o time de desenvolvimento codifica o checkout PIX na Sprint 12 (Delivery), o PM e a Designer testam protótipos de Parcelamento no Cartão com 5 clientes (Discovery), garantindo trabalho pronto para a Sprint 13.',
    aiPromptTemplate: `Você é Marty Cagan. Analise o seguinte roadmap e separe quais itens devem entrar na Trilha de Discovery (com experimentos de viabilidade) e quais já estão prontos para a Trilha de Delivery (com critérios de engenharia):\n\n[ITENS DO ROADMAP]`
  },
  {
    id: 'disc-lean-inception',
    category: 'discovery',
    title: 'Lean Inception & Canvas MVP',
    creatorOrOrigin: 'Paulo Caroli (Thoughtworks)',
    badge: 'Alinhamento em 1 Semana',
    icon: '💡',
    summary: 'Workshop colaborativo de uma semana que une stakeholders de negócio e o time técnico para definir o Produto Mínimo Viável (MVP) e a sequência de ondas de entrega.',
    whenToUse: 'No início de um novo produto ou grande iniciativa estratégica, quando há muitos stakeholders com visões divergentes sobre o que é prioridade e o que deve sair na primeira versão.',
    coreConcepts: [
      'Visão do Produto (É / Não É / Faz / Não Faz).',
      'Mapeamento de Personas e suas Jornadas.',
      'Brainstorming e Nivelamento de Funcionalidades (Cores do Semáforo: Esforço, Valor e Certeza).',
      'Sequenciador de Ondas e Canvas MVP.'
    ],
    stepByStep: [
      '1. Segunda-feira: Kickoff e Visão do Produto.',
      '2. Terça-feira: Personas e Jornadas do Usuário.',
      '3. Quarta-feira: Brainstorming de Funcionalidades e Escala de Esforço/Valor/Incerteza.',
      '4. Quinta-feira: Sequenciador de Ondas (Onda 1 = MVP, Onda 2, Onda 3).',
      '5. Sexta-feira: Canvas MVP e Showcase para diretoria.'
    ],
    practicalExample: 'Um grande varejista demorou 1 ano discutindo o novo e-commerce mobile. Rodaram uma Lean Inception de 5 dias e saíram com um escopo de MVP de 3 meses focado apenas no carrinho de compras, aprovado por unanimidade pelos diretores.',
    aiPromptTemplate: `Você é Paulo Caroli. Facilite a criação do Canvas MVP para o seguinte desafio. Estruture: Proposta do MVP, Personas atendidas, Jornadas, Funcionalidades da Onda 1, Resultado esperado e Métricas para validar as hipóteses do negócio:\n\n[DESAFIO]`
  },
  {
    id: 'disc-pbb',
    category: 'discovery',
    title: 'Product Backlog Building (PBB)',
    creatorOrOrigin: 'Fábio Aguiar',
    badge: 'Do MVP às Histórias',
    icon: '🧱',
    summary: 'O elo perfeito entre o Discovery e o Delivery. Pega o Canvas MVP e fatias de funcionalidades e decompõe visualmente em Passos da Persona, PBIs (Product Backlog Items) e User Stories com critérios BDD.',
    whenToUse: 'Imediatamente após uma Lean Inception ou quando o time tem funcionalidades de negócio de alto nível e precisa quebrar em histórias de usuário pequenas prontas para o Jira.',
    coreConcepts: [
      'Estrutura em Funil: Persona ➔ Funcionalidade ➔ Passos da Ação ➔ PBIs ➔ Histórias.',
      'Fatiamento por fluxo de interação da persona.',
      'Escrevendo Histórias no padrão INVEST com critérios Given/When/Then desde o nascimento.'
    ],
    stepByStep: [
      '1. Trazer a funcionalidade priorizada no MVP (ex: Checkout com PIX).',
      '2. Identificar os passos cronológicos da persona Maria para completar a tarefa.',
      '3. Para cada passo, derivar os PBIs (itens de software necessários).',
      '4. Redigir a User Story ("Como Maria, Quero... Para que...").',
      '5. Validar critérios de aceite BDD com o time técnico.'
    ],
    practicalExample: 'Para a funcionalidade "Notificação de Divergência", o PBB dividiu em 3 passos: 1. Exibir badge na tela inicial, 2. Enviar email com tabela de divergência, 3. Disparar webhook para o ERP. Cada passo virou uma história de 2 a 3 pontos.',
    aiPromptTemplate: `Você é Fábio Aguiar (criador do PBB). Pegue a seguinte funcionalidade e decomponha passo a passo em: Passos da Persona, PBIs fatiados, User Stories completas e Critérios de Aceite no formato Given/When/Then:\n\n[FUNCIONALIDADE]`
  },
  {
    id: 'disc-shape-up',
    category: 'discovery',
    title: 'Shape Up (Ciclos de 6 Semanas)',
    creatorOrOrigin: 'Ryan Singer (Basecamp / 37signals)',
    badge: 'Anti-Scrum & Foco Puro',
    icon: '⛰️',
    summary: 'Abordagem alternativa ao Scrum tradicional. Trabalha em ciclos de 6 semanas sem backlog infinito, sem sprints de 2 semanas e sem estimativas arbitrárias de story points. Baseia-se em "Shaping", "Betting" e "Building".',
    whenToUse: 'Para equipes de desenvolvimento sênior que sofrem com cansaço de rituais diários, interrupções constantes e backlogs gigantescos que nunca chegam ao fim.',
    coreConcepts: [
      'Shaping: Definir o projeto no nível certo de abstração (nem vago demais, nem superespecificado em telas) com limites claros (Appetite de 2 ou 6 semanas).',
      'Betting Table (Mesa de Apostas): A liderança aposta em 2 ou 3 projetos para o ciclo seguinte. O que não é escolhido é DESCARTADO, não fica acumulando em backlog.',
      'Hill Charts (Gráficos de Colina): Mede o progresso dividindo em "Subindo a Colina" (resolvendo incógnitas) e "Descendo a Colina" (executando o que já se sabe).',
      'Cool-down (2 semanas): Período livre entre ciclos para refatoração, correções de bugs e exploração autônoma.'
    ],
    stepByStep: [
      '1. O líder de produto modela o "Pitch" com Problema, Apetite, Solução e "No-Gos" (o que não faremos).',
      '2. A mesa de apostas decide quais pitches serão financiados no ciclo.',
      '3. Um time integrado (1 designer + 2 devs) recebe o pitch com autonomia total de execução.',
      '4. O time usa Hill Charts para comunicar o progresso sem microgerenciamento.',
      '5. O ciclo encerra impreterivelmente na 6ª semana, seguido de 2 semanas de Cool-down.'
    ],
    practicalExample: 'Em vez de gastar 8 sprints tentando redesenhar todo o perfil de usuário, o time do Basecamp definiu um apetite de 2 semanas para apenas permitir login por biometria. Se passasse de 2 semanas, o projeto seria cortado.',
    aiPromptTemplate: `Você é Ryan Singer (autor de Shape Up). Transforme a seguinte ideia de produto em um "Pitch" completo no padrão Shape Up, definindo: Problema, Apetite (2 ou 6 semanas), Solução delimitada, Rabbit Holes (armadilhas técnicas a evitar) e No-Gos (o que está explicitamente fora de escopo):\n\n[IDEIA]`
  },

  // ==========================================
  // 🧙‍♂️ TÉCNICAS DE FACILITAÇÃO & LIBERATING STRUCTURES
  // ==========================================
  {
    id: 'fac-124all',
    category: 'facilitation',
    title: '1-2-4-All (Liberating Structures)',
    creatorOrOrigin: 'Henri Lipmanowicz & Keith McCandless',
    badge: 'Voz Para Todos',
    icon: '🗣️',
    summary: 'Engaja 100% dos participantes simultaneamente em 12 minutos, evitando que apenas os membros mais extrovertidos ou chefes dominem a reunião.',
    whenToUse: 'Em retrospectivas, ideações, refinamentos ou resolução de problemas quando o grupo está calado ou apenas 1 pessoa fala.',
    coreConcepts: [
      '1 minuto: Reflexão silenciosa individual com escrita em post-it.',
      '2 minutos: Compartilhamento em duplas.',
      '4 minutos: Compartilhamento e busca de consensos em quartetos.',
      '5 minutos: Plenária onde cada quarteto compartilha apenas 1 insight mais potente.'
    ],
    stepByStep: [
      '1. Apresentar uma pergunta instigante na tela.',
      '2. Timer de 1 min: Silêncio absoluto, cada um escreve sua ideia.',
      '3. Timer de 2 min: Formar duplas para comparar e aprofundar.',
      '4. Timer de 4 min: Duplas se juntam formando quartetos para eleger a melhor ideia.',
      '5. Coletar o melhor insight de cada quarteto no board principal.'
    ],
    practicalExample: 'Numa retrospectiva com 16 pessoas onde ninguém falava do atraso na entrega, o 1-2-4-All fez surgir em 12 minutos a verdade: "Ninguém entende a arquitetura legada do módulo de login".',
    aiPromptTemplate: `Você é um facilitador de Liberating Structures. Desenhe a condução de uma dinâmica 1-2-4-All para destravar o seguinte problema em um time de tecnologia, incluindo a pergunta disparadora perfeita e 3 perguntas de aprofundamento:\n\n[PROBLEMA DO TIME]`
  },
  {
    id: 'fac-troika',
    category: 'facilitation',
    title: 'Troika Consulting (Consultoria em Trio)',
    creatorOrOrigin: 'Liberating Structures',
    badge: 'Mentoria Expressa',
    icon: '🤝',
    summary: 'Sessão de consultoria rápida e estruturada de 10 minutos entre pares, onde uma pessoa compartilha um desafio e ouve soluções de dois colegas enquanto fica de costas.',
    whenToUse: 'Quando PMs, Scrum Masters ou Tech Leads estão empacados com desafios difíceis de liderança, negociação com stakeholders ou dívida técnica.',
    coreConcepts: [
      '1 Cliente (com o desafio) e 2 Consultores (colegas dispostos a ajudar).',
      '1 minuto para o cliente expor o problema.',
      '2 minutos de perguntas clarificadoras.',
      '4 minutos de consultoria com o cliente de costas apenas anotando.',
      '1 minuto de agradecimento e aprendizados.'
    ],
    stepByStep: [
      '1. Dividir a sala em trios.',
      '2. Rodada 1: Pessoa A é cliente, B e C são consultores.',
      '3. Pessoa A explica a dor. B e C fazem perguntas.',
      '4. Pessoa A vira a cadeira de costas e fica em silêncio anotando enquanto B e C debatem alternativas como se fossem consultores externos.',
      '5. Pessoa A vira e compartilha a ideia mais valiosa. Rodar para a Pessoa B.'
    ],
    practicalExample: 'Um PM júnior que sofria com um Diretor que furava o sprint usou a Troika e recebeu a dica de ouro de dois colegas: "Não diga não. Diga: \'Com certeza fazemos isso agora, qual dessas duas coisas que você pediu antes vamos tirar da Sprint?\'".',
    aiPromptTemplate: `Você é um consultor sênior em Troika Consulting. Eu sou o 'Cliente' trazendo o seguinte desafio. Atue como os 2 consultores debatendo entre si alternativas pragmáticas e não óbvias para o meu caso:\n\n[MEU DESAFIO]`
  },
  {
    id: 'fac-lean-coffee',
    category: 'facilitation',
    title: 'Lean Coffee (Pauta Democrática com Timebox)',
    creatorOrOrigin: 'Jim Benson & Jeremy Lightsmith',
    badge: 'Reunião Eficiente',
    icon: '☕',
    summary: 'Estrutura de reunião sem pauta pré-estabelecida, onde a agenda é construída e priorizada democraticamente por votação no primeiro minuto da sessão.',
    whenToUse: 'Para comunidades de prática, alinhamentos semanais de liderança de produto e refinamentos onde há muitos tópicos soltos.',
    coreConcepts: [
      'Quadro com 3 colunas: A Discutir (To Do), Discutindo (Doing) e Concluído (Done).',
      'Dot Voting (3 votos por participante).',
      'Timebox estrito de 5 minutos por tópico.',
      'Roman Voting (Polegares para cima, neutro ou para baixo) para decidir se estende por mais 3 minutos ou passa para o próximo.'
    ],
    stepByStep: [
      '1. Coletar temas sugeridos em post-its durante 3 minutos.',
      '2. Pitch rápido de 15 segundos para cada tema.',
      '3. Votação democrática (Dot Voting).',
      '4. Discutir o item mais votado com timer de 5 minutos.',
      '5. Votar com polegar: se a maioria quiser continuar, +3 minutos; senão, move para Done e puxa o próximo.'
    ],
    practicalExample: 'Em vez de uma reunião semanal de 2 horas arrastada, a guilda de produto fez um Lean Coffee de 45 minutos, discutiu os 4 temas mais críticos eleitos pelo time e gerou 3 ações práticas no Jira.',
    aiPromptTemplate: `Gere um template de ata de Lean Coffee com estrutura pronta para registrar tópicos votados, consensos gerados, ações com donos e prazos para o seguinte tema:\n\n[TEMA DA SESSÃO]`
  },
  {
    id: 'fac-wsjf-safe',
    category: 'facilitation',
    title: 'WSJF (Weighted Shortest Job First)',
    creatorOrOrigin: 'Don Reinertsen / SAFe',
    badge: 'Priorização Financeira',
    icon: '⚖️',
    summary: 'Técnica de priorização matemática baseada no Custo do Atraso (Cost of Delay). Garante que a empresa sempre priorize as iniciativas que entregam maior valor financeiro ou reduzem mais riscos no menor tempo de trabalho.',
    whenToUse: 'Para desempate de grandes épicos corporativos onde todos os diretores acham que seu projeto é "prioridade número 1".',
    coreConcepts: [
      'Fórmula: WSJF = Cost of Delay (CoD) / Job Size (Duração/Tamanho).',
      'Cost of Delay = Valor de Negócio para o Usuário + Criticidade de Tempo + Redução de Risco ou Habilitação de Oportunidades.',
      'Pontuação com sequência de Fibonacci relativa (1, 2, 3, 5, 8, 13, 20).'
    ],
    stepByStep: [
      '1. Listar os Épicos ou Features candidatas.',
      '2. Dar nota relativa para "User/Business Value" para cada item.',
      '3. Dar nota relativa para "Time Criticality" (urgência da data).',
      '4. Dar nota relativa para "Risk Reduction / Opportunity Enablement".',
      '5. Somar os 3 para achar o Cost of Delay.',
      '6. Dar nota de "Job Size" (esforço técnico do time).',
      '7. Dividir CoD por Job Size. O maior índice numérico é a prioridade 1!'
    ],
    practicalExample: 'Um Épico que dava R$ 1M de valor mas levava 12 meses teve WSJF baixo (1.2), enquanto uma feature que resolvia uma multa regulatória imediata em 2 semanas teve WSJF alto (14.5) e foi puxada primeiro, salvando a empresa de uma penalidade de R$ 300k.',
    aiPromptTemplate: `Calcule o WSJF completo para as 4 iniciativas a seguir, explicando o racional de pontuação em Fibonacci para cada componente (User Value, Time Criticality, Risk Reduction e Job Size) e ordenando a fila de prioridades:\n\n[LISTA DE INICIATIVAS]`
  },

  // ==========================================
  // 🤖 AI SUPERPOWERS & PROMPTS PARA AGILE COACHES / PMS
  // ==========================================
  {
    id: 'ai-story-slicer',
    category: 'ai_superpowers',
    title: 'AI Story Slicer (Fatiamento SPIDR & PBB)',
    creatorOrOrigin: 'Agile Coach AI Superpowers',
    badge: 'Engenharia de Backlog',
    icon: '🔪',
    summary: 'Prompt especialista em pegar Épicos gigantescos ("fazer o checkout da loja") e fatiar cirurgicamente usando os 5 padrões SPIDR: Spike, Paths, Interfaces, Data, Rules.',
    whenToUse: 'Quando as histórias de usuário estimadas pelos desenvolvedores ficam com 13 ou 20 pontos e não cabem em uma única sprint.',
    coreConcepts: [
      'Spike: Fatiar a pesquisa técnica em um card separado com timebox.',
      'Paths: Fatiar pelo caminho feliz primeiro, deixando caminhos alternativos para histórias seguintes.',
      'Interfaces: Fatiar web primeiro, mobile depois, ou formulário simples antes de drag-and-drop.',
      'Data: Fatiar tipos de dados aceitos (ex: aceitar apenas JPG antes de aceitar PDF e ZIP).',
      'Rules: Fatiar regras de validação (ex: regra básica de senha antes de 2FA obrigatório).'
    ],
    stepByStep: [
      '1. Colar a descrição bruta do Épico.',
      '2. A IA avalia qual das 5 dimensões SPIDR permite fatiar mais rápido.',
      '3. Gera 3 a 6 histórias independentes no padrão INVEST com story points de 1 a 3 pontos.',
      '4. Cada história inclui critérios de aceite em Gherkin prontos.'
    ],
    practicalExample: 'Um épico de "Gestão de Perfis de Usuário" foi fatiado em 3 histórias de 2 pontos: 1. Cadastro com dados básicos, 2. Upload de foto de avatar, 3. Configuração de preferências de notificação.',
    aiPromptTemplate: `Você é o Agile Coach AI Story Slicer. Aplique a técnica SPIDR (Spike, Paths, Interfaces, Data, Rules) para fatiar o seguinte Épico em 3 a 5 Histórias de Usuário no padrão INVEST, com pontuação máxima de 3 story points cada e critérios de aceite Given/When/Then:\n\n[INSERIR ÉPICO]`
  },
  {
    id: 'ai-retro-coach',
    category: 'ai_superpowers',
    title: 'AI Retrospective Diagnostic & Action Planner',
    creatorOrOrigin: 'Agile Coach AI Superpowers',
    badge: 'Facilitador de Cerimônias',
    icon: '🎯',
    summary: 'Analisa o sentimento da equipe, logs de sprint e métricas de fluxo (Cycle Time, Throughput, Bugs) e projeta dinâmicas de retrospectiva personalizadas com planos de ação concretos.',
    whenToUse: 'Quando a equipe está desmotivada, as retrospectivas caíram na mesmice de "reclamar do prazo" ou o time não consegue transformar reclamações em ações com donos.',
    coreConcepts: [
      'Diagnóstico de Disfunções (Lencioni: Falta de Confiança, Medo de Conflito, Falta de Comprometimento).',
      'Design de Dinâmica adaptada ao momento (ex: Sailboat para bloqueios externos, Mad/Sad/Glad para conflito interno).',
      'Geração de SMART Actions para o board operacional.'
    ],
    stepByStep: [
      '1. Informar os sintomas do time na última sprint (ex: muitos bugs em homologação, discussões sobre PR).',
      '2. A IA seleciona a dinâmica ideal e fornece o script exato com minutos, perguntas e icebreaker.',
      '3. Fornece perguntas instigantes para o facilitador desarmar resistências.'
    ],
    practicalExample: 'O time estava em atrito entre frontend e backend por atrasos na API. A IA recomendou uma dinâmica de "Speed Dating de Acordos Técnicos" de 30 min, resultando na criação de contratos de API com Swagger mockado antes de codificar.',
    aiPromptTemplate: `Você é um Agile Coach Master. Meu time está com o seguinte sintoma na sprint: [DESCREVER SINTOMA]. Proponha uma dinâmica de retrospectiva de 45 minutos passo a passo, com nome, icebreaker, perguntas provocadoras e como garantir que o plano de ação tenha donos e métrica de sucesso:`
  },
  {
    id: 'ai-dependency-mapper',
    category: 'ai_superpowers',
    title: 'AI Cross-Team Dependency & Bottleneck Hunter',
    creatorOrOrigin: 'Agile Coach AI Superpowers',
    badge: 'Caçador de Gargalos',
    icon: '🕸️',
    summary: 'Audita dependências arquiteturais e operacionais entre squads antes do início do trimestre, identificando caminhos críticos que correm risco de travar a entrega.',
    whenToUse: 'Antes do planejamento trimestral ou ao iniciar uma feature que envolve múltiplos times (ex: mobile, backend, gateway, dados).',
    coreConcepts: [
      'Mapeamento de Grafo de Dependências.',
      'Identificação de Single Points of Failure (SPOF) - squads sobrecarregadas com 10 pedidos simultâneos.',
      'Estratégias de desacoplamento: Feature Flags, Mocks de API, Times de Plataforma.'
    ],
    stepByStep: [
      '1. Inserir a lista de histórias e os squads envolvidos.',
      '2. A IA identifica quais entregas estão no caminho crítico.',
      '3. Sugere planos de mitigação (ex: antecipar o contrato de interface na Sprint 1).'
    ],
    practicalExample: 'Detectou que 4 squads dependiam do time de "Segurança e Autenticação" na mesma semana da release. A IA sugeriu antecipar as credenciais mockadas 3 semanas antes, destravando todos os squads.',
    aiPromptTemplate: `Você é um Agile Scale Architect. Analise os seguintes épicos e dependências entre os squads [LISTAR SQUADS E ÉPICOS]. Identifique o caminho crítico, os riscos de bloqueio e proponha 3 estratégias de desacoplamento técnico/organizacional:`
  }
];
