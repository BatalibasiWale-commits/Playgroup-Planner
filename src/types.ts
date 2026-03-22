export type ActivityType =
  | 'arts-crafts'
  | 'sensory'
  | 'music-movement'
  | 'storytelling'
  | 'outdoor';

export type AgeGroup = '0-1' | '1-2' | '2-3' | '3-5' | '0-5';

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface NeuroAdaptations {
  sensory?: string | null;
  fineMotor?: string | null;
  attention?: string | null;
  autism?: string | null;
  adhd?: string | null;
  communication?: string | null;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  materials: string[];
  ageGroups: AgeGroup[];
  activityType: ActivityType;
  developmentalBenefits: string[];
  durationEstimate?: string;
  theme?: string;
  createdAt: string;
  bestAgeGroup?: string;
  ageAdaptations?: Record<string, string>;
  neuroAdaptations?: NeuroAdaptations;
}

export interface DayActivity {
  activityId: string;
  done: boolean;
}

export interface WeekPlan {
  id: string; // ISO date string of Monday (YYYY-MM-DD)
  days: Record<DayKey, DayActivity[]>;
}

export interface HistoryEntry {
  id: string;
  weekStartDate: string;
  archivedAt: string;
  completedCount: number;
  totalCount: number;
  activitySnapshot: Activity[];
  weekPlan: WeekPlan;
}

export type Page = 'generator' | 'library' | 'planner' | 'history' | 'favourites' | 'profile' | 'about' | 'privacy';

export interface Profile {
  playgroupName: string;
  hostName: string;
  ageRange: AgeGroup | '';
  groupSize: number;
  neuroAdaptations?: boolean;
}

export interface FavouriteSession {
  id: string;
  name: string;
  theme: string;
  ageGroup: AgeGroup;
  duration: number;
  weather: string;
  attendance: { count: number; ageNote: string };
  activities: Activity[];
  notes: string;
  createdAt: string;
}

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
];

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; emoji: string; color: string; bg: string; border: string; text: string }
> = {
  'arts-crafts': {
    label: 'Arts & Crafts',
    emoji: '🎨',
    color: 'pink',
    bg: 'bg-pink-100',
    border: 'border-pink-300',
    text: 'text-pink-700',
  },
  sensory: {
    label: 'Sensory',
    emoji: '🌊',
    color: 'blue',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
  },
  'music-movement': {
    label: 'Music & Movement',
    emoji: '🎵',
    color: 'purple',
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
  },
  storytelling: {
    label: 'Storytelling',
    emoji: '📚',
    color: 'orange',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    text: 'text-orange-700',
  },
  outdoor: {
    label: 'Outdoor',
    emoji: '🌿',
    color: 'green',
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-700',
  },
};

export const AGE_GROUP_CONFIG: Record<
  AgeGroup,
  { label: string; bg: string; text: string }
> = {
  '0-1': { label: '0–1 yrs', bg: 'bg-yellow-200', text: 'text-yellow-800' },
  '1-2': { label: '1–2 yrs', bg: 'bg-orange-200', text: 'text-orange-800' },
  '2-3': { label: '2–3 yrs', bg: 'bg-red-200', text: 'text-red-800' },
  '3-5': { label: '3–5 yrs', bg: 'bg-purple-200', text: 'text-purple-800' },
  '0-5': { label: '0–5 yrs', bg: 'bg-violet-100', text: 'text-violet-700' },
};

export const DAY_COLORS: Record<DayKey, { header: string; border: string; bg: string }> = {
  monday: { header: 'bg-rose-400', border: 'border-rose-300', bg: 'bg-rose-50' },
  tuesday: { header: 'bg-orange-400', border: 'border-orange-300', bg: 'bg-orange-50' },
  wednesday: { header: 'bg-yellow-400', border: 'border-yellow-300', bg: 'bg-yellow-50' },
  thursday: { header: 'bg-teal-400', border: 'border-teal-300', bg: 'bg-teal-50' },
  friday: { header: 'bg-violet-400', border: 'border-violet-300', bg: 'bg-violet-50' },
};
