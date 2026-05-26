/**
 * Custom production server for the Landing Page Creator clone.
 *
 * Replaces `npx expo serve` so we can disable Node HTTP timeouts that were
 * killing long-running POST /api/generate requests at exactly 91 seconds. The
 * Ultimate tier (gpt-image-1 via fal.ai's queue API) can legitimately take
 * 60-90 seconds to return, which is right on top of `expo serve`'s default
 * `headersTimeout`/`requestTimeout`.
 *
 * Wiring matches what `npx expo serve` does internally
 * (node_modules/expo/.../@expo/cli/build/src/serve/serveAsync.js): connect()
 * middleware → CORS → static files from dist/client → API routes via
 * `expo-server/adapter/http`. Only difference: explicit `*Timeout = 0`.
 */
const path = require('path');
const http = require('http');
const connect = require('connect');
const send = require('send');
const { createRequestHandler } = require('expo-server/adapter/http');

const distDir = path.join(__dirname, 'dist');
const serverDir = path.join(distDir, 'server');
const clientDir = path.join(distDir, 'client');

const port = parseInt(process.env.PORT || '8080', 10);

const app = connect();
const serverHandler = createRequestHandler({ build: serverDir });

// DOM component CORS support (same headers `expo serve` sets)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, expo-platform',
  );
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  next();
});

// Static files (dist/client) for GET / HEAD only
app.use((req, res, next) => {
  if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return next();
  }
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    pathname = req.url;
  }
  if (!pathname) return next();

  const stream = send(req, pathname, { root: clientDir, extensions: ['html'] });
  let forwardError = false;
  stream.on('file', () => {
    forwardError = true;
  });
  stream.on('error', (err) => {
    if (forwardError || !(err.statusCode < 500)) {
      next(err);
      return;
    }
    next();
  });
  stream.pipe(res);
});

// Server-rendered HTML routes + API routes from dist/server
app.use(serverHandler);

const server = http.createServer(app);

// The whole reason this file exists: disable inbound HTTP timeouts so
// /api/generate calls that span 60-120 s aren't silently killed.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.timeout = 0;
server.keepAliveTimeout = 0;

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const shutdown = (sig) => () => {
  console.log(`Received ${sig}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
