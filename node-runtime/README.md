# Node.js runtime

This is a secondary runtime for the two command line entry points. The root Bun workspace, lockfile, scripts, and release flow remain the upstream path.

Use Node.js 26.4 or newer. The source runner uses Node's synchronous module hooks, TypeScript loader, SQLite, and FFI. On a clean checkout:

```sh
node node-runtime/setup.mjs --frozen-lockfile
node node-runtime/run.mjs opencode --help
node node-runtime/run.mjs lildax --help
```

`setup.mjs` installs with pnpm 10 and skips upstream install scripts that invoke Bun. It generates `pnpm-workspace.yaml` from the root catalog and Bun patches, plus the Node runtime patches. When upstream changes the catalog or workspace list, run `node node-runtime/setup.mjs --sync`, then `node node-runtime/setup.mjs --no-frozen-lockfile`, and review the lockfile. `node node-runtime/setup.mjs --check` checks that the generated workspace file is current.

The Node asset loader provides named exports for the TUI's CommonJS `fuzzysort` dependency. This lets the upstream TUI source use its existing namespace imports under Node.

## Updating from upstream

Keep upstream's `dev` branch as the base and merge it into this fork's `node-runtime` branch. Add the upstream remote once, then fetch and merge:

```sh
git remote add upstream https://github.com/anomalyco/opencode.git
git fetch upstream dev
git switch node-runtime
git merge upstream/dev
node node-runtime/setup.mjs --sync
node node-runtime/setup.mjs --no-frozen-lockfile
```

Review changes to Node-specific patches and `pnpm-lock.yaml` after each merge. The fork's root Bun files stay available for upstream development.

The fork keeps only `node-upstream.yml` and `node-runtime.yml` under `.github/workflows`. When updating manually, remove any upstream workflows added by a merge before committing. The [weekly upstream check](../.github/workflows/node-upstream.yml) merges upstream `dev`, removes inherited workflows (including resolving conflicts caused by their removal), and tests the Node CLI, server, and TUI on x86 Linux. When every check passes, it pushes the merge to `node-runtime`. It runs Mondays at 04:17 UTC and supports manual dispatch. A failed check leaves the default branch unchanged.

## Linux ppc64le native modules

OpenTUI 0.4.5 has no published ppc64le library. Build its pinned Zig source with Zig 0.15.2 on a build machine, including an ARM64 or x64 cross build host:

```sh
ZIG=/path/to/zig node node-runtime/build-opentui.mjs
```

Copy `node-runtime/native/ppc64le/libopentui.so` into the same path on the ppc64le checkout. The runner finds it automatically; `OPENCODE_NODE_OPENTUI_LIB` can point to another location. The `@opentui/core` pnpm patch adds that override to the Node library loader and uses 8-byte pointers on ppc64le. It is scoped to the pinned OpenTUI version, so an upstream OpenTUI update requires reviewing the patch and Zig build version.

After the pnpm install on ppc64le, build the PTY and filesystem watcher modules from source. On RHEL 8 with GCC 12 at `/opt/rh`:

```sh
source /opt/rh/gcc-toolset-12/enable
export PYTHON=python3.11
node node-runtime/build-addons.mjs
```

The Node PTY adapter selects source-built `node-pty` on ppc64le and the upstream `@lydell/node-pty` package on other architectures. The watcher uses its local source build when no platform package exists.

A locally built PPC64LE Node 26.11.1 binary has a libffi TOC save bug. When a native function tail calls through its PLT, its call overwrites libffi's saved TOC register and the next FFI cleanup call can segfault. The runner recognizes that exact binary by SHA-256, writes a verified private copy to `node-runtime/native/ppc64le/node-ffi-fixed`, and runs OpenCode with the copy. It never changes the system Node binary. Rebuilding Node with [the libffi source patch](patches/node-libffi-ppc64le-toc.patch) is the durable fix for other PPC64LE Node builds. The private copy is local and ignored by Git.

The manual [QEMU workflow](../.github/workflows/node-runtime.yml) runs the Node runtime on a regular GitHub hosted runner. It is dispatch-only so cross-architecture checks remain opt-in.
