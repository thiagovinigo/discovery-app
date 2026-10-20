import { tokens } from './knowledgeService';
import type { DomainCategory, Epic, MeetingSession, PriorityLevel } from '../types/discovery';

export interface PainCluster {
  /** Descrição da primeira dor do grupo. */
  theme: string;
  occurrences: number;
  sessionsCount: number;
  severity: PriorityLevel;
  /** Fala citada em alguma das dores do grupo, se houver. */
  sampleQuote?: string;
}

export interface MethodSuggestion {
  id: string;
  /** A dor real do projeto que motivou a sugestão. */
  trigger: string;
  method: string;
  badge: string;
  action: string;
  frameworkLink: string;
}

const MAX_CLUSTERS = 6;
const MAX_SUGGESTIONS = 3;
/** Duas dores são do mesmo grupo se dividem ao menos 2 palavras e 40% das palavras da mais curta. */
const MIN_SHARED_WORDS = 2;
const MIN_SHARED_RATIO = 0.4;
const SEVERITY_RANK: Record<PriorityLevel, number> = { high: 3, medium: 2, low: 1 };

const similar = (a: Set<string>, b: Set<string>): boolean => {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared >= MIN_SHARED_WORDS && shared / Math.min(a.size, b.size) >= MIN_SHARED_RATIO;
};

interface Member {
  description: string;
  severity: PriorityLevel;
  quote?: string;
  sessionId: string;
}

interface Group {
  words: Set<string>;
  members: Member[];
}

function groupPainPoints(sessions: MeetingSession[]): Group[] {
  const groups: Group[] = [];
  for (const session of sessions) {
    for (const pain of session.painPoints) {
      const words = new Set(tokens(pain.description));
      const member: Member = { description: pain.description, severity: pain.severity, quote: pain.quote, sessionId: session.id };
      const home = groups.find(g => similar(g.words, words));
      if (home) home.members.push(member);
      else groups.push({ words, members: [member] });
    }
  }
  return groups;
}

const toCluster = (group: Group): PainCluster => ({
  theme: group.members[0].description,
  occurrences: group.members.length,
  sessionsCount: new Set(group.members.map(m => m.sessionId)).size,
  severity: group.members.reduce<PriorityLevel>((top, m) => (SEVERITY_RANK[m.severity] > SEVERITY_RANK[top] ? m.severity : top), 'low'),
  sampleQuote: group.members.find(m => m.quote)?.quote
});

/**
 * Agrupa as dores mapeadas nas reuniões por assunto parecido, para mostrar o que se repete. Tudo vem das dores
 * reais do projeto: sem dores, não há grupos. Os mais citados primeiro.
 */
export function clusterPainPoints(sessions: MeetingSession[]): PainCluster[] {
  return groupPainPoints(sessions)
    .map(toCluster)
    .sort((a, b) => b.occurrences - a.occurrences || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, MAX_CLUSTERS);
}

/**
 * Até três sugestões de método, cada uma partindo de uma dor real: dor grave pede fatiamento (PBB); dor que se repete,
 * descoberta contínua (OST); as demais, aprofundar com entrevistas (Mom Test). Sem dores, sem sugestões.
 */
export function methodSuggestions(sessions: MeetingSession[]): MethodSuggestion[] {
  return groupPainPoints(sessions)
    .map(toCluster)
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurrences - a.occurrences)
    .slice(0, MAX_SUGGESTIONS)
    .map((cluster, index): MethodSuggestion => {
      const id = `syn-${index + 1}`;
      if (cluster.severity === 'high') {
        return {
          id, trigger: cluster.theme, method: 'Product Backlog Building (PBB - Fábio Aguiar)', badge: 'Fatiamento & Regras',
          action: `Fatiar a dor "${cluster.theme}" em passos pequenos e escrever critérios Given/When/Then para cada um.`,
          frameworkLink: 'disc-pbb'
        };
      }
      if (cluster.occurrences >= 2) {
        return {
          id, trigger: cluster.theme, method: 'Opportunity Solution Tree (OST - Teresa Torres)', badge: 'Descoberta Contínua',
          action: `Tratar "${cluster.theme}" como oportunidade recorrente: mapear soluções possíveis e testar hipóteses antes de construir.`,
          frameworkLink: 'disc-continuous-discovery'
        };
      }
      return {
        id, trigger: cluster.theme, method: 'Mom Test (Rob Fitzpatrick)', badge: 'Aprofundar a dor',
        action: `Entrevistar mais pessoas sobre "${cluster.theme}", pedindo exemplos de situações reais recentes, antes de decidir a solução.`,
        frameworkLink: 'disc-continuous-discovery'
      };
    });
}

const DOMAIN_LABELS: Record<DomainCategory, string> = {
  checkout: 'Checkout',
  onboarding: 'Onboarding',
  security: 'Segurança',
  operations: 'Operações',
  core: 'Core',
  analytics: 'Analytics'
};

/** Áreas de produto que as histórias do backlog realmente têm (campo domínio), das mais usadas para as menos. */
export function productAreas(epics: Epic[]): { label: string; stories: number }[] {
  const counts = new Map<DomainCategory, number>();
  for (const story of epics.flatMap(e => e.features).flatMap(f => f.userStories)) {
    if (story.domain) counts.set(story.domain, (counts.get(story.domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, stories]) => ({ label: DOMAIN_LABELS[domain], stories }))
    .sort((a, b) => b.stories - a.stories || a.label.localeCompare(b.label));
}

const MAX_CLARITY = 95;

/** Índice de clareza do discovery: cresce com a evidência coletada. Projeto sem nada coletado fica em zero. */
export function clarityScore(counts: { transcripts: number; painPoints: number; jtbds: number; epics: number }): number {
  const raw = (counts.transcripts * 3 + counts.painPoints * 8 + counts.jtbds * 10 + (counts.epics > 0 ? 25 : 0)) * 0.4;
  return Math.min(MAX_CLARITY, Math.max(0, Math.round(raw)));
}
