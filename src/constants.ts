import os from 'node:os';
import path from 'node:path';

export const PROXY_BASE_URL = 'http://localhost:8080';
export const MODELS_ENDPOINT = `${PROXY_BASE_URL}/v1/models`;

export const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
export const LAST_MODEL_PATH = path.join(os.homedir(), '.config', 'liri-code', 'last-model.json');

/** Ordered list of known providers — determines display order in the picker. */
export const PROVIDER_ORDER: string[] = [
  'Anthropic',
  'Google',
  'OpenAI',
  'Qwen',
  'DeepSeek',
];

/** Regex patterns used to detect a provider from a model ID. */
export const PROVIDER_PATTERNS: [provider: string, pattern: RegExp][] = [
  ['Anthropic', /^claude-/i],
  ['Google', /^gemini-/i],
  ['OpenAI', /^gpt-/i],
  ['Qwen', /^qwen-/i],
  ['DeepSeek', /^deepseek-/i],
];

/** Words that should always be uppercased when formatting model names. */
export const ABBREVIATIONS: Record<string, string> = {
  gpt: 'GPT',
  ai: 'AI',
};
