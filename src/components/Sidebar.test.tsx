import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { APP_VIEWS } from '../state/useHashView';

function renderSidebar(over: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const onChange = vi.fn();
  const view = render(
    <Sidebar activeView="project_hub" onChange={onChange} transcriptCount={0} epicCount={0} sessionCount={0} projectName="Meu produto" {...over} />
  );
  return { onChange, ...view };
}

afterEach(() => {
  cleanup();
});

describe('Sidebar: as 5 áreas e o menu de apoio', () => {
  it('organiza o menu em Visão, Captura, Análise, Backlog e Entrega, mais Copiloto & Biblioteca', () => {
    const { container } = renderSidebar();

    const titles = [...container.querySelectorAll('.sidebar-group')].map(group => group.children[0].textContent);

    expect(titles).toEqual([
      'ETAPA 1Visão', 'ETAPA 2Captura', 'ETAPA 3Análise', 'ETAPA 4Backlog', 'ETAPA 5Entrega', 'APOIOCopiloto & Biblioteca'
    ]);
  });

  it('cada tela do app aparece uma única vez no menu: nada foi removido e nada se repete', () => {
    const { container } = renderSidebar();

    const shown = [...container.querySelectorAll('button[id^="nav-"]')].map(b => b.id.replace('nav-', ''));
    const expected = APP_VIEWS.filter(view => view !== 'projects');

    expect([...shown].sort()).toEqual([...expected].sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('coloca cada tela na área certa', () => {
    const { container } = renderSidebar();
    const groups = [...container.querySelectorAll('.sidebar-group')].map(group => ({
      title: group.children[0].textContent ?? '',
      views: [...group.querySelectorAll('button[id^="nav-"]')].map(b => b.id.replace('nav-', ''))
    }));
    const viewsOf = (name: string) => groups.find(g => g.title.endsWith(name))?.views;

    expect(viewsOf('Visão')).toEqual(['project_hub', 'stakeholders', 'notes']);
    expect(viewsOf('Captura')).toEqual(['agenda', 'live_room', 'meetings']);
    expect(viewsOf('Análise')).toEqual(['brain_dashboard', 'product_audit']);
    expect(viewsOf('Backlog')).toEqual(['backlog', 'refine']);
    expect(viewsOf('Entrega')).toEqual(['documentation', 'agent_studio']);
    expect(viewsOf('Copiloto & Biblioteca')).toEqual(['interview', 'po_space', 'knowledge_hub']);
  });

  it('clicar num item leva para a tela dele, e o item da tela atual fica marcado', () => {
    const { onChange } = renderSidebar({ activeView: 'notes' });

    fireEvent.click(screen.getByRole('button', { name: /Agenda de Reuniões/ }));

    expect(onChange).toHaveBeenCalledWith('agenda');
    expect(screen.getByRole('button', { name: /Anotações/ }).className).toContain('active');
  });

  it('mostra as contagens nos itens que têm algo', () => {
    renderSidebar({ epicCount: 4, sessionCount: 2, stakeholderCount: 3, noteCount: 5, upcomingMeetingCount: 1 });

    expect(within(screen.getByRole('button', { name: /Backlog & Histórias/ })).getByText('4')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /Stakeholders/ })).getByText('3')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /Anotações/ })).getByText('5')).toBeTruthy();
  });

  it('mostra o nome do projeto e não inventa um quando falta', () => {
    renderSidebar({ projectName: 'Meu produto' });
    expect(screen.getByText('Meu produto')).toBeTruthy();

    cleanup();
    renderSidebar({ projectName: undefined });
    expect(screen.getByText('Projeto sem nome')).toBeTruthy();
    expect(screen.queryByText(/Liquidação/)).toBeNull();
  });
});
