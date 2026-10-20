import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StakeholdersView } from './StakeholdersView';
import { storageService } from '../services/storageService';
import { addStakeholder } from '../services/stakeholderService';
import type { DiscoveryProject } from '../types/discovery';

let projectId: string;

const loadProject = (): DiscoveryProject => storageService.getAllProjects().find(p => p.id === projectId)!;

function renderView(extra: Partial<React.ComponentProps<typeof StakeholdersView>> = {}) {
  const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() };
  render(<StakeholdersView project={loadProject()} {...handlers} {...extra} />);
  return handlers;
}

beforeEach(() => {
  localStorage.clear();
  projectId = storageService.createNewProject('Projeto', '').id;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StakeholdersView: sem ninguém cadastrado', () => {
  it('mostra o estado vazio e oferece a entrevista com o copiloto', () => {
    const onOpenInterview = vi.fn();
    renderView({ onOpenInterview });

    expect(screen.getByText('Nenhum stakeholder cadastrado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /me entrevistar/i }));
    expect(onOpenInterview).toHaveBeenCalled();
  });

  it('cadastra com os valores informados e nível médio por padrão', () => {
    const { onAdd } = renderView();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  Ana Souza  ' } });
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'decisor' } });
    fireEvent.change(screen.getByLabelText('Organização'), { target: { value: 'Clínica X' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar stakeholder/ }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ana Souza', role: 'decisor', organization: 'Clínica X', interest: 'medio', influence: 'medio'
    }));
  });

  it('recusa nome vazio, mostra o motivo e não cadastra', () => {
    const { onAdd } = renderView();

    fireEvent.click(screen.getByRole('button', { name: /Adicionar stakeholder/ }));

    expect(screen.getByRole('alert').textContent).toContain('nome');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('limpa o formulário depois de cadastrar', () => {
    renderView();
    const name = screen.getByLabelText('Nome') as HTMLInputElement;

    fireEvent.change(name, { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar stakeholder/ }));

    expect(name.value).toBe('');
  });
});

describe('StakeholdersView: com pessoas cadastradas', () => {
  beforeEach(() => {
    addStakeholder(projectId, { name: 'Ana', role: 'decisor', interest: 'alto', influence: 'alto', organization: 'Clínica X' });
    addStakeholder(projectId, { name: 'Bruno', role: 'usuario', interest: 'baixo', influence: 'baixo' });
  });

  it('coloca cada pessoa no quadrante certo da matriz', () => {
    renderView();

    expect(within(screen.getByRole('region', { name: 'Gerenciar de perto' })).getByText('Ana')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Monitorar' })).getByText('Bruno')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Manter informado' })).queryByText('Ana')).toBeNull();
  });

  it('mostra papel e organização da pessoa', () => {
    renderView();

    const region = within(screen.getByRole('region', { name: 'Gerenciar de perto' }));
    expect(region.getByText('Decisor · Clínica X')).toBeTruthy();
  });

  it('editar carrega os dados no formulário e salva só a pessoa escolhida', () => {
    const { onUpdate } = renderView();
    const ana = loadProject().stakeholders![0];

    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana' }));
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Ana');
    fireEvent.change(screen.getByLabelText('Influência'), { target: { value: 'baixo' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(onUpdate).toHaveBeenCalledWith(ana.id, expect.objectContaining({ name: 'Ana', influence: 'baixo' }));
  });

  it('remover pede confirmação e só remove se o usuário aceitar', () => {
    const { onRemove } = renderView();
    const ana = loadProject().stakeholders![0];
    const confirm = vi.spyOn(window, 'confirm');

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana' }));
    expect(onRemove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana' }));
    expect(onRemove).toHaveBeenCalledWith(ana.id);
  });
});
