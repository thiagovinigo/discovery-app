import { beforeEach, describe, expect, it } from 'vitest';
import { exportService } from './exportService';
import { storageService } from './storageService';
import { INITIAL_MOCK_PROJECT } from './mockDataService';
import type { DiscoveryProject, UserStory } from '../types/discovery';

const project: DiscoveryProject = INITIAL_MOCK_PROJECT;

const allStories = project.epics.flatMap(e => e.features.flatMap(f => f.userStories));
const allTasks = allStories.flatMap(us => us.tasks);

/** Cópia do projeto de exemplo com um título que contém aspas, para testar o escape do CSV. */
function withQuotedEpicTitle(): DiscoveryProject {
  const [firstEpic, ...otherEpics] = project.epics;
  return { ...project, epics: [{ ...firstEpic, title: 'Épico "com aspas"' }, ...otherEpics] };
}

/** Cópia do projeto de exemplo em que a primeira história recebe os metadados informados. */
function withFirstStory(meta: Partial<UserStory>): DiscoveryProject {
  const [firstEpic, ...otherEpics] = project.epics;
  const [firstFeature, ...otherFeatures] = firstEpic.features;
  const [firstStory, ...otherStories] = firstFeature.userStories;
  return {
    ...project,
    epics: [{ ...firstEpic, features: [{ ...firstFeature, userStories: [{ ...firstStory, ...meta }, ...otherStories] }, ...otherFeatures] }, ...otherEpics]
  };
}

const firstStory = allStories[0];
const validatedMeta: Partial<UserStory> = {
  validation: {
    status: 'validated',
    evidences: [{ stance: 'confirms', quote: 'Preciso disso toda semana', sessionTitle: 'Kickoff', timestamp: '04:12', at: '2026-01-01T10:00:00.000Z' }]
  }
};
const invalidatedMeta: Partial<UserStory> = { validation: { status: 'invalidated', evidences: [] } };

describe('exports: validação, origem e itens invalidados (E8.8)', () => {
  it('item validado leva o estado e a citação de origem em todos os formatos de backlog', () => {
    const p = withFirstStory(validatedMeta);

    for (const output of [
      exportService.exportToJiraCsv(p),
      exportService.exportToJiraJson(p),
      exportService.exportToLinear(p),
      exportService.exportToGitHubIssues(p).map(i => i.body).join('\n')
    ]) {
      expect(output).toContain('Validação: validado');
      expect(output).toContain('Preciso disso toda semana');
      expect(output).toContain('Kickoff, 04:12');
    }
  });

  it('item fatiado e item criado pela IA dizem de onde vieram', () => {
    const p = withFirstStory({ sliceOf: 's0', origin: { author: 'ai', createdAt: '2026-01-01T10:00:00.000Z' }, changes: [{ at: '2026-01-01T10:00:00.000Z', summary: 'Fatiada de "Original"' }] });

    const linear = exportService.exportToLinear(p);

    expect(linear).toContain('Fatiado: Fatiada de "Original"');
    expect(linear).toContain('Origem: IA');
  });

  it('projeto sem metadados exporta como antes: nenhuma linha de rastreio', () => {
    expect(exportService.exportToLinear(project)).not.toContain('Validação:');
    expect(exportService.exportToJiraCsv(project)).not.toContain('Validação:');
    expect(exportService.exportToGitHubIssues(project).some(i => i.body.includes('Rastreabilidade'))).toBe(false);
  });

  it('história invalidada fica de fora de todos os exports, mas as outras permanecem', () => {
    const p = withFirstStory(invalidatedMeta);
    const title = firstStory.title;

    expect(exportService.exportToJiraCsv(p)).not.toContain(title);
    expect(exportService.exportToJiraJson(p)).not.toContain(title);
    expect(exportService.exportToLinear(p)).not.toContain(title);
    expect(exportService.exportToGitHubIssues(p).some(i => i.title.includes(title))).toBe(false);
    expect(exportService.exportToMarkdown(p)).not.toContain(title);
    expect(exportService.exportToPRD(p)).not.toContain(title);
    expect(exportService.exportToAISpec(p)).not.toContain(title);
    expect(exportService.exportToGitHubIssues(p)).toHaveLength(allStories.length - 1);
  });

  it('com a opção de incluir invalidados, a história volta', () => {
    const p = withFirstStory(invalidatedMeta);

    expect(exportService.exportToJiraCsv(p, { includeInvalidated: true })).toContain(firstStory.title);
    expect(exportService.exportToGitHubIssues(p, { includeInvalidated: true })).toHaveLength(allStories.length);
  });

  it('o rótulo do Linear reflete o estado real, e não marca tudo como validado', () => {
    expect(exportService.exportToLinear(project)).toContain('discovery-hypothesis');
    expect(exportService.exportToLinear(project)).not.toContain('discovery-validated');
    expect(exportService.exportToLinear(withFirstStory(validatedMeta))).toContain('discovery-validated');
  });

  it('o Jira JSON leva o estado de validação nas etiquetas', () => {
    const issues = JSON.parse(exportService.exportToJiraJson(withFirstStory(validatedMeta))).issues as { fields: { labels?: string[]; summary: string } }[];

    expect(issues.find(i => i.fields.summary === firstStory.title)?.fields.labels).toContain('discovery-validated');
  });
});

describe('exportService.exportToJiraCsv', () => {
  const lines = exportService.exportToJiraCsv(project).split('\n');

  it('começa pelo cabeçalho de 7 colunas', () => {
    expect(lines[0]).toBe('Issue Type,Summary,Description,Epic Link,Story Points,Priority,Acceptance Criteria');
  });

  it('gera uma linha por épico, feature, história e sub-task', () => {
    const features = project.epics.flatMap(e => e.features);
    const expectedRows = project.epics.length + features.length + allStories.length + allTasks.length;
    // histórias têm Gherkin multilinha (\n dentro de aspas), então conta pelo tipo de issue
    const csv = exportService.exportToJiraCsv(project);
    const countType = (type: string) => (csv.match(new RegExp(`^${type},`, 'gm')) || []).length;

    expect(countType('Epic') + countType('Feature') + countType('Story') + countType('Sub-task')).toBe(expectedRows);
  });

  it('escapa aspas duplicando-as', () => {
    expect(exportService.exportToJiraCsv(withQuotedEpicTitle())).toContain('"Épico ""com aspas"""');
  });

  it('usa 3 story points quando a história não tem estimativa', () => {
    const [epic] = project.epics;
    const [feature] = epic.features;
    const [story] = feature.userStories;
    const semPontos: DiscoveryProject = {
      ...project,
      epics: [{ ...epic, features: [{ ...feature, userStories: [{ ...story, storyPoints: undefined }] }] }],
    };

    expect(exportService.exportToJiraCsv(semPontos)).toMatch(/^Story,.*,3,Medium,/m);
  });

  it('devolve só o cabeçalho para projeto sem épicos', () => {
    expect(exportService.exportToJiraCsv({ ...project, epics: [] })).toBe(lines[0]);
  });
});

describe('exportService.exportToMarkdown', () => {
  it('inclui nome, OKRs e PRD do projeto', () => {
    const md = exportService.exportToMarkdown(project);

    expect(md).toContain(`# Discovery ao Done: ${project.name}`);
    expect(md).toContain('## 🎯 OKRs de Negócio');
    expect(md).toContain(`## 📄 PRD: ${project.prd.title}`);
  });

  it('só inclui a seção da sessão quando uma sessão é passada', () => {
    const session = project.sessions[0];

    expect(exportService.exportToMarkdown(project)).not.toContain('Resumo da Sessão Recente');
    expect(exportService.exportToMarkdown(project, session)).toContain(`Resumo da Sessão Recente: ${session.title}`);
  });

  it('lista cada história de usuário', () => {
    const md = exportService.exportToMarkdown(project);
    for (const story of allStories) {
      expect(md).toContain(story.title);
    }
  });
});

describe('exportService.exportToJson', () => {
  it('é reversível: JSON.parse devolve o projeto original', () => {
    expect(JSON.parse(exportService.exportToJson(project))).toEqual(project);
  });
});

describe('exportService.exportToGitHubIssues', () => {
  const issues = exportService.exportToGitHubIssues(project);

  it('gera uma issue por história', () => {
    expect(issues).toHaveLength(allStories.length);
  });

  it('prefixa o título e inclui os labels base', () => {
    for (const issue of issues) {
      expect(issue.title.startsWith('[Story] ')).toBe(true);
      expect(issue.labels).toContain('user-story');
      expect(issue.labels.some(l => l.startsWith('points:'))).toBe(true);
    }
  });

  it('adiciona o label bug apenas para histórias marcadas como bug', () => {
    const [epic] = project.epics;
    const [feature] = epic.features;
    const [story] = feature.userStories;
    const comBug: DiscoveryProject = {
      ...project,
      epics: [{ ...epic, features: [{ ...feature, userStories: [{ ...story, isBug: true }] }] }],
    };
    const semBug: DiscoveryProject = {
      ...project,
      epics: [{ ...epic, features: [{ ...feature, userStories: [{ ...story, isBug: false }] }] }],
    };

    expect(exportService.exportToGitHubIssues(comBug)[0].labels).toContain('bug');
    expect(exportService.exportToGitHubIssues(semBug)[0].labels).not.toContain('bug');
  });
});

describe('exportService.exportToJiraJson', () => {
  const parsed = JSON.parse(exportService.exportToJiraJson(project)) as { issues: { fields: { issuetype: { name: string } } }[] };

  it('é JSON válido com uma issue por épico e por história', () => {
    expect(parsed.issues).toHaveLength(project.epics.length + allStories.length);
  });

  it('marca épicos como Epic e histórias como Story', () => {
    const types = parsed.issues.map(i => i.fields.issuetype.name);
    expect(types.filter(t => t === 'Epic')).toHaveLength(project.epics.length);
    expect(types.filter(t => t === 'Story')).toHaveLength(allStories.length);
  });
});

describe('exportService.exportToLinear', () => {
  it('abre com o nome do projeto e lista cada história', () => {
    const output = exportService.exportToLinear(project);

    expect(output).toContain(`# Linear Backlog Import: ${project.name}`);
    for (const story of allStories) {
      expect(output).toContain(`### ${story.title}`);
    }
  });
});

/** Texto que só existia no PRD/SPEC por ser fixo no código, e que nenhum projeto novo escreveu. */
const FIXED_FICTION = [
  'Carlos PM', 'Mariana Eng', 'Renata Silveira', 'Aprovado para Engenharia', '✅ Aprovado', 'Cielo', 'Stone', 'Rede)',
  'conciliação', 'Lojistas', 'CNPJ', '85%', 'Validado via Discovery', 'R$ 1,00', 'CNAB', 'chargebacks', 'reconciliationEngine',
  'TransactionRecord', '50,000', 'adquirentes', 'Severidade: Alta'
];

describe('PRD e SPEC de um projeto novo não carregam conteúdo fixo (E6.5)', () => {
  let blank: DiscoveryProject;

  beforeEach(() => {
    localStorage.clear();
    const id = storageService.createNewProject('Meu produto', 'Uma ideia nova').id;
    blank = storageService.getAllProjects().find(p => p.id === id)!;
  });

  it('o PRD não tem nomes, aprovações, roadmap nem domínio que o usuário não escreveu', () => {
    const prd = exportService.exportToPRD(blank);

    for (const fixed of FIXED_FICTION) expect(prd.toLowerCase()).not.toContain(fixed.toLowerCase());
  });

  it('o SPEC não tem esquemas, diretórios nem requisitos de um domínio que o usuário não escreveu', () => {
    const spec = exportService.exportToAISpec(blank);

    for (const fixed of FIXED_FICTION) expect(spec.toLowerCase()).not.toContain(fixed.toLowerCase());
  });

  it('o PRD de um projeto novo é rascunho e diz o que falta, em vez de inventar', () => {
    const prd = exportService.exportToPRD(blank);

    expect(prd).toContain('**Status:** Rascunho');
    expect(prd).toContain('Não informado');
    expect(prd).toContain('Uma ideia nova');
  });

  it('usa o que o usuário escreveu, e só isso, nas seções de problema, público, valor e escopo', () => {
    const filled: DiscoveryProject = {
      ...blank,
      prd: {
        ...blank.prd, problemStatement: 'Pacientes faltam às consultas', targetAudience: 'Recepcionistas', valueProposition: 'Confirmar em minutos',
        inScope: ['Lembrete por mensagem'], outOfScope: ['Remarcação'], successMetrics: ['Comparecimento acima de 85%'],
        risksAndMitigations: [{ risk: 'Mensagens ignoradas', mitigation: 'Ligar para quem não responde' }]
      }
    };

    const prd = exportService.exportToPRD(filled);

    for (const written of ['Pacientes faltam às consultas', 'Recepcionistas', 'Confirmar em minutos', 'Lembrete por mensagem', 'Remarcação', 'Comparecimento acima de 85%', 'Mensagens ignoradas', 'Ligar para quem não responde']) {
      expect(prd).toContain(written);
    }
    expect(prd).not.toContain('Previsto para fases futuras');
  });

  it('a tabela de aprovação lista os decisores e patrocinadores cadastrados, como pendentes', () => {
    const withPeople: DiscoveryProject = {
      ...blank,
      stakeholders: [
        { id: 'a', name: 'Ana Souza', role: 'decisor', interest: 'alto', influence: 'alto', createdAt: '2026-01-01T10:00:00.000Z' },
        { id: 'b', name: 'Bruno Lima', role: 'patrocinador', interest: 'alto', influence: 'alto', createdAt: '2026-01-01T10:00:00.000Z' },
        { id: 'c', name: 'Carla Dias', role: 'usuario', interest: 'alto', influence: 'baixo', createdAt: '2026-01-01T10:00:00.000Z' }
      ]
    };

    const prd = exportService.exportToPRD(withPeople);

    expect(prd).toContain('Ana Souza');
    expect(prd).toContain('Bruno Lima');
    expect(prd).not.toContain('Carla Dias');
    expect(prd).toContain('Pendente');
    expect(prd).not.toContain('Aprovado');
  });

  it('sem decisores cadastrados, diz que não há aprovações registradas', () => {
    expect(exportService.exportToPRD(blank)).toContain('Nenhuma aprovação registrada');
  });

  it('o roadmap vem dos épicos do projeto, com status e data alvo', () => {
    const withEpics: DiscoveryProject = {
      ...blank,
      epics: [
        { id: 'e1', title: 'Lembretes', objective: 'o', businessValue: 'v', status: 'in_progress', targetDate: '2026-06-30', features: [] },
        { id: 'e2', title: 'Relatórios', objective: 'o', businessValue: 'v', status: 'discovery', features: [] }
      ]
    };

    const prd = exportService.exportToPRD(withEpics);

    expect(prd).toContain('Lembretes');
    expect(prd).toContain('2026-06-30');
    expect(prd).toContain('Relatórios');
  });

  it('Definition of Ready e of Done vêm dos checklists das histórias, não de um texto padrão', () => {
    const story = {
      id: 's1', featureId: 'f1', title: 'Exportar', asA: 'a', iWantTo: 'b', soThat: 'c', acceptanceCriteria: [], tasks: [],
      dorChecklist: [{ id: 'd1', label: 'Mockup aprovado', checked: true }],
      dodChecklist: [{ id: 'd2', label: 'Testes passando', checked: false }]
    };
    const withChecklists: DiscoveryProject = {
      ...blank,
      epics: [{ id: 'e1', title: 'E', objective: '', businessValue: '', status: 'discovery', features: [{ id: 'f1', epicId: 'e1', title: 'F', description: '', valueProposition: '', effort: 'S', userStories: [story] }] }]
    };

    const prd = exportService.exportToPRD(withChecklists);

    expect(prd).toContain('Mockup aprovado');
    expect(prd).toContain('Testes passando');
    expect(exportService.exportToPRD(blank)).toContain('Ainda não definidos');
  });

  it('o SPEC traz problema, escopo, métricas e riscos do projeto', () => {
    const filled: DiscoveryProject = {
      ...blank,
      prd: {
        ...blank.prd, problemStatement: 'Pacientes faltam às consultas', inScope: ['Lembrete por mensagem'], successMetrics: ['Comparecimento'],
        risksAndMitigations: [{ risk: 'Mensagens ignoradas', mitigation: 'Ligar' }]
      }
    };

    const spec = exportService.exportToAISpec(filled);

    for (const written of ['Pacientes faltam às consultas', 'Lembrete por mensagem', 'Comparecimento', 'Mensagens ignoradas']) {
      expect(spec).toContain(written);
    }
  });
});

describe('exportService.exportToPRD e exportToAISpec', () => {
  it('o PRD começa com o título do PRD do projeto', () => {
    expect(exportService.exportToPRD(project).startsWith(`# PRD: ${project.prd.title}`)).toBe(true);
  });

  it('o SPEC identifica o projeto', () => {
    expect(exportService.exportToAISpec(project)).toContain(`> **Project:** ${project.name}`);
  });

  it('numera as sub-tasks do SPEC em sequência contínua', () => {
    const spec = exportService.exportToAISpec(project);
    for (let i = 1; i <= allTasks.length; i++) {
      expect(spec).toContain(`${i}. **[`);
    }
  });
});
