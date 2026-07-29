const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runStatement } = require('../db/init');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/', (req, res) => {
  const reps = queryAll('SELECT * FROM representatives WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
  res.json(reps);
});

router.get('/all', requireAuth, (req, res) => {
  const reps = queryAll('SELECT * FROM representatives ORDER BY sort_order ASC, name ASC');
  res.json(reps);
});

router.post('/', requireAuth, (req, res) => {
  const { name, company, city_en, city_fa, city_ar, city_zh, country, phone, email, address, lat, lng, is_active, sort_order } = req.body;
  
  const result = runStatement(`
    INSERT INTO representatives (name, company, city_en, city_fa, city_ar, city_zh, country, phone, email, address, lat, lng, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name || '', company || '', city_en || '', city_fa || '', city_ar || '', city_zh || '',
    country || '', phone || '', email || '', address || '', lat || 0, lng || 0,
    is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0
  ]);

  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM representatives WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = ['name', 'company', 'city_en', 'city_fa', 'city_ar', 'city_zh', 'country',
    'phone', 'email', 'address', 'lat', 'lng', 'is_active', 'sort_order'];

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

  runStatement(`UPDATE representatives SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  runStatement('DELETE FROM representatives WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
