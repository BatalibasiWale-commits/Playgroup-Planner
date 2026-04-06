import { useState, useEffect } from 'react';

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  alt_description: string | null;
  links: { html: string };
  user: { name: string; links: { html: string } };
}

interface Props {
  activityName: string;
  activityType: string;
  onClose: () => void;
}

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;

// Words too generic to help Unsplash find relevant results
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'with', 'in', 'on', 'at',
  'fun', 'session', 'time', 'day', 'our', 'your', 'my', 'activity', 'game',
  'making', 'magic', 'magical', 'wonderful', 'amazing', 'super', 'little',
]);

// Type-specific anchor terms that guide Unsplash toward the right kind of photo
const TYPE_ANCHORS: Record<string, string> = {
  'arts-crafts':    'kids craft preschool DIY',
  'sensory':        'sensory play toddler bin',
  'music-movement': 'kids movement dance preschool',
  'storytelling':   'kids storytelling preschool',
  'outdoor':        'kids outdoor nature play',
};

function buildQuery(activityName: string, activityType: string): string {
  const anchor = TYPE_ANCHORS[activityType] ?? 'kids activity preschool';
  const nameWords = activityName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 3);
  return `${nameWords.join(' ')} ${anchor}`.trim();
}

export default function PhotoModal({ activityName, activityType, onClose }: Props) {
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ACCESS_KEY) {
      setError('Unsplash API key not configured.');
      setLoading(false);
      return;
    }

    const query = buildQuery(activityName, activityType);
    fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&client_id=${ACCESS_KEY}`,
    )
      .then((r) => r.json())
      .then((data: { results: UnsplashPhoto[] }) => {
        if (!data.results || data.results.length === 0) {
          setError('No photos found for this activity.');
        } else {
          setPhotos(data.results);
        }
      })
      .catch(() => setError('Could not load photos. Please try again.'))
      .finally(() => setLoading(false));
  }, [activityName, activityType]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 24,
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#374151' }}>
              📸 Visual Examples
            </h3>
            <p style={{ margin: '2px 0 0', fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>
              {activityName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer',
              fontSize: 18, lineHeight: 1, color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: '#9ca3af', fontWeight: 700, margin: 0 }}>
                Finding photos...
              </p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>😔</div>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: '#9ca3af', fontWeight: 700, margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}>
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`${photo.links.html}?utm_source=playgroup_planner&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Photo by ${photo.user.name} on Unsplash`}
                    style={{ display: 'block', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: '#f3f4f6' }}
                  >
                    <img
                      src={photo.urls.small}
                      alt={photo.alt_description ?? activityName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>

              {/* Unsplash attribution — required by their API guidelines */}
              <p style={{
                marginTop: 14, marginBottom: 0,
                fontFamily: 'Nunito, sans-serif', fontSize: 11,
                color: '#d1d5db', textAlign: 'center', fontWeight: 600,
              }}>
                Photos from{' '}
                <a
                  href="https://unsplash.com/?utm_source=playgroup_planner&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#9ca3af' }}
                >
                  Unsplash
                </a>
                {' '}· Click a photo to view photographer credit
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
