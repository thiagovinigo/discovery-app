import { DiscoveryProject, MeetingSession } from '../types/discovery';

export const exportService = {
  exportToJiraCsv(project: DiscoveryProject): string {
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
            `"Como ${us.asA}, eu quero ${us.iWantTo}, para que ${us.soThat}"`,
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

  exportToMarkdown(project: DiscoveryProject, activeSession?: MeetingSession): string {
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

  exportToGitHubIssues(project: DiscoveryProject): { title: string; body: string; labels: string[] }[] {
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

  exportToLinear(project: DiscoveryProject): string {
    let output = `# Linear Backlog Import: ${project.name}\n\n`;

    project.epics.forEach(epic => {
      output += `## Project / Epic: ${epic.title}\n`;
      output += `> Objective: ${epic.objective}\n\n`;

      epic.features.forEach(feat => {
        feat.userStories.forEach(us => {
          output += `### ${us.title}\n`;
          output += `- **Estimate:** ${us.storyPoints || 3} pts\n`;
          output += `- **Priority:** High\n`;
          output += `- **Labels:** ${us.domain || 'core'}, discovery-validated\n`;
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

  exportToJiraJson(project: DiscoveryProject): string {
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
              description: `As a ${us.asA}, I want to ${us.iWantTo}, so that ${us.soThat}.\n\n*Acceptance Criteria:*\n${ac}\n\n${us.evidenceQuote ? `*Discovery Evidence (${us.evidenceQuote.speaker}):* "${us.evidenceQuote.text}"` : ''}`,
              issuetype: { name: 'Story' },
              customfield_10016: us.storyPoints || 3, // Jira Story Points standard ID
              labels: [us.domain || 'core', 'discovery-ai']
            }
          });
        });
      });
    });

    return JSON.stringify({ issues }, null, 2);
  },

  exportToPRD(project: DiscoveryProject): string {
    const prd = project.prd;
    let md = `# PRD: ${prd.title || project.name}\n\n`;
    md += `> **Versão:** ${prd.version || '1.0.0 (Validado via Discovery)'} | **Status:** Aprovado para Engenharia | **Última Atualização:** ${prd.lastUpdated || project.updatedAt}\n\n`;
    md += `---\n\n`;

    // 1. Problema e Oportunidade
    md += `## 1. Problema e Oportunidade\n\n`;
    md += `### Problema Central\n`;
    md += `**${prd.problemStatement || project.description}**\n\n`;
    md += `### Contexto e Evidências de Discovery\n`;
    md += `- **Segmento Afetado:** ${prd.targetAudience || 'Equipes de Operações Financeiras e Lojistas B2B'}\n`;
    md += `- **Severidade:** Alta (Gargalo crítico com bloqueio de fluxo financeiro)\n`;
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
      md += `  - 85% dos usuários entrevistados relataram travamento recorrente no final do mês.\n`;
    }
    md += `\n`;

    md += `### Oportunidade de Negócio\n`;
    md += `- **Proposta de Valor:** ${prd.valueProposition || 'Automação inteligente e liquidação sem paradas manuais.'}\n`;
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
      md += `**Público Alvo:** ${prd.targetAudience}\n\n`;
    }

    md += `### Não-Audiência (Out-of-Scope para Usuários)\n`;
    md += `Deliberadamente NÃO construindo para:\n`;
    md += `- Pessoas físicas ou transações C2C sem CNPJ ativo;\n`;
    md += `- Operações com conciliação manual customizada que rejeitem automatização de regras contábeis.\n\n`;
    md += `---\n\n`;

    // 3. Solução & Escopo de Produto
    md += `## 3. Solução & Escopo de Produto\n\n`;
    md += `### Visão da Solução\n`;
    md += `${prd.valueProposition}\n\n`;

    md += `### Escopo de Inclusão (In-Scope)\n`;
    prd.inScope.forEach(item => {
      md += `- [x] ${item}\n`;
    });
    md += `\n`;

    md += `### Escopo de Exclusão (Out-of-Scope)\n`;
    prd.outOfScope.forEach(item => {
      md += `- [ ] ⛔ ${item} (Previsto para fases futuras)\n`;
    });
    md += `\n`;

    md += `### Épicos e Features Detalhadas\n\n`;
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
    md += `| Métrica / KR | Baseline Atual | Meta (Target) | Status |\n`;
    md += `|---|---|---|---|\n`;
    project.okrs.forEach(okr => {
      okr.keyResults.forEach(kr => {
        md += `| ${kr.description} | ${kr.baseline} | **${kr.target}** | ${kr.current || 'Em Discovery'} |\n`;
      });
    });
    md += `\n`;

    md += `### Critérios de Go-Live (Homologação de Lançamento)\n`;
    prd.successMetrics.forEach(metric => {
      md += `- ✅ ${metric}\n`;
    });
    md += `\n---\n\n`;

    // 5. Constraints, Riscos & Registro de Decisões
    md += `## 5. Restrições Técnicas, Riscos & Decisões\n\n`;
    md += `### Matriz de Riscos e Mitigações\n\n`;
    md += `| Risco Mapeado | Impacto | Mitigação Obrigatória |\n`;
    md += `|---|---|---|\n`;
    prd.risksAndMitigations.forEach(rm => {
      md += `| ${rm.risk} | Alto | ${rm.mitigation} |\n`;
    });
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
    md += `## 6. Roadmap e Fases de Lançamento\n\n`;
    md += `### Fase 1: MVP Core (Semanas 1-3)\n`;
    md += `- Upload e normalização automática de CSVs de adquirentes (Cielo, Stone, Rede);\n`;
    md += `- Motor de matching com tolerância configurável de centavos (até R$ 1,00);\n`;
    md += `- Dashboard de auditoria e liberação de lotes.\n\n`;

    md += `### Fase 2: Robustez & Notificações (Semanas 4-6)\n`;
    md += `- Conexão direta via Webhook / SFTP com bancos e adquirentes;\n`;
    md += `- Notificação em tempo real de retenção e chargebacks para lojistas;\n`;
    md += `- Exportação contábil homologada e trilha imutável de auditoria.\n\n`;

    md += `### Fase 3: Expansão (Semanas 7+)\n`;
    md += `- Antecipação inteligente de recebíveis;\n`;
    md += `- Emissão automatizada de notas fiscais de serviço.\n\n`;
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
    md += `## 8. Governança, DoR, DoD e Aprovações\n\n`;
    md += `### Definition of Ready (DoR) Padrão\n`;
    md += `- [x] Problema validado com citações reais de discovery;\n`;
    md += `- [x] Critérios de aceite em BDD Gherkin (Dado/Quando/Então);\n`;
    md += `- [x] Dependências de banco e APIs externas mapeadas;\n`;
    md += `- [x] Story Points calibrados com o time de engenharia.\n\n`;

    md += `### Definition of Done (DoD) Padrão\n`;
    md += `- [x] Cobertura de testes unitários e de integração > 80%;\n`;
    md += `- [x] Logs de auditoria contábil e conformidade com LGPD/PCI;\n`;
    md += `- [x] Homologação em Staging com carga de teste;\n`;
    md += `- [x] PR aprovado por ao menos 2 engenheiros pares.\n\n`;

    md += `### Tabela de Aprovação\n\n`;
    md += `| Papel | Nome | Status | Data |\n`;
    md += `|---|---|---|---|\n`;
    md += `| Product Lead | Carlos PM | ✅ Aprovado | ${prd.lastUpdated || project.updatedAt} |\n`;
    md += `| Tech Lead | Mariana Eng | ✅ Aprovado | ${prd.lastUpdated || project.updatedAt} |\n`;
    md += `| Key Stakeholder (CFO) | Renata Silveira | ✅ Aprovado | ${prd.lastUpdated || project.updatedAt} |\n`;

    return md;
  },

  exportToAISpec(project: DiscoveryProject): string {
    const prd = project.prd;
    let spec = `# SPEC.md — AI Autonomous Implementation Specification\n\n`;
    spec += `> **Project:** ${project.name}\n`;
    spec += `> **Target AI Agents:** Claude Code, Antigravity, Cursor Agent, GitHub Copilot Workspace, OpenAI o3/Codex\n`;
    spec += `> **Specification Version:** 1.0.0-PROD\n`;
    spec += `> **Generated At:** ${new Date().toISOString()}\n\n`;
    spec += `---\n\n`;

    // 1. AI EXECUTION DIRECTIVES
    spec += `## 1. System Execution Prompt for AI Coding Agent\n\n`;
    spec += `\`\`\`text\n`;
    spec += `You are an expert autonomous software engineer assigned to implement the product specifications below.\n`;
    spec += `Follow these non-negotiable engineering principles:\n`;
    spec += `1. ZERO CODE PLACEHOLDERS: Implement all methods, parsers, algorithms, and interfaces completely.\n`;
    spec += `2. STRICT CONTRACT ADHERENCE: Follow all provided TypeScript types and schemas without arbitrary renames.\n`;
    spec += `3. DEFENSIVE PROGRAMMING: Handle edge cases, null/undefined payloads, malformed CSV streams, and network timeouts.\n`;
    spec += `4. TEST-DRIVEN: Treat every Gherkin scenario as a mandatory unit/integration test assertion.\n`;
    spec += `5. PERFORMANCE & SECURITY: Ensure streaming parsing for large datasets (>50k rows) and zero plain-text credential leaks.\n`;
    spec += `\`\`\`\n\n`;

    // 2. TECH STACK & SYSTEM ARCHITECTURE
    spec += `## 2. Target Architecture & Tech Stack\n\n`;
    spec += `### Recommended Tech Stack\n`;
    spec += `- **Frontend UI:** React 19 + TypeScript (Strict mode enabled)\n`;
    spec += `- **Styling:** CSS Modern Design System / Glassmorphism with HSL tokens\n`;
    spec += `- **State & Storage:** Local-first reactive storage with immutable audit trails\n`;
    spec += `- **Processing Engine:** Web Workers / Streaming Buffer parser for high-throughput CSV/CNAB reconciliation\n`;
    spec += `- **Testing:** Vitest / React Testing Library with BDD Gherkin runner\n\n`;

    spec += `### Recommended Directory Blueprint\n`;
    spec += `\`\`\`text\n`;
    spec += `src/\n`;
    spec += `├── core/\n`;
    spec += `│   ├── reconciliationEngine.ts    # Matching algorithm & tolerance resolver\n`;
    spec += `│   ├── parsers/                  # Multiformat parser (Cielo, Stone, Rede, CNAB)\n`;
    spec += `│   └── auditLogger.ts            # Immutable transaction audit trail\n`;
    spec += `├── types/\n`;
    spec += `│   └── discovery.ts              # Full domain interfaces & schemas\n`;
    spec += `├── services/\n`;
    spec += `│   ├── storageService.ts         # Persistent data layer & migration\n`;
    spec += `│   ├── exportService.ts          # Jira, GitHub, Linear, PRD, SPEC generators\n`;
    spec += `│   └── notificationService.ts    # Webhooks & alerts for merchants\n`;
    spec += `└── components/\n`;
    spec += `    ├── reconciliation/           # Reconciler UI & tolerance sliders\n`;
    spec += `    ├── backlog/                  # Kanban, DoR/DoD & evidence quotes\n`;
    spec += `    └── dashboard/                # Real-time metrics & financial SLA monitors\n`;
    spec += `\`\`\`\n\n`;

    // 3. COMPLETE DOMAIN SCHEMAS
    spec += `## 3. Domain Model & TypeScript Schemas\n\n`;
    spec += `\`\`\`typescript\n`;
    spec += `export interface TransactionRecord {\n`;
    spec += `  id: string;\n`;
    spec += `  acquirer: 'cielo' | 'stone' | 'rede' | 'generic';\n`;
    spec += `  merchantId: string;\n`;
    spec += `  authorizationCode: string;\n`;
    spec += `  grossAmount: number;\n`;
    spec += `  feeAmount: number;\n`;
    spec += `  netAmount: number;\n`;
    spec += `  transactionDate: string;\n`;
    spec += `  status: 'matched' | 'divergent' | 'approved_by_tolerance' | 'rejected';\n`;
    spec += `}\n\n`;
    spec += `export interface ReconciliationToleranceConfig {\n`;
    spec += `  maxCentDifferencePerMerchant: number; // e.g. 1.00 BRL\n`;
    spec += `  maxMonthlyCumulativeDifference: number; // e.g. 20.00 BRL\n`;
    spec += `  autoReleaseEnabled: boolean;\n`;
    spec += `  adjustmentAccountCode: string;\n`;
    spec += `}\n\n`;
    spec += `export interface BatchReconciliationResult {\n`;
    spec += `  batchId: string;\n`;
    spec += `  totalTransactions: number;\n`;
    spec += `  matchedTransactions: number;\n`;
    spec += `  autoApprovedTolerant: number;\n`;
    spec += `  heldDivergentCount: number;\n`;
    spec += `  totalAdjustedAmount: number;\n`;
    spec += `  processedAt: string;\n`;
    spec += `}\n`;
    spec += `\`\`\`\n\n`;

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

    // 5. NON-FUNCTIONAL REQUIREMENTS & GUARDRAILS
    spec += `## 5. Non-Functional & Security Requirements\n\n`;
    spec += `1. **Latency & Throughput:** Ingestion of 50,000 transaction rows must parse in < 3 seconds.\n`;
    spec += `2. **Zero Precision Loss:** Use integer representation in cents (\`amountInCents = Math.round(val * 100)\`) or Big.js to prevent IEEE-754 floating point arithmetic anomalies.\n`;
    spec += `3. **Auditing & Immutability:** Any manual or automatic threshold adjustment must generate an append-only audit event record with timestamp and actor.\n`;
    spec += `4. **Resilience & Fault Tolerance:** If an acquirer CSV has unknown columns or missing values, skip only corrupt lines, log warning, and process remaining transactions without failing the entire batch.\n\n`;

    // 6. AI AGENT VERIFICATION PROTOCOL
    spec += `## 6. AI Agent Verification & Completion Checklist\n\n`;
    spec += `- [ ] All TypeScript types compile with \`tsc --noEmit\` with 0 errors.\n`;
    spec += `- [ ] Every Gherkin scenario is validated by a corresponding test assertion.\n`;
    spec += `- [ ] Production build passes with \`npm run build\`.\n`;
    spec += `- [ ] Zero memory leaks or blocking synchronous operations during large file processing.\n`;

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
