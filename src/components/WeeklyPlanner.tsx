import { useState } from 'react';
import type { Activity, DayKey, WeekPlan } from '../types';
import { ACTIVITY_TYPE_CONFIG, DAYS, DAY_COLORS } from '../types';

interface Props {
  activities: Activity[];
  weekPlan: WeekPlan;
  onUpdateWeekPlan: (plan: WeekPlan) => void;
  onArchiveWeek: () => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToGenerator?: () => void;
}

function formatWeekRange(mondayDate: string): string {
  const monday = new Date(mondayDate + 'T00:00:00');
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${friday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function getTodayDayKey(): DayKey | null {
  const day = new Date().getDay();
  const map: Record<number, DayKey> = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday',
  };
  return map[day] ?? null;
}

function isCurrentWeek(mondayDate: string): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday.toISOString().split('T')[0] === mondayDate;
}

export default function WeeklyPlanner({
  activities,
  weekPlan,
  onUpdateWeekPlan,
  onArchiveWeek,
  onNavigateWeek,
  onGoToGenerator,
}: Props) {
  const [addingToDay, setAddingToDay] = useState<DayKey | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const todayKey = getTodayDayKey();
  const isCurrent = isCurrentWeek(weekPlan.id);

  function toggleDone(day: DayKey, activityId: string) {
    const updated: WeekPlan = {
      ...weekPlan,
      days: {
        ...weekPlan.days,
        [day]: weekPlan.days[day].map((da) =>
          da.activityId === activityId ? { ...da, done: !da.done } : da,
        ),
      },
    };
    onUpdateWeekPlan(updated);
  }

  function removeFromDay(day: DayKey, activityId: string) {
    const updated: WeekPlan = {
      ...weekPlan,
      days: {
        ...weekPlan.days,
        [day]: weekPlan.days[day].filter((da) => da.activityId !== activityId),
      },
    };
    onUpdateWeekPlan(updated);
  }

  function addActivity(day: DayKey, activityId: string) {
    // Don't add duplicates
    if (weekPlan.days[day].some((da) => da.activityId === activityId)) return;
    const updated: WeekPlan = {
      ...weekPlan,
      days: {
        ...weekPlan.days,
        [day]: [...weekPlan.days[day], { activityId, done: false }],
      },
    };
    onUpdateWeekPlan(updated);
    setAddingToDay(null);
  }

  const totalActivities = DAYS.reduce((sum, { key }) => sum + weekPlan.days[key].length, 0);
  const doneActivities = DAYS.reduce(
    (sum, { key }) => sum + weekPlan.days[key].filter((da) => da.done).length,
    0,
  );

  // Activities not yet in the selected day
  function availableForDay(day: DayKey) {
    const inDay = new Set(weekPlan.days[day].map((da) => da.activityId));
    return activities.filter((a) => !inDay.has(a.id));
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h2 className="text-2xl font-black text-orange-700">📅 Weekly Planner</h2>
          <p className="text-gray-500 text-sm mt-1">
            Plan and track activities for each day
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col items-start gap-0.5">
            <button
              onClick={() => setShowPrintView(!showPrintView)}
              className="px-4 py-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm hover:bg-blue-200 transition-colors border-2 border-blue-200"
              style={{ minHeight: 44 }}
            >
              🖨 {showPrintView ? 'Edit View' : 'Print View'}
            </button>
            <span className="sm:hidden text-[10px] text-gray-400 font-medium pl-1">💡 Best on desktop</span>
          </div>
          {totalActivities > 0 && (
            <button
              onClick={onArchiveWeek}
              className="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-700 font-bold text-sm hover:bg-purple-200 transition-colors border-2 border-purple-200"
              style={{ minHeight: 44 }}
            >
              📦 Archive Week
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-orange-100 p-4 mb-6 no-print">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigateWeek('prev')}
            className="p-3 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 font-bold"
            style={{ minHeight: 44 }}
          >
            ← Prev
          </button>

          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              {isCurrent && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  This Week
                </span>
              )}
              <span className="font-black text-gray-700 text-lg">
                {formatWeekRange(weekPlan.id)}
              </span>
            </div>
            {totalActivities > 0 && (
              <div className="mt-1">
                <span className="text-sm text-gray-500">
                  {doneActivities}/{totalActivities} activities done
                </span>
                <div className="w-32 mx-auto mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${totalActivities ? (doneActivities / totalActivities) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateWeek('next')}
            className="p-3 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 font-bold"
            style={{ minHeight: 44 }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Print header */}
      {showPrintView && (
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-black">Playgroup Planner</h1>
          <p className="text-lg">{formatWeekRange(weekPlan.id)}</p>
        </div>
      )}

      {/* Day columns */}
      <div className={`grid gap-4 ${showPrintView ? 'grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
        {DAYS.map(({ key, label }) => {
          const dayActivities = weekPlan.days[key];
          const colors = DAY_COLORS[key];
          const isToday = isCurrent && todayKey === key;

          return (
            <div
              key={key}
              className={`rounded-2xl overflow-hidden border-2 ${colors.border} ${isToday ? 'ring-4 ring-offset-2 ring-yellow-300' : ''}`}
            >
              {/* Day header */}
              <div className={`${colors.header} px-3 py-2 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-sm">{label}</span>
                  {isToday && (
                    <span className="bg-white/30 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-white/80 text-xs font-semibold">
                  {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>

              {/* Day body */}
              <div className={`${colors.bg} p-3 min-h-32 flex flex-col gap-2`}>
                {dayActivities.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-gray-400 text-center">No activities yet</p>
                  </div>
                )}

                {dayActivities.map(({ activityId, done }) => {
                  const activity = activities.find((a) => a.id === activityId);
                  if (!activity) return null;
                  const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];

                  return (
                    <div
                      key={activityId}
                      className={`bg-white rounded-xl p-3 border-2 ${typeCfg.border} transition-all ${done ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!showPrintView && (
                          <button
                            onClick={() => toggleDone(key, activityId)}
                            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                              done
                                ? 'bg-green-400 border-green-400 text-white'
                                : `border-current ${typeCfg.text} hover:opacity-70`
                            }`}
                            style={{ minWidth: 24 }}
                          >
                            {done && <span className="text-xs">✓</span>}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs">{typeCfg.emoji}</span>
                            <span className={`text-xs font-bold ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {activity.name}
                            </span>
                          </div>
                          {!showPrintView && (
                            <div className="flex flex-wrap gap-1">
                              {activity.ageGroups.map((ag) => (
                                <span key={ag} className="text-xs text-gray-400">
                                  {ag}y
                                </span>
                              ))}
                            </div>
                          )}
                          {showPrintView && (
                            <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                          )}
                        </div>
                        {!showPrintView && (
                          <button
                            onClick={() => removeFromDay(key, activityId)}
                            className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-sm p-1.5 -m-1 rounded-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {done && !showPrintView && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-green-600 font-semibold">✅ Done!</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add activity button */}
                {!showPrintView && activities.length > 0 && (
                  <button
                    onClick={() => setAddingToDay(key)}
                    className={`mt-1 w-full py-2 rounded-xl border-2 border-dashed ${colors.border} text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-all`}
                  >
                    + Add Activity
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty library note */}
      {activities.length === 0 && (
        <div className="mt-6 text-center bg-white rounded-2xl p-8 border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-3">📅</div>
          <h3 style={{fontFamily:'Nunito,sans-serif',fontSize:18,fontWeight:900,color:'#374151',marginBottom:8}}>Nothing planned yet!</h3>
          <p style={{fontFamily:'Nunito,sans-serif',fontSize:14,color:'#9ca3af',marginBottom:20,maxWidth:360,margin:'0 auto 20px'}}>
            Nothing planned yet — add activities from your generated sessions to build your week! 📅
          </p>
          {onGoToGenerator && (
            <button onClick={onGoToGenerator} style={{padding:'12px 28px',borderRadius:999,background:'linear-gradient(135deg,#f97316,#ec4899)',color:'#fff',fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,border:'none',cursor:'pointer'}}>
              Plan a Session ✨
            </button>
          )}
        </div>
      )}

      {/* Add Activity Modal */}
      {addingToDay && (
        <AddActivityModal
          day={addingToDay}
          availableActivities={availableForDay(addingToDay)}
          onAdd={(actId) => addActivity(addingToDay, actId)}
          onClose={() => setAddingToDay(null)}
        />
      )}
    </div>
  );
}

function AddActivityModal({
  day,
  availableActivities,
  onAdd,
  onClose,
}: {
  day: DayKey;
  availableActivities: Activity[];
  onAdd: (actId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const dayLabel = DAYS.find((d) => d.key === day)?.label ?? day;

  const filtered = availableActivities.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.activityType.toLowerCase().includes(search.toLowerCase()) ||
      (a.theme ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
      style={{ paddingTop: 'max(40px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-800">
            Add Activity to {dayLabel}
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="mt-3 w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">
                {availableActivities.length === 0
                  ? 'All activities are already in this day.'
                  : 'No matching activities.'}
              </p>
            </div>
          )}
          {filtered.map((activity) => {
            const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
            return (
              <button
                key={activity.id}
                onClick={() => onAdd(activity.id)}
                className={`w-full text-left p-3 rounded-xl border-2 ${typeCfg.border} ${typeCfg.bg} hover:opacity-80 transition-all`}
              >
                <div className="flex items-center gap-2">
                  <span>{typeCfg.emoji}</span>
                  <div>
                    <p className={`font-bold text-sm ${typeCfg.text}`}>{activity.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{activity.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
