import { useMemo } from 'react';
import type { Mountain } from '../types';
import { generateBadge, getPatchTheme } from '../utils/badge';

interface Props {
  mountain: Mountain;
  climbed?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

// SVG canvas — arch-shaped NPS patch
const VW = 120;
const VH = 138;

// Arch badge outline: M x1 yBot L x1 yArch A rx 40 0 0 1 x2 yArch L x2 yBot Z
// ry=40 is fixed; rx=52-ins keeps the inset parallel; arch peaks at y=8+ins
function archD(ins: number): string {
  const x1 = 8 + ins, x2 = 112 - ins;
  const yArch = 48 + ins, yBot = 132 - ins;
  const rx = 52 - ins;
  return `M ${x1} ${yBot} L ${x1} ${yArch} A ${rx} 40 0 0 1 ${x2} ${yArch} L ${x2} ${yBot} Z`;
}

// Tall NPS-style pine tree (3 tiers + trunk)
function treePath(cx: number, baseY: number, h: number): string {
  const w = h * 0.38;
  const t = [0, 0.32, 0.62]; // tier start fractions
  const parts: string[] = t.map((f, i) => {
    const tier = i / (t.length - 1);
    const tierW = w * (0.3 + tier * 0.7);
    const y0 = baseY - h + h * f;
    const y1 = i < t.length - 1 ? baseY - h + h * t[i + 1] + h * 0.08 : baseY;
    return `M${cx} ${y0} L${cx - tierW} ${y1} L${cx + tierW} ${y1}Z`;
  });
  const tw = w * 0.07;
  parts.push(`M${cx - tw} ${baseY} L${cx + tw} ${baseY} L${cx + tw} ${baseY + h * 0.07} L${cx - tw} ${baseY + h * 0.07}Z`);
  return parts.join(' ');
}

export default function MountainBadge({
  mountain, climbed = false, size = 120, onClick, className = '',
}: Props) {
  const badge = useMemo(
    () => generateBadge(mountain.id, mountain.elevation),
    [mountain.id, mountain.elevation]
  );
  const theme = getPatchTheme(mountain.range);
  const uid = mountain.id;

  // Gradient / clip IDs
  const IDs = {
    sky:     `sky-${uid}`,
    mtn:     `mtn-${uid}`,
    scl:     `scl-${uid}`,   // scene clip
    sun:     `sun-${uid}`,   // sun radial glow
  };

  // Scene area (inside ins=6 arch): x∈[14,106] y∈[14,126]
  // Above-banner scene: y∈[14,100] → height=86, width=92
  // Mountain paths are in 0-100 coords; we scale them to fit
  const SX = 14, SY = 14;
  const SW = 92, SH = 86; // scene width/height (above banner at y=100)
  const mtnScaleX = SW / 100;
  const mtnScaleY = SH / 100;

  // Sun position in PATCH coords (placed behind the hero mountain peak)
  const sunCx = SX + badge.fg.peakX * mtnScaleX;
  const sunCy = SY + (badge.fg.peakY - 8) * mtnScaleY;
  const sunR = 19;

  // Mountain name shortened for banner
  const displayName = mountain.name
    .replace('Mount ', 'Mt. ')
    .replace('Mountain', 'Mtn.');
  const nameFontSize = displayName.length > 14 ? 10 : displayName.length > 10 ? 11.5 : 13;

  const height = Math.round(size * VH / VW);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group focus:outline-none ${className}`}
      title={mountain.name}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width={size}
        height={height}
        className={[
          'transition-transform duration-200 drop-shadow-lg',
          onClick ? 'group-hover:scale-105' : '',
          !climbed ? 'grayscale brightness-[0.4] saturate-[0.3] opacity-75' : '',
        ].filter(Boolean).join(' ')}
      >
        <defs>
          {/* Sky gradient — warm, saturated */}
          <linearGradient id={IDs.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={theme.skyTop} />
            <stop offset="100%" stopColor={theme.skyBottom} />
          </linearGradient>

          {/* Mountain lit-face gradient */}
          <linearGradient id={IDs.mtn} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%"   stopColor={theme.fgLight} />
            <stop offset="100%" stopColor={theme.fgMtn} />
          </linearGradient>

          {/* Sun radial glow */}
          <radialGradient id={IDs.sun} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={theme.sunGlow}  stopOpacity="0.6" />
            <stop offset="60%"  stopColor={theme.sunGlow}  stopOpacity="0.2" />
            <stop offset="100%" stopColor={theme.sunGlow}  stopOpacity="0" />
          </radialGradient>

          {/* Clip everything to the inner arch */}
          <clipPath id={IDs.scl}>
            <path d={archD(6)} />
          </clipPath>
        </defs>

        {/* ── 1. Outer merrowed border ring ── */}
        <path d={archD(0)} fill={theme.outerBorder} />

        {/* ── 2. Inner accent line ── */}
        <path d={archD(3)} fill="none" stroke={theme.innerLine} strokeWidth="1" />

        {/* ── 3. Sky fill (inside inner arch) ── */}
        <path d={archD(6)} fill={`url(#${IDs.sky})`} />

        {/* ── 4-13. Scene — all clipped to inner arch ── */}
        <g clipPath={`url(#${IDs.scl})`}>

          {/* Sun glow halo */}
          <circle cx={sunCx} cy={sunCy} r={sunR + 20} fill={`url(#${IDs.sun})`} />

          {/* Sun outer soft ring */}
          <circle cx={sunCx} cy={sunCy} r={sunR + 6} fill={theme.sunGlow} fillOpacity="0.25" />

          {/* Sun disk */}
          <circle cx={sunCx} cy={sunCy} r={sunR} fill={theme.sunColor} />

          {/* Background mountain ridge */}
          <g transform={`translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})`}>
            <path d={badge.bg} fill={theme.bgMtn} fillOpacity="0.75" />
          </g>

          {/* Mid peaks */}
          <g transform={`translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})`}>
            <path d={badge.mid} fill={theme.midMtn} />
          </g>

          {/* Hero mountain body — gradient for lit/shadow faces */}
          <g transform={`translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})`}>
            <path d={badge.fg.body} fill={`url(#${IDs.mtn})`} />
          </g>

          {/* Snow cap */}
          {badge.fg.snow && (
            <g transform={`translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})`}>
              <path d={badge.fg.snow} fill={theme.snow} />
            </g>
          )}

          {/* Far ground / meadow */}
          <rect x="14" y="86" width="92" height="8"  fill={theme.groundFar} />
          {/* Near ground */}
          <rect x="14" y="92" width="92" height="8"  fill={theme.groundNear} />

          {/* Foreground pine tree row — tall NPS-style silhouettes */}
          {badge.trees.map((t, i) => {
            const patchX = SX + t.x * mtnScaleX;
            const treeH  = 24 + (i % 4) * 5;   // 24–39 px — much taller than the scene trees
            return (
              <path
                key={i}
                d={treePath(patchX, 100, treeH)}
                fill={theme.treeDark}
              />
            );
          })}

          {/* Text banner backing */}
          <rect x="14" y="100" width="92" height="26" fill={theme.bannerBg} />

          {/* Separator line */}
          <line x1="14" y1="100" x2="106" y2="100" stroke={theme.innerLine} strokeWidth="0.8" />

          {/* Mountain name — large, bold */}
          <text
            x="60" y="115"
            textAnchor="middle"
            fill={theme.bannerText}
            fontSize={nameFontSize}
            fontFamily="Impact, 'Arial Black', 'Arial Narrow', sans-serif"
            fontWeight="900"
            letterSpacing="1"
          >
            {displayName.toUpperCase()}
          </text>

          {/* Elevation */}
          <text
            x="60" y="124"
            textAnchor="middle"
            fill={theme.bannerSub}
            fontSize="6.5"
            fontFamily="Georgia, 'Times New Roman', serif"
            letterSpacing="1.5"
          >
            ·  {mountain.elevation.toLocaleString()}′  ·
          </text>
        </g>

        {/* ── 14. Stitching dashes ── */}
        <path
          d={archD(2)}
          fill="none"
          stroke={theme.stitching}
          strokeWidth="0.8"
          strokeDasharray="2.5,2"
        />

        {/* ── 15. Climbed star badge ── */}
        {climbed && (
          <g>
            <circle cx={107} cy={17} r="9" fill={theme.outerBorder} />
            <circle cx={107} cy={17} r="9" fill="none" stroke={theme.innerLine} strokeWidth="1.2" />
            <polyline
              points="103,17 107,21 113,11"
              fill="none"
              stroke={theme.innerLine}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </button>
  );
}
