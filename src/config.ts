import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLAUDE_SETTINGS_PATH,
  PROXY_BASE_URL,
  DEFAULT_OPUS_MODEL,
  DEFAULT_SONNET_MODEL,
} from './constants.js';

interface ClaudeSettings {
  theme?: string;
  env?: Record<string, string>;
  mcpServers?: Record<string, { command: string; args: string[] }>;
  [key: string]: any;
}

/**
 * Writes ~/.claude/settings.json and .mcp.json with the selected model, proxy URL, and MCP server config.
 * Sets ANTHROPIC_BASE_URL to point to the local middleware proxy if proxyPort is specified.
 */
export function writeSettings(modelId: string, proxyPort?: number): void {
  let existingSettings: ClaudeSettings = {};
  try {
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
      existingSettings = JSON.parse(raw);
    }
  } catch {
    existingSettings = {};
  }

  const baseUrl = proxyPort ? `http://localhost:${proxyPort}` : PROXY_BASE_URL;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mcpServerPath = path.join(__dirname, 'mcp.js');

  const env = {
    ...(existingSettings.env || {}),
    ANTHROPIC_AUTH_TOKEN: 'test',
    ANTHROPIC_BASE_URL: baseUrl,
    ANTHROPIC_MODEL: modelId,
    ANTHROPIC_DEFAULT_OPUS_MODEL: DEFAULT_OPUS_MODEL,
    ANTHROPIC_DEFAULT_SONNET_MODEL: DEFAULT_SONNET_MODEL,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: modelId,
    CLAUDE_CODE_SUBAGENT_MODEL: modelId,
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
    ENABLE_EXPERIMENTAL_MCP_CLI: 'true',
  };

  const mcpServers = {
    ...(existingSettings.mcpServers || {}),
    omnicodex: {
      command: 'node',
      args: [mcpServerPath],
    },
  };

  const existingPermissions = existingSettings.permissions || {};
  const existingAllow: string[] = Array.isArray(existingPermissions.allow) ? existingPermissions.allow : [];

  const omniPermissions = [
    'mcp__omnicodex__switch_model',
    'mcp__omnicodex__get_current_model',
    'mcp__omnicodex__list_available_models',
    'mcp__omnicodex__*',
  ];

  const allow = Array.from(new Set([...existingAllow, ...omniPermissions]));

  const settings: ClaudeSettings = {
    theme: 'dark',
    ...existingSettings,
    env,
    mcpServers,
    permissions: {
      ...existingPermissions,
      allow,
    },
  };

  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
}
