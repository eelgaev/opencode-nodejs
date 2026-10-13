import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const addons = path.join(root, "node-runtime/addons")
const install = spawnSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: addons,
  stdio: "inherit",
})
if (install.status !== 0) process.exit(install.status ?? 1)

for (const [name, manifest] of [
  ["node-pty", path.join(addons, "package.json")],
  ["@parcel/watcher", path.join(root, "packages/core/package.json")],
]) {
  const require = createRequire(manifest)
  const cwd = path.dirname(require.resolve(`${name}/package.json`))
  const result = spawnSync("npx", ["--yes", "node-gyp@12.1.0", "rebuild"], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, PYTHON: process.env.PYTHON ?? "python3" },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
