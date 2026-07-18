const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, UPLOADS_DIR } = require('../db');
const { single: uploadSingle } = require('../middleware/upload');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');

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
           u.name AS user_name, u.id AS user_id,
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

  res.json({ ...withPhotoUrl(row, req), is_owner: row.user_id === req.user.id, is_liked: !!row.is_liked, like_count: row.like_count ?? 0, comment_count: row.comment_count ?? 0 });
});

// POST /api/climbs
router.post('/', requireAuth, uploadSingle('photo'), (req, res) => {
  const { mountain_id, climb_date, notes, visibility = 'public' } = req.body;
  if (!mountain_id || !climb_date) {
    if (req.file) deleteFile(req.file.filename);
    return res.status(400).json({ error: 'mountain_id and climb_date are required' });
  }

  const vis = VALID_VISIBILITY.has(visibility) ? visibility : 'public';
  const photo_path = req.file ? req.file.filename : null;

  const result = getDb().prepare(
    'INSERT INTO climbs (user_id, mountain_id, climb_date, notes, photo_path, visibility) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, Number(mountain_id), climb_date, notes || null, photo_path, vis);

  res.status(201).json({ id: result.lastInsertRowid });
});

function handleUpdateClimb(req, res) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM climbs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) {
    if (req.file) deleteFile(req.file.filename);
    return res.status(404).json({ error: 'Climb not found' });
  }

  const { mountain_id, climb_date, notes, visibility } = req.body;
  let photo_path = existing.photo_path;

  if (req.file) {
    deleteFile(existing.photo_path);
    photo_path = req.file.filename;
  }

  const vis = visibility && VALID_VISIBILITY.has(visibility) ? visibility : existing.visibility;

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

  res.json({ ...withPhotoUrl(row, req), is_owner: true, is_liked: false, like_count: row.like_count ?? 0, comment_count: row.comment_count ?? 0 });
}

// PUT /api/climbs/:id
router.put('/:id', requireAuth, uploadSingle('photo'), handleUpdateClimb);

// PATCH /api/climbs/:id (iOS client uses PATCH)
router.patch('/:id', requireAuth, uploadSingle('photo'), handleUpdateClimb);

// DELETE /api/climbs/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT * FROM climbs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });

  deleteFile(climb.photo_path);
  db.prepare('DELETE FROM climbs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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
