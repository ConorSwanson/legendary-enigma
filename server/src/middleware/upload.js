const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const { UPLOADS_DIR } = require('../db');

const ALLOWED = new Set([
  'image/jpeg', 'image/jpg', 'image/png',
  'image/webp', 'image/heic', 'image/heif',
]);

const mem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

async function resizeAndSave(buffer, { maxW = 1200, maxH = 1200, q = 80 } = {}) {
  const out = await sharp(buffer)
    .rotate()
    .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: q })
    .toBuffer();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), out);
  return filename;
}

// Drop-in replacement for multer().single(field).
// Returns an array [memMiddleware, resizeMiddleware] — Express flattens these.
function single(field, opts = {}) {
  return [
    mem.single(field),
    async (req, _res, next) => {
      if (!req.file?.buffer) return next();
      try {
        req.file.filename = await resizeAndSave(req.file.buffer, {
          maxW: opts.maxW || 1200,
          maxH: opts.maxH || 1200,
          q:    opts.q    || 82,
        });
        next();
      } catch (e) { next(e); }
    },
  ];
}

// For profile updates — handles avatar (512px) and background (1920px) in one request.
function profileFields() {
  const OPTS = {
    avatar:     { maxW: 512,  maxH: 512,  q: 85 },
    background: { maxW: 1920, maxH: 1080, q: 78 },
  };
  return [
    mem.fields([
      { name: 'avatar',     maxCount: 1 },
      { name: 'background', maxCount: 1 },
    ]),
    async (req, _res, next) => {
      const files = req.files || {};
      try {
        for (const [fname, arr] of Object.entries(files)) {
          for (const f of arr) {
            if (f.buffer) f.filename = await resizeAndSave(f.buffer, OPTS[fname] || {});
          }
        }
        next();
      } catch (e) { next(e); }
    },
  ];
}

module.exports = { single, profileFields };
