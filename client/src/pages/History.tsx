import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Climb } from '../types';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function History() {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  useEffect(() => {
    setLoading(true);
    api.climbs
      .list({ year: year || undefined })
      .then(setClimbs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  if (error) {
    return (
      <div className="text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Climbs</h1>
        <Link
          to="/log"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Log Climb
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        >
          <option value="">All years</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {climbs.length > 0 && (
          <span className="self-center text-gray-500 text-sm">
            {climbs.length} climb{climbs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-20" />
          ))}
        </div>
      ) : climbs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-3">⛰️</div>
          <p className="text-gray-400 mb-4">
            {year ? `No climbs in ${year}` : 'No climbs logged yet'}
          </p>
          <Link to="/log" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">
            Log a climb →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {climbs.map(c => (
            <Link
              key={c.id}
              to={`/climbs/${c.id}`}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 flex items-center gap-4 transition-colors"
            >
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-800"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center text-2xl shrink-0">
                  ⛰️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold truncate">{c.mountain_name}</div>
                <div className="text-gray-500 text-sm">{c.range}</div>
                {c.notes && (
                  <div className="text-gray-600 text-xs mt-0.5 truncate">{c.notes}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-emerald-400 font-semibold text-sm">
                  {c.elevation.toLocaleString()} ft
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{fmtDate(c.climb_date)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
