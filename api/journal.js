const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runStatement } = require('../db/init');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/journal - public: published posts only
router.get('/', (req, res) => {
  const posts = queryAll(`SELECT id, title_en, title_fa, title_ar, title_zh, slug,
    excerpt_en, excerpt_fa, excerpt_ar, excerpt_zh,
    image_url, author, published, sort_order, created_at, updated_at
    FROM journal_posts WHERE published = 1 ORDER BY sort_order ASC, id DESC`);
  res.json(posts);
});

// GET /api/journal/admin/all - admin: all posts (must be before /:slug)
router.get('/admin/all', requireAuth, (req, res) => {
  const posts = queryAll('SELECT * FROM journal_posts ORDER BY sort_order ASC, id DESC');
  res.json(posts);
});

// GET /api/journal/admin/:id - admin: single post by id (must be before /:slug)
router.get('/admin/:id', requireAuth, (req, res) => {
  const post = queryOne('SELECT * FROM journal_posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// GET /api/journal/:slug - public single post
router.get('/:slug', (req, res) => {
  // Don't match known admin paths as slugs
  if (req.params.slug === 'admin') return res.status(404).json({ error: 'Not found' });
  const post = queryOne('SELECT * FROM journal_posts WHERE slug = ? AND published = 1', [req.params.slug]);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// POST /api/journal (auth required)
router.post('/', requireAuth, (req, res) => {
  const { title_en, title_fa, title_ar, title_zh, slug,
    excerpt_en, excerpt_fa, excerpt_ar, excerpt_zh,
    content_en, content_fa, content_ar, content_zh,
    image_url, author, published, sort_order } = req.body;

  const postSlug = slug || (title_en
    ? title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    : 'post-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

  const result = runStatement(`
    INSERT INTO journal_posts (title_en, title_fa, title_ar, title_zh, slug,
      excerpt_en, excerpt_fa, excerpt_ar, excerpt_zh,
      content_en, content_fa, content_ar, content_zh,
      image_url, author, published, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    title_en || '', title_fa || '', title_ar || '', title_zh || '', postSlug,
    excerpt_en || '', excerpt_fa || '', excerpt_ar || '', excerpt_zh || '',
    content_en || '', content_fa || '', content_ar || '', content_zh || '',
    image_url || '', author || '', published !== undefined ? (published ? 1 : 0) : 1, sort_order || 0
  ]);

  res.json({ success: true, id: result.lastInsertRowid, slug: postSlug });
});

// PUT /api/journal/:id (auth required)
router.put('/:id', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM journal_posts WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = ['title_en', 'title_fa', 'title_ar', 'title_zh', 'slug',
    'excerpt_en', 'excerpt_fa', 'excerpt_ar', 'excerpt_zh',
    'content_en', 'content_fa', 'content_ar', 'content_zh',
    'image_url', 'author', 'published', 'sort_order'];

  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      if (field === 'published') {
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

  runStatement(`UPDATE journal_posts SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true });
});

// DELETE /api/journal/:id (auth required)
router.delete('/:id', requireAuth, (req, res) => {
  runStatement('DELETE FROM journal_posts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
