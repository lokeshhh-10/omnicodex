# 🚀 OmniCodex

A minimal, lightning-fast CLI launcher for [Claude Code](https://github.com/anthropics/claude-code) with interactive model selection via an [Antigravity](https://github.com/anthropics/antigravity) proxy.

```text
 ░███░ █░░░█ █░░░█ ░███░ ░████ ░███░ ████░ █████ █░░░█
 █░░░█ ██░██ ██░░█ ░░█░░ █░░░░ █░░░█ █░░░█ █░░░░ ░█░█░
 █░░░█ █░█░█ █░█░█ ░░█░░ █░░░░ █░░░█ █░░░█ ████░ ░░█░░
 █░░░█ █░░░█ █░░██ ░░█░░ █░░░░ █░░░█ █░░░█ █░░░░ ░█░█░
 ░███░ █░░░█ █░░░█ ░███░ ░████ ░███░ ████░ █████ █░░░█

    Claude Code launcher  ·  powered by Antigravity

│
◇  Proxy is running
│
◇  10 models available
│
◆  Choose a model
│  ○ Claude Opus 4.6 (Thinking)        Anthropic
│  ○ Claude Sonnet 4.6 (Thinking)      Anthropic
│  ● Gemini 3.6 Flash (High)           Google
│  ○ Gemini 3.6 Flash (Medium)         Google
│  ○ Gemini 3.6 Flash (Low)            Google
│  ...
└
```

---

## ⚡ Quick Start

Install globally via **npm**:

```bash
npm install -g omnicodex
```

Then run anywhere:

```bash
omnicodex
# or use the short alias:
omni
```

*(Alternatively, run instantly without installing: `npx omnicodex`)*

---

## ⚡ How it works

1. 🔄 Checks if the Antigravity proxy is running — **starts it automatically** if not
2. 📡 Fetches available models from `http://localhost:8080/v1/models`
3. 🎯 Shows an interactive picker — arrow keys to navigate, Enter to select
4. ⚙️ Writes `~/.claude/settings.json` with the selected model
5. 🚀 Launches Claude Code immediately

---

## 📋 Requirements

Before installing `omnicodex`, make sure these are installed on your system:

| Requirement | Version | Purpose |
|---|---|---|
| 🟢 [Node.js](https://nodejs.org) | ≥ 18 | JavaScript runtime |
| 🤖 [Claude Code](https://github.com/anthropics/claude-code) | latest | The CLI tool `omnicodex` launches |
| ⚡ [Antigravity CLI](https://github.com/anthropics/antigravity) (`acc`) | latest | Proxy that serves available models |

---

## 📦 Detailed Installation & Setup

### 1️⃣ Install Prerequisites

Make sure **Claude Code** and **Antigravity CLI (`acc`)** are installed:

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Ensure Antigravity CLI is installed and available in PATH
acc --version
```

### 2️⃣ Install omnicodex

#### Option A: Via npm (Recommended)

```bash
npm install -g omnicodex
```

#### Option B: From Source (GitHub)

```bash
git clone https://github.com/lokeshhh-10/omnicodex.git
cd omnicodex
npm install
npm run build
npm install -g .
```

> 💡 **Note on PATH / Permission errors (`EACCES`):**
> ```bash
> mkdir -p ~/.local/share/npm
> npm config set prefix ~/.local/share/npm
> npm install -g omnicodex
> echo 'export PATH="$HOME/.local/share/npm/bin:$PATH"' >> ~/.zshrc  # or ~/.bashrc
> source ~/.zshrc  # or ~/.bashrc
> ```

---

## 💻 Usage

```bash
omnicodex                 # Launch with interactive model picker
omni                      # Same as omnicodex (short alias)
omnicodex -m <model-id>   # Launch directly with specified model (e.g. gemini-pro-agent, opus, flash)
omnicodex switch          # Switch active model mid-session (interactive picker)
omnicodex set <model-id>  # Switch active model mid-session directly (e.g. gemini-pro-agent)
omnicodex current         # View currently active model in your running session
omnicodex list            # List all available models and their providers
omnicodex status          # Show proxy reachability and active session details
omnicodex --help          # Show help
omnicodex --version       # Show version
```

### 🎛️ CLI Options

| Flag | Short | Description |
|---|---|---|
| `--model <id>` | `-m` | Direct model launch (bypasses interactive picker) |
| `--quiet` | `-q` | Suppress ASCII art banner |
| `--help` | `-h` | Display usage and help menu |
| `--version` | `-v` | Print omnicodex version number |

### 🔄 Mid-Session Model Switching

Want to switch from Sonnet to **Gemini 3.1 Pro** or **Opus** in the middle of a coding session without losing context?

You have **3 seamless options** (no context loss, no restarts):

1. **💬 Directly in Claude Chat (Built-in MCP Tool)**
   Simply tell Claude Code in the chat:
   - *"Switch model to Gemini 3.1 Pro"*
   - *"Use Opus model for the next prompt"*
   - *"Switch model to Flash High"*

2. **⚡ Native `/model` Command**
   Type `/model` inside Claude Code and choose:
   - **Opus** $\rightarrow$ maps to **Gemini 3.1 Pro** (`gemini-pro-agent`)
   - **Sonnet** $\rightarrow$ maps to **Claude Sonnet 4.6** (`claude-sonnet-4-6`)
   - **Haiku** $\rightarrow$ maps to **Gemini 3.6 Flash** (`gemini-3.6-flash-high`)

3. **🖥️ Second Terminal / Split Window**
   Run `omnicodex switch` (or `omnicodex set gemini-pro-agent`) from any terminal.



### ⌨️ Navigation

| Key | Action |
|---|---|
| `↑` / `↓` | Move between models |
| `Enter` | Select model and launch Claude Code |
| `Esc` / `Ctrl+C` | Exit without launching |

### ⚙️ What happens after selecting a model

- `~/.claude/settings.json` is updated with your chosen model.
- Claude Code launches immediately in the same terminal session.
- Your selection is remembered and automatically pre-selected on your next run.

---

## 🔄 Updating

Via npm:

```bash
npm install -g omnicodex@latest
```

Or from source:

```bash
cd omnicodex
git pull && npm install && npm run build && npm install -g .
```

---

## 🛠️ Development

```bash
npm install          # Install dependencies
npm run build        # Build dist/ from src/
npm run dev          # Watch mode (rebuilds on save)
npm run test         # Run Vitest unit test suite
npm run lint         # ESLint
npm run format       # Prettier
```

---

## ❓ Troubleshooting

### 🔍 `omnicodex: command not found`
Add your global npm bin path to your shell configuration (e.g. `~/.zshrc` or `~/.bashrc`), then open a new terminal window.

### ⚠️ `Proxy not running` / Proxy fails to start
Ensure `acc` is installed and in your `PATH` (`which acc`). You can also test starting it manually with `acc start`.

### ❌ `Claude Code is not installed`
Install it globally via `npm install -g @anthropic-ai/claude-code`.

---

## 📄 License

MIT
