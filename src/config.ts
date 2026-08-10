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
  theme: string;
  env: Record<string, string>;
  mcpServers?: Record<string, { command: string; args: string[] }>;
}

/**
 * Writes ~/.claude/settings.json and .mcp.json with the selected model, proxy URL, and MCP server config.
 * Sets ANTHROPIC_BASE_URL to point to the local middleware proxy if proxyPort is specified.
 */
export function writeSettings(modelId: string, proxyPort?: number): void {
  const baseUrl = proxyPort ? `http://localhost:${proxyPort}` : PROXY_BASE_URL;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mcpServerPath = path.join(__dirname, 'mcp.js');

  const settings: ClaudeSettings = {
    theme: 'dark',
    env: {
      ANTHROPIC_AUTH_TOKEN: 'test',
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_MODEL: modelId,
      ANTHROPIC_DEFAULT_OPUS_MODEL: DEFAULT_OPUS_MODEL,
      ANTHROPIC_DEFAULT_SONNET_MODEL: DEFAULT_SONNET_MODEL,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: modelId,
      CLAUDE_CODE_SUBAGENT_MODEL: modelId,
      ENABLE_EXPERIMENTAL_MCP_CLI: 'true',
    },
    mcpServers: {
      omnicodex: {
        command: 'node',
        args: [mcpServerPath],
      },
    },
  };

  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');

  // Also write .mcp.json in current working directory so Claude Code registers the omnicodex MCP server
  try {
    const localMcpPath = path.join(process.cwd(), '.mcp.json');
    let localMcp: { mcpServers?: Record<string, { command: string; args: string[] }> } = {};
    if (fs.existsSync(localMcpPath)) {
      try {
        localMcp = JSON.parse(fs.readFileSync(localMcpPath, 'utf8'));
      } catch {
        localMcp = {};
      }
    }
    if (!localMcp.mcpServers) localMcp.mcpServers = {};
    localMcp.mcpServers.omnicodex = {
      command: 'node',
      args: [mcpServerPath],
    };
    fs.writeFileSync(localMcpPath, JSON.stringify(localMcp, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }
}
