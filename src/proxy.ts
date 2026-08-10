import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { RUNTIME_STORE_PATH } from './constants.js';

export interface RuntimeStore {
  port: number;
  pid: number;
  activeModel: string;
}

let activeModel = 'claude-sonnet-4-6';
let isExplicitlySet = false;
let lastRawModelFromClaude: string | null = null;

export function getActiveModel(): string {
  return activeModel;
}

export function setActiveModel(modelId: string): void {
  activeModel = modelId;
  isExplicitlySet = true;
}

/** Reads runtime info (port & active model) of currently running proxy instance */
export function readRuntimeStore(): RuntimeStore | null {
  try {
    const raw = fs.readFileSync(RUNTIME_STORE_PATH, 'utf8');
    return JSON.parse(raw) as RuntimeStore;
  } catch {
    return null;
  }
}

/** Writes runtime info to disk */
export function writeRuntimeStore(port: number, modelId: string): void {
  try {
    const dir = path.dirname(RUNTIME_STORE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const store: RuntimeStore = {
      port,
      pid: process.pid,
      activeModel: modelId,
    };
    fs.writeFileSync(RUNTIME_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Non-fatal — silently ignore persistence failures
  }
}

/** Removes runtime store on process exit */
export function cleanupRuntimeStore(): void {
  try {
    if (fs.existsSync(RUNTIME_STORE_PATH)) {
      fs.unlinkSync(RUNTIME_STORE_PATH);
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Starts the local middleware proxy.
 * Intercepts requests to Anthropic endpoints and dynamically overrides the "model" field.
 */
export function startMiddlewareProxy(initialModel: string, upstreamPort = 8080): Promise<number> {
  activeModel = initialModel;
  isExplicitlySet = false;
  lastRawModelFromClaude = null;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // ── Internal Control Endpoints ──────────────────────────────────────────
      if (req.method === 'POST' && req.url === '/_omnicodex/set-model') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body) as { model?: string };
            if (data.model) {
              setActiveModel(data.model);
              const addr = server.address();
              const port = typeof addr === 'object' && addr ? addr.port : 8085;
              writeRuntimeStore(port, activeModel);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, model: activeModel }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing model field' }));
            }
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/_omnicodex/model') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ model: activeModel }));
        return;
      }

      // ── Forward Requests to Upstream Antigravity Proxy ─────────────────────
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        let bodyBuffer = Buffer.concat(chunks);

        // Intercept POST requests containing a JSON payload with a "model" key
        const contentType = req.headers['content-type'] || '';
        if (req.method === 'POST' && contentType.includes('application/json') && bodyBuffer.length > 0) {
          try {
            const json = JSON.parse(bodyBuffer.toString('utf8')) as { model?: string };
            if (json.model) {
              const incomingModel = json.model;

              // Check if user switched model inside Claude Code (e.g. via /model menu)
              if (lastRawModelFromClaude !== null && incomingModel !== lastRawModelFromClaude) {
                // User actively changed slot inside Claude Code's native UI
                activeModel = incomingModel;
                isExplicitlySet = false;
                lastRawModelFromClaude = incomingModel;
              } else if (isExplicitlySet) {
                // External CLI (omnicodex switch / set) takes precedence
                json.model = activeModel;
                bodyBuffer = Buffer.from(JSON.stringify(json), 'utf8');
              } else {
                // Synchronize activeModel with whatever model Claude Code sent
                activeModel = incomingModel;
                lastRawModelFromClaude = incomingModel;
              }

              const addr = server.address();
              const port = typeof addr === 'object' && addr ? addr.port : 8085;
              writeRuntimeStore(port, activeModel);
            }
          } catch {
            // If JSON parsing fails, forward original body
          }
        }

        const headers = { ...req.headers };
        headers['content-length'] = Buffer.byteLength(bodyBuffer).toString();
        headers['host'] = `127.0.0.1:${upstreamPort}`;

        const options: http.RequestOptions = {
          hostname: '127.0.0.1',
          port: upstreamPort,
          path: req.url,
          method: req.method,
          headers,
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Omnicodex Proxy Error', message: err.message }));
        });

        proxyReq.write(bodyBuffer);
        proxyReq.end();
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Listen on dynamic port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 8085;
      writeRuntimeStore(port, activeModel);

      const cleanup = () => cleanupRuntimeStore();
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      resolve(port);
    });
  });
}
