import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { APP_VIEWS, hashForView, useHashView, viewFromHash } from './useHashView';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('viewFromHash / hashForView', () => {
  it('lê a tela do hash', () => {
    expect(viewFromHash('#/backlog')).toBe('backlog');
    expect(viewFromHash('#/interview')).toBe('interview');
    expect(viewFromHash('#/project_hub')).toBe('project_hub');
  });

  it('hash vazio ou só "#/" é a tela inicial', () => {
    expect(viewFromHash('')).toBe('projects');
    expect(viewFromHash('#')).toBe('projects');
    expect(viewFromHash('#/')).toBe('projects');
  });

  it('hash desconhecido ou malformado não é uma tela', () => {
    expect(viewFromHash('#/nao-existe')).toBeNull();
    expect(viewFromHash('#backlog')).toBeNull();
    expect(viewFromHash('#/backlog/extra')).toBeNull();
  });

  it('toda tela vira um hash e volta para a mesma tela', () => {
    for (const view of APP_VIEWS) expect(viewFromHash(hashForView(view))).toBe(view);
  });

  it('a lista de telas não repete e inclui as telas principais', () => {
    expect(new Set(APP_VIEWS).size).toBe(APP_VIEWS.length);
    expect(APP_VIEWS).toEqual(expect.arrayContaining(['projects', 'backlog', 'agenda', 'notes', 'interview', 'stakeholders']));
  });
});

describe('useHashView', () => {
  it('abre na tela do hash da URL', () => {
    window.history.replaceState(null, '', '/#/agenda');

    const { result } = renderHook(() => useHashView());

    expect(result.current[0]).toBe('agenda');
  });

  it('sem hash, abre na tela inicial', () => {
    expect(renderHook(() => useHashView()).result.current[0]).toBe('projects');
  });

  it('hash desconhecido cai na tela inicial', () => {
    window.history.replaceState(null, '', '/#/qualquer-coisa');

    expect(renderHook(() => useHashView()).result.current[0]).toBe('projects');
  });

  it('trocar de tela atualiza a URL', () => {
    const { result } = renderHook(() => useHashView());

    act(() => result.current[1]('backlog'));

    expect(result.current[0]).toBe('backlog');
    expect(window.location.hash).toBe('#/backlog');
  });

  it('voltar ou avançar no navegador (mudança do hash) troca a tela', async () => {
    const { result } = renderHook(() => useHashView());
    act(() => result.current[1]('backlog'));

    act(() => {
      window.location.hash = '#/notes';
    });

    await waitFor(() => expect(result.current[0]).toBe('notes'));
  });

  it('escolher a tela atual de novo não empilha outra entrada no histórico', () => {
    const { result } = renderHook(() => useHashView());
    act(() => result.current[1]('backlog'));
    const length = window.history.length;

    act(() => result.current[1]('backlog'));

    expect(window.history.length).toBe(length);
  });
});
