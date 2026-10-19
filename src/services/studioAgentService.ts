import { callAI } from './aiClient';
import { storageService } from './storageService';
import {
  coachTemplate,
  jiraSyncTemplate,
  slicerTemplate,
  specArchitectTemplate,
  synthesizerTemplate
} from './studioTemplates';

export type StudioAgentId = 'synthesizer' | 'slicer' | 'spec_architect' | 'coach' | 'jira_sync';

export interface StudioAgentResult {
  text: string;
  /** 'ai' = resposta da IA; 'template' = texto de exemplo (sem chave de API ou com a IA falhando). */
  source: 'ai' | 'template';
}

interface StudioAgentConfig {
  label: string;
  temperature: number;
  systemPrompt: string;
  userPrompt: (input: string) => string;
  template: (input: string) => string;
  /** Pausa antes do texto de exemplo, para a resposta não parecer instantânea. */
  templateDelayMs: number;
}

const AGENTS: Record<StudioAgentId, StudioAgentConfig> = {
  synthesizer: {
    label: 'Discovery Synthesizer',
    temperature: 0.3,
    systemPrompt:
      'Você é o Discovery Synthesizer AI do Discovery ao Done. Analise as notas brutas de entrevista e produza uma síntese executiva em Markdown contendo: ' +
      '1. Job To Be Done Principal (JTBD no formato Quando... Quero... Para...), 2. Dores Críticas Mapeadas (Pain Points com citações e impacto), 3. Oportunidades Priorizadas (Opportunity Solution Tree de Teresa Torres), 4. Hipótese Falsificável ("Acreditamos que... Saberemos que tivemos sucesso se...").',
    userPrompt: input => `Notas da entrevista de discovery:\n${input}`,
    template: synthesizerTemplate,
    templateDelayMs: 800
  },
  slicer: {
    label: 'Story Slicer',
    temperature: 0.3,
    systemPrompt:
      'Você é o Story Slicer AI do Discovery ao Done, especialista em fatiamento vertical de épicos pelos métodos SPIDR (Spike, Path, Interface, Data, Rules de Mike Cohn) e PBB (Product Backlog Building de Fábio Aguiar). ' +
      'Fatie este épico em 3 a 4 histórias verticais no padrão INVEST ("Como... Quero... Para..."), cada uma com Critérios de Aceite BDD Dado/Quando/Então (Gherkin).',
    userPrompt: input => `Épico a ser fatiado:\n${input}`,
    template: slicerTemplate,
    templateDelayMs: 800
  },
  spec_architect: {
    label: 'Spec Architect',
    temperature: 0.2,
    systemPrompt:
      'Você é o Principal Tech Architect AI do Discovery ao Done. Gere um documento canônico SPEC.md completo e de padrão militar para agentes de codificação de IA (Claude Code, Cursor, Antigravity, GitHub Copilot). ' +
      'Estruture em Markdown com: 1. Princípios de Engenharia & SLA, 2. Modelos Canônicos de Dados (TypeScript interfaces/types), 3. Endpoints REST & Contratos de Serviço, 4. Cenários de Validação Automatizada (Gherkin BDD Given/When/Then), 5. Regras de Idempotência e Auditoria. Responda em português brasileiro.',
    userPrompt: input => `Gere a SPEC.md completa para esta funcionalidade:\n${input}`,
    template: specArchitectTemplate,
    templateDelayMs: 800
  },
  coach: {
    label: 'Agile Coach',
    temperature: 0.3,
    systemPrompt:
      'Você é o Agile Coach Prescriber AI no Discovery ao Done. Analise o desafio ou gargalo do time de produto/engenharia com base em métodos ágeis modernos (Flight Levels Klaus Leopold, SAFe, Kanban, Scrum, LeSS, Shape Up, OKRs). ' +
      'Estruture em Markdown com: 🎯 Diagnóstico da Causa Raiz, 📚 Prática Recomendada do Acervo (com autor/método), e 🚀 Plano de Ação Imediato em 3 Passos concretos.',
    userPrompt: input => `Problema / Cenário do time:\n${input}`,
    template: coachTemplate,
    templateDelayMs: 800
  },
  jira_sync: {
    label: 'Jira Sync',
    temperature: 0.2,
    systemPrompt:
      'Você é o Jira & DevOps Integration Agent do Discovery ao Done. Gere um payload JSON estrito, válido e bem estruturado para importação ou ingestão via API no Jira/Azure DevOps. O payload deve conter: projectKey, generatedAt, issues (com Epics e Stories com Acceptance Criteria BDD Gherkin, Story Points e Labels). Retorne apenas o código JSON formatado.',
    // para este agente a entrada é a chave do projeto Jira
    userPrompt: input => `Gere o payload Jira JSON para a chave de projeto "${input}", contendo épicos e histórias de usuário no padrão INVEST com critérios Given/When/Then.`,
    template: jiraSyncTemplate,
    templateDelayMs: 600
  }
};

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Roda um agente do Studio. Com chave de API chama a IA; sem chave, ou se a IA falhar, devolve o texto de
 * exemplo do agente. `fallbackDelayMs` existe para os testes não esperarem a pausa.
 */
export async function runStudioAgent(
  id: StudioAgentId,
  input: string,
  options: { fallbackDelayMs?: number } = {}
): Promise<StudioAgentResult> {
  const agent = AGENTS[id];

  if (storageService.getApiKey()) {
    try {
      const text = await callAI({
        json: false,
        temperature: agent.temperature,
        systemPrompt: agent.systemPrompt,
        userPrompt: agent.userPrompt(input)
      });
      return { text, source: 'ai' };
    } catch (e: unknown) {
      console.warn(`Erro ao chamar IA no ${agent.label}, usando texto de exemplo:`, e);
    }
  }

  await wait(options.fallbackDelayMs ?? agent.templateDelayMs);
  return { text: agent.template(input), source: 'template' };
}
