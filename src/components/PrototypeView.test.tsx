import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PrototypeView } from './PrototypeView';
import type { MeetingSession } from '../types/discovery';

afterEach(cleanup);

const makeSession = (over: Partial<MeetingSession> = {}): MeetingSession => ({
  id: 's1',
  title: 'Entrevista Compras',
  date: '04/11/2026',
  durationSeconds: 0,
  participants: [],
  rawTranscript: [],
  summary: { tldr: '', mainTakeaways: [], actionItems: [], goldenQuotes: [] },
  liveQuestions: [],
  painPoints: [],
  jtbds: [],
  mindMapNodes: [],
  mindMapEdges: [],
  userFlowSteps: [],
  ...over
});

describe('PrototypeView (E12.3 & E12.6)', () => {
  it('avisa quando não há etapas na jornada para gerar o protótipo', () => {
    render(
      <PrototypeView
        session={makeSession()}
        projectName="Portal Compras"
        isGenerating={false}
        onGenerateOffline={vi.fn()}
        onGenerateAI={vi.fn()}
      />
    );

    expect(screen.getByText(/protótipo é montado a partir das etapas da Jornada e do Story Map/i)).toBeTruthy();
  });

  it('exibe o wireframe navegável dentro de um iframe com sandbox, avisa quando é baixa fidelidade e permite exportar HTML e PDF', () => {
    const onGenerateOffline = vi.fn();
    const onGenerateAI = vi.fn();

    const session = makeSession({
      userFlowSteps: [
        { id: 'st-1', stepNumber: 1, title: 'Consultar fornecedor', actor: 'Comprador', systemAction: '', frictionLevel: 'critical' }
      ],
      prototype: {
        generatedAt: '2026-11-04T19:00:00Z',
        source: 'offline',
        screens: [
          {
            id: 'sc-1',
            stepNumber: 1,
            title: 'Consultar fornecedor',
            actor: 'Comprador',
            goal: 'Validar fornecedor',
            fields: ['Campo: Fornecedor'],
            primaryAction: 'Finalizar',
            secondaryActions: ['Salvar rascunho'],
            errorState: 'CNPJ inválido',
            storyTitles: ['Validar CNPJ']
          }
        ],
        html: '<!DOCTYPE html><html><body><h1>Wireframe</h1></body></html>'
      }
    });

    render(
      <PrototypeView
        session={session}
        projectName="Portal Compras"
        isGenerating={false}
        onGenerateOffline={onGenerateOffline}
        onGenerateAI={onGenerateAI}
      />
    );

    // Rotula claramente o que veio de regras (baixa fidelidade, sem IA)
    expect(screen.getByText(/Wireframe de baixa fidelidade \(gerado por regras locais, sem IA\)/i)).toBeTruthy();

    // O HTML roda exclusivamente dentro de um iframe com atributo sandbox
    const iframe = screen.getByTitle('Quadro isolado do protótipo') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');

    expect(screen.getByRole('button', { name: /Baixar HTML/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Exportar PDF/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Gerar HTML com IA/i }));
    expect(onGenerateAI).toHaveBeenCalledTimes(1);
  });
});
