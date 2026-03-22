import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  userEmail?: string | null;
}

export default function FeedbackModal({ userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    if (supabase) {
      await supabase.from('feedback').insert({
        message: text.trim(),
        name: name.trim() || null,
        email: userEmail || null,
        created_at: new Date().toISOString(),
      });
    }
    setSending(false);
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setText(''); setName(''); }, 2000);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 72,
          right: 20,
          zIndex: 390,
          padding: '8px 16px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.95)',
          color: '#f97316',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 800,
          fontSize: 12,
          border: '2px solid #fed7aa',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(4px)',
        }}
      >
        💬 Feedback
      </button>

      {/* Modal */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 450,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 24, padding: '32px 28px',
            maxWidth: 400, width: '100%', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#374151' }}>Thanks for your feedback!</p>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>We really appreciate it 💛</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#374151', margin: '0 0 6px' }}>💬 Share your feedback</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>We'd love to hear what you think!</p>

                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah"
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: '#374151', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fafaf9', padding: '10px 14px', outline: 'none', marginBottom: 16 }}
                />

                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Your feedback</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Tell us what you love, what's missing, or any ideas you have..."
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: '#374151', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fafaf9', padding: '10px 14px', outline: 'none', resize: 'vertical', marginBottom: 20 }}
                />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14,
                      background: sending || !text.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#f97316,#ec4899)',
                      color: sending || !text.trim() ? '#9ca3af' : '#fff',
                      fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 14,
                      border: 'none', cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending ? 'Sending…' : 'Send Feedback ✨'}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{ padding: '12px 20px', borderRadius: 14, background: 'none', border: '2px solid #e5e7eb', color: '#9ca3af', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
