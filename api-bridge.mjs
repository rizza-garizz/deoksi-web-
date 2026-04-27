import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

/**
 * Read the raw body from a Node.js IncomingMessage.
 */
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Build a standard Web API Request from a Node.js IncomingMessage.
 * The API handler functions expect this interface (headers.get(), .json(), etc.).
 */
async function buildWebRequest(req) {
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);

  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      webHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await readBody(req) : undefined;

  return new Request(fullUrl.toString(), {
    method: req.method,
    headers: webHeaders,
    body: body && body.length > 0 ? body : undefined,
  });
}

// Route map: URL pathname -> handler file path
const API_ROUTES = {
  '/api/auth/login': './api/auth/login.js',
  '/api/customers': './api/customers.js',
  '/api/articles': './api/articles.js',
  '/api/media': './api/media.js',
  '/api/media-config': './api/media-config.js',
  '/api/gallery-content': './api/gallery-content.js',
  '/api/homepage-content': './api/homepage-content.js',
  '/api/site-content': './api/site-content.js',
  '/api/page-content': './api/page-content.js',
};

// Helper to handle API requests
async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  const filePath = API_ROUTES[pathname];

  if (filePath && fs.existsSync(filePath)) {
    try {
      const module = await import(filePath + '?t=' + Date.now());
      const handler = module.default;

      // Build a proper Web API Request object
      const webRequest = await buildWebRequest(req);

      const result = await handler(webRequest);

      if (result instanceof Response) {
        res.statusCode = result.status;
        result.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        const bodyText = await result.text();
        res.end(bodyText);
      } else {
        // handler already sent response via vercelRes (legacy path)
        if (!res.writableEnded) {
          res.statusCode = 204;
          res.end();
        }
      }
    } catch (err) {
      console.error('API Error:', err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
  }
}

// Start Proxy Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    handleApi(req, res);
  } else {
    // Serve Static Files
    let filePath = '.' + (pathname === '/' ? '/index.html' : pathname);
    if (!path.extname(filePath)) filePath += '/index.html';
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('404: Not Found');
        return;
      }
      
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      
      res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
      res.end(data);
    });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 DEOKSI ALL-IN-ONE SERVER active on http://localhost:${PORT}`);
  console.log(`Port ${PORT} serves both Website and Admin Panel!`);
});
