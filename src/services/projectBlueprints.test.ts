import { beforeEach, describe, expect, it } from 'vitest';
import {
  PROJECT_BLUEPRINTS,
  applyBlueprintToNewProject,
  getProjectBlueprint
} from './projectBlueprints';
import { storageService } from './storageService';

beforeEach(() => {
  localStorage.clear();
});

describe('projectBlueprints (E13.7)', () => {
  it('lista todos os 6 blueprints estruturados, incluindo ai_automation_discovery e blank', () => {
    const ids = PROJECT_BLUEPRINTS.map(b => b.id);
    expect(ids).toContain('ai_automation_discovery');
    expect(ids).toContain('saas_mvp_zero_to_one');
    expect(ids).toContain('operations_erp');
    expect(ids).toContain('fintech_b2b');
    expect(ids).toContain('healthtech_clinical');
    expect(ids).toContain('blank');
  });

  it('mantém createNewProject sem blueprint (ou com blank) 100% limpo conforme regra E9.0', () => {
    const clean = storageService.createNewProject('Projeto Limpo', 'Objetivo limpo');
    expect(clean.sessions).toHaveLength(0);
    expect(clean.epics).toHaveLength(0);
    expect(clean.stakeholders).toHaveLength(0);
    expect(clean.scheduledMeetings).toHaveLength(0);
    expect(clean.prd.valueProposition).toBe('');
  });

  it('pré-estrutura áreas, sistemas, stakeholders e 1ª sessão de 2h com 8 blocos no blueprint ai_automation_discovery sem inventar números falsos', () => {
    const created = storageService.createNewProject(
      'Diagnóstico Supermercado',
      'Mapear processos e oportunidades de IA',
      'ai_automation_discovery'
    );

    expect(created.automationDiscovery).toBeDefined();
    expect(created.automationDiscovery!.areas).toHaveLength(5);
    expect(created.automationDiscovery!.areas[0].status).toBe('A agendar');
    expect(created.automationDiscovery!.systems).toHaveLength(4);
    expect(created.automationDiscovery!.processes).toHaveLength(0);
    expect(created.automationDiscovery!.opportunities).toHaveLength(0);

    expect(created.stakeholders).toHaveLength(3);
    expect(created.sessions).toHaveLength(1);
    expect(created.sessions[0].agenda).toHaveLength(8);
    expect(created.sessions[0].rawTranscript).toHaveLength(0);
    expect(created.scheduledMeetings).toHaveLength(1);
  });

  it('aplica blueprint saas_mvp_zero_to_one com sessão Mom Test e papéis de stakeholders', () => {
    const base = storageService.createNewProject('Meu SaaS', 'Resolver dor X');
    const structured = applyBlueprintToNewProject(base, 'saas_mvp_zero_to_one');
    const spec = getProjectBlueprint('saas_mvp_zero_to_one');

    expect(structured.stakeholders).toHaveLength(spec.stakeholderRoles.length);
    expect(structured.sessions).toHaveLength(1);
    expect(structured.sessions[0].title).toContain('Mom Test');
  });
});
