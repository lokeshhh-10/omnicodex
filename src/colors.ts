import pc from 'picocolors';
import type { ColorFn } from './types.js';

/**
 * Per-provider color functions.
 * Only model text is colored per the UI guidelines.
 */
const providerColors: Record<string, ColorFn> = {
  Anthropic: (t) => pc.yellow(t),   // warm orange (closest available in picocolors)
  Google: (t) => pc.blue(t),
  OpenAI: (t) => pc.green(t),
  Qwen: (t) => pc.magenta(t),       // purple
  DeepSeek: (t) => pc.cyan(t),
  Unknown: (t) => pc.white(t),
};

/** Returns the color function for a given provider name. */
export function colorForProvider(provider: string): ColorFn {
  return providerColors[provider] ?? providerColors['Unknown']!;
}

/** Dim gray — used for provider headings. */
export const dim = pc.dim;

/** Bold white — used for the intro title. */
export const bold = pc.bold;
