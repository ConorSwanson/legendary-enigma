import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Climb } from '../types';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function ShareClimb() {
  const { id } = useParams<{ id: string }>();
  const [climb, setClimb] = useState<Climb | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/climbs/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(setClimb)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-white font-bold text-xl">This climb is private</h1>
          <Link to="/" className="mt-4 inline-block text-sky-400 text-sm">Open 14ers Tracker</Link>
        </div>
      </div>
    );
  }

  if (!climb) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse w-80 h-64 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        {climb.photo_url && (
          <img src={climb.photo_url} alt={climb.mountain_name} className="w-full h-64 object-cover" />
        )}
        <div className="p-6">
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Colorado 14er</div>
          <h1 className="text-3xl font-bold text-white">{climb.mountain_name}</h1>
          <div className="text-emerald-400 font-semibold text-xl mt-1">{climb.elevation.toLocaleString()} ft</div>
          <div className="text-gray-500 text-sm">{climb.range}</div>
          <div className="mt-3 text-gray-400 text-sm">{fmtDate(climb.climb_date)}</div>
          {climb.notes && (
            <p className="mt-4 text-gray-300 text-sm leading-relaxed bg-gray-800 rounded-lg p-3">{climb.notes}</p>
          )}
          <Link
            to="/"
            className="mt-6 block w-full text-center bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Track your own 14ers →
          </Link>
        </div>
      </div>
    </div>
  );
}
