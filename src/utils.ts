import fs from 'node:fs';
import path from 'node:path';
import { ABBREVIATIONS } from './constants.js';
import { LAST_MODEL_PATH } from './constants.js';
import type { LastModelStore } from './types.js';

/**
 * Converts a raw model ID into a human-friendly display name.
 *
 * Rules:
 *  - Consecutive pure-number dash-separated segments are joined with dots  → version numbers
 *  - Known abbreviations (e.g. "gpt") are uppercased
 *  - Everything else gets title-cased
 *
 * Examples:
 *   claude-opus-4-6-thinking  →  Claude Opus 4.6 Thinking
 *   gemini-3.6-flash-high     →  Gemini 3.6 Flash High
 *   gpt-4o                    →  GPT-4o
 *   deepseek-coder            →  DeepSeek Coder
 */
export function formatModelName(id: string): string {
  const parts = id.split('-');
  const result: string[] = [];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i]!;
    const lower = part.toLowerCase();

    if (ABBREVIATIONS[lower]) {
      // Known abbreviation — use the canonical form
      result.push(ABBREVIATIONS[lower]!);
    } else if (/^\d+$/.test(part)) {
      // Pure-number segment — look ahead for more consecutive numbers to form a version
      let version = part;
      while (i + 1 < parts.length && /^\d+$/.test(parts[i + 1]!)) {
        i++;
        version += '.' + parts[i];
      }
      result.push(version);
    } else {
      // Title-case the segment
      result.push(part.charAt(0).toUpperCase() + part.slice(1));
    }

    i++;
  }

  return result.join(' ');
}

// ---------------------------------------------------------------------------
// Last-model persistence (Phase 2)
// ---------------------------------------------------------------------------

/** Reads the last used model ID from disk, or null if none exists. */
export function readLastModel(): string | null {
  try {
    const raw = fs.readFileSync(LAST_MODEL_PATH, 'utf8');
    const store = JSON.parse(raw) as LastModelStore;
    return store.lastModel ?? null;
  } catch {
    return null;
  }
}

/** Persists the selected model ID to disk for next-run pre-selection. */
export function writeLastModel(modelId: string): void {
  try {
    const dir = path.dirname(LAST_MODEL_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const store: LastModelStore = { lastModel: modelId };
    fs.writeFileSync(LAST_MODEL_PATH, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal — silently ignore persistence failures
  }
}
