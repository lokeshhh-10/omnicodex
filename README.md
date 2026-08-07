# 🚀 liri-code

A minimal, lightning-fast CLI launcher for [Claude Code](https://github.com/anthropics/claude-code) with interactive model selection via an [Antigravity](https://github.com/anthropics/antigravity) proxy.

```text
┌    liri  
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

## ⚡ How it works

1. 🔄 Checks if the Antigravity proxy is running — **starts it automatically** if not
2. 📡 Fetches available models from `http://localhost:8080/v1/models`
3. 🎯 Shows an interactive picker — arrow keys to navigate, Enter to select
4. ⚙️ Writes `~/.claude/settings.json` with the selected model
5. 🚀 Launches Claude Code immediately

---

## 📋 Requirements

Before installing `liri`, make sure these are installed on your system:

| Requirement | Version | Purpose |
|---|---|---|
| 🟢 [Node.js](https://nodejs.org) | ≥ 18 | JavaScript runtime |
| 🤖 [Claude Code](https://github.com/anthropics/claude-code) | latest | The CLI tool `liri` launches |
| ⚡ [Antigravity CLI](https://github.com/anthropics/antigravity) (`acc`) | latest | Proxy that serves available models |

---

## 📦 Installation

### 🍎 / 🐧 macOS & Linux

#### Step 1 — Install Node.js
Using [nvm](https://github.com/nvm-sh/nvm) (recommended):

```bash
# Install nvm & Node.js 22 (LTS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc   # or ~/.bashrc / ~/.config/fish/config.fish
nvm install 22 && nvm use 22 && nvm alias default 22
```

Verify: `node -v` && `npm -v`

#### Step 2 — Install Prerequisites
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Install Antigravity CLI (acc) — follow your platform guide, then verify:
acc --version
```

#### Step 3 — Install liri
```bash
git clone https://github.com/lokeshhh-10/liri-code.git
cd liri-code
npm install
npm run build
npm install -g .
```

> 💡 **Note on PATH / Permission errors:** If you encounter `EACCES` or `command not found`:
> ```bash
> mkdir -p ~/.local/share/npm
> npm config set prefix ~/.local/share/npm
> npm install -g .
> echo 'export PATH="$HOME/.local/share/npm/bin:$PATH"' >> ~/.zshrc  # or ~/.bashrc
> source ~/.zshrc  # or ~/.bashrc
> ```

#### Step 4 — Run
```bash
liri
```

---

### 🪟 Windows

#### Step 1 — Install Node.js
Download **Node.js 22 LTS** from [nodejs.org](https://nodejs.org) or use [nvm-windows](https://github.com/coreybutler/nvm-windows):

```powershell
nvm install 22
nvm use 22
```

#### Step 2 — Install Prerequisites
```powershell
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Follow Antigravity guide for Windows, then verify:
acc --version
```

#### Step 3 — Install liri
In PowerShell or Windows Terminal:

```powershell
git clone https://github.com/lokeshhh-10/liri-code.git
cd liri-code
npm install
npm run build
npm install -g .
```

#### Step 4 — Run
```powershell
liri
```

---

## 💻 Usage

```bash
liri              # Launch with interactive model picker
liri code         # Same as liri
liri --help       # Show help
liri --version    # Show version
```

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

```bash
cd liri-code
git pull
npm install
npm run build
npm install -g .
```

---

## 🛠️ Development

```bash
npm install          # Install dependencies
npm run build        # Build dist/ from src/
npm run dev          # Watch mode (rebuilds on save)
npm run lint         # ESLint
npm run format       # Prettier
```

---

## ❓ Troubleshooting

### 🔍 `liri: command not found`
Add your global npm bin path to your shell configuration (e.g. `~/.zshrc` or `~/.bashrc`), then open a new terminal window.

### ⚠️ `Proxy not running` / Proxy fails to start
Ensure `acc` is installed and in your `PATH` (`which acc`). You can also test starting it manually with `acc start`.

### ❌ `Claude Code is not installed`
Install it globally via `npm install -g @anthropic-ai/claude-code`.

---

## 📄 License

MIT
