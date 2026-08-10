import { describe, it, expect } from 'vitest';
import { detectProvider, sortProviders } from '../providers.js';

describe('detectProvider', () => {
  it('detects Anthropic models', () => {
    expect(detectProvider('claude-sonnet-4-6')).toBe('Anthropic');
    expect(detectProvider('claude-opus-4-6-thinking')).toBe('Anthropic');
  });

  it('detects Google models', () => {
    expect(detectProvider('gemini-3.6-flash-high')).toBe('Google');
    expect(detectProvider('gemini-pro-agent')).toBe('Google');
  });

  it('detects OpenAI models', () => {
    expect(detectProvider('gpt-4o')).toBe('OpenAI');
  });

  it('detects Qwen and DeepSeek models', () => {
    expect(detectProvider('qwen-max')).toBe('Qwen');
    expect(detectProvider('deepseek-r1')).toBe('DeepSeek');
  });

  it('dynamically formats provider from prefix or returns Unknown', () => {
    expect(detectProvider('customprovider-model-xyz')).toBe('Customprovider');
    expect(detectProvider('12345')).toBe('Unknown');
  });
});

describe('sortProviders', () => {
  it('sorts providers according to canonical PROVIDER_ORDER', () => {
    const input = ['Google', 'Unknown', 'Anthropic', 'OpenAI'];
    const sorted = sortProviders(input);
    expect(sorted).toEqual(['Anthropic', 'Google', 'OpenAI', 'Unknown']);
  });
});
