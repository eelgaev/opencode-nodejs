import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 26 || (major === 26 && minor < 4)) throw new Error("Node.js 26.4 or newer is required")
const ppc64le = process.platform === "linux" && process.arch === "ppc64"
const archive = path.join(root, "node-runtime/native/app-archive.bin")
if (ppc64le && !existsSync(archive)) {
  throw new Error("Build the web archive with node node-runtime/build-app.mjs on x86_64 or aarch64 and copy it to node-runtime/native/app-archive.bin")
}
const result = spawnSync(
  process.execPath,
  [
    "--import",
    path.join(root, "node-runtime/loader.mjs"),
    "script/build-node.ts",
    "--bundle-only",
    "--single",
    "--skip-install",
    ...(ppc64le ? [`--app-archive=${archive}`] : []),
  ],
  { cwd: path.join(root, "packages/cli"), stdio: "inherit", env: process.env },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
