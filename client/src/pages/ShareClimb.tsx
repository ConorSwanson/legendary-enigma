import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MountainBadge from '../components/MountainBadge';
import type { Mountain } from '../types';

interface PublicClimb {
  id: number;
  climb_date: string;
  notes: string | null;
  photo_url: string | null;
  mountain_id: number;
  mountain_name: string;
  elevation: number;
  range: string;
  user_name: string | null;
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function ShareClimb() {
  const { id } = useParams<{ id: string }>();
  const [climb, setClimb] = useState<PublicClimb | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/climbs/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(setClimb)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <p className="text-white font-bold text-xl">This climb is private</p>
          <Link to="/" className="inline-block text-sky-400 text-sm">Open 14ers Tracker</Link>
        </div>
      </div>
    );
  }

  if (!climb) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse w-80 h-96 bg-gray-900 rounded-2xl" />
      </div>
    );
  }

  const mountain: Mountain = {
    id: climb.mountain_id,
    name: climb.mountain_name,
    elevation: climb.elevation,
    range: climb.range,
  };

  const climberName = climb.user_name || 'A climber';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Achievement headline */}
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Colorado 14er Summit</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {climberName} summited<br />
            <span className="text-emerald-400">{climb.mountain_name}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">{fmtDate(climb.climb_date)}</p>
        </div>

        {/* Badge — large, centered, always climbed=true */}
        <div className="flex justify-center mb-6">
          <MountainBadge
            mountain={mountain}
            climbed
            size={180}
          />
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mb-6 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{climb.elevation.toLocaleString()}</div>
            <div className="text-gray-500 text-xs uppercase tracking-wide">feet</div>
          </div>
          <div className="w-px bg-gray-800" />
          <div>
            <div className="text-lg font-semibold text-white">{climb.range.replace(' Range', '').replace(' Mountains', ' Mtns')}</div>
            <div className="text-gray-500 text-xs uppercase tracking-wide">range</div>
          </div>
        </div>

        {/* Photo */}
        {climb.photo_url && (
          <div className="rounded-xl overflow-hidden mb-4 border border-gray-800">
            <img src={climb.photo_url} alt={climb.mountain_name} className="w-full object-cover max-h-72" />
          </div>
        )}

        {/* Notes */}
        {climb.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
            <p className="text-gray-300 text-sm leading-relaxed italic">"{climb.notes}"</p>
          </div>
        )}

        {/* CTA */}
        <Link
          to="/"
          className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Track your own 14ers →
        </Link>

        <p className="text-center text-gray-600 text-xs mt-3">
          14ers Tracker · All 58 Colorado 14ers
        </p>
      </div>
    </div>
  );
}
