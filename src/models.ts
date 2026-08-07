import { MODELS_ENDPOINT } from './constants.js';
import { detectProvider } from './providers.js';
import { formatModelName } from './utils.js';
import type { Model, GroupedModels } from './types.js';

interface ModelsApiResponse {
  data: Array<{ id: string; description?: string }>;
}

/**
 * Model IDs to display in the picker.
 * Only these models will be shown — others returned by the proxy are hidden.
 */
const ALLOWED_MODEL_IDS = new Set([
  'gemini-3.6-flash-high',
  'gemini-3.6-flash-medium',
  'gemini-3.6-flash-low',
  'gemini-3-flash-agent',     // description: "Gemini 3.5 Flash (High)"
  'gemini-3.5-flash-low',     // description: "Gemini 3.5 Flash (Medium)"
  'gemini-3.5-flash-extra-low', // description: "Gemini 3.5 Flash (Low)"
  'gemini-pro-agent',         // description: "Gemini 3.1 Pro (High)"
  'gemini-3.1-pro-low',
  'claude-sonnet-4-6',
  'claude-opus-4-6-thinking',
]);

/**
 * Fetches the list of available models from the Antigravity proxy.
 * Throws if the proxy is unreachable or returns a non-OK response.
 * Only returns models present in ALLOWED_MODEL_IDS.
 */
export async function fetchModels(): Promise<Model[]> {
  const res = await fetch(MODELS_ENDPOINT, { signal: AbortSignal.timeout(5000) });

  if (!res.ok) {
    throw new Error(`Proxy returned ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ModelsApiResponse;

  return data.data
    .filter((m) => ALLOWED_MODEL_IDS.has(m.id))
    .map((m) => ({
      id: m.id,
      // Prefer the proxy's description; fall back to formatting the raw ID
      displayName: m.description?.trim() || formatModelName(m.id),
      provider: detectProvider(m.id),
    }));
}

/**
 * Checks if the proxy is reachable without throwing.
 * Returns true if reachable, false otherwise.
 */
export async function isProxyReachable(): Promise<boolean> {
  try {
    await fetchModels();
    return true;
  } catch {
    return false;
  }
}

/** Groups a flat list of models by provider name. */
export function groupByProvider(models: Model[]): GroupedModels {
  const groups: GroupedModels = {};
  for (const model of models) {
    if (!groups[model.provider]) groups[model.provider] = [];
    groups[model.provider]!.push(model);
  }
  return groups;
}
