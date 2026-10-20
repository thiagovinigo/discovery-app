import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProjectHubView } from './ProjectHubView';
import { storageService } from '../services/storageService';
import type { DiscoveryProject } from '../types/discovery';

let project: DiscoveryProject;

beforeEach(() => {
  localStorage.clear();
  project = storageService.createNewProject('Meu app', 'Ajudar clínicas a confirmar consultas');
});

afterEach(() => {
  cleanup();
});

function renderHub(current: DiscoveryProject = project) {
  const onUpdate = vi.fn();
  render(<ProjectHubView project={current} onUpdateProject={onUpdate} onNavigateToView={vi.fn()} />);
  return onUpdate;
}

describe('ProjectHubView: projeto novo (E9.0b)', () => {
  it('não mostra número, meta nem público que o usuário não escreveu', () => {
    renderHub();

    for (const fictional of [/160h/, /R\$ 24\.000/, /12\.4x/, /92%/, /Calculadora de ROI/i, /liquidação/i, /lojistas/i, /CFOs/]) {
      expect(screen.queryByText(fictional)).toBeNull();
    }
  });

  it('mostra o nome e a descrição que o usuário informou', () => {
    renderHub();

    expect(screen.getByText('Meu app')).toBeTruthy();
    expect(screen.getByText('Ajudar clínicas a confirmar consultas')).toBeTruthy();
  });

  it('indica o que ainda falta informar, em vez de texto de preenchimento', () => {
    renderHub();

    expect(screen.getAllByText(/Ainda não informado/).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Proposta única de valor.')).toBeNull();
    expect(screen.queryByText('Personas e segmentos identificados.')).toBeNull();
  });

  it('os campos de edição começam vazios', () => {
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: /Editar Detalhes do Produto/ }));

    expect((screen.getByLabelText('Proposta Única de Valor') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('North Star Metric') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Público Alvo') as HTMLInputElement).value).toBe('');
  });
});

describe('ProjectHubView: edição', () => {
  it('salva a proposta de valor, a North Star e o público informados', () => {
    const onUpdate = renderHub();
    fireEvent.click(screen.getByRole('button', { name: /Editar Detalhes do Produto/ }));

    fireEvent.change(screen.getByLabelText('Proposta Única de Valor'), { target: { value: 'Menos faltas nas consultas' } });
    fireEvent.change(screen.getByLabelText('North Star Metric'), { target: { value: 'Taxa de comparecimento' } });
    fireEvent.change(screen.getByLabelText('Público Alvo'), { target: { value: 'Recepcionistas de clínicas' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    const saved = onUpdate.mock.calls[0][0] as DiscoveryProject;
    expect(saved.prd.valueProposition).toBe('Menos faltas nas consultas');
    expect(saved.prd.northStarMetric).toBe('Taxa de comparecimento');
    expect(saved.prd.targetAudience).toBe('Recepcionistas de clínicas');
  });

  it('a North Star salva volta a aparecer quando o projeto é reaberto', () => {
    renderHub({ ...project, prd: { ...project.prd, northStarMetric: 'Taxa de comparecimento' } });

    expect(screen.getByText('Taxa de comparecimento')).toBeTruthy();
  });
});
