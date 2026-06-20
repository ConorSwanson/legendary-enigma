const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /s/:id — public share page with OG tags, redirects to /share/:id in the SPA
router.get('/:id', (req, res) => {
  const row = getDb().prepare(`
    SELECT c.id, c.climb_date, c.photo_path, c.visibility,
           m.name AS mountain_name, m.elevation,
           u.name AS user_name
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!row || row.visibility === 'private') {
    return res.status(404).send('<html><body><h1>Not found</h1></body></html>');
  }

  const host = req.protocol + '://' + req.get('host');
  const title = `${row.user_name || 'Someone'} summited ${row.mountain_name} (${row.elevation.toLocaleString()} ft)!`;
  const description = `Logged on ${new Date(row.climb_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const image = row.photo_path ? `${host}/uploads/${row.photo_path}` : `${host}/icon-512.png`;
  const url = `${host}/share/${row.id}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  <meta http-equiv="refresh" content="0;url=${url}">
</head>
<body>
  <script>window.location.href = '${url}';</script>
  <p><a href="${url}">${title}</a></p>
</body>
</html>`);
});

module.exports = router;
