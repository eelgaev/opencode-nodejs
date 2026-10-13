import { spawnSync } from "node:child_process"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const archive = path.join(root, "node-runtime/native/app-archive.bin")
const result = spawnSync(
  process.execPath,
  [
    "--import",
    path.join(root, "node-runtime/loader.mjs"),
    "script/build-node.ts",
    "--app-archive-only",
    `--app-archive=${archive}`,
    "--skip-install",
  ],
  { cwd: path.join(root, "packages/cli"), stdio: "inherit", env: process.env },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
