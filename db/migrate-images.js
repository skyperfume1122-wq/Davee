/**
 * Database Image URL Migration Script
 * Fixes existing database records that have external image URLs
 * (Unsplash, Pexels) to use local paths instead.
 * 
 * Run: node db/migrate-images.js
 */

const { initDb, queryAll, runStatement } = require('./init');
const { fixImageUrl, fixArrayImageUrls } = require('../api/image-helper');

async function migrate() {
  console.log('\n  ✦ HÜFEL Image URL Migration ✦\n');
  await initDb();

  let totalFixed = 0;

  // Fix products
  const products = queryAll('SELECT id, image_url, model_3d_url FROM products');
  for (const p of products) {
    const fixed = fixImageUrl(p.image_url);
    const fixedModel = fixImageUrl(p.model_3d_url);
    if (fixed !== p.image_url || fixedModel !== p.model_3d_url) {
      runStatement('UPDATE products SET image_url = ?, model_3d_url = ? WHERE id = ?', [fixed, fixedModel, p.id]);
      totalFixed++;
    }
  }
  console.log(`  ✓ ${products.length} products checked`);

  // Fix before/after
  const baItems = queryAll('SELECT id, before_image, after_image FROM before_after');
  for (const item of baItems) {
    const fixedBefore = fixImageUrl(item.before_image);
    const fixedAfter = fixImageUrl(item.after_image);
    if (fixedBefore !== item.before_image || fixedAfter !== item.after_image) {
      runStatement('UPDATE before_after SET before_image = ?, after_image = ? WHERE id = ?', [fixedBefore, fixedAfter, item.id]);
      totalFixed++;
    }
  }
  console.log(`  ✓ ${baItems.length} before/after items checked`);

  // Fix journal posts
  const posts = queryAll('SELECT id, image_url FROM journal_posts');
  for (const p of posts) {
    const fixed = fixImageUrl(p.image_url);
    if (fixed !== p.image_url) {
      runStatement('UPDATE journal_posts SET image_url = ? WHERE id = ?', [fixed, p.id]);
      totalFixed++;
    }
  }
  console.log(`  ✓ ${posts.length} journal posts checked`);

  console.log(`\n  ✦ Migration complete! ${totalFixed} records updated. ✦\n`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
