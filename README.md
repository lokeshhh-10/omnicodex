# 🚀 OmniCodex

[![npm version](https://img.shields.io/npm/v/omnicodex.svg?color=cb3837)](https://www.npmjs.com/package/omnicodex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

A minimal, lightning-fast CLI launcher and MCP middleware for **[Claude Code](https://github.com/anthropics/claude-code)** with interactive model selection and dynamic mid-session model switching via an **[Antigravity](https://github.com/anthropics/antigravity)** proxy.

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
◆  Choose a starting model
│  ○ Claude Opus 4.6 (Thinking)        (Anthropic)
│  ○ Claude Sonnet 4.6 (Thinking)      (Anthropic)
│  ● Gemini 3.6 Flash (High)           (Google)
│  ○ Gemini 3.6 Flash (Medium)         (Google)
│  ○ Gemini 3.6 Flash (Low)            (Google)
│  ○ Gemini 3.1 Pro (High)             (Google)
│  ○ GPT-4o                            (OpenAI)
└
```

---

## 🔥 Key Features

- 🎯 **Interactive Model Selection**: Select from available Google, Anthropic, and OpenAI models with color-coded provider previews.
- ⚡ **Auto Proxy Initialization**: Automatically checks and starts the Antigravity proxy (`acc start`) if not running.
- 🤖 **Built-in MCP Server**: Auto-registers `omnicodex` Model Context Protocol (MCP) server into Claude Code settings with pre-approved permissions.
- 🔄 **Dynamic Mid-Session Switching**: Switch models mid-conversation **without losing context or restarting Claude Code** via CLI, natural language chat, or the `/model` command.
- 🛠️ **Middleware Routing Proxy**: Local proxy server dynamically swaps model endpoints on-the-fly and ensures seamless API compatibility.

---

## ⚡ Quick Start

Install globally via **npm**:

```bash
npm install -g omnicodex
```

Launch instantly using `omnicodex` or the short alias `omni`:

```bash
omnicodex
# or short alias:
omni
```

*(Or run instantly without global installation: `npx omnicodex`)*

---

## 📋 Requirements

| Requirement | Version | Purpose |
|---|---|---|
| 🟢 [Node.js](https://nodejs.org) | ≥ 18 | JavaScript runtime |
| 🤖 [Claude Code](https://github.com/anthropics/claude-code) | latest | CLI tool launched by `omnicodex` |
| ⚡ [Antigravity CLI](https://github.com/anthropics/antigravity) (`acc`) | latest | Local proxy providing LLM endpoints |

---

## 💻 Usage & Commands

### Interactive Launch & Quick Flags

```bash
omnicodex                 # Launch with interactive model picker
omni                      # Short alias
omnicodex -m <model-id>   # Direct launch (e.g. omnicodex -m gemini-pro-agent)
omnicodex -q              # Launch without displaying the ASCII banner
```

### Management Commands

```bash
omnicodex switch          # Interactive mid-session model switcher picker
omnicodex set <model-id>  # Switch active session model directly (e.g. omnicodex set opus)
omnicodex current         # Display active session model
omnicodex list            # List all available models & providers
omnicodex status          # Show upstream proxy & middleware status
omnicodex --help          # Show help and command summary
omnicodex --version       # Display version
```

---

## 🔄 Mid-Session Model Switching (Zero Context Loss)

Need to switch from Sonnet to **Gemini 3.1 Pro** or **Claude Opus** mid-session? You can change models instantly without losing conversation state:

### Option 1: 💬 Direct Natural Language in Claude Chat (MCP)
Thanks to the auto-configured MCP server, you can tell Claude Code directly:
- *"Switch model to Gemini 3.1 Pro"*
- *"Use Opus model for this task"*
- *"Switch model to Flash High"*
- *"What model am I currently using?"*

### Option 2: ⚡ Native `/model` Command
Inside Claude Code chat, type `/model`:
- **Opus** $\rightarrow$ maps to **Gemini 3.1 Pro** (`gemini-pro-agent`)
- **Sonnet** $\rightarrow$ maps to **Claude Sonnet 4.6** (`claude-sonnet-4-6`)
- **Haiku** $\rightarrow$ maps to **Gemini 3.6 Flash** (`gemini-3.6-flash-high`)

### Option 3: 🖥️ Second Terminal
Run from any terminal window:
```bash
omnicodex switch
# or set directly:
omnicodex set gemini-pro-agent
```

---

## ⚙️ How It Works Behind The Scenes

1. 🔄 **Proxy Check**: Verifies if the Antigravity proxy is active on port `8080` (starts `acc start` automatically if offline).
2. 📡 **Model Discovery**: Queries `http://localhost:8080/v1/models` for available provider models.
3. 🎯 **Interactive Selection**: Presents a terminal picker powered by `@clack/prompts`.
4. ⚙️ **MCP & Settings Injection**: Updates `~/.claude/settings.json` with middleware port, token variables, MCP server declaration, and pre-approved tool permissions.
5. 🔀 **Middleware Server**: Spawns a lightweight local HTTP middleware that dynamically rewrites model requests to the active LLM.
6. 🚀 **Launcher**: Executes Claude Code CLI seamlessly attached to your active terminal.

---

## ⌨️ Interactive Navigation

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate model options |
| `Enter` | Select model and launch |
| `Esc` / `Ctrl+C` | Exit picker |

---

## 🛠️ Development & Building

```bash
git clone https://github.com/lokeshhh-10/omnicodex.git
cd omnicodex

npm install          # Install dependencies
npm run build        # Build TypeScript output (dist/)
npm run dev          # Rebuild automatically on change
npm run test         # Run Vitest test suite
npm run lint         # Check formatting and linting
```

---

## ❓ Troubleshooting

- **`omnicodex: command not found`**  
  Ensure global npm binaries are in your system `PATH`:
  ```bash
  export PATH="$HOME/.local/share/npm/bin:$PATH"
  ```
- **`Proxy not running` / `acc` missing**  
  Verify Antigravity CLI is installed and executable via `acc --version`.
- **Permission Prompt for MCP tools in Claude Code**  
  OmniCodex automatically adds tool permissions to `~/.claude/settings.json`. If prompted, select "Always allow".

---

## 📄 License

[MIT](LICENSE)
