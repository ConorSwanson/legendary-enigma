const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, UPLOADS_DIR } = require('../db');
const { array: uploadArray } = require('../middleware/upload');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');
const { levelForCount } = require('../utils/levels');

// Compares unique-peak count before/after an insert; if it crossed a level
// threshold, records a self-notification and sends a push. Call AFTER the
// climb row exists so climb_id can be attached.
function checkLevelUp(db, userId, beforeCount, climbId) {
  const { c: afterCount } = db.prepare(
    'SELECT COUNT(DISTINCT mountain_id) AS c FROM climbs WHERE user_id = ?'
  ).get(userId);
  if (afterCount <= beforeCount) return;

  const beforeLevel = levelForCount(beforeCount).level;
  const afterLevel = levelForCount(afterCount).level;
  if (afterLevel <= beforeLevel) return;

  const { name } = levelForCount(afterCount);
  db.prepare(
    "INSERT INTO notifications (user_id, from_user_id, type, climb_id, level) VALUES (?, ?, 'level_up', ?, ?)"
  ).run(userId, userId, climbId, afterLevel);

  pushToUser(userId, {
    title: 'Rank Up! 🏔',
    body: `You've reached ${name}!`,
    climbId,
  }).catch(() => {});
}

const UPLOAD_DIR = UPLOADS_DIR;
const VALID_VISIBILITY = new Set(['public', 'followers', 'private']);

function withPhotoUrl(row, req) {
  if (!row.photo_path) return { ...row, photo_url: null };
  const base = req ? `${req.protocol}://${req.get('host')}` : '';
  return { ...row, photo_url: `${base}/uploads/${row.photo_path}` };
}

function deleteFile(filename) {
  if (!filename) return;
  const p = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// All photos for a climb, cover first. Falls back to the legacy single
// photo_path for climbs logged before climb_photos existed.
function photoUrlsFor(db, climbId, req, fallbackPhotoPath) {
  const base = `${req.protocol}://${req.get('host')}`;
  const rows = db.prepare(
    'SELECT photo_path FROM climb_photos WHERE climb_id = ? ORDER BY position ASC'
  ).all(climbId);
  if (rows.length) return rows.map(r => `${base}/uploads/${r.photo_path}`);
  return fallbackPhotoPath ? [`${base}/uploads/${fallbackPhotoPath}`] : [];
}

// GET /api/climbs — own climbs only
router.get('/', requireAuth, (req, res) => {
  const { year, mountain_id, page = '1', limit = '50' } = req.query;
  const params = [req.user.id];
  let where = 'WHERE c.user_id = ?';

  if (year) {
    where += ` AND strftime('%Y', c.climb_date) = ?`;
    params.push(String(year));
  }
  if (mountain_id) {
    where += ' AND c.mountain_id = ?';
    params.push(Number(mountain_id));
  }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit), offset);

  const rows = getDb().prepare(`
    SELECT c.*, m.name AS mountain_name, m.elevation, m.range
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    ${where}
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json(rows.map(r => withPhotoUrl(r, req)));
});

// GET /api/climbs/:id — own or public climb
router.get('/:id', requireAuth, (req, res) => {
  const row = getDb().prepare(`
    SELECT c.*, m.name AS mountain_name, m.elevation, m.range,
           u.name AS user_name, u.id AS user_id, u.avatar_path AS user_avatar_path,
           (SELECT COUNT(*) FROM climb_likes WHERE climb_id = c.id) AS like_count,
           EXISTS(SELECT 1 FROM climb_likes WHERE climb_id = c.id AND user_id = ?) AS is_liked,
           (SELECT COUNT(*) FROM climb_comments WHERE climb_id = c.id) AS comment_count
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.user.id, req.params.id);

  if (!row) return res.status(404).json({ error: 'Climb not found' });

  // Visibility check
  if (row.user_id !== req.user.id) {
    if (row.visibility === 'private') return res.status(403).json({ error: 'Private climb' });
    if (row.visibility === 'followers') {
      const follows = getDb().prepare(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
      ).get(req.user.id, row.user_id);
      if (!follows) return res.status(403).json({ error: 'Followers only' });
    }
  }

  const base = `${req.protocol}://${req.get('host')}`;
  const user_avatar_url = row.user_avatar_path ? `${base}/uploads/${row.user_avatar_path}` : null;
  const photo_urls = photoUrlsFor(getDb(), row.id, req, row.photo_path);

  res.json({ ...withPhotoUrl(row, req), photo_urls, user_avatar_url, is_owner: row.user_id === req.user.id, is_liked: !!row.is_liked, like_count: row.like_count ?? 0, comment_count: row.comment_count ?? 0 });
});

// POST /api/climbs — accepts multiple photos under the "photos" field; the
// first becomes the legacy cover (climbs.photo_path) so every existing
// consumer (feed, badges, share cards) keeps working unchanged.
router.post('/', requireAuth, uploadArray('photos', 10), (req, res) => {
  const { mountain_id, climb_date, notes, visibility = 'public' } = req.body;
  const photoFiles = req.files || [];
  if (!mountain_id || !climb_date) {
    photoFiles.forEach(f => deleteFile(f.filename));
    return res.status(400).json({ error: 'mountain_id and climb_date are required' });
  }

  const vis = VALID_VISIBILITY.has(visibility) ? visibility : 'public';
  const cover = photoFiles[0]?.filename || null;

  const db = getDb();
  const { c: beforeCount } = db.prepare(
    'SELECT COUNT(DISTINCT mountain_id) AS c FROM climbs WHERE user_id = ?'
  ).get(req.user.id);

  const result = db.prepare(
    'INSERT INTO climbs (user_id, mountain_id, climb_date, notes, photo_path, visibility) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, Number(mountain_id), climb_date, notes || null, cover, vis);

  const climbId = result.lastInsertRowid;
  if (photoFiles.length) {
    const insertPhoto = db.prepare('INSERT INTO climb_photos (climb_id, photo_path, position) VALUES (?, ?, ?)');
    photoFiles.forEach((f, i) => insertPhoto.run(climbId, f.filename, i));
  }

  checkLevelUp(db, req.user.id, beforeCount, climbId);

  res.status(201).json({ id: climbId });
});

function handleUpdateClimb(req, res) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM climbs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) {
    (req.files || []).forEach(f => deleteFile(f.filename));
    return res.status(404).json({ error: 'Climb not found' });
  }

  const { mountain_id, climb_date, notes, visibility } = req.body;
  let photo_path = existing.photo_path;

  // The edit UI now knows the full gallery (unlike the old single-photo
  // form), so `keep_photos` — a JSON array of existing photo_path filenames,
  // in the order the client wants them — is the full source of truth for
  // what survives. Anything not named there gets deleted from disk; new
  // uploads are appended after the kept ones. Only touch photos at all if
  // the client actually sent keep_photos, so other callers that omit it
  // (there are none today, but keep this defensive) leave the gallery alone.
  if (req.body.keep_photos !== undefined) {
    let keepPaths;
    try {
      keepPaths = JSON.parse(req.body.keep_photos);
      if (!Array.isArray(keepPaths)) throw new Error('not an array');
    } catch {
      keepPaths = [];
    }

    const existingPhotos = db.prepare(
      'SELECT photo_path FROM climb_photos WHERE climb_id = ?'
    ).all(req.params.id);
    const existingPathSet = new Set(existingPhotos.map(p => p.photo_path));
    // Only ever keep paths that actually belong to this climb — never trust
    // client-supplied filenames blindly.
    const validKeepPaths = keepPaths.filter(p => existingPathSet.has(p));

    const toDelete = existingPhotos.filter(p => !validKeepPaths.includes(p.photo_path));
    if (toDelete.length) toDelete.forEach(p => deleteFile(p.photo_path));
    if (!existingPhotos.length && existing.photo_path && !validKeepPaths.includes(existing.photo_path)) {
      deleteFile(existing.photo_path);
    }

    const newPaths = (req.files || []).map(f => f.filename);
    const finalPaths = [...validKeepPaths, ...newPaths];

    db.prepare('DELETE FROM climb_photos WHERE climb_id = ?').run(req.params.id);
    const insertPhoto = db.prepare('INSERT INTO climb_photos (climb_id, photo_path, position) VALUES (?, ?, ?)');
    finalPaths.forEach((p, i) => insertPhoto.run(req.params.id, p, i));

    photo_path = finalPaths[0] || null;
  }

  const vis = visibility && VALID_VISIBILITY.has(visibility) ? visibility : existing.visibility;

  const { c: beforeCount } = db.prepare(
    'SELECT COUNT(DISTINCT mountain_id) AS c FROM climbs WHERE user_id = ?'
  ).get(req.user.id);

  db.prepare(
    'UPDATE climbs SET mountain_id=?, climb_date=?, notes=?, photo_path=?, visibility=? WHERE id=?'
  ).run(
    mountain_id ? Number(mountain_id) : existing.mountain_id,
    climb_date || existing.climb_date,
    notes !== undefined ? (notes || null) : existing.notes,
    photo_path,
    vis,
    req.params.id
  );

  checkLevelUp(db, req.user.id, beforeCount, Number(req.params.id));

  const row = db.prepare(`
    SELECT c.*, m.name AS mountain_name, m.elevation, m.range,
           u.name AS user_name, u.id AS user_id,
           (SELECT COUNT(*) FROM climb_likes WHERE climb_id = c.id) AS like_count,
           (SELECT COUNT(*) FROM climb_comments WHERE climb_id = c.id) AS comment_count
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  const photo_urls = photoUrlsFor(db, row.id, req, row.photo_path);
  res.json({ ...withPhotoUrl(row, req), photo_urls, is_owner: true, is_liked: false, like_count: row.like_count ?? 0, comment_count: row.comment_count ?? 0 });
}

// PUT /api/climbs/:id
router.put('/:id', requireAuth, uploadArray('photos', 10), handleUpdateClimb);

// PATCH /api/climbs/:id (iOS client uses PATCH)
router.patch('/:id', requireAuth, uploadArray('photos', 10), handleUpdateClimb);

// DELETE /api/climbs/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT * FROM climbs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });

  const photoRows = db.prepare('SELECT photo_path FROM climb_photos WHERE climb_id = ?').all(req.params.id);
  if (photoRows.length) {
    photoRows.forEach(p => deleteFile(p.photo_path));
  } else {
    deleteFile(climb.photo_path);
  }
  db.prepare('DELETE FROM climbs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/climbs/:id/likes — list users who liked
router.get('/:id/likes', requireAuth, (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const users = getDb().prepare(`
    SELECT u.id, u.name, u.avatar_path
    FROM climb_likes cl JOIN users u ON u.id = cl.user_id
    WHERE cl.climb_id = ?
    ORDER BY cl.created_at DESC LIMIT 200
  `).all(req.params.id);
  res.json(users.map(u => ({
    id: u.id, name: u.name, bio: null,
    avatar_url: u.avatar_path ? `${base}/uploads/${u.avatar_path}` : null,
  })));
});

// POST /api/climbs/:id/like — toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT id, visibility, user_id FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });
  if (climb.visibility === 'private' && climb.user_id !== req.user.id)
    return res.status(403).json({ error: 'Private climb' });

  const existing = db.prepare('SELECT id FROM climb_likes WHERE user_id = ? AND climb_id = ?')
    .get(req.user.id, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM climb_likes WHERE user_id = ? AND climb_id = ?').run(req.user.id, req.params.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO climb_likes (user_id, climb_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    if (climb.user_id && climb.user_id !== req.user.id) {
      db.prepare(
        "INSERT INTO notifications (user_id, from_user_id, type, climb_id) VALUES (?, ?, 'like', ?)"
      ).run(climb.user_id, req.user.id, req.params.id);
      const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const mountain = db.prepare(
        'SELECT m.name FROM climbs c JOIN mountains m ON c.mountain_id = m.id WHERE c.id = ?'
      ).get(req.params.id);
      pushToUser(climb.user_id, {
        title: 'New Like',
        body: `${fromUser?.name || 'Someone'} liked your climb on ${mountain?.name || 'a peak'}`,
        climbId: Number(req.params.id),
      }).catch(() => {});
    }
  }

  const { count } = db.prepare('SELECT COUNT(*) as count FROM climb_likes WHERE climb_id = ?').get(req.params.id);
  res.json({ liked: !existing, count });
});

module.exports = router;
