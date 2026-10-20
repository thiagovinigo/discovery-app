import { stakeholderName, ROLE_LABELS } from './stakeholderService';
import type { DiscoveryProject } from '../types/discovery';

export interface KnowledgeHit {
  kind: 'fala' | 'nota' | 'stakeholder' | 'dor' | 'decisao' | 'backlog' | 'prd';
  /** Trecho do que está registrado. */
  text: string;
  /** De onde veio, para o usuário conferir (reunião, minuto e quem falou, por exemplo). */
  source: string;
  /** Quantas palavras da pergunta apareceram no trecho. */
  score: number;
}

const STOP_WORDS = new Set([
  'que', 'qual', 'quais', 'como', 'quando', 'onde', 'quem', 'quanto', 'quantos', 'quantas', 'por', 'para', 'com', 'sem',
  'uma', 'uns', 'umas', 'dos', 'das', 'nos', 'nas', 'pelo', 'pela', 'aos', 'mas', 'ser', 'foi', 'sao', 'esta', 'estao',
  'tem', 'ter', 'isso', 'isto', 'esse', 'essa', 'este', 'aquele', 'aquela', 'voce', 'voces', 'ele', 'ela', 'eles', 'elas',
  'nosso', 'nossa', 'meu', 'minha', 'seu', 'sua', 'mais', 'muito', 'ainda', 'sobre', 'entre', 'depois', 'antes', 'tambem',
  'fala', 'falou', 'disse', 'diz', 'fazer', 'pode', 'podem', 'alguem'
]);

/** Minúsculas, sem acentos. */
export const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const stem = (word: string): string => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word);

/** Palavras que carregam sentido (sem acento, no singular, sem palavras comuns). */
export function tokens(text: string): string[] {
  return plain(text)
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stem);
}

interface Candidate {
  kind: KnowledgeHit['kind'];
  text: string;
  source: string;
  /** Texto extra em que a busca também olha (etiquetas, por exemplo), sem aparecer na citação. */
  extra?: string;
}

function candidatesOf(project: DiscoveryProject): Candidate[] {
  const list: Candidate[] = [];

  for (const session of project.sessions) {
    for (const segment of session.rawTranscript) {
      const who = stakeholderName(project, segment.speakerStakeholderId) ?? segment.speaker;
      list.push({ kind: 'fala', text: segment.text, source: `Reunião "${session.title}", ${segment.timestamp}, ${who}` });
    }
    for (const pain of session.painPoints) {
      list.push({
        kind: 'dor',
        text: pain.quote ? `${pain.description} — "${pain.quote}"` : pain.description,
        source: `Dor mapeada na reunião "${session.title}"`
      });
    }
  }

  for (const note of project.notes ?? []) {
    list.push({
      kind: 'nota',
      text: note.text,
      extra: note.tags.join(' '),
      source: `Anotação de ${new Date(note.createdAt).toLocaleDateString('pt-BR')}`
    });
  }

  for (const s of project.stakeholders ?? []) {
    const details = [ROLE_LABELS[s.role], s.jobTitle, s.organization].filter(Boolean).join(' · ');
    list.push({
      kind: 'stakeholder',
      text: `${s.name} — ${details}${s.notes ? ` — ${s.notes}` : ''}`,
      source: 'Cadastro de stakeholders'
    });
  }

  for (const decision of project.decisionLog) {
    list.push({ kind: 'decisao', text: `${decision.decision} — ${decision.context}`, source: 'Registro de decisões' });
  }

  for (const epic of project.epics) {
    list.push({ kind: 'backlog', text: `${epic.title} — ${epic.objective}`, source: `Backlog: épico "${epic.title}"` });
    for (const feature of epic.features) {
      list.push({ kind: 'backlog', text: `${feature.title} — ${feature.description}`, source: `Backlog: feature "${feature.title}"` });
      for (const story of feature.userStories) {
        list.push({
          kind: 'backlog',
          text: `${story.title} — Como ${story.asA}, quero ${story.iWantTo}, para ${story.soThat}`,
          source: `Backlog: história "${story.title}"`
        });
      }
    }
  }

  const prd = project.prd;
  const prdFields: [string, string | undefined][] = [
    ['Problema', prd.problemStatement],
    ['Público', prd.targetAudience],
    ['Proposta de valor', prd.valueProposition],
    ['North Star', prd.northStarMetric]
  ];
  for (const [label, value] of prdFields) {
    if (value && value.trim()) list.push({ kind: 'prd', text: `${label}: ${value}`, source: 'PRD' });
  }
  const prdLists: [string, string[]][] = [
    ['Escopo', prd.inScope], ['Fora do escopo', prd.outOfScope], ['Métricas de sucesso', prd.successMetrics], ['Premissas', prd.assumptions]
  ];
  for (const [label, items] of prdLists) {
    if (items.length) list.push({ kind: 'prd', text: `${label}: ${items.join('; ')}`, source: 'PRD' });
  }

  return list;
}

/**
 * Procura no que o projeto já registrou (falas, anotações, stakeholders, dores, decisões, backlog e PRD) o que
 * casa com a pergunta. Cada resultado diz de onde veio. Não inventa: sem correspondência, devolve lista vazia.
 */
export function searchProjectKnowledge(project: DiscoveryProject, query: string, limit = 5): KnowledgeHit[] {
  const wanted = new Set(tokens(query));
  if (wanted.size === 0) return [];

  const hits: KnowledgeHit[] = [];
  for (const candidate of candidatesOf(project)) {
    const found = new Set(tokens(`${candidate.text} ${candidate.extra ?? ''}`));
    let score = 0;
    for (const word of wanted) if (found.has(word)) score++;
    if (score > 0) hits.push({ kind: candidate.kind, text: candidate.text, source: candidate.source, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
