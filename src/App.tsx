import { useState, useCallback, useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Activity, DayKey, FavouriteSession, HistoryEntry, Page, Profile, WeekPlan } from './types';
import { storage } from './utils/storage';
import { supabase } from './lib/supabase';
import { dbSave, dbLoadAll } from './utils/db';
import Navigation from './components/Navigation';
import ActivityGenerator from './components/ActivityGenerator';
import ActivityLibrary from './components/ActivityLibrary';
import WeeklyPlanner from './components/WeeklyPlanner';
import HistoryLog from './components/HistoryLog';
import FavouritesPage from './components/FavouritesPage';
import ProfilePage from './components/ProfilePage';
import WelcomeScreen from './components/WelcomeScreen';
import AuthModal from './components/AuthModal';
import Toast, { type ToastMessage } from './components/Toast';
import BackToTop from './components/BackToTop';
import FeedbackModal from './components/FeedbackModal';
import Footer from './components/Footer';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('generator');
  const [activities, setActivities] = useState<Activity[]>(() => storage.getActivities());
  const [profile, setProfile] = useState<Profile>(() => storage.getProfile());
  const [supplies, setSupplies] = useState<string[]>(() => storage.getSupplies());
  const [history, setHistory] = useState<HistoryEntry[]>(() => storage.getHistory());
  const [favouriteSessions, setFavouriteSessions] = useState<FavouriteSession[]>(
    () => storage.getFavouriteSessions(),
  );
  const [preloadSession, setPreloadSession] = useState<FavouriteSession | null>(null);
  const [currentMondayDate, setCurrentMondayDate] = useState<string>(
    () => storage.getCurrentMondayDate(),
  );
  const [weekPlans, setWeekPlans] = useState<Record<string, WeekPlan>>(
    () => storage.getWeekPlans(),
  );

  // Auth & UI flow state
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);   // true once Supabase confirms initial session
  const [showLanding, setShowLanding] = useState(false);   // set after auth check to avoid flicker
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');
  const [isNewUser, setIsNewUser] = useState(false);        // set after sign-up, cleared on navigate away
  const [showCelebration, setShowCelebration] = useState(false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(
    () => !!sessionStorage.getItem('pg_banner_dismissed'),
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Refs so callbacks always read fresh state
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const weekPlansRef = useRef(weekPlans);
  weekPlansRef.current = weekPlans;
  const currentMondayDateRef = useRef(currentMondayDate);
  currentMondayDateRef.current = currentMondayDate;
  const userRef = useRef(user);
  userRef.current = user;

  // Cloud save helper
  const cloudSave = useCallback(async (key: string, data: unknown) => {
    const u = userRef.current;
    if (u) await dbSave(u.id, key, data);
  }, []);

  // Toast helpers
  const addToast = useCallback((text: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load cloud data on sign-in (or migrate localStorage on first sign-in)
  const handleSignIn = useCallback(async (signedInUser: User) => {
    setUser(signedInUser);
    setShowLanding(false);

    const cloudData = await dbLoadAll(signedInUser.id);

    if (Object.keys(cloudData).length === 0) {
      // First ever login — upload local data to cloud
      await Promise.all([
        dbSave(signedInUser.id, 'activities', storage.getActivities()),
        dbSave(signedInUser.id, 'profile', storage.getProfile()),
        dbSave(signedInUser.id, 'supplies', storage.getSupplies()),
        dbSave(signedInUser.id, 'history', storage.getHistory()),
        dbSave(signedInUser.id, 'weekPlans', storage.getWeekPlans()),
        dbSave(signedInUser.id, 'favourites', storage.getFavouriteSessions()),
      ]);
    } else {
      // Returning user — load cloud data into state
      if (cloudData.activities) {
        const acts = cloudData.activities as Activity[];
        setActivities(acts);
        storage.saveActivities(acts);
      }
      if (cloudData.profile) {
        const prof = cloudData.profile as Profile;
        setProfile(prof);
        storage.saveProfile(prof);
      }
      if (cloudData.supplies) {
        const sup = cloudData.supplies as string[];
        setSupplies(sup);
        storage.saveSupplies(sup);
      }
      if (cloudData.history) {
        const hist = cloudData.history as HistoryEntry[];
        setHistory(hist);
        storage.saveHistory(hist);
      }
      if (cloudData.weekPlans) {
        const wp = cloudData.weekPlans as Record<string, WeekPlan>;
        setWeekPlans(wp);
        for (const plan of Object.values(wp)) storage.saveWeekPlan(plan);
      }
      if (cloudData.favourites) {
        const favs = cloudData.favourites as FavouriteSession[];
        setFavouriteSessions(favs);
        for (const fav of favs) storage.saveFavouriteSession(fav);
      }
    }
  }, []);

  // Subscribe to Supabase auth state on mount.
  // We rely solely on onAuthStateChange (which fires INITIAL_SESSION synchronously in
  // Supabase v2) to decide whether to show the landing modal.  Using getSession() in
  // parallel caused a race: getSession resolved "no session" → showed landing, then
  // onAuthStateChange fired SIGNED_IN (refresh-token exchange) → hid landing.
  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — decide immediately from localStorage
      if (!localStorage.getItem('pg_has_visited')) setShowLanding(true);
      setAuthChecked(true);
      return;
    }

    let initialEventHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initialEventHandled) {
        // INITIAL_SESSION is the first event fired — use it as ground truth
        initialEventHandled = true;
        if (session?.user) {
          handleSignIn(session.user);
        } else if (!localStorage.getItem('pg_has_visited')) {
          setShowLanding(true);
        }
        setAuthChecked(true);
      } else {
        // Subsequent events: normal sign-in / sign-out
        if (session?.user) {
          handleSignIn(session.user);
        } else {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [handleSignIn]);

  // --- Landing / Auth flow ---

  function dismissLanding() {
    localStorage.setItem('pg_has_visited', '1');
    setShowLanding(false);
  }

  function handleLandingSignIn() {
    dismissLanding();
    setAuthInitialTab('login');
    setShowAuth(true);
  }

  function handleLandingCreateAccount() {
    dismissLanding();
    setAuthInitialTab('signup');
    setShowAuth(true);
  }

  function handleLandingSkip() {
    dismissLanding();
    setActivePage('generator');
  }

  function handleAuthSuccess(isNew: boolean) {
    setShowAuth(false);
    if (isNew) {
      setIsNewUser(true);
      setActivePage('profile');
    } else {
      setActivePage('generator');
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setIsNewUser(false);
  }

  function handleStartPlanning() {
    setIsNewUser(false);
    setActivePage('generator');
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);
  }

  function handleNavigatePage(page: Page) {
    // Clear new-user welcome when they navigate away from profile
    if (page !== 'profile') setIsNewUser(false);
    setActivePage(page);
  }

  function dismissGuestBanner() {
    sessionStorage.setItem('pg_banner_dismissed', '1');
    setGuestBannerDismissed(true);
  }

  // --- Data handlers ---

  const currentWeekPlan: WeekPlan = weekPlans[currentMondayDate] ?? {
    id: currentMondayDate,
    days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
  };

  const handleSaveActivities = useCallback((newActivities: Activity[]) => {
    setActivities((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const toAdd = newActivities.filter((a) => !existingIds.has(a.id));
      if (toAdd.length === 0) return prev;
      const updated = [...prev, ...toAdd];
      storage.saveActivities(updated);
      cloudSave('activities', updated);
      return updated;
    });
  }, [cloudSave]);

  const handleDeleteActivity = useCallback((id: string) => {
    setActivities((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      storage.saveActivities(updated);
      cloudSave('activities', updated);
      return updated;
    });
    setWeekPlans((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        const plan = updated[key];
        const days = { ...plan.days } as WeekPlan['days'];
        for (const dayKey of Object.keys(days) as DayKey[]) {
          days[dayKey] = days[dayKey].filter((da) => da.activityId !== id);
        }
        updated[key] = { ...plan, days };
        storage.saveWeekPlan(updated[key]);
      }
      cloudSave('weekPlans', updated);
      return updated;
    });
  }, [cloudSave]);

  const handleUpdateWeekPlan = useCallback((plan: WeekPlan) => {
    setWeekPlans((prev) => {
      const updated = { ...prev, [plan.id]: plan };
      cloudSave('weekPlans', updated);
      return updated;
    });
    storage.saveWeekPlan(plan);
  }, [cloudSave]);

  const handleAddToWeek = useCallback((activityId: string, day: DayKey) => {
    setWeekPlans((prev) => {
      const monday = currentMondayDateRef.current;
      const plan = prev[monday] ?? {
        id: monday,
        days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
      };
      if (plan.days[day].some((da) => da.activityId === activityId)) return prev;
      const updated: WeekPlan = {
        ...plan,
        days: { ...plan.days, [day]: [...plan.days[day], { activityId, done: false }] },
      };
      storage.saveWeekPlan(updated);
      const allPlans = { ...prev, [plan.id]: updated };
      cloudSave('weekPlans', allPlans);
      return allPlans;
    });
    setActivePage('planner');
  }, [cloudSave]);

  const handleArchiveWeek = useCallback(() => {
    const monday = currentMondayDateRef.current;
    const plan = weekPlansRef.current[monday] ?? {
      id: monday,
      days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    };
    const allDayActivities = Object.values(plan.days).flat();
    const entry: HistoryEntry = {
      id: `hist_${Date.now()}`,
      weekStartDate: plan.id,
      archivedAt: new Date().toISOString(),
      completedCount: allDayActivities.filter((da) => da.done).length,
      totalCount: allDayActivities.length,
      activitySnapshot: activitiesRef.current.filter((a) =>
        new Set(allDayActivities.map((da) => da.activityId)).has(a.id),
      ),
      weekPlan: plan,
    };
    setHistory((prev) => {
      const updated = [entry, ...prev];
      storage.saveHistory(updated);
      cloudSave('history', updated);
      return updated;
    });
    const emptyPlan: WeekPlan = {
      id: plan.id,
      days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    };
    setWeekPlans((prev) => {
      const updated = { ...prev, [plan.id]: emptyPlan };
      cloudSave('weekPlans', updated);
      return updated;
    });
    storage.saveWeekPlan(emptyPlan);
  }, [cloudSave]);

  const handleNavigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentMondayDate((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    storage.saveHistory([]);
    cloudSave('history', []);
  }, [cloudSave]);

  const handleDeleteHistoryEntry = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      storage.saveHistory(updated);
      cloudSave('history', updated);
      return updated;
    });
  }, [cloudSave]);

  const handleSaveFavourite = useCallback((session: FavouriteSession) => {
    storage.saveFavouriteSession(session);
    const updated = storage.getFavouriteSessions();
    setFavouriteSessions(updated);
    cloudSave('favourites', updated);
  }, [cloudSave]);

  const handleDeleteFavourite = useCallback((id: string) => {
    storage.deleteFavouriteSession(id);
    setFavouriteSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      cloudSave('favourites', updated);
      return updated;
    });
  }, [cloudSave]);

  const handleLoadFavourite = useCallback((session: FavouriteSession) => {
    setPreloadSession(session);
    setActivePage('generator');
  }, []);

  const handleProfileChange = useCallback((prof: Profile) => {
    setProfile(prof);
    cloudSave('profile', prof);
  }, [cloudSave]);

  const handleSuppliesChange = useCallback((sup: string[]) => {
    setSupplies(sup);
    cloudSave('supplies', sup);
  }, [cloudSave]);

  // Display name for nav: playgroup name > host name > email
  const displayName = user
    ? (profile.playgroupName || profile.hostName || user.email || null)
    : null;

  // Show guest banner: not logged in, on generator page, not dismissed
  const showGuestBanner = !user && activePage === 'generator' && !guestBannerDismissed;

  return (
    <div className="min-h-screen">

      {/* Landing modal — only shown once Supabase has confirmed there is no active session */}
      {authChecked && showLanding && (
        <WelcomeScreen
          onSignIn={handleLandingSignIn}
          onCreateAccount={handleLandingCreateAccount}
          onSkip={handleLandingSkip}
        />
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthSuccess={handleAuthSuccess}
          initialTab={authInitialTab}
        />
      )}

      {/* Celebration toast */}
      {showCelebration && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            background: 'linear-gradient(135deg,#f97316,#ec4899)',
            color: '#fff',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            fontSize: 16,
            padding: '14px 28px',
            borderRadius: 999,
            boxShadow: '0 8px 32px rgba(249,115,22,0.45)',
            pointerEvents: 'none',
            animation: 'celebration-in 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            whiteSpace: 'nowrap',
          }}
        >
          <style>{`
            @keyframes celebration-in {
              from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.85); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
            }
          `}</style>
          You're all set! Let's plan an amazing session 🎉
        </div>
      )}

      <Navigation
        activePage={activePage}
        onNavigate={handleNavigatePage}
        userEmail={user?.email}
        displayName={displayName}
        onLoginClick={() => { setAuthInitialTab('login'); setShowAuth(true); }}
        onLogoutClick={handleLogout}
      />

      <main className="pb-12">
        {/* Guest sign-up banner — shown on Plan Session when not logged in */}
        {showGuestBanner && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%)',
              borderBottom: '1px solid #fed7aa',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
              💡 Sign up free to save your sessions, supplies and profile across any device
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => { setAuthInitialTab('signup'); setShowAuth(true); }}
                style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg,#f97316,#ec4899)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Sign Up
              </button>
              <button
                onClick={dismissGuestBanner}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, lineHeight: 1, padding: 2 }}
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {activePage === 'generator' && (
          <ActivityGenerator
            profile={profile}
            supplies={supplies}
            history={history}
            onSaveActivities={handleSaveActivities}
            onGoToLibrary={() => setActivePage('library')}
            onGoToHistory={() => setActivePage('history')}
            onGoToProfile={() => setActivePage('profile')}
            onSaveFavourite={handleSaveFavourite}
            preloadSession={preloadSession}
            onPreloadConsumed={() => setPreloadSession(null)}
            onToast={addToast}
            onNeuroChange={(val) => handleProfileChange({ ...profile, neuroAdaptations: val })}
            userId={user?.id}
          />
        )}

        {activePage === 'library' && (
          <ActivityLibrary
            activities={activities}
            onDelete={handleDeleteActivity}
            onAddToWeek={handleAddToWeek}
            onGoToGenerator={() => setActivePage('generator')}
          />
        )}

        {activePage === 'planner' && (
          <WeeklyPlanner
            activities={activities}
            weekPlan={currentWeekPlan}
            onUpdateWeekPlan={handleUpdateWeekPlan}
            onArchiveWeek={handleArchiveWeek}
            onNavigateWeek={handleNavigateWeek}
            onGoToGenerator={() => setActivePage('generator')}
          />
        )}

        {activePage === 'history' && (
          <HistoryLog
            history={history}
            onClearHistory={handleClearHistory}
            onDeleteEntry={handleDeleteHistoryEntry}
            onGoToGenerator={() => setActivePage('generator')}
          />
        )}

        {activePage === 'favourites' && (
          <FavouritesPage
            sessions={favouriteSessions}
            onLoad={handleLoadFavourite}
            onDelete={handleDeleteFavourite}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            onProfileChange={handleProfileChange}
            onSuppliesChange={handleSuppliesChange}
            userEmail={user?.email}
            onLoginClick={() => { setAuthInitialTab('login'); setShowAuth(true); }}
            onLogoutClick={handleLogout}
            showNewUserWelcome={isNewUser}
            onStartPlanning={handleStartPlanning}
            onToast={addToast}
          />
        )}

        {activePage === 'about' && (
          <AboutPage onBack={() => setActivePage('generator')} />
        )}

        {activePage === 'privacy' && (
          <PrivacyPage onBack={() => setActivePage('generator')} />
        )}
      </main>

      <Footer onNavigate={(page) => setActivePage(page)} />

      <Toast messages={toasts} onDismiss={removeToast} />
      <BackToTop />
      <FeedbackModal userEmail={user?.email} />
    </div>
  );
}
