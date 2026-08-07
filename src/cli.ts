import { intro, outro, select, spinner, cancel, isCancel, log } from '@clack/prompts';
import pc from 'picocolors';
import { fetchModels, isProxyReachable, groupByProvider } from './models.js';
import { sortProviders } from './providers.js';
import { colorForProvider, dim } from './colors.js';
import { writeSettings } from './config.js';
import { startProxy, launchClaudeCode } from './launcher.js';
import { readLastModel, writeLastModel } from './utils.js';
import type { Model } from './types.js';

/**
 * Main CLI orchestration:
 *  1. Check proxy — start it if not running
 *  2. Fetch and group models
 *  3. Show interactive model picker (pre-selecting last used model)
 *  4. Write ~/.claude/settings.json
 *  5. Launch Claude Code
 */
export async function run(): Promise<void> {
  intro(pc.bold('  coderift  '));

  // ── 1. Proxy check ──────────────────────────────────────────────────────
  const proxyCheck = spinner();
  proxyCheck.start('Checking proxy');

  const reachable = await isProxyReachable();

  if (!reachable) {
    proxyCheck.stop('Proxy not running — starting it');

    const startSpinner = spinner();
    startSpinner.start('Starting Antigravity proxy (acc start)');

    try {
      await startProxy();
      startSpinner.stop('Proxy started');
    } catch (err) {
      startSpinner.stop('Failed to start proxy');
      cancel((err as Error).message);
      process.exit(1);
    }
  } else {
    proxyCheck.stop('Proxy is running');
  }

  // ── 2. Fetch models ──────────────────────────────────────────────────────
  const fetchSpinner = spinner();
  fetchSpinner.start('Fetching models');

  let models!: Model[];
  try {
    models = await fetchModels();
    fetchSpinner.stop(`${models.length} model${models.length !== 1 ? 's' : ''} available`);
  } catch (err) {
    fetchSpinner.stop('Failed to fetch models');
    cancel((err as Error).message);
    process.exit(1);
  }

  if (models.length === 0) {
    cancel('No models returned by the proxy.');
    process.exit(1);
  }

  // ── 3. Build picker options ──────────────────────────────────────────────
  const groups = groupByProvider(models);
  const sortedProviders = sortProviders(Object.keys(groups));

  /**
   * Build the options list with dim provider-name hints next to each model.
   * Models are grouped visually by sorting provider order.
   *
   * Display format:
   *   ❯  Claude Opus 4.6          Anthropic
   *      Claude Sonnet 4.6        Anthropic
   *      Gemini Flash High        Google
   */
  const options: Array<{ value: string; label: string; hint: string }> = [];
  for (const provider of sortedProviders) {
    for (const model of groups[provider]!) {
      options.push({
        value: model.id,
        label: colorForProvider(provider)(model.displayName),
        hint: dim(provider),
      });
    }
  }

  // Determine initial selection (Phase 2 — pre-select last used model)
  const lastModel = readLastModel();
  const initialValue =
    lastModel && options.some((o) => o.value === lastModel) ? lastModel : options[0]!.value;

  // ── 4. Show picker ───────────────────────────────────────────────────────
  const selected = await select({
    message: 'Choose a model',
    options,
    initialValue,
  });

  if (isCancel(selected)) {
    cancel('Cancelled');
    process.exit(0);
  }

  const modelId = selected as string;
  const chosenModel = models.find((m) => m.id === modelId)!;

  // ── 5. Persist selection (Phase 2) ───────────────────────────────────────
  writeLastModel(modelId);

  // ── 6. Write settings ────────────────────────────────────────────────────
  try {
    writeSettings(modelId);
  } catch (err) {
    log.warn(`Could not write settings: ${(err as Error).message}`);
  }

  outro(`Launching Claude Code with ${pc.bold(chosenModel.displayName)}`);

  // ── 7. Launch Claude Code ────────────────────────────────────────────────
  launchClaudeCode();
}
