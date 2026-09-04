const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

// GET /api/wishlist — peaks the user wants to climb but hasn't yet
router.get('/', requireAuth, (req, res) => {
  const rows = getDb().prepare(`
    SELECT m.id, m.name, m.elevation, m.range, m.state, w.created_at
    FROM mountain_wishlist w
    JOIN mountains m ON m.id = w.mountain_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

// POST /api/wishlist/:mountainId
router.post('/:mountainId', requireAuth, (req, res) => {
  const db = getDb();
  const mountain = db.prepare('SELECT id FROM mountains WHERE id = ?').get(req.params.mountainId);
  if (!mountain) return res.status(404).json({ error: 'Mountain not found' });
  db.prepare('INSERT OR IGNORE INTO mountain_wishlist (user_id, mountain_id) VALUES (?, ?)')
    .run(req.user.id, req.params.mountainId);
  res.status(201).json({ success: true });
});

// DELETE /api/wishlist/:mountainId
router.delete('/:mountainId', requireAuth, (req, res) => {
  getDb().prepare('DELETE FROM mountain_wishlist WHERE user_id = ? AND mountain_id = ?')
    .run(req.user.id, req.params.mountainId);
  res.json({ success: true });
});

module.exports = router;
