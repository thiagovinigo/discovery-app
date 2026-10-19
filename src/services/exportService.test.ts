import { describe, expect, it } from 'vitest';
import { exportService } from './exportService';
import { INITIAL_MOCK_PROJECT } from './mockDataService';
import type { DiscoveryProject } from '../types/discovery';

const project: DiscoveryProject = INITIAL_MOCK_PROJECT;

const allStories = project.epics.flatMap(e => e.features.flatMap(f => f.userStories));
const allTasks = allStories.flatMap(us => us.tasks);

/** Cópia do projeto de exemplo com um título que contém aspas, para testar o escape do CSV. */
function withQuotedEpicTitle(): DiscoveryProject {
  const [firstEpic, ...otherEpics] = project.epics;
  return { ...project, epics: [{ ...firstEpic, title: 'Épico "com aspas"' }, ...otherEpics] };
}

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
