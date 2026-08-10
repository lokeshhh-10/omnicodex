import fs from 'node:fs';
import { RUNTIME_STORE_PATH } from './constants.js';
import { writeSettings } from './config.js';
import { writeLastModel } from './utils.js';
import { fetchModels, readCachedModels, resolveModelId } from './models.js';
import type { Model } from './types.js';

interface RuntimeStore {
  port: number;
  pid: number;
  activeModel: string;
}

function readRuntimeStore(): RuntimeStore | null {
  try {
    const raw = fs.readFileSync(RUNTIME_STORE_PATH, 'utf8');
    return JSON.parse(raw) as RuntimeStore;
  } catch {
    return null;
  }
}

async function getAvailableModels(): Promise<Model[]> {
  try {
    return await fetchModels();
  } catch {
    return readCachedModels() ?? [];
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
      void handleRequest(req);
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
        serverInfo: { name: 'omnicodex-mcp', version: '1.1.0' },
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
              'ALWAYS call this tool when the user requests to change or switch the LLM model mid-session (e.g. "switch to gemini 3.1 pro", "use opus", "switch to flash medium"). This switches the underlying LLM model for the entire current context window.',
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  description:
                    'Model ID, name, or alias to switch to (e.g., "gemini-pro-agent", "gemini 3.1 pro", "opus", "sonnet", "flash")',
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
            description: 'List all available models dynamically fetched from the Antigravity proxy.',
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
      const models = await getAvailableModels();
      const resolvedId = resolveModelId(rawQuery, models);

      if (!resolvedId) {
        const availableIds = models.map((m) => m.id).join(', ');
        sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Could not match model '${rawQuery}'. Available models: ${availableIds || 'None available'}`,
              },
            ],
            isError: true,
          },
        });
        return;
      }

      const matchedModel = models.find((m) => m.id === resolvedId);
      const displayName = matchedModel ? matchedModel.displayName : resolvedId;

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
                text: `Successfully switched active model to ${resolvedId} (${displayName}). All subsequent prompts in this session will use this model.`,
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
      const models = await getAvailableModels();
      const formatted = models.length > 0
        ? models.map((m) => `- ${m.id} (${m.displayName}) [${m.provider}]`).join('\n')
        : 'No models currently available from Antigravity proxy.';

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
