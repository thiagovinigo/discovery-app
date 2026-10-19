import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runStudioAgent } from './studioAgentService';
import type { StudioAgentId } from './studioAgentService';
import { storageService } from './storageService';
import { callAI } from './aiClient';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});

const callAIMock = vi.mocked(callAI);
const NO_DELAY = { fallbackDelayMs: 0 };

const AGENTS: { id: StudioAgentId; temperature: number; promptHint: string; templateHint: string }[] = [
  { id: 'synthesizer', temperature: 0.3, promptHint: 'Discovery Synthesizer', templateHint: 'Síntese Autônoma' },
  { id: 'slicer', temperature: 0.3, promptHint: 'Story Slicer', templateHint: 'Histórias Fatiadas' },
  { id: 'spec_architect', temperature: 0.2, promptHint: 'Principal Tech Architect', templateHint: '# SPEC.md' },
  { id: 'coach', temperature: 0.3, promptHint: 'Agile Coach Prescriber', templateHint: 'Diagnóstico do Agile Coach' },
  { id: 'jira_sync', temperature: 0.2, promptHint: 'Jira & DevOps Integration Agent', templateHint: 'projectKey' },
];

beforeEach(() => {
  localStorage.clear();
  callAIMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('runStudioAgent: com chave de API', () => {
  beforeEach(() => {
    storageService.setApiKey('sk-teste');
  });

  it.each(AGENTS)('$id chama a IA com o prompt e a temperatura do agente', async ({ id, temperature, promptHint }) => {
    callAIMock.mockResolvedValue('resposta da IA');

    const result = await runStudioAgent(id, 'minha entrada', NO_DELAY);

    expect(result).toEqual({ text: 'resposta da IA', source: 'ai' });
    const call = callAIMock.mock.calls[0][0];
    expect(call.json).toBe(false);
    expect(call.temperature).toBe(temperature);
    expect(call.systemPrompt).toContain(promptHint);
    expect(call.userPrompt).toContain('minha entrada');
  });

  it('o agente do Jira pede o payload para a chave de projeto informada', async () => {
    callAIMock.mockResolvedValue('{}');

    await runStudioAgent('jira_sync', 'FIN', NO_DELAY);

    expect(callAIMock.mock.calls[0][0].userPrompt).toContain('chave de projeto "FIN"');
  });

  it('se a IA falhar, devolve o texto de exemplo marcado como template', async () => {
    callAIMock.mockRejectedValue(new Error('sem rede'));

    const result = await runStudioAgent('coach', 'problema', NO_DELAY);

    expect(result.source).toBe('template');
    expect(result.text).toContain('Diagnóstico do Agile Coach');
  });
});

describe('runStudioAgent: sem chave de API', () => {
  it.each(AGENTS)('$id devolve o texto de exemplo sem chamar a IA', async ({ id, templateHint }) => {
    const result = await runStudioAgent(id, 'entrada', NO_DELAY);

    expect(callAIMock).not.toHaveBeenCalled();
    expect(result.source).toBe('template');
    expect(result.text).toContain(templateHint);
  });

  it('o exemplo do SPEC usa a entrada no título', async () => {
    const result = await runStudioAgent('spec_architect', 'Meu motor de regras', NO_DELAY);

    expect(result.text.startsWith('# SPEC.md: Meu motor de regras')).toBe(true);
  });

  it('o exemplo do Jira é um JSON válido com a chave do projeto informada', async () => {
    const result = await runStudioAgent('jira_sync', 'ABC', NO_DELAY);

    const payload = JSON.parse(result.text) as { projectKey: string; issues: { epicLink?: string }[] };
    expect(payload.projectKey).toBe('ABC');
    expect(payload.issues.filter(i => i.epicLink).every(i => i.epicLink === 'ABC-101')).toBe(true);
  });

  it('espera o atraso configurado antes de devolver o exemplo', async () => {
    vi.useFakeTimers();
    try {
      let done = false;
      const pending = runStudioAgent('slicer', 'épico', { fallbackDelayMs: 800 }).then(() => { done = true; });

      await vi.advanceTimersByTimeAsync(799);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
