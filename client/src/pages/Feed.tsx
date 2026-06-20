import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { FeedItem } from '../types';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {item.photo_url && (
        <img src={item.photo_url} alt={item.mountain_name} className="w-full h-52 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/users/${item.user_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {item.user_avatar_url ? (
              <img src={item.user_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">👤</div>
            )}
            <span className="text-sm font-medium text-white">{item.user_name}</span>
          </Link>
          <span className="text-gray-600 text-xs ml-auto">{fmtDate(item.climb_date)}</span>
        </div>

        <Link to={`/climbs/${item.id}`} className="block group">
          <div className="text-white font-semibold text-base group-hover:text-sky-400 transition-colors">
            {item.mountain_name}
          </div>
          <div className="text-emerald-400 text-sm font-medium">{item.elevation.toLocaleString()} ft · {item.range}</div>
        </Link>

        {item.notes && (
          <p className="text-gray-400 text-sm mt-2 leading-relaxed line-clamp-3">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: 'following' | 'discover' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">⛰️</div>
      {tab === 'following' ? (
        <>
          <h3 className="text-white font-semibold mb-1">No climbs from people you follow</h3>
          <p className="text-gray-500 text-sm">Find climbers on the Discover tab</p>
        </>
      ) : (
        <>
          <h3 className="text-white font-semibold mb-1">No public climbs yet</h3>
          <p className="text-gray-500 text-sm">Be the first to log a public climb</p>
        </>
      )}
    </div>
  );
}

export default function Feed() {
  const [tab, setTab] = useState<'following' | 'discover'>('discover');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const fetch = tab === 'following' ? api.feed.following : api.feed.discover;
    fetch().then(data => { setItems(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [tab]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Activity</h1>

      {/* Tabs */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(['discover', 'following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'discover' ? 'Discover' : 'Following'}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-900 border border-gray-800 rounded-xl h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
          {items.map(item => <FeedCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
