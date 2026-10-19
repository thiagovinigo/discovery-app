import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgentStudioView } from './AgentStudioView';
import { runStudioAgent } from '../services/studioAgentService';

vi.mock('../services/studioAgentService', () => ({ runStudioAgent: vi.fn() }));

const runMock = vi.mocked(runStudioAgent);

afterEach(() => {
  cleanup();
  runMock.mockReset();
});

function runStorySlicer() {
  render(<AgentStudioView />);
  fireEvent.click(screen.getByText(/3\. Story Slicer/));
  fireEvent.click(screen.getByRole('button', { name: /Fatiar Épico em Histórias BDD/ }));
}

describe('AgentStudioView: aviso de texto de exemplo (E5.5)', () => {
  it('avisa que o resultado é um exemplo quando não veio da IA', async () => {
    runMock.mockResolvedValue({ text: 'Histórias de exemplo', source: 'template' });

    runStorySlicer();

    expect(await screen.findByText('Histórias de exemplo')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Exemplo ilustrativo');
  });

  it('não mostra o aviso quando a resposta veio da IA', async () => {
    runMock.mockResolvedValue({ text: 'Histórias da IA', source: 'ai' });

    runStorySlicer();

    expect(await screen.findByText('Histórias da IA')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('pede ao serviço o agente certo, com o texto digitado', async () => {
    runMock.mockResolvedValue({ text: 'ok', source: 'ai' });

    runStorySlicer();

    await screen.findByText('ok');
    expect(runMock).toHaveBeenCalledWith('slicer', expect.stringContaining('Módulo completo de pagamento'));
  });
});
