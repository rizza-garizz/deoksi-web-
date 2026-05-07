import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const STATIC_ROOT = path.resolve(__dirname, process.env.STATIC_ROOT || '.');
let requestCounter = 0;
const BRIDGE_LOG_LIMIT = 60;

if (!globalThis.__DEOKSI_BRIDGE_LOGS__) {
  globalThis.__DEOKSI_BRIDGE_LOGS__ = [];
}

function pushBridgeLog(entry) {
  const logs = globalThis.__DEOKSI_BRIDGE_LOGS__;
  logs.unshift({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (logs.length > BRIDGE_LOG_LIMIT) {
    logs.length = BRIDGE_LOG_LIMIT;
  }
}

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
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('Request body aborted by client.')));
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

function resolveRoute(relativePath) {
  return path.resolve(__dirname, relativePath);
}

function resolveStaticPath(requestPath) {
  let normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  if (!path.extname(normalizedPath)) normalizedPath += '/index.html';

  const candidate = path.resolve(STATIC_ROOT, `.${normalizedPath}`);
  const relative = path.relative(STATIC_ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

const API_ROUTES = {
  '/api/auth/login': resolveRoute('./api/auth/login.js'),
  '/api/admin/profile': resolveRoute('./api/admin/profile.js'),
  '/api/admin/change-password': resolveRoute('./api/admin/change-password.js'),
  '/api/admin/customers-reset': resolveRoute('./api/admin/customers-reset.js'),
  '/api/bridge-diagnostics': resolveRoute('./api/bridge-diagnostics.js'),
  '/api/customers': resolveRoute('./api/customers.js'),
  '/api/articles': resolveRoute('./api/articles.js'),
  '/api/media': resolveRoute('./api/media.js'),
  '/api/media-slots': resolveRoute('./api/media-slots.js'),
  '/api/upload': resolveRoute('./api/upload.js'),
  '/api/media-config': resolveRoute('./api/media-config.js'),
  '/api/gallery-content': resolveRoute('./api/gallery-content.js'),
  '/api/homepage-content': resolveRoute('./api/homepage-content.js'),
  '/api/site-content': resolveRoute('./api/site-content.js'),
  '/api/page-content': resolveRoute('./api/page-content.js'),
  '/api/system-status': resolveRoute('./api/system-status.js'),
};

// Helper to handle API requests
async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const requestId = ++requestCounter;
  const startedAt = Date.now();

  const filePath = API_ROUTES[pathname];

  console.log(`[bridge:${requestId}] ${req.method} ${url.pathname}${url.search}`);
  pushBridgeLog({
    request_id: requestId,
    method: req.method,
    path: `${url.pathname}${url.search}`,
    phase: 'started',
  });

  if (filePath && fs.existsSync(filePath)) {
    try {
      const module = await import(filePath);
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
        console.log(`[bridge:${requestId}] completed ${result.status} in ${Date.now() - startedAt}ms`);
        pushBridgeLog({
          request_id: requestId,
          method: req.method,
          path: `${url.pathname}${url.search}`,
          phase: 'completed',
          status: result.status,
          duration_ms: Date.now() - startedAt,
        });
      } else {
        // handler already sent response via vercelRes (legacy path)
        if (!res.writableEnded) {
          res.statusCode = 204;
          res.end();
        }
        console.log(`[bridge:${requestId}] completed legacy response in ${Date.now() - startedAt}ms`);
        pushBridgeLog({
          request_id: requestId,
          method: req.method,
          path: `${url.pathname}${url.search}`,
          phase: 'completed',
          status: res.statusCode || 204,
          duration_ms: Date.now() - startedAt,
          legacy: true,
        });
      }
    } catch (err) {
      console.error(`[bridge:${requestId}] API Error:`, err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Unknown bridge error.' }));
      }
      console.error(`[bridge:${requestId}] failed after ${Date.now() - startedAt}ms`);
      pushBridgeLog({
        request_id: requestId,
        method: req.method,
        path: `${url.pathname}${url.search}`,
        phase: 'failed',
        status: 500,
        duration_ms: Date.now() - startedAt,
        error: err?.message || 'Unknown bridge error.',
      });
    }
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
    console.warn(`[bridge:${requestId}] route not found ${pathname}`);
    pushBridgeLog({
      request_id: requestId,
      method: req.method,
      path: `${url.pathname}${url.search}`,
      phase: 'failed',
      status: 404,
      duration_ms: Date.now() - startedAt,
      error: 'Route not found',
    });
  }
}

// Start Proxy Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Connection', 'close');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res);
  } else {
    const requestId = ++requestCounter;
    const startedAt = Date.now();
    console.log(`[bridge:${requestId}] ${req.method} ${pathname}`);
    pushBridgeLog({
      request_id: requestId,
      method: req.method,
      path: pathname,
      phase: 'started',
      static: true,
    });
    // Serve Static Files
    const filePath = resolveStaticPath(pathname);
    if (!filePath) {
      res.statusCode = 403;
      res.end('403: Forbidden');
      console.warn(`[bridge:${requestId}] static 403 ${pathname} in ${Date.now() - startedAt}ms`);
      pushBridgeLog({
        request_id: requestId,
        method: req.method,
        path: pathname,
        phase: 'failed',
        status: 403,
        duration_ms: Date.now() - startedAt,
        static: true,
        error: 'Static path outside root',
      });
      return;
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('404: Not Found');
        console.warn(`[bridge:${requestId}] static 404 ${filePath} in ${Date.now() - startedAt}ms`);
        pushBridgeLog({
          request_id: requestId,
          method: req.method,
          path: pathname,
          phase: 'failed',
          status: 404,
          duration_ms: Date.now() - startedAt,
          static: true,
          error: 'Static file not found',
        });
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
      console.log(`[bridge:${requestId}] static 200 ${filePath} in ${Date.now() - startedAt}ms`);
      pushBridgeLog({
        request_id: requestId,
        method: req.method,
        path: pathname,
        phase: 'completed',
        status: 200,
        duration_ms: Date.now() - startedAt,
        static: true,
      });
    });
  }
});

server.on('clientError', (error, socket) => {
  console.error('Bridge client error:', error);
  pushBridgeLog({
    request_id: ++requestCounter,
    method: 'CLIENT',
    path: 'socket',
    phase: 'failed',
    status: 400,
    error: error?.message || 'Client error',
  });
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', (error) => {
  console.error('Bridge server error:', error);
  pushBridgeLog({
    request_id: ++requestCounter,
    method: 'SERVER',
    path: 'server',
    phase: 'failed',
    status: 500,
    error: error?.message || 'Server error',
  });
});

server.keepAliveTimeout = 0;
server.headersTimeout = 15000;
server.requestTimeout = 15000;

process.on('unhandledRejection', (reason) => {
  console.error('Bridge unhandled rejection:', reason);
  pushBridgeLog({
    request_id: ++requestCounter,
    method: 'PROCESS',
    path: 'unhandledRejection',
    phase: 'failed',
    status: 500,
    error: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error) => {
  console.error('Bridge uncaught exception:', error);
  pushBridgeLog({
    request_id: ++requestCounter,
    method: 'PROCESS',
    path: 'uncaughtException',
    phase: 'failed',
    status: 500,
    error: error?.message || 'Uncaught exception',
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 DEOKSI ALL-IN-ONE SERVER active on http://localhost:${PORT}`);
  console.log(`Port ${PORT} serves both Website and Admin Panel!`);
});
