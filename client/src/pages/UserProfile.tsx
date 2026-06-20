import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { User, Climb } from '../types';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([api.users.get(Number(id)), api.users.climbs(Number(id))])
      .then(([u, cs]) => {
        setUser(u);
        setFollowing(u.is_following ?? false);
        setClimbs(cs);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  async function toggleFollow() {
    if (!user) return;
    try {
      if (following) {
        await api.users.unfollow(user.id);
        setFollowing(false);
        setUser(u => u ? { ...u, followers: (u.followers ?? 1) - 1 } : u);
      } else {
        await api.users.follow(user.id);
        setFollowing(true);
        setUser(u => u ? { ...u, followers: (u.followers ?? 0) + 1 } : u);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="animate-pulse bg-gray-900 border border-gray-800 rounded-xl h-64" />;
  if (error) return <div className="text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-4">{error}</div>;
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-700 shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl ring-2 ring-gray-700 shrink-0">👤</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            {user.bio && <p className="text-gray-400 text-sm mt-1 leading-relaxed">{user.bio}</p>}
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span><span className="text-white font-medium">{user.followers ?? 0}</span> followers</span>
              <span><span className="text-white font-medium">{user.following ?? 0}</span> following</span>
            </div>
            <button
              onClick={toggleFollow}
              className={`mt-3 font-semibold px-5 py-1.5 rounded-lg text-sm transition-colors ${
                following
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-sky-500 hover:bg-sky-400 text-white'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-800 text-center">
          <div>
            <div className="text-2xl font-bold text-sky-400">{user.total_climbs ?? 0}</div>
            <div className="text-gray-500 text-xs mt-0.5">Climbs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{user.unique_peaks ?? 0}</div>
            <div className="text-gray-500 text-xs mt-0.5">Unique Peaks</div>
          </div>
        </div>
      </div>

      {climbs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Recent Climbs</h2>
          <div className="space-y-2">
            {climbs.map(c => (
              <Link
                key={c.id}
                to={`/climbs/${c.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {c.photo_url ? (
                  <img src={c.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-800" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg shrink-0">⛰️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{c.mountain_name}</div>
                  <div className="text-gray-500 text-xs">{fmtDate(c.climb_date)}</div>
                </div>
                <span className="text-emerald-400 text-xs font-medium shrink-0">{c.elevation.toLocaleString()} ft</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
