const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Public — no auth required. Returns public climbs only.
router.get('/:id', (req, res) => {
  const row = getDb().prepare(`
    SELECT c.id, c.climb_date, c.notes, c.photo_path, c.visibility,
           c.mountain_id,
           m.name AS mountain_name, m.elevation, m.range,
           u.name AS user_name
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!row || row.visibility === 'private') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({ ...row, photo_url: row.photo_path ? `${req.protocol}://${req.get('host')}/uploads/${row.photo_path}` : null });
});

module.exports = router;
