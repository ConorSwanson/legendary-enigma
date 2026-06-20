// Deterministic seeded RNG — same mountain always gets same badge shape
function lcg(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s >>>= 0;
    return s / 4294967296;
  };
}

export interface RangeTheme {
  from: string;
  to: string;
  mid: string;
  snow: string;
  border: string;
}

export const RANGE_THEMES: Record<string, RangeTheme> = {
  'Sawatch Range':      { from: '#38bdf8', to: '#075985', mid: '#0ea5e9', snow: '#f0f9ff', border: '#7dd3fc' },
  'Sangre de Cristo':   { from: '#f87171', to: '#7f1d1d', mid: '#dc2626', snow: '#fff1f2', border: '#fca5a5' },
  'San Juan Mountains': { from: '#fb923c', to: '#7c2d12', mid: '#ea580c', snow: '#fff7ed', border: '#fdba74' },
  'Front Range':        { from: '#94a3b8', to: '#1e293b', mid: '#475569', snow: '#f8fafc', border: '#cbd5e1' },
  'Mosquito Range':     { from: '#4ade80', to: '#14532d', mid: '#16a34a', snow: '#f0fdf4', border: '#86efac' },
  'Elk Mountains':      { from: '#c084fc', to: '#4a1772', mid: '#9333ea', snow: '#faf5ff', border: '#d8b4fe' },
};

export function getRangeTheme(range: string): RangeTheme {
  return RANGE_THEMES[range] ?? RANGE_THEMES['Front Range'];
}

export interface SilhouettePaths {
  body: string;
  snow: string;
}

export function generateSilhouette(mountainId: number, elevation: number): SilhouettePaths {
  const rng = lcg(mountainId);

  // Canvas: viewBox 0 0 100 100, mountain fills bottom portion
  const baseY = 84;
  const elevFactor = Math.min(1, Math.max(0, (elevation - 14000) / 440));

  // Peak position — asymmetric to give each mountain character
  const peakX = 32 + rng() * 36;
  const peakY = 22 - elevFactor * 12 - rng() * 8;

  // Optional secondary shoulder (left side)
  const hasShoulder = rng() > 0.4;
  const shoulderX = peakX - 12 - rng() * 14;
  const shoulderY = peakY + 10 + rng() * 10;

  // Build ridge points
  const pts: [number, number][] = [];

  // Far-left base
  pts.push([6, baseY]);

  // Left approach / foothills
  pts.push([shoulderX - 10, baseY - (baseY - shoulderY) * 0.35]);

  if (hasShoulder) {
    pts.push([shoulderX, shoulderY + rng() * 5]);
  }

  // Approach to main peak
  pts.push([peakX - 7 + rng() * 4, peakY + 8 + rng() * 6]);
  pts.push([peakX, peakY]);

  // Right descent
  pts.push([peakX + 6 + rng() * 5, peakY + 6 + rng() * 6]);

  // Optional right sub-peak
  if (rng() > 0.5) {
    const subX = peakX + 12 + rng() * 10;
    const subY = peakY + 12 + rng() * 8;
    pts.push([subX, subY]);
  }

  // Right foothills
  pts.push([80 + rng() * 8, baseY - (baseY - peakY) * 0.12]);
  pts.push([94, baseY]);

  // Full body path (closes at the very bottom of viewBox)
  const bodyPath = `M 6 100 ${pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L 94 100 Z`;

  // Snow cap — the top 28% of the vertical mountain extent
  const snowLine = peakY + (baseY - peakY) * 0.28;
  const snowPts = pts.filter(([, y]) => y <= snowLine + 4);

  let snowPath = '';
  if (snowPts.length >= 2) {
    const leftSnowX = snowPts[0][0];
    const rightSnowX = snowPts[snowPts.length - 1][0];
    snowPath = `M ${leftSnowX.toFixed(1)} ${snowLine.toFixed(1)} ${snowPts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L ${rightSnowX.toFixed(1)} ${snowLine.toFixed(1)} Z`;
  }

  return { body: bodyPath, snow: snowPath };
}
