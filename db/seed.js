/**
 * Seed script - populates the database with initial content
 * based on the existing Hüfel static site data.
 * 
 * Run: node db/seed.js
 */

const { initDb, queryOne, runStatement } = require('./init');

console.log('\n  ✦ HÜFEL Database Seeder ✦\n');

async function seed() {
  await initDb();

  // Seed products
  const products = [
    {
      code: 'HF-1001',
      title_en: 'Aluminum Handle Bar', title_fa: 'دستگیره آلومینیومی بار', title_ar: 'مقبض ألومنيوم بار', title_zh: '铝制把手杆',
      category: 'Handles', finish: 'Matte Black', collection: 'Natural Grain',
      image_url: 'https://images.unsplash.com/photo-1564540586988-aa4e53c3d799?w=400&q=80',
      description_en: 'Premium aluminum handle bar with matte black finish.',
      description_fa: 'دستگیره آلومینیومی بار با روکش مشکی مات.',
      description_ar: 'مقبض ألومنيوم بار بلمسة نهائية سوداء غير لامعة.',
      description_zh: '优质铝制把手杆，哑光黑色饰面。',
      is_featured: 1, is_new: 1, sort_order: 1
    },
    {
      code: 'HF-1002',
      title_en: 'Soft-Close Hinge', title_fa: 'لولا آرام‌بند', title_ar: 'مفصل إغلاق ناعم', title_zh: '缓冲铰链',
      category: 'Hinges', finish: 'Brushed Gold', collection: 'Heritage',
      image_url: 'https://images.unsplash.com/photo-1607710533910-d7cdffd9e593?w=400&q=80',
      description_en: 'Hydraulic soft-close mechanism tested for 100,000 cycles.',
      description_fa: 'مکانیزم هیدرولیک آرام‌بند تست‌شده برای ۱۰۰,۰۰۰ سیکل.',
      description_ar: 'آلية إغلاق ناعم هيدروليكية تم اختبارها لـ 100,000 دورة.',
      description_zh: '液压缓冲机构，经过10万次循环测试。',
      is_featured: 1, is_best_seller: 1, sort_order: 2
    },
    {
      code: 'HF-1003',
      title_en: 'Drawer Slide System', title_fa: 'سیستم ریل کشو', title_ar: 'نظام انزلاق الأدراج', title_zh: '抽屉滑轨系统',
      category: 'Slides', finish: 'Stainless Steel', collection: 'Industrial',
      image_url: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=400&q=80',
      description_en: 'Full-extension drawer slide with soft-close mechanism.',
      description_fa: 'ریل کشو تمام‌کش با آرام‌بند.',
      description_ar: 'انزلاق كامل للأدراج مع إغلاق ناعم.',
      description_zh: '全拉抽屉滑轨，带缓冲装置。',
      is_featured: 1, is_new: 1, sort_order: 3
    },
    {
      code: 'HF-1004',
      title_en: 'Cabinet Lift', title_fa: 'جک کابینت', title_ar: 'آلية رفع الخزائن', title_zh: '柜门支撑杆',
      category: 'Lifts', finish: 'Silver', collection: 'Motion',
      image_url: 'https://images.unsplash.com/photo-1656402887556-e727ffe1f6d7?w=400&q=80',
      description_en: 'Gas-powered lift mechanism for upper cabinet doors.',
      description_fa: 'مکانیزم بالابر گازی برای درب‌های کابینت بالا.',
      description_ar: 'آلية رفع تعمل بالغاز لأبواب الخزائن العلوية.',
      description_zh: '上柜门用气动支撑杆。',
      is_featured: 0, sort_order: 4
    }
  ];

  let productCount = 0;
  for (const p of products) {
    const existing = queryOne('SELECT id FROM products WHERE code = ?', [p.code]);
    if (!existing) {
      runStatement(`
        INSERT INTO products (code, title_en, title_fa, title_ar, title_zh, category, finish, collection,
          image_url, description_en, description_fa, description_ar, description_zh,
          is_featured, is_new, is_best_seller, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.code, p.title_en, p.title_fa, p.title_ar, p.title_zh, p.category, p.finish, p.collection,
          p.image_url, p.description_en, p.description_fa, p.description_ar, p.description_zh,
          p.is_featured || 0, p.is_new || 0, p.is_best_seller || 0, p.sort_order || 0]);
      productCount++;
    }
  }
  console.log(`  ✓ ${productCount} products seeded`);

  // Seed representatives
  const reps = [
    { name: 'Klaus Schmidt', company: 'Schmidt Küchen GmbH', city_en: 'Berlin', city_fa: 'برلین', city_ar: 'برلين', city_zh: '柏林', country: 'Germany', phone: '+49 30 1234 5678', email: 'k.schmidt@schmidt-kuechen.de', address: 'Friedrichstraße 123, 10117 Berlin', lat: 52.5200, lng: 13.4050, sort_order: 1 },
    { name: 'Ali Rezaei', company: 'Hüfel Iran', city_en: 'Tehran', city_fa: 'تهران', city_ar: 'طهران', city_zh: '德黑兰', country: 'Iran', phone: '+98 21 1234 5678', email: 'info@hufel.ir', address: 'Valiasr St., Tehran, Iran', lat: 35.6892, lng: 51.3890, sort_order: 2 },
    { name: 'Marie Dubois', company: 'Dubois Cuisines', city_en: 'Paris', city_fa: 'پاریس', city_ar: 'باريس', city_zh: '巴黎', country: 'France', phone: '+33 1 1234 5678', email: 'marie@dubois-cuisines.fr', lat: 48.8566, lng: 2.3522, sort_order: 3 }
  ];

  let repCount = 0;
  for (const r of reps) {
    const existing = queryOne('SELECT id FROM representatives WHERE name = ?', [r.name]);
    if (!existing) {
      runStatement(`
        INSERT INTO representatives (name, company, city_en, city_fa, city_ar, city_zh, country, phone, email, address, lat, lng, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [r.name, r.company, r.city_en, r.city_fa, r.city_ar, r.city_zh, r.country, r.phone, r.email, r.address || '', r.lat, r.lng, r.sort_order]);
      repCount++;
    }
  }
  console.log(`  ✓ ${repCount} representatives seeded`);

  // Seed theme song
  const existingSong = queryOne('SELECT id FROM songs WHERE file_url = ?', ['/music/Hufel.mp3']);
  if (!existingSong) {
    runStatement(`
      INSERT INTO songs (title_en, title_fa, title_ar, title_zh, file_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['Hüfel Theme Song', 'آهنگ تم هافل', 'أغنية هوفل', 'Hüfel 主题曲', '/music/Hufel.mp3', 1, 1]);
    console.log('  ✓ Theme song seeded');
  }

  // Seed categories
  const categories = [
    { slug: 'handles', title_en: 'Handles', title_fa: 'دستگیره', title_ar: 'مقابض', title_zh: '把手' },
    { slug: 'hinges', title_en: 'Hinges', title_fa: 'لولا', title_ar: 'مفصلات', title_zh: '铰链' },
    { slug: 'slides', title_en: 'Drawer Slides', title_fa: 'ریل کشو', title_ar: 'أدراج', title_zh: '滑轨' },
    { slug: 'lifts', title_en: 'Lifts', title_fa: 'جک', title_ar: 'روافع', title_zh: '支撑杆' },
    { slug: 'knobs', title_en: 'Knobs', title_fa: 'دستگیره کابینت', title_ar: 'مقابض صغيرة', title_zh: '旋钮' }
  ];

  let catCount = 0;
  for (const c of categories) {
    const existing = queryOne('SELECT id FROM categories WHERE slug = ?', [c.slug]);
    if (!existing) {
      runStatement('INSERT INTO categories (slug, title_en, title_fa, title_ar, title_zh) VALUES (?, ?, ?, ?, ?)',
        [c.slug, c.title_en, c.title_fa, c.title_ar, c.title_zh]);
      catCount++;
    }
  }
  console.log(`  ✓ ${catCount} categories seeded`);

  // Seed before/after images - using local Unsplash images that exist in the project
  const beforeAfter = [
    {
      title_en: 'Modern Kitchen Transformation', title_fa: 'تحول آشپزخانه مدرن', title_ar: 'تحول المطبخ الحديث', title_zh: '现代厨房改造',
      before_image: 'https://images.unsplash.com/photo-1656402887556-e727ffe1f6d7?w=800&q=80',
      after_image: 'https://images.unsplash.com/photo-1663811396551-e639caee6e62?w=800&q=80',
      sort_order: 1
    },
    {
      title_en: 'Luxury Cabinetry Upgrade', title_fa: 'ارتقاء کابینت لوکس', title_ar: 'ترقية الخزائن الفاخرة', title_zh: '豪华橱柜升级',
      before_image: 'https://images.unsplash.com/photo-1623092242739-5a382879cec9?w=800&q=80',
      after_image: 'https://images.unsplash.com/photo-1564540586988-aa4e53c3d799?w=1000&q=80',
      sort_order: 2
    }
  ];

  let baCount = 0;
  for (const ba of beforeAfter) {
    // Check if this already exists by title
    const existing = queryOne('SELECT id FROM before_after WHERE title_en = ?', [ba.title_en]);
    if (!existing) {
      runStatement(`
        INSERT INTO before_after (title_en, title_fa, title_ar, title_zh, before_image, after_image, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [ba.title_en, ba.title_fa, ba.title_ar, ba.title_zh, ba.before_image, ba.after_image, ba.sort_order]);
      baCount++;
    }
  }
  console.log(`  \u2713 ${baCount} before/after images seeded`);
  console.log('\n  ✦ Seeding complete! ✦\n');
  console.log('  Run `node server.js` to start the CMS.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
