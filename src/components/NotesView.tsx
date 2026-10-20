import React, { useMemo, useState } from 'react';
import { NotebookPen } from 'lucide-react';
import type { DiscoveryProject, ProjectNote } from '../types/discovery';
import { allTags, filterNotes, parseTags } from '../services/noteService';
import type { NoteInput } from '../services/noteService';

interface NotesViewProps {
  project: DiscoveryProject;
  onAdd: (input: NoteInput) => void;
  onUpdate: (noteId: string, changes: Pick<NoteInput, 'text' | 'tags'>) => void;
  onRemove: (noteId: string) => void;
  onPromoteToDecision: (noteId: string) => void;
  onPromoteToStory: (noteId: string) => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-main)', fontSize: '0.84rem'
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };
const smallButton: React.CSSProperties = { padding: '3px 10px', fontSize: '0.74rem' };

interface NoteCardProps {
  note: ProjectNote;
  authorName?: string;
  onUpdate: NotesViewProps['onUpdate'];
  onRemove: NotesViewProps['onRemove'];
  onPromoteToDecision: NotesViewProps['onPromoteToDecision'];
  onPromoteToStory: NotesViewProps['onPromoteToStory'];
}

function NoteCard({ note, authorName, onUpdate, onRemove, onPromoteToDecision, onPromoteToStory }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [text, setText] = useState(note.text);
  const [tags, setTags] = useState(note.tags.join(', '));

  const save = () => {
    onUpdate(note.id, { text, tags: parseTags(tags) });
    setIsEditing(false);
  };

  return (
    <article className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {isEditing ? (
        <>
          <div>
            <label htmlFor={`note-text-${note.id}`} style={labelStyle}>Texto da anotação</label>
            <textarea id={`note-text-${note.id}`} value={text} onChange={e => setText(e.target.value)} style={{ ...fieldStyle, minHeight: '80px' }} />
          </div>
          <div>
            <label htmlFor={`note-tags-${note.id}`} style={labelStyle}>Etiquetas da anotação</label>
            <input id={`note-tags-${note.id}`} value={tags} onChange={e => setTags(e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-primary" style={smallButton} disabled={!text.trim()} onClick={save}>Salvar edição</button>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setIsEditing(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.86rem' }}>{note.text}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {authorName && <span className="badge badge-cyan">{authorName}</span>}
            {note.tags.map(tag => <span key={tag}>{`#${tag}`}</span>)}
            {note.decisionId && <span className="badge badge-primary">Virou decisão</span>}
            {note.storyId && <span className="badge badge-primary">Virou história</span>}
            <span style={{ marginLeft: 'auto' }}>{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {!note.decisionId && <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onPromoteToDecision(note.id)}>Virar decisão</button>}
            {!note.storyId && <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onPromoteToStory(note.id)}>Virar história</button>}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => { setText(note.text); setTags(note.tags.join(', ')); setIsEditing(true); }}>Editar</button>
            {isConfirmingDelete ? (
              <>
                <button type="button" className="btn btn-secondary" style={{ ...smallButton, color: '#fda4af' }} onClick={() => onRemove(note.id)}>Confirmar exclusão</button>
                <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setIsConfirmingDelete(false)}>Cancelar</button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setIsConfirmingDelete(true)}>Excluir</button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

/** Anotações livres do PO, com etiquetas e busca, que podem virar decisão ou história do backlog. */
export const NotesView: React.FC<NotesViewProps> = ({ project, onAdd, onUpdate, onRemove, onPromoteToDecision, onPromoteToStory }) => {
  const notes = useMemo(() => project.notes ?? [], [project.notes]);
  const stakeholders = project.stakeholders ?? [];

  const [text, setText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [stakeholderId, setStakeholderId] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [filterStakeholderId, setFilterStakeholderId] = useState('');

  const visible = useMemo(
    () => filterNotes(notes, { query, tag: tag || undefined, stakeholderId: filterStakeholderId || undefined }),
    [notes, query, tag, filterStakeholderId]
  );
  const tags = useMemo(() => allTags(notes), [notes]);
  const nameOf = (id?: string) => stakeholders.find(s => s.id === id)?.name;

  const add = () => {
    onAdd({ text, tags: parseTags(tagsText), stakeholderId: stakeholderId || undefined });
    setText('');
    setTagsText('');
    setStakeholderId('');
  };

  return (
    <section aria-label="Anotações do projeto" style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <header>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
          <NotebookPen size={18} color="var(--primary)" /> Anotações
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Registre o que ouviu e pensou. Quando uma anotação virar algo firme, transforme em decisão ou em história do backlog.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label htmlFor="note-new-text" style={labelStyle}>Nova anotação</label>
          <textarea id="note-new-text" value={text} onChange={e => setText(e.target.value)} style={{ ...fieldStyle, minHeight: '80px' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label htmlFor="note-new-tags" style={labelStyle}>Etiquetas</label>
            <input id="note-new-tags" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="prazo, risco" style={fieldStyle} />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label htmlFor="note-new-stakeholder" style={labelStyle}>Sobre quem</label>
            <select id="note-new-stakeholder" value={stakeholderId} onChange={e => setStakeholderId(e.target.value)} style={fieldStyle}>
              <option value="">Ninguém em particular</option>
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={add}>Adicionar anotação</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem' }}>Nenhuma anotação ainda. Escreva a primeira acima.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 240px' }}>
              <label htmlFor="note-search" style={labelStyle}>Buscar nas anotações</label>
              <input id="note-search" type="search" value={query} onChange={e => setQuery(e.target.value)} style={fieldStyle} />
            </div>
            {stakeholders.length > 0 && (
              <div style={{ flex: '1 1 180px' }}>
                <label htmlFor="note-filter-stakeholder" style={labelStyle}>Filtrar por stakeholder</label>
                <select id="note-filter-stakeholder" value={filterStakeholderId} onChange={e => setFilterStakeholderId(e.target.value)} style={fieldStyle}>
                  <option value="">Todos</option>
                  {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tags.map(t => (
                <button
                  key={t.tag}
                  type="button"
                  aria-pressed={tag === t.tag}
                  className="btn btn-secondary"
                  style={{ ...smallButton, background: tag === t.tag ? 'rgba(99, 102, 241, 0.3)' : undefined }}
                  onClick={() => setTag(tag === t.tag ? '' : t.tag)}
                >
                  {`#${t.tag} (${t.count})`}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem' }}>Nenhuma anotação encontrada com esses filtros.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visible.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  authorName={nameOf(note.stakeholderId)}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onPromoteToDecision={onPromoteToDecision}
                  onPromoteToStory={onPromoteToStory}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};
