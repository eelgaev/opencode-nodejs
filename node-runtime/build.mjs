import { spawnSync } from "node:child_process"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 26 || (major === 26 && minor < 4)) throw new Error("Node.js 26.4 or newer is required")
const result = spawnSync(
  process.execPath,
  ["--import", path.join(root, "node-runtime/loader.mjs"), "script/build-node.ts", "--bundle-only", "--single", "--skip-install"],
  { cwd: path.join(root, "packages/cli"), stdio: "inherit", env: process.env },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
