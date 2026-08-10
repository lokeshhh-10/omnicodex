import { PROVIDER_PATTERNS, PROVIDER_ORDER } from './constants.js';

/**
 * Detects the provider for a given model ID using prefix patterns and smart fallback.
 */
export function detectProvider(modelId: string): string {
  for (const [provider, pattern] of PROVIDER_PATTERNS) {
    if (pattern.test(modelId)) return provider;
  }

  // Smart fallback: use the first segment of the model ID if hyphenated
  const firstSegment = modelId.split('-')[0];
  if (firstSegment && firstSegment.length > 1 && !/^\d+$/.test(firstSegment)) {
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
  }

  return 'Unknown';
}

/**
 * Sorts provider names using the canonical PROVIDER_ORDER list.
 * Unknown / dynamic providers are sorted alphabetically after the known ones.
 */
export function sortProviders(providers: string[]): string[] {
  return [...providers].sort((a, b) => {
    const ai = PROVIDER_ORDER.indexOf(a);
    const bi = PROVIDER_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
