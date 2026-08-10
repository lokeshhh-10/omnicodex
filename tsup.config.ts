import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/mcp.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  minify: false,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
