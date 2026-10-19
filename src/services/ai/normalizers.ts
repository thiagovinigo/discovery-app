import type { Epic, OKR, PRDDocument } from '../../types/discovery';

const asArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const asStringArray = (v: any): string[] => asArray<any>(v).map(x => String(x));

const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'];
const TASK_TYPES = ['frontend', 'backend', 'database', 'analytics', 'qa', 'infra'];
const EPIC_STATUSES = ['discovery', 'ready_for_dev', 'in_progress', 'done'];

export const normalizeEpics = (raw: any): Epic[] => {
  const stamp = Date.now();
  return asArray<any>(raw).map((e, ei) => {
    const epicId = e.id || `epic-ai-${stamp}-${ei}`;
    return {
      id: epicId,
      title: String(e.title || `Épico ${ei + 1}`),
      objective: String(e.objective || ''),
      businessValue: String(e.businessValue || ''),
      targetDate: e.targetDate ? String(e.targetDate) : undefined,
      status: EPIC_STATUSES.includes(e.status) ? e.status : 'discovery',
      features: asArray<any>(e.features).map((f, fi) => {
        const featId = f.id || `feat-ai-${stamp}-${ei}-${fi}`;
        const r = f.riceScore;
        return {
          id: featId,
          epicId,
          title: String(f.title || `Feature ${fi + 1}`),
          description: String(f.description || ''),
          valueProposition: String(f.valueProposition || ''),
          effort: EFFORTS.includes(f.effort) ? f.effort : 'M',
          riceScore: r
            ? {
                reach: Number(r.reach) || 0,
                impact: Number(r.impact) || 0,
                confidence: Number(r.confidence) || 0,
                effort: Number(r.effort) || 1,
                total: Number(r.total) || 0
              }
            : undefined,
          userStories: asArray<any>(f.userStories).map((s, si) => {
            const storyId = s.id || `us-ai-${stamp}-${ei}-${fi}-${si}`;
            return {
              id: storyId,
              featureId: featId,
              title: String(s.title || `História ${si + 1}`),
              asA: String(s.asA || ''),
              iWantTo: String(s.iWantTo || ''),
              soThat: String(s.soThat || ''),
              storyPoints: s.storyPoints !== undefined ? Number(s.storyPoints) || undefined : undefined,
              acceptanceCriteria: asArray<any>(s.acceptanceCriteria).map((a, ai) => ({
                id: a.id || `ac-ai-${stamp}-${ei}-${fi}-${si}-${ai}`,
                scenario: String(a.scenario || ''),
                given: String(a.given || ''),
                when: String(a.when || ''),
                then: String(a.then || '')
              })),
              tasks: asArray<any>(s.tasks).map((t, ti) => ({
                id: t.id || `task-ai-${stamp}-${ei}-${fi}-${si}-${ti}`,
                title: String(t.title || `Tarefa ${ti + 1}`),
                type: TASK_TYPES.includes(t.type) ? t.type : 'backend',
                status: 'todo' as const,
                estimatedHours: t.estimatedHours !== undefined ? Number(t.estimatedHours) || undefined : undefined
              }))
            };
          })
        };
      })
    };
  });
};

export const normalizeOkrs = (raw: any): OKR[] => {
  const stamp = Date.now();
  return asArray<any>(raw).map((o, oi) => ({
    id: o.id || `okr-ai-${stamp}-${oi}`,
    objective: String(o.objective || ''),
    keyResults: asArray<any>(o.keyResults).map((k, ki) => ({
      id: k.id || `kr-ai-${stamp}-${oi}-${ki}`,
      description: String(k.description || ''),
      baseline: String(k.baseline ?? ''),
      target: String(k.target ?? ''),
      current: String(k.current ?? k.baseline ?? '')
    }))
  }));
};

export const normalizePrd = (raw: any, fallbackTitle: string): PRDDocument | null => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || 'prd-ai-' + Date.now(),
    title: String(raw.title || `PRD: ${fallbackTitle}`),
    version: String(raw.version || '1.0.0 (Gerado por IA)'),
    lastUpdated: new Date().toLocaleDateString('pt-BR'),
    problemStatement: String(raw.problemStatement || ''),
    targetAudience: String(raw.targetAudience || ''),
    valueProposition: String(raw.valueProposition || ''),
    inScope: asStringArray(raw.inScope),
    outOfScope: asStringArray(raw.outOfScope),
    successMetrics: asStringArray(raw.successMetrics),
    assumptions: asStringArray(raw.assumptions),
    risksAndMitigations: asArray<any>(raw.risksAndMitigations).map(r => ({
      risk: String(r?.risk || ''),
      mitigation: String(r?.mitigation || '')
    }))
  };
};
