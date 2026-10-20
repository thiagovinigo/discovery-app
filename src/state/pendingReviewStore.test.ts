import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingReview, loadPendingReview, savePendingReview } from './pendingReviewStore';
import type { PendingReview } from './pendingReviewStore';

const review: PendingReview = {
  projectId: 'p1',
  sessionId: 'sess-1',
  type: 'refinement',
  proposals: [{
    id: 'add:story:f1:nova', kind: 'add', level: 'story', label: 'Nova', parentId: 'f1',
    item: { id: 's1', featureId: 'f1', title: 'Nova', asA: '', iWantTo: '', soThat: '', acceptanceCriteria: [], tasks: [] }
  }]
};

beforeEach(() => {
  localStorage.clear();
});

describe('pendingReviewStore', () => {
  it('guarda o pacote e o devolve igual depois', () => {
    savePendingReview(review);

    expect(loadPendingReview()).toEqual(review);
  });

  it('sem nada guardado, devolve null', () => {
    expect(loadPendingReview()).toBeNull();
  });

  it('limpar remove o pacote', () => {
    savePendingReview(review);
    clearPendingReview();

    expect(loadPendingReview()).toBeNull();
  });

  it('dado corrompido ou de formato errado é ignorado, não quebra', () => {
    localStorage.setItem('discovery_done_pending_review_v1', '{não é json');
    expect(loadPendingReview()).toBeNull();

    localStorage.setItem('discovery_done_pending_review_v1', JSON.stringify({ projectId: 'p1' }));
    expect(loadPendingReview()).toBeNull();
  });

  it('se o armazenamento falhar ao gravar, não lança erro', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota excedida');
    });

    expect(() => savePendingReview(review)).not.toThrow();
    spy.mockRestore();
  });
});
