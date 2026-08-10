import pc from 'picocolors';

/**
 * Pixel-art block letter definitions for "omnicodex"
 * Each letter is a 5-row array of strings using block characters.
 * █ = filled block  ░ = dim block (for depth effect)
 */
const LETTERS: Record<string, string[]> = {
  o: [
    '░███░',
    '█░░░█',
    '█░░░█',
    '█░░░█',
    '░███░',
  ],
  m: [
    '█░░░█',
    '██░██',
    '█░█░█',
    '█░░░█',
    '█░░░█',
  ],
  n: [
    '█░░░█',
    '██░░█',
    '█░█░█',
    '█░░██',
    '█░░░█',
  ],
  i: [
    '░███░',
    '░░█░░',
    '░░█░░',
    '░░█░░',
    '░███░',
  ],
  c: [
    '░████',
    '█░░░░',
    '█░░░░',
    '█░░░░',
    '░████',
  ],
  d: [
    '████░',
    '█░░░█',
    '█░░░█',
    '█░░░█',
    '████░',
  ],
  e: [
    '█████',
    '█░░░░',
    '████░',
    '█░░░░',
    '█████',
  ],
  x: [
    '█░░░█',
    '░█░█░',
    '░░█░░',
    '░█░█░',
    '█░░░█',
  ],
};

const WORD = 'omnicodex';

/**
 * Renders a single row across all letters of the word.
 */
function renderRow(row: number): string {
  return WORD.split('')
    .map((ch) => {
      const letter = LETTERS[ch];
      if (!letter) return '     ';
      return letter[row];
    })
    .join(' ');
}

/**
 * Applies a gradient effect across the 5 rows:
 *   row 0 → dim white
 *   row 1 → bright white
 *   row 2 → bold white
 *   row 3 → bright white
 *   row 4 → dim white
 */
function colorRow(row: number, text: string): string {
  const colored = text
    .split('')
    .map((ch) => {
      if (ch === '█') {
        if (row === 2) return pc.bold(pc.white('█'));
        if (row === 1 || row === 3) return pc.bold(pc.cyan('█'));
        return pc.cyan('█');
      }
      if (ch === '░') return pc.blue('░');
      return ch;
    })
    .join('');
  return colored;
}

/**
 * Renders the full pixel-art "omnicodex" banner and prints it to stdout.
 */
export function printBanner(): void {
  const width = process.stdout.columns || 80;

  console.log('');

  for (let row = 0; row < 5; row++) {
    const raw = renderRow(row);
    const colored = colorRow(row, raw);
    const rawLen = raw.length;
    const padding = Math.max(0, Math.floor((width - rawLen) / 2));
    console.log(' '.repeat(padding) + colored);
  }

  const tagline = 'Claude Code launcher  ·  powered by Antigravity';
  const tagPadding = Math.max(0, Math.floor((width - tagline.length) / 2));
  console.log('');
  console.log(' '.repeat(tagPadding) + pc.cyan('Claude Code launcher') + pc.dim('  ·  ') + pc.magenta('powered by Antigravity'));
  console.log('');
}

/**
 * Returns a styled section header string for use in the CLI flow.
 */
export function sectionHeader(text: string): string {
  return pc.dim('  ─────  ') + pc.bold(pc.white(text)) + pc.dim('  ─────');
}
