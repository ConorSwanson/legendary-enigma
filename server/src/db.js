const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'climbs.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const MOUNTAINS = [
  [1,  'Mount Elbert',            14440, 'Sawatch Range'],
  [2,  'Mount Massive',           14428, 'Sawatch Range'],
  [3,  'Mount Harvard',           14420, 'Sawatch Range'],
  [4,  'Mount Lincoln',           14286, 'Mosquito Range'],
  [5,  'Grays Peak',              14278, 'Front Range'],
  [6,  'Mount Antero',            14269, 'Sawatch Range'],
  [7,  'Torreys Peak',            14267, 'Front Range'],
  [8,  'Castle Peak',             14265, 'Elk Mountains'],
  [9,  'Quandary Peak',           14265, 'Mosquito Range'],
  [10, 'Mount Evans',             14264, 'Front Range'],
  [11, 'Longs Peak',              14259, 'Front Range'],
  [12, 'Mount Wilson',            14246, 'San Juan Mountains'],
  [13, 'Mount Shavano',           14229, 'Sawatch Range'],
  [14, 'Mount Belford',           14197, 'Sawatch Range'],
  [15, 'Crestone Peak',           14294, 'Sangre de Cristo'],
  [16, 'Crestone Needle',         14197, 'Sangre de Cristo'],
  [17, 'Mount Princeton',         14197, 'Sawatch Range'],
  [18, 'Mount Yale',              14196, 'Sawatch Range'],
  [19, 'Maroon Peak',             14156, 'Elk Mountains'],
  [20, 'Tabeguache Peak',         14155, 'Sawatch Range'],
  [21, 'Mount Oxford',            14153, 'Sawatch Range'],
  [22, 'Mount Sneffels',          14150, 'San Juan Mountains'],
  [23, 'Mount Democrat',          14148, 'Mosquito Range'],
  [24, 'Capitol Peak',            14130, 'Elk Mountains'],
  [25, 'Pikes Peak',              14115, 'Front Range'],
  [26, 'Snowmass Mountain',       14092, 'Elk Mountains'],
  [27, 'Windom Peak',             14082, 'San Juan Mountains'],
  [28, 'Sunlight Peak',           14059, 'San Juan Mountains'],
  [29, 'Handies Peak',            14048, 'San Juan Mountains'],
  [30, 'Wetterhorn Peak',         14015, 'San Juan Mountains'],
  [31, 'North Maroon Peak',       14014, 'Elk Mountains'],
  [32, 'San Luis Peak',           14014, 'San Juan Mountains'],
  [33, 'Mount of the Holy Cross', 14005, 'Sawatch Range'],
  [34, 'Huron Peak',              14003, 'Sawatch Range'],
  [35, 'Uncompahgre Peak',        14309, 'San Juan Mountains'],
  [36, 'Sunshine Peak',           14001, 'San Juan Mountains'],
  [37, 'Mount Sherman',           14036, 'Mosquito Range'],
  [38, 'Redcloud Peak',           14034, 'San Juan Mountains'],
  [39, 'Pyramid Peak',            14018, 'Elk Mountains'],
  [40, 'Wilson Peak',             14017, 'San Juan Mountains'],
  [41, 'Blanca Peak',             14345, 'Sangre de Cristo'],
  [42, 'La Plata Peak',           14336, 'Sawatch Range'],
  [43, 'Mount Cameron',           14238, 'Mosquito Range'],
  [44, 'Mount Bross',             14172, 'Mosquito Range'],
  [45, 'Kit Carson Peak',         14165, 'Sangre de Cristo'],
  [46, 'El Diente Peak',          14159, 'San Juan Mountains'],
  [47, 'Mount Eolus',             14083, 'San Juan Mountains'],
  [48, 'Challenger Point',        14081, 'Sangre de Cristo'],
  [49, 'Mount Columbia',          14073, 'Sawatch Range'],
  [50, 'Missouri Mountain',       14067, 'Sawatch Range'],
  [51, 'Humboldt Peak',           14064, 'Sangre de Cristo'],
  [52, 'Mount Bierstadt',         14060, 'Front Range'],
  [53, 'Culebra Peak',            14047, 'Sangre de Cristo'],
  [54, 'Ellingwood Point',        14042, 'Sangre de Cristo'],
  [55, 'Mount Lindsey',           14042, 'Sangre de Cristo'],
  [56, 'Little Bear Peak',        14037, 'Sangre de Cristo'],
  [57, 'North Eolus',             14039, 'San Juan Mountains'],
  [58, 'Stewart Peak',            14016, 'San Juan Mountains'],
];

function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS mountains (
      id        INTEGER PRIMARY KEY,
      name      TEXT    NOT NULL UNIQUE,
      elevation INTEGER NOT NULL,
      range     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_id     TEXT    UNIQUE NOT NULL,
      name         TEXT    NOT NULL DEFAULT 'Climber',
      bio          TEXT,
      avatar_path  TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS climbs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mountain_id  INTEGER NOT NULL REFERENCES mountains(id),
      climb_date   TEXT    NOT NULL,
      notes        TEXT,
      photo_path   TEXT,
      visibility   TEXT    NOT NULL DEFAULT 'public',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id != following_id)
    );

    CREATE TABLE IF NOT EXISTS profile (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT    NOT NULL DEFAULT 'Climber',
      bio         TEXT,
      avatar_path TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_climbs_user     ON climbs(user_id);
    CREATE INDEX IF NOT EXISTS idx_climbs_mountain ON climbs(mountain_id);
    CREATE INDEX IF NOT EXISTS idx_climbs_date     ON climbs(climb_date);
    CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows(following_id);

    CREATE TABLE IF NOT EXISTS climb_likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      climb_id   INTEGER NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, climb_id)
    );
    CREATE INDEX IF NOT EXISTS idx_likes_climb ON climb_likes(climb_id);
  `);

  // Migrate: add columns to legacy climbs table if missing
  const climbCols = db.pragma('table_info(climbs)').map(c => c.name);
  if (!climbCols.includes('user_id')) {
    db.exec('ALTER TABLE climbs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  }
  if (!climbCols.includes('visibility')) {
    db.exec("ALTER TABLE climbs ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'");
  }

  const insertMountain = db.prepare(
    'INSERT OR IGNORE INTO mountains (id, name, elevation, range) VALUES (?, ?, ?, ?)'
  );
  const seedMountains = db.transaction((list) => {
    for (const m of list) insertMountain.run(...m);
  });
  seedMountains(MOUNTAINS);

  db.prepare('INSERT OR IGNORE INTO profile (id, name) VALUES (1, ?)').run('Climber');

  console.log('Database ready at', DB_PATH);
}

module.exports = { getDb, initDb, UPLOADS_DIR };
