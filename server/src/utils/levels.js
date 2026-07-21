// Climber Rank ladder — derived purely from unique peaks climbed (out of 58).
// Live-computed, not persisted: if a user later deletes a climb and drops
// below a threshold, their displayed rank drops too (mirrors how "climbed"
// badge state already works elsewhere in the app).

const LEVELS = [
  { level: 0,  name: 'Trailhead Rookie',        minPeaks: 0 },
  { level: 1,  name: 'Switchback Scrambler',    minPeaks: 5 },
  { level: 2,  name: 'Ridge Runner',            minPeaks: 10 },
  { level: 3,  name: 'Alpine Adventurer',       minPeaks: 15 },
  { level: 4,  name: 'Summit Seeker',           minPeaks: 20 },
  { level: 5,  name: 'Peak Bagger',             minPeaks: 25 },
  { level: 6,  name: 'High Country Veteran',    minPeaks: 30 },
  { level: 7,  name: 'Thin Air Master',         minPeaks: 35 },
  { level: 8,  name: 'Fourteener Elite',        minPeaks: 40 },
  { level: 9,  name: 'Summit Sage',             minPeaks: 45 },
  { level: 10, name: 'Granite Guardian',        minPeaks: 50 },
  { level: 11, name: 'Continental Conqueror',   minPeaks: 55 },
  { level: 12, name: 'Fourteener Legend',       minPeaks: 58 },
];

function levelForCount(uniquePeaks) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (uniquePeaks >= l.minPeaks) current = l;
    else break;
  }
  const next = LEVELS.find(l => l.minPeaks > current.minPeaks) || null;
  return {
    level: current.level,
    name: current.name,
    min_peaks: current.minPeaks,
    next_level: next ? next.level : null,
    next_name: next ? next.name : null,
    next_min_peaks: next ? next.minPeaks : null,
    peaks_to_next: next ? Math.max(0, next.minPeaks - uniquePeaks) : 0,
  };
}

function nameForLevel(level) {
  return (LEVELS.find(l => l.level === level) || LEVELS[0]).name;
}

module.exports = { LEVELS, levelForCount, nameForLevel };
