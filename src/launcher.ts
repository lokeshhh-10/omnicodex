import { spawn } from 'node:child_process';
import { isProxyReachable } from './models.js';

const PROXY_STARTUP_TIMEOUT_MS = 15_000;
const PROXY_POLL_INTERVAL_MS = 500;

/**
 * Attempts to start the Antigravity proxy via `acc start`.
 * After launching it, polls /v1/models until the proxy is reachable
 * or the timeout is exceeded.
 *
 * Throws if `acc` is not found or the proxy never becomes reachable.
 */
export async function startProxy(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('acc', ['start'], {
      stdio: 'pipe',
      detached: true,
    });

    proc.unref(); // Allow the parent process to continue without waiting

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'Antigravity CLI (acc) is not installed or not in PATH.\n' +
              'Install it and try again.',
          ),
        );
      } else {
        reject(new Error(`Failed to start proxy: ${err.message}`));
      }
    });
  }).catch((err) => {
    // Only reject on ENOENT — if the process spawned fine, continue polling
    if ((err as Error).message.includes('acc')) throw err;
  });

  // Poll until the proxy responds or timeout
  const deadline = Date.now() + PROXY_STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isProxyReachable()) return;
    await sleep(PROXY_POLL_INTERVAL_MS);
  }

  throw new Error('Proxy did not become reachable within 15 seconds.');
}

/**
 * Launches `claude` (Claude Code), inheriting stdio so it runs interactively.
 * Exits this process with the same exit code when Claude Code exits.
 */
export function launchClaudeCode(): void {
  const proc = spawn('claude', [], {
    stdio: 'inherit',
    detached: false,
  });

  proc.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error(
        '\nClaude Code is not installed.\n' +
          'Install it with: npm install -g @anthropic-ai/claude-code\n',
      );
    } else {
      console.error(`\nFailed to launch Claude Code: ${err.message}\n`);
    }
    process.exit(1);
  });

  proc.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
