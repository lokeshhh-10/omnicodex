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
  // If proxy is already active and reachable, no action needed
  if (await isProxyReachable()) return;

  const runAccCommand = (cmd: 'start' | 'restart'): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn('acc', [cmd], {
        stdio: 'ignore',
        detached: true,
      });

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

      proc.on('spawn', () => {
        proc.unref();
        resolve();
      });
    });
  };

  // 1. Attempt standard start
  await runAccCommand('start');

  // Poll for up to 5 seconds
  let deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await isProxyReachable()) return;
    await sleep(PROXY_POLL_INTERVAL_MS);
  }

  // 2. Fallback to `acc restart` in case acc hit a stale PID/state file
  await runAccCommand('restart');

  // Poll for remaining timeout (10 seconds)
  deadline = Date.now() + 10_000;
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
