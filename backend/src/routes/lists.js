const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all lists for a board
router.get('/board/:boardId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM lists WHERE board_id = ? ORDER BY position ASC',
      [req.params.boardId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create list
router.post('/', async (req, res) => {
  try {
    const { board_id, title } = req.body;
    if (!board_id || !title) return res.status(400).json({ error: 'board_id and title are required' });

    const { v4: uuidv4 } = require('uuid');
    const listId = uuidv4();

    const [posRows] = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM lists WHERE board_id = ?',
      [board_id]
    );
    const position = posRows[0].next_pos;

    await db.query(
      'INSERT INTO lists (id, board_id, title, position) VALUES (?, ?, ?, ?)',
      [listId, board_id, title, position]
    );

    const [newList] = await db.query('SELECT * FROM lists WHERE id = ?', [listId]);
    res.status(201).json(newList[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update list title
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    await db.query(
      'UPDATE lists SET title = ?, updated_at = NOW() WHERE id = ?',
      [title, id]
    );

    const [rows] = await db.query('SELECT * FROM lists WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'List not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE list
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM lists WHERE id = ?', [req.params.id]);
    res.json({ message: 'List deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reorder lists (drag-and-drop)
router.put('/reorder', async (req, res) => {
  try {
    const { lists } = req.body; // [{ id, position }]
    if (!Array.isArray(lists)) return res.status(400).json({ error: 'lists array required' });

    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const list of lists) {
        await conn.query(
          'UPDATE lists SET position = ?, updated_at = NOW() WHERE id = ?',
          [list.position, list.id]
        );
      }
      await conn.commit();
      res.json({ message: 'Lists reordered' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
