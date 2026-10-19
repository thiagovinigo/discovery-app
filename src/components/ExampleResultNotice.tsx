import React from 'react';
import { Info } from 'lucide-react';

/** Aviso para quando o resultado de um agente é um texto de exemplo, e não uma resposta da IA. */
export const ExampleResultNotice: React.FC = () => (
  <div
    role="status"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '8px 10px',
      marginBottom: '10px',
      borderRadius: '8px',
      fontSize: '0.74rem',
      lineHeight: 1.4,
      color: '#fcd34d',
      background: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.35)'
    }}
  >
    <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
    <span>
      <strong>Exemplo ilustrativo.</strong> A IA não respondeu (sem chave de API ou falha na chamada), então este texto é
      fixo e não foi gerado a partir da sua entrada. Configure uma chave em Configurações para gerar o seu.
    </span>
  </div>
);
