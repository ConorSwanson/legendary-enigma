import React, { useMemo } from 'react';
import type { Mountain } from '../types';
import { buildBadge } from '../utils/patch-render';
import { PEAKS, PALETTES } from '../data/peaks-data';
import type { Peak } from '../data/peaks-data';

interface Props {
  mountain: Mountain;
  climbed?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

// Multi-word or special names that don't normalize cleanly by lowercasing
const OVERRIDES: Record<string, string> = {
  'mount evans': 'evans',           // renamed to Mount Blue Sky in 2023
  'mount of the holy cross': 'holycross',
  'north eolus': 'northeolus',
  'wilson peak': 'wilsonpk',
  'crestone needle': 'crestoneneedle',
  'crestone peak': 'crestonepk',
  'kit carson peak': 'kitcarson',
  'challenger point': 'challenger',
  'ellingwood point': 'ellingwood',
  'little bear peak': 'littlebear',
  'mount wilson': 'mtwilson',
  'el diente peak': 'eldiente',
  'north maroon peak': 'northmaroon',
};

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/\bmt\.?\b/g, 'mount')
    .replace(/\bmtn\.?\b/g, 'mountain')
    .trim();
}

function findPeak(mountain: Mountain): Peak | undefined {
  const lower = mountain.name.toLowerCase();
  const id = OVERRIDES[lower];
  if (id) return PEAKS.find(p => p.id === id);
  const n = norm(mountain.name);
  return PEAKS.find(p => norm(p.full) === n);
}

export default function MountainBadge({
  mountain, climbed = false, size = 120, onClick, className = '',
}: Props) {
  const peak = useMemo(() => findPeak(mountain), [mountain.id]);

  const badge = useMemo(() => {
    if (!peak) return null;
    const pal = PALETTES[peak.palette as keyof typeof PALETTES];
    return buildBadge(React, peak, pal, { climbed });
  }, [peak?.id, climbed]);

  // Shield viewBox is 600×660; add 10px for drop-shadow overflow
  const height = Math.round(size * 660 / 600) + 10;

  const inner = peak && badge
    ? <div style={{ width: size, height, overflow: 'visible' }}>{badge}</div>
    : <div style={{ width: size, height }} className="bg-gray-800 rounded opacity-30" />;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={mountain.name}
        className={`focus:outline-none cursor-pointer block p-0 bg-transparent border-0 ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div title={mountain.name} className={`inline-block ${className}`}>
      {inner}
    </div>
  );
}
