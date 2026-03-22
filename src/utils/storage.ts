import type { Activity, WeekPlan, HistoryEntry, FavouriteSession, Profile } from '../types';

export interface CurrentSession {
  theme: string;
  ageGroup: string;
  duration: number;
  weather: string;
  materials: string;
  attendanceCount: number;
  activities: Activity[];
  notes: string;
  savedIds: string[];
}

const KEYS = {
  activities: 'pg_activities',
  weekPlans: 'pg_week_plans',
  history: 'pg_history',
  favourites: 'pg_favourites',
  profile: 'pg_profile',
  supplies: 'pg_supplies',
  currentSession: 'pg_current_session',
  checkedMaterials: 'pg_checked_materials',
} as const;

function getMondayDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function emptyWeekPlan(mondayDate: string): WeekPlan {
  return {
    id: mondayDate,
    days: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
    },
  };
}

function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getActivities(): Activity[] {
    return getJson<Activity[]>(KEYS.activities, []);
  },
  saveActivities(activities: Activity[]): void {
    setJson(KEYS.activities, activities);
  },

  getWeekPlans(): Record<string, WeekPlan> {
    return getJson<Record<string, WeekPlan>>(KEYS.weekPlans, {});
  },
  getOrCreateWeekPlan(mondayDate: string): WeekPlan {
    const plans = storage.getWeekPlans();
    return plans[mondayDate] ?? emptyWeekPlan(mondayDate);
  },
  saveWeekPlan(plan: WeekPlan): void {
    const plans = storage.getWeekPlans();
    plans[plan.id] = plan;
    setJson(KEYS.weekPlans, plans);
  },

  getCurrentMondayDate(): string {
    return getMondayDate();
  },

  getHistory(): HistoryEntry[] {
    return getJson<HistoryEntry[]>(KEYS.history, []);
  },
  saveHistory(history: HistoryEntry[]): void {
    setJson(KEYS.history, history);
  },

  getProfile(): Profile {
    return getJson<Profile>(KEYS.profile, { playgroupName: '', hostName: '', ageRange: '', groupSize: 8 });
  },
  saveProfile(profile: Profile): void {
    setJson(KEYS.profile, profile);
  },

  getSupplies(): string[] {
    return getJson<string[]>(KEYS.supplies, []);
  },
  saveSupplies(supplies: string[]): void {
    setJson(KEYS.supplies, supplies);
  },

  getFavouriteSessions(): FavouriteSession[] {
    return getJson<FavouriteSession[]>(KEYS.favourites, []);
  },
  saveFavouriteSession(session: FavouriteSession): void {
    const sessions = storage.getFavouriteSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    setJson(KEYS.favourites, sessions);
  },
  deleteFavouriteSession(id: string): void {
    const sessions = storage.getFavouriteSessions().filter((s) => s.id !== id);
    setJson(KEYS.favourites, sessions);
  },

  getCurrentSession(): CurrentSession | null {
    try {
      const raw = sessionStorage.getItem(KEYS.currentSession);
      if (!raw) return null;
      return JSON.parse(raw) as CurrentSession;
    } catch {
      return null;
    }
  },
  saveCurrentSession(session: CurrentSession): void {
    sessionStorage.setItem(KEYS.currentSession, JSON.stringify(session));
  },
  clearCurrentSession(): void {
    sessionStorage.removeItem(KEYS.currentSession);
  },

  getCheckedMaterials(): string[] {
    return getJson<string[]>(KEYS.checkedMaterials, []);
  },
  saveCheckedMaterials(items: string[]): void {
    setJson(KEYS.checkedMaterials, items);
  },
  clearCheckedMaterials(): void {
    localStorage.removeItem(KEYS.checkedMaterials);
  },
};

export { getMondayDate };
