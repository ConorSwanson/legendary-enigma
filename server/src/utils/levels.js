// Climber Rank ladder — one named tier every 5 unique peaks climbed, with no
// fixed ceiling: level = floor(uniquePeaks / 5). This scales automatically
// as more peaks/lists get added later (California 14ers, whatever comes
// next) with zero rebalancing -- the previous version hardcoded 13 tiers
// against a ceiling of 58, which broke the moment 582 Colorado 13ers were
// added and every existing user's rank silently dropped.
//
// Live-computed, not persisted: if a user later deletes a climb and drops
// below a threshold, their displayed rank drops too (mirrors how "climbed"
// badge state already works elsewhere in the app).

const PEAKS_PER_LEVEL = 5;

// 129 curated names (levels 0-128, covering up to 641 peaks), grouped into
// 13 thematic bands of ~10 levels each. When a future list pushes the peak
// count past 641, extend this array -- nothing else needs to change.
const LEVEL_NAMES = [
  // Band 1 — Trailhead (0-45 peaks)
  'Trailhead Arrival', 'First Light Riser', 'Trail Dust Collector', 'False Summit Survivor',
  '4AM Parking Lot Regular', 'Switchback Counter', 'Trail Mix Connoisseur', 'Elevation Gain Junkie',
  'High Camp Regular', 'Switchback Veteran',
  // Band 2 — Switchback (50-95 peaks)
  'Switchback Scrambler', 'Scree Field Veteran', 'Talus Hopper', 'Windbreak Wanderer',
  'Krummholz Crosser', 'Cairnstacker', 'Boulder Field Navigator', 'Snowfield Stepper',
  'Class 2 Climber', 'Basin Explorer',
  // Band 3 — Ridge (100-145 peaks)
  'Ridge Runner', 'Knife-Edge Novice', 'Saddle Crosser', 'Exposure Handler',
  'Couloir Scout', 'Arête Aspirant', 'Cornice Watcher', 'Traverse Tactician',
  'Class 3 Climber', 'Sawtooth Seeker',
  // Band 4 — Alpine (150-195 peaks)
  'Alpine Adventurer', 'Glacier Gazer', 'Headwall Hiker', 'Basin Bagger',
  'Moraine Wanderer', 'Tarn Chaser', 'Cirque Circler', 'Class 4 Climber',
  'Snowpack Reader', 'Route-Finder',
  // Band 5 — Summit Seeker (200-245 peaks)
  'Summit Seeker', 'Elevation Chaser', 'Wind-Scoured Wanderer', 'Headlamp Starter',
  'Pre-Dawn Departer', 'Rock Glacier Rambler', 'Boulder Problem Solver', 'Talus Traverser',
  'Class 5 Contemplator', 'Peakbagging Prodigy',
  // Band 6 — Peak Bagger (250-295 peaks)
  'Peak Bagger', 'List Checker', 'Logbook Loyalist', 'Range Roamer',
  'Standard Route Master', 'Weather Window Watcher', 'Approach Trail Expert', 'Bushwhack Survivor',
  'Scramble Specialist', 'Summit Selfie Veteran',
  // Band 7 — High Country (300-345 peaks)
  'High Country Veteran', 'Timberline Trekker', 'Alpine Lake Collector', 'Basin-to-Basin Traveler',
  'Sub-Range Specialist', 'Watershed Wanderer', 'Continental Divide Devotee', 'Storm Cell Dodger',
  'Second Sunrise Seeker', 'Distant Range Dreamer',
  // Band 8 — Thin Air (350-395 peaks)
  'Thin Air Master', 'Altitude Acclimated', 'Oxygen Optimizer', 'Headache-Proof Hiker',
  'High-Elevation Regular', 'Above-Treeline Traveler', 'Rarefied Air Regular', 'Wind Chill Warrior',
  'Lightning Retreat Expert', 'Class 5 Certified',
  // Band 9 — Summit Elite (400-445 peaks)
  'Summit Elite', 'Vertical Mile Veteran', 'Century Peak Club', 'Range-Spanning Rambler',
  'All-Weather Ascender', 'Solo Summit Specialist', 'Peakbagging Purist', 'Ultra-Prominence Pursuer',
  'Centennial Chaser', 'Multi-Range Master',
  // Band 10 — Summit Sage (450-495 peaks)
  'Summit Sage', 'Trail Wisdom Keeper', 'Route Encyclopedia', 'Weather Pattern Prophet',
  'Gear Optimization Guru', 'Beta Sharer', 'Mountain Mentor', 'Peakbagging Historian',
  'Range Cartographer', 'Summit Sherpa',
  // Band 11 — Granite Guardian (500-545 peaks)
  'Granite Guardian', 'Bedrock Believer', 'Igneous Icon', 'Talus Titan',
  'Cirque Custodian', 'Ridgeline Fixture', 'Summit Register Fixture', 'Peakbagging Powerhouse',
  'Alpine Authority', 'Range Royalty',
  // Band 12 — Continental (550-595 peaks)
  'Continental Conqueror', 'Divide Dominator', 'Watershed Warlord', 'Range-Clearing Ronin',
  'Peak Count Colossus', 'Summit Streak Sovereign', 'Elevation Emperor', 'Basin-to-Summit Baron',
  'Alpine Archon', 'Threshold of Legend',
  // Band 13 — Summit Legend (600-641 peaks)
  'Skyline Sovereign', 'Apex Ascender', 'Summit Sovereign', 'Peakbagging Paragon',
  'Range-Conquering Colossus', 'Alpine Immortal', 'Mountain Monarch', 'Legend of the High Country',
  'Summit Legend',
];

const LEVELS = LEVEL_NAMES.map((name, level) => ({ level, name, minPeaks: level * PEAKS_PER_LEVEL }));
const MAX_LEVEL = LEVELS.length - 1;

function levelForCount(uniquePeaks) {
  const level = Math.min(Math.floor(uniquePeaks / PEAKS_PER_LEVEL), MAX_LEVEL);
  const current = LEVELS[level];
  const next = level < MAX_LEVEL ? LEVELS[level + 1] : null;
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
  return (LEVELS[level] || LEVELS[0]).name;
}

module.exports = { LEVELS, levelForCount, nameForLevel };
