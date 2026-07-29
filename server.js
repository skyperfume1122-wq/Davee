const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Determine writable paths for Vercel (read-only filesystem except /tmp)
const isVercel = !!process.env.VERCEL;
const dataDir = isVercel ? '/tmp/hufel-data' : path.join(__dirname);
const uploadsDir = path.join(dataDir, 'uploads');

// Initialize database (async, completes before first request)
let dbReady = false;
let dbError = null;
const dbInitPromise = initDb().then(() => {
  dbReady = true;
  console.log('✓ Database initialized');
}).catch(err => {
  dbError = err;
  dbReady = true; // Unblock middleware so it can return 500
  console.error('Database init failed:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'hufel-cms-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isVercel || process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files - the existing site (no DB needed, serve immediately)
app.use(express.static(path.join(__dirname, 'public')));

// Serve music files
app.use('/music', express.static(path.join(__dirname, 'music')));

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve uploaded images
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Wait-for-DB middleware (only for routes that need the database)
app.use('/api', (req, res, next) => {
  if (dbReady && !dbError) return next();
  if (dbError) {
    return res.status(500).json({ error: 'Database initialization failed', details: dbError.message });
  }
  // Not ready yet, wait for the init promise
  dbInitPromise.then(() => {
    if (dbError) return res.status(500).json({ error: 'Database initialization failed', details: dbError.message });
    next();
  });
});

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/products', require('./api/products'));
app.use('/api/representatives', require('./api/representatives'));
app.use('/api/settings', require('./api/settings'));
app.use('/api/beforeafter', require('./api/beforeafter'));

// File upload endpoint
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp3|wav|ogg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/upload', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ 
      success: true, 
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    });
  });
});

// Admin panel SPA - serve index.html for admin routes
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Main site - serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel serverless (MUST be exported!)
module.exports = app;

// Only listen directly when NOT on Vercel (local dev)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`\n  ✦ HÜFEL CMS Server ✦\n`);
    console.log(`  • Main site:  http://localhost:${PORT}`);
    console.log(`  • Admin:      http://localhost:${PORT}/admin`);
    console.log(`  • API:        http://localhost:${PORT}/api`);
    console.log(`  • Login:      Amir434 / AmirH434\n`);
  });
}
