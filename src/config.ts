import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_SETTINGS_PATH, PROXY_BASE_URL } from './constants.js';

interface ClaudeSettings {
  theme: string;
  env: Record<string, string>;
}

/**
 * Writes ~/.claude/settings.json with the selected model.
 * All model slots (opus/sonnet/haiku/subagent) are set to the same model
 * so that Claude Code always uses the chosen provider model.
 */
export function writeSettings(modelId: string): void {
  const settings: ClaudeSettings = {
    theme: 'dark',
    env: {
      ANTHROPIC_AUTH_TOKEN: 'test',
      ANTHROPIC_BASE_URL: PROXY_BASE_URL,
      ANTHROPIC_MODEL: modelId,
      ANTHROPIC_DEFAULT_OPUS_MODEL: modelId,
      ANTHROPIC_DEFAULT_SONNET_MODEL: modelId,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: modelId,
      CLAUDE_CODE_SUBAGENT_MODEL: modelId,
      ENABLE_EXPERIMENTAL_MCP_CLI: 'true',
    },
  };

  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
}
