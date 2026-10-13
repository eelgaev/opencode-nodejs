#!/bin/sh
set -eu

node node-runtime/setup.mjs --frozen-lockfile --filter @opencode/cli... --filter @opencode/app...
node node-runtime/build-app.mjs
node node-runtime/build-opentui.mjs
docker run --rm --platform linux/ppc64le -v "$PWD:/workspace" -w /workspace ubuntu:24.04 bash -euxo pipefail -c '
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl xz-utils git python3 make g++
  curl -fsSL https://nodejs.org/dist/v26.11.1/node-v26.11.1-linux-ppc64le.tar.xz | tar -xJ -C /opt
  export PATH=/opt/node-v26.11.1-linux-ppc64le/bin:$PATH
  node node-runtime/setup.mjs --frozen-lockfile --filter @opencode/cli... --filter @opencode/app...
  node node-runtime/build-addons.mjs
  node node-runtime/build.mjs
  node node-runtime/run.mjs --version
  node node-runtime/run.mjs serve --port 4096 >/tmp/opencode-v2-server.log 2>&1 &
  server=$!
  healthy=0
  for attempt in $(seq 1 120); do
    if curl -fsS http://127.0.0.1:4096/global/health; then healthy=1; break; fi
    if ! kill -0 "$server" 2>/dev/null; then cat /tmp/opencode-v2-server.log; break; fi
    sleep 1
  done
  kill "$server" 2>/dev/null || true
  test "$healthy" = 1
  export TERM=xterm-256color
  if timeout --signal=INT --kill-after=5s 45s script -q -e -c "stty rows 40 cols 120; node node-runtime/run.mjs --standalone" /tmp/opencode-v2-tui.log </dev/null >/dev/null 2>&1; then
    status=0
  else
    status=$?
  fi
  if [ "$status" -ne 124 ] || ! grep -Fq "Ask anything" /tmp/opencode-v2-tui.log; then
    tail -c 4000 /tmp/opencode-v2-tui.log
    exit 1
  fi
'
