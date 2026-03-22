interface Props {
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Is my data safe?',
    a: 'Absolutely. Your data is stored securely via Supabase and is never sold or shared with anyone. Only you can access your account.',
  },
  {
    q: 'What age groups does this work for?',
    a: 'Playgroup Planner is designed for children aged 0–5 years. You can filter activities by specific age brackets, or generate sessions that work across all ages at once.',
  },
  {
    q: 'Do I need an account?',
    a: 'No! You can use Playgroup Planner as a guest and everything saves locally on your device. Create a free account to sync your data across devices.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: "Playgroup Planner is currently completely free to use. When paid plans are introduced, you'll be able to manage your subscription easily from your account settings.",
  },
];

export default function AboutPage({ onBack }: Props) {
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

      {/* Header */}
      <div style={{
        background: '#fff',
        borderRadius: 28,
        padding: '36px 32px',
        marginBottom: 24,
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
        border: '1.5px solid rgba(251,146,60,0.18)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌟</div>
        <h1 style={{
          fontFamily: 'Nunito, sans-serif',
          fontSize: 'clamp(28px,5vw,38px)',
          fontWeight: 900,
          margin: '0 0 20px',
          background: 'linear-gradient(135deg,#f97316,#ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          About Playgroup Planner
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            'Playgroup Planner is a free tool built for playgroup hosts, childcare workers, and early childhood educators who want to spend less time planning and more time with the kids.',
            'Using AI, it generates a full session of 15 activities in seconds — tailored to your group\'s age range, the weather, your available supplies, and your weekly theme.',
            'Every activity comes with step-by-step instructions, materials lists, developmental benefits, and age adaptations — so you\'re always prepared.',
            'Your session plans, activity library, and supplies inventory are saved to your account so you can access them from any device.',
          ].map((text, i) => (
            <p key={i} style={{ fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 600, color: '#4b5563', margin: 0, lineHeight: 1.7 }}>
              {text}
            </p>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{
        background: '#fff',
        borderRadius: 28,
        padding: '36px 32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
        border: '1.5px solid rgba(251,146,60,0.18)',
      }}>
        <h2 style={{
          fontFamily: 'Nunito, sans-serif',
          fontSize: 22,
          fontWeight: 900,
          color: '#f97316',
          margin: '0 0 24px',
        }}>
          ❓ Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg,#fff7ed,#fdf2f8)',
              borderRadius: 16,
              padding: '18px 20px',
              border: '1.5px solid #fed7aa',
            }}>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 900, color: '#374151', margin: '0 0 8px' }}>
                {q}
              </p>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
