import { spawnSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { promisify } from "node:util"
import { brotliCompress, constants } from "node:zlib"
import { AppArchive } from "../src/app-archive"
import { collectFiles } from "./files"

export async function buildAppArchive(channel: string, options?: { skipBuild?: boolean }) {
  if (options?.skipBuild) return AppArchive.encode([])
  const root = path.resolve(import.meta.dirname, "../../app")
  const vite = path.join(path.dirname(createRequire(path.join(root, "package.json")).resolve("vite/package.json")), "bin/vite.js")
  const build = spawnSync(process.execPath, [vite, "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, OPENCODE_CHANNEL: channel, VITE_OPENCODE_SERVER_MODE: "origin" },
  })
  if (build.error) throw build.error
  if (build.status !== 0) throw new Error(`Web UI build exited with status ${build.status ?? "unknown"}`)
  return AppArchive.encode(
    await Promise.all(
      (await collectFiles(path.join(root, "dist")))
        .map((key) => key.replaceAll(path.sep, "/"))
        .filter((key) => !key.endsWith(".map"))
        .toSorted()
        .map(async (key) => {
          const body = await readFile(path.join(root, "dist", key))
          // Independent entries let the server materialize only assets the browser requests.
          return [key, await compress(body)] as const
        }),
    ),
  )
}

// The assets compress once per release, so they take brotli's best quality: about 11% smaller than quality 6 for the
// web UI. Each runs on the thread pool, which keeps the build to about a minute.
function compress(body: Buffer) {
  return promisify(brotliCompress)(body, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length },
  })
}
