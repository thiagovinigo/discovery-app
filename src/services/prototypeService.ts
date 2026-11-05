import { callAI } from './aiClient';
import { tokens } from './knowledgeService';
import { storageService } from './storageService';
import { extractStoryMap } from './storyMapService';
import type {
  DiscoveryProject,
  MeetingSession,
  PrototypeScreen,
  SessionPrototype,
  StoryMapCard,
  UserFlowStep
} from '../types/discovery';

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function deriveFields(step: UserFlowStep, cards: StoryMapCard[]): string[] {
  const combined = `${step.title} ${step.painPointDetected ?? ''} ${cards.map(c => c.title).join(' ')}`;
  const words = tokens(combined).filter(w => w.length > 3);
  const unique = [...new Set(words)].slice(0, 3);
  if (unique.length === 0) {
    return ['Identificação do registro', 'Observações da etapa'];
  }
  return unique.map(w => `Campo: ${capitalize(w)}`);
}

/**
 * Deriva uma tela de protótipo por etapa da jornada, enriquecida com as histórias do Story Map
 * e estados de erro/alerta vindos da fricção mapeada na conversa.
 */
export function buildPrototypeScreens(session: MeetingSession): PrototypeScreen[] {
  const steps = [...session.userFlowSteps].sort((a, b) => a.stepNumber - b.stepNumber);
  if (steps.length === 0) return [];

  const cards = session.storyMapCards ?? extractStoryMap(session);

  return steps.map((step, idx) => {
    const stepCards = cards.filter(c => c.stepId === step.id);
    const storyTitles = stepCards.map(c => c.title);
    const goal =
      step.opportunity?.trim() ||
      stepCards[0]?.soThat ||
      `Concluir "${step.title}" sem bloqueios operacionais`;

    return {
      id: `proto-screen-${step.id}`,
      stepNumber: step.stepNumber,
      title: step.title,
      actor: step.actor || 'Usuário',
      goal,
      fields: deriveFields(step, stepCards),
      primaryAction: idx < steps.length - 1 ? `Confirmar e avançar para Etapa ${steps[idx + 1].stepNumber} →` : 'Finalizar fluxo com sucesso',
      secondaryActions: idx > 0 ? ['← Voltar para etapa anterior', 'Salvar rascunho'] : ['Salvar rascunho'],
      errorState: step.painPointDetected || (step.frictionLevel !== 'smooth' ? `Validação preventiva para evitar atrito em "${step.title}"` : undefined),
      storyTitles
    };
  });
}

/**
 * Renderiza o HTML autossuficiente do wireframe de baixa fidelidade (funciona 100% sem IA e dentro de iframe sandbox).
 */
export function renderWireframeHtml(projectName: string, sessionTitle: string, screens: PrototypeScreen[]): string {
  const screenTabs = screens
    .map(
      (s, idx) =>
        `<button class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="showScreen(${idx})" id="tab-${idx}">Etapa ${s.stepNumber}: ${escapeHtml(s.title)}</button>`
    )
    .join('\n');

  const screenPanels = screens
    .map((s, idx) => {
      const fieldsHtml = s.fields
        .map(
          f => `
          <div class="field">
            <label>${escapeHtml(f)}</label>
            <input type="text" placeholder="Digite ${escapeHtml(f.toLowerCase())}..." />
          </div>`
        )
        .join('');

      const storiesHtml = s.storyTitles.length
        ? `<div class="stories"><strong>Histórias atendidas nesta tela:</strong><ul>${s.storyTitles.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`
        : '';

      const errorHtml = s.errorState
        ? `<div class="alert"><strong>Estado de validação / prevenção de dor:</strong> ${escapeHtml(s.errorState)}</div>`
        : '';

      const prevBtn = idx > 0 ? `<button class="btn-secondary" onclick="showScreen(${idx - 1})">← Etapa anterior</button>` : '';
      const nextBtn =
        idx < screens.length - 1
          ? `<button class="btn-primary" onclick="showScreen(${idx + 1})">${escapeHtml(s.primaryAction)}</button>`
          : `<button class="btn-primary">${escapeHtml(s.primaryAction)}</button>`;

      return `
      <section class="screen-panel" id="screen-${idx}" style="display: ${idx === 0 ? 'block' : 'none'}">
        <div class="screen-header">
          <span class="badge">Etapa ${s.stepNumber} de ${screens.length} · Ator: ${escapeHtml(s.actor)}</span>
          <h2>${escapeHtml(s.title)}</h2>
          <p class="goal">Objetivo: ${escapeHtml(s.goal)}</p>
        </div>
        ${errorHtml}
        <div class="form-grid">
          ${fieldsHtml}
        </div>
        ${storiesHtml}
        <div class="actions">
          ${prevBtn}
          <button class="btn-secondary">Salvar rascunho</button>
          ${nextBtn}
        </div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Protótipo — ${escapeHtml(projectName)}</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
    header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #334155; }
    header h1 { margin: 0 0 4px 0; font-size: 1.15rem; color: #e2e8f0; }
    header p { margin: 0; font-size: 0.8rem; color: #94a3b8; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .tab-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; border-radius: 8px; padding: 7px 12px; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
    .tab-btn.active { background: #4f46e5; color: #ffffff; border-color: #6366f1; }
    .screen-panel { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
    .badge { display: inline-block; font-size: 0.72rem; font-weight: 700; color: #a5b4fc; background: rgba(99, 102, 241, 0.18); padding: 3px 9px; border-radius: 999px; margin-bottom: 8px; }
    .screen-header h2 { margin: 4px 0; font-size: 1.1rem; }
    .goal { margin: 0 0 14px 0; font-size: 0.84rem; color: #94a3b8; }
    .alert { background: rgba(244, 63, 94, 0.14); border: 1px solid rgba(244, 63, 94, 0.4); color: #fda4af; padding: 10px 12px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 14px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .field label { display: block; font-size: 0.76rem; font-weight: 600; color: #cbd5e1; margin-bottom: 4px; }
    .field input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 0.82rem; }
    .stories { background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; font-size: 0.78rem; margin-bottom: 16px; }
    .stories ul { margin: 6px 0 0; padding-left: 18px; color: #cbd5e1; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid #334155; }
    .btn-primary { background: #6366f1; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
    .btn-secondary { background: transparent; color: #cbd5e1; border: 1px solid #475569; border-radius: 8px; padding: 8px 14px; font-size: 0.8rem; cursor: pointer; }
  </style>
</head>
<body>
  <header>
    <h1>Wireframe Navegável — ${escapeHtml(projectName)}</h1>
    <p>Sessão: ${escapeHtml(sessionTitle)} · Gerado a partir da Jornada e do User Story Map (baixa fidelidade, sem IA)</p>
  </header>
  <nav class="tabs">
    ${screenTabs}
  </nav>
  <main>
    ${screenPanels}
  </main>
  <script>
    function showScreen(index) {
      var panels = document.querySelectorAll('.screen-panel');
      var tabs = document.querySelectorAll('.tab-btn');
      for (var i = 0; i < panels.length; i++) {
        panels[i].style.display = i === index ? 'block' : 'none';
        if (tabs[i]) {
          tabs[i].className = i === index ? 'tab-btn active' : 'tab-btn';
        }
      }
    }
  </script>
</body>
</html>`;
}

export function buildOfflinePrototype(session: MeetingSession, projectName: string): SessionPrototype {
  const screens = buildPrototypeScreens(session);
  return {
    generatedAt: new Date().toISOString(),
    source: 'offline',
    screens,
    html: screens.length > 0 ? renderWireframeHtml(projectName, session.title, screens) : ''
  };
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Gera protótipo navegável com IA quando há chave configurada, ou devolve o wireframe de baixa fidelidade (offline).
 * Se a chamada à IA falhar, faz fallback seguro para o wireframe offline.
 */
export async function generatePrototypeWithAI(
  session: MeetingSession,
  project: DiscoveryProject
): Promise<SessionPrototype> {
  const offline = buildOfflinePrototype(session, project.name);
  if (offline.screens.length === 0) return offline;

  const apiKey = storageService.getApiKey();
  if (!apiKey) return offline;

  const systemPrompt = `Você é um Product Designer e Frontend Architect sênior.
Construa um protótipo HTML5 autossuficiente (com CSS moderno embutido e navegação entre telas via JavaScript puro) representando fielmente as etapas e histórias abaixo.
Regras:
- Responda APENAS com o código HTML completo (começando em <!DOCTYPE html>).
- Use design escuro elegante (tokens: fundo #0f172a, cartões #1e293b, destaque #6366f1, texto #f8fafc).
- Crie uma barra de navegação para alternar entre todas as telas mapeadas.
- Inclua os campos, botões de ação e alertas de validação de cada etapa.`;

  const userPrompt = `Projeto: ${project.name} (${project.description})
Sessão: ${session.title}
Telas do Story Map:
${JSON.stringify(offline.screens, null, 2)}`;

  try {
    const raw = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      json: false
    });
    const cleaned = stripCodeFences(raw);
    if (!cleaned || !cleaned.toLowerCase().includes('<html')) {
      return offline;
    }
    return {
      generatedAt: new Date().toISOString(),
      source: 'ai',
      screens: offline.screens,
      html: cleaned
    };
  } catch {
    return offline;
  }
}
