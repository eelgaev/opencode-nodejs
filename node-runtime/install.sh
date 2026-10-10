#!/bin/sh
set -eu

fail() {
  printf 'opencode-nodejs: %s\n' "$*" >&2
  exit 1
}

quote() {
  printf "'"
  printf '%s' "$1" | sed "s/'/'\\\\''/g"
  printf "'"
}

verify_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$1" | cut -d ' ' -f 1)
  elif command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$1" | cut -d ' ' -f 1)
  else
    fail 'sha256sum or shasum is required to verify downloads'
  fi
  [ "$actual" = "$2" ] || fail "checksum mismatch for $1"
}

case "${1:-}" in
  --help|-h)
    printf 'Install the Node.js OpenCode fork.\n\n'
    printf 'Usage: curl -fsSL https://raw.githubusercontent.com/eelgaev/opencode-nodejs/node-runtime/node-runtime/install.sh | sh\n\n'
    printf 'Set OPENCODE_NODE_INSTALL_DIR or OPENCODE_NODE_BIN_DIR to change the default locations.\n'
    exit 0
    ;;
  '') ;;
  *) fail "unknown argument: $1" ;;
esac

command -v curl >/dev/null 2>&1 || fail 'curl is required'
command -v tar >/dev/null 2>&1 || fail 'tar is required'
[ -n "${HOME:-}" ] || fail 'HOME is required'

case "$(uname -s):$(uname -m)" in
  Linux:x86_64) platform=linux-x64; node_sha=3883bfc73f9a680ca4eab04b196068aaaab1373ffa77d8fc1a4408222495b651 ;;
  Linux:aarch64|Linux:arm64) platform=linux-arm64; node_sha=0945e2cde6aa0f54d980f03874dfe5cf3a549ce714c7fb9019e591ce0accf282 ;;
  Linux:ppc64le) platform=linux-ppc64le; node_sha=96ee3114c4215fd986ac4e935dc6edb19990865f9f2dc4333b30d14050f96d22 ;;
  Darwin:x86_64) platform=darwin-x64; node_sha=68a8a4de0c46e693a261d13efb43d041fcd7386187816ef9a4b14bf60003adb2 ;;
  Darwin:arm64) platform=darwin-arm64; node_sha=0ef9b443000681bffc062ec126d53f97933ea9b086ea73dcba0480d87e639b39 ;;
  *) fail "unsupported platform: $(uname -s) $(uname -m)" ;;
esac

data_dir=${OPENCODE_NODE_INSTALL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/opencode-nodejs}
bin_dir=${OPENCODE_NODE_BIN_DIR:-$HOME/.local/bin}
mkdir -p "$data_dir/releases" "$bin_dir"
data_dir=$(cd "$data_dir" && pwd -P)
bin_dir=$(cd "$bin_dir" && pwd -P)

if [ -e "$bin_dir/opencode" ] || [ -L "$bin_dir/opencode" ]; then
  grep -q '^# Managed by the opencode-nodejs installer$' "$bin_dir/opencode" 2>/dev/null ||
    fail "$bin_dir/opencode already exists; set OPENCODE_NODE_BIN_DIR to another directory"
fi

work=$(mktemp -d "$data_dir/.install.XXXXXX")
release=$(mktemp -d "$data_dir/releases/XXXXXX")
cleanup() {
  rm -rf "$work"
  if [ "${installed:-0}" -eq 0 ]; then rm -rf "$release"; fi
}
trap cleanup EXIT HUP INT TERM

node_bin=$(command -v node || true)
if [ -z "$node_bin" ] || ! "$node_bin" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>26||a===26&&b>=4?0:1)' 2>/dev/null ||
  ! command -v npm >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then
  node_bin="$data_dir/node-v26.11.1-$platform/bin/node"
  if [ ! -x "$node_bin" ]; then
    printf 'Downloading Node.js 26.11.1 for %s...\n' "$platform"
    node_archive="node-v26.11.1-$platform.tar.xz"
    curl -fL --retry 3 --progress-bar "https://nodejs.org/dist/v26.11.1/$node_archive" -o "$work/$node_archive"
    verify_sha256 "$work/$node_archive" "$node_sha"
    tar -xJf "$work/$node_archive" -C "$work"
    mv "$work/node-v26.11.1-$platform" "$data_dir/node-v26.11.1-$platform"
  fi
  PATH="$(dirname "$node_bin"):$PATH"
  export PATH
fi
case "$node_bin" in
  /*) ;;
  *) node_bin="$(cd "$(dirname "$node_bin")" && pwd -P)/$(basename "$node_bin")" ;;
esac

printf 'Downloading the Node.js OpenCode fork...\n'
archive=${OPENCODE_NODE_ARCHIVE_URL:-https://github.com/eelgaev/opencode-nodejs/archive/refs/heads/node-runtime.tar.gz}
curl -fL --retry 3 --progress-bar "$archive" -o "$work/source.tar.gz"
tar -xzf "$work/source.tar.gz" -C "$release" --strip-components=1
[ -f "$release/node-runtime/run.mjs" ] || fail 'downloaded archive does not contain the Node.js runner'

printf 'Installing workspace dependencies...\n'
(cd "$release" && "$node_bin" node-runtime/setup.mjs --frozen-lockfile --filter opencode... --filter .)

if [ "$platform" = linux-ppc64le ]; then
  command -v make >/dev/null 2>&1 || fail 'make is required to build ppc64le native modules'
  command -v c++ >/dev/null 2>&1 || fail 'a C++ compiler is required to build ppc64le native modules'
  command -v "${PYTHON:-python3}" >/dev/null 2>&1 || fail 'Python 3 is required to build ppc64le native modules'
  if [ -n "${OPENCODE_NODE_OPENTUI_LIB:-}" ]; then
    [ -f "$OPENCODE_NODE_OPENTUI_LIB" ] || fail 'OPENCODE_NODE_OPENTUI_LIB does not exist'
    mkdir -p "$release/node-runtime/native/ppc64le"
    cp "$OPENCODE_NODE_OPENTUI_LIB" "$release/node-runtime/native/ppc64le/libopentui.so"
  else
    command -v git >/dev/null 2>&1 || fail 'git is required to build OpenTUI for ppc64le'
    zig_bin=${ZIG:-$(command -v zig || true)}
    if [ -z "$zig_bin" ] || [ "$("$zig_bin" version 2>/dev/null || true)" != 0.15.2 ]; then
      zig_bin="$data_dir/zig-0.15.2-ppc64le/zig"
      if [ ! -x "$zig_bin" ]; then
        printf 'Downloading Zig 0.15.2 for ppc64le...\n'
        zig_archive=zig-powerpc64le-linux-0.15.2.tar.xz
        curl -fL --retry 3 --progress-bar "https://ziglang.org/download/0.15.2/$zig_archive" -o "$work/$zig_archive"
        verify_sha256 "$work/$zig_archive" e182c5f8d30fc7f97d17d2ffef1488826aa3afaa51e5f0dbe14c597a98b45778
        tar -xJf "$work/$zig_archive" -C "$work"
        mv "$work/zig-powerpc64le-linux-0.15.2" "$data_dir/zig-0.15.2-ppc64le"
      fi
    fi
    printf 'Building OpenTUI for ppc64le...\n'
    (cd "$release" && ZIG="$zig_bin" "$node_bin" node-runtime/build-opentui.mjs)
    rm -rf "$release/node-runtime/.cache/opentui-0.4.5"
  fi
  printf 'Building ppc64le Node addons...\n'
  (cd "$release" && "$node_bin" node-runtime/build-addons.mjs)
fi

printf 'Checking the installed CLI...\n'
"$node_bin" "$release/node-runtime/run.mjs" opencode --version >/dev/null

{
  printf '#!/bin/sh\n# Managed by the opencode-nodejs installer\nexec '
  quote "$node_bin"
  printf ' '
  quote "$release/node-runtime/run.mjs"
  printf ' opencode "$@"\n'
} > "$work/opencode"
chmod 755 "$work/opencode"
mv -f "$work/opencode" "$bin_dir/opencode"
installed=1

previous=$(cat "$data_dir/current" 2>/dev/null || true)
printf '%s\n' "$release" > "$data_dir/current"
previous_name=${previous##*/}
if [ "$previous" = "$data_dir/releases/$previous_name" ] && [ "$previous" != "$release" ]; then
  case "$previous_name" in
    [A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]) rm -rf "$previous" ;;
  esac
fi

printf '\nInstalled %s\n' "$bin_dir/opencode"
case ":$PATH:" in
  *":$bin_dir:"*) printf 'Run: opencode\n' ;;
  *) printf 'Add %s to PATH, then run: opencode\n' "$bin_dir" ;;
esac
