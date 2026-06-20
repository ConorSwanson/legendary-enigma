import { useMemo } from 'react';
import type { Mountain } from '../types';
import { generateBadge, getMood } from '../utils/badge';

interface Props {
  mountain: Mountain;
  climbed?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export default function MountainBadge({ mountain, climbed = false, size = 72, onClick, className = '' }: Props) {
  const badge = useMemo(
    () => generateBadge(mountain.id, mountain.elevation),
    [mountain.id, mountain.elevation]
  );
  const mood = getMood(mountain.range);

  const ids = {
    sky: `sky-${mountain.id}`,
    glow: `glow-${mountain.id}`,
    clip: `clip-${mountain.id}`,
    snowGlow: `sg-${mountain.id}`,
  };

  // Pine tree path: two stacked triangles
  function treePath(x: number, y: number, h: number) {
    const w = h * 0.55;
    const mid = h * 0.52;
    return (
      `M ${x} ${y - h} L ${x - w * 0.6} ${y - mid} L ${x + w * 0.6} ${y - mid} Z ` +
      `M ${x} ${y - mid * 0.9} L ${x - w} ${y} L ${x + w} ${y} Z`
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group focus:outline-none ${className}`}
      title={mountain.name}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`transition-transform duration-200 ${onClick ? 'group-hover:scale-110' : ''}`}
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
            {climbed ? (
              <>
                <stop offset="0%" stopColor={mood.skyTop} />
                <stop offset="100%" stopColor={mood.skyBottom} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#0a0a0f" />
                <stop offset="100%" stopColor="#1a1a2e" />
              </>
            )}
          </linearGradient>

          {/* Horizon glow gradient (radial from bottom-center) */}
          {climbed && mood.horizonGlow && (
            <radialGradient id={ids.glow} cx="50%" cy="100%" r="60%" fx="50%" fy="100%">
              <stop offset="0%" stopColor={mood.horizonGlow} stopOpacity="0.45" />
              <stop offset="100%" stopColor={mood.horizonGlow} stopOpacity="0" />
            </radialGradient>
          )}

          {/* Snow glow blur */}
          <filter id={ids.snowGlow} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
          </filter>

          <clipPath id={ids.clip}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        {/* Sky background */}
        <circle cx="50" cy="50" r="46" fill={`url(#${ids.sky})`} />

        {/* Horizon glow overlay */}
        {climbed && mood.horizonGlow && (
          <circle cx="50" cy="50" r="46" fill={`url(#${ids.glow})`} />
        )}

        {/* Stars */}
        {climbed && mood.stars && badge.stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={mood.starColor}
            fillOpacity={s.o}
            clipPath={`url(#${ids.clip})`}
          />
        ))}

        {/* Background hills layer */}
        <path
          d={badge.bg}
          fill={climbed ? mood.bgMtn : '#1f2937'}
          fillOpacity={climbed ? 0.75 : 0.45}
          clipPath={`url(#${ids.clip})`}
        />

        {/* Mid-range peaks */}
        <path
          d={badge.mid}
          fill={climbed ? mood.midMtn : '#111827'}
          fillOpacity={climbed ? 0.88 : 0.6}
          clipPath={`url(#${ids.clip})`}
        />

        {/* Foreground hero mountain */}
        <path
          d={badge.fg.body}
          fill={climbed ? mood.fgMtn : '#060912'}
          fillOpacity={climbed ? 1 : 0.75}
          clipPath={`url(#${ids.clip})`}
        />

        {/* Snow glow (soft bloom) */}
        {badge.fg.snow && climbed && (
          <path
            d={badge.fg.snow}
            fill={mood.snowGlow}
            fillOpacity={0.35}
            filter={`url(#${ids.snowGlow})`}
            clipPath={`url(#${ids.clip})`}
          />
        )}

        {/* Snow cap crisp */}
        {badge.fg.snow && (
          <path
            d={badge.fg.snow}
            fill={climbed ? mood.snow : '#e5e7eb'}
            fillOpacity={climbed ? 0.92 : 0.18}
            clipPath={`url(#${ids.clip})`}
          />
        )}

        {/* Pine trees */}
        {climbed && badge.trees.map((t, i) => (
          <path
            key={i}
            d={treePath(t.x, t.y, t.h)}
            fill={climbed ? mood.fgMtn : '#030711'}
            fillOpacity={0.85}
            clipPath={`url(#${ids.clip})`}
          />
        ))}

        {/* Inner subtle border */}
        <circle
          cx="50" cy="50" r="43"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          strokeOpacity="0.12"
        />

        {/* Outer border ring */}
        <circle
          cx="50" cy="50" r="46"
          fill="none"
          stroke={climbed ? mood.border : '#374151'}
          strokeWidth={climbed ? 2.5 : 1.5}
          strokeOpacity={climbed ? 1 : 0.45}
        />

        {/* Climbed checkmark badge */}
        {climbed && (
          <g>
            <circle cx="78" cy="22" r="11" fill={mood.skyBottom} />
            <circle cx="78" cy="22" r="11" fill="none" stroke={mood.border} strokeWidth="1.5" />
            <polyline
              points="73,22 77,26 84,18"
              fill="none"
              stroke={mood.snow}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      {/* Mountain name label */}
      <div
        className={`text-center mt-1 leading-tight ${climbed ? 'text-white' : 'text-gray-500'}`}
        style={{ fontSize: Math.max(9, size * 0.12), maxWidth: size, wordBreak: 'break-word' }}
      >
        {mountain.name.replace('Mount ', 'Mt. ').replace('Mountain', 'Mtn.')}
      </div>
    </button>
  );
}
