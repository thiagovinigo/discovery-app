import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutomationDiscoveryView } from './AutomationDiscoveryView';
import { initAutomationDiscovery } from '../services/automationDiscoveryService';
import type { DiscoveryProject } from '../types/discovery';

const makeProject = (): DiscoveryProject => ({
  id: 'proj-e13',
  name: 'Varejo Teste',
  description: 'Projeto de Discovery',
  createdAt: '2026-11-07T00:00:00Z',
  updatedAt: '2026-11-07T00:00:00Z',
  sessions: [],
  okrs: [],
  epics: [],
  prd: {
    id: 'prd-1',
    title: 'PRD',
    version: '0.1.0',
    lastUpdated: '07/11/2026',
    problemStatement: '',
    targetAudience: '',
    valueProposition: '',
    inScope: [],
    outOfScope: [],
    successMetrics: [],
    assumptions: [],
    risksAndMitigations: []
  },
  leanCanvas: {
    problem: [],
    existingAlternatives: [],
    customerSegments: [],
    earlyAdopters: [],
    uniqueValueProposition: '',
    highLevelConcept: '',
    solution: [],
    channels: [],
    revenueStreams: [],
    costStructure: [],
    keyMetrics: [],
    unfairAdvantage: ''
  },
  decisionLog: [],
  automationDiscovery: initAutomationDiscovery('Varejo Teste')
});

describe('AutomationDiscoveryView (Épico E13)', () => {
  it('renderiza as 9 abas operacionais da metodologia e permite navegar entre elas', () => {
    const onSave = vi.fn();
    render(<AutomationDiscoveryView project={makeProject()} onSaveAutomationDiscovery={onSave} />);

    expect(screen.getByText(/Discovery de IA & Automação — Varejo Teste/i)).toBeTruthy();
    expect(screen.getByText(/OK \(soma 100%\)/i)).toBeTruthy();

    // Vai para a aba Checklist (17)
    fireEvent.click(screen.getByRole('button', { name: /2\. Checklist/i }));
    expect(
      screen.getByText(/Confirmar data, duração \(2h\) e participantes/i)
    ).toBeTruthy();

    // Vai para a aba Ficha da Área e cadastra uma área
    fireEvent.click(screen.getByRole('button', { name: /3\. Ficha da Área/i }));
    const areaInput = screen.getByPlaceholderText(/Nome da área/i);
    fireEvent.change(areaInput, { target: { value: 'Comercial / Compras' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Área/i }));
    expect(onSave).toHaveBeenCalledTimes(1);

    // Vai para a aba Priorização & Readout
    fireEvent.click(screen.getByRole('button', { name: /9\. Priorização & Readout/i }));
    expect(
      screen.getByText(/Checklist de Qualidade Antes do Readout Executivo/i)
    ).toBeTruthy();
  });
});
