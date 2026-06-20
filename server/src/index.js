const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = 3001;

initDb();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/mountains', require('./routes/mountains'));
app.use('/api/climbs', require('./routes/climbs'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/profile', require('./routes/profile'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
