const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all boards
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM boards ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single board with lists and cards
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [boardRows] = await db.query('SELECT * FROM boards WHERE id = ?', [id]);
    if (boardRows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const board = boardRows[0];

    const [listsRows] = await db.query(
      'SELECT * FROM lists WHERE board_id = ? ORDER BY position ASC',
      [id]
    );

    const listIds = listsRows.map(l => l.id);

    let cardsRows = [];
    if (listIds.length > 0) {
      const placeholders = listIds.map(() => '?').join(', ');
      const [rows] = await db.query(`
        SELECT
          c.*,
          COALESCE(
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color))
             FROM card_labels cl JOIN labels l ON l.id = cl.label_id WHERE cl.card_id = c.id),
            JSON_ARRAY()
          ) AS labels,
          COALESCE(
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'name', m.name, 'initials', m.initials, 'avatar_color', m.avatar_color))
             FROM card_members cm JOIN members m ON m.id = cm.member_id WHERE cm.card_id = c.id),
            JSON_ARRAY()
          ) AS members,
          COALESCE(
            (SELECT COUNT(*) FROM checklists ch
             JOIN checklist_items ci ON ci.checklist_id = ch.id
             WHERE ch.card_id = c.id), 0
          ) AS checklist_total,
          COALESCE(
            (SELECT COUNT(*) FROM checklists ch
             JOIN checklist_items ci ON ci.checklist_id = ch.id
             WHERE ch.card_id = c.id AND ci.is_complete = 1), 0
          ) AS checklist_complete,
          COALESCE(
            (SELECT COUNT(*) FROM attachments a WHERE a.card_id = c.id), 0
          ) AS attachment_count
        FROM cards c
        WHERE c.list_id IN (${placeholders}) AND c.is_archived = 0
        ORDER BY c.position ASC
      `, listIds);
      cardsRows = rows;
    }

    // Parse JSON strings returned by MySQL if needed
    cardsRows = cardsRows.map(card => ({
      ...card,
      labels: typeof card.labels === 'string' ? JSON.parse(card.labels) : (card.labels || []),
      members: typeof card.members === 'string' ? JSON.parse(card.members) : (card.members || []),
    }));
    // Filter out null entries from DISTINCT aggregation
    cardsRows = cardsRows.map(card => ({
      ...card,
      labels: card.labels.filter(Boolean),
      members: card.members.filter(Boolean),
    }));

    const cardsByList = {};
    cardsRows.forEach(card => {
      if (!cardsByList[card.list_id]) cardsByList[card.list_id] = [];
      cardsByList[card.list_id].push(card);
    });

    const lists = listsRows.map(list => ({
      ...list,
      cards: cardsByList[list.id] || [],
    }));

    // Get board labels
    const [labelsRows] = await db.query(
      'SELECT * FROM labels WHERE board_id = ? ORDER BY name ASC',
      [id]
    );

    res.json({ ...board, lists, labels: labelsRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create board
router.post('/', async (req, res) => {
  try {
    const { title, background_color } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { v4: uuidv4 } = require('uuid');
    const boardId = uuidv4();

    await db.query(
      'INSERT INTO boards (id, title, background_color) VALUES (?, ?, ?)',
      [boardId, title, background_color || '#0079BF']
    );

    // Create default labels for new board
    await db.query(`
      INSERT INTO labels (id, name, color, board_id) VALUES
        (UUID(), 'Bug', '#EB5A46', ?),
        (UUID(), 'Feature', '#61BD4F', ?),
        (UUID(), 'Design', '#C377E0', ?),
        (UUID(), 'High Priority', '#FF8B00', ?),
        (UUID(), 'Research', '#00C2E0', ?)
    `, [boardId, boardId, boardId, boardId, boardId]);

    const [newBoard] = await db.query('SELECT * FROM boards WHERE id = ?', [boardId]);
    res.status(201).json(newBoard[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update board
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, background_color } = req.body;

    await db.query(
      `UPDATE boards SET
        title = COALESCE(?, title),
        background_color = COALESCE(?, background_color),
        updated_at = NOW()
      WHERE id = ?`,
      [title, background_color, id]
    );

    const [rows] = await db.query('SELECT * FROM boards WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE board
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM boards WHERE id = ?', [id]);
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
