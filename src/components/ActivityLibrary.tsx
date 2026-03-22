import { useState } from 'react';
import type { Activity, ActivityType, AgeGroup, DayKey } from '../types';
import { ACTIVITY_TYPE_CONFIG, AGE_GROUP_CONFIG, DAYS } from '../types';

interface Props {
  activities: Activity[];
  onDelete: (id: string) => void;
  onAddToWeek: (activityId: string, day: DayKey) => void;
  onGoToGenerator?: () => void;
}

const TYPE_FILTERS: { value: ActivityType | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All Types', emoji: '🎯' },
  { value: 'arts-crafts', label: 'Arts & Crafts', emoji: '🎨' },
  { value: 'sensory', label: 'Sensory', emoji: '🌊' },
  { value: 'music-movement', label: 'Music & Movement', emoji: '🎵' },
  { value: 'storytelling', label: 'Storytelling', emoji: '📚' },
  { value: 'outdoor', label: 'Outdoor', emoji: '🌿' },
];

const AGE_FILTERS: { value: AgeGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All Ages' },
  { value: '0-1', label: '0–1 yrs' },
  { value: '1-2', label: '1–2 yrs' },
  { value: '2-3', label: '2–3 yrs' },
  { value: '3-5', label: '3–5 yrs' },
];

export default function ActivityLibrary({ activities, onDelete, onAddToWeek, onGoToGenerator }: Props) {
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [filterAge, setFilterAge] = useState<AgeGroup | 'all'>('all');
  const [addingTo, setAddingTo] = useState<string | null>(null); // activityId being added

  const filtered = activities.filter((a) => {
    if (filterType !== 'all' && a.activityType !== filterType) return false;
    if (filterAge !== 'all' && !a.ageGroups.includes(filterAge)) return false;
    return true;
  });

  function handleAddToWeek(activityId: string, day: DayKey) {
    onAddToWeek(activityId, day);
    setAddingTo(null);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-orange-700">📖 Activity Library</h2>
        <p className="text-gray-500 text-sm mt-1">
          {activities.length} saved {activities.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-orange-100 p-4 mb-6">
        <div className="mb-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Filter by Type
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  filterType === value
                    ? 'bg-orange-100 text-orange-700 border-orange-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Filter by Age
          </p>
          <div className="flex flex-wrap gap-2">
            {AGE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterAge(value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  filterAge === value
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <h3 style={{fontFamily:'Nunito,sans-serif',fontSize:20,fontWeight:900,color:'#374151',marginBottom:8}}>Your library is empty!</h3>
          <p style={{fontFamily:'Nunito,sans-serif',fontSize:14,color:'#9ca3af',marginBottom:20,maxWidth:360,margin:'0 auto 20px'}}>
            Your library is empty — save activities from your generated sessions to build your collection! 📚
          </p>
          {onGoToGenerator && (
            <button onClick={onGoToGenerator} style={{padding:'12px 28px',borderRadius:999,background:'linear-gradient(135deg,#f97316,#ec4899)',color:'#fff',fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,border:'none',cursor:'pointer'}}>
              Plan a Session ✨
            </button>
          )}
        </div>
      )}

      {/* No results */}
      {activities.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-500 font-semibold">No activities match your filters.</p>
          <button
            onClick={() => { setFilterType('all'); setFilterAge('all'); }}
            className="mt-3 text-orange-500 text-sm font-semibold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Activity grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onDelete={() => onDelete(activity.id)}
            onAddToWeekClick={() => setAddingTo(activity.id)}
          />
        ))}
      </div>

      {/* Add to Week Modal */}
      {addingTo && (
        <AddToWeekModal
          activityName={activities.find((a) => a.id === addingTo)?.name ?? ''}
          onSelect={(day) => handleAddToWeek(addingTo, day)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  onDelete,
  onAddToWeekClick,
}: {
  activity: Activity;
  onDelete: () => void;
  onAddToWeekClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeCfg = ACTIVITY_TYPE_CONFIG[activity.activityType];

  return (
    <div className={`bg-white rounded-2xl shadow-md border-2 ${typeCfg.border} overflow-hidden flex flex-col`}>
      {/* Color header */}
      <div className={`${typeCfg.bg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeCfg.emoji}</span>
          <span className={`text-xs font-bold ${typeCfg.text}`}>{typeCfg.label}</span>
        </div>
        {activity.theme && (
          <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full text-gray-600">
            {activity.theme}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* Title & age groups */}
        <h4 className="font-black text-gray-800 text-base mb-1">{activity.name}</h4>
        <div className="flex flex-wrap gap-1 mb-2">
          {activity.ageGroups.map((ag) => {
            const agCfg = AGE_GROUP_CONFIG[ag];
            return (
              <span key={ag} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${agCfg.bg} ${agCfg.text}`}>
                {agCfg.label}
              </span>
            );
          })}
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{activity.description}</p>

        {/* Materials */}
        <div className="flex flex-wrap gap-1 mb-3">
          {activity.materials.slice(0, 3).map((m, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {m}
            </span>
          ))}
          {activity.materials.length > 3 && (
            <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-xs">
              +{activity.materials.length - 3}
            </span>
          )}
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs font-semibold ${typeCfg.text} hover:underline mb-1 text-left py-2.5 -my-1 pr-2`}
        >
          {expanded ? '▲ Less detail' : '▼ Full instructions & benefits'}
        </button>

        {expanded && (
          <div className="space-y-3 mb-3">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Instructions
              </p>
              <ol className="space-y-1">
                {activity.instructions.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className={`shrink-0 w-4 h-4 ${typeCfg.bg} ${typeCfg.text} rounded-full flex items-center justify-center text-xs font-bold`}>
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Benefits
              </p>
              <ul className="space-y-0.5">
                {activity.developmentalBenefits.map((b, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="text-green-500 shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={onAddToWeekClick}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
            style={{ minHeight: 44 }}
          >
            📅 Add to Week
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddToWeekModal({
  activityName,
  onSelect,
  onClose,
}: {
  activityName: string;
  onSelect: (day: DayKey) => void;
  onClose: () => void;
}) {
  const DAY_EMOJIS: Record<DayKey, string> = {
    monday: '🌅',
    tuesday: '🌤',
    wednesday: '☀️',
    thursday: '🌻',
    friday: '🎉',
  };

  const DAY_COLORS: Record<DayKey, string> = {
    monday: 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-700',
    tuesday: 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700',
    wednesday: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-700',
    thursday: 'bg-teal-100 hover:bg-teal-200 border-teal-300 text-teal-700',
    friday: 'bg-violet-100 hover:bg-violet-200 border-violet-300 text-violet-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
      style={{ paddingTop: 'max(40px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black text-gray-800 mb-1">📅 Add to Week</h3>
        <p className="text-sm text-gray-500 mb-4">
          Which day should <strong>{activityName}</strong> go on?
        </p>

        <div className="grid grid-cols-1 gap-2 mb-4">
          {DAYS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${DAY_COLORS[key]}`}
            >
              <span className="text-xl">{DAY_EMOJIS[key]}</span>
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
