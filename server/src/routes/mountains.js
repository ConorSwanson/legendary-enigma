const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (_req, res) => {
  const mountains = getDb()
    .prepare('SELECT * FROM mountains ORDER BY elevation DESC')
    .all();
  res.json(mountains);
});

module.exports = router;
