import React from 'react';

export interface Notice {
  type: 'error' | 'info' | 'success';
  text: string;
}

interface NoticeToastProps {
  notice: Notice | null;
  onDismiss: () => void;
}

const COLORS = {
  error: { background: 'rgba(244, 63, 94, 0.2)', border: 'rgba(244, 63, 94, 0.5)', text: '#fda4af' },
  success: { background: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.5)', text: '#6ee7b7' },
  info: { background: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)', text: '#c7d2fe' }
} as const;

/** Aviso temporário no canto da tela; um clique o dispensa. */
export const NoticeToast: React.FC<NoticeToastProps> = ({ notice, onDismiss }) => {
  if (!notice) return null;
  const color = COLORS[notice.type];
  return (
    <div
      role="alert"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '420px',
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '0.82rem',
        cursor: 'pointer',
        zIndex: 1100,
        backdropFilter: 'blur(10px)',
        background: color.background,
        border: `1px solid ${color.border}`,
        color: color.text
      }}
    >
      {notice.text}
    </div>
  );
};
