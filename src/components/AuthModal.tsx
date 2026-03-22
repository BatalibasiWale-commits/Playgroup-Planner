import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tab = 'login' | 'signup' | 'forgot';

interface Props {
  onClose: () => void;
  onAuthSuccess?: (isNewUser: boolean) => void;
  initialTab?: 'login' | 'signup';
}

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 28,
  boxShadow:
    '0 8px 32px rgba(0,0,0,0.10), 0 32px 80px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1), inset 0 0 0 1.5px rgba(251,146,60,0.14)',
  padding: '32px 24px 28px',
  maxWidth: 'min(500px, 100%)',
  width: '100%',
  fontFamily: 'Nunito, sans-serif',
  animation: 'auth-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Nunito, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  color: '#374151',
  borderRadius: 12,
  border: '2px solid #e5e7eb',
  background: '#fafaf9',
  padding: '12px 14px',
  outline: 'none',
  marginBottom: 12,
  minHeight: 48,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Nunito, sans-serif',
  fontSize: 12,
  fontWeight: 800,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 5,
};

export default function AuthModal({ onClose, onAuthSuccess, initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
    setSuccess('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase is not configured.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onAuthSuccess?.(false);
    onClose();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase is not configured.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data.session) {
      // Email confirmation disabled — immediately logged in
      onAuthSuccess?.(true);
      onClose();
    } else {
      // Email confirmation required
      setSuccess('Account created! Check your email to confirm, then log in here.');
      switchTab('login');
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase is not configured.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Password reset email sent! Check your inbox.');
  }

  const passwordField = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    visible: boolean,
    onToggle: () => void,
    extraStyle?: React.CSSProperties,
  ) => (
    <div style={{ position: 'relative', marginBottom: extraStyle?.marginBottom ?? 12 }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{ ...inputStyle, marginBottom: 0, paddingRight: 40, ...(extraStyle ? { ...extraStyle, marginBottom: 0 } : {}) }}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
        }}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
    </div>
  );

  const submitBtn = (label: string) => (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 14,
        background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #f97316, #ec4899)',
        color: loading ? '#9ca3af' : '#fff',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 900,
        fontSize: 15,
        boxShadow: loading ? 'none' : '0 4px 14px rgba(249,115,22,0.3)',
      }}
    >
      {loading ? '…' : label}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 16,
        paddingTop: 'max(40px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        overflowY: 'auto',
      }}
    >
      <style>{`
        @keyframes auth-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
      `}</style>

      <div style={card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 22,
                fontWeight: 900,
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
              }}
            >
              {tab === 'forgot' ? 'Reset Password' : 'Your Account'}
            </h2>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9ca3af', fontWeight: 600, margin: '4px 0 0' }}>
              Sync your data across devices
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1, padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        {tab !== 'forgot' && (
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: 13,
                  transition: 'all 0.15s',
                  ...(tab === t
                    ? { background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }
                    : { background: 'none', color: '#9ca3af' }),
                }}
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Feedback messages */}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Log In */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            <label style={labelStyle}>Password</label>
            {passwordField(password, setPassword, '••••••••', showPassword, () => setShowPassword(v => !v), { marginBottom: 6 })}
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button type="button" onClick={() => switchTab('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#f97316', padding: 0 }}>
                Forgot password?
              </button>
            </div>
            {submitBtn('Log In')}
          </form>
        )}

        {/* Sign Up */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            <label style={labelStyle}>Password</label>
            {passwordField(password, setPassword, 'At least 6 characters', showPassword, () => setShowPassword(v => !v))}
            <label style={labelStyle}>Confirm Password</label>
            {passwordField(confirmPassword, setConfirmPassword, 'Repeat password', showConfirmPassword, () => setShowConfirmPassword(v => !v), { marginBottom: 20 })}
            {submitBtn('Create Account')}
          </form>
        )}

        {/* Forgot Password */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 16 }}>
              Enter your email and we'll send you a reset link.
            </p>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ ...inputStyle, marginBottom: 20 }} />
            {submitBtn('Send Reset Email')}
            <button
              type="button"
              onClick={() => switchTab('login')}
              style={{ display: 'block', width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 14, background: 'none', color: '#9ca3af', border: '2px solid #e5e7eb', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13 }}
            >
              ← Back to Log In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
