import { outro, select, spinner, cancel, isCancel, log } from '@clack/prompts';
import pc from 'picocolors';
import { fetchModels, isProxyReachable, groupByProvider, resolveModelId } from './models.js';
import { sortProviders } from './providers.js';
import { colorForProvider, dim } from './colors.js';
import { writeSettings } from './config.js';
import { startProxy, launchClaudeCode } from './launcher.js';
import { readLastModel, writeLastModel } from './utils.js';
import { printBanner } from './banner.js';
import { startMiddlewareProxy, readRuntimeStore } from './proxy.js';
import type { Model } from './types.js';

export interface RunOptions {
  model?: string;
  quiet?: boolean;
}

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
    try {
      writeSettings(modelId, runtime.port);
    } catch {
      // Non-fatal
    }
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
    try {
      writeSettings(modelId, runtime.port);
    } catch {
      // Non-fatal
    }
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

/** Handles `omnicodex list` command */
export async function listModels(): Promise<void> {
  const fetchSpinner = spinner();
  fetchSpinner.start('Fetching models');

  let models: Model[];
  try {
    models = await fetchModels();
    fetchSpinner.stop(`${models.length} model${models.length !== 1 ? 's' : ''} available`);
  } catch (err) {
    fetchSpinner.stop('Failed to fetch models');
    console.error(pc.red((err as Error).message));
    process.exit(1);
  }

  const groups = groupByProvider(models);
  const sortedProviders = sortProviders(Object.keys(groups));

  console.log('\n' + pc.bold('Available Models:'));
  for (const provider of sortedProviders) {
    console.log(`\n  ${pc.bold(dim(provider))}`);
    for (const model of groups[provider]!) {
      const color = colorForProvider(provider);
      console.log(`    • ${pc.bold(color(model.displayName))} ${dim(`(${model.id})`)}`);
    }
  }
  console.log('');
}

/** Handles `omnicodex status` command */
export async function showStatus(): Promise<void> {
  const runtime = readRuntimeStore();
  const reachable = await isProxyReachable();

  console.log('\n' + pc.bold('Omnicodex Session Status:'));
  console.log(`  Upstream Proxy:  ${reachable ? pc.green('● Reachable (acc start)') : pc.red('○ Offline')}`);

  if (runtime) {
    console.log(`  Active Session:  ${pc.green('● Running')}`);
    console.log(`  Proxy Port:      ${pc.cyan(runtime.port.toString())}`);
    console.log(`  Process PID:     ${pc.dim(runtime.pid.toString())}`);
    console.log(`  Active Model:    ${pc.bold(pc.cyan(runtime.activeModel))}`);
  } else {
    console.log(`  Active Session:  ${pc.yellow('○ No active session')}`);
  }
  console.log('');
}

/**
 * Main CLI orchestration:
 *  1. Check proxy — start it if not running
 *  2. Fetch and group models
 *  3. Select starting model (interactive picker or direct flag -m)
 *  4. Start middleware proxy
 *  5. Write ~/.claude/settings.json
 *  6. Launch Claude Code
 */
export async function run(options: RunOptions = {}): Promise<void> {
  if (!options.quiet && process.env.OMNICODEX_NO_BANNER !== '1') {
    printBanner();
  }

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

  // ── 3. Select starting model ──────────────────────────────────────────────
  let modelId: string;
  let chosenModel: Model;

  if (options.model) {
    const resolved = resolveModelId(options.model);
    const matched = resolved ? models.find((m) => m.id === resolved) : undefined;

    if (!matched) {
      console.error(pc.red(`\nError: Invalid model '${options.model}'.`));
      console.log(`Available models: ${models.map((m) => m.id).join(', ')}\n`);
      process.exit(1);
    }

    modelId = matched.id;
    chosenModel = matched;
  } else {
    const groups = groupByProvider(models);
    const sortedProviders = sortProviders(Object.keys(groups));

    const pickerOptions: Array<{ value: string; label: string; hint: string }> = [];
    for (const provider of sortedProviders) {
      for (const model of groups[provider]!) {
        pickerOptions.push({
          value: model.id,
          label: colorForProvider(provider)(model.displayName),
          hint: dim(provider),
        });
      }
    }

    // Determine initial selection
    const lastModel = readLastModel();
    const initialValue =
      lastModel && pickerOptions.some((o) => o.value === lastModel) ? lastModel : pickerOptions[0]!.value;

    const selected = await select({
      message: 'Choose a starting model',
      options: pickerOptions,
      initialValue,
    });

    if (isCancel(selected)) {
      cancel('Cancelled');
      process.exit(0);
    }

    modelId = selected as string;
    chosenModel = models.find((m) => m.id === modelId)!;
  }

  // ── 4. Persist selection ─────────────────────────────────────────────────
  writeLastModel(modelId);

  // ── 5. Start Middleware Proxy ───────────────────────────────────────────
  let proxyPort = 8085;
  try {
    proxyPort = await startMiddlewareProxy(modelId);
  } catch (err) {
    log.warn(`Could not start middleware proxy: ${(err as Error).message}`);
  }

  // ── 6. Write settings ────────────────────────────────────────────────────
  try {
    writeSettings(modelId, proxyPort);
  } catch (err) {
    log.warn(`Could not write settings: ${(err as Error).message}`);
  }

  outro(`Launching Claude Code with ${pc.bold(chosenModel.displayName)}`);

  // ── 7. Launch Claude Code ────────────────────────────────────────────────
  launchClaudeCode();
}
