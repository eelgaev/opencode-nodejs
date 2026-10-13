# OpenCode for Node.js

[![v1 tests](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml/badge.svg?branch=v1)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml?query=branch%3Av1)
[![v2 tests](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml/badge.svg?branch=v2)](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml?query=branch%3Av2)

A maintained [OpenCode](https://github.com/anomalyco/opencode) fork with Node.js support for both upstream release lines. This `main` branch is the English project landing page. The source and branch-specific documentation live on `v1` and `v2`.

## Choose a release line

| Branch | Tracks | Node.js runtime | Start here |
| --- | --- | --- | --- |
| **[v1](https://github.com/eelgaev/opencode-nodejs/tree/v1)** | Upstream v1 | Source runner for the CLI, terminal UI, and server | [Install v1](https://github.com/eelgaev/opencode-nodejs/tree/v1#install-v1) |
| **[v2](https://github.com/eelgaev/opencode-nodejs/tree/v2)** | Upstream v2 | CLI built from source and exercised under Node.js | [Build v2](https://github.com/eelgaev/opencode-nodejs/tree/v2#build-and-run-v2-from-source) |

### v1: install with Node.js

The v1 installer supports Linux x86_64, aarch64, and ppc64le, plus macOS x86_64 and aarch64. It downloads Node.js 26 when the host version is too old.

```sh
curl -fsSL https://raw.githubusercontent.com/eelgaev/opencode-nodejs/v1/node-runtime/install.sh | sh
~/.local/bin/opencode --version
```

See the [v1 runtime guide](https://github.com/eelgaev/opencode-nodejs/blob/v1/node-runtime/README.md) for source setup and platform details.

### v2: build the Node.js CLI

The v2 branch builds a Node.js CLI from source. The build uses Bun; the resulting CLI runs under Node.js. See the [v2 build instructions](https://github.com/eelgaev/opencode-nodejs/tree/v2#build-and-run-v2-from-source). The fork does not publish binary downloads.

## Checks and upstream updates

Both source branches run [GitHub Actions checks](https://github.com/eelgaev/opencode-nodejs/actions/workflows/node-check.yml) on pushes and pull requests. They run selected upstream unit tests under Node.js and Bun, then exercise the relevant Node.js CLI. V1 checks terminal startup and server health; v2 checks its Node.js build and service startup.

The [upstream sync workflow](.github/workflows/node-upstream.yml) runs weekly or on manual dispatch. It merges upstream v1 and v2 independently, runs the branch checks, and pushes each branch only if its checks pass. No binary release is part of that workflow.

Open pull requests against the source branch you intend to change: `v1` or `v2`. The original product documentation is available at [opencode.ai/docs](https://opencode.ai/docs). This fork is independent of the upstream OpenCode team.
