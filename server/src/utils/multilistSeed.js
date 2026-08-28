// Boot-time reconciliation for the combined 341-peak / 7-list dataset (ADK
// 46, CA 14ers, CA 13ers, Catskill 3500, NE 67, NH 48, US State Highpoints).
//
// Mirrors how the original 58-peak MOUNTAINS seed and the co-14ers backfill
// already work in db.js: idempotent, safe to run on every server boot, and
// the *only* path this data can actually reach production through, since
// production's SQLite file lives on the Railway container and is reachable
// only over HTTP -- there's no way to run a one-off script against it
// directly. server/scripts/import-multilist.js uses this same function for
// local dev/testing and to (re)generate the STUBS badge-data file; db.js
// calls it on every boot so a fresh deploy picks the data up automatically.
//
// mountains.name is UNIQUE; this dataset's collisions are the same name
// reused in a different state (verified: no within-state duplicates) --
// including a few that collide with the pre-existing Colorado import (e.g.
// "Mount Lincoln" is both a CO 14er and an NH 4000-footer) -- so state is
// enough to disambiguate. The one exception is Mount Elbert: a pre-existing
// row with no state on file is one of the original 58 Colorado peaks
// (imported before the `state` column existed), and if this CSV row is
// also Colorado, it's the literal same mountain -- Elbert is both a curated
// 14er and Colorado's state highpoint -- so it's reused, not duplicated.

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../scripts/data/all_peaks.csv');
const PHOTOS_DIR = path.join(__dirname, '../assets/peak-photos');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); field = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const STATE_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
};

const STATE_REGION = {
  Alaska: 'MOUNTAIN_WEST', Washington: 'MOUNTAIN_WEST', Oregon: 'MOUNTAIN_WEST',
  Montana: 'MOUNTAIN_WEST', Idaho: 'MOUNTAIN_WEST', Wyoming: 'MOUNTAIN_WEST',
  Utah: 'MOUNTAIN_WEST', Nevada: 'MOUNTAIN_WEST', Arizona: 'MOUNTAIN_WEST',
  'New Mexico': 'MOUNTAIN_WEST', Hawaii: 'MOUNTAIN_WEST',

  'North Dakota': 'HEARTLAND', 'South Dakota': 'HEARTLAND', Nebraska: 'HEARTLAND',
  Kansas: 'HEARTLAND', Minnesota: 'HEARTLAND', Iowa: 'HEARTLAND', Missouri: 'HEARTLAND',
  Wisconsin: 'HEARTLAND', Illinois: 'HEARTLAND', Indiana: 'HEARTLAND', Michigan: 'HEARTLAND',
  Ohio: 'HEARTLAND',

  Tennessee: 'APPALACHIAN_SOUTH', 'North Carolina': 'APPALACHIAN_SOUTH',
  Virginia: 'APPALACHIAN_SOUTH', 'West Virginia': 'APPALACHIAN_SOUTH',
  Kentucky: 'APPALACHIAN_SOUTH', Georgia: 'APPALACHIAN_SOUTH',
  'South Carolina': 'APPALACHIAN_SOUTH', Alabama: 'APPALACHIAN_SOUTH',
  Mississippi: 'APPALACHIAN_SOUTH', Arkansas: 'APPALACHIAN_SOUTH',
  Louisiana: 'APPALACHIAN_SOUTH', Texas: 'APPALACHIAN_SOUTH', Oklahoma: 'APPALACHIAN_SOUTH',
  Florida: 'APPALACHIAN_SOUTH',

  'New Jersey': 'NORTHEAST_HILLS', Pennsylvania: 'NORTHEAST_HILLS', Maryland: 'NORTHEAST_HILLS',
  Delaware: 'NORTHEAST_HILLS', Connecticut: 'NORTHEAST_HILLS', 'Rhode Island': 'NORTHEAST_HILLS',
  Massachusetts: 'NORTHEAST_HILLS',
};

function paletteKeyFor(lists, state) {
  if (lists.includes('adk-46ers'))     return 'ADIRONDACK';
  if (lists.includes('catskill-3500')) return 'CATSKILL';
  if (lists.includes('nh-48'))         return 'WHITE_MTNS';
  if (lists.includes('ne-67'))         return 'NEW_ENGLAND';
  if (lists.includes('ca-14ers') || lists.includes('ca-13ers')) return 'SIERRA';
  return STATE_REGION[state] || 'MOUNTAIN_WEST';
}

const LIST_DISPLAY_NAMES = {
  'adk-46ers': 'Adirondack 46',
  'ca-13ers': 'California 13ers',
  'ca-14ers': 'California 14ers',
  'catskill-3500': 'Catskill 3500',
  'ne-67': 'New England 67',
  'nh-48': 'New Hampshire 48',
  'us-state-highpoints': 'US State Highpoints',
};
const LIST_REGIONS = {
  'adk-46ers': 'New York',
  'ca-13ers': 'California',
  'ca-14ers': 'California',
  'catskill-3500': 'New York',
  'ne-67': 'New England',
  'nh-48': 'New Hampshire',
  'us-state-highpoints': 'United States',
};

function resolveMountainId(row, findByName, insertMountain, effectiveRange, elevation) {
  const candidates = [row.name, `${row.name} (${row.state})`];
  for (const name of candidates) {
    const existing = findByName.get(name);
    if (!existing) {
      const result = insertMountain.run(name, elevation, effectiveRange, Number(row.lat), Number(row.lon), 'import:multilist-2026', row.state);
      return { id: result.lastInsertRowid, inserted: true, resolvedName: name };
    }
    const sameMountain = existing.state === row.state || (!existing.state && row.state === 'Colorado');
    if (sameMountain) {
      return { id: existing.id, inserted: false, resolvedName: name };
    }
  }
  throw new Error(`Could not disambiguate "${row.name}" (${row.state}, ${elevation}ft) -- both name tiers collide with other peaks`);
}

/**
 * Reconciles the mountains/peak_lists/peak_list_memberships/mountain_photos
 * tables against all_peaks.csv. Idempotent -- safe (and cheap; ~340 simple
 * lookups) to call on every boot. Returns per-row results so callers that
 * need them (the standalone import script, for regenerating badge STUBS)
 * don't have to duplicate this resolution logic.
 */
function seedMultilist(db) {
  if (!fs.existsSync(CSV_PATH)) return [];

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));

  const insertMountain = db.prepare(
    'INSERT INTO mountains (name, elevation, range, lat, lng, source, state) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const findByName = db.prepare('SELECT id, state, elevation FROM mountains WHERE name = ?');
  const upsertList = db.prepare(
    'INSERT INTO peak_lists (key, name, region, description) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET name = excluded.name, region = excluded.region, description = excluded.description'
  );
  const getListId = db.prepare('SELECT id FROM peak_lists WHERE key = ?');
  const insertMembership = db.prepare(
    'INSERT OR IGNORE INTO peak_list_memberships (peak_list_id, mountain_id, rank_in_list) VALUES (?, ?, ?)'
  );
  const findExistingPhoto = db.prepare('SELECT id FROM mountain_photos WHERE mountain_id = ? AND rank = 0');
  const insertPhoto = db.prepare(
    'INSERT INTO mountain_photos (mountain_id, rank, filename, license, author, source_url) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const results = [];
  const listMembers = {};

  const run = db.transaction((peakRows) => {
    for (const row of peakRows) {
      const lists = row.lists ? row.lists.split(';') : [];
      const elevation = Math.round(parseFloat(row.elevation_ft));
      const effectiveRange = row.range.trim() || row.state;

      const { id: mountainId, inserted, resolvedName } = resolveMountainId(row, findByName, insertMountain, effectiveRange, elevation);
      const stateAbbr = STATE_ABBR[row.state];
      results.push({ row, mountainId, inserted, resolvedName, lists, elevation, stateAbbr, paletteKey: paletteKeyFor(lists, row.state) });

      for (const listKey of lists) {
        (listMembers[listKey] ||= []).push({ mountainId, elevation });
      }

      // Self-host a downloaded photo's DB row if the file exists on disk
      // (committed to the repo by scripts/download-photos.js) and this
      // mountain doesn't already have one (e.g. Mount Elbert already has
      // its own curated default photo from the original 58). Filed under
      // the CSV's own stable id, not the numeric mountain_id -- that id is
      // assigned by SQLite autoincrement order, which depends on whatever
      // else is already in the table, so it's different between local dev
      // and production. The CSV id is the only name stable across both.
      const photoFile = `${row.id}-0.jpg`;
      if (row.photo_url.trim() && fs.existsSync(path.join(PHOTOS_DIR, photoFile)) && !findExistingPhoto.get(mountainId)) {
        insertPhoto.run(mountainId, 0, photoFile, row.photo_license, row.photo_author || null, row.photo_source_page);
      }
    }

    for (const [listKey, members] of Object.entries(listMembers)) {
      upsertList.run(listKey, LIST_DISPLAY_NAMES[listKey] || listKey, LIST_REGIONS[listKey] || 'United States', null);
      const listId = getListId.get(listKey).id;
      const byElevDesc = [...members].sort((a, b) => b.elevation - a.elevation);
      byElevDesc.forEach((m, i) => insertMembership.run(listId, m.mountainId, i + 1));
    }
  });
  run(rows);

  return results;
}

module.exports = { seedMultilist, parseCsv, CSV_PATH, PHOTOS_DIR };
