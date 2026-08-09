const path = require('path');

const PEAK_PHOTOS_DIR = path.join(__dirname, '../assets/peak-photos');

// Every mountain's curated default photos, keyed by mountain id, ordered by
// rank (0 = primary). Shared by mountains.js (full rotation list), feed.js
// (rank-0 fallback when a climb has no photo of its own), and ogImage.js
// (rank-0 fallback for share cards) -- one query, one source of truth.
function allDefaultPhotos(db) {
  const rows = db.prepare(
    'SELECT mountain_id, filename, license, author, source_url FROM mountain_photos ORDER BY mountain_id, rank ASC'
  ).all();
  const map = {};
  for (const r of rows) (map[r.mountain_id] ??= []).push(r);
  return map;
}

// True when a license requires a visible photographer credit in the UI.
// Public Domain and CC0 don't; every CC-BY/CC-BY-SA variant does.
function needsAttribution(license) {
  return /^CC BY/i.test(license || '');
}

module.exports = { PEAK_PHOTOS_DIR, allDefaultPhotos, needsAttribution };
