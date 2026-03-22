import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
}

interface Props {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function Toast({ messages, onDismiss }: Props) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(80px + env(safe-area-inset-bottom))',
      right: 16,
      left: 16,
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 2500);
    const t2 = setTimeout(() => onDismiss(message.id), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [message.id, onDismiss]);

  return (
    <div style={{
      padding: '10px 18px',
      borderRadius: 999,
      background: 'linear-gradient(135deg,#f97316,#ec4899)',
      color: '#fff',
      fontFamily: 'Nunito, sans-serif',
      fontWeight: 800,
      fontSize: 13,
      boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      transition: 'opacity 0.4s, transform 0.4s',
      pointerEvents: 'auto',
      maxWidth: 'min(340px, 100%)',
      wordBreak: 'break-word',
    }}>
      {message.text}
    </div>
  );
}
