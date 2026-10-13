# OpenCode for Node.js

[![v1 tests](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml/badge.svg?branch=v1)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml?query=branch%3Av1)
[![v2 tests](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml/badge.svg?branch=v2)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml?query=branch%3Av2)

A maintained [OpenCode](https://github.com/anomalyco/opencode) fork focused on running OpenCode on **Linux ppc64le with Node.js**. Both upstream release lines have separate Node.js paths and checks. This `main` branch is the English project landing page; source and build instructions live on `v1` and `v2`.

## Choose a release line

| Branch | Tracks | Node.js runtime | Start here |
| --- | --- | --- | --- |
| **[v1](https://github.com/eelgaev/opencode-nodejs/tree/v1)** | Upstream v1 | Source runner for the CLI, terminal UI, and server | [Install v1](https://github.com/eelgaev/opencode-nodejs/tree/v1#install-v1) |
| **[v2](https://github.com/eelgaev/opencode-nodejs/tree/v2)** | Upstream v2 | Node.js build with ppc64le native modules built from source | [Build v2](https://github.com/eelgaev/opencode-nodejs/tree/v2#build-and-run-v2-on-ppc64le) |

### v1: install with Node.js

The v1 installer supports Linux x86_64, aarch64, and ppc64le, plus macOS x86_64 and aarch64. It downloads Node.js 26 when the host version is too old.

```sh
curl -fsSL https://raw.githubusercontent.com/eelgaev/opencode-nodejs/v1/node-runtime/install.sh | sh
~/.local/bin/opencode --version
```

See the [v1 runtime guide](https://github.com/eelgaev/opencode-nodejs/blob/v1/node-runtime/README.md) for source setup and platform details.

### v2: build for ppc64le with Node.js

The v2 branch builds its CLI and web UI using Node.js and pnpm. On ppc64le, it builds OpenTUI, the PTY addon, and the filesystem watcher from source. See the [v2 build instructions](https://github.com/eelgaev/opencode-nodejs/tree/v2#build-and-run-v2-on-ppc64le) for the Zig cross build prerequisite and commands. Bun is not required for this path. The fork does not publish binary downloads.

## Checks and upstream updates

Both source branches run [GitHub Actions checks](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml) on pushes and pull requests. They run selected upstream unit tests, then exercise the relevant Node.js CLI. V1 checks terminal startup and server health. V2 checks its Node.js build, service, and terminal UI startup on the regular runner and under ppc64le emulation.

The [upstream sync workflow](.github/workflows/node-upstream.yml) runs weekly or on manual dispatch. It merges upstream v1 and v2 independently, runs the checks including v2's ppc64le check, and pushes each branch only if its checks pass. No binary release is part of that workflow.

Open pull requests against the source branch you intend to change: `v1` or `v2`. The original product documentation is available at [opencode.ai/docs](https://opencode.ai/docs). This fork is independent of the upstream OpenCode team.
