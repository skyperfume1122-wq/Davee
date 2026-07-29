const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runStatement } = require('../db/init');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/settings - all settings (public)
router.get('/', (req, res) => {
  const rows = queryAll('SELECT setting_key, setting_value FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }
  res.json(settings);
});

// GET /api/settings/songs - active songs (public)
router.get('/songs', (req, res) => {
  const songs = queryAll('SELECT * FROM songs WHERE is_active = 1 ORDER BY sort_order ASC');
  res.json(songs);
});

// PUT /api/settings - update settings (auth required)
router.put('/', requireAuth, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    const existing = queryOne('SELECT id FROM settings WHERE setting_key = ?', [key]);
    if (existing) {
      runStatement('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [String(value), key]);
    } else {
      runStatement('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, String(value)]);
    }
  }
  res.json({ success: true });
});

// POST /api/settings/songs - add song (auth required)
router.post('/songs', requireAuth, (req, res) => {
  const { title_en, title_fa, title_ar, title_zh, file_url, is_active, sort_order } = req.body;
  const result = runStatement(`
    INSERT INTO songs (title_en, title_fa, title_ar, title_zh, file_url, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    title_en || '', title_fa || '', title_ar || '', title_zh || '',
    file_url || '', is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0
  ]);
  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /api/settings/songs/:id - update song (auth required)
router.put('/songs/:id', requireAuth, (req, res) => {
  const { title_en, title_fa, title_ar, title_zh, file_url, is_active, sort_order } = req.body;
  runStatement(`
    UPDATE songs SET title_en=?, title_fa=?, title_ar=?, title_zh=?, file_url=?, is_active=?, sort_order=?
    WHERE id=?
  `, [
    title_en || '', title_fa || '', title_ar || '', title_zh || '',
    file_url || '', is_active ? 1 : 0, sort_order || 0, req.params.id
  ]);
  res.json({ success: true });
});

// DELETE /api/settings/songs/:id (auth required)
router.delete('/songs/:id', requireAuth, (req, res) => {
  runStatement('DELETE FROM songs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
