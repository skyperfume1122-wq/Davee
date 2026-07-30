const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runStatement } = require('../db/init');
const { fixArrayImageUrls, fixObjectImageUrls } = require('./image-helper');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/', (req, res) => {
  const products = queryAll('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
  res.json(fixArrayImageUrls(products, ['image_url', 'model_3d_url']));
});

router.get('/:id', (req, res) => {
  const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(fixObjectImageUrls(product, ['image_url', 'model_3d_url']));
});

router.post('/', requireAuth, (req, res) => {
  const { code, title_en, title_fa, title_ar, title_zh, category, finish, collection,
          image_url, description_en, description_fa, description_ar, description_zh,
          is_featured, is_new, is_best_seller, sort_order } = req.body;

  const productCode = code || `HF-${Date.now().toString(36).toUpperCase()}`;

  const result = runStatement(`
    INSERT INTO products (code, title_en, title_fa, title_ar, title_zh, category, finish, collection,
      image_url, model_3d_url, description_en, description_fa, description_ar, description_zh,
      is_featured, is_new, is_best_seller, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    productCode,
    title_en || '', title_fa || '', title_ar || '', title_zh || '',
    category || '', finish || '', collection || '',
    image_url || '', req.body.model_3d_url || '', description_en || '', description_fa || '', description_ar || '', description_zh || '',
    is_featured ? 1 : 0, is_new ? 1 : 0, is_best_seller ? 1 : 0, sort_order || 0
  ]);

  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = ['code', 'title_en', 'title_fa', 'title_ar', 'title_zh', 'category', 'finish',
    'collection', 'image_url', 'model_3d_url', 'description_en', 'description_fa', 'description_ar', 'description_zh',
    'is_featured', 'is_new', 'is_best_seller', 'sort_order'];

  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      if (['is_featured', 'is_new', 'is_best_seller'].includes(field)) {
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

  runStatement(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  runStatement('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
