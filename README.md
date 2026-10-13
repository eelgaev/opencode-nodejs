# OpenCode for Node.js · v2

[![v2 tests](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml/badge.svg?branch=v2)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml?query=branch%3Av2)
[![v2 binary release](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-release.yml/badge.svg?branch=v2)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-release.yml?query=branch%3Av2)

This fork maintains two OpenCode release lines with working Node.js CLIs. This default branch follows upstream **v2** and publishes a tested, standalone Node.js executable for Linux. The [v1 branch](https://github.com/eelgaev/opencode-nodejs/tree/v1) follows upstream v1 and runs its CLI, terminal UI, and server through a Node.js source runner. Both lines have their own checks and are updated independently.

## Install v2

On Linux **x86_64** or **aarch64**, run:

```sh
curl -fsSL https://raw.githubusercontent.com/eelgaev/opencode-nodejs/v2/install-node.sh | sh
~/.local/bin/opencode2-node --version
```

The installer downloads the matching binary from this fork's [latest release](https://github.com/eelgaev/opencode-nodejs/releases/latest), verifies its SHA-256 checksum, and installs `opencode2-node` in `~/.local/bin`. The executable includes its Node.js runtime. Add that directory to `PATH` to run `opencode2-node` directly. Set `OPENCODE_NODE_BIN_DIR` to install elsewhere; re-run the installer to update.

## Release lines

| Branch | Upstream line | Node.js distribution | Command |
| --- | --- | --- | --- |
| [v1](https://github.com/eelgaev/opencode-nodejs/tree/v1) | v1 | [Installed source runner](https://github.com/eelgaev/opencode-nodejs/blob/v1/node-runtime/README.md); Linux and macOS | `opencode` |
| **[v2](https://github.com/eelgaev/opencode-nodejs/tree/v2)** | v2 | Prebuilt Linux binary for x86_64 and aarch64 | `opencode2-node` |

## Checks and releases

The [v2 branch checks](.github/workflows/node-check.yml) run on pushes and pull requests. They run selected upstream unit tests under Node.js and Bun, build the Node.js CLI, and check its service startup. The [binary release workflow](.github/workflows/node-release.yml) repeats those checks on x86_64 and aarch64 runners, then publishes both binaries and checksums only after both pass. The [weekly upstream sync](.github/workflows/node-upstream.yml) tests v1 and v2 separately before pushing either update.

Contributors can build the CLI from source with [`packages/cli/script/build-node.ts`](packages/cli/script/build-node.ts). This build uses Bun; installing and running the published executable does not.

## Upstream OpenCode

This is an independent fork of [OpenCode](https://github.com/anomalyco/opencode). The original project information follows; its installation commands install upstream builds. Use the commands above for this Node.js fork.

---

<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/opencode/releases) or [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.opencode/bin` - Default fallback

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
