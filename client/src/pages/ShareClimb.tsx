import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function MountainHero() {
  return (
    <div className="w-full h-64 overflow-hidden" style={{ background: 'linear-gradient(to bottom, #05143780, #081e49, #14225e)' }}>
      <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="w-full h-full">
        {/* Back range */}
        <polygon
          points="0,160 0,85 48,52 112,74 168,36 220,60 272,30 320,55 400,44 400,160"
          fill="rgba(15,45,90,0.55)"
        />
        {/* Mid range */}
        <polygon
          points="0,160 0,104 40,80 88,96 152,64 208,90 260,60 316,83 360,67 400,88 400,160"
          fill="rgba(8,28,60,0.75)"
        />
        {/* Foreground ridge */}
        <polygon
          points="0,160 0,125 72,99 132,115 200,88 260,109 328,93 400,112 400,160"
          fill="#030C1E"
        />
      </svg>
    </div>
  );
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
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <p className="text-white font-bold text-xl">This climb is private</p>
          <a
            href="https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sky-400 text-sm"
          >
            Get Switchback
          </a>
        </div>
      </div>
    );
  }

  if (!climb) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="animate-pulse w-80 h-96 bg-gray-900 rounded-2xl" />
      </div>
    );
  }

  const mountain: Mountain = {
    id: climb.mountain_id,
    name: climb.mountain_name,
    elevation: climb.elevation,
    range: climb.range,
    lat: null,
    lng: null,
  };

  const climberName = climb.user_name || 'A climber';

  return (
    <div className="min-h-screen bg-[#030712]">

      {/* Photo or mountain hero at top */}
      {climb.photo_url ? (
        <div className="w-full h-72 overflow-hidden">
          <img
            src={climb.photo_url}
            alt={climb.mountain_name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <MountainHero />
      )}

      <div className="max-w-lg mx-auto px-5 py-5">

        {/* Title row — info left, badge right (mirrors ClimbDetailView) */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{climberName}</p>
            <h1 className="text-2xl font-bold text-white leading-tight">{climb.mountain_name}</h1>
            <p className="text-[#34D399] font-semibold text-lg">{climb.elevation.toLocaleString()} ft</p>
            <p className="text-gray-500 text-sm">{climb.range}</p>
            <p className="text-gray-600 text-sm mt-1">{fmtDate(climb.climb_date)}</p>
          </div>
          <div className="shrink-0" style={{ filter: 'drop-shadow(0 0 16px rgba(52,211,153,0.25))' }}>
            <MountainBadge mountain={mountain} climbed size={120} />
          </div>
        </div>

        {/* Notes */}
        {climb.notes && (
          <div className="bg-[#111827] rounded-xl p-4 mb-5">
            <p className="text-gray-300 text-sm leading-relaxed">"{climb.notes}"</p>
          </div>
        )}

        {/* CTA */}
        <a
          href="https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center font-semibold py-3 rounded-xl text-sm transition-colors"
          style={{ background: '#38BDF8', color: '#030712' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#7DD3FC')}
          onMouseLeave={e => (e.currentTarget.style.background = '#38BDF8')}
        >
          Download Switchback →
        </a>

        <p className="text-center text-gray-700 text-xs mt-3">
          Switchback · All 58 Colorado 14ers
        </p>
      </div>
    </div>
  );
}
