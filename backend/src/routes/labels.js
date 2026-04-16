const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET labels for a board
router.get('/board/:boardId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM labels WHERE board_id = ? ORDER BY name ASC',
      [req.params.boardId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create label
router.post('/', async (req, res) => {
  try {
    const { board_id, name, color } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const labelId = uuidv4();

    await db.query(
      'INSERT INTO labels (id, board_id, name, color) VALUES (?, ?, ?, ?)',
      [labelId, board_id, name, color]
    );
    const [newLabel] = await db.query('SELECT * FROM labels WHERE id = ?', [labelId]);
    res.status(201).json(newLabel[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
