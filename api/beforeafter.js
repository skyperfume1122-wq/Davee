const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runStatement } = require('../db/init');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/beforeafter - public list of active images
router.get('/', (req, res) => {
  const items = queryAll('SELECT * FROM before_after WHERE is_active = 1 ORDER BY sort_order ASC, id DESC');
  res.json(items);
});

// GET /api/beforeafter/all - admin: all items
router.get('/all', requireAuth, (req, res) => {
  const items = queryAll('SELECT * FROM before_after ORDER BY sort_order ASC, id DESC');
  res.json(items);
});

// GET /api/beforeafter/:id
router.get('/:id', (req, res) => {
  const item = queryOne('SELECT * FROM before_after WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /api/beforeafter (auth required)
router.post('/', requireAuth, (req, res) => {
  const { title_en, title_fa, title_ar, title_zh, before_image, after_image, sort_order, is_active } = req.body;
  const result = runStatement(`
    INSERT INTO before_after (title_en, title_fa, title_ar, title_zh, before_image, after_image, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    title_en || '', title_fa || '', title_ar || '', title_zh || '',
    before_image || '', after_image || '',
    sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1
  ]);
  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /api/beforeafter/:id (auth required)
router.put('/:id', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM before_after WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = ['title_en', 'title_fa', 'title_ar', 'title_zh', 'before_image', 'after_image', 'sort_order', 'is_active'];
  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      if (field === 'is_active') {
        updates.push(`${field} = ?`);
        values.push(req.body[field] ? 1 : 0);
      } else {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  runStatement(`UPDATE before_after SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true });
});

// DELETE /api/beforeafter/:id (auth required)
router.delete('/:id', requireAuth, (req, res) => {
  runStatement('DELETE FROM before_after WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
