import { plain } from './knowledgeService';
import { extractTopics } from './topicService';
import type { MeetingMinutes, MeetingSession, Stakeholder, TranscriptSegment } from '../types/discovery';

const MAX_STATEMENTS_PER_TOPIC = 3;
const MAX_OPEN_SUGGESTED = 5;
const STATEMENT_CHARS = 160;
const UNDEFINED_VALUE = 'A definir';

const DECISION = /ficou (decidido|combinado|definido|acordado)|decidimos|decidiu-se|fechamos (que|com)|combinamos|aprovad[oa]s?\b|vamos (adotar|usar|seguir com|priorizar)/;
const COMMITMENT = /\b(vou|vai|ficou de|fica de|fica com|fica responsavel|responsavel por|precisamos|preciso|temos que|tenho que)\b/;
const FIRST_PERSON = /\b(eu|vou|preciso|tenho que)\b/;
const DEADLINE = /\b(até (?:o dia \d{1,2}|dia \d{1,2}|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|amanhã|amanha|o fim d[oa] \w+|\d{1,2}\/\d{1,2})|amanhã|amanha|semana que vem|próxima semana|proxima semana|mês que vem|mes que vem)/i;
const NAMED_OWNER = /^([A-ZÀ-Ú][\p{L}]+)\s+(?:fica|vai|ficou)\b/u;
const PRONOUNS = new Set(['Eu', 'Ele', 'Ela', 'Nós', 'Nos', 'Você', 'Voce', 'Isso', 'Então', 'Entao']);

const GENERIC_SPEAKERS: Record<TranscriptSegment['speaker'], string> = {
  'Entrevistador (PM)': 'Entrevistador',
  'Usuário / Stakeholder': 'Entrevistado',
  Desconhecido: 'Não identificado'
};

const norm = (text: string): string => plain(text).trim();
const clip = (text: string): string => (text.length <= STATEMENT_CHARS ? text : `${text.slice(0, STATEMENT_CHARS - 1).trimEnd()}…`);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const sentencesOf = (text: string): string[] => text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = norm(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function buildParticipants(session: MeetingSession, stakeholders: Stakeholder[]): string[] {
  const named = (id: string | undefined) => stakeholders.find(s => s.id === id)?.name;
  return unique([
    ...(session.participantIds ?? []).map(named).filter((n): n is string => !!n),
    ...session.participants,
    ...session.rawTranscript.map(s => named(s.speakerStakeholderId)).filter((n): n is string => !!n)
  ]);
}

/**
 * Monta a ata a partir do que foi dito: participantes, assuntos com as falas principais, decisões, combinados com
 * responsável e prazo, perguntas em aberto, dores e jobs. Reconhece frases como "ficou decidido…", "eu vou mandar até
 * sexta…". Funciona sem IA; o que não dá para saber fica como "A definir", nunca inventado.
 */
export function buildMinutes(session: MeetingSession, stakeholders: Stakeholder[] = [], now: Date = new Date()): MeetingMinutes {
  const speakerOf = (segment: TranscriptSegment): string =>
    stakeholders.find(s => s.id === segment.speakerStakeholderId)?.name ?? GENERIC_SPEAKERS[segment.speaker];
  const isIdentified = (name: string): boolean => !Object.values(GENERIC_SPEAKERS).includes(name) || name === GENERIC_SPEAKERS['Usuário / Stakeholder'];

  const decisions: MeetingMinutes['decisions'] = [];
  const actionItems: MeetingMinutes['actionItems'] = [];
  const questions: string[] = [];

  for (const segment of session.rawTranscript) {
    if (!segment.text.trim()) continue;
    const speaker = speakerOf(segment);
    for (const raw of sentencesOf(segment.text)) {
      const text = raw.replace(/^(então|entao)[\s,]+/i, '').replace(/[.!]+$/, '');
      const key = norm(text);
      if (text.endsWith('?')) {
        if (segment.speaker !== 'Entrevistador (PM)') questions.push(text);
      } else if (DECISION.test(key)) {
        decisions.push({ text, speaker, timestamp: segment.timestamp });
      } else if (COMMITMENT.test(key)) {
        const named = NAMED_OWNER.exec(text)?.[1];
        const owner = named && !PRONOUNS.has(named)
          ? named
          : FIRST_PERSON.test(key) && isIdentified(speaker) ? speaker : UNDEFINED_VALUE;
        actionItems.push({ item: text, owner, deadline: DEADLINE.exec(text)?.[0] ?? UNDEFINED_VALUE });
      }
    }
  }

  const byId = new Map(session.rawTranscript.map(s => [s.id, s]));
  const topics = extractTopics(session).map(topic => ({
    title: topic.title,
    statements: topic.segmentIds
      .slice(0, MAX_STATEMENTS_PER_TOPIC)
      .map(id => byId.get(id))
      .filter((s): s is TranscriptSegment => !!s)
      .map(s => ({ speaker: speakerOf(s), text: clip(s.text.trim()), timestamp: s.timestamp }))
  }));

  const suggested = session.liveQuestions.filter(q => !q.asked).slice(0, MAX_OPEN_SUGGESTED).map(q => q.question);
  const spoken = session.rawTranscript.filter(s => s.text.trim()).length;

  return {
    generatedAt: now.toISOString(),
    participants: buildParticipants(session, stakeholders),
    summary: [
      plural(spoken, 'fala', 'falas'),
      plural(topics.length, 'assunto', 'assuntos'),
      plural(decisions.length, 'decisão', 'decisões'),
      plural(actionItems.length, 'ação combinada', 'ações combinadas')
    ].join(', '),
    topics,
    decisions,
    actionItems,
    openQuestions: unique([...questions, ...suggested]),
    painPoints: session.painPoints.map(p => p.description),
    jobs: session.jtbds.map(j => j.job)
  };
}

/** Guarda a ata na sessão (devolve uma sessão nova). */
export function withMinutes(session: MeetingSession, stakeholders: Stakeholder[] = [], now: Date = new Date()): MeetingSession {
  return { ...session, minutes: buildMinutes(session, stakeholders, now) };
}

const cell = (text: string): string => text.replace(/\|/g, '\\|');
const section = (title: string, lines: string[]): string[] => (lines.length ? ['', `## ${title}`, '', ...lines] : []);

/** A ata em Markdown, pronta para copiar ou baixar. Seções sem conteúdo ficam de fora. */
export function minutesToMarkdown(minutes: MeetingMinutes, session: Pick<MeetingSession, 'title' | 'date' | 'durationSeconds' | 'objective'>): string {
  const meta = [`**Data:** ${session.date}`];
  if (session.durationSeconds > 0) meta.push(`**Duração:** ${Math.max(1, Math.round(session.durationSeconds / 60))} min`);
  const header = [`# Ata: ${session.title}`, '', meta.join(' · ')];
  if (session.objective) header.push('', `**Objetivo:** ${session.objective}`);
  if (minutes.participants.length) header.push('', `**Participantes:** ${minutes.participants.join(', ')}`);
  header.push('', `> ${minutes.summary}`);

  const topics = minutes.topics.flatMap(t => [
    `### ${t.title}`,
    ...t.statements.map(s => `- **${s.speaker}** (${s.timestamp}): ${s.text}`),
    ''
  ]);
  const actions = minutes.actionItems.length
    ? ['| Ação | Responsável | Prazo |', '|---|---|---|', ...minutes.actionItems.map(a => `| ${cell(a.item)} | ${cell(a.owner)} | ${cell(a.deadline)} |`)]
    : [];

  return [
    ...header,
    ...section('Assuntos tratados', topics.length ? topics.slice(0, -1) : []),
    ...section('Decisões', minutes.decisions.map(d => `- ${d.text} — ${d.speaker} (${d.timestamp})`)),
    ...section('Ações combinadas', actions),
    ...section('Perguntas em aberto', minutes.openQuestions.map(q => `- ${q}`)),
    ...section('Dores identificadas', minutes.painPoints.map(p => `- ${p}`)),
    ...section('Jobs a serem feitos', minutes.jobs.map(j => `- ${j}`)),
    ''
  ].join('\n');
}

const wikiLink = (name: string): string => {
  if (!name || name === UNDEFINED_VALUE || Object.values(GENERIC_SPEAKERS).includes(name)) return name;
  return `[[${name.replace(/[\[\]]/g, '')}]]`;
};

/**
 * Ata formatada como nota Markdown para Obsidian (E12.6):
 * frontmatter YAML completo + wikilinks `[[Participante]]`, `[[Projeto]]` e `[[Assunto]]`, mantendo a mesma informação da ata padrão.
 */
export function minutesToObsidianMarkdown(
  minutes: MeetingMinutes,
  session: Pick<MeetingSession, 'title' | 'date' | 'durationSeconds' | 'objective' | 'type'>,
  projectName?: string
): string {
  const safeQuote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
  const meetingType = session.type ?? 'discovery';
  const fmLines = [
    '---',
    `title: ${safeQuote(`Ata: ${session.title}`)}`,
    `date: ${safeQuote(session.date)}`,
    `generatedAt: ${safeQuote(minutes.generatedAt)}`,
    `type: ${meetingType}`,
    ...(projectName ? [`project: ${safeQuote(`[[${projectName}]]`)}`] : []),
    `tags: [discovery, ata, ${meetingType}]`,
    ...(minutes.participants.length
      ? ['participants:', ...minutes.participants.map(p => `  - ${safeQuote(`[[${p}]]`)}`)]
      : []),
    '---',
    ''
  ];

  const meta = [`**Data:** ${session.date}`];
  if (session.durationSeconds > 0) meta.push(`**Duração:** ${Math.max(1, Math.round(session.durationSeconds / 60))} min`);
  const header = [`# Ata: ${session.title}`, '', meta.join(' · ')];
  if (projectName) header.push('', `**Projeto:** [[${projectName}]]`);
  if (session.objective) header.push('', `**Objetivo:** ${session.objective}`);
  if (minutes.participants.length) {
    header.push('', `**Participantes:** ${minutes.participants.map(wikiLink).join(', ')}`);
  }
  header.push('', `> ${minutes.summary}`);

  const topics = minutes.topics.flatMap(t => [
    `### [[${t.title}]]`,
    ...t.statements.map(s => `- **${wikiLink(s.speaker)}** (${s.timestamp}): ${s.text}`),
    ''
  ]);
  const actions = minutes.actionItems.length
    ? [
        '| Ação | Responsável | Prazo |',
        '|---|---|---|',
        ...minutes.actionItems.map(a => `| ${cell(a.item)} | ${cell(wikiLink(a.owner))} | ${cell(a.deadline)} |`)
      ]
    : [];

  return [
    ...fmLines,
    ...header,
    ...section('Assuntos tratados', topics.length ? topics.slice(0, -1) : []),
    ...section('Decisões', minutes.decisions.map(d => `- ${d.text} — ${wikiLink(d.speaker)} (${d.timestamp})`)),
    ...section('Ações combinadas', actions),
    ...section('Perguntas em aberto', minutes.openQuestions.map(q => `- [ ] ${q}`)),
    ...section('Dores identificadas', minutes.painPoints.map(p => `- ${p}`)),
    ...section('Jobs a serem feitos', minutes.jobs.map(j => `- ${j}`)),
    ''
  ].join('\n');
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Gera um documento HTML limpo e autocontido da ata para impressão / exportação em PDF client-side (E12.6),
 * garantindo exatamente a mesma informação da ata em `.md`.
 */
export function minutesToPrintableHtml(
  minutes: MeetingMinutes,
  session: Pick<MeetingSession, 'title' | 'date' | 'durationSeconds' | 'objective'>
): string {
  const durationMin = session.durationSeconds > 0 ? `${Math.max(1, Math.round(session.durationSeconds / 60))} min` : '';
  const listHtml = (title: string, items: string[]) =>
    items.length === 0
      ? ''
      : `<section><h2>${escapeHtml(title)}</h2><ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul></section>`;

  const topicsHtml =
    minutes.topics.length === 0
      ? ''
      : `<section><h2>Assuntos tratados</h2>${minutes.topics
          .map(
            t =>
              `<h3>${escapeHtml(t.title)}</h3><ul>${t.statements
                .map(s => `<li><strong>${escapeHtml(s.speaker)}</strong> (${escapeHtml(s.timestamp)}): ${escapeHtml(s.text)}</li>`)
                .join('')}</ul>`
          )
          .join('')}</section>`;

  const actionsHtml =
    minutes.actionItems.length === 0
      ? ''
      : `<section><h2>Ações combinadas</h2><table><thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${minutes.actionItems
          .map(
            a =>
              `<tr><td>${escapeHtml(a.item)}</td><td>${escapeHtml(a.owner)}</td><td>${escapeHtml(a.deadline)}</td></tr>`
          )
          .join('')}</tbody></table></section>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ata: ${escapeHtml(session.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 20px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 12px 0 4px; }
    p, li, td, th { font-size: 13px; }
    .meta { color: #475569; margin-bottom: 12px; }
    blockquote { margin: 12px 0; padding: 8px 12px; background: #f1f5f9; border-left: 3px solid #6366f1; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f8fafc; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>Ata: ${escapeHtml(session.title)}</h1>
  <div class="meta"><strong>Data:</strong> ${escapeHtml(session.date)}${durationMin ? ` · <strong>Duração:</strong> ${escapeHtml(durationMin)}` : ''}</div>
  ${session.objective ? `<p><strong>Objetivo:</strong> ${escapeHtml(session.objective)}</p>` : ''}
  ${minutes.participants.length ? `<p><strong>Participantes:</strong> ${escapeHtml(minutes.participants.join(', '))}</p>` : ''}
  <blockquote>${escapeHtml(minutes.summary)}</blockquote>
  ${topicsHtml}
  ${listHtml('Decisões', minutes.decisions.map(d => `${d.text} — ${d.speaker} (${d.timestamp})`))}
  ${actionsHtml}
  ${listHtml('Perguntas em aberto', minutes.openQuestions)}
  ${listHtml('Dores identificadas', minutes.painPoints)}
  ${listHtml('Jobs a serem feitos', minutes.jobs)}
</body>
</html>`;
}

/**
 * Exporta um documento HTML (ata ou protótipo) em PDF direto no navegador (E12.6, sem servidor):
 * cria um iframe oculto isolado e aciona a impressão em PDF do navegador (`contentWindow.print()`).
 */
export function exportHtmlToPdf(html: string, filenameBase: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('data-pdf-export', filenameBase);
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print?.();
  } catch {
    // Em ambientes de teste (jsdom) onde print não existe, apenas limpa o iframe
  } finally {
    setTimeout(() => {
      iframe.remove();
    }, 300);
  }
}
