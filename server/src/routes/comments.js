const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');
const { isBlockedEitherDirection } = require('../utils/blocks');

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
    SELECT cc.id, cc.body, cc.created_at, cc.user_id, cc.parent_comment_id,
           u.name AS user_name, u.avatar_path AS user_avatar_path,
           (SELECT COUNT(*) FROM comment_likes WHERE comment_id = cc.id) AS like_count,
           EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = cc.id AND user_id = ?) AS is_liked
    FROM climb_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.climb_id = ?
      AND cc.user_id NOT IN (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
      )
    ORDER BY cc.created_at ASC
  `).all(req.user.id, req.params.id, req.user.id, req.user.id);

  res.json(comments.map(c => ({
    ...c,
    is_liked: !!c.is_liked,
    user_avatar_url: avatarUrl(req, c.user_avatar_path),
    is_owner: c.user_id === req.user.id,
  })));
});

// POST /api/climbs/:id/comments
router.post('/:id/comments', requireAuth, (req, res) => {
  const db = getDb();
  const { body, parent_comment_id } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  const climb = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });
  if (!canViewClimb(db, climb, req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  if (climb.user_id && isBlockedEitherDirection(db, req.user.id, climb.user_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let parent = null;
  if (parent_comment_id != null) {
    parent = db.prepare('SELECT * FROM climb_comments WHERE id = ? AND climb_id = ?')
      .get(parent_comment_id, req.params.id);
    if (!parent) return res.status(404).json({ error: 'Comment not found' });
    if (isBlockedEitherDirection(db, req.user.id, parent.user_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const result = db.prepare(
    'INSERT INTO climb_comments (climb_id, user_id, parent_comment_id, body) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, req.user.id, parent ? parent.id : null, body.trim());
  const newCommentId = result.lastInsertRowid;

  try {
    const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    const mountain = db.prepare(
      'SELECT m.name FROM climbs c JOIN mountains m ON c.mountain_id = m.id WHERE c.id = ?'
    ).get(req.params.id);

    // A reply notifies the comment's author; a top-level comment notifies
    // the climb's author. If those are the same person, only one fires.
    if (parent && parent.user_id !== req.user.id) {
      db.prepare(
        "INSERT INTO notifications (user_id, from_user_id, type, climb_id, comment_id) VALUES (?, ?, 'comment_reply', ?, ?)"
      ).run(parent.user_id, req.user.id, req.params.id, newCommentId);
      pushToUser(parent.user_id, {
        title: 'New Reply',
        body: `${fromUser?.name || 'Someone'} replied to your comment on ${mountain?.name || 'a peak'}`,
        climbId: Number(req.params.id),
      }).catch(() => {});
    }
    if (climb.user_id && climb.user_id !== req.user.id && (!parent || climb.user_id !== parent.user_id)) {
      db.prepare(
        "INSERT INTO notifications (user_id, from_user_id, type, climb_id, comment_id) VALUES (?, ?, 'comment', ?, ?)"
      ).run(climb.user_id, req.user.id, req.params.id, newCommentId);
      pushToUser(climb.user_id, {
        title: 'New Comment',
        body: `${fromUser?.name || 'Someone'} commented on your climb of ${mountain?.name || 'a peak'}`,
        climbId: Number(req.params.id),
      }).catch(() => {});
    }
  } catch (_) {}

  const comment = db.prepare(`
    SELECT cc.id, cc.body, cc.created_at, cc.user_id, cc.parent_comment_id,
           u.name AS user_name, u.avatar_path AS user_avatar_path
    FROM climb_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.id = ?
  `).get(newCommentId);

  res.status(201).json({
    ...comment,
    like_count: 0,
    is_liked: false,
    user_avatar_url: avatarUrl(req, comment.user_avatar_path),
    is_owner: true,
  });
});

// POST /api/climbs/:id/comments/:commentId/like — toggle like
router.post('/:id/comments/:commentId/like', requireAuth, (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });
  if (!canViewClimb(db, climb, req.user.id)) return res.status(403).json({ error: 'Forbidden' });

  const comment = db.prepare('SELECT * FROM climb_comments WHERE id = ? AND climb_id = ?')
    .get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (isBlockedEitherDirection(db, req.user.id, comment.user_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const existing = db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?')
    .get(req.user.id, comment.id);

  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').run(req.user.id, comment.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO comment_likes (user_id, comment_id) VALUES (?, ?)').run(req.user.id, comment.id);
    if (comment.user_id !== req.user.id) {
      try {
        db.prepare(
          "INSERT INTO notifications (user_id, from_user_id, type, climb_id, comment_id) VALUES (?, ?, 'comment_like', ?, ?)"
        ).run(comment.user_id, req.user.id, req.params.id, comment.id);
        const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
        pushToUser(comment.user_id, {
          title: 'New Like',
          body: `${fromUser?.name || 'Someone'} liked your comment`,
          climbId: Number(req.params.id),
        }).catch(() => {});
      } catch (_) {}
    }
  }

  const { count } = db.prepare('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?').get(comment.id);
  res.json({ liked: !existing, count });
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
