import { run, switchModelInteractive, setModelDirect, showCurrentModel } from './cli.js';

const args = process.argv.slice(2);
const command = args[0];

// ── Help ──────────────────────────────────────────────────────────────────
if (command === '--help' || command === '-h') {
  console.log(`
omnicodex — Claude Code launcher & model switcher

Usage:
  omnicodex                   Launch Claude Code with interactive model selection
  omni                        Short alias for omnicodex
  omnicodex switch            Switch model mid-session (interactive menu)
  omnicodex set <model-id>    Switch active model mid-session directly
  omnicodex current           Show currently active model in running session

Options:
  -h, --help                  Show this help message
  -v, --version               Show version number
`);
  process.exit(0);
}

// ── Version ───────────────────────────────────────────────────────────────
if (command === '--version' || command === '-v') {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pkg = require('../package.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(String(pkg.version));
  process.exit(0);
}

// ── Command router ────────────────────────────────────────────────────────
try {
  if (!command || command === 'code') {
    await run();
  } else if (command === 'switch') {
    await switchModelInteractive();
  } else if (command === 'set') {
    const targetModel = args[1];
    if (!targetModel) {
      console.error('Error: Please specify a model ID. Example: omnicodex set gemini-pro-agent');
      process.exit(1);
    }
    await setModelDirect(targetModel);
  } else if (command === 'current' || command === 'model') {
    await showCurrentModel();
  } else {
    console.error(`Unknown command: ${command}\nRun 'omnicodex --help' for usage.`);
    process.exit(1);
  }
} catch (err) {
  console.error('\nUnexpected error:', (err as Error).message);
  process.exit(1);
}
