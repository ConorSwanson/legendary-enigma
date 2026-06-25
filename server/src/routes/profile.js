const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, UPLOADS_DIR } = require('../db');
const { profileFields } = require('../middleware/upload');
const requireAuth = require('../middleware/auth');

function withUrls(user, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    ...user,
    avatar_url:     user.avatar_path     ? `${base}/uploads/${user.avatar_path}`     : null,
    background_url: user.background_path ? `${base}/uploads/${user.background_path}` : null,
  };
}

function deleteFile(filename) {
  if (!filename) return;
  const p = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// GET /api/profile
router.get('/', requireAuth, (req, res) => {
  res.json(withUrls(req.user, req));
});

// PUT /api/profile — multipart with optional avatar + background image fields
router.put('/', requireAuth, profileFields(), (req, res) => {
  const db = getDb();
  const existing = req.user;
  const { name, bio } = req.body;
  const files = req.files || {};

  const avatarFile     = (files.avatar     || [])[0];
  const backgroundFile = (files.background || [])[0];

  let avatar_path     = existing.avatar_path;
  let background_path = existing.background_path;

  if (avatarFile) {
    deleteFile(existing.avatar_path);
    avatar_path = avatarFile.filename;
  }
  if (backgroundFile) {
    deleteFile(existing.background_path);
    background_path = backgroundFile.filename;
  }

  db.prepare(
    'UPDATE users SET name=?, bio=?, avatar_path=?, background_path=? WHERE id=?'
  ).run(
    name !== undefined ? (name || existing.name) : existing.name,
    bio  !== undefined ? (bio  || null)           : existing.bio,
    avatar_path,
    background_path,
    existing.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  res.json(withUrls(updated, req));
});

module.exports = router;
