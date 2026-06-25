const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

function avatarUrl(req, path) {
  if (!path) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${path}`;
}

function canViewClimb(db, climb, userId) {
  if (climb.user_id === userId) return true;
  if (climb.visibility === 'private') return false;
  if (climb.visibility === 'followers') {
    return !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(userId, climb.user_id);
  }
  return true;
}

// GET /api/climbs/:id/comments
router.get('/:id/comments', requireAuth, (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });
  if (!canViewClimb(db, climb, req.user.id)) return res.status(403).json({ error: 'Forbidden' });

  const comments = db.prepare(`
    SELECT cc.id, cc.body, cc.created_at, cc.user_id,
           u.name AS user_name, u.avatar_path AS user_avatar_path
    FROM climb_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.climb_id = ?
    ORDER BY cc.created_at ASC
  `).all(req.params.id);

  res.json(comments.map(c => ({
    ...c,
    user_avatar_url: avatarUrl(req, c.user_avatar_path),
    is_owner: c.user_id === req.user.id,
  })));
});

// POST /api/climbs/:id/comments
router.post('/:id/comments', requireAuth, (req, res) => {
  const db = getDb();
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  const climb = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });
  if (!canViewClimb(db, climb, req.user.id)) return res.status(403).json({ error: 'Forbidden' });

  const result = db.prepare(
    'INSERT INTO climb_comments (climb_id, user_id, body) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, body.trim());

  if (climb.user_id && climb.user_id !== req.user.id) {
    try {
      db.prepare(
        "INSERT INTO notifications (user_id, from_user_id, type, climb_id) VALUES (?, ?, 'comment', ?)"
      ).run(climb.user_id, req.user.id, req.params.id);
    } catch (_) {}
  }

  const comment = db.prepare(`
    SELECT cc.id, cc.body, cc.created_at, cc.user_id,
           u.name AS user_name, u.avatar_path AS user_avatar_path
    FROM climb_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    ...comment,
    user_avatar_url: avatarUrl(req, comment.user_avatar_path),
    is_owner: true,
  });
});

// DELETE /api/climbs/:id/comments/:commentId
router.delete('/:id/comments/:commentId', requireAuth, (req, res) => {
  const result = getDb().prepare(
    'DELETE FROM climb_comments WHERE id = ? AND user_id = ?'
  ).run(req.params.commentId, req.user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Comment not found' });
  res.json({ success: true });
});

module.exports = router;
