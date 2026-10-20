import { DiscoveryProject, Epic, MeetingSession } from '../types/discovery';
import { isFilled } from './interviewService';
import { ROLE_LABELS } from './stakeholderService';
import { validationOf } from './backlogItemService';
import { traceLines, withoutInvalidated } from './exportTrace';
import type { ExportOptions } from './exportTrace';

const NOT_INFORMED = 'Não informado.';

/** O texto que o usuário escreveu; se faltar (ou for o texto de preenchimento antigo), diz que não foi informado em vez de inventar. */
const informed = (value?: string): string => (isFilled(value) ? value!.trim() : NOT_INFORMED);

/** Uma linha de lista por item; lista vazia vira "Não informado." */
const bulletList = <T,>(items: T[], line: (item: T) => string, empty: string = NOT_INFORMED): string =>
  items.length ? items.map(line).join('') : `- ${empty}\n`;

const NOT_PROVIDED = 'Not provided.';

/** Igual a `informed`, para o SPEC, que é escrito em inglês. */
const provided = (value?: string): string => (isFilled(value) ? value!.trim() : NOT_PROVIDED);

const EPIC_STATUS_LABELS: Record<Epic['status'], string> = {
  discovery: 'Em discovery',
  ready_for_dev: 'Pronto para desenvolvimento',
  in_progress: 'Em andamento',
  done: 'Concluído'
};

/** Itens de DoR/DoD das histórias, sem repetir, com quantas histórias já o marcaram. Sem itens: "Ainda não definidos." */
const checklistSummary = (items: { label: string; checked: boolean }[]): string => {
  if (items.length === 0) return `Ainda não definidos.\n`;
  const byLabel = new Map<string, { checked: number; total: number }>();
  for (const item of items) {
    const entry = byLabel.get(item.label) ?? { checked: 0, total: 0 };
    entry.total++;
    if (item.checked) entry.checked++;
    byLabel.set(item.label, entry);
  }
  return [...byLabel.entries()].map(([label, { checked, total }]) => `- [${checked === total ? 'x' : ' '}] ${label} (${checked}/${total} histórias)\n`).join('');
};

/** Linhas de rastreabilidade (validação, evidência, fatiamento, origem) de um item, como texto de uma linha só. */
const traceInline = (item: Parameters<typeof traceLines>[0]): string => {
  const lines = traceLines(item);
  return lines.length ? ` | ${lines.join(' | ')}` : '';
};

export const exportService = {
  exportToJiraCsv(source: DiscoveryProject, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    const headers = ['Issue Type', 'Summary', 'Description', 'Epic Link', 'Story Points', 'Priority', 'Acceptance Criteria'];
    const rows: string[][] = [];

    project.epics.forEach(epic => {
      rows.push([
        'Epic',
        `"${epic.title.replace(/"/g, '""')}"`,
        `"${epic.objective.replace(/"/g, '""')} - Valor de Negócio: ${epic.businessValue.replace(/"/g, '""')}"`,
        '',
        '',
        'High',
        ''
      ]);

      epic.features.forEach(feat => {
        rows.push([
          'Feature',
          `"${feat.title.replace(/"/g, '""')}"`,
          `"${feat.description.replace(/"/g, '""')} | Proposta de Valor: ${feat.valueProposition.replace(/"/g, '""')}"`,
          `"${epic.title.replace(/"/g, '""')}"`,
          '',
          feat.riceScore && feat.riceScore.total > 800 ? 'High' : 'Medium',
          ''
        ]);

        feat.userStories.forEach(us => {
          const acText = us.acceptanceCriteria
            .map(ac => `Cenário: ${ac.scenario}\nDado que: ${ac.given}\nQuando: ${ac.when}\nEntão: ${ac.then}`)
            .join('\n\n');

          rows.push([
            'Story',
            `"${us.title.replace(/"/g, '""')}"`,
            `"Como ${us.asA}, eu quero ${us.iWantTo}, para que ${us.soThat}${traceInline(us).replace(/"/g, '""')}"`,
            `"${epic.title.replace(/"/g, '""')}"`,
            us.storyPoints ? us.storyPoints.toString() : '3',
            'Medium',
            `"${acText.replace(/"/g, '""')}"`
          ]);

          us.tasks.forEach(task => {
            rows.push([
              'Sub-task',
              `"[${task.type.toUpperCase()}] ${task.title.replace(/"/g, '""')}"`,
              `"Task técnica de engenharia vinculada à história ${us.title}"`,
              `"${epic.title.replace(/"/g, '""')}"`,
              '',
              'Medium',
              ''
            ]);
          });
        });
      });
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  exportToMarkdown(source: DiscoveryProject, activeSession?: MeetingSession, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    let md = `# Discovery ao Done: ${project.name}\n\n`;
    md += `> **Descrição:** ${project.description}\n`;
    md += `> **Data de Atualização:** ${project.updatedAt}\n\n`;

    if (activeSession) {
      md += `## 🎙️ Resumo da Sessão Recente: ${activeSession.title}\n`;
      md += `**Data:** ${activeSession.date} | **Participantes:** ${activeSession.participants.join(', ')}\n\n`;
      md += `### 💡 TL;DR\n${activeSession.summary.tldr}\n\n`;

      if (activeSession.summary.mainTakeaways.length > 0) {
        md += `### 📌 Principais Aprendizados\n`;
        activeSession.summary.mainTakeaways.forEach(t => md += `- ${t}\n`);
        md += `\n`;
      }

      if (activeSession.painPoints.length > 0) {
        md += `### 🔥 Dores Críticas Descobertas\n`;
        activeSession.painPoints.forEach(p => {
          md += `- **[Severidade: ${p.severity.toUpperCase()}]** ${p.description}\n`;
          if (p.quote) md += `  > "${p.quote}"\n`;
        });
        md += `\n`;
      }

      if (activeSession.jtbds.length > 0) {
        md += `### 🎯 Jobs to Be Done (JTBD)\n`;
        activeSession.jtbds.forEach(j => {
          md += `- **Contexto:** Quando ${j.context}\n  **Job:** Eu quero ${j.job}\n  **Resultado:** Para que ${j.outcome}\n\n`;
        });
      }
    }

    md += `## 🎯 OKRs de Negócio\n`;
    project.okrs.forEach(okr => {
      md += `### Objetivo: ${okr.objective}\n`;
      okr.keyResults.forEach(kr => {
        md += `- **KR:** ${kr.description} (Baseline: ${kr.baseline} ➔ Meta: ${kr.target} | Atual: ${kr.current})\n`;
      });
      md += `\n`;
    });

    md += `## 🚀 Épicos, Features e Backlog Técnico\n`;
    project.epics.forEach(epic => {
      md += `### 📦 ${epic.title}\n`;
      md += `*Objetivo:* ${epic.objective}\n\n*Valor de Negócio:* ${epic.businessValue}\n\n`;

      epic.features.forEach(feat => {
        md += `#### 🔹 Feature: ${feat.title} (Esforço: ${feat.effort}${feat.riceScore ? ` | RICE: ${feat.riceScore.total}` : ''})\n`;
        md += `${feat.description}\n\n`;

        feat.userStories.forEach(us => {
          md += `##### 📝 História de Usuário: ${us.title} (${us.storyPoints || 3} pts)\n`;
          md += `**Como** ${us.asA}, **eu quero** ${us.iWantTo}, **para que** ${us.soThat}.\n\n`;

          if (us.acceptanceCriteria.length > 0) {
            md += `**Critérios de Aceite (Gherkin):**\n`;
            us.acceptanceCriteria.forEach(ac => {
              md += `\`\`\`gherkin\nCenário: ${ac.scenario}\nDado que: ${ac.given}\nQuando: ${ac.when}\nEntão: ${ac.then}\n\`\`\`\n`;
            });
          }

          if (us.tasks.length > 0) {
            md += `**Tasks Técnicas:**\n`;
            us.tasks.forEach(t => {
              md += `- [ ] [${t.type.toUpperCase()}] ${t.title} (${t.estimatedHours || 4}h)\n`;
            });
            md += `\n`;
          }
        });
      });
    });

    md += `## 📄 PRD: ${project.prd.title}\n`;
    md += `**Problema:** ${project.prd.problemStatement}\n\n`;
    md += `**Público Alvo:** ${project.prd.targetAudience}\n\n`;
    md += `**Proposta de Valor:** ${project.prd.valueProposition}\n\n`;

    md += `### Escopo (In-Scope)\n`;
    project.prd.inScope.forEach(s => md += `- ${s}\n`);
    md += `\n### Fora de Escopo (Out-of-Scope)\n`;
    project.prd.outOfScope.forEach(s => md += `- ${s}\n`);
    md += `\n### Métricas de Sucesso\n`;
    project.prd.successMetrics.forEach(m => md += `- ${m}\n`);

    return md;
  },

  exportToJson(project: DiscoveryProject): string {
    return JSON.stringify(project, null, 2);
  },

  exportToGitHubIssues(source: DiscoveryProject, options?: ExportOptions): { title: string; body: string; labels: string[] }[] {
    const project = withoutInvalidated(source, options);
    const issues: { title: string; body: string; labels: string[] }[] = [];

    project.epics.forEach(epic => {
      epic.features.forEach(feat => {
        feat.userStories.forEach(us => {
          const acGherkin = us.acceptanceCriteria
            .map(ac => `### Scenario: ${ac.scenario}\n\`\`\`gherkin\nGiven ${ac.given}\nWhen ${ac.when}\nThen ${ac.then}\n\`\`\``)
            .join('\n\n');

          const tasksList = us.tasks
            .map(t => `- [ ] \`[${t.type.toUpperCase()}]\` ${t.title} (${t.estimatedHours || 4}h)`)
            .join('\n');

          const dorList = (us.dorChecklist || [])
            .map(d => `- [${d.checked ? 'x' : ' '}] ${d.label}`)
            .join('\n');

          const dodList = (us.dodChecklist || [])
            .map(d => `- [${d.checked ? 'x' : ' '}] ${d.label}`)
            .join('\n');

          const evidenceSection = us.evidenceQuote
            ? `\n> 💬 **Evidência de Discovery (${us.evidenceQuote.speaker}):**\n> "*${us.evidenceQuote.text}*"\n`
            : '';

          const body = `## 📖 User Story\n**Como** ${us.asA}\n**Eu quero** ${us.iWantTo}\n**Para que** ${us.soThat}\n\n` +
            `* **Épico:** ${epic.title}\n` +
            `* **Feature:** ${feat.title}\n` +
            `* **Story Points:** ${us.storyPoints || 3}\n` +
            `* **Domínio:** ${us.domain || 'core'}\n` +
            evidenceSection +
            (traceLines(us).length ? `\n## 🔎 Rastreabilidade\n${traceLines(us).map(line => `- ${line}`).join('\n')}\n` : '') +
            `\n## ✅ Critérios de Aceite (BDD)\n${acGherkin}\n\n` +
            (dorList ? `## 🚦 Definition of Ready (DoR)\n${dorList}\n\n` : '') +
            (dodList ? `## 🏁 Definition of Done (DoD)\n${dodList}\n\n` : '') +
            `## 🛠️ Tasks de Engenharia\n${tasksList}\n`;

          const labels = ['user-story', us.domain || 'product', `points:${us.storyPoints || 3}`];
          if (us.isBug) labels.push('bug');

          issues.push({
            title: `[Story] ${us.title}`,
            body,
            labels
          });
        });
      });
    });

    return issues;
  },

  exportToLinear(source: DiscoveryProject, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    let output = `# Linear Backlog Import: ${project.name}\n\n`;

    project.epics.forEach(epic => {
      output += `## Project / Epic: ${epic.title}\n`;
      output += `> Objective: ${epic.objective}\n\n`;

      epic.features.forEach(feat => {
        feat.userStories.forEach(us => {
          output += `### ${us.title}\n`;
          output += `- **Estimate:** ${us.storyPoints || 3} pts\n`;
          output += `- **Priority:** High\n`;
          output += `- **Labels:** ${us.domain || 'core'}, discovery-${validationOf(us)}\n`;
          traceLines(us).forEach(line => {
            output += `- **Rastreio:** ${line}\n`;
          });
          if (us.evidenceQuote) {
            output += `- **Discovery Quote:** "${us.evidenceQuote.text}" - ${us.evidenceQuote.speaker}\n`;
          }
          output += `\n**Description:**\n`;
          output += `As a ${us.asA}, I want to ${us.iWantTo}, so that ${us.soThat}.\n\n`;
          output += `**Acceptance Criteria:**\n`;
          us.acceptanceCriteria.forEach(ac => {
            output += `- Given ${ac.given}, When ${ac.when}, Then ${ac.then}\n`;
          });
          output += `\n---\n\n`;
        });
      });
    });

    return output;
  },

  exportToJiraJson(source: DiscoveryProject, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    const issues: any[] = [];

    project.epics.forEach(epic => {
      issues.push({
        fields: {
          project: { key: 'DISC' },
          summary: epic.title,
          description: `${epic.objective}\n\nBusiness Value: ${epic.businessValue}`,
          issuetype: { name: 'Epic' }
        }
      });

      epic.features.forEach(feat => {
        feat.userStories.forEach(us => {
          const ac = us.acceptanceCriteria.map(a => `*Scenario: ${a.scenario}*\nGiven ${a.given}\nWhen ${a.when}\nThen ${a.then}`).join('\n\n');
          issues.push({
            fields: {
              project: { key: 'DISC' },
              summary: us.title,
              description: `As a ${us.asA}, I want to ${us.iWantTo}, so that ${us.soThat}.\n\n*Acceptance Criteria:*\n${ac}\n\n${us.evidenceQuote ? `*Discovery Evidence (${us.evidenceQuote.speaker}):* "${us.evidenceQuote.text}"` : ''}${traceLines(us).length ? `\n\n*Rastreabilidade:*\n${traceLines(us).map(line => `- ${line}`).join('\n')}` : ''}`,
              issuetype: { name: 'Story' },
              customfield_10016: us.storyPoints || 3, // Jira Story Points standard ID
              labels: [us.domain || 'core', 'discovery-ai', `discovery-${validationOf(us)}`]
            }
          });
        });
      });
    });

    return JSON.stringify({ issues }, null, 2);
  },

  exportToPRD(source: DiscoveryProject, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    const prd = project.prd;
    let md = `# PRD: ${prd.title || project.name}\n\n`;
    // O app não registra aprovação do PRD, então ele nunca se declara aprovado: é um rascunho até alguém aprovar fora daqui.
    md += `> **Versão:** ${prd.version || '0.1 (rascunho)'} | **Status:** Rascunho | **Última Atualização:** ${prd.lastUpdated || project.updatedAt}\n\n`;
    md += `---\n\n`;

    // 1. Problema e Oportunidade
    md += `## 1. Problema e Oportunidade\n\n`;
    md += `### Problema Central\n`;
    md += `**${isFilled(prd.problemStatement) ? prd.problemStatement.trim() : informed(project.description)}**\n\n`;
    md += `### Contexto e Evidências de Discovery\n`;
    md += `- **Segmento Afetado:** ${informed(prd.targetAudience)}\n`;
    md += `- **Evidências Coletadas:**\n`;

    // Extract interview quotes from sessions & stories
    const quotes: { speaker: string; text: string; context?: string }[] = [];
    project.sessions.forEach(s => {
      (s.summary.goldenQuotes || []).forEach(g => quotes.push({ speaker: g.speaker, text: g.quote, context: g.context }));
      s.painPoints.forEach(p => {
        if (p.quote) quotes.push({ speaker: 'Entrevista de Discovery', text: p.quote, context: p.description });
      });
    });

    if (quotes.length > 0) {
      quotes.slice(0, 5).forEach(q => {
        md += `  - 💬 *"${q.text}"* — **${q.speaker}**${q.context ? ` (${q.context})` : ''}\n`;
      });
    } else {
      md += `  - Ainda não há citações de entrevistas registradas.\n`;
    }
    md += `\n`;

    md += `### Oportunidade de Negócio\n`;
    md += `- **Proposta de Valor:** ${informed(prd.valueProposition)}\n`;
    if (project.leanCanvas?.unfairAdvantage) {
      md += `- **Vantagem Competitiva Única:** ${project.leanCanvas.unfairAdvantage}\n`;
    }
    md += `\n---\n\n`;

    // 2. Audiência & Personas Vivas
    md += `## 2. Audiência & Personas Vivas (JTBD)\n\n`;
    if (project.personas && project.personas.length > 0) {
      project.personas.forEach((pers, idx) => {
        md += `### ${idx === 0 ? 'Persona Primária' : 'Persona Secundária'}: ${pers.name} (${pers.role})\n`;
        md += `- **Segmento:** ${pers.segment}\n`;
        md += `- **Objetivos:** ${pers.goals.join('; ')}\n`;
        md += `- **Dores Principais:** ${pers.painPoints.join('; ')}\n`;
        if (pers.jtbds && pers.jtbds.length > 0) {
          md += `- **Jobs To Be Done (JTBD):**\n`;
          pers.jtbds.forEach(j => md += `  - ${j}\n`);
        }
        if (pers.quotes && pers.quotes.length > 0) {
          md += `- **Citação Real:** *"${pers.quotes[0]}"*\n`;
        }
        md += `\n`;
      });
    } else {
      md += `**Público Alvo:** ${informed(prd.targetAudience)}\n\n`;
    }

    md += `### Não-Audiência (Out-of-Scope para Usuários)\n`;
    md += `${NOT_INFORMED}\n\n`;
    md += `---\n\n`;

    // 3. Solução & Escopo de Produto
    md += `## 3. Solução & Escopo de Produto\n\n`;
    md += `### Visão da Solução\n`;
    md += `${informed(prd.valueProposition)}\n\n`;

    md += `### Escopo de Inclusão (In-Scope)\n`;
    md += bulletList(prd.inScope, item => `- [x] ${item}\n`);
    md += `\n`;

    md += `### Escopo de Exclusão (Out-of-Scope)\n`;
    md += bulletList(prd.outOfScope, item => `- [ ] ⛔ ${item}\n`);
    md += `\n`;

    md += `### Épicos e Features Detalhadas\n\n`;
    if (project.epics.length === 0) md += `Nenhum épico no backlog ainda.\n\n`;
    project.epics.forEach((epic, eIdx) => {
      md += `#### Épico ${eIdx + 1}: ${epic.title}\n`;
      md += `*Objetivo:* ${epic.objective}\n\n`;
      md += `*Valor de Negócio:* ${epic.businessValue}\n\n`;

      epic.features.forEach(feat => {
        md += `##### Feature: ${feat.title}\n`;
        md += `- **Descrição:** ${feat.description}\n`;
        md += `- **Proposta de Valor:** ${feat.valueProposition}\n`;
        md += `- **Esforço Estimado:** ${feat.effort} | **Domínio:** ${feat.domain || 'core'}\n`;
        if (feat.riceScore) {
          md += `- **RICE Score:** Reach: ${feat.riceScore.reach} | Impact: ${feat.riceScore.impact} | Confidence: ${feat.riceScore.confidence}% | Effort: ${feat.riceScore.effort} ➔ **Total: ${feat.riceScore.total}**\n`;
        }
        md += `\n`;
      });
    });
    md += `---\n\n`;

    // 4. Métricas e Success Criteria
    md += `## 4. Métricas e Critérios de Sucesso (OKRs)\n\n`;
    md += `### Tabela de Key Results (KRs)\n\n`;
    if (project.okrs.length === 0) {
      md += `Nenhum OKR definido.\n`;
    } else {
      md += `| Métrica / KR | Baseline Atual | Meta (Target) | Status |\n`;
      md += `|---|---|---|---|\n`;
      project.okrs.forEach(okr => {
        okr.keyResults.forEach(kr => {
          md += `| ${kr.description} | ${kr.baseline} | **${kr.target}** | ${kr.current || '—'} |\n`;
        });
      });
    }
    md += `\n`;

    md += `### Métricas de Sucesso\n`;
    md += bulletList(prd.successMetrics, metric => `- ${metric}\n`);
    md += `\n---\n\n`;

    // 5. Constraints, Riscos & Registro de Decisões
    md += `## 5. Restrições Técnicas, Riscos & Decisões\n\n`;
    md += `### Matriz de Riscos e Mitigações\n\n`;
    if (prd.risksAndMitigations.length === 0) {
      md += `Nenhum risco mapeado.\n`;
    } else {
      md += `| Risco Mapeado | Mitigação |\n`;
      md += `|---|---|\n`;
      prd.risksAndMitigations.forEach(rm => {
        md += `| ${rm.risk} | ${rm.mitigation.trim() || '—'} |\n`;
      });
    }
    md += `\n`;

    if (project.decisionLog && project.decisionLog.length > 0) {
      md += `### Registro de Decisões de Produto (Decision Log)\n\n`;
      project.decisionLog.forEach(dec => {
        md += `- **${dec.decision}** (${dec.date})\n`;
        md += `  - *Contexto:* ${dec.context}\n`;
        md += `  - *Responsável/Driver:* ${dec.driver} | *Impacto:* ${dec.consequences}\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // 6. Roadmap
    md += `## 6. Roadmap\n\n`;
    if (project.epics.length === 0) {
      md += `Ainda não definido: o roadmap vem dos épicos do backlog.\n\n`;
    } else {
      md += `| Épico | Status | Data alvo |\n`;
      md += `|---|---|---|\n`;
      project.epics.forEach(epic => {
        md += `| ${epic.title} | ${EPIC_STATUS_LABELS[epic.status]} | ${epic.targetDate || '—'} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // 7. Casos de Uso & Histórias de Usuário BDD
    md += `## 7. Casos de Uso e User Stories (Gherkin BDD)\n\n`;
    project.epics.forEach(epic => {
      epic.features.forEach(feat => {
        feat.userStories.forEach(us => {
          md += `### [${us.domain ? us.domain.toUpperCase() : 'CORE'}] ${us.title} (${us.storyPoints || 3} pts)\n`;
          md += `**Como** ${us.asA}, **eu quero** ${us.iWantTo}, **para que** ${us.soThat}.\n\n`;

          if (us.evidenceQuote) {
            md += `> 💬 **Evidência de Discovery (${us.evidenceQuote.speaker}):**\n`;
            md += `> "*${us.evidenceQuote.text}*"\n\n`;
          }

          if (us.acceptanceCriteria.length > 0) {
            md += `**Critérios de Aceite (Gherkin):**\n\n`;
            us.acceptanceCriteria.forEach(ac => {
              md += `\`\`\`gherkin\nCenário: ${ac.scenario}\nDado que ${ac.given}\nQuando ${ac.when}\nEntão ${ac.then}\n\`\`\`\n\n`;
            });
          }

          if (us.tasks.length > 0) {
            md += `**Tasks Técnicas:**\n`;
            us.tasks.forEach(t => {
              md += `- [ ] \`[${t.type.toUpperCase()}]\` ${t.title} (${t.estimatedHours || 4}h)\n`;
            });
            md += `\n`;
          }
        });
      });
    });
    md += `---\n\n`;

    // 8. Governança, DoR, DoD & Aprovações
    const stories = project.epics.flatMap(e => e.features).flatMap(f => f.userStories);
    md += `## 8. Governança, DoR, DoD e Aprovações\n\n`;
    md += `### Definition of Ready (DoR)\n`;
    md += checklistSummary(stories.flatMap(s => s.dorChecklist ?? []));
    md += `\n### Definition of Done (DoD)\n`;
    md += checklistSummary(stories.flatMap(s => s.dodChecklist ?? []));

    md += `\n### Aprovações\n\n`;
    // O app não registra aprovações: quem decide ou patrocina aparece como pendente até aprovar fora daqui.
    const approvers = (project.stakeholders ?? []).filter(s => s.role === 'decisor' || s.role === 'patrocinador');
    if (approvers.length === 0) {
      md += `Nenhuma aprovação registrada. Cadastre decisores e patrocinadores em Stakeholders para listá-los aqui.\n`;
    } else {
      md += `| Papel | Nome | Status | Data |\n`;
      md += `|---|---|---|---|\n`;
      approvers.forEach(a => {
        md += `| ${ROLE_LABELS[a.role]} | ${a.name} | ⏳ Pendente | — |\n`;
      });
    }

    return md;
  },

  exportToAISpec(source: DiscoveryProject, options?: ExportOptions): string {
    const project = withoutInvalidated(source, options);
    const prd = project.prd;
    let spec = `# SPEC.md — AI Autonomous Implementation Specification\n\n`;
    spec += `> **Project:** ${project.name}\n`;
    spec += `> **Target AI Agents:** Claude Code, Antigravity, Cursor Agent, GitHub Copilot Workspace, OpenAI o3/Codex\n`;
    spec += `> **Specification Version:** ${prd.version || '0.1 (draft)'}\n`;
    spec += `> **Generated At:** ${new Date().toISOString()}\n\n`;
    spec += `---\n\n`;

    // 1. AI EXECUTION DIRECTIVES
    spec += `## 1. System Execution Prompt for AI Coding Agent\n\n`;
    spec += `\`\`\`text\n`;
    spec += `You are an expert autonomous software engineer assigned to implement the product specifications below.\n`;
    spec += `Follow these non-negotiable engineering principles:\n`;
    spec += `1. ZERO CODE PLACEHOLDERS: Implement all methods, parsers, algorithms, and interfaces completely.\n`;
    spec += `2. STRICT CONTRACT ADHERENCE: Follow all provided TypeScript types and schemas without arbitrary renames.\n`;
    spec += `3. DEFENSIVE PROGRAMMING: Handle edge cases, null/undefined payloads, invalid input, and network failures.\n`;
    spec += `4. TEST-DRIVEN: Treat every Gherkin scenario as a mandatory unit/integration test assertion.\n`;
    spec += `5. SECURITY: Validate input at system boundaries and never commit secrets or credentials.\n`;
    spec += `\`\`\`\n\n`;


    // 2. Contexto do produto: só o que o usuário escreveu no PRD
    spec += `## 2. Product Context\n\n`;
    spec += `- **Problem:** ${provided(prd.problemStatement)}\n`;
    spec += `- **Target audience:** ${provided(prd.targetAudience)}\n`;
    spec += `- **Value proposition:** ${provided(prd.valueProposition)}\n`;
    if (isFilled(prd.northStarMetric)) spec += `- **North Star metric:** ${prd.northStarMetric!.trim()}\n`;
    spec += `\n### In scope\n`;
    spec += bulletList(prd.inScope, item => `- ${item}\n`, NOT_PROVIDED);
    spec += `\n### Out of scope\n`;
    spec += bulletList(prd.outOfScope, item => `- ${item}\n`, NOT_PROVIDED);
    spec += `\n### Technology\n`;
    spec += `Not specified by the product team. Follow the conventions and stack of the existing codebase and do not introduce new frameworks without justification.\n\n`;

    // 3. Critérios de sucesso, premissas e riscos
    spec += `## 3. Success Criteria, Assumptions & Risks\n\n`;
    spec += `### Success metrics\n`;
    spec += bulletList(prd.successMetrics, item => `- ${item}\n`, NOT_PROVIDED);
    spec += `\n### Assumptions\n`;
    spec += bulletList(prd.assumptions, item => `- ${item}\n`, NOT_PROVIDED);
    spec += `\n### Risks and mitigations\n`;
    spec += bulletList(prd.risksAndMitigations, rm => `- ${rm.risk}${rm.mitigation.trim() ? ` → ${rm.mitigation.trim()}` : ''}\n`, NOT_PROVIDED);
    spec += `\n`;

    // 4. STEP-BY-STEP IMPLEMENTATION PLAN FOR AI
    spec += `## 4. Step-by-Step AI Implementation Plan\n\n`;
    let taskCounter = 1;

    project.epics.forEach((epic, eIdx) => {
      spec += `### Phase ${eIdx + 1}: ${epic.title}\n`;
      spec += `> **Objective:** ${epic.objective}\n`;
      spec += `> **Business Value:** ${epic.businessValue}\n\n`;

      epic.features.forEach((feat, fIdx) => {
        spec += `#### Step ${eIdx + 1}.${fIdx + 1}: Implement Feature "${feat.title}"\n`;
        spec += `- **Goal:** ${feat.description}\n`;
        spec += `- **Domain:** \`${feat.domain || 'core'}\` | **Effort Level:** \`${feat.effort}\`\n\n`;

        feat.userStories.forEach(us => {
          spec += `##### Task Unit [US-${us.id}]: ${us.title}\n`;
          spec += `- **User Value Statement:** As a ${us.asA}, I want to ${us.iWantTo}, so that ${us.soThat}.\n`;
          if (us.evidenceQuote) {
            spec += `- **Discovery Evidence:** "${us.evidenceQuote.text}" (Speaker: ${us.evidenceQuote.speaker})\n`;
          }
          spec += `- **Story Points:** ${us.storyPoints || 3}\n`;

          spec += `\n###### Sub-tasks Breakdown for AI Coder:\n`;
          us.tasks.forEach(task => {
            spec += `${taskCounter}. **[${task.type.toUpperCase()}]** \`${task.title}\` (Est: ${task.estimatedHours || 4}h)\n`;
            taskCounter++;
          });

          if (us.acceptanceCriteria.length > 0) {
            spec += `\n###### Mandatory BDD Test Assertions:\n`;
            us.acceptanceCriteria.forEach(ac => {
              spec += `\`\`\`gherkin\nScenario: ${ac.scenario}\nGiven ${ac.given}\nWhen ${ac.when}\nThen ${ac.then}\n\`\`\`\n`;
            });
          }

          if (us.dorChecklist && us.dorChecklist.length > 0) {
            spec += `\n###### Definition of Ready (DoR):\n`;
            us.dorChecklist.forEach(d => spec += `- [${d.checked ? 'x' : ' '}] ${d.label}\n`);
          }

          if (us.dodChecklist && us.dodChecklist.length > 0) {
            spec += `\n###### Definition of Done (DoD):\n`;
            us.dodChecklist.forEach(d => spec += `- [${d.checked ? 'x' : ' '}] ${d.label}\n`);
          }
          spec += `\n---\n\n`;
        });
      });
    });


    // 5. Verificação: genérica, vale para qualquer projeto
    spec += `## 5. Verification & Completion Checklist\n\n`;
    spec += `- [ ] The project compiles and passes lint with no errors.\n`;
    spec += `- [ ] Every Gherkin scenario is covered by an automated test.\n`;
    spec += `- [ ] The production build passes.\n`;
    spec += `- [ ] No secrets or credentials are committed.\n`;

    return spec;
  },

  downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
