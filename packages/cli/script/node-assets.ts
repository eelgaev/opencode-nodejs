import { createHash } from "node:crypto"
import { copyFile, mkdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { getNodeAssets } from "@opentui/core/node-assets"
import { attentionSoundAssets, type NodeTarget, photonWasmAsset, shellParserWasmAssets } from "../src/node/target"
import { collectFiles } from "./files"
import { resolveOpencodePty } from "./opencode-pty"

const dir = path.resolve(import.meta.dirname, "..")

// Bun's compiler discovers file imports and embeds them in its virtual filesystem. Vite only bundles the JavaScript
// portion of the Node executable, while SEA embeds only the assets explicitly listed in its build configuration.
// Collect and stage those files under stable keys so the SEA prelude can extract them to real paths at startup;
// native addons, helper executables, and other path-based consumers cannot use assets directly from SEA memory.
export type NodeAsset = {
  readonly key: string
  readonly source: string
}

export async function collectNodeAssets(target: NodeTarget) {
  const ppc64le = target.platform === "linux" && target.arch === "ppc64"
  const opencodePty = await resolveOpencodePty({
    platform: target.platform,
    arch: target.arch,
    ...(target.platform === "linux" ? { libc: "glibc" as const } : {}),
  })
  const ptyEntry = ppc64le
    ? createRequire(path.resolve(dir, "../../node-runtime/addons/package.json")).resolve("node-pty")
    : fileURLToPath(import.meta.resolve(target.nodePtyPackage))
  const ptyRoot = path.resolve(path.dirname(ptyEntry), "..")
  const coreRoot = path.dirname(fileURLToPath(import.meta.resolve("@opentui/core/node-assets")))
  const opentuiAssets = ppc64le
    ? [
        { key: "@opentui/core-linux-ppc64/libopentui.so", source: path.resolve(dir, "../../node-runtime/native/ppc64le/libopentui.so") },
        { key: "@opentui/core/parser.worker.js", source: path.join(coreRoot, "parser.worker.js") },
        ...(await collectFiles(path.join(coreRoot, "assets"))).map((key) => ({
          key: `@opentui/core/assets/${key.replaceAll(path.sep, "/")}`,
          source: path.join(coreRoot, "assets", key),
        })),
      ]
    : getNodeAssets({
        platform: target.platform,
        arch: target.arch as "arm64" | "x64",
        ...(target.platform === "linux" ? { libc: "glibc" as const } : {}),
      })
  const assets: NodeAsset[] = [
    ...opentuiAssets,
    {
      key: target.parcelWatcherAsset,
      source: ppc64le
        ? path.dirname(createRequire(path.resolve(dir, "../core/package.json")).resolve("@parcel/watcher/package.json")) + "/build/Release/watcher.node"
        : fileURLToPath(import.meta.resolve(target.parcelWatcherPackage)),
    },
    ...(target.fffAsset && target.fffPackage
      ? [{ key: target.fffAsset, source: fileURLToPath(import.meta.resolve(target.fffPackage)) }]
      : []),
    ...(target.fffFfiAsset && target.fffFfiPackage
      ? [{ key: target.fffFfiAsset, source: fileURLToPath(import.meta.resolve(target.fffFfiPackage)) }]
      : []),
    {
      key: photonWasmAsset,
      source: fileURLToPath(import.meta.resolve(photonWasmAsset)),
    },
    ...Object.values(shellParserWasmAssets).map((key) => ({
      key,
      source: fileURLToPath(import.meta.resolve(key)),
    })),
    ...attentionSoundAssets.map((key) => ({
      key,
      source: path.resolve(dir, "../ui/src/assets/audio", path.basename(key)),
    })),
    ...(opencodePty && target.opencodePtyAsset ? [{ key: target.opencodePtyAsset, source: opencodePty.source }] : []),
    ...(await collectFiles(ptyRoot))
      .filter((relative) => !relative.endsWith(".map") && !relative.endsWith(".pdb"))
      .map((relative) => ({
        key: `${target.nodePtyPackage}/${relative}`,
        source: path.join(ptyRoot, relative),
      })),
  ]
  const unique = [...new Map(assets.map((asset) => [asset.key, asset])).values()]
  await Promise.all(unique.map((asset) => stat(asset.source)))
  return unique
}

export async function hashNodeAssets(assets: readonly NodeAsset[]) {
  const hash = createHash("sha256")
  for (const asset of assets.toSorted((left, right) => left.key.localeCompare(right.key))) {
    hash.update(asset.key)
    hash.update(await readFile(asset.source))
  }
  return hash.digest("hex").slice(0, 16)
}

export async function copyNodeAssets(assets: readonly NodeAsset[]) {
  const root = path.join(dir, "dist-node", "assets")
  await Promise.all(
    assets.map(async (asset) => {
      const target = path.join(root, asset.key)
      await mkdir(path.dirname(target), { recursive: true })
      await copyFile(asset.source, target)
    }),
  )
}

export async function seaAssetMap() {
  const root = path.join(dir, "dist-node", "assets")
  return Object.fromEntries(
    (await collectFiles(root)).map((key) => [key.replaceAll(path.sep, "/"), path.join(root, key)]),
  )
}
