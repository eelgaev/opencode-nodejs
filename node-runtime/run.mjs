import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const opentui = path.join(root, "node-runtime/native/ppc64le/libopentui.so")
const name = process.argv[2]
if (name !== "opencode" && name !== "lildax") {
  console.error("Usage: node node-runtime/run.mjs <opencode|lildax> [args...]")
  process.exit(2)
}

if (
  Number(process.versions.node.split(".")[0]) < 26 ||
  (Number(process.versions.node.split(".")[0]) === 26 && Number(process.versions.node.split(".")[1]) < 4)
) {
  console.error("Node.js 26.4 or newer is required")
  process.exit(2)
}

const child = spawn(
  process.execPath,
  [
    // Node's FFI warning has no code, so it can only be suppressed by type.
    "--disable-warning=ExperimentalWarning",
    "--experimental-ffi",
    "--import",
    path.join(root, "node-runtime/assets.mjs"),
    "src/index.ts",
    ...process.argv.slice(3),
  ],
  {
    cwd: path.join(root, "packages", name === "lildax" ? "cli" : "opencode"),
    stdio: "inherit",
    env: {
      ...process.env,
      ...(process.platform === "linux" && process.arch === "ppc64" && existsSync(opentui)
        ? { OPENCODE_NODE_OPENTUI_LIB: process.env.OPENCODE_NODE_OPENTUI_LIB ?? opentui }
        : {}),
    },
  },
)

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal))
}
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
