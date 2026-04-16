const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET search cards by title, filter by label/member/due date
router.get('/', async (req, res) => {
  try {
    const { q, board_id, label_id, member_id, due_filter } = req.query;

    if (!board_id) return res.status(400).json({ error: 'board_id is required' });

    let conditions = ['c.is_archived = 0'];
    const params = [board_id];

    // Search by title (MySQL LIKE is case-insensitive by default)
    if (q && q.trim()) {
      conditions.push('c.title LIKE ?');
      params.push(`%${q.trim()}%`);
    }

    // Filter by label
    if (label_id) {
      conditions.push('EXISTS (SELECT 1 FROM card_labels cl2 WHERE cl2.card_id = c.id AND cl2.label_id = ?)');
      params.push(label_id);
    }

    // Filter by member
    if (member_id) {
      conditions.push('EXISTS (SELECT 1 FROM card_members cm2 WHERE cm2.card_id = c.id AND cm2.member_id = ?)');
      params.push(member_id);
    }

    // Filter by due date
    if (due_filter === 'overdue') {
      conditions.push('c.due_date < NOW() AND c.due_date IS NOT NULL');
    } else if (due_filter === 'due_soon') {
      conditions.push('c.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 DAY)');
    } else if (due_filter === 'no_due') {
      conditions.push('c.due_date IS NULL');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT
        c.*,
        li.title AS list_title,
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
          (SELECT COUNT(*) FROM attachments a WHERE a.card_id = c.id), 0
        ) AS attachment_count
      FROM cards c
      JOIN lists li ON li.id = c.list_id AND li.board_id = ?
      ${whereClause}
      ORDER BY c.position ASC
    `, params);

    // Parse JSON strings and filter nulls
    const parsed = rows.map(card => ({
      ...card,
      labels: (typeof card.labels === 'string' ? JSON.parse(card.labels) : (card.labels || [])).filter(Boolean),
      members: (typeof card.members === 'string' ? JSON.parse(card.members) : (card.members || [])).filter(Boolean),
    }));

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
