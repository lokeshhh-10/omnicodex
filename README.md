# liri-code

A minimal CLI launcher for [Claude Code](https://github.com/anthropics/claude-code) with interactive model selection via an [Antigravity](https://github.com/anthropics/antigravity) proxy.

## How it works

```
liri
```

1. Checks if the Antigravity proxy is running — starts it automatically if not
2. Fetches available models from `http://localhost:8080/v1/models`
3. Shows an interactive picker grouped by provider
4. Writes `~/.claude/settings.json` with the selected model
5. Launches Claude Code

## Install

```bash
npm install -g .
```

Then just run:

```bash
liri
# or
liri code
```

## Requirements

- Node.js ≥ 18
- [Claude Code](https://github.com/anthropics/claude-code) installed (`claude` in PATH)
- [Antigravity CLI](https://github.com/anthropics/antigravity) installed (`acc` in PATH)

## Development

```bash
npm install
npm run build      # Build to dist/
npm run dev        # Watch mode
npm run lint       # Lint
npm run format     # Format
```

## Commands

| Command           | Description                     |
|-------------------|---------------------------------|
| `liri`            | Launch with model selection     |
| `liri code`       | Same as `liri`                  |
| `liri --help`     | Show help                       |
| `liri --version`  | Show version                    |
