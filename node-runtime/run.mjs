import { spawn } from "node:child_process"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const ppc64le = process.platform === "linux" && process.arch === "ppc64"
const node = ppc64le ? await import("./ppc64le-node.mjs").then((module) => module.prepareNode()) : process.execPath
const child = spawn(
  node,
  ["--experimental-ffi", "--use-system-ca", "--disable-warning=ExperimentalWarning", path.join(root, "packages/cli/dist-node/opencode.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
)
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal))
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
