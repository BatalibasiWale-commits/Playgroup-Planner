import { useState } from 'react';
import type { HistoryEntry } from '../types';
import { ACTIVITY_TYPE_CONFIG, AGE_GROUP_CONFIG, DAYS, DAY_COLORS } from '../types';

interface Props {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
  onGoToGenerator: () => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatWeekRange(mondayDate: string): string {
  const monday = new Date(mondayDate + 'T00:00:00');
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${friday.toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })}`;
}

export default function HistoryLog({ history, onClearHistory, onDeleteEntry, onGoToGenerator }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const sorted = [...history].sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-orange-700">🕐 History Log</h2>
          <p className="text-gray-500 text-sm mt-1">
            {history.length} archived {history.length === 1 ? 'week' : 'weeks'}
          </p>
        </div>
        {history.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Are you sure?</span>
                <button
                  onClick={() => { onClearHistory(); setConfirmClear(false); }}
                  className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
                >
                  Yes, clear all
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 border-2 border-red-200 transition-colors"
              >
                🗑 Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✨</div>
          <h3 style={{fontFamily:'Nunito,sans-serif',fontSize:20,fontWeight:900,color:'#374151',marginBottom:8}}>No sessions yet!</h3>
          <p style={{fontFamily:'Nunito,sans-serif',fontSize:14,color:'#9ca3af',marginBottom:20}}>Generate your first session to get started ✨</p>
          <button onClick={onGoToGenerator} style={{padding:'12px 28px',borderRadius:999,background:'linear-gradient(135deg,#f97316,#ec4899)',color:'#fff',fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,border:'none',cursor:'pointer'}}>
            Plan a Session ✨
          </button>
        </div>
      )}

      {/* History list */}
      <div className="space-y-4">
        {sorted.map((entry) => (
          <HistoryCard
            key={entry.id}
            entry={entry}
            expanded={expandedId === entry.id}
            onToggle={() =>
              setExpandedId(expandedId === entry.id ? null : entry.id)
            }
            onDelete={() => onDeleteEntry(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({
  entry,
  expanded,
  onToggle,
  onDelete,
}: {
  entry: HistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const completionPct =
    entry.totalCount > 0
      ? Math.round((entry.completedCount / entry.totalCount) * 100)
      : 0;

  const completionColor =
    completionPct >= 80
      ? 'bg-green-400'
      : completionPct >= 50
      ? 'bg-yellow-400'
      : 'bg-red-400';

  return (
    <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
      {/* Summary row */}
      <div className="flex items-stretch">
      <button
        onClick={onToggle}
        className="flex-1 text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="text-3xl">📅</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-800 text-base">
              Week of {formatWeekRange(entry.weekStartDate)}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Archived {formatDate(entry.archivedAt)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-bold text-sm text-gray-700">
              {entry.completedCount}/{entry.totalCount} done
            </div>
            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all ${completionColor}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className={`text-xs font-bold mt-0.5 ${
              completionPct >= 80 ? 'text-green-600' :
              completionPct >= 50 ? 'text-yellow-600' : 'text-red-500'
            }`}>
              {completionPct}%
            </div>
          </div>
          <span className="text-gray-400 shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Activity type chips */}
        {!expanded && entry.activitySnapshot.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {[...new Set(entry.activitySnapshot.map((a) => a.activityType))].map((type) => {
              const cfg = ACTIVITY_TYPE_CONFIG[type];
              return (
                <span key={type} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                  {cfg.emoji} {cfg.label}
                </span>
              );
            })}
          </div>
        )}
      </button>

      {/* Delete button area */}
      <div className="flex items-center px-3 py-4 border-l border-gray-100 shrink-0">
        {confirmDelete ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 whitespace-nowrap"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-2 py-1.5 rounded-lg bg-red-50 text-red-400 text-xs font-bold hover:bg-red-100 hover:text-red-500 transition-colors"
            title="Delete entry"
          >
            🗑
          </button>
        )}
      </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {DAYS.map(({ key, label }) => {
              const dayActivities = entry.weekPlan.days[key];
              const colors = DAY_COLORS[key];

              if (dayActivities.length === 0) {
                return (
                  <div key={key} className={`rounded-xl border-2 ${colors.border} overflow-hidden`}>
                    <div className={`${colors.header} px-3 py-1.5`}>
                      <span className="text-white text-xs font-black">{label}</span>
                    </div>
                    <div className={`${colors.bg} p-3 min-h-16 flex items-center justify-center`}>
                      <p className="text-xs text-gray-400">No activities</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className={`rounded-xl border-2 ${colors.border} overflow-hidden`}>
                  <div className={`${colors.header} px-3 py-1.5`}>
                    <span className="text-white text-xs font-black">{label}</span>
                  </div>
                  <div className={`${colors.bg} p-2 space-y-1.5`}>
                    {dayActivities.map(({ activityId, done }) => {
                      const activity = entry.activitySnapshot.find(
                        (a) => a.id === activityId,
                      );
                      if (!activity) return null;
                      const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];

                      return (
                        <div
                          key={activityId}
                          className={`bg-white rounded-lg p-2 border ${typeCfg.border} ${done ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className={`shrink-0 mt-0.5 ${done ? 'text-green-500' : 'text-gray-300'} text-xs`}>
                              {done ? '✅' : '⬜'}
                            </span>
                            <div>
                              <p className={`text-xs font-bold ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {activity.name}
                              </p>
                              <span className={`text-xs ${typeCfg.text}`}>
                                {typeCfg.emoji} {typeCfg.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity details */}
          {entry.activitySnapshot.length > 0 && (
            <div className="mt-4">
              <h4 className="font-bold text-gray-600 text-sm mb-3">
                📋 All Activities This Week
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {entry.activitySnapshot.map((activity) => {
                  const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
                  const wasPlanned = Object.values(entry.weekPlan.days).some((day) =>
                    day.some((da) => da.activityId === activity.id),
                  );
                  const wasDone = Object.values(entry.weekPlan.days).some((day) =>
                    day.some((da) => da.activityId === activity.id && da.done),
                  );

                  return (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-xl border-2 ${typeCfg.border} ${typeCfg.bg}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{typeCfg.emoji}</span>
                        <span className={`font-bold text-sm ${typeCfg.text}`}>
                          {activity.name}
                        </span>
                        {wasPlanned && (
                          <span className={`ml-auto text-xs font-bold ${wasDone ? 'text-green-600' : 'text-gray-400'}`}>
                            {wasDone ? '✅ Done' : '⏭ Skipped'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activity.ageGroups.map((ag) => {
                          const agCfg = AGE_GROUP_CONFIG[ag];
                          return (
                            <span key={ag} className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${agCfg.bg} ${agCfg.text}`}>
                              {agCfg.label}
                            </span>
                          );
                        })}
                        {activity.materials.slice(0, 2).map((m, i) => (
                          <span key={i} className="bg-white/70 text-gray-500 px-1.5 py-0.5 rounded-full text-xs">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

