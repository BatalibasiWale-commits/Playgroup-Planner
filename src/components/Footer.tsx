interface Props {
  onNavigate: (page: 'about' | 'privacy') => void;
}

export default function Footer({ onNavigate }: Props) {
  return (
    <footer style={{
      background: 'linear-gradient(135deg,#fff7ed,#fdf2f8)',
      borderTop: '1px solid #fed7aa',
      padding: '24px 20px',
      textAlign: 'center',
      fontFamily: 'Nunito, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('about')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#f97316' }}>
            About
          </button>
          <button onClick={() => onNavigate('privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#f97316' }}>
            Privacy Policy
          </button>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', margin: '0 0 6px' }}>
          Made with ❤️ for playgroup communities across Australia
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db', margin: 0 }}>
          © 2026 Playgroup Planner
        </p>
      </div>
    </footer>
  );
}
