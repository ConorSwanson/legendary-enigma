import { useMemo } from 'react';
import type { Mountain } from '../types';
import { generateSilhouette, getRangeTheme } from '../utils/badge';

interface Props {
  mountain: Mountain;
  climbed?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export default function MountainBadge({ mountain, climbed = false, size = 72, onClick, className = '' }: Props) {
  const { body, snow } = useMemo(
    () => generateSilhouette(mountain.id, mountain.elevation),
    [mountain.id, mountain.elevation]
  );
  const theme = getRangeTheme(mountain.range);

  const gId = `bg-${mountain.id}`;
  const cId = `cl-${mountain.id}`;

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
          <radialGradient id={gId} cx="45%" cy="35%" r="65%">
            {climbed ? (
              <>
                <stop offset="0%" stopColor={theme.mid} />
                <stop offset="100%" stopColor={theme.to} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#374151" />
                <stop offset="100%" stopColor="#111827" />
              </>
            )}
          </radialGradient>
          <clipPath id={cId}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        {/* Badge background */}
        <circle cx="50" cy="50" r="46" fill={`url(#${gId})`} />

        {/* Mountain body */}
        <path
          d={body}
          fill="white"
          fillOpacity={climbed ? 0.22 : 0.1}
          clipPath={`url(#${cId})`}
        />

        {/* Snow cap */}
        {snow && (
          <path
            d={snow}
            fill={climbed ? theme.snow : 'white'}
            fillOpacity={climbed ? 0.75 : 0.18}
            clipPath={`url(#${cId})`}
          />
        )}

        {/* Outer border ring */}
        <circle
          cx="50" cy="50" r="46"
          fill="none"
          stroke={climbed ? theme.border : '#374151'}
          strokeWidth={climbed ? 2.5 : 1.5}
          strokeOpacity={climbed ? 0.9 : 0.5}
        />

        {/* Climbed checkmark badge */}
        {climbed && (
          <g>
            <circle cx="78" cy="22" r="11" fill={theme.to} />
            <circle cx="78" cy="22" r="11" fill="none" stroke={theme.snow} strokeWidth="1.5" strokeOpacity="0.6" />
            <polyline
              points="73,22 77,26 84,18"
              fill="none"
              stroke={theme.snow}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      {/* Mountain name label */}
      <div
        className={`text-center mt-1 leading-tight ${climbed ? 'text-white' : 'text-gray-600'}`}
        style={{ fontSize: Math.max(9, size * 0.12), maxWidth: size, wordBreak: 'break-word' }}
      >
        {mountain.name.replace('Mount ', 'Mt. ').replace('Mountain', 'Mtn.')}
      </div>
    </button>
  );
}
