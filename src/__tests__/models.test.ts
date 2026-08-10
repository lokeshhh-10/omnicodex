import { describe, it, expect } from 'vitest';
import {
  resolveModelId,
  groupByProvider,
  sortAndDeduplicateModels,
  parseVersionNumbers,
  KNOWN_MODEL_NAMES,
} from '../models.js';
import type { Model } from '../types.js';

describe('parseVersionNumbers', () => {
  it('extracts version numbers correctly', () => {
    expect(parseVersionNumbers('Gemini 3.6 Flash')).toEqual([3, 6]);
    expect(parseVersionNumbers('Gemini 3.5 Flash (High)')).toEqual([3, 5]);
    expect(parseVersionNumbers('Gemini 3.1 Pro')).toEqual([3, 1]);
    expect(parseVersionNumbers('Gemini 2.5 Pro')).toEqual([2, 5]);
  });
});

describe('sortAndDeduplicateModels', () => {
  it('sorts models by version descending and quality tier, deduplicating duplicates', () => {
    const rawModels: Model[] = [
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', provider: 'Google' },
      { id: 'gemini-3.1-pro-low', displayName: 'Gemini 3.1 Pro (Low)', provider: 'Google' },
      { id: 'gemini-3.6-flash-low', displayName: 'Gemini 3.6 Flash (Low)', provider: 'Google' },
      { id: 'gemini-3.6-flash-high', displayName: 'Gemini 3.6 Flash (High)', provider: 'Google' },
      { id: 'gemini-3.6-flash-high', displayName: 'Gemini 3.6 Flash (High)', provider: 'Google' }, // Duplicate
      { id: 'gemini-3-flash-agent', displayName: 'Gemini 3.5 Flash (High)', provider: 'Google' },
    ];

    const sorted = sortAndDeduplicateModels(rawModels);
    expect(sorted.map((m) => m.id)).toEqual([
      'gemini-3.6-flash-high',
      'gemini-3.6-flash-low',
      'gemini-3-flash-agent',
      'gemini-3.1-pro-low',
      'gemini-2.5-pro',
    ]);
  });
});

describe('resolveModelId', () => {
  const sampleModels: Model[] = [
    { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', provider: 'Anthropic' },
    { id: 'claude-opus-4-6-thinking', displayName: 'Claude Opus 4.6 Thinking', provider: 'Anthropic' },
    { id: 'gemini-pro-agent', displayName: 'Gemini 3.1 Pro (High)', provider: 'Google' },
    { id: 'gemini-3.6-flash-high', displayName: 'Gemini 3.6 Flash (High)', provider: 'Google' },
    { id: 'gemini-3.6-flash-medium', displayName: 'Gemini 3.6 Flash (Medium)', provider: 'Google' },
    { id: 'gemini-3-flash-agent', displayName: 'Gemini 3.5 Flash (High)', provider: 'Google' },
    { id: 'gemini-3.7-ultra', displayName: 'Gemini 3.7 Ultra', provider: 'Google' },
  ];

  it('resolves exact model IDs dynamically', () => {
    for (const id of Object.keys(KNOWN_MODEL_NAMES)) {
      expect(resolveModelId(id, sampleModels)).toBe(id);
    }
  });

  it('resolves newly added models dynamically', () => {
    expect(resolveModelId('3.7', sampleModels)).toBe('gemini-3.7-ultra');
    expect(resolveModelId('ultra', sampleModels)).toBe('gemini-3.7-ultra');
  });

  it('resolves common aliases and fuzzy queries', () => {
    expect(resolveModelId('pro', sampleModels)).toBe('gemini-pro-agent');
    expect(resolveModelId('gemini 3.1 pro', sampleModels)).toBe('gemini-pro-agent');
    expect(resolveModelId('opus', sampleModels)).toBe('claude-opus-4-6-thinking');
    expect(resolveModelId('sonnet', sampleModels)).toBe('claude-sonnet-4-6');
    expect(resolveModelId('flash', sampleModels)).toBe('gemini-3.6-flash-high');
    expect(resolveModelId('flash medium', sampleModels)).toBe('gemini-3.6-flash-medium');
    expect(resolveModelId('3.5 flash', sampleModels)).toBe('gemini-3-flash-agent');
  });

  it('returns null for non-matching queries', () => {
    expect(resolveModelId('non-existent-model-xyz', sampleModels)).toBeNull();
  });
});

describe('groupByProvider', () => {
  it('groups models by provider', () => {
    const sampleModels: Model[] = [
      { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', provider: 'Anthropic' },
      { id: 'gemini-pro-agent', displayName: 'Gemini 3.1 Pro (High)', provider: 'Google' },
      { id: 'claude-opus-4-6-thinking', displayName: 'Claude Opus 4.6 Thinking', provider: 'Anthropic' },
    ];

    const grouped = groupByProvider(sampleModels);
    expect(Object.keys(grouped)).toEqual(['Anthropic', 'Google']);
    expect(grouped['Anthropic']).toHaveLength(2);
    expect(grouped['Google']).toHaveLength(1);
  });
});
