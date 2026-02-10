const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 6985;
const ROOT = __dirname;

// --- Self-Healing Data Mechanism for Docker Volumes ---
const dataDir = path.join(ROOT, 'data');
const defaultsDir = path.join(ROOT, 'data-defaults');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// If data is empty (common in fresh Portainer volume mounts), restore from defaults
if (fs.existsSync(defaultsDir)) {
  fs.readdirSync(defaultsDir).forEach(file => {
    const targetPath = path.join(dataDir, file);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(path.join(defaultsDir, file), targetPath);
      console.log(`[Self-Healing] Restored missing file: ${file}`);
    }
  });
}

const contentPath = path.join(dataDir, 'content2.json');
const navbarPath = path.join(dataDir, 'navbar.json');

// --- Migration Logic ---
const oldContentPath = path.join(dataDir, 'content.json');
if (fs.existsSync(oldContentPath) && !fs.existsSync(contentPath)) {
  try {
    fs.renameSync(oldContentPath, contentPath);
    console.log(`[Migration] Renamed content.json to content2.json`);
  } catch (err) {
    console.error(`[Migration] Failed to rename content.json:`, err);
  }
}

// Ensure files are at least valid empty objects to prevent 404/crash
if (!fs.existsSync(contentPath)) fs.writeFileSync(contentPath, '{}');
if (!fs.existsSync(navbarPath)) fs.writeFileSync(navbarPath, '{}');

// --- Configuration ---
const uploadDir = path.join(ROOT, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });


// --- Multer Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// --- Middleware ---
// Temporarily disabling full Helmet to debug "white screen" issue on localhost
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(express.json());

// 1. Serve static files FIRST
app.use(express.static(ROOT));

// 2. API Endpoints
app.get('/api/content', (req, res) => {
  fs.readFile(contentPath, 'utf8', (err, data) => {
    if (err) return res.json({});
    try { res.json(JSON.parse(data)); } catch (e) { res.json({}); }
  });
});

app.post('/api/content', (req, res) => {
  const newContent = req.body;
  fs.readFile(contentPath, 'utf8', (err, data) => {
    let current = {};
    if (!err) { try { current = JSON.parse(data); } catch (e) { } }
    const updated = { ...current, ...newContent };
    fs.writeFile(contentPath, JSON.stringify(updated, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Save failed' });
      res.json({ success: true });
    });
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/assets/uploads/${req.file.filename}` });
});

app.get('/cdn', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url');
  const https = require('https');
  try {
    const targetUrl = new URL(target);
    https.get(targetUrl, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }).on('error', () => res.status(502).send('Gateway Error'));
  } catch (e) { res.status(400).send('Invalid URL'); }
});

// 3. Fallback for SPA (only for routes that don't match files)
app.use((req, res) => {
  // If it's an API request, return 404
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API Not Found' });

  // If the path has an extension, it's a missing file, not a navigation route
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return res.status(404).send('Not Found');
  }

  // Otherwise, serve index.html for SPA-like navigation
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
