import { useState, useEffect, useRef, useMemo } from 'react';
import type { Activity, AgeGroup, FavouriteSession, HistoryEntry, NeuroAdaptations, Profile } from '../types';
import { ACTIVITY_TYPE_CONFIG, AGE_GROUP_CONFIG } from '../types';
import { generateActivities } from '../utils/api';
import { getPastActivityTitles, saveActivityTitles } from '../utils/activityHistory';
import { storage } from '../utils/storage';
import PhotoModal from './PhotoModal';
import './ActivityGenerator.css';

interface Props {
  profile: Profile;
  supplies: string[];
  history: HistoryEntry[];
  onSaveActivities: (activities: Activity[]) => void;
  onGoToLibrary: () => void;
  onGoToHistory: () => void;
  onGoToProfile: () => void;
  onSaveFavourite: (session: FavouriteSession) => void;
  preloadSession: FavouriteSession | null;
  onPreloadConsumed: () => void;
  onToast?: (msg: string) => void;
  onNeuroChange?: (value: boolean) => void;
  userId?: string;
}

const AGE_GROUPS: AgeGroup[] = ['0-1', '1-2', '2-3', '3-5', '0-5'];
const DURATIONS = [30, 45, 60, 90, 120];

const WEATHER_OPTIONS = [
  { value: 'sunny',  label: 'Sunny',  emoji: '☀️' },
  { value: 'cloudy', label: 'Cloudy', emoji: '⛅' },
  { value: 'rainy',  label: 'Rainy',  emoji: '🌧️' },
  { value: 'hot',    label: 'Hot',    emoji: '🔥' },
  { value: 'cold',   label: 'Cold',   emoji: '❄️' },
];

const LOADING_MESSAGES = [
  { text: 'Gathering ideas for your little ones...', emoji: '🎨' },
  { text: 'Thinking about what they\'ll love...', emoji: '💭' },
  { text: 'Building your session plan...', emoji: '🌟' },
  { text: 'Adding some creative touches...', emoji: '✨' },
  { text: 'Making it magical...', emoji: '🪄' },
  { text: 'Almost ready...', emoji: '🎉' },
];

const AGE_LABELS: Record<AgeGroup, string> = {
  '0-1': '0–1 yrs',
  '1-2': '1–2 yrs',
  '2-3': '2–3 yrs',
  '3-5': '3–5 yrs',
  '0-5': '🌟 All Ages (0–5)',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActivityGenerator({
  profile,
  supplies,
  history,
  onSaveActivities,
  onGoToLibrary,
  onGoToHistory,
  onGoToProfile,
  onSaveFavourite,
  preloadSession,
  onPreloadConsumed,
  onToast,
  onNeuroChange,
  userId,
}: Props) {
  // ── Restore persisted session once (runs in useState initialisers, not effects) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _saved = useMemo(() => storage.getCurrentSession(), []);

  // ── Form state ────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => _saved?.theme ?? '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(() => (_saved?.ageGroup as AgeGroup) || profile.ageRange || '2-3');
  const [materials, setMaterials] = useState(() => _saved?.materials ?? supplies.join(', '));
  const prevSuppliesRef = useRef<string[]>(supplies);

  // Sync new supplies into the materials field as they are added in Profile
  useEffect(() => {
    const prev = prevSuppliesRef.current;
    const added = supplies.filter(s => !prev.includes(s));
    if (added.length > 0) {
      setMaterials(current => {
        const existing = current.split(',').map(s => s.trim()).filter(Boolean);
        const toAdd = added.filter(n => !existing.some(e => e.toLowerCase() === n.toLowerCase()));
        if (toAdd.length === 0) return current;
        return current.trim() ? `${current.trim()}, ${toAdd.join(', ')}` : toAdd.join(', ');
      });
    }
    prevSuppliesRef.current = supplies;
  }, [supplies]);

  const [duration, setDuration] = useState(() => _saved?.duration ?? 60);
  const [weather, setWeather] = useState(() => _saved?.weather ?? '');
  const [attendanceCount, setAttendanceCount] = useState(() => _saved?.attendanceCount ?? profile.groupSize ?? 8);
  const [attendanceAgeNote, setAttendanceAgeNote] = useState('');

  // ── Generation state ──────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [, setStreamText] = useState('');
  const [generatedActivities, setGeneratedActivities] = useState<Activity[]>(() => _saved?.activities ?? []);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(_saved?.savedIds ?? []));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!generating) return;
    setLoadingMsgIndex(0);
    const id = setInterval(() => {
      setLoadingMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [generating]);

  const [themeError, setThemeError] = useState(false);

  // ── Neuro adaptations toggle ──────────────────────────────────
  const [includeNeuro, setIncludeNeuro] = useState(() => profile.neuroAdaptations ?? false);

  function handleNeuroToggle(val: boolean) {
    setIncludeNeuro(val);
    onNeuroChange?.(val);
  }

  // ── UI state ──────────────────────────────────────────────────
  const [toast, setToast] = useState('');

  // ── Timer state ───────────────────────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerAlert, setTimerAlert] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertActivityRef = useRef(-1);
  const timerTotalRef = useRef(0);
  const activitiesRef = useRef<Activity[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  timerTotalRef.current = timerTotal;
  activitiesRef.current = generatedActivities;

  // ── Notes & favourites state ──────────────────────────────────
  const [notes, setNotes] = useState(() => _saved?.notes ?? '');
  const [currentFavouriteId, setCurrentFavouriteId] = useState<string | null>(null);
  const [checkedMaterials, setCheckedMaterials] = useState<Set<string>>(() => new Set(storage.getCheckedMaterials()));
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sessionName, setSessionName] = useState('');

  // ── Persist session to localStorage ──────────────────────────
  useEffect(() => {
    storage.saveCurrentSession({
      theme, ageGroup, duration, weather, materials, attendanceCount,
      activities: generatedActivities,
      notes,
      savedIds: [...savedIds],
    });
  }, [theme, ageGroup, duration, weather, materials, attendanceCount, generatedActivities, notes, savedIds]);

  // ── Load preloaded favourite session ─────────────────────────
  useEffect(() => {
    if (!preloadSession) return;
    setTheme(preloadSession.theme);
    setAgeGroup(preloadSession.ageGroup);
    setDuration(preloadSession.duration);
    setWeather(preloadSession.weather);
    setAttendanceCount(preloadSession.attendance.count || 8);
    setAttendanceAgeNote(preloadSession.attendance.ageNote);
    setGeneratedActivities(preloadSession.activities);
    setNotes(preloadSession.notes);
    setSavedIds(new Set());
    setCheckedMaterials(new Set()); storage.clearCheckedMaterials();
    setCurrentFavouriteId(preloadSession.id);
    setTimerRunning(false);
    const totalSecs = preloadSession.duration * 60;
    setTimerTotal(totalSecs);
    setTimerRemaining(totalSecs);
    lastAlertActivityRef.current = -1;
    onPreloadConsumed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadSession]);

  // ── Auto-save notes to favourites ────────────────────────────
  useEffect(() => {
    if (!currentFavouriteId || generatedActivities.length === 0) return;
    const session = storage.getFavouriteSessions().find((s) => s.id === currentFavouriteId);
    if (!session) return;
    storage.saveFavouriteSession({ ...session, notes });
  }, [notes, currentFavouriteId, generatedActivities.length]);

  // ── Session timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        const next = prev - 1;
        const total = timerTotalRef.current;
        const acts = activitiesRef.current;
        if (total > 0 && acts.length > 0) {
          const actInterval = total / acts.length;
          const elapsed = total - next;
          const currentSlot = Math.floor(elapsed / actInterval);
          if (currentSlot > lastAlertActivityRef.current && currentSlot < acts.length) {
            lastAlertActivityRef.current = currentSlot;
            const nextActivity = acts[currentSlot];
            setTimerAlert(`🎯 Time to move on! Next: "${nextActivity.name}"`);
            setTimeout(() => setTimerAlert(''), 8000);
          }
        }
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimerRunning(false);
          setTimerAlert('⏰ Session complete! Great work today! 🎉');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // ── Derived: supplies by activity type ───────────────────────
  const suppliesByType = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const type of Object.keys(ACTIVITY_TYPE_CONFIG)) {
      const typeActs = generatedActivities.filter((a) => a.activityType === type);
      if (typeActs.length === 0) continue;
      const seen = new Set<string>();
      const list: string[] = [];
      for (const act of typeActs) {
        for (const m of act.materials) {
          const norm = m.trim().toLowerCase();
          if (norm && !seen.has(norm)) { seen.add(norm); list.push(m.trim()); }
        }
      }
      if (list.length > 0) result[type] = list;
    }
    return result;
  }, [generatedActivities]);

  // ── Helpers ───────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function resetTimer(totalSecs: number) {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerTotal(totalSecs);
    setTimerRemaining(totalSecs);
    lastAlertActivityRef.current = -1;
    setTimerAlert('');
  }

  const isReturningUser = Boolean(profile.hostName || profile.playgroupName);

  function handleStartSession() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleViewLastSession() {
    const lastEntry = history[0];
    if (!lastEntry || lastEntry.activitySnapshot.length === 0) {
      onGoToHistory();
      return;
    }
    const acts = lastEntry.activitySnapshot;
    setGeneratedActivities(acts);
    setTheme(acts[0]?.theme ?? '');
    setSavedIds(new Set());
    setCheckedMaterials(new Set()); storage.clearCheckedMaterials();
    setNotes('');
    setCurrentFavouriteId(null);
    resetTimer(duration * 60);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  async function handleGenerate() {
    if (!theme.trim()) { setThemeError(true); setError("Don't forget to enter a theme for this week! 🎨"); return; }
    setGenerating(true);
    setError('');
    setStreamText('');
    setGeneratedActivities([]);
    setSavedIds(new Set());
    setCheckedMaterials(new Set());
    storage.clearCheckedMaterials();
    setNotes('');
    setCurrentFavouriteId(null);
    setTimerAlert('');
    try {
      const pastTitles = await getPastActivityTitles(theme.trim(), userId);
      const activities = await generateActivities(
        theme.trim(), ageGroup, materials, duration, setStreamText,
        weather, { count: attendanceCount, ageNote: attendanceAgeNote }, includeNeuro, pastTitles,
        (partial) => setGeneratedActivities([...partial]),
      );
      setGeneratedActivities(activities);
      setStreamText('');
      resetTimer(duration * 60);
      void saveActivityTitles(theme.trim(), activities.map((a) => a.name), userId);
      // Auto-tick materials that match the saved inventory
      const inv = storage.getSupplies();
      if (inv.length > 0) {
        const autoTicked = new Set<string>();
        for (const act of activities) {
          for (const mat of act.materials) {
            if (!isMaterialChecked(mat, autoTicked) && inv.some((i) => {
              const il = i.toLowerCase().trim();
              const ml = mat.toLowerCase().trim();
              return il === ml || il.includes(ml) || ml.includes(il);
            })) {
              autoTicked.add(mat.trim());
            }
          }
        }
        setCheckedMaterials(autoTicked);
        storage.saveCheckedMaterials([...autoTicked]);
      }
    } catch (_err) {
      const errMsg = (_err as Error)?.message ?? 'Unknown error';
      console.log('ERROR (handleGenerate catch):', errMsg, (_err as Error)?.stack);
      setError(errMsg || 'Oops, something went wrong — please try again! 😊');
      setStreamText('');
    } finally {
      setGenerating(false);
    }
  }

  function handleStartFresh() {
    storage.clearCurrentSession();
    setTheme('');
    setAgeGroup(profile.ageRange || '2-3');
    setMaterials(supplies.join(', '));
    setDuration(60);
    setWeather('');
    setAttendanceCount(profile.groupSize || 8);
    setAttendanceAgeNote('');
    setGeneratedActivities([]);
    setSavedIds(new Set());
    setNotes('');
    setCurrentFavouriteId(null);
    setCheckedMaterials(new Set());
    storage.clearCheckedMaterials();
    setTimerRunning(false);
    setTimerRemaining(0);
    setTimerTotal(0);
    setTimerAlert('');
    lastAlertActivityRef.current = -1;
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function saveActivity(activity: Activity) {
    onSaveActivities([activity]);
    setSavedIds((prev) => new Set([...prev, activity.id]));
    showToast(`"${activity.name}" saved to library!`);
    onToast?.('Activity saved! ⭐');
  }

  function saveAll() {
    const unsaved = generatedActivities.filter((a) => !savedIds.has(a.id));
    if (unsaved.length === 0) return;
    onSaveActivities(unsaved);
    setSavedIds(new Set(generatedActivities.map((a) => a.id)));
    showToast(`${unsaved.length} activities saved to library!`);
    onToast?.('All activities saved! ⭐');
  }

  function openSaveModal() {
    setSessionName(theme.trim() || 'My Session');
    setShowSaveModal(true);
  }

  function confirmSaveSession() {
    const name = sessionName.trim() || theme.trim() || 'My Session';
    const existingId = currentFavouriteId ?? `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session: FavouriteSession = {
      id: existingId, name, theme: theme.trim(), ageGroup, duration, weather,
      attendance: { count: attendanceCount, ageNote: attendanceAgeNote },
      activities: generatedActivities, notes, createdAt: new Date().toISOString(),
    };
    onSaveFavourite(session);
    setCurrentFavouriteId(session.id);
    setShowSaveModal(false);
    showToast(`Session "${name}" saved to favourites! ⭐`);
    onToast?.('Session saved! 🎉');
  }

  function toggleMaterial(name: string) {
    setCheckedMaterials((prev) => {
      const next = new Set(prev);
      const nameLower = name.toLowerCase().trim();
      // Find any existing partial match and remove it
      let found: string | null = null;
      for (const c of next) {
        const ci = c.toLowerCase().trim();
        if (ci === nameLower || ci.includes(nameLower) || nameLower.includes(ci)) {
          found = c;
          break;
        }
      }
      if (found !== null) {
        next.delete(found);
      } else {
        next.add(name.trim());
      }
      storage.saveCheckedMaterials([...next]);
      return next;
    });
  }

  const savedCount = generatedActivities.filter((a) => savedIds.has(a.id)).length;
  const allSaved = generatedActivities.length > 0 && savedCount === generatedActivities.length;
  const timerPercent = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 100;
  const currentActivitySlot =
    timerTotal > 0 && generatedActivities.length > 0
      ? Math.min(
          Math.floor(((timerTotal - timerRemaining) / timerTotal) * generatedActivities.length),
          generatedActivities.length - 1,
        )
      : 0;
  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {/* ── Force-load Nunito font inline ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
      `}</style>

      {/* ── Animated gradient background (screen only) ── */}
      <div className="ag-bg no-print" />
      <div className="ag-orb ag-orb-1 no-print" />
      <div className="ag-orb ag-orb-2 no-print" />
      <div className="ag-orb ag-orb-3 no-print" />
      <div className="ag-orb ag-orb-4 no-print" />
      <div className="ag-orb ag-orb-5 no-print" />

      {/* ── Save session modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-black text-gray-800 mb-1">⭐ Save Session</h3>
            <p className="text-sm text-gray-500 mb-4">Give this session a name to find it later.</p>
            <input
              type="text" value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmSaveSession()}
              placeholder="Session name..." autoFocus
              className="ag-input mb-4"
            />
            <div className="flex gap-2">
              <button onClick={confirmSaveSession}
                style={{ flex: 1, padding: '10px', borderRadius: '14px', background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Save ⭐
              </button>
              <button onClick={() => setShowSaveModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '14px', border: '2px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce no-print">
          ✅ {toast}
        </div>
      )}

      {/* ── Timer alert ── */}
      {timerAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm text-center max-w-sm no-print">
          {timerAlert}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SCREEN CONTENT
          ══════════════════════════════════════════════════════════ */}
      <div className="ag-content no-print">

        {/* ── Welcome back card (returning users only) ── */}
        {isReturningUser && (
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: 28,
            boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.07), inset 0 0 0 1.5px rgba(251,146,60,0.22)',
            padding: '28px 32px',
            marginBottom: 8,
          }}>
            <div style={{ marginBottom: 18 }}>
              <h3 style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 'clamp(20px, 4vw, 26px)',
                fontWeight: 900,
                margin: '0 0 6px',
                background: 'linear-gradient(135deg,#f97316,#ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Welcome back{profile.hostName ? `, ${profile.hostName}` : ''}! 👋
              </h3>
              <p style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 15,
                fontWeight: 600,
                color: '#6b7280',
                margin: 0,
              }}>
                Ready to plan this week's session{profile.playgroupName ? ` for ${profile.playgroupName}` : ''}?
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleStartSession}
                style={{
                  padding: '11px 22px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg,#f97316,#ec4899)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  fontFamily: 'Nunito, sans-serif',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                }}
              >
                ✨ Start This Week's Session
              </button>
              {history.length > 0 && (
                <button
                  onClick={handleViewLastSession}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.9)',
                    color: '#c2410c',
                    fontWeight: 800,
                    fontSize: 14,
                    fontFamily: 'Nunito, sans-serif',
                    border: '2px solid #fed7aa',
                    cursor: 'pointer',
                  }}
                >
                  📋 View Last Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Page header ── */}
        <div className="ag-header-row">
          <div>
            <h2 className="ag-heading">Plan Today's Session</h2>
            <p className="ag-subheading">Let's build a fun, personalised session for your little ones ✨</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            FORM CARD
            ══════════════════════════════════════════════════════ */}
        <div className="ag-card" ref={formRef}>

          {/* Icon strip */}
          <div className="ag-icon-strip">
            <div style={{ display: 'flex', gap: 6, fontSize: 20 }}>
              <span>🌟</span>
              <span>🎨</span>
              <span>🎵</span>
              <span>📚</span>
              <span>🌿</span>
            </div>
            <span className="ag-strip-label">Session Builder</span>
          </div>

          <div className="ag-form-grid">

            {/* Weekly Theme */}
            <div className="ag-col-span-2">
              <label className="ag-label">
                🎭 Weekly Theme <span style={{ color: '#f472b6' }}>*</span>
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => { setTheme(e.target.value); setThemeError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Under the Sea, Dinosaurs, Jungle Adventure..."
                className="ag-input"
                style={themeError ? { border: '2.5px solid #f97316' } : undefined}
              />
            </div>

            {/* Age Group */}
            <div>
              <label className="ag-label">👶 Age Group</label>
              <div className="ag-age-row">
                {AGE_GROUPS.map((ag) => (
                  <button
                    key={ag}
                    onClick={() => setAgeGroup(ag)}
                    className={`ag-age-btn${ageGroup === ag ? ' ag-age-btn--on' : ''}${ag === '0-5' ? ' ag-age-btn--all' : ''}`}
                  >
                    {AGE_LABELS[ag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="ag-label">⏱ Session Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="ag-select"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>

            {/* Weather */}
            <div>
              <label className="ag-label">
                🌤 Today's Weather{' '}
                <span className="ag-label-note">(optional)</span>
              </label>
              <div className="ag-weather-row">
                {WEATHER_OPTIONS.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setWeather(weather === value ? '' : value)}
                    className={`ag-weather-btn${weather === value ? ' ag-weather-btn--on' : ''}`}
                  >
                    <span className="ag-weather-emoji">{emoji}</span>
                    <span className="ag-weather-label">{label}</span>
                  </button>
                ))}
              </div>
              {(weather === 'rainy' || weather === 'cold') && (
                <span className="ag-weather-hint ag-weather-hint--blue">
                  💡 Outdoor activities will be adapted for indoors
                </span>
              )}
              {weather === 'hot' && (
                <span className="ag-weather-hint ag-weather-hint--orange">
                  💡 Outdoor activities will focus on water play &amp; shade
                </span>
              )}
            </div>

            {/* Attendance */}
            <div>
              <label className="ag-label">
                👧 Attendance{' '}
                <span className="ag-label-note">(optional)</span>
              </label>
              <div className="ag-attendance-row">
                <div className="ag-stepper">
                  <button
                    className="ag-step-btn"
                    onClick={() => setAttendanceCount((c) => Math.max(1, c - 1))}
                  >−</button>
                  <span className="ag-step-count">{attendanceCount}</span>
                  <button
                    className="ag-step-btn"
                    onClick={() => setAttendanceCount((c) => Math.min(50, c + 1))}
                  >+</button>
                  <span className="ag-step-unit">children</span>
                </div>
                <input
                  type="text"
                  value={attendanceAgeNote}
                  onChange={(e) => setAttendanceAgeNote(e.target.value)}
                  placeholder="e.g. mostly 2–3 yr olds"
                  className="ag-input"
                  style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Materials */}
            <div className="ag-col-span-2">
              <label className="ag-label">
                🖌 Available Materials{' '}
                <span className="ag-label-note">(optional)</span>
              </label>
              <textarea
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="e.g. paper plates, paint, fabric scraps, sand tray, musical instruments, story books..."
                rows={2}
                className="ag-input"
              />
              {materials.trim() === '' && supplies.length === 0 ? (
                <span className="ag-helper">
                  💡 Save your supplies in your Profile to auto-fill this field every session —{' '}
                  <button
                    type="button"
                    onClick={onGoToProfile}
                    style={{ color: '#f97316', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                  >
                    Set up Profile →
                  </button>
                </span>
              ) : (
                <span className="ag-helper">
                  {supplies.length > 0
                    ? '✅ Activities will only use your saved supplies — edit the field above to adjust for this session.'
                    : 'Don\'t worry if you don\'t have much — we work with whatever you have! 🎨'}
                </span>
              )}
            </div>

          </div>{/* /ag-form-grid */}

          {/* ── Neuro adaptations toggle ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 18px',
            borderRadius: 16,
            background: includeNeuro
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
              : 'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)',
            border: `1.5px solid ${includeNeuro ? '#86efac' : '#e5e7eb'}`,
            marginTop: 4,
            transition: 'all 0.2s',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14, color: '#374151' }}>
                  Include neurodiversity-friendly adaptations
                </span>
              </div>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#9ca3af', margin: 0 }}>
                Each activity will include practical tips for sensory, ADHD, autism, fine motor, attention &amp; communication needs
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNeuroToggle(!includeNeuro)}
              role="switch"
              aria-checked={includeNeuro}
              style={{
                flexShrink: 0,
                width: 48,
                height: 26,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: includeNeuro ? '#22c55e' : '#d1d5db',
                position: 'relative',
                transition: 'background 0.2s',
                padding: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: includeNeuro ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {error && (
            <div className="ag-error">
              <span>⚠️</span> {error}
              {generatedActivities.length === 0 && (
                <button
                  onClick={handleGenerate}
                  style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 999, background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="ag-generate-btn"
          >
            {generating ? (
              <>
                <span className="ag-spin">✨</span>
                Generating your session...
              </>
            ) : (
              <>✨ Generate Activities</>
            )}
          </button>

        </div>{/* /ag-card */}

        {/* ── Loading animation ── */}
        {generating && generatedActivities.length === 0 && (
          <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-10 mb-6 text-center">
            <div className="relative inline-block mb-5">
              <span className="text-7xl animate-bounce inline-block">🧠</span>
              {[
                { emoji: '🎨', pos: 'top-0 -left-6',  delay: '0ms' },
                { emoji: '🎵', pos: '-top-4 left-8',   delay: '200ms' },
                { emoji: '🌿', pos: '-top-2 left-20',  delay: '400ms' },
                { emoji: '⭐', pos: 'top-2 -left-8',   delay: '600ms' },
                { emoji: '🎪', pos: 'top-2 left-24',   delay: '300ms' },
              ].map(({ emoji, pos, delay }) => (
                <span key={emoji}
                  className={`absolute ${pos} text-xl animate-ping`}
                  style={{ animationDuration: '1.5s', animationDelay: delay }}>
                  {emoji}
                </span>
              ))}
            </div>
            <p
              key={loadingMsgIndex}
              className="text-xl font-black text-purple-600 mb-1 transition-all"
              style={{ animation: 'fadein 0.4s ease' }}
            >
              {LOADING_MESSAGES[loadingMsgIndex].text} {LOADING_MESSAGES[loadingMsgIndex].emoji}
            </p>
            <p className="text-sm text-gray-400 font-medium">Creating a magical session just for you!</p>
            <div className="flex justify-center gap-1.5 mt-5">
              {[0, 150, 300, 450, 600].map((delay) => (
                <span key={delay}
                  className="w-2 h-2 bg-gradient-to-r from-orange-300 to-pink-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            GENERATED ACTIVITIES
            ══════════════════════════════════════════════════════ */}
        {generatedActivities.length > 0 && (
          <div ref={resultsRef}>
            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-black text-gray-700">
                  🎉 Your Session Plan
                  <span className="ml-2 text-base font-bold text-gray-400">
                    ({generatedActivities.length} activities)
                  </span>
                </h3>
                <button
                  onClick={handleStartFresh}
                  className="no-print px-3 py-1 rounded-full text-xs font-bold text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-500 transition-colors bg-white"
                >
                  Start Fresh ✨
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentFavouriteId ? (
                  <button onClick={openSaveModal}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-300 text-yellow-900 font-bold text-sm hover:opacity-90 border border-yellow-300 transition-all shadow-sm">
                    ⭐ Saved — Update
                  </button>
                ) : (
                  <button onClick={openSaveModal}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-300 text-yellow-900 font-bold text-sm hover:opacity-90 border border-yellow-300 transition-all shadow-sm">
                    ⭐ Save Session
                  </button>
                )}
                <div className="flex flex-col items-start gap-0.5">
                  <button onClick={() => window.print()}
                    className="px-4 py-2 rounded-2xl bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 border-2 border-blue-100 transition-colors">
                    🖨 Print Plan
                  </button>
                  <span className="sm:hidden text-[10px] text-gray-400 font-medium pl-1">
                    💡 Best on desktop
                  </span>
                </div>
                {savedCount > 0 && (
                  <button onClick={onGoToLibrary}
                    className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-600 font-bold text-sm hover:bg-purple-100 border-2 border-purple-100 transition-colors">
                    📖 Library ({savedCount})
                  </button>
                )}
                {!allSaved && (
                  <button onClick={saveAll}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-400 text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm">
                    💾 Save All
                  </button>
                )}
                {allSaved && (
                  <span className="px-4 py-2 rounded-2xl bg-green-50 text-green-600 font-bold text-sm border-2 border-green-100">
                    ✅ All Saved!
                  </span>
                )}
              </div>
            </div>

            {/* Session Timer */}
            {timerTotal > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-100 shadow-sm p-5 mb-7">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-purple-700 text-base">🕐 Session Timer</h4>
                  <span className="text-xs text-gray-400 font-medium">
                    Activity {currentActivitySlot + 1} of {generatedActivities.length}
                  </span>
                </div>
                <div className="w-full bg-white/70 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                  <div
                    className="h-3 rounded-full transition-all duration-1000"
                    style={{
                      width: `${timerPercent}%`,
                      background: timerPercent > 50
                        ? 'linear-gradient(to right, #a78bfa, #ec4899)'
                        : timerPercent > 20
                        ? 'linear-gradient(to right, #fb923c, #ec4899)'
                        : 'linear-gradient(to right, #f87171, #fb923c)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl font-black tabular-nums"
                    style={{ color: timerPercent > 50 ? '#7c3aed' : timerPercent > 20 ? '#ea580c' : '#dc2626' }}>
                    {formatTime(timerRemaining)}
                  </span>
                  <span className="text-xs text-gray-400 text-right max-w-[160px] font-medium">
                    {generatedActivities[currentActivitySlot]?.name && timerRunning
                      ? `"${generatedActivities[currentActivitySlot].name}"`
                      : `~${Math.round(duration / generatedActivities.length)} min/activity`}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!timerRunning ? (
                    <button
                      onClick={() => {
                        if (timerRemaining === 0) setTimerRemaining(timerTotal);
                        setTimerRunning(true);
                        lastAlertActivityRef.current = -1;
                      }}
                      className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm"
                    >
                      ▶ {timerRemaining === 0 ? 'Restart' : 'Start Session'}
                    </button>
                  ) : (
                    <button onClick={() => setTimerRunning(false)}
                      className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm">
                      ⏸ Pause
                    </button>
                  )}
                  <button onClick={() => resetTimer(timerTotal)}
                    className="px-5 py-2.5 rounded-2xl bg-white border-2 border-gray-100 text-gray-500 font-bold text-sm hover:border-gray-200 hover:bg-gray-50 transition-colors">
                    ↺ Reset
                  </button>
                </div>
              </div>
            )}

            {/* Activities grouped by type */}
            <div className="flex flex-col gap-10">
              {(Object.keys(ACTIVITY_TYPE_CONFIG) as (keyof typeof ACTIVITY_TYPE_CONFIG)[]).map((type) => {
                const cfg = ACTIVITY_TYPE_CONFIG[type];
                const section = generatedActivities.filter((a) => a.activityType === type);
                if (section.length === 0) return null;
                return (
                  <div key={type}>
                    <div className={`flex items-center gap-2.5 mb-4 pb-3 border-b-2 ${cfg.border}`}>
                      <span className="text-2xl">{cfg.emoji}</span>
                      <h4 className={`text-xl font-black ${cfg.text}`}>{cfg.label}</h4>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {section.length} activities
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {section.map((activity) => (
                        <GeneratedActivityCard
                          key={activity.id}
                          activity={activity}
                          saved={savedIds.has(activity.id)}
                          onSave={() => saveActivity(activity)}
                          inventoryItems={supplies}
                          checkedMaterials={checkedMaterials}
                          onToggleMaterial={toggleMaterial}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supplies Checklist */}
            {Object.keys(suppliesByType).length > 0 && (
              <div className="mt-10 bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-3xl border border-green-100 shadow-sm p-6">
                <h4 className="font-black text-green-700 text-base mb-1">🛒 Supplies Checklist</h4>
                <p className="text-xs text-gray-400 font-medium mb-5">
                  Tick items off as you gather supplies for the session.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                  {(Object.keys(suppliesByType) as (keyof typeof ACTIVITY_TYPE_CONFIG)[]).map((type) => {
                    const cfg = ACTIVITY_TYPE_CONFIG[type];
                    const items = suppliesByType[type];
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="text-base">{cfg.emoji}</span>
                          <span className={`text-sm font-black ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        <ul className="space-y-2">
                          {items.map((item) => {
                            const checked = isMaterialChecked(item, checkedMaterials);
                            return (
                              <li key={item}>
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                  <input type="checkbox" checked={checked}
                                    onChange={() => toggleMaterial(item)}
                                    className="w-4 h-4 rounded accent-green-500 cursor-pointer" />
                                  <span className={`text-sm font-medium transition-all ${
                                    checked ? 'line-through text-gray-300' : 'text-gray-700 group-hover:text-gray-900'
                                  }`}>
                                    {item}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {Object.values(suppliesByType).flat().length > 0 && (
                  <button onClick={() => { setCheckedMaterials(new Set()); storage.clearCheckedMaterials(); }}
                    className="mt-5 text-xs text-gray-400 hover:text-gray-600 font-bold transition-colors">
                    ↺ Clear all ticks
                  </button>
                )}
              </div>
            )}

            {/* First-timer profile prompt */}
            {!isReturningUser && (
              <div style={{
                marginTop: 24,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 20,
                border: '1.5px dashed #fed7aa',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <p style={{
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#92400e',
                  margin: 0,
                }}>
                  💡 Save time next week — set up your profile to pre-fill your supplies and group details automatically
                </p>
                <button
                  onClick={onGoToProfile}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg,#f97316,#ec4899)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    fontFamily: 'Nunito, sans-serif',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Set Up Profile →
                </button>
              </div>
            )}

            {/* Session Notes */}
            <div className="mt-6 bg-gradient-to-br from-yellow-50 to-amber-50/40 rounded-3xl border border-yellow-100 shadow-sm p-6">
              <h4 className="font-black text-yellow-700 text-base mb-1">📝 Session Notes</h4>
              <p className="text-xs text-gray-400 font-medium mb-3">
                Jot down reflections, what worked well, or ideas for next time.
                {currentFavouriteId && ' Notes save automatically to your favourite.'}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Children loved the sensory bin! Reduce paint quantity next time. Music section ran long..."
                rows={4}
                className="ag-input"
                style={{ borderColor: undefined }}
              />
            </div>
          </div>
        )}

      </div>{/* /ag-content */}

      {/* ══════════════════════════════════════════════════════════
          PRINT-ONLY SESSION PLAN
          ══════════════════════════════════════════════════════════ */}
      {generatedActivities.length > 0 && (
        <div className="hidden print:block" style={{ fontFamily: 'serif' }}>
          <div style={{ borderBottom: '3px solid #f97316', paddingBottom: '12px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '22pt', fontWeight: 900, margin: 0 }}>🌟 Playgroup Planner — Session Plan</h1>
            <p style={{ fontSize: '11pt', color: '#555', margin: '4px 0 0' }}>{today}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 12px 3px 0', fontWeight: 700 }}>Theme:</td>
                <td style={{ padding: '3px 0' }}>{theme}</td>
                <td style={{ padding: '3px 12px 3px 24px', fontWeight: 700 }}>Duration:</td>
                <td style={{ padding: '3px 0' }}>{duration} minutes</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 12px 3px 0', fontWeight: 700 }}>Age Group:</td>
                <td style={{ padding: '3px 0' }}>{ageGroup} years</td>
                {attendanceCount > 0 && (
                  <>
                    <td style={{ padding: '3px 12px 3px 24px', fontWeight: 700 }}>Attendance:</td>
                    <td style={{ padding: '3px 0' }}>
                      {attendanceCount} children{attendanceAgeNote ? ` (${attendanceAgeNote})` : ''}
                    </td>
                  </>
                )}
              </tr>
              {weather && (
                <tr>
                  <td style={{ padding: '3px 12px 3px 0', fontWeight: 700 }}>Weather:</td>
                  <td colSpan={3} style={{ padding: '3px 0' }}>
                    {WEATHER_OPTIONS.find((w) => w.value === weather)?.emoji}{' '}
                    {WEATHER_OPTIONS.find((w) => w.value === weather)?.label}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {(Object.keys(ACTIVITY_TYPE_CONFIG) as (keyof typeof ACTIVITY_TYPE_CONFIG)[]).map((type) => {
            const cfg = ACTIVITY_TYPE_CONFIG[type];
            const section = generatedActivities.filter((a) => a.activityType === type);
            if (section.length === 0) return null;
            return (
              <div key={type} style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #e5e7eb', paddingBottom: '4px', marginBottom: '10px' }}>
                  {cfg.emoji} {cfg.label}
                </h2>
                {section.map((activity, idx) => (
                  <div key={activity.id} style={{ marginBottom: '14px', paddingLeft: '8px' }}>
                    <p style={{ fontWeight: 700, fontSize: '11pt', margin: '0 0 2px' }}>{idx + 1}. {activity.name}</p>
                    <p style={{ fontSize: '10pt', color: '#444', margin: '0 0 2px' }}>{activity.description}</p>
                    {activity.materials.length > 0 && (
                      <p style={{ fontSize: '9.5pt', color: '#666', margin: '0 0 4px' }}>
                        <em>Materials: {activity.materials.join(', ')}</em>
                      </p>
                    )}
                    {activity.neuroAdaptations && NEURO_CATEGORIES.some((c) => activity.neuroAdaptations![c.key]) && (
                      <div style={{ background: '#f3f4f6', borderRadius: 6, padding: '6px 10px', marginTop: 4 }}>
                        <p style={{ fontSize: '8.5pt', fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>🧠 Neurodiversity Tips:</p>
                        {NEURO_CATEGORIES.map(({ key, emoji, label }) => {
                          const text = activity.neuroAdaptations![key];
                          if (!text) return null;
                          return (
                            <p key={key} style={{ fontSize: '8.5pt', color: '#555', margin: '0 0 2px' }}>
                              <strong>{emoji} {label}:</strong> {text}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {Object.keys(suppliesByType).length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #e5e7eb', paddingBottom: '4px', marginBottom: '10px' }}>
                🛒 Supplies Needed
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                {(Object.keys(suppliesByType) as (keyof typeof ACTIVITY_TYPE_CONFIG)[]).map((type) => {
                  const cfg = ACTIVITY_TYPE_CONFIG[type];
                  return (
                    <div key={type} style={{ marginBottom: '12px' }}>
                      <p style={{ fontWeight: 700, fontSize: '10pt', margin: '0 0 4px' }}>{cfg.emoji} {cfg.label}:</p>
                      <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
                        {suppliesByType[type].map((item) => (
                          <li key={item} style={{ fontSize: '10pt', marginBottom: '2px' }}>☐ {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {notes && (
            <div>
              <h2 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #e5e7eb', paddingBottom: '4px', marginBottom: '8px' }}>
                📝 Session Notes
              </h2>
              <p style={{ fontSize: '10.5pt', color: '#333', whiteSpace: 'pre-wrap' }}>{notes}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Activity card subcomponent ────────────────────────────────

function inInventory(material: string, inventory: string[]): boolean {
  const mat = material.toLowerCase().trim();
  return inventory.some((inv) => {
    const i = inv.toLowerCase().trim();
    return i === mat || i.includes(mat) || mat.includes(i);
  });
}

function isMaterialChecked(material: string, checked: Set<string>): boolean {
  const mat = material.toLowerCase().trim();
  for (const c of checked) {
    const ci = c.toLowerCase().trim();
    if (ci === mat || ci.includes(mat) || mat.includes(ci)) return true;
  }
  return false;
}

const NEURO_CATEGORIES: { key: keyof NeuroAdaptations; emoji: string; label: string; color: string; bg: string }[] = [
  { key: 'sensory',       emoji: '👋', label: 'Sensory',       color: '#0891b2', bg: '#ecfeff' },
  { key: 'fineMotor',     emoji: '✂️', label: 'Fine Motor',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'attention',     emoji: '⏱',  label: 'Attention',     color: '#b45309', bg: '#fffbeb' },
  { key: 'autism',        emoji: '🔄', label: 'Autism',        color: '#0f766e', bg: '#f0fdfa' },
  { key: 'adhd',          emoji: '⚡', label: 'ADHD',          color: '#dc2626', bg: '#fef2f2' },
  { key: 'communication', emoji: '💬', label: 'Communication', color: '#16a34a', bg: '#f0fdf4' },
];

function GeneratedActivityCard({
  activity, saved, onSave, inventoryItems, checkedMaterials, onToggleMaterial,
}: {
  activity: Activity;
  saved: boolean;
  onSave: () => void;
  inventoryItems: string[];
  checkedMaterials: Set<string>;
  onToggleMaterial: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandAdapt, setExpandAdapt] = useState(false);
  const [expandNeuro, setExpandNeuro] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];

  const hasNeuro = activity.neuroAdaptations &&
    NEURO_CATEGORIES.some((c) => activity.neuroAdaptations![c.key]);

  // Read directly from localStorage so the checklist is always up-to-date,
  // regardless of prop propagation timing. Prop used as fallback.
  const inventory = useMemo(() => {
    const fromStorage = storage.getSupplies();
    return fromStorage.length > 0 ? fromStorage : inventoryItems;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryItems]);

  return (
    <div className={`bg-white rounded-3xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
      saved ? 'border-green-200' : 'border-gray-100'
    }`}>
      <div className={`h-1.5 ${typeCfg.bg.replace('100', '400')}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}>
                {typeCfg.emoji} {typeCfg.label}
              </span>
              {activity.ageGroups.map((ag) => {
                const agCfg = AGE_GROUP_CONFIG[ag];
                return (
                  <span key={ag} className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${agCfg.bg} ${agCfg.text}`}>
                    {agCfg.label}
                  </span>
                );
              })}
            </div>
            <h4 className="text-lg font-black text-gray-800 leading-snug">{activity.name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {activity.durationEstimate && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 999,
                  background: 'linear-gradient(135deg,#fff7ed,#fef3c7)',
                  border: '1.5px solid #fed7aa',
                  fontSize: 12, fontWeight: 700, color: '#c2410c',
                }}>
                  ⏱ {activity.durationEstimate}
                </span>
              )}
              {activity.bestAgeGroup && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 999,
                  background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
                  border: '1.5px solid #bae6fd',
                  fontSize: 12, fontWeight: 700, color: '#0369a1',
                }}>
                  🎯 Best for {activity.bestAgeGroup}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{activity.description}</p>
          </div>
          <button
            onClick={onSave} disabled={saved}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2 no-print ${
              saved
                ? 'bg-green-50 text-green-600 border-green-200 cursor-default'
                : 'bg-gradient-to-r from-orange-400 to-pink-400 text-white border-transparent hover:opacity-90 shadow-sm'
            }`}
            style={{ minHeight: 44 }}
          >
            {saved ? '✅ Saved' : '💾 Save'}
          </button>
        </div>

        {activity.materials.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {activity.materials.map((m, i) => {
                const ticked = isMaterialChecked(m, checkedMaterials);
                const have = inventory.length > 0 && inInventory(m, inventory);
                const checked = ticked || have;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onToggleMaterial(m)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer hover:opacity-75 no-print ${
                      have
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : ticked
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : inventory.length > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}
                  >
                    {checked ? '✅' : '⬜'} {m}
                  </button>
                );
              })}
            </div>
            {inventory.length > 0 && activity.materials.some((m) => !inInventory(m, inventory)) && (
              <p className="text-xs text-amber-600 font-medium mt-1.5">
                ⬜ = not in your saved inventory — source before session
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap no-print">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-orange-500 font-bold hover:text-pink-500 transition-colors py-2.5 -my-2.5 pr-2"
          >
            {expanded ? '▲ Show less' : '▼ Instructions & benefits'}
          </button>
          <button
            onClick={() => setPhotoOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 999,
              background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff',
              fontSize: 12, fontWeight: 700, border: 'none',
              cursor: 'pointer', lineHeight: 1, minHeight: 36,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            📸 See examples
          </button>
          {photoOpen && (
            <PhotoModal activityName={activity.name} onClose={() => setPhotoOpen(false)} />
          )}
        </div>

        {activity.ageAdaptations && Object.keys(activity.ageAdaptations).length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpandAdapt(!expandAdapt)}
              className="text-sm text-violet-500 font-bold hover:text-violet-700 transition-colors no-print py-2.5 -my-1 pr-2"
            >
              {expandAdapt ? '▲ Hide age adaptations' : '▼ Adapt for other ages'}
            </button>
            {expandAdapt && (
              <div className="mt-2.5 rounded-2xl bg-violet-50 border border-violet-100 p-4 space-y-2.5"
                style={{ animation: 'fadein 0.25s ease' }}>
                {Object.entries(activity.ageAdaptations).map(([ageLabel, suggestion]) => (
                  <div key={ageLabel} className="flex gap-2.5 text-sm">
                    <span className="shrink-0 font-black text-violet-600 whitespace-nowrap">{ageLabel}:</span>
                    <span className="text-gray-600 leading-relaxed">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasNeuro && (
          <div className="mt-3">
            <button
              onClick={() => setExpandNeuro(!expandNeuro)}
              className="text-sm font-bold transition-colors no-print py-2.5 -my-1 pr-2"
              style={{ color: '#16a34a' }}
            >
              {expandNeuro ? '▲ Hide neurodiversity tips' : '🧠 ▼ Neurodiversity-friendly adaptations'}
            </button>
            {expandNeuro && (
              <div className="mt-2.5 rounded-2xl border p-4"
                style={{ background: '#f0fdf4', borderColor: '#86efac', animation: 'fadein 0.25s ease' }}>
                <div className="grid gap-2.5">
                  {NEURO_CATEGORIES.map(({ key, emoji, label, color, bg }) => {
                    const text = activity.neuroAdaptations![key];
                    if (!text) return null;
                    return (
                      <div key={key} className="flex gap-2.5 text-sm items-start">
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-xs font-black whitespace-nowrap"
                          style={{ background: bg, color, border: `1px solid ${color}22` }}
                        >
                          {emoji} {label}
                        </span>
                        <span className="text-gray-600 leading-relaxed pt-0.5">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {expanded && (
          <div className="mt-4 grid sm:grid-cols-2 gap-5">
            <div>
              <h5 className="font-black text-gray-700 text-sm mb-2.5">📋 Instructions</h5>
              <ol className="space-y-2">
                {activity.instructions.map((step, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-black">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h5 className="font-black text-gray-700 text-sm mb-2.5">🌱 Developmental Benefits</h5>
              <ul className="space-y-2">
                {activity.developmentalBenefits.map((b, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-green-400 shrink-0 font-bold">✓</span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
