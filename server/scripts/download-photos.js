#!/usr/bin/env node
// Downloads and self-hosts the CC0/CC-BY/CC-BY-SA/Public-domain photos
// sourced in all_peaks.csv, filed under the CSV's own stable id
// (server/src/assets/peak-photos/<csvId>-0.jpg) -- not the numeric
// mountain_id, which is assigned by SQLite autoincrement order and so
// differs between local dev and production. multilistSeed.js links these
// files to their mountains.id at boot time by that same stable id.
//
// Pure file download -- no DB access needed. Wikimedia rate-limits the
// shared sandbox egress IP without a descriptive User-Agent, so this
// fetches sequentially with a delay + retry/backoff rather than in
// parallel.
//
// Usage: node download-photos.js [--limit=N] [--start=N]

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const CSV_PATH = path.join(__dirname, 'data/all_peaks.csv');
const PHOTOS_DIR = path.join(__dirname, '../src/assets/peak-photos');
const USER_AGENT = 'SwitchbackApp/1.0 (https://www.getswitchback.co; contact via app support page) node-https';

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

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchWithRetry(url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchBuffer(url);
    } catch (err) {
      if (i === attempts - 1) throw err;
      const backoff = 3000 * Math.pow(2, i);
      console.log(`    retry ${i + 1}/${attempts} after ${err.message} -- waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

// Re-encoded to JPEG regardless of source format, capped at 1920px on the
// long edge -- matches the existing curated photos (150-500KB range), not
// the multi-megabyte full-res Wikimedia Commons originals this pulls from.
async function toWebJpeg(buf) {
  return sharp(buf).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([a-z]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true];
  }));
  const limit = args.limit ? parseInt(args.limit, 10) : Infinity;
  const start = args.start ? parseInt(args.start, 10) : 0;

  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvText).filter(r => r.photo_url.trim());
  console.log(`${rows.length} peaks have a photo_url`);

  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  const batch = rows.slice(start, start + limit);
  let ok = 0, failed = 0, skippedExists = 0;

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const filename = `${row.id}-0.jpg`;
    const outPath = path.join(PHOTOS_DIR, filename);

    if (fs.existsSync(outPath)) { skippedExists++; continue; }

    try {
      const raw = await fetchWithRetry(row.photo_url);
      const buf = await toWebJpeg(raw);
      fs.writeFileSync(outPath, buf);
      ok++;
      console.log(`[${i + start}/${rows.length}] OK   ${row.name} -> ${filename} (${raw.length}b -> ${buf.length}b)`);
    } catch (err) {
      failed++;
      console.log(`[${i + start}/${rows.length}] FAIL ${row.name}: ${err.message}`);
    }

    await sleep(1200);
  }

  console.log(`\nDone. ok=${ok} failed=${failed} skipped(already downloaded)=${skippedExists}`);
}

main().catch(e => { console.error(e); process.exit(1); });
