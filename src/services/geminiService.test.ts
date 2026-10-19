import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiService } from './geminiService';
import { storageService } from './storageService';
import { callAI } from './aiClient';

vi.mock('./aiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('./aiClient')>();
  return { ...actual, callAI: vi.fn() };
});

const callAIMock = vi.mocked(callAI);

// Falante neutro: a heurística analisa o texto COM o rótulo do falante, e "Usuário" é palavra-chave de cliente
const say = (text: string, speaker = 'Entrevistado') => [{ speaker, text }];
const analyzeOffline = (text: string) => geminiService.analyzeLiveConversation(say(text), 'Contexto');

beforeEach(() => {
  localStorage.clear();
  callAIMock.mockReset();
});

describe('geminiService.analyzeLiveConversation: sem chave (heurística offline)', () => {
  it('não chama a IA e marca o resultado como offline, sem erro', async () => {
    const result = await analyzeOffline('Nossa planilha trava toda semana');

    expect(callAIMock).not.toHaveBeenCalled();
    expect(result.source).toBe('offline');
    expect(result.error).toBeUndefined();
  });

  it('fala sobre demora gera dor de tempo, nó no mapa, etapa crítica e pergunta de quantificação', async () => {
    const result = await analyzeOffline('Esse processo tem muita demora e fila');

    expect(result.newPainPoints.map(p => p.severity)).toEqual(['high']);
    expect(result.newMindMapNodes.map(n => n.label)).toEqual(['Gargalo de Tempo & Demora']);
    expect(result.newUserFlowSteps.map(s => [s.title, s.frictionLevel])).toEqual([['Espera & Processamento Lento', 'critical']]);
    expect(result.newQuestions.map(q => q.category)).toContain('quantification');
  });

  it('fala sobre planilha manual gera dor e um job a ser feito', async () => {
    const result = await analyzeOffline('Fazemos tudo manualmente numa planilha');

    expect(result.newMindMapNodes.map(n => n.label)).toContain('Dependência de Planilhas');
    expect(result.newJtbds).toHaveLength(1);
    expect(result.newJtbds[0].job).toContain('Substituir conferência manual');
  });

  it('guarda no máximo 120 caracteres da fala como citação da dor, sem o rótulo do falante', async () => {
    const result = await geminiService.analyzeLiveConversation(say('trava '.repeat(50), 'PM'), 'Contexto');

    expect(result.newPainPoints[0].quote!.length).toBeLessThanOrEqual(120);
    expect(result.newPainPoints[0].quote!.startsWith('PM')).toBe(false);
  });

  // Comportamento atual, registrado no BACKLOG.md: o rótulo "Usuário" do falante entra no texto analisado e
  // dispara a regra de cliente, então toda fala de "Usuário / Stakeholder" gera esses itens, qualquer que seja o conteúdo.
  it('o rótulo "Usuário" do falante dispara a regra de cliente mesmo sem o assunto na fala', async () => {
    const result = await geminiService.analyzeLiveConversation(say('Ontem fomos almoçar juntos', 'Usuário / Stakeholder'), 'Contexto');

    expect(result.newMindMapNodes.map(n => n.label)).toContain('Atrito com o Cliente');
    expect(result.newQuestions.map(q => q.category)).toContain('risk_validation');
  });

  it('fala sem palavras-chave vira um tópico genérico mais uma pergunta de 5 Porquês', async () => {
    const result = await analyzeOffline('Ontem fomos almoçar juntos');

    expect(result.newMindMapNodes).toHaveLength(1);
    expect(result.newMindMapNodes[0].type).toBe('opportunity');
    expect(result.newQuestions.map(q => q.category)).toEqual(['mom_test', 'five_whys']);
  });

  it('com duas ou mais perguntas já geradas, não acrescenta a de 5 Porquês', async () => {
    const result = await analyzeOffline('A demora gera custo e perda de dinheiro');

    expect(result.newQuestions.length).toBeGreaterThanOrEqual(2);
    expect(result.newQuestions.map(q => q.category)).not.toContain('five_whys');
  });

  it('todas as perguntas nascem como não feitas', async () => {
    const result = await analyzeOffline('O cliente quer cancelar e queria um botão');

    expect(result.newQuestions.every(q => q.asked === false)).toBe(true);
  });
});

describe('geminiService.analyzeLiveConversation: com chave', () => {
  beforeEach(() => {
    storageService.setApiKey('sk-teste');
  });

  it('envia a conversa e o contexto do projeto para a IA', async () => {
    callAIMock.mockResolvedValue('{}');

    await geminiService.analyzeLiveConversation([{ speaker: 'Usuário', text: 'olá' }], 'Meu projeto');

    const call = callAIMock.mock.calls[0][0];
    expect(call.userPrompt).toContain('Contexto do Projeto: Meu projeto');
    expect(call.userPrompt).toContain('Usuário: "olá"');
    expect(call.apiKey).toBe('sk-teste');
  });

  it('reescreve ids e dá posição aos nós devolvidos pela IA', async () => {
    callAIMock.mockResolvedValue(JSON.stringify({
      newQuestions: [{ id: 'x', question: 'Q', reason: 'r', category: 'mom_test', asked: false, timestamp: 'Agora' }],
      newPainPoints: [{ id: 'x', description: 'D', severity: 'high' }],
      newJtbds: [{ id: 'x', job: 'J' }],
      newMindMapNodes: [{ id: 'x', label: 'N', type: 'pain' }],
      newUserFlowSteps: [{ id: 'x', title: 'S' }],
    }));

    const result = await geminiService.analyzeLiveConversation(say('olá'), 'ctx');

    expect(result.source).toBe('ai');
    expect(result.newQuestions[0].id).toMatch(/^gem-q-/);
    expect(result.newPainPoints[0].id).toMatch(/^gem-p-/);
    expect(result.newJtbds[0].id).toMatch(/^gem-j-/);
    expect(result.newUserFlowSteps[0].id).toMatch(/^gem-s-/);
    expect(result.newMindMapNodes[0].id).toMatch(/^gem-m-/);
    expect(result.newMindMapNodes[0].x).toBeGreaterThanOrEqual(200);
    expect(result.newMindMapNodes[0].y).toBeGreaterThanOrEqual(100);
  });

  it('listas ausentes na resposta viram listas vazias', async () => {
    callAIMock.mockResolvedValue('{}');

    const result = await geminiService.analyzeLiveConversation(say('olá'), 'ctx');

    expect(result).toMatchObject({ source: 'ai', newQuestions: [], newPainPoints: [], newJtbds: [], newMindMapNodes: [], newUserFlowSteps: [] });
  });

  it('se a IA falhar, cai na heurística offline e devolve a mensagem de erro', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    callAIMock.mockRejectedValue(new Error('cota excedida'));

    const result = await geminiService.analyzeLiveConversation(say('a planilha trava'), 'ctx');

    expect(result.source).toBe('offline');
    expect(result.error).toBe('cota excedida');
    expect(result.newMindMapNodes.length).toBeGreaterThan(0);
  });
});

describe('geminiService.generateFullBacklogAndPRD', () => {
  it('sem chave devolve o backlog de exemplo, marcado como offline e com aviso', async () => {
    const result = await geminiService.generateFullBacklogAndPRD('Projeto X', 'texto', [], []);

    expect(callAIMock).not.toHaveBeenCalled();
    expect(result.source).toBe('offline');
    expect(result.error).toContain('Nenhuma chave de API');
    expect(result.epics).toHaveLength(1);
    expect(result.prd.title).toBe('PRD: Projeto X');
  });

  describe('com chave', () => {
    beforeEach(() => {
      storageService.setApiKey('sk-teste');
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('normaliza a resposta: valores inválidos viram padrões e ids ausentes são gerados', async () => {
      callAIMock.mockResolvedValue(JSON.stringify({
        okrs: [{ objective: 'O', keyResults: [{ description: 'K', baseline: '4h', target: '10min' }] }],
        epics: [{
          title: 'E', status: 'inexistente',
          features: [{
            title: 'F', effort: 'GG',
            userStories: [{ title: 'S', storyPoints: 'abc', tasks: [{ title: 'T', type: 'magia' }] }],
          }],
        }],
        prd: { problemStatement: 'P', inScope: ['a', 2] },
      }));

      const result = await geminiService.generateFullBacklogAndPRD('Projeto', 'texto', [], []);

      expect(result.source).toBe('ai');
      const epic = result.epics[0];
      expect(epic.id).toMatch(/^epic-ai-/);
      expect(epic.status).toBe('discovery');
      expect(epic.features[0].effort).toBe('M');
      expect(epic.features[0].epicId).toBe(epic.id);
      const story = epic.features[0].userStories[0];
      expect(story.featureId).toBe(epic.features[0].id);
      expect(story.storyPoints).toBeUndefined();
      expect(story.tasks[0]).toMatchObject({ type: 'backend', status: 'todo' });
      expect(result.okrs[0].keyResults[0]).toMatchObject({ baseline: '4h', current: '4h' });
      expect(result.prd.inScope).toEqual(['a', '2']);
      expect(result.prd.title).toBe('PRD: Projeto');
    });

    it('resposta sem épicos cai no backlog de exemplo, com o motivo', async () => {
      callAIMock.mockResolvedValue(JSON.stringify({ okrs: [], epics: [], prd: { problemStatement: 'P' } }));

      const result = await geminiService.generateFullBacklogAndPRD('Projeto', 'texto', [], []);

      expect(result.source).toBe('offline');
      expect(result.error).toContain('não retornou épicos');
    });

    it('falha da IA cai no backlog de exemplo, com a mensagem de erro', async () => {
      callAIMock.mockRejectedValue(new Error('sem rede'));

      const result = await geminiService.generateFullBacklogAndPRD('Projeto', 'texto', [], []);

      expect(result.source).toBe('offline');
      expect(result.error).toBe('sem rede');
    });

    it('limita a transcrição enviada a 20 mil caracteres', async () => {
      callAIMock.mockResolvedValue('{}');

      await geminiService.generateFullBacklogAndPRD('Projeto', 'a'.repeat(50_000), [], []);

      const prompt = callAIMock.mock.calls[0][0].userPrompt;
      expect(prompt.length).toBeLessThan(21_000);
    });
  });
});

describe('geminiService.testApiKey', () => {
  it('recusa chave vazia sem chamar a IA', async () => {
    const result = await geminiService.testApiKey('');

    expect(result).toEqual({ success: false, message: 'Chave de API não informada.' });
    expect(callAIMock).not.toHaveBeenCalled();
  });

  it('chave sk- usa OpenAI e informa o modelo na mensagem de sucesso', async () => {
    callAIMock.mockResolvedValue('OK');

    const result = await geminiService.testApiKey('sk-teste', 'gpt-4o');

    expect(result.success).toBe(true);
    expect(result.message).toContain('OpenAI');
    expect(result.message).toContain('gpt-4o');
    expect(callAIMock.mock.calls[0][0]).toMatchObject({ provider: 'openai', retries: 0, json: false });
  });

  it('chave sem prefixo usa o provider salvo (Gemini)', async () => {
    storageService.setAiProvider('gemini');
    callAIMock.mockResolvedValue('OK');

    const result = await geminiService.testApiKey('AIza-teste');

    expect(result.message).toContain('Google Gemini');
    expect(callAIMock.mock.calls[0][0].provider).toBe('gemini');
  });

  it('devolve a mensagem de erro quando a conexão falha', async () => {
    callAIMock.mockRejectedValue(new Error('chave inválida'));

    expect(await geminiService.testApiKey('sk-ruim')).toEqual({ success: false, message: 'chave inválida' });
  });
});
