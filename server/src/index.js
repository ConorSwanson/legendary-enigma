const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

initDb();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/mountains', require('./routes/mountains'));
app.use('/api/climbs',    require('./routes/climbs'));
app.use('/api/stats',     require('./routes/stats'));
app.use('/api/profile',   require('./routes/profile'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/feed',      require('./routes/feed'));
app.use('/s',             require('./routes/share'));

// Serve built React app (production)
const clientDist = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
