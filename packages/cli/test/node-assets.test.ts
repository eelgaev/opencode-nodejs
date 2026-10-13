import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { collectNodeAssets } from "../script/node-assets"
import { nodeTarget, shellParserWasmAssets } from "../src/node/target"

test("collects each SEA asset key once", async () => {
  const assets = await collectNodeAssets(nodeTarget(process.platform, process.arch))
  const keys = assets.map((asset) => asset.key)

  expect(new Set(keys).size).toBe(keys.length)
  if (process.platform !== "win32") expect(keys.filter((key) => key === "opencode-pty/opencode-pty")).toHaveLength(1)
  expect(assets.filter((asset) => asset.key === shellParserWasmAssets.runtime)).toEqual([
    {
      key: shellParserWasmAssets.runtime,
      source: fileURLToPath(import.meta.resolve(shellParserWasmAssets.runtime)),
    },
  ])
})

test("maps Node's ppc64 architecture to the ppc64le source build", () => {
  const target = nodeTarget("linux", "ppc64")
  expect(target.nodePtyPackage).toBe("node-pty")
  expect(target.parcelWatcherAsset).toBe("@parcel/watcher/watcher.node")
  expect(target.fffAsset).toBeUndefined()
  expect(target.opencodePtyAsset).toBeUndefined()
})
