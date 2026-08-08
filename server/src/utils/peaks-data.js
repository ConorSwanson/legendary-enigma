// Thin re-export over the canonical peak data (server/src/data/peaks-data.js)
// so OG share cards and badge rendering never drift out of sync again — this
// used to be its own duplicated copy of PEAKS/STUBS/PALETTES.
const { PEAKS, PALETTES } = require('../data/peaks-data');

// Lookup by normalized full name (case-insensitive), with explicit overrides for edge cases
const OVERRIDES = {
  'mount evans': 'evans', 'mount of the holy cross': 'holycross',
  'north eolus': 'northeolus', 'wilson peak': 'wilsonpk',
  'crestone needle': 'crestoneneedle', 'crestone peak': 'crestonepk',
  'kit carson peak': 'kitcarson', 'challenger point': 'challenger',
  'ellingwood point': 'ellingwood', 'little bear peak': 'littlebear',
  'mount wilson': 'mtwilson', 'el diente peak': 'eldiente',
  'north maroon peak': 'northmaroon',
};
const PEAKS_BY_ID = Object.fromEntries(PEAKS.map(p => [p.id, p]));

function findPeak(mountainName) {
  const lower = mountainName.toLowerCase();
  const id = OVERRIDES[lower];
  if (id) return PEAKS_BY_ID[id];
  const n = lower.replace(/\bmt\.?\b/g, 'mount').replace(/\bmtn\.?\b/g, 'mountain').trim();
  return PEAKS.find(p => p.full.toLowerCase() === n);
}

module.exports = { PEAKS, PALETTES, findPeak };
