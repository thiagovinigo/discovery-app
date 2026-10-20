import { DiscoveryProject, MeetingSession } from '../types/discovery';
import { storageService } from './storageService';
import { callAI } from './aiClient';
import { searchProjectKnowledge } from './knowledgeService';
import type { KnowledgeHit } from './knowledgeService';
import { isFilled } from './interviewService';
import { ROLE_LABELS } from './stakeholderService';

export type AgentScope = 'meeting' | 'backlog' | 'general' | 'audit';

export interface ProjectAgent {
  id: string;
  name: string;
  description: string;
  scope: AgentScope;
  /** Instrução do agente. O contexto do projeto é anexado automaticamente. */
  prompt: string;
}

export interface AgentResult {
  text: string;
  error?: string;
  /** Verdadeiro quando a resposta veio da busca local no projeto, sem IA. */
  offline?: boolean;
}

const BASE_RULES =
  'Responda em português brasileiro, em Markdown, de forma objetiva e acionável. ' +
  'Baseie-se estritamente no contexto do projeto fornecido; se faltar informação, diga o que falta em vez de inventar.';

export const PROJECT_AGENTS: ProjectAgent[] = [
  // Reuniões
  {
    id: 'meeting-summary',
    name: 'Resumo & Decisões',
    description: 'Resume a reunião: TL;DR, decisões, ações e citações marcantes.',
    scope: 'meeting',
    prompt:
      'Você é um agente de síntese de reuniões de discovery. Produza: 1) TL;DR em 3 linhas; 2) decisões tomadas; ' +
      '3) ações com responsável sugerido; 4) 3 citações literais mais reveladoras do cliente.'
  },
  {
    id: 'meeting-gaps',
    name: 'Lacunas & Riscos',
    description: 'Aponta o que ficou sem resposta, suposições não validadas e riscos.',
    scope: 'meeting',
    prompt:
      'Você é um agente que aplica o Mom Test. Liste: 1) suposições do cliente ainda não validadas com fatos; ' +
      '2) pontos em que o cliente pediu solução em vez de falar da dor; 3) números/impactos que faltou quantificar; ' +
      '4) riscos de valor, usabilidade, viabilidade e prazo.'
  },
  {
    id: 'meeting-next-interview',
    name: 'Próxima Entrevista',
    description: 'Monta o roteiro da próxima conversa com base no que ficou aberto.',
    scope: 'meeting',
    prompt:
      'Você é um coach de entrevistas de discovery. Monte um roteiro para a próxima conversa: objetivo, ' +
      '8 perguntas sobre comportamento passado real (Mom Test) priorizadas pelas maiores lacunas, e sinais de alerta a observar.'
  },
  // Backlog
  {
    id: 'backlog-invest',
    name: 'Revisor INVEST',
    description: 'Revisa as histórias contra INVEST e sugere reescritas.',
    scope: 'backlog',
    prompt:
      'Você é um PO sênior revisando o backlog. Para cada história, avalie INVEST (Independent, Negotiable, Valuable, ' +
      'Estimable, Small, Testable), aponte as que falham e proponha a reescrita. Termine com um ranking das 3 histórias mais fracas.'
  },
  {
    id: 'backlog-criteria',
    name: 'Critérios de Aceite',
    description: 'Completa critérios Given/When/Then, incluindo casos de borda e erro.',
    scope: 'backlog',
    prompt:
      'Você é um analista de QA/PO. Para as histórias do backlog, sugira critérios de aceite adicionais em Gherkin ' +
      '(Dado/Quando/Então) cobrindo caminho feliz, bordas e erros que ainda não estejam cobertos.'
  },
  {
    id: 'backlog-prioritize',
    name: 'Priorização RICE',
    description: 'Reavalia a priorização, questiona premissas e sugere a ordem de entrega.',
    scope: 'backlog',
    prompt:
      'Você é um PM sênior. Reavalie a priorização das features (RICE) à luz das dores validadas nas reuniões: ' +
      'aponte features sobrevalorizadas ou subvalorizadas, justifique e proponha a ordem de entrega em 3 ondas.'
  },
  {
    id: 'backlog-gaps',
    name: 'Cobertura das Dores',
    description: 'Cruza dores das reuniões com o backlog e acha o que não está coberto.',
    scope: 'backlog',
    prompt:
      'Cruze as dores e JTBDs das reuniões com os épicos/features. Gere uma tabela Markdown: dor/JTBD | coberto por | status ' +
      '(coberto/parcial/descoberto). Depois sugira novas features para as dores descobertas.'
  },
  // Geral (PO)
  {
    id: 'po-stakeholder-brief',
    name: 'Brief para Stakeholder',
    description: 'Resumo executivo do projeto para apresentar ao stakeholder.',
    scope: 'general',
    prompt:
      'Escreva um status executivo para o stakeholder: situação atual, o que aprendemos, decisões necessárias, ' +
      'próximos passos e riscos. Máximo de 250 palavras, tom profissional.'
  },
  {
    id: 'po-okr-check',
    name: 'Checagem de OKRs',
    description: 'Avalia se os OKRs são mensuráveis e conectados às dores.',
    scope: 'general',
    prompt:
      'Avalie os OKRs: os resultados-chave são mensuráveis e têm baseline? Estão ligados às dores descobertas? ' +
      'Proponha melhorias concretas.'
  },
  // Auditoria & Validação de Produto (Banca de Especialistas)
  {
    id: 'audit-pm',
    name: 'Agente PM (Estratégia & Discovery)',
    description: 'Valida a proposta de valor, o ciclo Continuous Discovery, gaps de mercado e impacto nos OKRs.',
    scope: 'audit',
    prompt:
      'Você é um Principal Product Manager sênior avaliando este produto e projeto sob as metodologias de Teresa Torres, Marty Cagan e Rob Fitzpatrick.\n' +
      'Faça uma auditoria crítica e estruturada em Markdown contendo:\n' +
      '1. 🎯 Nota de Maturidade de Produto (0 a 100) com justificativa sincera.\n' +
      '2. 💡 Pontos Fortes identificados na tese e na descoberta com clientes.\n' +
      '3. ⚠️ Gaps Críticos e Riscos: Suposições não validadas, riscos de valor (Value Risk) e viabilidade de negócio (Viability Risk).\n' +
      '4. 🚀 3 Sugestões de Alterações Imediatas de Produto para acelerar Time-to-Value e Adoção.'
  },
  {
    id: 'audit-po',
    name: 'Agente PO (Backlog & INVEST)',
    description: 'Valida a qualidade do backlog, fatiamento vertical, critérios Given/When/Then e prontidão para sprints.',
    scope: 'audit',
    prompt:
      'Você é um Lead Product Owner e Agile Coach especialista em Scrum, Kanban e Engenharia de Requisitos INVEST.\n' +
      'Avalie tecnicamente o backlog e os épicos do projeto:\n' +
      '1. 📋 Nota de Prontidão do Backlog (0 a 100) para entrar em sprint de engenharia.\n' +
      '2. 🔍 Avaliação INVEST das histórias: Histórias muito grandes? Acoplamento entre tarefas? Independência de entrega?\n' +
      '3. 🧪 Qualidade dos Critérios de Aceite: Cobertura BDD (Given/When/Then), casos de borda e critérios de erro.\n' +
      '4. ⚡ 3 Sugestões Cirúrgicas de Refinamento e Fatiamento Vertical para o time de desenvolvimento.'
  },
  {
    id: 'audit-product-specialist',
    name: 'Especialista em Produto (Segundo Cérebro & Visão)',
    description: 'Valida o modelo mental do produto, conexão ponta a ponta entre entrevistas e entrega, e consistência metodológica.',
    scope: 'audit',
    prompt:
      'Você é um Head of Product e especialista em Sistemas de Pensamento e Segundo Cérebro (C.O.D.E. Tiago Forte / Continuous Discovery Teresa Torres).\n' +
      'Avalie a coerência holística do produto e da aplicação:\n' +
      '1. 🧠 Nota de Coerência Sistêmica (0 a 100): As dores capturadas nas reuniões realmente chegam aos épicos e histórias finais?\n' +
      '2. 🔄 Eficiência do Loop: O caminho da escuta ao backlog possui gargalos conceituais ou dados órfãos?\n' +
      '3. ⚖️ Alinhamento com Métricas: Como o produto garante que o time não construa recursos desnecessários (Feature Factory)?\n' +
      '4. 🧭 Roadmap Estratégico de Evolução: 3 alavancas para tornar este produto indispensável para times de produto modernos.'
  },
  {
    id: 'audit-ux',
    name: 'Auditor de UX (Usabilidade & Ergonomia)',
    description: 'Valida a jornada do usuário, heurísticas de Nielsen, atritos cognitivos, clareza dos fluxos e usabilidade prática.',
    scope: 'audit',
    prompt:
      'Você é um Staff UX Researcher & Product Designer especialista em Heurísticas de Usabilidade de Nielsen e Ergonomia Cognitiva.\n' +
      'Avalie a experiência de uso da aplicação e dos fluxos do usuário:\n' +
      '1. 🎨 Nota de Usabilidade & UX (0 a 100) baseada nas 10 Heurísticas de Nielsen.\n' +
      '2. 🚦 Principais Atritos Cognitivos Encontrados: Visibilidade do estado do sistema, controle e liberdade do usuário, prevenção de erros.\n' +
      '3. 🧩 Avaliação do Fluxo de Trabalho: Alternância entre salas de reunião, gravação de áudio, mapa mental e fatiamento.\n' +
      '4. 🛠️ 3 Recomendações Prioritárias de UX: Melhorias de usabilidade para eliminar cliques desnecessários e atrito operacional.'
  },
  {
    id: 'audit-ui',
    name: 'Designer de UI (Visual & Design System)',
    description: 'Valida a interface visual, densidade de dados, contraste, affordances de botões, consistência e estética premium.',
    scope: 'audit',
    prompt:
      'Você é um Principal UI/Visual Designer e Design System Lead especializado em aplicações SaaS de alta produtividade (Dark Mode, Glassmorphism, Modern FinTech).\n' +
      'Avalie a interface gráfica, layout e design visual da aplicação:\n' +
      '1. ✨ Nota de Qualidade de UI & Estética (0 a 100).\n' +
      '2. 👁️ Hierarquia Visual & Densidade: O contraste, legibilidade de tipografia e organização de painéis estão equilibrados?\n' +
      '3. 🎯 Affordances & Estados Interativos: Botões, badges, modais e transições comunicam claramente sua função?\n' +
      '4. 💎 3 Ajustes Visuais Imediatos de UI para conferir uma sensação ultra-premium, moderna e fluida.'
  }
];

export const agentsByScope = (scope: AgentScope) => PROJECT_AGENTS.filter(a => a.scope === scope);

const MAX_CONTEXT_NOTES = 20;
const MAX_NOTE_LENGTH = 300;
const MAX_CONTEXT_DECISIONS = 15;
const MAX_CHAT_HITS = 5;

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '…' : s);

/** Monta um resumo textual do projeto (e da sessão em foco) para dar contexto à IA. */
export function buildProjectContext(project: DiscoveryProject, session?: MeetingSession): string {
  const lines: string[] = [];
  lines.push(`# Projeto: ${project.name}`, project.description);

  const prd = project.prd;
  const prdLines: string[] = [];
  const addText = (label: string, value?: string) => {
    if (isFilled(value)) prdLines.push(`${label}: ${value!.trim()}`);
  };
  const addList = (label: string, items: string[]) => {
    if (items.length) prdLines.push(`${label}: ${items.join('; ')}`);
  };
  addText('Problema', prd.problemStatement);
  addText('Público', prd.targetAudience);
  addText('Valor', prd.valueProposition);
  addText('North Star', prd.northStarMetric);
  addList('Escopo', prd.inScope);
  addList('Fora do escopo', prd.outOfScope);
  addList('Métricas', prd.successMetrics);
  addList('Premissas', prd.assumptions);
  addList('Riscos', prd.risksAndMitigations.map(r => r.risk));
  if (prdLines.length) lines.push('## PRD', ...prdLines);

  const stakeholders = project.stakeholders ?? [];
  if (stakeholders.length) {
    lines.push('## Stakeholders');
    stakeholders.forEach(s => {
      const details = [ROLE_LABELS[s.role], s.organization].filter(Boolean).join(', ');
      lines.push(`- ${s.name} (${details})${s.notes ? `: ${s.notes}` : ''}`);
    });
  }

  const notes = [...(project.notes ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CONTEXT_NOTES);
  if (notes.length) {
    lines.push('## Anotações do PO (mais recentes)');
    notes.forEach(n => lines.push(`- ${n.tags.map(t => `#${t}`).join(' ')}${n.tags.length ? ' ' : ''}${clip(n.text, MAX_NOTE_LENGTH)}`));
  }

  const upcoming = (project.scheduledMeetings ?? []).filter(m => m.status === 'scheduled');
  if (upcoming.length) {
    lines.push('## Reuniões marcadas');
    upcoming.forEach(m => lines.push(`- ${new Date(m.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} — ${m.title}${m.objective ? `: ${m.objective}` : ''}`));
  }

  if (project.decisionLog.length) {
    lines.push('## Decisões');
    project.decisionLog.slice(-MAX_CONTEXT_DECISIONS).forEach(d => lines.push(`- ${d.decision} (${d.status})`));
  }

  if (project.okrs.length) {
    lines.push('## OKRs');
    project.okrs.forEach(o =>
      lines.push(`- ${o.objective}: ` + o.keyResults.map(k => `${k.description} (${k.baseline} → ${k.target})`).join(' | '))
    );
  }

  if (project.epics.length) {
    lines.push('## Backlog');
    project.epics.forEach(e => {
      lines.push(`### Épico: ${e.title} — ${e.objective}`);
      e.features.forEach(f => {
        lines.push(`- Feature: ${f.title} [${f.effort}${f.riceScore ? `, RICE ${f.riceScore.total}` : ''}] ${f.description}`);
        f.userStories.forEach(s => {
          lines.push(
            `  - História: ${s.title} — Como ${s.asA}, quero ${s.iWantTo}, para ${s.soThat}` +
              (s.acceptanceCriteria.length ? ` (${s.acceptanceCriteria.length} critérios)` : ' (sem critérios)')
          );
        });
      });
    });
  }

  if (project.sessions.length) {
    lines.push('## Reuniões');
    project.sessions.forEach(s => {
      lines.push(`### ${s.title} (${s.date})`);
      if (s.summary?.tldr) lines.push(`Resumo: ${s.summary.tldr}`);
      s.painPoints.forEach(p => lines.push(`- Dor [${p.severity}]: ${p.description}${p.quote ? ` — "${p.quote}"` : ''}`));
      s.jtbds.forEach(j => lines.push(`- JTBD: Quando ${j.context}, ${j.job}, ${j.outcome}`));
    });
  }

  if (session) {
    const open = session.liveQuestions.filter(q => !q.asked);
    if (open.length) {
      lines.push('## Perguntas sugeridas ainda NÃO feitas (sessão em foco)');
      open.forEach(q => lines.push(`- ${q.question} (${q.reason})`));
    }
    if (session.rawTranscript.length) {
      const transcript = session.rawTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      lines.push(`## Transcrição da sessão em foco: ${session.title}`, clip(transcript.slice(-12000), 12000));
    }
  }

  return lines.join('\n');
}

const requireKey = (): { apiKey: string; model: string; provider: 'openai' | 'gemini' } | { error: string } => {
  const apiKey = storageService.getApiKey();
  const provider = storageService.getAiProvider();
  if (!apiKey) return { error: 'Configure sua chave de API nas Configurações para usar os agentes.' };
  return { apiKey, model: storageService.getModel(), provider };
};

const toError = (e: any) => e?.message || 'Erro inesperado ao chamar a IA.';

export async function runAgent(
  agent: Pick<ProjectAgent, 'prompt'>,
  project: DiscoveryProject,
  session?: MeetingSession,
  extraInstruction?: string
): Promise<AgentResult> {
  const k = requireKey();
  if ('error' in k) return { text: '', error: k.error };
  try {
    const text = await callAI({
      provider: k.provider,
      apiKey: k.apiKey,
      model: k.model,
      json: false,
      temperature: 0.4,
      systemPrompt: `${agent.prompt}\n\n${BASE_RULES}${extraInstruction ? `\n\nInstrução adicional do usuário: ${extraInstruction}` : ''}`,
      userPrompt: `CONTEXTO DO PROJETO:\n${buildProjectContext(project, session)}`
    });
    return { text };
  } catch (e) {
    return { text: '', error: toError(e) };
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** A resposta veio da busca local no projeto, sem IA. */
  offline?: boolean;
}

const KIND_LABELS: Record<KnowledgeHit['kind'], string> = {
  fala: 'Fala', nota: 'Anotação', stakeholder: 'Stakeholder', dor: 'Dor', decisao: 'Decisão', backlog: 'Backlog', prd: 'PRD'
};

/** Resposta montada só com o que o projeto tem registrado, citando de onde veio. Sem trechos, diz que não achou. */
function answerFromHits(hits: KnowledgeHit[], intro = ''): string {
  if (hits.length === 0) {
    return (
      `${intro}Não encontrei nada registrado no projeto sobre isso. Registre a informação (anotações, reuniões, stakeholders) ` +
      'ou configure uma chave de IA nas Configurações para respostas mais elaboradas.'
    );
  }
  const items = hits.map(h => `- ${KIND_LABELS[h.kind]}: ${clip(h.text, 400)} _(${h.source})_`);
  return `${intro}Encontrei isto registrado no projeto:\n${items.join('\n')}`;
}

export async function chatWithProject(
  history: ChatMessage[],
  project: DiscoveryProject,
  session?: MeetingSession
): Promise<AgentResult> {
  const lastQuestion = [...history].reverse().find(m => m.role === 'user')?.text ?? '';
  const hits = searchProjectKnowledge(project, lastQuestion, MAX_CHAT_HITS);

  const k = requireKey();
  if ('error' in k) return { text: answerFromHits(hits, 'Sem chave de IA, respondi só com a busca no projeto. '), offline: true };

  const convo = history.map(m => `${m.role === 'user' ? 'PO' : 'Assistente'}: ${m.text}`).join('\n\n');
  const found = hits.length
    ? 'TRECHOS ENCONTRADOS NO PROJETO PARA ESTA PERGUNTA (cite a fonte de cada informação que usar):\n' +
      hits.map((h, i) => `[${i + 1}] ${h.text} (fonte: ${h.source})`).join('\n')
    : 'Nenhum trecho do projeto casou com a pergunta. Se a resposta depender de fatos do projeto, diga que não há registro.';
  try {
    const text = await callAI({
      provider: k.provider,
      apiKey: k.apiKey,
      model: k.model,
      json: false,
      temperature: 0.5,
      systemPrompt:
        'Você é o copiloto de IA do Product Owner no "Discovery ao Done", especialista em discovery contínuo, ' +
        'Mom Test, JTBD, user stories INVEST e priorização. Ajude o PO a refinar o projeto. ' +
        BASE_RULES +
        ' Quando sugerir texto de backlog (histórias, critérios), entregue pronto para copiar.' +
        ' Ao afirmar fatos do projeto, cite a fonte (reunião, anotação, stakeholder…). Se a informação não estiver no contexto, ' +
        'diga que não há registro; não invente.',
      userPrompt:
        `CONTEXTO DO PROJETO:\n${buildProjectContext(project, session)}\n\n${found}\n\n` +
        `CONVERSA ATÉ AGORA:\n${convo}\n\nResponda à última mensagem do PO.`
    });
    return { text };
  } catch (e) {
    return { text: answerFromHits(hits, `A IA não respondeu (${toError(e)}). Resultado da busca no projeto:\n\n`), offline: true };
  }
}

/** Follow-up para o stakeholder; sem IA, monta um rascunho a partir das perguntas pendentes. */
export function offlineFollowUp(project: DiscoveryProject, session: MeetingSession): string {
  const open = session.liveQuestions.filter(q => !q.asked);
  const pains = session.painPoints.slice(0, 5);
  const lines = [
    `# Follow-up: ${session.title}`,
    '',
    `Olá! Obrigado pela conversa sobre **${project.name}**. Para fecharmos o entendimento, gostaria de confirmar alguns pontos:`,
    ''
  ];
  if (pains.length) {
    lines.push('## O que entendi', ...pains.map(p => `- ${p.description}`), '');
  }
  lines.push(
    '## Perguntas para você',
    ...(open.length
      ? open.map((q, i) => `${i + 1}. ${q.question}`)
      : ['1. Pode me contar passo a passo a última vez em que isso aconteceu na prática?']),
    '',
    '_Rascunho gerado offline. Configure o Gemini para uma versão personalizada._'
  );
  return lines.join('\n');
}
