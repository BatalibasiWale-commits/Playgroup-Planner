import { useState, useEffect, useRef } from 'react';
import type { AgeGroup, Profile } from '../types';
import { storage } from '../utils/storage';

interface Props {
  onProfileChange: (profile: Profile) => void;
  onSuppliesChange: (supplies: string[]) => void;
  userEmail?: string | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  showNewUserWelcome?: boolean;
  onStartPlanning?: () => void;
  onToast?: (msg: string) => void;
}

const AGE_GROUPS: AgeGroup[] = ['0-1', '1-2', '2-3', '3-5', '0-5'];
const AGE_LABELS: Record<AgeGroup, string> = {
  '0-1': '0–1 yrs',
  '1-2': '1–2 yrs',
  '2-3': '2–3 yrs',
  '3-5': '3–5 yrs',
  '0-5': '🌟 All Ages (0–5)',
};

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 28,
  boxShadow:
    '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07), 0 32px 80px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1), inset 0 0 0 1.5px rgba(251,146,60,0.14)',
  padding: 'clamp(20px, 5vw, 32px)',
};

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Nunito, sans-serif',
  fontSize: 12,
  fontWeight: 800,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 7,
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Nunito, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  color: '#374151',
  borderRadius: 14,
  border: '2px solid #e5e7eb',
  background: '#fafaf9',
  padding: '12px 14px',
  outline: 'none',
  minHeight: 48,
};

const stepBtn: React.CSSProperties = {
  width: 38,
  height: 42,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 900,
  color: '#f97316',
  fontFamily: 'Nunito, sans-serif',
  lineHeight: 1,
};

export default function ProfilePage({ onProfileChange, onSuppliesChange, showNewUserWelcome, onStartPlanning, onToast }: Props) {
  const [playgroupName, setPlaygroupName] = useState(() => storage.getProfile().playgroupName);
  const [hostName, setHostName] = useState(() => storage.getProfile().hostName);
  const [ageRange, setAgeRange] = useState<AgeGroup | ''>(() => storage.getProfile().ageRange);
  const [groupSize, setGroupSize] = useState(() => storage.getProfile().groupSize || 8);
  const [playgroupNeuro, setPlaygroupNeuro] = useState(() => storage.getProfile().neuroAdaptations ?? false);
  const [supplies, setSupplies] = useState<string[]>(() => storage.getSupplies());
  const [newSupply, setNewSupply] = useState('');
  const mountedRef = useRef(false);

  // Auto-save profile whenever any field changes and notify App
  useEffect(() => {
    const profile: Profile = { playgroupName, hostName, ageRange, groupSize, neuroAdaptations: playgroupNeuro };
    storage.saveProfile(profile);
    onProfileChange(profile);
    if (mountedRef.current) {
      onToast?.('Profile updated! ✨');
    } else {
      mountedRef.current = true;
    }
  }, [playgroupName, hostName, ageRange, groupSize]); // eslint-disable-line react-hooks/exhaustive-deps

  function addSupply() {
    const existing = supplies.map(s => s.toLowerCase());
    const newItems = newSupply
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !existing.includes(s.toLowerCase()));
    if (newItems.length === 0) return;
    const updated = [...supplies, ...newItems];
    setSupplies(updated);
    storage.saveSupplies(updated);
    onSuppliesChange(updated);
    setNewSupply('');
  }

  function removeSupply(item: string) {
    const updated = supplies.filter(s => s !== item);
    setSupplies(updated);
    storage.saveSupplies(updated);
    onSuppliesChange(updated);
  }

  return (
    <div style={{ position: 'relative', padding: 'clamp(20px, 4vw, 32px) clamp(16px, 3vw, 24px) 80px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* New user welcome banner */}
        {showNewUserWelcome && (
          <div style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%)',
            border: '2px solid #fed7aa',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>🎨</span>
            <div>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 16, fontWeight: 900, color: '#c2410c', margin: '0 0 4px' }}>
                Welcome! Let's get you set up.
              </p>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#9a3412', margin: 0, lineHeight: 1.5 }}>
                Fill in your playgroup details so every session you plan is personalised from the start 🌟
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h2 style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            lineHeight: 1.1,
          }}>
            Your Profile
          </h2>
          <p style={{ fontFamily: 'Nunito, sans-serif', color: '#9ca3af', fontSize: 14, fontWeight: 600, margin: '6px 0 0' }}>
            Details saved here auto-fill into every session you plan ✨
          </p>
        </div>

        {/* ── Playgroup Details Card ── */}
        <div style={card}>
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontSize: 17, fontWeight: 900, color: '#374151', margin: '0 0 20px' }}>
            👤 Playgroup Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={label}>Playgroup Name</label>
              <input
                type="text"
                value={playgroupName}
                onChange={e => setPlaygroupName(e.target.value)}
                placeholder="e.g. Sunshine Playgroup"
                style={input}
              />
            </div>
            <div>
              <label style={label}>Your Name</label>
              <input
                type="text"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                placeholder="e.g. Sarah"
                style={input}
              />
            </div>
          </div>

          {/* Typical Age Range */}
          <div style={{ marginTop: 18 }}>
            <label style={label}>👶 Typical Age Range</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag}
                  onClick={() => setAgeRange(ageRange === ag ? '' : ag)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'Nunito, sans-serif',
                    cursor: 'pointer',
                    border: '2px solid',
                    transition: 'all 0.15s',
                    minHeight: 40,
                    ...(ageRange === ag
                      ? {
                          background: ag === '0-5'
                            ? 'linear-gradient(135deg,#7c3aed,#a21caf)'
                            : 'linear-gradient(135deg,#f97316,#ec4899)',
                          borderColor: 'transparent',
                          color: '#fff',
                          boxShadow: ag === '0-5'
                            ? '0 4px 14px rgba(124,58,237,0.38)'
                            : '0 4px 14px rgba(249,115,22,0.35)',
                          transform: 'scale(1.05)',
                        }
                      : ag === '0-5'
                      ? {
                          background: 'linear-gradient(135deg,#fdf4ff,#ede9fe)',
                          borderColor: '#c4b5fd',
                          color: '#7c3aed',
                        }
                      : {
                          background: '#fff',
                          borderColor: '#e5e7eb',
                          color: '#6b7280',
                        }),
                  }}
                >
                  {AGE_LABELS[ag]}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#d1d5db', marginTop: 7, marginBottom: 0 }}>
              This pre-selects the age group in the session planner
            </p>
          </div>

          {/* Group Size */}
          <div style={{ marginTop: 18 }}>
            <label style={label}>👧 Typical Group Size</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#fafaf9', border: '2px solid #e5e7eb',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <button onClick={() => setGroupSize(g => Math.max(1, g - 1))} style={stepBtn}>−</button>
                <span style={{
                  minWidth: 40, textAlign: 'center',
                  fontWeight: 900, fontFamily: 'Nunito, sans-serif',
                  fontSize: 16, color: '#374151',
                }}>
                  {groupSize}
                </span>
                <button onClick={() => setGroupSize(g => Math.min(50, g + 1))} style={stepBtn}>+</button>
              </div>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>
                children
              </span>
            </div>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#d1d5db', marginTop: 7, marginBottom: 0 }}>
              This pre-fills the attendance field in the session planner
            </p>
          </div>

          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c4b5a5', marginTop: 20, marginBottom: 0 }}>
            ✓ All changes save automatically
          </p>
        </div>

        {/* ── Session Preferences Card ── */}
        <div style={card}>
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontSize: 17, fontWeight: 900, color: '#374151', margin: '0 0 4px' }}>
            🧠 Session Preferences
          </h3>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>
            These settings will auto-apply every time you plan a new session.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 18px',
            borderRadius: 16,
            background: !!playgroupNeuro
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
              : 'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)',
            border: `1.5px solid ${playgroupNeuro ? '#86efac' : '#e5e7eb'}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14, color: '#374151' }}>
                  Always include neurodiversity-friendly adaptations
                </span>
              </div>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#9ca3af', margin: 0 }}>
                Pre-selects the toggle on every new Plan Session — practical tips for sensory, ADHD, autism, fine motor &amp; more
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newVal = !playgroupNeuro;
                setPlaygroupNeuro(newVal);
                const updated: Profile = { playgroupName, hostName, ageRange, groupSize, neuroAdaptations: newVal };
                storage.saveProfile(updated);
                onProfileChange(updated);
                onToast?.(newVal ? 'Neuro adaptations turned on ✨' : 'Neuro adaptations turned off');
              }}
              role="switch"
              aria-checked={!!playgroupNeuro}
              style={{
                flexShrink: 0,
                width: 48,
                height: 26,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: playgroupNeuro ? '#22c55e' : '#d1d5db',
                position: 'relative',
                transition: 'background 0.2s',
                padding: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: playgroupNeuro ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c4b5a5', marginTop: 16, marginBottom: 0 }}>
            ✓ All changes save automatically
          </p>
        </div>

        {/* ── Supplies Inventory Card ── */}
        <div style={card}>
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontSize: 17, fontWeight: 900, color: '#374151', margin: '0 0 4px' }}>
            🎨 Supplies Inventory
          </h3>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>
            These automatically pre-fill the Materials field every time you plan a session.
          </p>

          {/* Add input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              type="text"
              value={newSupply}
              onChange={e => setNewSupply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSupply()}
              placeholder="e.g. paint brushes, play dough, sand tray..."
              style={{ ...input, flex: 1 }}
            />
            <button
              onClick={addSupply}
              style={{
                padding: '12px 22px',
                borderRadius: 14,
                background: 'linear-gradient(135deg,#f97316,#ec4899)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                whiteSpace: 'nowrap',
                minHeight: 48,
              }}
            >
              + Add
            </button>
          </div>

          {/* Supply tags */}
          {supplies.length === 0 ? (
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>
              No supplies yet — add items above and they'll appear here as tags.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {supplies.map(item => (
                  <span
                    key={item}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px 6px 14px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg,#fff7ed,#fef3c7)',
                      border: '1.5px solid #fed7aa',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#c2410c',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    {item}
                    <button
                      onClick={() => removeSupply(item)}
                      title={`Remove ${item}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fb923c',
                        fontWeight: 900,
                        fontSize: 15,
                        lineHeight: 1,
                        padding: '0 0 0 2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={() => { setSupplies([]); storage.saveSupplies([]); onSuppliesChange([]); }}
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: '#d1d5db',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                ↺ Clear all supplies
              </button>
            </>
          )}
        </div>

        {/* Start Planning button */}
        {onStartPlanning && (
          <button
            onClick={onStartPlanning}
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
              color: '#fff',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 18,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(249,115,22,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(249,115,22,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(249,115,22,0.4)';
            }}
          >
            Let's Start Planning! ✨
          </button>
        )}

      </div>
    </div>
  );
}
