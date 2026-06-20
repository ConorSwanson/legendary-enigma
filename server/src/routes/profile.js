const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const upload = require('../middleware/upload');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

function withAvatarUrl(profile) {
  return {
    ...profile,
    avatar_url: profile.avatar_path ? `/uploads/${profile.avatar_path}` : null,
  };
}

router.get('/', (_req, res) => {
  const profile = getDb().prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(withAvatarUrl(profile));
});

router.put('/', upload.single('avatar'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM profile WHERE id = 1').get();

  const { name, bio } = req.body;
  let avatar_path = existing.avatar_path;

  if (req.file) {
    if (existing.avatar_path) {
      const old = path.join(UPLOAD_DIR, existing.avatar_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    avatar_path = req.file.filename;
  }

  db.prepare(
    'UPDATE profile SET name = ?, bio = ?, avatar_path = ? WHERE id = 1'
  ).run(
    name || existing.name,
    bio !== undefined ? (bio || null) : existing.bio,
    avatar_path
  );

  res.json({ success: true });
});

module.exports = router;
