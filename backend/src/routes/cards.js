const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Helper: get full card detail
async function getCardDetail(cardId) {
  const [cardRows] = await db.query(
    `SELECT c.*,
      COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color))
         FROM card_labels cl JOIN labels l ON l.id = cl.label_id WHERE cl.card_id = c.id),
        JSON_ARRAY()
      ) AS labels,
      COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'name', m.name, 'initials', m.initials, 'avatar_color', m.avatar_color, 'email', m.email))
         FROM card_members cm JOIN members m ON m.id = cm.member_id WHERE cm.card_id = c.id),
        JSON_ARRAY()
      ) AS members
    FROM cards c
    WHERE c.id = ?`,
    [cardId]
  );

  if (cardRows.length === 0) return null;
  let card = cardRows[0];

  // Parse JSON if returned as strings; filter nulls from DISTINCT
  card.labels = (typeof card.labels === 'string' ? JSON.parse(card.labels) : (card.labels || [])).filter(Boolean);
  card.members = (typeof card.members === 'string' ? JSON.parse(card.members) : (card.members || [])).filter(Boolean);

  // Get checklists with items
  const [checklistRows] = await db.query(
    'SELECT * FROM checklists WHERE card_id = ? ORDER BY position ASC',
    [cardId]
  );

  const checklists = await Promise.all(checklistRows.map(async (cl) => {
    const [itemRows] = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC',
      [cl.id]
    );
    return { ...cl, items: itemRows };
  }));

  // Get comments
  const [commentRows] = await db.query(
    `SELECT co.*, m.name AS member_name, m.initials AS member_initials, m.avatar_color AS member_avatar_color
     FROM comments co
     JOIN members m ON m.id = co.member_id
     WHERE co.card_id = ?
     ORDER BY co.created_at DESC`,
    [cardId]
  );
  
  // Get attachments
  const [attachmentRows] = await db.query(
    'SELECT * FROM attachments WHERE card_id = ? ORDER BY uploaded_at DESC',
    [cardId]
  );

  return { ...card, checklists, comments: commentRows, attachments: attachmentRows };
}

// GET card detail
router.get('/:id', async (req, res) => {
  try {
    const card = await getCardDetail(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create card
router.post('/', async (req, res) => {
  try {
    const { list_id, title } = req.body;
    if (!list_id || !title) return res.status(400).json({ error: 'list_id and title are required' });

    const { v4: uuidv4 } = require('uuid');
    const cardId = uuidv4();

    const [posRows] = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE list_id = ?',
      [list_id]
    );
    const position = posRows[0].next_pos;

    await db.query(
      'INSERT INTO cards (id, list_id, title, position) VALUES (?, ?, ?, ?)',
      [cardId, list_id, title, position]
    );

    const [newCard] = await db.query('SELECT * FROM cards WHERE id = ?', [cardId]);
    res.status(201).json(newCard[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update card
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, is_archived, cover_color, cover_image_url } = req.body;

    const hasDueDate = 'due_date' in req.body;

    if (hasDueDate) {
      await db.query(
        `UPDATE cards SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          due_date = ?,
          is_archived = COALESCE(?, is_archived),
          cover_color = COALESCE(?, cover_color),
          cover_image_url = COALESCE(?, cover_image_url),
          updated_at = NOW()
        WHERE id = ?`,
        [title, description, due_date ?? null, is_archived, cover_color, cover_image_url, id]
      );
    } else {
      await db.query(
        `UPDATE cards SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          is_archived = COALESCE(?, is_archived),
          cover_color = COALESCE(?, cover_color),
          cover_image_url = COALESCE(?, cover_image_url),
          updated_at = NOW()
        WHERE id = ?`,
        [title, description, is_archived, cover_color, cover_image_url, id]
      );
    }

    const card = await getCardDetail(id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE card
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cards WHERE id = ?', [req.params.id]);
    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT move/reorder cards (drag-and-drop)
router.put('/reorder', async (req, res) => {
  try {
    const { cards } = req.body; // [{ id, list_id, position }]
    if (!Array.isArray(cards)) return res.status(400).json({ error: 'cards array required' });

    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const card of cards) {
        await conn.query(
          'UPDATE cards SET list_id = ?, position = ?, updated_at = NOW() WHERE id = ?',
          [card.list_id, card.position, card.id]
        );
      }
      await conn.commit();
      res.json({ message: 'Cards reordered' });
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

// POST add label to card
router.post('/:id/labels', async (req, res) => {
  try {
    const { label_id } = req.body;
    await db.query(
      'INSERT IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)',
      [req.params.id, label_id]
    );
    const card = await getCardDetail(req.params.id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove label from card
router.delete('/:id/labels/:labelId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM card_labels WHERE card_id = ? AND label_id = ?',
      [req.params.id, req.params.labelId]
    );
    const card = await getCardDetail(req.params.id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add member to card
router.post('/:id/members', async (req, res) => {
  try {
    const { member_id } = req.body;
    await db.query(
      'INSERT IGNORE INTO card_members (card_id, member_id) VALUES (?, ?)',
      [req.params.id, member_id]
    );
    const card = await getCardDetail(req.params.id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove member from card
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM card_members WHERE card_id = ? AND member_id = ?',
      [req.params.id, req.params.memberId]
    );
    const card = await getCardDetail(req.params.id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add checklist to card
router.post('/:id/checklists', async (req, res) => {
  try {
    const { title } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const checklistId = uuidv4();

    const [posRows] = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM checklists WHERE card_id = ?',
      [req.params.id]
    );
    await db.query(
      'INSERT INTO checklists (id, card_id, title, position) VALUES (?, ?, ?, ?)',
      [checklistId, req.params.id, title || 'Checklist', posRows[0].next_pos]
    );
    const [newCl] = await db.query('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    res.status(201).json({ ...newCl[0], items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE checklist
router.delete('/:id/checklists/:checklistId', async (req, res) => {
  try {
    await db.query('DELETE FROM checklists WHERE id = ? AND card_id = ?', [req.params.checklistId, req.params.id]);
    res.json({ message: 'Checklist deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add checklist item
router.post('/:id/checklists/:checklistId/items', async (req, res) => {
  try {
    const { title } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const itemId = uuidv4();

    const [posRows] = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM checklist_items WHERE checklist_id = ?',
      [req.params.checklistId]
    );
    await db.query(
      'INSERT INTO checklist_items (id, checklist_id, title, position) VALUES (?, ?, ?, ?)',
      [itemId, req.params.checklistId, title, posRows[0].next_pos]
    );
    const [newItem] = await db.query('SELECT * FROM checklist_items WHERE id = ?', [itemId]);
    res.status(201).json(newItem[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update checklist item
router.patch('/:id/checklists/:checklistId/items/:itemId', async (req, res) => {
  try {
    const { title, is_complete } = req.body;
    await db.query(
      `UPDATE checklist_items SET
        title = COALESCE(?, title),
        is_complete = COALESCE(?, is_complete)
      WHERE id = ?`,
      [title, is_complete, req.params.itemId]
    );
    const [rows] = await db.query('SELECT * FROM checklist_items WHERE id = ?', [req.params.itemId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE checklist item
router.delete('/:id/checklists/:checklistId/items/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM checklist_items WHERE id = ?', [req.params.itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { member_id, content } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const commentId = uuidv4();

    await db.query(
      'INSERT INTO comments (id, card_id, member_id, content) VALUES (?, ?, ?, ?)',
      [commentId, req.params.id, member_id, content]
    );
    const [rows] = await db.query(
      `SELECT co.*, m.name AS member_name, m.initials AS member_initials, m.avatar_color AS member_avatar_color
       FROM comments co
       JOIN members m ON m.id = co.member_id
       WHERE co.id = ?`,
      [commentId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comment
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    await db.query('DELETE FROM comments WHERE id = ? AND card_id = ?', [req.params.commentId, req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Attachments ---
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    await db.query(
      'INSERT INTO attachments (card_id, file_name, file_url) VALUES (?, ?, ?)',
      [id, fileName, fileUrl]
    );

    const card = await getCardDetail(id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    await db.query('DELETE FROM attachments WHERE id = ?', [attachmentId]);
    const card = await getCardDetail(id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Cover Image Upload ---
router.post('/:id/cover', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `/uploads/${req.file.filename}`;
    
    await db.query(
      'UPDATE cards SET cover_image_url = ? WHERE id = ?',
      [fileUrl, id]
    );

    const card = await getCardDetail(id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
