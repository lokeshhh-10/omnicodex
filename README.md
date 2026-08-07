# liri-code

A minimal CLI launcher for [Claude Code](https://github.com/anthropics/claude-code) with interactive model selection via an [Antigravity](https://github.com/anthropics/antigravity) proxy.

```
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

## How it works

1. Checks if the Antigravity proxy is running — **starts it automatically** if not
2. Fetches available models from `http://localhost:8080/v1/models`
3. Shows an interactive picker — arrow keys to navigate, Enter to select
4. Writes `~/.claude/settings.json` with the selected model
5. Launches Claude Code immediately

---

## Requirements

Before installing liri, make sure these are installed on your system:

| Requirement | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 18 | Runtime |
| [Claude Code](https://github.com/anthropics/claude-code) | latest | The editor liri launches |
| [Antigravity CLI](https://github.com/anthropics/antigravity) (`acc`) | latest | Proxy that serves available models |

---

## Installation

### macOS

#### Step 1 — Install Node.js

The recommended way is via [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell
source ~/.zshrc   # or ~/.bashrc if using bash

# Install Node.js 22 (LTS)
nvm install 22
nvm use 22
nvm alias default 22
```

Verify:

```bash
node --version   # should print v22.x.x
npm --version
```

#### Step 2 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

#### Step 3 — Install Antigravity CLI

Follow the [Antigravity installation guide](https://github.com/anthropics/antigravity) for your platform.  
After installation, verify:

```bash
acc --version
```

#### Step 4 — Install liri

Clone the repository and install globally:

```bash
git clone https://github.com/lokeshhh-10/liri-code.git
cd liri-code
npm install
npm run build
npm install -g .
```

> **Note:** If you get an `EACCES` permission error, set a user-level npm prefix first:
> ```bash
> mkdir -p ~/.local/share/npm
> npm config set prefix ~/.local/share/npm
> npm install -g .
> ```
> Then add to your `~/.zshrc` (or `~/.bashrc`):
> ```bash
> export PATH="$HOME/.local/share/npm/bin:$PATH"
> ```
> And reload: `source ~/.zshrc`

#### Step 5 — Run

Open a new terminal window and run:

```bash
liri
```

---

### Windows

#### Step 1 — Install Node.js

**Option A (recommended):** Download and run the official installer from [nodejs.org](https://nodejs.org/en/download). Choose the **LTS** version (22.x).  
The installer automatically adds Node.js to your PATH.

**Option B:** Use [nvm-windows](https://github.com/coreybutler/nvm-windows):

```powershell
# After installing nvm-windows
nvm install 22
nvm use 22
```

Verify (in a new PowerShell or Command Prompt window):

```powershell
node --version
npm --version
```

#### Step 2 — Install Claude Code

```powershell
npm install -g @anthropic-ai/claude-code
```

Verify:

```powershell
claude --version
```

#### Step 3 — Install Antigravity CLI

Follow the [Antigravity installation guide](https://github.com/anthropics/antigravity) for Windows.  
After installation, verify:

```powershell
acc --version
```

#### Step 4 — Install liri

Open **PowerShell** or **Windows Terminal** and run:

```powershell
git clone https://github.com/lokeshhh-10/liri-code.git
cd liri-code
npm install
npm run build
npm install -g .
```

On Windows, global npm packages are automatically placed in `%APPDATA%\npm`, which is already in your PATH — no extra configuration needed.

#### Step 5 — Run

Open a **new** PowerShell or Windows Terminal window and run:

```powershell
liri
```

> **Tip:** For the best experience on Windows, use [Windows Terminal](https://aka.ms/terminal) — it supports full color and interactive keyboard navigation.

---

### Linux

#### Step 1 — Install Node.js

The recommended way is via [nvm](https://github.com/nvm-sh/nvm):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell
source ~/.bashrc   # or ~/.zshrc if using zsh

# Install Node.js 22 (LTS)
nvm install 22
nvm use 22
nvm alias default 22
```

Verify:

```bash
node --version   # should print v22.x.x
npm --version
```

#### Step 2 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

#### Step 3 — Install Antigravity CLI

Follow the [Antigravity installation guide](https://github.com/anthropics/antigravity) for your distro.  
After installation, verify:

```bash
acc --version
```

#### Step 4 — Install liri

Clone the repo and set up a user-level npm prefix (avoids needing `sudo`):

```bash
# Clone and enter project directory
git clone https://github.com/lokeshhh-10/liri-code.git
cd liri-code

# Install dependencies and build
npm install
npm run build

# Set a user-level npm prefix (only needed once)
mkdir -p ~/.local/share/npm
npm config set prefix ~/.local/share/npm

# Install globally
npm install -g .
```

#### Step 5 — Add liri to your PATH

**For bash users** — add to `~/.bashrc`:

```bash
echo 'export PATH="$HOME/.local/share/npm/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**For zsh users** — add to `~/.zshrc`:

```bash
echo 'export PATH="$HOME/.local/share/npm/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**For fish users** — add to `~/.config/fish/config.fish`:

```fish
fish_add_path ~/.local/share/npm/bin
```

#### Step 6 — Run

Open a new terminal (or reload your shell config) and run:

```bash
liri
```

---

## Usage

```bash
liri              # Launch with interactive model picker
liri code         # Same as liri
liri --help       # Show help
liri --version    # Show version
```

### Navigation

| Key | Action |
|---|---|
| `↑` / `↓` | Move between models |
| `Enter` | Select model and launch Claude Code |
| `Esc` / `Ctrl+C` | Exit without launching |

### What happens after you pick a model

- `~/.claude/settings.json` is written with all model slots set to your selection
- Claude Code launches immediately in the same terminal
- Your last selection is remembered — it's pre-selected next time you run `liri`

---

## Updating

```bash
cd liri-code
git pull
npm install
npm run build
npm install -g .
```

---

## Development

```bash
npm install          # Install dependencies
npm run build        # Build dist/ from src/
npm run dev          # Watch mode (rebuilds on save)
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Troubleshooting

### `liri: command not found`

- Your shell's PATH doesn't include the npm global bin directory.
- Run `npm config get prefix` to find where global packages are installed.
- Add `<prefix>/bin` to your PATH (see the OS-specific instructions above).
- Make sure to open a **new terminal** after editing your shell config.

### `Proxy not running` / proxy fails to start

- Make sure `acc` is installed and in your PATH: `which acc`
- Try starting the proxy manually: `acc start`
- Check if port `8080` is already in use: `lsof -i :8080` (Linux/macOS) or `netstat -ano | findstr :8080` (Windows)

### `Claude Code is not installed`

```bash
npm install -g @anthropic-ai/claude-code
```

### `EACCES: permission denied` on macOS/Linux

You're trying to write to a system-owned npm prefix. Switch to a user-level prefix:

```bash
mkdir -p ~/.local/share/npm
npm config set prefix ~/.local/share/npm
npm install -g .
```

Then add `$HOME/.local/share/npm/bin` to your PATH as described above.

---

## License

MIT
