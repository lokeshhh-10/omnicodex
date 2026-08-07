import { MODELS_ENDPOINT } from './constants.js';
import { detectProvider } from './providers.js';
import { formatModelName } from './utils.js';
import type { Model, GroupedModels } from './types.js';

interface ModelsApiResponse {
  data: Array<{ id: string }>;
}

/**
 * Fetches the list of available models from the Antigravity proxy.
 * Throws if the proxy is unreachable or returns a non-OK response.
 */
export async function fetchModels(): Promise<Model[]> {
  const res = await fetch(MODELS_ENDPOINT, { signal: AbortSignal.timeout(5000) });

  if (!res.ok) {
    throw new Error(`Proxy returned ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ModelsApiResponse;

  return data.data.map((m) => ({
    id: m.id,
    displayName: formatModelName(m.id),
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
