import { readFile, readdir, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const packages = (
  await Promise.all(
    manifest.workspaces.packages.map(async (entry) =>
      entry.endsWith("/*")
        ? (await readdir(path.join(root, entry.slice(0, -2)), { withFileTypes: true }))
            .filter((child) => child.isDirectory())
            .map((child) => `${entry.slice(0, -1)}${child.name}`)
        : [entry],
    ),
  )
)
  .flat()
  .map(async (entry) => ({ entry, manifest: await readFile(path.join(root, entry, "package.json"), "utf8").then(JSON.parse).catch(() => undefined) }))
const available = new Map((await Promise.all(packages)).filter((item) => item.manifest?.name).map((item) => [item.manifest.name, item]))
const selected = new Set(["@opencode/cli", "@opencode/app"])
for (const name of selected) {
  const pkg = available.get(name)?.manifest
  if (!pkg) throw new Error(`Missing workspace package ${name}`)
  for (const [dependency, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies })) {
    if (typeof version === "string" && version.startsWith("workspace:")) selected.add(dependency)
  }
}
const workspace = [
  "packages:",
  ...[...selected].map((name) => `  - ${JSON.stringify(available.get(name).entry)}`),
  "catalog:",
  ...Object.entries(manifest.workspaces.catalog).map(
    ([name, version]) => `  ${JSON.stringify(name)}: ${JSON.stringify(version)}`,
  ),
  "patchedDependencies:",
  ...Object.entries({ ...manifest.patchedDependencies, "@silvia-odwyer/photon-node@0.3.4": "node-runtime/patches/photon-node.patch" })
    .filter(([name]) => !name.startsWith("ghostty-web@github:"))
    .map(([name, file]) => `  ${JSON.stringify(name)}: ${JSON.stringify(file)}`),
  "overrides:",
  ...Object.entries(manifest.overrides).map(([name, version]) => `  ${JSON.stringify(name)}: ${JSON.stringify(version)}`),
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
