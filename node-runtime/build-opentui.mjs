import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const version = "0.5.17"
const source = path.join(root, `node-runtime/.cache/opentui-${version}`)
const target = "powerpc64le-linux-gnu.2.28"
const zig = process.env.ZIG ?? "zig"
const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))

if (manifest.workspaces.catalog["@opentui/core"] !== version) throw new Error("Update the OpenTUI native build version")
if (spawnSync(zig, ["version"], { encoding: "utf8" }).stdout?.trim() !== "0.16.0") {
  throw new Error("OpenTUI 0.5.17 requires Zig 0.16.0 (set ZIG to its executable path)")
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}`)
}

if (!existsSync(source)) {
  mkdirSync(path.dirname(source), { recursive: true })
  run("git", ["clone", "--depth", "1", "--branch", `v${version}`, "https://github.com/anomalyco/opentui.git", source])
}

const native = path.join(source, "packages/native")
run("sh", ["scripts/prepare-zig-deps.sh"], native)
run(zig, ["build", `-Dlibrary-target=${target}`, "-Doptimize=ReleaseFast"], native)
mkdirSync(path.join(root, "node-runtime/native/ppc64le"), { recursive: true })
copyFileSync(
  path.join(native, "lib", target, "libopentui.so"),
  path.join(root, "node-runtime/native/ppc64le/libopentui.so"),
)
