import { describe, it, expect } from 'vitest';
import { formatModelName } from '../utils.js';

describe('formatModelName', () => {
  it('formats raw model IDs into human readable titles', () => {
    expect(formatModelName('claude-opus-4-6-thinking')).toBe('Claude Opus 4.6 Thinking');
    expect(formatModelName('gemini-3.6-flash-high')).toBe('Gemini 3.6 Flash High');
    expect(formatModelName('gpt-4o')).toBe('GPT 4o');
    expect(formatModelName('deepseek-coder')).toBe('DeepSeek Coder');
  });

  it('handles abbreviations and version segments properly', () => {
    expect(formatModelName('gpt-ai-model')).toBe('GPT AI Model');
    expect(formatModelName('model-1-2-3')).toBe('Model 1.2.3');
  });
});
