const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// On Vercel, use /tmp (writable temp directory)
const DB_PATH = process.env.VERCEL 
  ? '/tmp/hufel-data/database.sqlite' 
  : path.join(__dirname, 'database.sqlite');

let db = null;

function getDb() {
  return db;
}

async function initDb() {
  // Explicit WASM path for Vercel serverless (sql.js needs to find the .wasm file)
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  // Ensure the directory for the database exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Try to load existing database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✓ Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('✓ Created new database');
  }

  db.run('PRAGMA journal_mode=DELETE');
  
  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, is_admin INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE,
    title_en TEXT NOT NULL DEFAULT '', title_fa TEXT NOT NULL DEFAULT '',
    title_ar TEXT NOT NULL DEFAULT '', title_zh TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT '', finish TEXT DEFAULT '', collection TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    model_3d_url TEXT DEFAULT '',
    description_en TEXT DEFAULT '', description_fa TEXT DEFAULT '',
    description_ar TEXT DEFAULT '', description_zh TEXT DEFAULT '',
    is_featured INTEGER DEFAULT 0, is_new INTEGER DEFAULT 0,
    is_best_seller INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL DEFAULT '', title_fa TEXT NOT NULL DEFAULT '',
    title_ar TEXT NOT NULL DEFAULT '', title_zh TEXT NOT NULL DEFAULT '',
    description_en TEXT DEFAULT '', description_fa TEXT DEFAULT '',
    description_ar TEXT DEFAULT '', description_zh TEXT DEFAULT '',
    image_url TEXT DEFAULT '', sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS representatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    company TEXT DEFAULT '', city_en TEXT DEFAULT '', city_fa TEXT DEFAULT '',
    city_ar TEXT DEFAULT '', city_zh TEXT DEFAULT '', country TEXT DEFAULT '',
    phone TEXT DEFAULT '', email TEXT DEFAULT '', address TEXT DEFAULT '',
    lat REAL DEFAULT 0, lng REAL DEFAULT 0, is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL, setting_value TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title_en TEXT DEFAULT '',
    title_fa TEXT DEFAULT '', title_ar TEXT DEFAULT '', title_zh TEXT DEFAULT '',
    file_url TEXT NOT NULL, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, section TEXT NOT NULL,
    key TEXT NOT NULL, lang TEXT NOT NULL, value TEXT DEFAULT '',
    UNIQUE(section, key, lang)
  )`);

  // Journal posts table
  db.run(`CREATE TABLE IF NOT EXISTS journal_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT NOT NULL DEFAULT '', title_fa TEXT NOT NULL DEFAULT '',
    title_ar TEXT NOT NULL DEFAULT '', title_zh TEXT NOT NULL DEFAULT '',
    slug TEXT UNIQUE,
    excerpt_en TEXT DEFAULT '', excerpt_fa TEXT DEFAULT '',
    excerpt_ar TEXT DEFAULT '', excerpt_zh TEXT DEFAULT '',
    content_en TEXT DEFAULT '', content_fa TEXT DEFAULT '',
    content_ar TEXT DEFAULT '', content_zh TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    author TEXT DEFAULT '',
    published INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Before/After images table
  db.run(`CREATE TABLE IF NOT EXISTS before_after (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT DEFAULT '', title_fa TEXT DEFAULT '',
    title_ar TEXT DEFAULT '', title_zh TEXT DEFAULT '',
    before_image TEXT NOT NULL DEFAULT '',
    after_image TEXT NOT NULL DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Check if admin user exists  
  const existing = db.exec("SELECT id FROM users WHERE username = 'Amir434'");
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hash = bcrypt.hashSync('AmirH434', 10);
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", ['Amir434', hash]);
    console.log('✓ Admin user created (Amir434 / AmirH434)');
  }

  // Insert default settings
  const defaultSettings = [
    ['site_name', 'HÜFEL'],
    ['site_tagline_en', 'The Signature of Quality'],
    ['site_tagline_fa', 'امضای کیفیت'],
    ['site_tagline_ar', 'توقيع الجودة'],
    ['site_tagline_zh', '品质的标志'],
    ['theme_accent', '#c8a45c'],
    ['theme_accent_soft', '#d4b373'],
    ['theme_bg', '#0b0a09'],
    ['theme_bg_soft', '#121110'],
    ['theme_fg', '#f5f3ef'],
    ['theme_muted', '#8a8783'],
    ['theme_line', '#1f1d1b'],
    ['theme_card', '#161514'],
    ['font_primary', 'Inter'],
    ['font_display', 'Cormorant Garamond'],
    ['font_antrian', 'Antrian'],
    ['logo_url', '/hufel-logo.png'],
    ['hero_video', 'https://customer-assets.emergentagent.com/job_elite-design-studio-8/artifacts/as8t1190_VID-20260705-WA0005.mp4'],
    ['contact_phone', '+49 30 1234 5678'],
    ['contact_email', 'hello@hufel.com'],
    ['contact_cities', 'Berlin, Germany · Tehran, Iran'],
    ['marquee_items', 'German Quality,10-Year Warranty,DIN Standard,Minimal Design,Soft Motion,Unmatched Durability'],
    ['stats_years', '40+'], ['stats_products', '1200+'],
    ['stats_countries', '35'], ['stats_satisfaction', '98%'],
    ['hero_kicker_en', 'Luxury Hardware · European Engineering'],
    ['hero_kicker_fa', 'یراق‌آلات لوکس · مهندسی اروپایی'],
    ['hero_kicker_ar', 'أجهزة فاخرة · هندسة أوروبية'],
    ['hero_kicker_zh', '豪华硬件 · 欧洲工程'],
    ['dealer_request_email', 'hello@hufel.com'],
    ['instagram_url', 'https://instagram.com/hufel'],
    ['linkedin_url', 'https://linkedin.com/company/hufel'],
    ['youtube_url', 'https://youtube.com/@hufel'],
  ];

  for (const [key, value] of defaultSettings) {
    const exists = db.exec(`SELECT id FROM settings WHERE setting_key = '${key.replace(/'/g, "''")}'`);
    if (exists.length === 0 || exists[0].values.length === 0) {
      db.run("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", [key, value]);
    }
  }

  saveDb();
  console.log('✓ Database initialized with default settings');
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Helper functions that wrap sql.js with a simpler API
function queryAll(sql, params = []) {
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }
  const result = db.exec(sql);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runStatement(sql, params = []) {
  db.run(sql, params);
  const idResult = db.exec("SELECT last_insert_rowid() as id");
  const id = idResult.length > 0 ? idResult[0].values[0][0] : 0;
  saveDb();
  return { lastInsertRowid: id, changes: db.getRowsModified() };
}

module.exports = { initDb, getDb, queryAll, queryOne, runStatement, saveDb };
