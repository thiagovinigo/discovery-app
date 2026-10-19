import React, { useRef, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { exportService } from '../services/exportService';
import { DiscoveryProject } from '../types/discovery';
import { Sparkles, Check, AlertCircle, Key, ExternalLink, Download, Upload, Cpu, Zap } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: DiscoveryProject | null;
  onProjectImported?: (project: DiscoveryProject) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, project, onProjectImported }) => {
  const [provider, setProvider] = useState<'openai' | 'gemini'>(storageService.getAiProvider());
  const [openAiKey, setOpenAiKey] = useState(storageService.getOpenAiApiKey());
  const [openAiModel, setOpenAiModel] = useState(storageService.getOpenAiModel());
  const [geminiKey, setGeminiKey] = useState(storageService.getGeminiApiKey());
  const [geminiModel, setGeminiModel] = useState(storageService.getGeminiModel());

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(storageService.getAiProvider());
      setOpenAiKey(storageService.getOpenAiApiKey());
      setOpenAiModel(storageService.getOpenAiModel());
      setGeminiKey(storageService.getGeminiApiKey());
      setGeminiModel(storageService.getGeminiModel());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentApiKey = provider === 'openai' ? openAiKey : geminiKey;
  const currentModel = provider === 'openai' ? openAiModel : geminiModel;

  const handleBackup = () => {
    if (!project) return;
    const name = project.name.toLowerCase().replace(/\s+/g, '_');
    exportService.downloadFile(exportService.exportToJson(project), `${name}_backup.json`, 'application/json');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = storageService.importProject(await file.text());
      onProjectImported?.(imported);
      setStatusMessage({ type: 'success', text: `Projeto "${imported.name}" restaurado com sucesso.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Não foi possível importar o arquivo.' });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    const res = await geminiService.testApiKey(currentApiKey, currentModel, provider);
    setIsTesting(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleSave = () => {
    storageService.setAiProvider(provider);
    if (provider === 'openai') {
      storageService.setOpenAiApiKey(openAiKey);
      storageService.setOpenAiModel(openAiModel);
    } else {
      storageService.setGeminiApiKey(geminiKey);
      storageService.setGeminiModel(geminiModel);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-slide-down" style={{ width: '520px', maxWidth: '95vw', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="var(--accent-cyan)" />
            Configuração dos Modelos de IA
          </h3>
          <span className="badge badge-cyan" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {provider === 'openai' ? 'OpenAI GPT-4o' : 'Google Gemini'}
          </span>
        </div>

        {/* Provider Switch Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => { setProvider('openai'); setStatusMessage(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: provider === 'openai' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.2))' : 'transparent',
              border: provider === 'openai' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              color: provider === 'openai' ? '#6ee7b7' : 'var(--text-muted)'
            }}
          >
            <Zap size={14} /> OpenAI (ChatGPT)
          </button>

          <button
            type="button"
            onClick={() => { setProvider('gemini'); setStatusMessage(null); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: provider === 'gemini' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2))' : 'transparent',
              border: provider === 'gemini' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
              color: provider === 'gemini' ? '#c4b5fd' : 'var(--text-muted)'
            }}
          >
            <Sparkles size={14} /> Google Gemini
          </button>
        </div>

        {provider === 'openai' ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.4' }}>
              O Discovery ao Done utiliza os modelos da <strong>OpenAI</strong> (ex.: <code>gpt-4o-mini</code> e <code>gpt-4o</code>) para escuta ativa em tempo real, geração socrática do Mom Test, mapas mentais e decomposição do Backlog INVEST.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Key size={14} /> Chave de API da OpenAI (sk-...)
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  Obter chave OpenAI <ExternalLink size={11} />
                </a>
              </label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                A chave fica salva em texto no localStorage deste navegador e é enviada apenas à OpenAI. Não use em computadores compartilhados. Sem chave, o app usa a análise offline.
              </span>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Modelo OpenAI Selecionado
              </label>
              <select
                value={openAiModel}
                onChange={(e) => setOpenAiModel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recomendado: ultrarrápido, ideal para escuta ao vivo)</option>
                <option value="gpt-4o">gpt-4o (Flagship: alta inteligência para PRDs e INVEST complexos)</option>
                <option value="o3-mini">o3-mini (Raciocínio lógico e arquitetura técnica profunda)</option>
                <option value="gpt-4.5-preview">gpt-4.5-preview (Raciocínio e contexto expandido)</option>
                {!['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.5-preview'].includes(openAiModel) && (
                  <option value={openAiModel}>{openAiModel} (configurado anteriormente)</option>
                )}
              </select>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.4' }}>
              Utiliza os modelos da <strong>Google Gemini</strong> para processamento multimodal e síntese de reuniões.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Key size={14} /> Chave de API do Google Gemini
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  Obter chave Gemini <ExternalLink size={11} />
                </a>
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Modelo Google Gemini
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido e preciso)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raciocínio complexo)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Baixa latência)</option>
              </select>
            </div>
          </>
        )}

        {/* Backup / Export Section */}
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Backup do Projeto
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.76rem', gap: '5px' }} onClick={handleBackup} disabled={!project}>
              <Download size={13} /> Exportar JSON
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.76rem', gap: '5px' }} onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} /> Importar JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleRestore} style={{ display: 'none' }} />
          </div>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
              color: statusMessage.type === 'success' ? '#6ee7b7' : '#fda4af'
            }}
          >
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !currentApiKey}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            {isTesting ? 'Testando Conexão...' : 'Testar Conexão com IA'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem' }}
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
