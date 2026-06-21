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

// SVG viewBox constants — portrait oval patch
const VW = 100;
const VH = 108;
const CX = 50;
const CY = 52;
const RX = 46;
const RY = 48;
const BORDER = 6; // merrowed ring thickness

export default function MountainBadge({ mountain, climbed = false, size = 110, onClick, className = '' }: Props) {
  const badge = useMemo(
    () => generateBadge(mountain.id, mountain.elevation),
    [mountain.id, mountain.elevation]
  );
  const theme = getPatchTheme(mountain.range);
  const uid = mountain.id;

  const skyId    = `psky-${uid}`;
  const mtnGrId  = `pmg-${uid}`;
  const clipId   = `pclip-${uid}`;
  const iClipId  = `piclip-${uid}`;

  // Abbreviate long names to fit the bottom banner
  const displayName = mountain.name
    .replace('Mount ', 'Mt. ')
    .replace('Mountain', 'Mtn.');
  const nameFontSize =
    displayName.length > 14 ? 4.5 : displayName.length > 11 ? 5.2 : 6;

  // Two-triangle pine tree
  function treePath(x: number, y: number, h: number) {
    const w = h * 0.52;
    return (
      `M${x} ${y - h} L${x - w * 0.55} ${y - h * 0.48} L${x + w * 0.55} ${y - h * 0.48}Z ` +
      `M${x} ${y - h * 0.5} L${x - w} ${y} L${x + w} ${y}Z`
    );
  }

  // Content area boundaries
  const yTop    = CY - RY + BORDER;     // 10
  const yBottom = CY + RY - BORDER;     // 94
  const sceneH  = yBottom - yTop;       // 84
  const mtnScale = sceneH / 100;        // maps mountain coords → scene height
  const bannerH  = 14;
  const yBotBannerStart = yBottom - bannerH; // 80

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
          'transition-transform duration-200',
          onClick ? 'group-hover:scale-105' : '',
          !climbed ? 'grayscale brightness-50 opacity-70' : '',
        ].filter(Boolean).join(' ')}
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.skyTop} />
            <stop offset="100%" stopColor={theme.skyBottom} />
          </linearGradient>

          {/* Mountain lit-face gradient (top-left bright → bottom-right dark) */}
          <linearGradient id={mtnGrId} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor={theme.fgLight} />
            <stop offset="100%" stopColor={theme.fgMtn} />
          </linearGradient>

          {/* Clip to outer oval */}
          <clipPath id={clipId}>
            <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
          </clipPath>

          {/* Clip to inner content oval */}
          <clipPath id={iClipId}>
            <ellipse cx={CX} cy={CY} rx={RX - BORDER} ry={RY - BORDER} />
          </clipPath>
        </defs>

        {/* ── Merrowed border ring ── */}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={theme.border} />

        {/* ── Sky background ── */}
        <ellipse
          cx={CX} cy={CY}
          rx={RX - BORDER} ry={RY - BORDER}
          fill={`url(#${skyId})`}
        />

        {/* ── Stars ── */}
        {theme.stars && badge.stars.slice(0, 14).map((s, i) => (
          <circle
            key={i}
            cx={(s.x / 100) * (RX - BORDER) * 2 + (CX - (RX - BORDER))}
            cy={(s.y / 100) * (RY - BORDER) * 2 + (CY - (RY - BORDER))}
            r={s.r * 0.7}
            fill={theme.starColor}
            fillOpacity={s.o * 0.6}
            clipPath={`url(#${iClipId})`}
          />
        ))}

        {/* ── Mountain layers (scaled to content area) ── */}
        <g
          clipPath={`url(#${iClipId})`}
          transform={`translate(0,${yTop}) scale(1,${mtnScale})`}
        >
          <path d={badge.bg}      fill={theme.bgMtn}  fillOpacity="0.85" />
          <path d={badge.mid}     fill={theme.midMtn} />
          <path d={badge.fg.body} fill={`url(#${mtnGrId})`} />
          {badge.fg.snow && (
            <path d={badge.fg.snow} fill={theme.snow} fillOpacity="0.92" />
          )}
          {badge.trees.slice(0, 6).map((t, i) => (
            <path key={i} d={treePath(t.x, t.y, t.h)} fill={theme.treeFill} />
          ))}
        </g>

        {/* ── Top banner — range name ── */}
        <rect
          x={CX - (RX - BORDER)} y={yTop}
          width={(RX - BORDER) * 2} height={bannerH}
          fill={theme.bannerBg} fillOpacity="0.9"
          clipPath={`url(#${iClipId})`}
        />
        <text
          x={CX} y={yTop + bannerH * 0.73}
          textAnchor="middle"
          fill={theme.textColor}
          fontSize="4.6"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="bold"
          letterSpacing="0.9"
        >
          {theme.shortRange}
        </text>

        {/* ── Bottom banner — mountain name + elevation ── */}
        <rect
          x={CX - (RX - BORDER)} y={yBotBannerStart}
          width={(RX - BORDER) * 2} height={bannerH}
          fill={theme.bannerBg} fillOpacity="0.9"
          clipPath={`url(#${iClipId})`}
        />
        <text
          x={CX} y={yBotBannerStart + 6.5}
          textAnchor="middle"
          fill={theme.textColor}
          fontSize={nameFontSize}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="bold"
          letterSpacing="0.3"
        >
          {displayName.toUpperCase()}
        </text>
        <text
          x={CX} y={yBottom - 2.5}
          textAnchor="middle"
          fill={theme.accentText}
          fontSize="3.8"
          fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="0.5"
        >
          {mountain.elevation.toLocaleString()}′
        </text>

        {/* ── Stitching ── */}
        <ellipse
          cx={CX} cy={CY}
          rx={RX - 3} ry={RY - 3}
          fill="none"
          stroke={theme.stitching}
          strokeWidth="0.9"
          strokeDasharray="2.5,2"
        />
        <ellipse
          cx={CX} cy={CY}
          rx={RX - BORDER} ry={RY - BORDER}
          fill="none"
          stroke={theme.stitching}
          strokeWidth="0.4"
          strokeOpacity="0.35"
        />

        {/* ── Climbed checkmark ── */}
        {climbed && (
          <g>
            <circle
              cx={CX + RX - 10} cy={CY - RY + 10}
              r="8" fill={theme.border}
            />
            <circle
              cx={CX + RX - 10} cy={CY - RY + 10}
              r="8" fill="none"
              stroke={theme.stitching} strokeWidth="1.2"
            />
            <polyline
              points={[
                `${CX + RX - 14},${CY - RY + 10}`,
                `${CX + RX - 10},${CY - RY + 14}`,
                `${CX + RX - 5},${CY - RY + 5}`,
              ].join(' ')}
              fill="none"
              stroke={theme.stitching}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </button>
  );
}
