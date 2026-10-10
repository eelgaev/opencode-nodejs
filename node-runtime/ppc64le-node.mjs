import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { copyFile, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

// This identifies the locally built Node 26.11.1 binary on the ppc64le host.
// Other builds should apply patches/node-libffi-ppc64le-toc.patch at build time.
const originalHash = "567fb427f1f9bb4989944f529b1dc134bbbb1da4bc96017235d716cd60d75baa"
const patchedHash = "bed94c00c77b28c16c02edcbc3120b09ee4961ede79304fa9253f305e0f0b4a3"
const patches = [
  { offset: 0x129167e4 - 0x10000000, before: "180041f8", after: "18005cf8" },
  { offset: 0x129168d0 - 0x10000000, before: "180041e8", after: "18005ce8" },
]

export async function prepareNode() {
  const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "native/ppc64le/node-ffi-fixed")
  const cache = target + ".cache.json"
  const sourceState = await stat(process.execPath, { bigint: true })
  const targetState = await stat(target, { bigint: true }).catch(() => undefined)
  const verified = await readFile(cache, "utf8").then(JSON.parse).catch(() => undefined)
  if (
    targetState &&
    verified?.originalHash === originalHash &&
    verified.patchedHash === patchedHash &&
    verified.source === fingerprint(sourceState) &&
    verified.target === fingerprint(targetState)
  )
    return target

  const sourceHash = await hash(process.execPath)
  if (sourceHash === patchedHash || sourceHash !== originalHash) return process.execPath

  if (targetState && (await hash(target)) === patchedHash) {
    await remember(cache, sourceState, target)
    return target
  }

  await mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}`
  await copyFile(process.execPath, temporary)
  try {
    const file = await open(temporary, "r+")
    try {
      for (const patch of patches) {
        const actual = Buffer.alloc(4)
        await file.read(actual, 0, 4, patch.offset)
        if (actual.toString("hex") !== patch.before) throw new Error(`Unexpected Node FFI instruction at ${patch.offset}`)
        await file.write(Buffer.from(patch.after, "hex"), 0, 4, patch.offset)
      }
    } finally {
      await file.close()
    }
    if ((await hash(temporary)) !== patchedHash) throw new Error("PPC64LE Node FFI patch verification failed")
    await rename(temporary, target)
  } finally {
    await unlink(temporary).catch(() => undefined)
  }
  await remember(cache, sourceState, target)
  return target
}

async function remember(cache, sourceState, target) {
  const targetState = await stat(target, { bigint: true })
  await writeFile(
    cache,
    JSON.stringify({
      originalHash,
      patchedHash,
      source: fingerprint(sourceState),
      target: fingerprint(targetState),
    }),
  ).catch(() => undefined)
}

function fingerprint(state) {
  return [state.dev, state.ino, state.size, state.mtimeNs, state.ctimeNs].join(":")
}

async function hash(file) {
  const digest = createHash("sha256")
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  return digest.digest("hex")
}
