const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 6985;
const ROOT = process.cwd();

// --- Configuration ---
const uploadDir = path.join(ROOT, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const contentPath = path.join(ROOT, 'data', 'content.json');

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"]
    },
  },
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(ROOT));

// --- API Endpoints ---

// Get all content
app.get('/api/content', (req, res) => {
  fs.readFile(contentPath, 'utf8', (err, data) => {
    if (err) return res.json({});
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.json({});
    }
  });
});

// Update content (merge)
app.post('/api/content', (req, res) => {
  const newContent = req.body;
  fs.readFile(contentPath, 'utf8', (err, data) => {
    let current = {};
    if (!err) {
      try { current = JSON.parse(data); } catch (e) { }
    }
    const updated = { ...current, ...newContent };
    fs.writeFile(contentPath, JSON.stringify(updated, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Save failed' });
      res.json({ success: true });
    });
  });
});

// Upload image using Multer
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/assets/uploads/${req.file.filename}` });
});

// --- Proxy /cdn logic (Keeping it for existing UI) ---
app.get('/cdn', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url');
  // Basic proxy logic can be added here or use a library like 'http-proxy-middleware'
  // To keep it simple and consistent with previous behavior, we can still use the raw https request
  const https = require('https');
  try {
    const targetUrl = new URL(target);
    https.get(targetUrl, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }).on('error', () => res.status(502).send('Gateway Error'));
  } catch (e) {
    res.status(400).send('Invalid URL');
  }
});

// Fallback to index.html for SPA-like behavior if needed, 
// though here we mainly serve static files.
app.get('*', (req, res) => {
  const filePath = path.join(ROOT, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
