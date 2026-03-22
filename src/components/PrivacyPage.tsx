interface Props {
  onBack: () => void;
}

const SECTIONS = [
  {
    title: 'What we collect',
    content: [
      'Email address (if you create an account)',
      'Playgroup profile details (name, group size, age range)',
      'Session data (activities, plans, favourites, supplies)',
      'Usage data for improving the service',
    ],
    isList: true,
  },
  {
    title: 'How we use it',
    content: [
      'To power your personalised experience',
      'To sync data across your devices',
      'To send account-related emails (e.g. password resets)',
    ],
    isList: true,
  },
  {
    title: 'What we never do',
    content: ['We never sell or share your personal data with third parties for marketing or any other purpose.'],
    isList: false,
  },
  {
    title: 'Data security',
    content: ['Your data is stored securely via Supabase with row-level security. This means only you can access your own data.'],
    isList: false,
  },
  {
    title: 'Deleting your data',
    content: ['You can delete your account and all associated data at any time by emailing hello@playgroupplanner.com.au. We will process your request within 7 days.'],
    isList: false,
  },
  {
    title: 'Cookies',
    content: ['We use minimal cookies for authentication purposes only. We do not use tracking or advertising cookies.'],
    isList: false,
  },
];

export default function PrivacyPage({ onBack }: Props) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px', fontFamily: 'Nunito, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 700,
          color: '#f97316', marginBottom: 24, padding: 0,
        }}
      >
        ← Back
      </button>

      <div style={{
        background: '#fff',
        borderRadius: 28,
        padding: '36px 32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
        border: '1.5px solid rgba(251,146,60,0.18)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{
          fontFamily: 'Nunito, sans-serif',
          fontSize: 'clamp(24px,4.5vw,34px)',
          fontWeight: 900,
          margin: '0 0 8px',
          background: 'linear-gradient(135deg,#f97316,#ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#9ca3af', margin: '0 0 32px' }}>
          Last updated: March 2026
        </p>

        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 600, color: '#4b5563', margin: '0 0 32px', lineHeight: 1.7 }}>
          Your privacy matters to us. This policy explains what data Playgroup Planner collects, how we use it, and how we keep it safe.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {SECTIONS.map(({ title, content, isList }, i) => (
            <div key={i}>
              <h2 style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 16,
                fontWeight: 900,
                color: '#f97316',
                margin: '0 0 10px',
              }}>
                {title}
              </h2>
              {isList ? (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {(content as string[]).map((item, j) => (
                    <li key={j} style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: '#4b5563', lineHeight: 1.7, marginBottom: 4 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, lineHeight: 1.7 }}>
                  {content[0]}
                </p>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 32,
          padding: '18px 20px',
          background: 'linear-gradient(135deg,#fff7ed,#fdf2f8)',
          borderRadius: 16,
          border: '1.5px solid #fed7aa',
        }}>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>
            Questions about your privacy? Email us at{' '}
            <a href="mailto:hello@playgroupplanner.com.au" style={{ color: '#f97316', textDecoration: 'none' }}>
              hello@playgroupplanner.com.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
