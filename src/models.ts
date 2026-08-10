import fs from 'node:fs';
import path from 'node:path';
import { MODELS_ENDPOINT, MODELS_CACHE_PATH } from './constants.js';
import { detectProvider } from './providers.js';
import { formatModelName } from './utils.js';
import type { Model, GroupedModels } from './types.js';

interface ModelsApiResponse {
  data: Array<{ id: string; description?: string }>;
}

/**
 * Friendly name overrides for known models.
 * If proxy returns no description, these serve as friendly display names.
 */
export const KNOWN_MODEL_NAMES: Record<string, string> = {
  'gemini-3.6-flash-high': 'Gemini 3.6 Flash (High)',
  'gemini-3.6-flash-medium': 'Gemini 3.6 Flash (Medium)',
  'gemini-3.6-flash-low': 'Gemini 3.6 Flash (Low)',
  'gemini-3-flash-agent': 'Gemini 3.5 Flash (High)',
  'gemini-3.5-flash-low': 'Gemini 3.5 Flash (Medium)',
  'gemini-3.5-flash-extra-low': 'Gemini 3.5 Flash (Low)',
  'gemini-pro-agent': 'Gemini 3.1 Pro (High)',
  'gemini-3.1-pro-high': 'Gemini 3.1 Pro (High)',
  'gemini-3.1-pro-low': 'Gemini 3.1 Pro (Low)',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-opus-4-6-thinking': 'Claude Opus 4.6 Thinking',
};

/**
 * When multiple model IDs share the same display name, prefer these IDs.
 * Listed IDs are kept; others with the same display name are dropped.
 */
const PREFERRED_MODEL_IDS = new Set(['gemini-pro-agent']);

/** Extracts numeric version components from a string (e.g. "Gemini 3.6 Flash" -> [3, 6]) */
export function parseVersionNumbers(text: string): number[] {
  const match = text.match(/\b(\d+(?:\.\d+)*)\b/);
  if (!match) return [0];
  return match[1]!.split('.').map((n) => parseFloat(n) || 0);
}

/** Assigns a weight priority based on quality tier keywords */
export function getTierWeight(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes('high') || lower.includes('pro') || lower.includes('agent') || lower.includes('thinking')) {
    return 4;
  }
  if (lower.includes('medium')) {
    return 3;
  }
  if (lower.includes('low') || lower.includes('lite')) {
    return 2;
  }
  if (lower.includes('tiered')) {
    return 1;
  }
  return 0;
}

/**
 * Compares two models:
 * 1. Version descending (newest release first, e.g. 3.6 > 3.5 > 3.1 > 2.5)
 * 2. Quality tier descending (High/Pro > Medium > Low/Lite)
 * 3. Alphabetical on displayName
 */
export function compareModels(a: Model, b: Model): number {
  const vA = parseVersionNumbers(a.displayName);
  const vB = parseVersionNumbers(b.displayName);

  const len = Math.max(vA.length, vB.length);
  for (let i = 0; i < len; i++) {
    const numA = vA[i] ?? 0;
    const numB = vB[i] ?? 0;
    if (numA !== numB) {
      return numB - numA;
    }
  }

  const tA = Math.max(getTierWeight(a.displayName), getTierWeight(a.id));
  const tB = Math.max(getTierWeight(b.displayName), getTierWeight(b.id));
  if (tA !== tB) {
    return tB - tA;
  }

  return a.displayName.localeCompare(b.displayName);
}

/** Deduplicates models by id and display name, then sorts by version descending */
export function sortAndDeduplicateModels(models: Model[]): Model[] {
  // Sort preferred IDs first so they win display-name deduplication
  const prioritized = [...models].sort((a, b) => {
    const aP = PREFERRED_MODEL_IDS.has(a.id) ? 0 : 1;
    const bP = PREFERRED_MODEL_IDS.has(b.id) ? 0 : 1;
    return aP - bP;
  });

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const unique: Model[] = [];
  for (const m of prioritized) {
    if (!seenIds.has(m.id) && !seenNames.has(m.displayName)) {
      seenIds.add(m.id);
      seenNames.add(m.displayName);
      unique.push(m);
    }
  }

  return unique.sort(compareModels);
}

/** Reads cached model list from disk */
export function readCachedModels(): Model[] | null {
  try {
    const raw = fs.readFileSync(MODELS_CACHE_PATH, 'utf8');
    return JSON.parse(raw) as Model[];
  } catch {
    return null;
  }
}

/** Writes model list to disk cache */
export function writeCachedModels(models: Model[]): void {
  try {
    const dir = path.dirname(MODELS_CACHE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MODELS_CACHE_PATH, JSON.stringify(models, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }
}

/**
 * Resolves a raw string or alias into a valid model ID dynamically.
 */
export function resolveModelId(query: string, availableModels?: Model[]): string | null {
  const q = query.trim().toLowerCase();
  const models = availableModels ?? readCachedModels() ?? [];

  // 1. Exact match on ID
  const exactIdMatch = models.find((m) => m.id.toLowerCase() === q);
  if (exactIdMatch) return exactIdMatch.id;

  // 2. Exact match on displayName
  const exactNameMatch = models.find((m) => m.displayName.toLowerCase() === q);
  if (exactNameMatch) return exactNameMatch.id;

  // 3. Known Aliases / Shortcuts
  if (q.includes('3.1 pro') || q.includes('gemini pro') || q === 'pro') {
    const found = models.find((m) => m.id === 'gemini-pro-agent' || m.id.includes('pro'));
    if (found) return found.id;
  }
  if (q.includes('opus')) {
    const found = models.find((m) => m.id.includes('opus'));
    if (found) return found.id;
  }
  if (q.includes('sonnet')) {
    const found = models.find((m) => m.id.includes('sonnet'));
    if (found) return found.id;
  }
  if (q.includes('flash high') || q === 'flash') {
    const found = models.find((m) => m.id.includes('flash-high') || m.id.includes('flash'));
    if (found) return found.id;
  }
  if (q.includes('flash medium')) {
    const found = models.find((m) => m.id.includes('flash-medium'));
    if (found) return found.id;
  }
  if (q.includes('3.5 flash') || q.includes('flash agent')) {
    const found = models.find((m) => m.id.includes('flash-agent') || m.id.includes('3.5-flash'));
    if (found) return found.id;
  }

  // 4. Substring match on ID or displayName
  const substringMatch = models.find(
    (m) => m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q),
  );
  if (substringMatch) return substringMatch.id;

  // Fallback match against known model names map keys
  if (KNOWN_MODEL_NAMES[q]) return q;

  return null;
}

/**
 * Fetches the list of available models dynamically from the Antigravity proxy.
 * Accepts any model returned by the proxy, deduplicates, and sorts by version descending.
 */
export async function fetchModels(): Promise<Model[]> {
  try {
    const res = await fetch(MODELS_ENDPOINT, { signal: AbortSignal.timeout(5000) });

    if (res.ok) {
      const data = (await res.json()) as ModelsApiResponse;
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const models: Model[] = data.data.map((m) => ({
          id: m.id,
          displayName: m.description?.trim() || KNOWN_MODEL_NAMES[m.id] || formatModelName(m.id),
          provider: detectProvider(m.id),
        }));

        const sortedUnique = sortAndDeduplicateModels(models);
        writeCachedModels(sortedUnique);
        return sortedUnique;
      }
    }
  } catch (err) {
    const cached = readCachedModels();
    if (cached && cached.length > 0) {
      return sortAndDeduplicateModels(cached);
    }
    throw err;
  }

  const cached = readCachedModels();
  if (cached && cached.length > 0) return sortAndDeduplicateModels(cached);

  throw new Error('No models returned by proxy.');
}

/**
 * Checks if the proxy is reachable without throwing.
 * Returns true if reachable, false otherwise.
 */
export async function isProxyReachable(): Promise<boolean> {
  try {
    const res = await fetch(MODELS_ENDPOINT, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Groups a flat list of models by provider name and sorts each group by version descending. */
export function groupByProvider(models: Model[]): GroupedModels {
  const sortedUnique = sortAndDeduplicateModels(models);
  const groups: GroupedModels = {};
  for (const model of sortedUnique) {
    if (!groups[model.provider]) groups[model.provider] = [];
    groups[model.provider]!.push(model);
  }
  return groups;
}
