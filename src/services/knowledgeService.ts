import { stakeholderName, ROLE_LABELS } from './stakeholderService';
import { storageService } from './storageService';
import type { DiscoveryProject } from '../types/discovery';

export interface KnowledgeHit {
  kind: 'fala' | 'nota' | 'stakeholder' | 'dor' | 'decisao' | 'backlog' | 'prd';
  /** Trecho do que está registrado. */
  text: string;
  /** De onde veio, para o usuário conferir (reunião, minuto e quem falou, por exemplo). */
  source: string;
  /** Pontuação de relevância (palavras exatas + equivalentes semânticos ou similaridade de embeddings). */
  score: number;
}

const STOP_WORDS = new Set([
  'que', 'qual', 'quais', 'como', 'quando', 'onde', 'quem', 'quanto', 'quantos', 'quantas', 'por', 'para', 'com', 'sem',
  'uma', 'uns', 'umas', 'dos', 'das', 'nos', 'nas', 'pelo', 'pela', 'aos', 'mas', 'ser', 'foi', 'sao', 'esta', 'estao',
  'tem', 'ter', 'isso', 'isto', 'esse', 'essa', 'este', 'aquele', 'aquela', 'voce', 'voces', 'ele', 'ela', 'eles', 'elas',
  'nosso', 'nossa', 'meu', 'minha', 'seu', 'sua', 'mais', 'muito', 'ainda', 'sobre', 'entre', 'depois', 'antes', 'tambem',
  'fala', 'falou', 'disse', 'diz', 'fazer', 'pode', 'podem', 'alguem', 'ocorrem', 'ocorre'
]);

/**
 * Grupos de equivalência semântica (E12.7): permite ao Copiloto encontrar trechos mesmo quando o PO
 * pergunta usando sinônimos ou conceitos correlatos sem a palavra exata.
 */
const SEMANTIC_CLUSTERS: string[][] = [
  ['lentidao', 'lento', 'lenta', 'demora', 'demorado', 'atraso', 'atrasa', 'gargalo', 'devagar'],
  ['erro', 'falha', 'bug', 'quebra', 'trava', 'travamento', 'defeito', 'cai', 'instavel'],
  ['custo', 'preco', 'caro', 'dinheiro', 'gasto', 'despesa', 'financeiro', 'verba', 'tarifa'],
  ['manual', 'planilha', 'excel', 'copiar', 'colar', 'redigitar', 'retrabalho', 'repetitivo'],
  ['seguranca', 'permissao', 'acesso', 'senha', 'auditoria', 'bloqueio', 'lgpd', 'vazamento'],
  ['integracao', 'api', 'sincronizar', 'importar', 'exportar', 'conectar', 'webhook']
];

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

/** Expande um conjunto de tokens com seus equivalentes semânticos (com peso menor que a palavra exata). */
function expandSemanticTokens(baseTokens: Iterable<string>): Set<string> {
  const expanded = new Set<string>();
  const base = new Set(baseTokens);
  for (const cluster of SEMANTIC_CLUSTERS) {
    if (cluster.some(w => base.has(w))) {
      for (const word of cluster) {
        if (!base.has(word)) expanded.add(word);
      }
    }
  }
  return expanded;
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
 * casa com a pergunta (por palavra exata ou conceito equivalente). Cada resultado diz de onde veio.
 */
export function searchProjectKnowledge(project: DiscoveryProject, query: string, limit = 5): KnowledgeHit[] {
  const wanted = new Set(tokens(query));
  if (wanted.size === 0) return [];
  const related = expandSemanticTokens(wanted);

  const hits: KnowledgeHit[] = [];
  for (const candidate of candidatesOf(project)) {
    const found = new Set(tokens(`${candidate.text} ${candidate.extra ?? ''}`));
    let score = 0;
    for (const word of wanted) if (found.has(word)) score += 1;
    for (const syn of related) if (found.has(syn)) score += 0.6;
    if (score > 0) hits.push({ kind: candidate.kind, text: candidate.text, source: candidate.source, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Similaridade cosseno entre dois vetores numéricos (embeddings). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Busca semântica por embeddings (`text-embedding-3-small`) no Copiloto (E12.7),
 * com fallback automático para a busca local (`searchProjectKnowledge`) quando não há chave OpenAI ou ocorre erro.
 */
export async function searchProjectKnowledgeSemantic(
  project: DiscoveryProject,
  query: string,
  limit = 5
): Promise<KnowledgeHit[]> {
  const localHits = searchProjectKnowledge(project, query, limit);
  const openAiKey = storageService.getOpenAiApiKey();
  if (!openAiKey || !query.trim()) return localHits;

  const candidates = candidatesOf(project).slice(0, 60);
  if (candidates.length === 0) return [];

  try {
    const input = [query.trim(), ...candidates.map(c => `${c.text} ${c.extra ?? ''}`.trim())];
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input
      })
    });

    if (!response.ok) return localHits;
    const data = await response.json();
    const vectors: number[][] | undefined = data?.data?.map((d: { embedding: number[] }) => d.embedding);
    if (!vectors || vectors.length !== candidates.length + 1) return localHits;

    const queryVec = vectors[0];
    const localScoreByText = new Map(localHits.map(h => [`${h.source}:${h.text}`, h.score]));

    const scored: KnowledgeHit[] = candidates
      .map((c, idx) => {
        const sim = cosineSimilarity(queryVec, vectors[idx + 1]);
        const lexicalBoost = (localScoreByText.get(`${c.source}:${c.text}`) ?? 0) * 0.15;
        return {
          kind: c.kind,
          text: c.text,
          source: c.source,
          score: sim + lexicalBoost
        };
      })
      .filter(h => h.score >= 0.32);

    return scored.length > 0 ? scored.sort((a, b) => b.score - a.score).slice(0, limit) : localHits;
  } catch {
    return localHits;
  }
}
