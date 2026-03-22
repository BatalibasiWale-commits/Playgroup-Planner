import { useState } from 'react';
import type { FavouriteSession } from '../types';
import { ACTIVITY_TYPE_CONFIG } from '../types';

interface Props {
  sessions: FavouriteSession[];
  onLoad: (session: FavouriteSession) => void;
  onDelete: (id: string) => void;
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: '☀️ Sunny',
  cloudy: '⛅ Cloudy',
  rainy: '🌧️ Rainy',
  hot: '🔥 Hot',
  cold: '❄️ Cold',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FavouritesPage({ sessions, onLoad, onDelete }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-orange-700">⭐ Favourite Sessions</h2>
        <p className="text-gray-500 text-sm mt-1">
          {sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'} — load any to revisit it in the generator
        </p>
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">No favourites yet!</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            No favourites yet — save activities you love and they'll appear here! ⭐
          </p>
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((session) => {
          const typeKeys = [...new Set(session.activities.map((a) => a.activityType))];
          const isExpanded = expandedId === session.id;
          const isConfirmDelete = confirmDeleteId === session.id;

          return (
            <div
              key={session.id}
              className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-gray-800 text-lg leading-tight">
                        {session.name}
                      </h3>
                      {session.weather && (
                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-200">
                          {WEATHER_LABELS[session.weather]}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-500 text-sm">
                      🎭 {session.theme} · ⏱ {session.duration} min · 📅 {formatDate(session.createdAt)}
                    </p>

                    {session.attendance.count > 0 && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        👧 {session.attendance.count} children
                        {session.attendance.ageNote ? ` · ${session.attendance.ageNote}` : ''}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {typeKeys.map((type) => {
                        const cfg = ACTIVITY_TYPE_CONFIG[type];
                        return (
                          <span
                            key={type}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.emoji} {cfg.label}
                          </span>
                        );
                      })}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {session.activities.length} activities
                      </span>
                    </div>

                    {session.notes && (
                      <p className="text-gray-400 text-xs mt-2 italic line-clamp-2">
                        📝 "{session.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => onLoad(session)}
                      className="px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow"
                      style={{ minHeight: 44 }}
                    >
                      📂 Load
                    </button>
                    {isConfirmDelete ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            onDelete(session.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(session.id)}
                        className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 border-2 border-red-200 transition-colors"
                        style={{ minHeight: 44 }}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="mt-1 text-sm text-orange-500 font-semibold hover:text-orange-700 transition-colors py-2.5 -mb-1.5 pr-2"
                >
                  {isExpanded
                    ? '▲ Hide activities'
                    : `▼ View ${session.activities.length} activities`}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  {(Object.keys(ACTIVITY_TYPE_CONFIG) as (keyof typeof ACTIVITY_TYPE_CONFIG)[]).map(
                    (type) => {
                      const acts = session.activities.filter((a) => a.activityType === type);
                      if (acts.length === 0) return null;
                      const cfg = ACTIVITY_TYPE_CONFIG[type];
                      return (
                        <div key={type} className="mb-4 last:mb-0">
                          <div className={`flex items-center gap-2 mb-2 pb-1 border-b-2 ${cfg.border}`}>
                            <span>{cfg.emoji}</span>
                            <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <div className="space-y-2">
                            {acts.map((a) => (
                              <div key={a.id} className={`p-3 rounded-xl ${cfg.bg}`}>
                                <p className={`font-bold text-sm ${cfg.text}`}>{a.name}</p>
                                <p className="text-gray-600 text-xs mt-0.5">{a.description}</p>
                                {a.materials.length > 0 && (
                                  <p className="text-gray-400 text-xs mt-1">
                                    Materials: {a.materials.join(', ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}

                  {session.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                      <p className="text-xs font-bold text-yellow-800 mb-1">📝 Session Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
