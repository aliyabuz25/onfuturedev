const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 6985;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = process.cwd();
const LOG_FILE = path.join(ROOT, 'logs.json');

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 500; // requests per IP per window
const rateBuckets = new Map();

const ATTACK_WINDOW_MS = 10 * 60_000;
const ATTACK_THRESHOLD = 5; // detections in window before ban
const BAN_DURATION_MS = 60 * 60_000;
const attackBuckets = new Map();
const bannedIps = new Map();

const ALLOWED_CDN_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
]);

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
};

const CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://cdn.jsdelivr.net",
  ].join('; '),
  'X-XSS-Protection': '1; mode=block',
};

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  if (!ip) return 'unknown';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function writeLogEntry(statusCode, req, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    ip: getClientIp(req),
    method: req.method,
    url: req.url,
    status: statusCode,
    userAgent: req.headers['user-agent'] || '',
    referer: req.headers.referer || '',
    ...extra,
  };

  fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, (err) => {
    if (err) {
      console.warn('Failed to write log entry:', err.message);
    }
  });
}

function isRateLimited(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };

  if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    bucket.start = now;
    bucket.count = 0;
  }

  bucket.count += 1;
  rateBuckets.set(ip, bucket);

  // Opportunistically prune old buckets.
  if (rateBuckets.size > 10000) {
    for (const [key, value] of rateBuckets.entries()) {
      if (now - value.start > RATE_LIMIT_WINDOW_MS * 2) {
        rateBuckets.delete(key);
      }
    }
  }

  const limited = bucket.count > RATE_LIMIT_MAX;
  const retryMs = limited ? Math.max(RATE_LIMIT_WINDOW_MS - (now - bucket.start), 0) : 0;
  return { limited, retryMs, count: bucket.count };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function sendResponse(res, statusCode, headers, body) {
  res.writeHead(statusCode, { ...CACHE_HEADERS, ...SECURITY_HEADERS, ...headers });
  if (body) res.end(body);
  else res.end();
}

function send400(req, res, info = {}) {
  sendResponse(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
  writeLogEntry(400, req, info);
}

function send404(req, res, info = {}) {
  sendResponse(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
  writeLogEntry(404, req, info);
}

function formatMs(ms) {
  if (ms <= 0) return '0s';
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.ceil(seconds / 60);
  if (minutes >= 2) return `${minutes}m`;
  return `${seconds}s`;
}

function send403(req, res, info = {}) {
  const banMs = info.banExpires ? Math.max(info.banExpires - Date.now(), 0) : null;
  const reason = info.attack || info.reason || 'forbidden';
  const messageParts = [
    'Access blocked.',
    `Reason: ${reason}.`,
    banMs !== null ? `Ban lifts in ~${formatMs(banMs)}.` : null,
  ].filter(Boolean);

  sendResponse(
    res,
    403,
    { 'Content-Type': 'text/plain; charset=utf-8' },
    messageParts.join(' ')
  );
  writeLogEntry(403, req, info);
}

function send429(req, res, info = {}) {
  const retryMs = info.retryMs || RATE_LIMIT_WINDOW_MS;
  const retryAfter = Math.max(1, Math.ceil(retryMs / 1000));
  const message = [
    'Too Many Requests: high volume detected.',
    `Rate limit is ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s.`,
    `Please wait about ${formatMs(retryMs)} before retrying.`,
    info.detail ? `Detail: ${info.detail}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  sendResponse(
    res,
    429,
    { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(retryAfter) },
    message
  );
  writeLogEntry(429, req, { rateLimited: true, retryMs, detail: info.detail || null });
}

function serveFile(filePath, req, res) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return send404(req, res, { missingPath: filePath });
    res.writeHead(200, { ...CACHE_HEADERS, ...SECURITY_HEADERS, 'Content-Type': getContentType(filePath) });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      sendResponse(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error');
      writeLogEntry(500, req, { filePath, streamError: true });
    });
    stream.on('close', () => writeLogEntry(200, req, { filePath }));
  });
}

function resolvePath(urlPath) {
  const rawPath = urlPath.split('?')[0].split('#')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  const cleanPath = decoded.replace(/^\/+/, '') || 'index.html';
  const absolutePath = path.normalize(path.join(ROOT, cleanPath));

  // Prevent path traversal outside the project root.
  if (!absolutePath.startsWith(ROOT)) return null;

  return absolutePath;
}

function proxyCdn(req, res, targetUrl) {
  const client = targetUrl.protocol === 'https:' ? https : http;
  const upstreamReq = client.request(
    targetUrl,
    {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || '',
      },
    },
    (upstreamRes) => {
      const status = upstreamRes.statusCode || 502;
      res.writeHead(status, {
        ...CACHE_HEADERS,
        ...SECURITY_HEADERS,
        'Content-Type': upstreamRes.headers['content-type'] || 'application/octet-stream',
      });
      upstreamRes.pipe(res);
      upstreamRes.on('error', (err) => {
        sendResponse(res, 502, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Gateway');
        writeLogEntry(502, req, { cdnProxy: true, cdnTarget: targetUrl.href, error: err.message });
      });
      upstreamRes.on('end', () => {
        writeLogEntry(status, req, {
          cdnProxy: true,
          cdnTarget: targetUrl.href,
          cdnStatus: status,
          cdnContentType: upstreamRes.headers['content-type'] || '',
        });
      });
    }
  );

  upstreamReq.on('error', (err) => {
    sendResponse(res, 502, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Gateway');
    writeLogEntry(502, req, { cdnProxy: true, cdnTarget: targetUrl.href, error: err.message });
  });

  upstreamReq.end();
}

function detectAttack(urlString) {
  let decoded = urlString;
  try {
    decoded = decodeURIComponent(urlString);
  } catch {
    // Keep raw if decode fails.
  }
  const lower = decoded.toLowerCase();
  const patterns = [
    { type: 'xss_script', regex: /<\s*script/i },
    { type: 'xss_event', regex: /on\w+\s*=/i },
    { type: 'sql_union', regex: /\bunion\s+select\b/i },
    { type: 'sql_tautology', regex: /('|%27|\")\s*or\s+1=1/i },
    { type: 'path_traversal', regex: /\.\.\// },
  ];

  for (const p of patterns) {
    if (p.regex.test(lower)) return p.type;
  }
  return null;
}

function isIpBanned(ip) {
  const until = bannedIps.get(ip);
  if (!until) return false;
  const now = Date.now();
  if (now >= until) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

function registerAttack(ip) {
  const now = Date.now();
  const bucket = attackBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > ATTACK_WINDOW_MS) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  attackBuckets.set(ip, bucket);

  if (bucket.count >= ATTACK_THRESHOLD) {
    const banUntil = now + BAN_DURATION_MS;
    bannedIps.set(ip, banUntil);
    return banUntil;
  }
  return null;
}

const server = http.createServer((req, res) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${HOST}`);
  } catch {
    return send400(req, res, { reason: 'url_parse_failed' });
  }

  const ip = getClientIp(req);

  if (isIpBanned(ip)) {
    return send403(req, res, { reason: 'ip_banned', banExpires: bannedIps.get(ip) });
  }

  const rate = isRateLimited(req);
  if (rate.limited) {
    return send429(req, res, { retryMs: rate.retryMs, detail: `IP ${ip} count=${rate.count}` });
  }

  const attackType = detectAttack(req.url);
  if (attackType) {
    const banUntil = registerAttack(ip);
    send403(req, res, { attack: attackType, banned: Boolean(banUntil), banExpires: banUntil || null });
    return;
  }

  if (parsedUrl.pathname === '/cdn') {
    const target = parsedUrl.searchParams.get('url');
    if (!target) return send400(req, res, { reason: 'missing_cdn_url' });
    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return send400(req, res, { reason: 'invalid_cdn_url' });
    }
    if (!['https:', 'http:'].includes(targetUrl.protocol)) {
      return send400(req, res, { reason: 'invalid_protocol' });
    }
    if (!ALLOWED_CDN_HOSTS.has(targetUrl.hostname)) {
      return send400(req, res, { reason: 'disallowed_host', host: targetUrl.hostname });
    }
    return proxyCdn(req, res, targetUrl);
  }

  // Check for API requests
  if (parsedUrl.pathname === '/api/content') {
    if (req.method === 'GET') {
      const contentPath = path.join(ROOT, 'data', 'content.json');
      fs.readFile(contentPath, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            return sendResponse(res, 200, { 'Content-Type': 'application/json' }, '{}');
          }
          return sendResponse(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Failed to read content' }));
        }
        sendResponse(res, 200, { 'Content-Type': 'application/json' }, data);
      });
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const newContent = JSON.parse(body);
          // Simple validation or merging logic can go here
          const contentPath = path.join(ROOT, 'data', 'content.json');

          // Read existing to merge - prevent overwriting with partial data if intended, 
          // but for this simple blueprint, we might replace or merge. Let's merge.
          fs.readFile(contentPath, 'utf8', (readErr, existingData) => {
            let finalContent = newContent;
            if (!readErr) {
              try {
                const existing = JSON.parse(existingData);
                finalContent = { ...existing, ...newContent };
              } catch (e) { /* ignore parse error on existing */ }
            }

            fs.writeFile(contentPath, JSON.stringify(finalContent, null, 2), (writeErr) => {
              if (writeErr) {
                return sendResponse(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Failed to save content' }));
              }
              sendResponse(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
            });
          });
        } catch (e) {
          send400(req, res, { reason: 'invalid_json' });
        }
      });
      return;
    }
  }

  if (parsedUrl.pathname === '/api/upload' && req.method === 'POST') {
    // Very basic multipart handler for single file upload
    // In a real production env, use 'busboy' or 'formidable'. 
    // For this zero-dependency setup, we will save the raw body if it's binary or check Content-Type.
    // However, parsing multipart/form-data manually is error-prone. 
    // Let's assume the client sends the file as raw binary body with a filename query param for simplicity 
    // OR keeps it simple with a library. 
    // Given "Production Ready" constraints, I will add a simple buffer collector with a query param filename 
    // to avoid adding complex dependencies right now, or stick to simple JSON updates if images aren't critical immediately.
    // BUT the prompt asks for "File Uploaders". 
    // Let's implement a naive binary saver for now: usage: POST /api/upload?name=myfile.png body=RAW_BYTES

    const fileName = parsedUrl.searchParams.get('name');
    if (!fileName) return send400(req, res, { reason: 'missing_filename' });

    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uploadDir = path.join(ROOT, 'assets', 'uploads'); // Saving to assets/uploads so they are served statically

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      sendResponse(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: `/assets/uploads/${safeName}` }));
    });

    writeStream.on('error', (err) => {
      sendResponse(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Upload failed' }));
    });
    return;
  }

  const filePath = resolvePath(req.url);
  if (!filePath) return send404(req, res, { reason: 'resolve_failed' });

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      return serveFile(path.join(filePath, 'index.html'), req, res);
    }
    if (!err && stats.isFile()) {
      return serveFile(filePath, req, res);
    }
    send404(req, res, { missingPath: filePath });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
