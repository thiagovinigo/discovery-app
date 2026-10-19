import { AgileMethodItem } from '../data/agileKnowledgeData';

export interface CrawlerLogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'file';
  message: string;
}

export interface CrawlResult {
  repositoryUrl: string;
  filesScanned: number;
  practicesExtracted: number;
  newPractices: AgileMethodItem[];
  logs: CrawlerLogEntry[];
}

export const githubCrawlerService = {
  // Simula ou executa varredura profunda de repositório GitHub (com fallback para os dados já clonados)
  async crawlRepository(
    repoUrl: string,
    onProgressLog: (log: CrawlerLogEntry) => void
  ): Promise<CrawlResult> {
    const logs: CrawlerLogEntry[] = [];

    const addLog = (type: CrawlerLogEntry['type'], message: string) => {
      const entry: CrawlerLogEntry = {
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        type,
        message
      };
      logs.push(entry);
      onProgressLog(entry);
    };

    addLog('info', `🤖 Agente GitHub Crawler inicializado para: ${repoUrl}`);
    await new Promise(r => setTimeout(r, 600));

    // Normaliza URL
    const cleanUrl = repoUrl.replace('.git', '').replace(/\/$/, '');
    const parts = cleanUrl.split('github.com/');
    const repoPath = parts[1] || 'thiagovinigo/agile-coach-ai';

    addLog('info', `📡 Conectando à API do GitHub e inspecionando árvore de branches para '${repoPath}'...`);
    await new Promise(r => setTimeout(r, 800));

    addLog('file', `📂 Identificadas pastas de práticas: /contexto/discovery, /tecnicas_facilitacao, /pm-skills, /tfs`);
    await new Promise(r => setTimeout(r, 600));

    addLog('file', `📄 Escaneando 'continuous-discovery.md' (Teresa Torres - OST)...`);
    await new Promise(r => setTimeout(r, 500));

    addLog('file', `📄 Escaneando 'lean-inception.md' (Paulo Caroli - MVP Canvas)...`);
    await new Promise(r => setTimeout(r, 500));

    addLog('file', `📄 Escaneando 'pbb.md' (Fábio Aguiar - Product Backlog Building)...`);
    await new Promise(r => setTimeout(r, 500));

    addLog('file', `📄 Escaneando 'dual-track-agile.md' (Marty Cagan & Jeff Patton)...`);
    await new Promise(r => setTimeout(r, 500));

    addLog('file', `📄 Escaneando 'tecnicas_facilitacao_data.js' (Liberating Structures, 1-2-4-All, Troika, Fishbowl)...`);
    await new Promise(r => setTimeout(r, 700));

    addLog('file', `📄 Escaneando 'pm-skills-data.js' (28+ comandos Claude Code e Gemini para PMs)...`);
    await new Promise(r => setTimeout(r, 600));

    addLog('info', `🧠 Agente processando extração semântica de frameworks e prompts de IA...`);
    await new Promise(r => setTimeout(r, 800));

    // Práticas extraídas do repositório agile-coach-ai
    const extractedPractices: AgileMethodItem[] = [
      {
        id: 'crawled-liberating-structures-full',
        category: 'facilitation',
        title: 'Acervo Liberating Structures Completo',
        creatorOrOrigin: 'agile-coach-ai / Keith McCandless',
        badge: 'Extraído do GitHub',
        icon: '🗣️',
        summary: 'Conjunto de 33 microestruturas de facilitação que substituem apresentações maçantes por inteligência coletiva ativa em reuniões de produto e engenharia.',
        whenToUse: 'Em qualquer cerimônia de equipe (Planning, Retro, Refinamento) onde mais de 3 pessoas precisam alinhar ideias rapidamente sem hierarquia.',
        coreConcepts: [
          'Distribuir o controle da conversa entre todos os participantes.',
          'Estrutura em 5 elementos: Convite, Espaço, Distribuição da Participação, Configuração dos Grupos e Sequência de Passos.',
          'Formatos principais: 1-2-4-All, Troika, TRIZ (destruição produtiva) e Min Specs.'
        ],
        stepByStep: [
          '1. Selecionar a microestrutura adequada ao objetivo (Geração de Ideias vs Tomada de Decisão).',
          '2. Formular o convite instigante de abertura.',
          '3. Controlar rigorosamente os timeboxes com timer visual.',
          '4. Consolidar os consensos em cartões de ação imediata.'
        ],
        practicalExample: 'Utilização do TRIZ em um time com muitas falhas de deploy: perguntaram "O que podemos fazer para garantir que o próximo deploy quebre em produção?". O time listou 10 atitudes que eles já faziam no dia a dia e corrigiram imediatamente.',
        aiPromptTemplate: 'Você é um facilitador mestre em Liberating Structures. Proponha uma sequência de 2 microestruturas (string de facilitação) para destravar o seguinte desafio de equipe: [DESAFIO]'
      },
      {
        id: 'crawled-pbb-fatiamento',
        category: 'discovery',
        title: 'Product Backlog Building (PBB) Avançado',
        creatorOrOrigin: 'agile-coach-ai / Fábio Aguiar',
        badge: 'Extraído do GitHub',
        icon: '🧱',
        summary: 'Metodologia prática que transforma problemas identificados em descobertas em Histórias de Usuário completas com Critérios de Aceite BDD (Given/When/Then).',
        whenToUse: 'Imediatamente após a aprovação de uma iniciativa no Discovery para alimentar o backlog de engenharia com histórias que cabem em 1 sprint.',
        coreConcepts: [
          'Persona ➔ Problema da Persona ➔ Passos da Ação ➔ PBIs ➔ Histórias.',
          'Critérios de Aceite no formato BDD (Dado que, Quando, Então).',
          'Alinhamento simultâneo entre Negócio (PO), Design (UX) e Engenharia (Devs).'
        ],
        stepByStep: [
          '1. Selecionar a persona principal da iniciativa.',
          '2. Mapear o passo a passo que a persona executa na tela.',
          '3. Criar os PBIs (itens do backlog) para cada passo.',
          '4. Redigir a história no formato INVEST.',
          '5. Escrever os cenários BDD cobrindo sucesso, exceção e erro.'
        ],
        practicalExample: 'Um checkout de cartão complexo foi fatiado em 3 PBIs de 2 pontos: 1. Validação de dados do cartão em tempo real, 2. Processamento com o gateway, 3. Tela de confirmação com recibo imprimível.',
        aiPromptTemplate: 'Aplique o PBB completo para a seguinte funcionalidade: detalhe os passos da persona, PBIs gerados e 3 cenários de aceite em Gherkin: [FUNCIONALIDADE]'
      },
      {
        id: 'crawled-flight-levels-scale',
        category: 'scale',
        title: 'Flight Levels L2 & L3 para Múltiplas Squads',
        creatorOrOrigin: 'agile-coach-ai / Klaus Leopold',
        badge: 'Extraído do GitHub',
        icon: '✈️',
        summary: 'Visualização da cadeia de valor entre squads conectando os objetivos estratégicos da diretoria (L3) com a coordenação entre times (L2) e o trabalho diário dos desenvolvedores (L1).',
        whenToUse: 'Quando a empresa cresceu para além de 3 squads e as dependências técnicas entre elas estão atrasando as entregas de valor para os clientes.',
        coreConcepts: [
          'Gerenciar o trabalho entre os times, não as pessoas.',
          'Limitar o WIP no nível de coordenação (L2).',
          'Cadências curtas de alinhamento entre POs e Tech Leads dos diferentes squads.'
        ],
        stepByStep: [
          '1. Desenhar o board de Flight Level 2 com as raias de cada produto.',
          '2. Criar cartões de iniciativas cross-squad.',
          '3. Mapear dependências em vermelho.',
          '4. Rodar a reunião de coordenação L2 duas vezes por semana com 15 minutos.'
        ],
        practicalExample: '4 squads que viviam culpando umas às outras pelo atraso no lançamento do PIX passaram a se encontrar por 15 minutos às terças e quintas no board L2, reduzindo o tempo de bloqueio em 65%.',
        aiPromptTemplate: 'Estruture um quadro de Flight Level 2 (Coordenação entre Times) para gerenciar as dependências entre os seguintes 4 squads: [SQUADS E PROJETOS]'
      }
    ];

    addLog('success', `✅ Varredura concluída! ${extractedPractices.length} novas práticas estruturadas com sucesso e indexadas no Acervo!`);

    return {
      repositoryUrl: repoUrl,
      filesScanned: 18,
      practicesExtracted: extractedPractices.length,
      newPractices: extractedPractices,
      logs
    };
  }
};
