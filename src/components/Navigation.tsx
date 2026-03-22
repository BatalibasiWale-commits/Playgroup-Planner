import type { Page } from '../types';

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  userEmail?: string | null;
  displayName?: string | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const NAV_ITEMS: { page: Page; label: string; emoji: string; short: string }[] = [
  { page: 'generator',  label: 'Plan Session',     emoji: '✨', short: 'Plan'    },
  { page: 'library',    label: 'Activity Library',  emoji: '📖', short: 'Library' },
  { page: 'planner',    label: 'Weekly Planner',    emoji: '📅', short: 'Planner' },
  { page: 'history',    label: 'History Log',       emoji: '🕐', short: 'History' },
  { page: 'favourites', label: 'Favourites',        emoji: '⭐', short: 'Favs'    },
  { page: 'profile',    label: 'Profile',           emoji: '👤', short: 'Profile' },
];

export default function Navigation({ activePage, onNavigate, userEmail, displayName, onLoginClick, onLogoutClick }: Props) {
  function handleNavClick(page: Page) {
    onNavigate(page);
  }

  return (
    <>
      {/* ── Gradient header bar ── */}
      <nav className="relative z-30 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500 shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">

          {/* Header row */}
          <div className="flex items-center justify-between py-2.5 sm:py-3">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl">🌟</span>
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none">
                  Playgroup Planner
                </h1>
                <p className="hidden sm:block text-orange-100 text-xs font-medium">
                  Activities for little ones 0–5 years
                </p>
              </div>
            </div>

            {/* Account area */}
            <div className="flex items-center gap-2">
              {userEmail ? (
                <div className="flex items-center gap-2">
                  <div
                    className="hidden sm:flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5"
                    title={userEmail}
                  >
                    <span className="text-base">☁️</span>
                    <span className="text-white text-xs font-bold max-w-[140px] truncate">
                      {displayName || userEmail}
                    </span>
                  </div>
                  <button
                    onClick={onLogoutClick}
                    className="flex items-center gap-1 bg-white/15 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 text-white text-sm font-black px-3 sm:px-4 py-2 rounded-full transition-all shadow-sm"
                >
                  <span>☁️</span>
                  <span>Log in</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop tab bar — hidden on mobile */}
          <div className="hidden sm:flex gap-1.5 pb-2.5 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(({ page, label, emoji }) => (
              <button
                key={page}
                onClick={() => handleNavClick(page)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                  activePage === page
                    ? 'bg-white text-orange-600 shadow-md font-black'
                    : 'text-white/85 hover:bg-white/25 hover:text-white'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

        </div>
      </nav>

      {/* ── Mobile bottom navigation bar ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 no-print"
        style={{
          boxShadow: '0 -2px 16px rgba(0,0,0,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255,255,255,0.97)',
        }}
      >
        <div className="flex">
          {NAV_ITEMS.map(({ page, emoji, short }) => {
            const isActive = activePage === page;
            return (
              <button
                key={page}
                onClick={() => handleNavClick(page)}
                className="flex-1 flex flex-col items-center justify-center gap-px relative"
                style={{ minHeight: 56, paddingTop: 8, paddingBottom: 6 }}
              >
                {/* Active indicator bar at top */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{
                      width: 28,
                      height: 3,
                      background: 'linear-gradient(90deg, #f97316, #ec4899)',
                    }}
                  />
                )}
                <span
                  className="text-xl leading-none"
                  style={{
                    transform: isActive ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    display: 'block',
                  }}
                >
                  {emoji}
                </span>
                <span
                  className="font-bold leading-none"
                  style={{
                    fontSize: 9,
                    color: isActive ? '#f97316' : '#9ca3af',
                    marginTop: 2,
                  }}
                >
                  {short}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
