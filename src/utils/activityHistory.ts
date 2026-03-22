import { supabase } from '../lib/supabase';
import { dbSave } from './db';

const SESSION_STORAGE_KEY = 'pg_theme_history';
const DB_KEY = 'theme_activity_history';
const MAX_TITLES_PER_THEME = 50;

interface ThemeEntry {
  theme: string;   // normalised: lowercase, trimmed
  titles: string[];
}

function normalise(theme: string): string {
  return theme.toLowerCase().trim();
}

// "Easter" matches "Easter Bunny", "easter 2025", etc.
function themesMatch(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

async function loadHistory(userId?: string): Promise<ThemeEntry[]> {
  if (userId && supabase) {
    const { data } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .eq('key', DB_KEY)
      .maybeSingle();
    if (data?.data) return data.data as ThemeEntry[];
    return [];
  }
  // Guest users: sessionStorage (scoped to the current browser session)
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveHistory(history: ThemeEntry[], userId?: string): Promise<void> {
  if (userId && supabase) {
    await dbSave(userId, DB_KEY, history);
  } else {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // sessionStorage quota exceeded — silently skip
    }
  }
}

/**
 * Returns up to MAX_TITLES_PER_THEME past activity titles for themes that
 * loosely match the given theme (case-insensitive substring match).
 */
export async function getPastActivityTitles(
  theme: string,
  userId?: string,
): Promise<string[]> {
  const norm = normalise(theme);
  const history = await loadHistory(userId);

  const seen = new Set<string>();
  const titles: string[] = [];

  for (const entry of history) {
    if (!themesMatch(entry.theme, norm)) continue;
    for (const t of entry.titles) {
      const key = t.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        titles.push(t);
      }
      if (titles.length >= MAX_TITLES_PER_THEME) return titles;
    }
  }

  return titles;
}

/**
 * Saves the generated activity titles for a theme.
 * Newest titles are prepended; duplicates removed; capped at MAX_TITLES_PER_THEME.
 */
export async function saveActivityTitles(
  theme: string,
  titles: string[],
  userId?: string,
): Promise<void> {
  if (titles.length === 0) return;
  const norm = normalise(theme);
  const history = await loadHistory(userId);

  const idx = history.findIndex((e) => e.theme === norm);
  if (idx >= 0) {
    const merged = [...titles, ...history[idx].titles];
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const t of merged) {
      const key = t.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(t);
      }
      if (deduped.length >= MAX_TITLES_PER_THEME) break;
    }
    history[idx] = { theme: norm, titles: deduped };
  } else {
    history.unshift({ theme: norm, titles: titles.slice(0, MAX_TITLES_PER_THEME) });
  }

  await saveHistory(history, userId);
}
