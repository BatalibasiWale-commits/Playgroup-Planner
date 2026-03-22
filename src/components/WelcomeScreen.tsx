interface Props {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onSkip: () => void;
}

export default function WelcomeScreen({ onSignIn, onCreateAccount, onSkip }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: 'rgba(255,247,237,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 0.3s ease',
        overflowY: 'auto',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes welcome-in {
          from { opacity: 0; transform: scale(0.90) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 'clamp(20px, 5vw, 32px)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.10), 0 32px 80px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1), inset 0 0 0 1.5px rgba(251,146,60,0.16)',
          padding: 'clamp(24px, 6vw, 48px) clamp(20px, 6vw, 40px)',
          maxWidth: 'min(520px, 100%)',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Nunito, sans-serif',
          animation: 'welcome-in 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ fontSize: 'clamp(44px, 12vw, 64px)', lineHeight: 1, marginBottom: 'clamp(10px, 3vw, 16px)' }}>🌟</div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 14px',
            lineHeight: 1.15,
          }}
        >
          Welcome to Playgroup Planner!
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: '#6b7280',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}
        >
          Sign in to save your sessions, supplies and profile —{' '}
          <span style={{ color: '#f97316', fontWeight: 700 }}>or jump straight in!</span>
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {['✨ Instant activity ideas', '📅 Weekly planner', '🎨 Supplies tracker', '☁️ Sync across devices'].map(
            (f) => (
              <span
                key={f}
                style={{
                  display: 'inline-block',
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg,#fff7ed,#fef3c7)',
                  border: '1.5px solid #fed7aa',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#c2410c',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {f}
              </span>
            ),
          )}
        </div>

        {/* Primary CTA: Create Account */}
        <button
          onClick={onCreateAccount}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 24px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
            color: '#fff',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
            marginBottom: 10,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(249,115,22,0.45)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(249,115,22,0.35)';
          }}
        >
          Create Account — it's free
        </button>

        {/* Secondary CTA: Sign In */}
        <button
          onClick={onSignIn}
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 24px',
            borderRadius: 16,
            background: '#fff',
            color: '#f97316',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: 15,
            border: '2px solid #fed7aa',
            cursor: 'pointer',
            marginBottom: 20,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#f97316';
            (e.currentTarget as HTMLButtonElement).style.background = '#fff7ed';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#fed7aa';
            (e.currentTarget as HTMLButtonElement).style.background = '#fff';
          }}
        >
          Sign In
        </button>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg,transparent,#e5e7eb,transparent)',
            marginBottom: 16,
          }}
        />

        {/* Skip link */}
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            color: '#9ca3af',
            padding: 0,
            textDecoration: 'underline',
            textDecorationColor: '#d1d5db',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
        >
          Skip for now — just let me plan a session
        </button>
      </div>
    </div>
  );
}
