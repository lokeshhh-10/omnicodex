import { outro, select, spinner, cancel, isCancel, log } from '@clack/prompts';
import pc from 'picocolors';
import { fetchModels, isProxyReachable, groupByProvider } from './models.js';
import { sortProviders } from './providers.js';
import { colorForProvider, dim } from './colors.js';
import { writeSettings } from './config.js';
import { startProxy, launchClaudeCode } from './launcher.js';
import { readLastModel, writeLastModel } from './utils.js';
import { printBanner } from './banner.js';
import { startMiddlewareProxy, readRuntimeStore } from './proxy.js';
import type { Model } from './types.js';

/** Helper to change model on running proxy */
async function sendSetModel(port: number, modelId: string): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/_omnicodex/set-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Handles `omnicodex switch` command */
export async function switchModelInteractive(): Promise<void> {
  const runtime = readRuntimeStore();
  if (!runtime) {
    console.error(pc.red('No active omnicodex session found. Start omnicodex first.'));
    process.exit(1);
  }

  const fetchSpinner = spinner();
  fetchSpinner.start('Fetching models');

  let models: Model[];
  try {
    models = await fetchModels();
    fetchSpinner.stop(`${models.length} model${models.length !== 1 ? 's' : ''} available`);
  } catch (err) {
    fetchSpinner.stop('Failed to fetch models');
    cancel((err as Error).message);
    process.exit(1);
  }

  const groups = groupByProvider(models);
  const sortedProviders = sortProviders(Object.keys(groups));

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

  const selected = await select({
    message: 'Switch model mid-session',
    options,
    initialValue: runtime.activeModel,
  });

  if (isCancel(selected)) {
    cancel('Cancelled');
    process.exit(0);
  }

  const modelId = selected as string;
  const chosenModel = models.find((m) => m.id === modelId)!;

  const ok = await sendSetModel(runtime.port, modelId);
  if (ok) {
    writeLastModel(modelId);
    outro(`Switched active session model to ${pc.bold(chosenModel.displayName)}`);
  } else {
    cancel('Failed to communicate with active omnicodex session.');
    process.exit(1);
  }
}

/** Handles `omnicodex set <model-id>` command */
export async function setModelDirect(modelId: string): Promise<void> {
  const runtime = readRuntimeStore();
  if (!runtime) {
    console.error(pc.red('No active omnicodex session found. Start omnicodex first.'));
    process.exit(1);
  }

  const ok = await sendSetModel(runtime.port, modelId);
  if (ok) {
    writeLastModel(modelId);
    console.log(pc.green(`✓ Switched active session model to ${pc.bold(modelId)}`));
  } else {
    console.error(pc.red('Failed to communicate with active omnicodex session.'));
    process.exit(1);
  }
}

/** Handles `omnicodex current` command */
export async function showCurrentModel(): Promise<void> {
  const runtime = readRuntimeStore();
  if (!runtime) {
    console.log(pc.yellow('No active omnicodex session running.'));
    return;
  }
  try {
    const res = await fetch(`http://127.0.0.1:${runtime.port}/_omnicodex/model`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { model: string };
      console.log(`Current session model: ${pc.bold(pc.cyan(data.model))}`);
    } else {
      console.log(`Current session model (from cache): ${pc.bold(pc.cyan(runtime.activeModel))}`);
    }
  } catch {
    console.log(`Current session model (from cache): ${pc.bold(pc.cyan(runtime.activeModel))}`);
  }
}

/**
 * Main CLI orchestration:
 *  1. Check proxy — start it if not running
 *  2. Fetch and group models
 *  3. Show interactive model picker (pre-selecting last used model)
 *  4. Start middleware proxy
 *  5. Write ~/.claude/settings.json
 *  6. Launch Claude Code
 */
export async function run(): Promise<void> {
  printBanner();

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

  // Determine initial selection
  const lastModel = readLastModel();
  const initialValue =
    lastModel && options.some((o) => o.value === lastModel) ? lastModel : options[0]!.value;

  // ── 4. Show picker ───────────────────────────────────────────────────────
  const selected = await select({
    message: 'Choose a starting model',
    options,
    initialValue,
  });

  if (isCancel(selected)) {
    cancel('Cancelled');
    process.exit(0);
  }

  const modelId = selected as string;
  const chosenModel = models.find((m) => m.id === modelId)!;

  // ── 5. Persist selection ─────────────────────────────────────────────────
  writeLastModel(modelId);

  // ── 6. Start Middleware Proxy ───────────────────────────────────────────
  let proxyPort = 8085;
  try {
    proxyPort = await startMiddlewareProxy(modelId);
  } catch (err) {
    log.warn(`Could not start middleware proxy: ${(err as Error).message}`);
  }

  // ── 7. Write settings ────────────────────────────────────────────────────
  try {
    writeSettings(modelId, proxyPort);
  } catch (err) {
    log.warn(`Could not write settings: ${(err as Error).message}`);
  }

  outro(`Launching Claude Code with ${pc.bold(chosenModel.displayName)}`);

  // ── 8. Launch Claude Code ────────────────────────────────────────────────
  launchClaudeCode();
}
