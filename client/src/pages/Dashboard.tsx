import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../api';
import type { Stats } from '../types';
import StatCard from '../components/StatCard';

function fmtElev(ft: number) {
  if (ft >= 10000) return `${(ft / 1000).toFixed(1)}k`;
  return ft.toLocaleString();
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('default', {
    month: 'short',
    year: '2-digit',
  });
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 },
  labelStyle: { color: '#f9fafb', fontWeight: 600 },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats.get().then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-900 rounded-xl p-4">
        Failed to load: {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-24" />
          ))}
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear().toString();
  const thisYearData = stats.by_month
    .filter(m => m.month.startsWith(currentYear))
    .map(d => ({ ...d, label: fmtMonth(d.month) }));

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your 14ers journey at a glance</p>
        </div>
        <Link
          to="/log"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Log Climb
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Climbs" value={stats.total_climbs} icon="🏔️" accent="text-sky-400" />
        <StatCard
          label="Unique Peaks"
          value={stats.unique_peaks}
          unit="/ 58"
          icon="⛰️"
          accent="text-emerald-400"
        />
        <StatCard
          label="Total Elevation"
          value={fmtElev(stats.total_elevation)}
          unit="ft"
          icon="📈"
          accent="text-violet-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">{currentYear} — Climbs by Month</h2>
          {thisYearData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
              No climbs logged for {currentYear}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={thisYearData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: '#38bdf8' }} />
                <Bar dataKey="count" name="Climbs" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">All-Time — Climbs by Year</h2>
          {stats.by_year.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
              No climbs logged yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.by_year} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: '#34d399' }} />
                <Bar dataKey="count" name="Climbs" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      {(stats.top_mountains.length > 0 || stats.recent_climbs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {stats.top_mountains.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4 text-sm">Most Climbed Peaks</h2>
              <div className="space-y-3">
                {stats.top_mountains.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{m.name}</div>
                      <div className="text-gray-500 text-xs">{m.elevation.toLocaleString()} ft</div>
                    </div>
                    <span className="text-sky-400 text-sm font-semibold shrink-0">
                      {m.climb_count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.recent_climbs.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4 text-sm">Recent Climbs</h2>
              <div className="space-y-2">
                {stats.recent_climbs.map(c => (
                  <Link
                    key={c.id}
                    to={`/climbs/${c.id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg shrink-0">
                        ⛰️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{c.mountain_name}</div>
                      <div className="text-gray-500 text-xs">{fmtDate(c.climb_date)}</div>
                    </div>
                    <span className="text-emerald-400 text-xs font-medium shrink-0">
                      {c.elevation.toLocaleString()} ft
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {stats.total_climbs === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">⛰️</div>
          <h2 className="text-xl font-bold text-white mb-2">No climbs yet</h2>
          <p className="text-gray-500 mb-6">Start logging your 14er adventures</p>
          <Link
            to="/log"
            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Log Your First Climb
          </Link>
        </div>
      )}
    </div>
  );
}
