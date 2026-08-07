import { run } from './cli.js';

const args = process.argv.slice(2);
const command = args[0];

// ── Help ──────────────────────────────────────────────────────────────────
if (command === '--help' || command === '-h') {
  console.log(`
liri — Claude Code launcher

Usage:
  liri              Launch Claude Code with interactive model selection
  liri code         Same as liri

Options:
  -h, --help        Show this help message
  -v, --version     Show version number
`);
  process.exit(0);
}

// ── Version ───────────────────────────────────────────────────────────────
if (command === '--version' || command === '-v') {
  // Read version from package.json at runtime
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pkg = require('../package.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(String(pkg.version));
  process.exit(0);
}

// ── Main commands ─────────────────────────────────────────────────────────
if (!command || command === 'code') {
  try {
    await run();
  } catch (err) {
    console.error('\nUnexpected error:', (err as Error).message);
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}\nRun 'liri --help' for usage.`);
  process.exit(1);
}
