import {
  run,
  switchModelInteractive,
  setModelDirect,
  showCurrentModel,
  listModels,
  showStatus,
} from './cli.js';

const args = process.argv.slice(2);

let modelArg: string | undefined;
let quiet = false;
const positional: string[] = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === '-h' || arg === '--help') {
    console.log(`
omnicodex — Claude Code launcher & model switcher

Usage:
  omnicodex [options]         Launch Claude Code (interactive picker)
  omni [options]              Short alias for omnicodex
  omnicodex switch            Switch model mid-session (interactive menu)
  omnicodex set <model-id>    Switch active model mid-session directly
  omnicodex current           Show currently active model in running session
  omnicodex list              List all available models and providers
  omnicodex status            Display proxy and active session status

Options:
  -m, --model <model-id>      Launch directly with specified model
  -q, --quiet                 Suppress ASCII banner output
  -h, --help                  Show this help message
  -v, --version               Show version number
`);
    process.exit(0);
  } else if (arg === '-v' || arg === '--version') {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    console.log(String(pkg.version));
    process.exit(0);
  } else if (arg === '-q' || arg === '--quiet') {
    quiet = true;
  } else if (arg === '-m' || arg === '--model') {
    modelArg = args[++i];
    if (!modelArg) {
      console.error('Error: --model flag requires a model ID argument.');
      process.exit(1);
    }
  } else if (arg.startsWith('--model=')) {
    modelArg = arg.slice('--model='.length);
  } else if (arg.startsWith('-m=')) {
    modelArg = arg.slice('-m='.length);
  } else {
    positional.push(arg);
  }
}

const command = positional[0];

// ── Command router ────────────────────────────────────────────────────────
try {
  if (!command || command === 'code') {
    await run({ model: modelArg, quiet });
  } else if (command === 'switch') {
    await switchModelInteractive();
  } else if (command === 'set') {
    const targetModel = positional[1] || modelArg;
    if (!targetModel) {
      console.error('Error: Please specify a model ID. Example: omnicodex set gemini-pro-agent');
      process.exit(1);
    }
    await setModelDirect(targetModel);
  } else if (command === 'current' || command === 'model') {
    await showCurrentModel();
  } else if (command === 'list' || command === 'models') {
    await listModels();
  } else if (command === 'status') {
    await showStatus();
  } else {
    console.error(`Unknown command: ${command}\nRun 'omnicodex --help' for usage.`);
    process.exit(1);
  }
} catch (err) {
  console.error('\nUnexpected error:', (err as Error).message);
  process.exit(1);
}
