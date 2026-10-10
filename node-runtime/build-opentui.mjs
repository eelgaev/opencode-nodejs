import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const version = "0.4.5"
const source = path.join(root, "node-runtime/.cache/opentui-" + version)
const target = "powerpc64le-linux-gnu.2.28"
const zig = process.env.ZIG ?? "zig"

const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
if (manifest.workspaces.catalog["@opentui/core"] !== version) {
  console.error(`OpenTUI version changed; update the Node build for ${manifest.workspaces.catalog["@opentui/core"]}`)
  process.exit(1)
}

if (spawnSync(zig, ["version"], { encoding: "utf8" }).stdout?.trim() !== "0.15.2") {
  console.error("OpenTUI 0.4.5 requires Zig 0.15.2 (set ZIG to its executable path)")
  process.exit(1)
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!existsSync(source)) {
  mkdirSync(path.dirname(source), { recursive: true })
  run("git", ["clone", "--depth", "1", "--branch", `v${version}`, "https://github.com/anomalyco/opentui.git", source])
}

run(zig, ["build", `-Dtarget=${target}`, "-Doptimize=ReleaseFast"], path.join(source, "packages/core/src/zig"))
mkdirSync(path.join(root, "node-runtime/native/ppc64le"), { recursive: true })
copyFileSync(
  path.join(source, "packages/core/src/zig/lib", target, "libopentui.so"),
  path.join(root, "node-runtime/native/ppc64le/libopentui.so"),
)
