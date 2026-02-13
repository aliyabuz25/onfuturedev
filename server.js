const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const helmet = require("helmet");
const morgan = require("morgan");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 6985;
const ROOT = __dirname;

/* =====================================================
   BASIC MIDDLEWARE
===================================================== */

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan("combined"));
app.use(express.json());

/* =====================================================
   DIRECTORY SETUP
===================================================== */

const dataDir = path.join(ROOT, "data");
const defaultsDir = path.join(ROOT, "data-defaults");
const uploadDir = path.join(ROOT, "assets", "uploads");

[dataDir, uploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* =====================================================
   SELF-HEALING DATA (Docker volume safe)
===================================================== */

if (fs.existsSync(defaultsDir)) {
  fs.readdirSync(defaultsDir).forEach(file => {
    const targetPath = path.join(dataDir, file);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(path.join(defaultsDir, file), targetPath);
      console.log(`[Self-Healing] Restored: ${file}`);
    }
  });
}

/* =====================================================
   MIGRATION
===================================================== */

const contentPath = path.join(dataDir, "content5.json");
const navbarPath = path.join(dataDir, "navbar.json");
const oldContentPath = path.join(dataDir, "content4.json");

if (fs.existsSync(oldContentPath) && !fs.existsSync(contentPath)) {
  try {
    fs.renameSync(oldContentPath, contentPath);
    console.log("[Migration] content4.json -> content5.json");
  } catch (err) {
    console.error("[Migration] Failed:", err);
  }
}

if (!fs.existsSync(contentPath)) fs.writeFileSync(contentPath, "{}");
if (!fs.existsSync(navbarPath)) fs.writeFileSync(navbarPath, "{}");

/* =====================================================
   FILE WATCHER (NO POLLING)
===================================================== */

const techPath = path.join(ROOT, "sections", "tech.html");

if (fs.existsSync(techPath)) {
  fs.watch(techPath, (eventType) => {
    if (eventType === "change") {
      console.log("[Watcher] tech.html updated");
    }
  });
}

/* =====================================================
   MULTER UPLOAD
===================================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName =
      Date.now() +
      "-" +
      file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "");
    cb(null, safeName);
  }
});

const upload = multer({ storage });

/* =====================================================
   STATIC FILES
===================================================== */

app.use(express.static(ROOT, {
  extensions: ["html"]
}));

/* =====================================================
   API ROUTES
===================================================== */

app.get("/api/content", (req, res) => {
  fs.readFile(contentPath, "utf8", (err, data) => {
    if (err) return res.json({});
    try {
      res.json(JSON.parse(data));
    } catch {
      res.json({});
    }
  });
});

app.post("/api/content", (req, res) => {
  const newContent = req.body;

  fs.readFile(contentPath, "utf8", (err, data) => {
    let current = {};
    if (!err) {
      try { current = JSON.parse(data); } catch { }
    }

    const updated = { ...current, ...newContent };

    fs.writeFile(
      contentPath,
      JSON.stringify(updated, null, 2),
      (err) => {
        if (err) return res.status(500).json({ error: "Save failed" });
        res.json({ success: true });
      }
    );
  });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No file uploaded" });

  res.json({ url: `/assets/uploads/${req.file.filename}` });
});

app.get("/cdn", (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

  try {
    const targetUrl = new URL(target);

    https.get(targetUrl, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }).on("error", () => {
      res.status(502).send("Gateway Error");
    });

  } catch {
    res.status(400).send("Invalid URL");
  }
});

/* =====================================================
   SPA FALLBACK
===================================================== */

app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "API Not Found" });

  const ext = path.extname(req.path);
  if (ext && ext !== ".html")
    return res.status(404).send("Not Found");

  res.sendFile(path.join(ROOT, "index.html"));
});

/* =====================================================
   START SERVER (ONLY ONCE)
===================================================== */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
