# HÜFEL CMS — Backend & Admin Panel

**Complete backend + admin panel** for the Hüfel luxury hardware brand website.

---

## 📋 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js** (React) | Frontend framework (static site) |
| **JavaScript (ES6+)** | Main programming language |
| **HTML5 / CSS3** | Markup & styling |
| **Framer Motion** | Animations |
| **Lucide React** | Icon library |
| **Node.js + Express** | Backend API server |
| **sql.js** (SQLite) | Database (zero-config, file-based) |
| **bcryptjs** | Password hashing |
| **express-session** | Admin authentication |
| **multer** | File uploads |

## 🌐 Languages Supported

| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `fa` | فارسی (Persian/Farsi) | RTL |
| `ar` | العربية (Arabic) | RTL |
| `zh` | 中文 (Chinese) | LTR |

---

## 🚀 Quick Start (Local)

```bash
# 1. Navigate to the project folder
cd hufel-cms

# 2. Install dependencies
npm install

# 3. Seed the database with initial content
node db/seed.js

# 4. Start the server
npm start
```

### Access

| URL | Description |
|-----|-------------|
| http://localhost:3001 | Main Hüfel website |
| http://localhost:3001/admin | **Admin Panel** |
| http://localhost:3001/api/settings | API Example |

### Admin Login

| Credential | Value |
|-----------|-------|
| Username | `Amir434` |
| Password | `AmirH434` |

---

## 🌍 Deploy on Vercel (Free)

This is the easiest way to host your site online.

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub first, then:
cd hufel-cms
git init
git add .
git commit -m "Initial commit - HÜFEL CMS"
git remote add origin https://github.com/YOUR_USERNAME/hufel-cms.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **"Add New" → "Project"**
3. Import your `hufel-cms` repository
4. **Settings** (use these exact values):
   - **Framework Preset**: `Other`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`
   - **Root Directory**: `./` (project root)

5. **Environment Variables** (add these):
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = (generate a random string, e.g. from `openssl rand -hex 32`)

6. Click **"Deploy"**

### Step 3: Seed the Database (One-Time)

After first deploy, you need to seed the database. Run this in a terminal:

```bash
# Using Vercel CLI
npx vercel env pull
node db/seed.js

# Or run locally and push the database file:
npm install
node db/seed.js
# Then re-deploy (the db file will be included)
```

> **⚠️ Note:** SQLite is file-based. On Vercel's serverless infrastructure, the database file resets on each deployment. For a permanent database, consider upgrading to a hosted SQL database (like Supabase or PlanetScale). See the **"Production Database"** section below.

### Alternative: Deploy on Render (Free, Persistent Storage)

[Render](https://render.com) provides persistent disks that keep your SQLite data:

1. Create a **Web Service** on Render
2. Connect your GitHub repo
3. **Build Command**: `npm install && node db/seed.js`
4. **Start Command**: `node server.js`
5. **Plan**: Free

### Alternative: Deploy on Railway (Free, Persistent Storage)

[Railway](https://railway.app) also provides persistent volumes:

1. Create a new project on Railway
2. Connect your GitHub repo
3. **Start Command**: `node server.js`
4. **Cron Job** (optional): Run `node db/seed.js` on first deploy

---

## 🔧 Admin Panel Features

### Dashboard
- Overview of products, representatives, and site status
- Quick action buttons

### Products Management
- **No prices** — just titles in 4 languages (EN/FA/AR/ZH)
- **Image upload** — click to upload from your computer (no URL needed!)
- Flags: Featured, New, Best Seller
- Full CRUD

### Representatives Management
- Name, company, city (4 languages), country, phone, email
- Map coordinates for future map integration

### Before & After Images
- Upload **before** and **after** photos directly from your computer
- Add/remove/change anytime
- Automatically displayed on the main site's Lookbook section
- Titles in 4 languages

### Settings
- **Site Identity**: Name, taglines (4 languages), logo upload
- **Theme Colors**: Accent, background, text, line colors — all customizable
- **Fonts**: Primary, Display, and Logo fonts
- **Contact Info**: Phone, email, cities
- **Hero Section**: Video URL, kicker text (4 languages)

### Music Player
- Manage playlist with file upload
- **Theme song** (`Hufel.mp3`) pre-loaded at 18% volume
- Floating music player on the bottom-left of the website

---

## 📁 Project Structure

```
hufel-cms/                     # ← Root directory (deploy this to Vercel)
├── server.js                  # Express server (entry point)
├── package.json               # Dependencies
├── vercel.json                # Vercel deployment config
├── .gitignore
├── README.md                  # This file
├── db/
│   ├── init.js                # Database init & helpers
│   ├── seed.js                # Initial data seeder
│   └── database.sqlite        # SQLite database (auto-created)
├── api/
│   ├── auth.js                # Login/logout
│   ├── products.js            # Products CRUD
│   ├── representatives.js     # Representatives CRUD
│   ├── beforeafter.js         # Before/After images CRUD
│   └── settings.js            # Settings & music API
├── admin/
│   ├── index.html             # Admin panel shell
│   ├── style.css              # Admin styling
│   └── app.js                 # Admin panel logic
├── public/                    # Static site (Next.js export)
│   ├── index.html             # Main site with music player
│   └── api-loader.js          # Dynamic data injection script
├── music/
│   └── Hufel.mp3              # Theme song
└── uploads/                   # Uploaded images & files
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Admin login |
| GET | `/api/auth/me` | No | Check session |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/products` | No | List products |
| POST | `/api/products` | Yes | Create product |
| PUT | `/api/products/:id` | Yes | Update product |
| DELETE | `/api/products/:id` | Yes | Delete product |
| GET | `/api/representatives` | No | List active reps |
| POST | `/api/representatives` | Yes | Create rep |
| PUT | `/api/representatives/:id` | Yes | Update rep |
| DELETE | `/api/representatives/:id` | Yes | Delete rep |
| GET | `/api/beforeafter` | No | List active images |
| POST | `/api/beforeafter` | Yes | Add image set |
| PUT | `/api/beforeafter/:id` | Yes | Update image set |
| DELETE | `/api/beforeafter/:id` | Yes | Delete image set |
| GET | `/api/settings` | No | Get all settings |
| PUT | `/api/settings` | Yes | Update settings |
| GET | `/api/settings/songs` | No | Get songs |
| POST | `/api/settings/songs` | Yes | Add song |
| DELETE | `/api/settings/songs/:id` | Yes | Delete song |
| POST | `/api/upload` | Yes | Upload file (image/audio) |

---

## 🎵 Music Player

The Hüfel theme song (`Hufel.mp3`) is:
- ✅ Stored in `/music/Hufel.mp3`
- ✅ Added to the database playlist
- ✅ Playable from the floating player on the main site
- ✅ Set to **18% volume** for subtle background playback
- ✅ Editable from **Admin → Music Player**

---

## 🖼️ Before & After Images

Upload before/after comparison images from **Admin → Before & After**:
- Upload directly from your computer (no URL needed)
- Add as many sets as you want
- They appear automatically on the main site's Lookbook section
- Edit or delete anytime

---

## ⚠️ Production Database Note

SQLite stores data in a single file (`db/database.sqlite`). On Vercel (serverless), this file resets on each new deployment. For a permanent database, either:

**Option A: Use Render/Railway** (free, persistent storage)
**Option B: Upgrade to PostgreSQL**
1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Replace `sql.js` with `pg` (PostgreSQL client)
3. Update the API routes to use the new database

---

## 🧪 Testing

```bash
npm start
# Visit http://localhost:3001
# Admin: http://localhost:3001/admin (login: Amir434 / AmirH434)
```

---

## 📝 License

Proprietary — Hüfel Brand Assets
