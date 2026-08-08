#!/usr/bin/env node
// Generic peak-list importer. Reads a normalized JSON array (produced by an
// adapter script, e.g. adapters/from_co13ers_xlsx.py) and:
//   1. Inserts mountains rows (disambiguating any name collision).
//   2. Upserts the target peak_lists row and inserts membership rows.
//   3. Writes a STUBS + DB_ID_TO_PEAK_ID badge-data file for the new peaks,
//      so server/src/data/peaks-data.js can pick them up on next require.
//
// This is meant to be run once per import batch, not on every server boot
// (unlike the MOUNTAINS seed in db.js, which is idempotent by design).
//
// Usage:
//   node import-peaks.js <normalized.json> --list-key=co-13ers \
//     --list-name="Colorado 13ers" --region=Colorado \
//     --badge-out=../src/data/generated-co-13ers-badges.js \
//     --id-prefix=co13

const fs = require('fs');
const path = require('path');
const { initDb, getDb } = require('../src/db');

function parseArgs(argv) {
  const [jsonPath, ...rest] = argv;
  const opts = { jsonPath };
  for (const arg of rest) {
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}

function slugify(name, idPrefix, index) {
  const base = name
    .toLowerCase()
    .replace(/["()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${idPrefix}-${index}-${base}`.slice(0, 60);
}

// Resolve a peak to a mountains row, inserting one if it doesn't exist yet.
// mountains.name is UNIQUE, and generic names ("Grizzly Peak", "UN 13,552")
// repeat across ranges and even within one range at different elevations, so
// disambiguation escalates through 3 tiers: bare name -> name+range ->
// name+range+elevation (verified sufficient for this dataset -- no two
// entries share all of name+range+elevation).
//
// This must stay idempotent across re-runs: a peak already inserted under a
// disambiguated name (e.g. "Grizzly Peak (San Juan Mountains)") has to be
// recognized as already-present next time, even though its bare name is
// taken by a *different* peak. So each tier is checked against the DB by
// exact name, and a hit only counts as "this same peak" if its stored
// range+elevation also match -- a hit with different range/elevation means
// the name is taken by someone else, and we escalate to the next tier.
function resolveMountainId(peak, findByName, insertMountain, source) {
  const candidates = [
    peak.name,
    `${peak.name} (${peak.rangeLabel})`,
    `${peak.name} (${peak.rangeLabel}, ${peak.elevation}ft)`,
  ];
  for (const name of candidates) {
    const row = findByName.get(name);
    if (!row) {
      const result = insertMountain.run(name, peak.elevation, peak.rangeLabel, peak.lat, peak.lng, source);
      return { id: result.lastInsertRowid, inserted: true };
    }
    if (row.range === peak.rangeLabel && row.elevation === peak.elevation) {
      return { id: row.id, inserted: false };
    }
  }
  throw new Error(`Could not disambiguate "${peak.name}" (${peak.rangeLabel}, ${peak.elevation}ft) -- all 3 name tiers collide with other peaks`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.jsonPath || !opts['list-key'] || !opts['list-name'] || !opts.region || !opts['badge-out'] || !opts['id-prefix']) {
    console.error('Usage: node import-peaks.js <normalized.json> --list-key=KEY --list-name=NAME --region=REGION --badge-out=PATH --id-prefix=PREFIX [--list-description=TEXT]');
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(opts.jsonPath, 'utf8'));
  console.log(`Read ${rows.length} peaks from ${opts.jsonPath}`);

  initDb();
  const db = getDb();

  db.prepare(
    'INSERT OR IGNORE INTO peak_lists (key, name, region, description) VALUES (?, ?, ?, ?)'
  ).run(opts['list-key'], opts['list-name'], opts.region, opts['list-description'] || null);
  const listId = db.prepare('SELECT id FROM peak_lists WHERE key = ?').get(opts['list-key']).id;

  const insertMountain = db.prepare(
    'INSERT INTO mountains (name, elevation, range, lat, lng, source) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMembership = db.prepare(
    'INSERT OR IGNORE INTO peak_list_memberships (peak_list_id, mountain_id, rank_in_list) VALUES (?, ?, ?)'
  );
  const findByName = db.prepare('SELECT id, range, elevation FROM mountains WHERE name = ?');
  const source = `import:${opts['list-key']}`;

  // Always regenerate the full stub/id-map for every peak in this batch,
  // whether freshly inserted or already present -- otherwise a re-run over
  // an already-imported list would overwrite the badge data file with an
  // empty one, since nothing "new" got inserted.
  const stubs = [];
  const idMap = {};
  let inserted = 0, skipped = 0;

  const run = db.transaction((peaks) => {
    // Input is already elevation-descending (adapter's sort), which is
    // exactly the rank_in_list order for this list.
    peaks.forEach((peak, i) => {
      const rankInList = i + 1;
      const { id: mountainId, inserted: wasInserted } = resolveMountainId(peak, findByName, insertMountain, source);
      wasInserted ? inserted++ : skipped++;

      const peakId = slugify(peak.name, opts['id-prefix'], i);
      const nameUpper = peak.name.replace(/["]/g, '').toUpperCase();
      stubs.push([peakId, nameUpper, nameUpper, String(peak.elevation), peak.paletteKey]);
      idMap[mountainId] = peakId;

      insertMembership.run(listId, mountainId, rankInList);
    });
  });
  run(rows);

  console.log(`Mountains: ${inserted} inserted, ${skipped} already present (reused)`);

  const badgeModule = `// GENERATED by server/scripts/import-peaks.js -- do not hand-edit.
// STUBS-shaped entries + DB id map for the ${opts['list-name']} import.
// Regenerate by re-running the importer, not by editing this file directly.
module.exports = {
  STUBS: ${JSON.stringify(stubs)},
  DB_ID_TO_PEAK_ID: ${JSON.stringify(idMap, null, 2)},
};
`;
  const badgeOutPath = path.resolve(__dirname, opts['badge-out']);
  fs.writeFileSync(badgeOutPath, badgeModule);
  console.log(`Wrote badge data for ${stubs.length} new peaks to ${badgeOutPath}`);

  const { c: totalMountains } = db.prepare('SELECT COUNT(*) c FROM mountains').get();
  const { c: totalMembers } = db.prepare('SELECT COUNT(*) c FROM peak_list_memberships WHERE peak_list_id = ?').get(listId);
  console.log(`Done. mountains table now has ${totalMountains} rows; "${opts['list-name']}" list has ${totalMembers} members.`);
}

main();
