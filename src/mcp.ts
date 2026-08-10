import fs from 'node:fs';
import path from 'node:path';
import { RUNTIME_STORE_PATH } from './constants.js';
import { writeSettings } from './config.js';
import { writeLastModel } from './utils.js';

interface RuntimeStore {
  port: number;
  pid: number;
  activeModel: string;
}

const ALLOWED_MODELS: Record<string, string> = {
  'gemini-3.6-flash-high': 'Gemini 3.6 Flash (High)',
  'gemini-3.6-flash-medium': 'Gemini 3.6 Flash (Medium)',
  'gemini-3.6-flash-low': 'Gemini 3.6 Flash (Low)',
  'gemini-3-flash-agent': 'Gemini 3.5 Flash (High)',
  'gemini-3.5-flash-low': 'Gemini 3.5 Flash (Medium)',
  'gemini-3.5-flash-extra-low': 'Gemini 3.5 Flash (Low)',
  'gemini-pro-agent': 'Gemini 3.1 Pro (High)',
  'gemini-3.1-pro-low': 'Gemini 3.1 Pro (Low)',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-opus-4-6-thinking': 'Claude Opus 4.6 Thinking',
};

function resolveModelId(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (ALLOWED_MODELS[q]) return q;

  // Aliases / Fuzzy matches
  if (q.includes('3.1 pro') || q.includes('gemini pro') || q === 'pro') return 'gemini-pro-agent';
  if (q.includes('opus')) return 'claude-opus-4-6-thinking';
  if (q.includes('sonnet')) return 'claude-sonnet-4-6-thinking';
  if (q.includes('flash high') || q === 'flash') return 'gemini-3.6-flash-high';
  if (q.includes('flash medium')) return 'gemini-3.6-flash-medium';
  if (q.includes('flash low')) return 'gemini-3.6-flash-low';
  if (q.includes('3.5 flash') || q.includes('flash agent')) return 'gemini-3-flash-agent';

  // Match key substring
  for (const id of Object.keys(ALLOWED_MODELS)) {
    if (id.includes(q) || ALLOWED_MODELS[id]!.toLowerCase().includes(q)) {
      return id;
    }
  }

  return null;
}

function readRuntimeStore(): RuntimeStore | null {
  try {
    const raw = fs.readFileSync(RUNTIME_STORE_PATH, 'utf8');
    return JSON.parse(raw) as RuntimeStore;
  } catch {
    return null;
  }
}

async function sendSetModel(port: number, modelId: string): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/_omnicodex/set-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sendJson(msg: unknown): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

// Process stdin stream line by line
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line.trim()) as {
        jsonrpc: string;
        id?: number | string;
        method: string;
        params?: any;
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleRequest(req);
    } catch {
      // Ignore invalid JSON lines
    }
  }
});

async function handleRequest(req: {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}): Promise<void> {
  const { id, method, params } = req;

  if (method === 'initialize') {
    sendJson({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'omnicodex-mcp', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    sendJson({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'switch_model',
            description:
              'ALWAYS call this tool when the user requests to change or switch the LLM model mid-session (e.g. "switch to gemini 3.1 pro", "use opus", "switch to flash medium"). This switches the underlying LLM model for the entire current context window. Available models: gemini-pro-agent (Gemini 3.1 Pro High), gemini-3.1-pro-low (Gemini 3.1 Pro Low), gemini-3.6-flash-high, gemini-3.6-flash-medium, gemini-3.6-flash-low, gemini-3-flash-agent (Gemini 3.5 Flash High), gemini-3.5-flash-low, gemini-3.5-flash-extra-low, claude-opus-4-6-thinking, claude-sonnet-4-6.',
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  description:
                    'Model ID or name to switch to (e.g., "gemini-pro-agent", "gemini 3.1 pro", "gemini 3.5 flash low", "opus", "sonnet", "flash")',
                },
              },
              required: ['model'],
            },
          },

          {
            name: 'get_current_model',
            description: 'Get the currently active model ID for the omnicodex session.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_available_models',
            description: 'List all available models that can be switched to mid-session.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      },
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    if (toolName === 'switch_model') {
      const rawQuery = String(args.model || '');
      const resolvedId = resolveModelId(rawQuery);

      if (!resolvedId) {
        sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Could not match model '${rawQuery}'. Available models: ${Object.keys(ALLOWED_MODELS).join(', ')}`,
              },
            ],
            isError: true,
          },
        });
        return;
      }

      const runtime = readRuntimeStore();
      if (!runtime) {
        sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: 'No active omnicodex session proxy found.',
              },
            ],
            isError: true,
          },
        });
        return;
      }

      const ok = await sendSetModel(runtime.port, resolvedId);
      if (ok) {
        writeLastModel(resolvedId);
        try {
          writeSettings(resolvedId, runtime.port);
        } catch {
          // Ignore settings update errors
        }
        sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Successfully switched active model to ${resolvedId} (${ALLOWED_MODELS[resolvedId]}). All subsequent prompts in this session will use this model.`,
              },
            ],
          },
        });
      } else {
        sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: 'Failed to communicate with omnicodex proxy server.',
              },
            ],
            isError: true,
          },
        });
      }
      return;
    }

    if (toolName === 'get_current_model') {
      const runtime = readRuntimeStore();
      sendJson({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Currently active model: ${runtime?.activeModel ?? 'Unknown'}`,
            },
          ],
        },
      });
      return;
    }

    if (toolName === 'list_available_models') {
      const formatted = Object.entries(ALLOWED_MODELS)
        .map(([id, name]) => `- ${id} (${name})`)
        .join('\n');
      sendJson({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Available Models:\n${formatted}`,
            },
          ],
        },
      });
      return;
    }

    sendJson({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Tool not found: ${toolName}` },
    });
    return;
  }

  // Fallback for unknown methods
  if (id !== undefined) {
    sendJson({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}
