#!/bin/sh
set -eu

fail() {
  printf 'opencode-nodejs: %s\n' "$*" >&2
  exit 1
}

case "$(uname -s):$(uname -m)" in
  Linux:x86_64) platform=linux-x86_64 ;;
  Linux:aarch64|Linux:arm64) platform=linux-aarch64 ;;
  *) fail "unsupported platform: $(uname -s) $(uname -m)" ;;
esac

command -v curl >/dev/null 2>&1 || fail 'curl is required'
command -v tar >/dev/null 2>&1 || fail 'tar is required'
[ -n "${HOME:-}" ] || fail 'HOME is required'

bin_dir=${OPENCODE_NODE_BIN_DIR:-$HOME/.local/bin}
mkdir -p "$bin_dir"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

asset="opencode2-node-$platform.tar.gz"
base="https://github.com/eelgaev/opencode-nodejs/releases/latest/download"
curl -fL --retry 3 "$base/$asset" -o "$work/$asset"
curl -fL --retry 3 "$base/$asset.sha256" -o "$work/$asset.sha256"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$work" && sha256sum -c "$asset.sha256")
elif command -v shasum >/dev/null 2>&1; then
  (cd "$work" && shasum -a 256 -c "$asset.sha256")
else
  fail 'sha256sum or shasum is required'
fi

tar -xzf "$work/$asset" -C "$work"
"$work/opencode2-node" --version >/dev/null || fail 'downloaded CLI failed its version check'
install -m 755 "$work/opencode2-node" "$bin_dir/opencode2-node"
printf 'Installed %s/opencode2-node\n' "$bin_dir"
