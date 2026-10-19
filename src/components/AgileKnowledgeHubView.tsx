import React, { useState } from 'react';
import { AGILE_KNOWLEDGE_BASE, AgileMethodItem } from '../data/agileKnowledgeData';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
  Target,
  Users,
  Bot,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface AgileKnowledgeHubViewProps {
  onApplyPromptToProject?: (promptText: string) => void;
}

export const AgileKnowledgeHubView: React.FC<AgileKnowledgeHubViewProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'scale' | 'discovery' | 'facilitation' | 'ai_superpowers'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(AGILE_KNOWLEDGE_BASE[0].id);

  const handleCopyPrompt = (id: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = AGILE_KNOWLEDGE_BASE.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.creatorOrOrigin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.coreConcepts.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat: AgileMethodItem['category']) => {
    switch (cat) {
      case 'scale':
        return <span className="badge badge-primary">🌐 ESCALA ÁGIL</span>;
      case 'discovery':
        return <span className="badge badge-cyan">🎯 DISCOVERY & DELIVERY</span>;
      case 'facilitation':
        return <span className="badge badge-amber">🧙‍♂️ FACILITAÇÃO & RITUAIS</span>;
      case 'ai_superpowers':
        return <span className="badge badge-emerald">🤖 AI SUPERPOWERS</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)'
          }}>
            <BookOpen size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Acervo Ágil & IA: Frameworks, Escala e Métodos</h2>
              <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>Biblioteca Integrada</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Inspirado no acervo <strong>agile-coach-ai</strong>: Métodos de Escala (SAFe, Flight Levels, LeSS), Discovery (Teresa Torres, Caroli, PBB) e Prompts de IA
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.9)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', minWidth: '280px' }}>
          <Search size={15} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Buscar método, autor ou técnica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: selectedCategory === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Todos ({AGILE_KNOWLEDGE_BASE.length})
        </button>

        <button
          onClick={() => setSelectedCategory('scale')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: selectedCategory === 'scale' ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCategory === 'scale' ? '#a5b4fc' : 'var(--text-muted)',
            border: selectedCategory === 'scale' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Layers size={14} />
          Escala Ágil (SAFe, Flight Levels, LeSS, Spotify)
        </button>

        <button
          onClick={() => setSelectedCategory('discovery')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: selectedCategory === 'discovery' ? 'var(--accent-cyan-light)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCategory === 'discovery' ? '#67e8f9' : 'var(--text-muted)',
            border: selectedCategory === 'discovery' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Target size={14} />
          Discovery & Delivery (Continuous Discovery, PBB, Inception, Shape Up)
        </button>

        <button
          onClick={() => setSelectedCategory('facilitation')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: selectedCategory === 'facilitation' ? 'var(--accent-amber-light)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCategory === 'facilitation' ? '#fcd34d' : 'var(--text-muted)',
            border: selectedCategory === 'facilitation' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Users size={14} />
          Facilitação & Rituais (Liberating Structures, WSJF, Lean Coffee)
        </button>

        <button
          onClick={() => setSelectedCategory('ai_superpowers')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: selectedCategory === 'ai_superpowers' ? 'var(--accent-emerald-light)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCategory === 'ai_superpowers' ? '#6ee7b7' : 'var(--text-muted)',
            border: selectedCategory === 'ai_superpowers' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Bot size={14} />
          AI Superpowers (Story Slicer, Retro Coach, Dependency Hunter)
        </button>
      </div>

      {/* Main Grid of Methods */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px' }}>
        {filteredItems.map(item => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="glass-card animate-slide-down"
              style={{
                padding: '16px 20px',
                borderLeft: `4px solid ${
                  item.category === 'scale'
                    ? 'var(--primary)'
                    : item.category === 'discovery'
                    ? 'var(--accent-cyan)'
                    : item.category === 'facilitation'
                    ? 'var(--accent-amber)'
                    : 'var(--accent-emerald)'
                }`
              }}
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexWrap: 'wrap', gap: '8px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.title}</h3>
                      {getCategoryBadge(item.category)}
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{item.badge}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Criador / Origem: <strong>{item.creatorOrOrigin}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {isExpanded ? 'Recolher Detalhes ▲' : 'Ver Guia Completo ▼'}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '10px', lineHeight: '1.45' }}>
                {item.summary}
              </p>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Quando usar */}
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)', fontSize: '0.82rem' }}>
                    <strong style={{ color: '#fcd34d' }}>🚨 Quando utilizar este método:</strong> {item.whenToUse}
                  </div>

                  {/* Conceitos Fundamentais */}
                  <div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lightbulb size={15} /> Conceitos Fundamentais
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                      {item.coreConcepts.map((concept, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem' }}>
                          <CheckCircle2 size={14} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{concept}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passo a Passo */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px' }}>
                      🛠️ Passo a Passo de Execução
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.stepByStep.map((step, idx) => (
                        <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exemplo Prático Real */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-emerald)', fontSize: '0.82rem' }}>
                    <strong style={{ color: '#6ee7b7' }}>✨ Exemplo Prático de Campo:</strong> {item.practicalExample}
                  </div>

                  {/* Prompt de IA Copilot */}
                  {item.aiPromptTemplate && (
                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={14} color="var(--primary)" />
                          Prompt de IA Especialista para este Método
                        </span>
                        <button
                          onClick={() => handleCopyPrompt(item.id, item.aiPromptTemplate!)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
                        >
                          {copiedId === item.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                          {copiedId === item.id ? 'Prompt Copiado!' : 'Copiar Prompt'}
                        </button>
                      </div>
                      <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {item.aiPromptTemplate}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
