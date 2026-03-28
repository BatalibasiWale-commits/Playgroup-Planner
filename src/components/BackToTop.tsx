import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed',
        bottom: 120,
        right: 24,
        zIndex: 400,
        padding: '10px 16px',
        borderRadius: 999,
        background: 'linear-gradient(135deg,#f97316,#ec4899)',
        color: '#fff',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 800,
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(249,115,22,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      title="Back to top"
    >
      ↑ Top
    </button>
  );
}
