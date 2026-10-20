import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MindMapCanvas } from './MindMapCanvas';
import type { MindMapNode } from '../types/discovery';

const node = (over: Partial<MindMapNode> & Pick<MindMapNode, 'id' | 'label' | 'type'>): MindMapNode => ({
  x: 0, y: 0, color: '#999', ...over
});

const NODES: MindMapNode[] = [
  node({ id: 'm-root', label: 'Reduzir retrabalho', type: 'root', x: 400, y: 250 }),
  node({ id: 'mm-topic-planilha', label: 'Planilhas', type: 'topic', parentId: 'm-root', x: 400, y: 80 }),
  node({
    id: 'mm-pain-1', label: 'Fórmula quebra todo mês', type: 'pain', parentId: 'mm-topic-planilha', x: 300, y: 20,
    quote: 'toda vez que alguém muda a fórmula quebra', speaker: 'Ana', timestamp: '00:42', notes: 'Descrição completa'
  })
];

afterEach(cleanup);

const setup = (over: Partial<React.ComponentProps<typeof MindMapCanvas>> = {}) => {
  const props = {
    nodes: NODES,
    onRename: vi.fn(), onAddChild: vi.fn(), onDelete: vi.fn(), onRefresh: vi.fn(), onTriggerAnalysis: vi.fn(),
    ...over
  };
  render(<MindMapCanvas {...props} />);
  return props;
};

describe('MindMapCanvas', () => {
  it('mostra todos os nós da árvore com seus rótulos', () => {
    setup();

    expect(screen.getByRole('button', { name: /Reduzir retrabalho/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Planilhas/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Fórmula quebra todo mês/ })).toBeTruthy();
  });

  it('clicar num nó mostra o detalhe com a fala, quem disse e quando', () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: /Fórmula quebra todo mês/ }));

    const detail = screen.getByRole('region', { name: /Detalhe do nó/i });
    expect(detail.textContent).toContain('toda vez que alguém muda a fórmula quebra');
    expect(detail.textContent).toContain('Ana');
    expect(detail.textContent).toContain('00:42');
    expect(detail.textContent).toContain('Descrição completa');
  });

  it('sem nó selecionado, o detalhe pede para clicar num nó', () => {
    setup();

    expect(screen.getByText(/clique num nó/i)).toBeTruthy();
  });

  it('renomeia o nó selecionado', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /Planilhas/ }));

    fireEvent.change(screen.getByLabelText('Nome do nó'), { target: { value: 'Fechamento mensal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    expect(props.onRename).toHaveBeenCalledWith('mm-topic-planilha', 'Fechamento mensal');
  });

  it('não salva nome em branco', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /Planilhas/ }));

    fireEvent.change(screen.getByLabelText('Nome do nó'), { target: { value: '   ' } });

    expect((screen.getByRole('button', { name: 'Salvar nome' }) as HTMLButtonElement).disabled).toBe(true);
    expect(props.onRename).not.toHaveBeenCalled();
  });

  it('acrescenta um filho ao nó selecionado e limpa o campo', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /Planilhas/ }));

    const input = screen.getByLabelText('Novo nó filho') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Automatizar conferência' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar filho' }));

    expect(props.onAddChild).toHaveBeenCalledWith('mm-topic-planilha', 'Automatizar conferência');
    expect(input.value).toBe('');
  });

  it('apagar pede confirmação antes de chamar onDelete', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /Planilhas/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Apagar nó' }));
    expect(props.onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar: apagar com tudo que está dentro/ }));
    expect(props.onDelete).toHaveBeenCalledWith('mm-topic-planilha');
  });

  it('a raiz não pode ser apagada', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Reduzir retrabalho/ }));

    expect(screen.queryByRole('button', { name: 'Apagar nó' })).toBeNull();
  });

  it('"Atualizar mapa" refaz o mapa sem IA', () => {
    const props = setup();

    fireEvent.click(screen.getByRole('button', { name: /Atualizar mapa/ }));

    expect(props.onRefresh).toHaveBeenCalled();
  });

  it('"Atualizar com IA" aciona a análise', () => {
    const props = setup();

    fireEvent.click(screen.getByRole('button', { name: /Atualizar com IA/ }));

    expect(props.onTriggerAnalysis).toHaveBeenCalled();
  });

  it('sem conversa ainda, explica como o mapa nasce', () => {
    setup({ nodes: [NODES[0]] });

    expect(screen.getByText(/conforme a conversa avança/i)).toBeTruthy();
  });

  it('ajusta o enquadramento ao tamanho do mapa, sem caixa fixa de 800x500', () => {
    const wide = [...NODES, node({ id: 'mm-far', label: 'Longe', type: 'topic', parentId: 'm-root', x: 1600, y: 900 })];
    const { container } = render(<MindMapCanvas nodes={wide} />);

    const viewBox = container.querySelector('svg[preserveAspectRatio]')!.getAttribute('viewBox')!;
    const [, , width, height] = viewBox.split(' ').map(Number);
    expect(width).toBeGreaterThan(800);
    expect(height).toBeGreaterThan(500);
  });

  it('desenha uma ligação do pai para cada filho', () => {
    const { container } = render(<MindMapCanvas nodes={NODES} />);

    expect(container.querySelectorAll('path[data-edge]')).toHaveLength(2);
  });
});
