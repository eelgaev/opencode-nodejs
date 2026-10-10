import { readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const workspace = [
  "packages:",
  ...manifest.workspaces.packages.map((item) => `  - ${JSON.stringify(item)}`),
  "catalog:",
  ...Object.entries(manifest.workspaces.catalog).map(
    ([name, version]) => `  ${JSON.stringify(name)}: ${JSON.stringify(version)}`,
  ),
  "patchedDependencies:",
  ...Object.entries({
    ...manifest.patchedDependencies,
    "@silvia-odwyer/photon-node@0.3.4": "node-runtime/patches/photon-node.patch",
    "@opentui/core": "patches/@opentui__core.patch",
  }).map(([name, file]) => `  ${JSON.stringify(name)}: ${JSON.stringify(file)}`),
  "allowUnusedPatches: true",
  "",
].join("\n")

const target = path.join(root, "pnpm-workspace.yaml")
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8").catch(() => "")) !== workspace) {
    console.error("pnpm-workspace.yaml is stale; run node node-runtime/setup.mjs --sync")
    process.exitCode = 1
  }
} else {
  await writeFile(target, workspace)
}

if (process.argv.includes("--sync") || process.argv.includes("--check")) process.exit()

const install = spawnSync("npx", ["--yes", "pnpm@10.34.6", "install", "--ignore-scripts", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, npm_config_package_manager_strict: "false" },
})
process.exit(install.status ?? 1)
