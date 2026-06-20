const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const upload = require('../middleware/upload');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

function withPhotoUrl(row) {
  return {
    ...row,
    photo_url: row.photo_path ? `/uploads/${row.photo_path}` : null,
  };
}

function deleteFile(filename) {
  if (!filename) return;
  const p = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// GET /api/climbs
router.get('/', (req, res) => {
  const { year, mountain_id, page = '1', limit = '50' } = req.query;
  const params = [];
  let where = 'WHERE 1=1';

  if (year) {
    where += ` AND strftime('%Y', c.climb_date) = ?`;
    params.push(String(year));
  }
  if (mountain_id) {
    where += ` AND c.mountain_id = ?`;
    params.push(Number(mountain_id));
  }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit), offset);

  const rows = getDb().prepare(`
    SELECT c.*, m.name AS mountain_name, m.elevation, m.range
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    ${where}
    ORDER BY c.climb_date DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json(rows.map(withPhotoUrl));
});

// GET /api/climbs/:id
router.get('/:id', (req, res) => {
  const row = getDb().prepare(`
    SELECT c.*, m.name AS mountain_name, m.elevation, m.range
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Climb not found' });
  res.json(withPhotoUrl(row));
});

// POST /api/climbs
router.post('/', upload.single('photo'), (req, res) => {
  const { mountain_id, climb_date, notes } = req.body;
  if (!mountain_id || !climb_date) {
    if (req.file) deleteFile(req.file.filename);
    return res.status(400).json({ error: 'mountain_id and climb_date are required' });
  }

  const photo_path = req.file ? req.file.filename : null;
  const result = getDb().prepare(
    'INSERT INTO climbs (mountain_id, climb_date, notes, photo_path) VALUES (?, ?, ?, ?)'
  ).run(Number(mountain_id), climb_date, notes || null, photo_path);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/climbs/:id
router.put('/:id', upload.single('photo'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!existing) {
    if (req.file) deleteFile(req.file.filename);
    return res.status(404).json({ error: 'Climb not found' });
  }

  const { mountain_id, climb_date, notes } = req.body;
  let photo_path = existing.photo_path;

  if (req.file) {
    deleteFile(existing.photo_path);
    photo_path = req.file.filename;
  }

  db.prepare(
    'UPDATE climbs SET mountain_id = ?, climb_date = ?, notes = ?, photo_path = ? WHERE id = ?'
  ).run(
    mountain_id ? Number(mountain_id) : existing.mountain_id,
    climb_date || existing.climb_date,
    notes !== undefined ? (notes || null) : existing.notes,
    photo_path,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE /api/climbs/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const climb = db.prepare('SELECT * FROM climbs WHERE id = ?').get(req.params.id);
  if (!climb) return res.status(404).json({ error: 'Climb not found' });

  deleteFile(climb.photo_path);
  db.prepare('DELETE FROM climbs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
