const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, UPLOADS_DIR } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

initDb();

const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID } = process.env;
if (APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID && APNS_BUNDLE_ID) {
  console.log(`[APNs] Configured — key_id=${APNS_KEY_ID} team=${APNS_TEAM_ID} bundle=${APNS_BUNDLE_ID}`);
} else {
  const missing = ['APNS_KEY', 'APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_BUNDLE_ID'].filter(k => !process.env[k]);
  console.log(`[APNs] Not configured — missing: ${missing.join(', ')}`);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, { fallthrough: false }));
app.use('/public', express.static(path.join(__dirname, '../public')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/mountains', require('./routes/mountains'));
app.use('/api/climbs',    require('./routes/comments'));
app.use('/api/climbs',    require('./routes/climbs'));
app.use('/api/stats',     require('./routes/stats'));
app.use('/api/profile',   require('./routes/profile'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/feed',      require('./routes/feed'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/public/climbs', require('./routes/publicClimbs'));
app.use('/api/badges',        require('./routes/badges'));
app.use('/api/og',            require('./routes/ogImage'));
app.use('/api/beta',          require('./routes/beta'));
app.use('/beta',              require('./routes/beta'));
app.use('/s',             require('./routes/share'));

// Serve built React app (production)
const clientDist = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Pre-warm badge PNG cache so first user load is instant
  try {
    const { warmBadgeCache, warmRankBadgeCache } = require('./routes/badges');
    warmBadgeCache();
    warmRankBadgeCache();
  } catch (_) {}
});
