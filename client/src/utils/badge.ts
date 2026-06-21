// Deterministic seeded RNG — same mountain ID always produces the same badge
function lcg(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s >>>= 0;
    return s / 4294967296;
  };
}

// ─── Range mood themes ────────────────────────────────────────────────────────

export interface RangeMood {
  skyTop: string;
  skyBottom: string;
  horizonGlow: string | null;   // null = no glow overlay (clear night)
  bgMtn: string;
  midMtn: string;
  fgMtn: string;
  snow: string;
  snowGlow: string;
  stars: boolean;
  starColor: string;
  border: string;
}

export const RANGE_MOODS: Record<string, RangeMood> = {
  'Sawatch Range': {
    skyTop: '#02061a', skyBottom: '#0c2461', horizonGlow: null,
    bgMtn: '#1a3a8f', midMtn: '#0a1f5e', fgMtn: '#030918',
    snow: '#dbeafe', snowGlow: '#93c5fd',
    stars: true, starColor: '#bfdbfe', border: '#3b82f6',
  },
  'Sangre de Cristo': {
    skyTop: '#1a0505', skyBottom: '#9a3412', horizonGlow: '#fbbf24',
    bgMtn: '#7c2d12', midMtn: '#450a0a', fgMtn: '#140303',
    snow: '#fff1f2', snowGlow: '#fca5a5',
    stars: false, starColor: '', border: '#ef4444',
  },
  'San Juan Mountains': {
    skyTop: '#0c0800', skyBottom: '#b45309', horizonGlow: '#fde68a',
    bgMtn: '#78350f', midMtn: '#3f1e08', fgMtn: '#120800',
    snow: '#fffbeb', snowGlow: '#fde68a',
    stars: false, starColor: '', border: '#f59e0b',
  },
  'Front Range': {
    skyTop: '#030712', skyBottom: '#1e293b', horizonGlow: null,
    bgMtn: '#334155', midMtn: '#1e293b', fgMtn: '#060c18',
    snow: '#f1f5f9', snowGlow: '#cbd5e1',
    stars: true, starColor: '#e2e8f0', border: '#64748b',
  },
  'Mosquito Range': {
    skyTop: '#001510', skyBottom: '#064e3b', horizonGlow: '#6ee7b7',
    bgMtn: '#065f46', midMtn: '#022c22', fgMtn: '#000f09',
    snow: '#ecfdf5', snowGlow: '#6ee7b7',
    stars: true, starColor: '#a7f3d0', border: '#10b981',
  },
  'Elk Mountains': {
    skyTop: '#080212', skyBottom: '#6b21a8', horizonGlow: '#e879f9',
    bgMtn: '#581c87', midMtn: '#2e0757', fgMtn: '#0a0118',
    snow: '#faf5ff', snowGlow: '#d8b4fe',
    stars: true, starColor: '#e9d5ff', border: '#a855f7',
  },
};

export function getMood(range: string): RangeMood {
  return RANGE_MOODS[range] ?? RANGE_MOODS['Front Range'];
}

// ─── Layer generators ─────────────────────────────────────────────────────────

// Distant rolling hills — simple undulation
function bgLayer(rng: () => number): string {
  const pts: [number, number][] = [[-2, 100]];
  for (let i = 0; i <= 9; i++) {
    pts.push([i * 11.5, 60 + rng() * 8]);
  }
  pts.push([102, 100]);
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

// Mid-range with 2–3 distinct peaks
function midLayer(rng: () => number): string {
  const numPeaks = 2 + (rng() > 0.45 ? 1 : 0);
  const span = 80;
  const peakXs = Array.from({ length: numPeaks }, (_, i) =>
    10 + i * (span / numPeaks) + rng() * (span / numPeaks) * 0.5
  );
  const peakYs = peakXs.map(() => 44 + rng() * 10);

  const pts: [number, number][] = [[-2, 100]];
  for (let i = 0; i <= 14; i++) {
    const x = (i / 14) * 100;
    let y = 70;
    for (let p = 0; p < numPeaks; p++) {
      const dx = x - peakXs[p];
      const w = (span / numPeaks) * 0.65;
      const inf = Math.max(0, 1 - (dx * dx) / (w * w));
      y = Math.min(y, peakYs[p] + (70 - peakYs[p]) * (1 - inf * inf));
    }
    pts.push([x, y + (rng() - 0.5) * 3.5]);
  }
  pts.push([102, 100]);
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

// Hero foreground mountain with optional shoulder + sub-peak
function fgLayer(
  rng: () => number,
  elevation: number
): { body: string; snow: string; peakX: number; peakY: number } {
  const baseY = 88;
  const elevFactor = Math.min(1, Math.max(0, (elevation - 14000) / 440));
  const peakX = 30 + rng() * 40;
  const peakY = 18 - elevFactor * 11 - rng() * 7;

  const hasShoulder = rng() > 0.3;
  const shoulderX = peakX - 13 - rng() * 10;
  const shoulderY = peakY + 11 + rng() * 8;

  const pts: [number, number][] = [[3, baseY]];

  // Left approach to shoulder / peak
  pts.push([shoulderX * 0.35, baseY - (baseY - shoulderY) * 0.28]);
  pts.push([shoulderX * 0.7, baseY - (baseY - shoulderY) * 0.65]);
  if (hasShoulder) {
    pts.push([shoulderX, shoulderY + rng() * 3]);
    pts.push([shoulderX + 4 + rng() * 3, shoulderY - 3 + rng() * 4]);
  }

  // Tight approach to summit
  pts.push([peakX - 5 + rng() * 3, peakY + 10 + rng() * 4]);
  pts.push([peakX - 1 + rng() * 1.5, peakY + 2]);
  pts.push([peakX, peakY]); // summit

  // Right descent
  pts.push([peakX + 1 + rng() * 1.5, peakY + 2]);
  pts.push([peakX + 6 + rng() * 4, peakY + 11 + rng() * 4]);

  // Optional right sub-peak
  if (rng() > 0.42) {
    const subX = peakX + 13 + rng() * 11;
    pts.push([subX, peakY + 13 + rng() * 9]);
    pts.push([subX + 5 + rng() * 4, peakY + 20 + rng() * 6]);
  }

  pts.push([75 + rng() * 16, baseY - (baseY - peakY) * 0.08 + rng() * 5]);
  pts.push([97, baseY]);

  const body =
    'M 3 100 ' +
    pts.slice(1).map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') +
    ' L 97 100 Z';

  // Snow cap — top 27% of mountain height
  const snowLine = peakY + (baseY - peakY) * 0.27;
  const snowPts = pts.filter(([, y]) => y <= snowLine + 3.5);
  const snow =
    snowPts.length >= 2
      ? `M ${snowPts[0][0].toFixed(1)} ${snowLine.toFixed(1)} ` +
        snowPts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') +
        ` L ${snowPts[snowPts.length - 1][0].toFixed(1)} ${snowLine.toFixed(1)} Z`
      : '';

  return { body, snow, peakX, peakY };
}

// ─── Badge data assembly ──────────────────────────────────────────────────────

export interface Star  { x: number; y: number; r: number; o: number }
export interface Tree  { x: number; y: number; h: number }
export interface FgData { body: string; snow: string; peakX: number; peakY: number }

export interface BadgeData {
  bg: string;
  mid: string;
  fg: FgData;
  stars: Star[];
  trees: Tree[];
}

export function generateBadge(mountainId: number, elevation: number): BadgeData {
  const rBg   = lcg(mountainId * 11 + 1);
  const rMid  = lcg(mountainId * 7  + 2);
  const rFg   = lcg(mountainId * 3  + 3);
  const rStar = lcg(mountainId * 17 + 5);
  const rTree = lcg(mountainId * 23 + 7);

  const fg = fgLayer(rFg, elevation);

  const numStars = 10 + Math.floor(rStar() * 12);
  const stars: Star[] = Array.from({ length: numStars }, () => ({
    x: 4  + rStar() * 92,
    y: 3  + rStar() * 46,
    r: 0.35 + rStar() * 0.85,
    o: 0.35 + rStar() * 0.65,
  }));

  const numTrees = 4 + Math.floor(rTree() * 5);
  const trees: Tree[] = Array.from({ length: numTrees }, () => ({
    x: fg.peakX - 22 + rTree() * 44,
    y: 80 + rTree() * 5,
    h: 4.5 + rTree() * 4.5,
  }));

  return { bg: bgLayer(rBg), mid: midLayer(rMid), fg, stars, trees };
}

// ─── Patch (national-park embroidered style) themes ──────────────────────────

export interface PatchTheme {
  shortRange: string;
  border: string;      // thick merrowed outer ring
  stitching: string;   // dashed inner stitching + text color
  skyTop: string;
  skyBottom: string;
  bgMtn: string;
  midMtn: string;
  fgMtn: string;
  fgLight: string;     // lit/highlight face of hero mountain
  snow: string;
  treeFill: string;
  bannerBg: string;    // top/bottom text band background
  textColor: string;
  accentText: string;  // secondary (elevation) text
  stars: boolean;
  starColor: string;
}

export const PATCH_THEMES: Record<string, PatchTheme> = {
  'Sawatch Range': {
    shortRange: 'SAWATCH RANGE',
    border: '#1b4332', stitching: '#d4a017',
    skyTop: '#0a1628', skyBottom: '#1e3a5f',
    bgMtn: '#2a4a7a', midMtn: '#16294d', fgMtn: '#0a1830', fgLight: '#3d6899',
    snow: '#ddeeff', treeFill: '#091a10',
    bannerBg: '#0d2218', textColor: '#d4a017', accentText: '#7aadc8',
    stars: true, starColor: '#b0c8e8',
  },
  'Sangre de Cristo': {
    shortRange: 'SANGRE DE CRISTO',
    border: '#6b1414', stitching: '#d4a017',
    skyTop: '#1a0306', skyBottom: '#7a1e00',
    bgMtn: '#5c1a0a', midMtn: '#380a04', fgMtn: '#1c0402', fgLight: '#7a3018',
    snow: '#fff0e0', treeFill: '#120402',
    bannerBg: '#3d0808', textColor: '#d4a017', accentText: '#d4806a',
    stars: false, starColor: '',
  },
  'San Juan Mountains': {
    shortRange: 'SAN JUAN MTNS',
    border: '#7a3410', stitching: '#e8d060',
    skyTop: '#100800', skyBottom: '#7a3800',
    bgMtn: '#6b3008', midMtn: '#3d1a04', fgMtn: '#1c0c01', fgLight: '#8a5020',
    snow: '#fff8e0', treeFill: '#100800',
    bannerBg: '#421c06', textColor: '#e8d060', accentText: '#c89048',
    stars: false, starColor: '',
  },
  'Front Range': {
    shortRange: 'FRONT RANGE',
    border: '#1e3050', stitching: '#90b4d0',
    skyTop: '#05080f', skyBottom: '#182638',
    bgMtn: '#263850', midMtn: '#141f30', fgMtn: '#080e1a', fgLight: '#3a5570',
    snow: '#e0ecf8', treeFill: '#060c14',
    bannerBg: '#0c1828', textColor: '#90b4d0', accentText: '#6090b0',
    stars: true, starColor: '#a0c0d8',
  },
  'Mosquito Range': {
    shortRange: 'MOSQUITO RANGE',
    border: '#0d3826', stitching: '#68c8a0',
    skyTop: '#000d06', skyBottom: '#063824',
    bgMtn: '#0a4028', midMtn: '#052618', fgMtn: '#02100a', fgLight: '#166044',
    snow: '#e0faf0', treeFill: '#020a05',
    bannerBg: '#031810', textColor: '#68c8a0', accentText: '#3ea880',
    stars: true, starColor: '#90e0c0',
  },
  'Elk Mountains': {
    shortRange: 'ELK MOUNTAINS',
    border: '#361060', stitching: '#b080e0',
    skyTop: '#06010f', skyBottom: '#361060',
    bgMtn: '#3e1470', midMtn: '#230840', fgMtn: '#0e031c', fgLight: '#5c2890',
    snow: '#f0e8ff', treeFill: '#06010f',
    bannerBg: '#1a0630', textColor: '#b080e0', accentText: '#8050c0',
    stars: true, starColor: '#c8a0f0',
  },
};

export function getPatchTheme(range: string): PatchTheme {
  return PATCH_THEMES[range] ?? PATCH_THEMES['Front Range'];
}
