import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { isMainThread, threadId } from "node:worker_threads"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const cache = path.join(root, "node-runtime/.cache/transform")
const lockfile = readFileSync(path.join(root, "pnpm-lock.yaml"))
const cacheVersion = createHash("sha256")
  .update(transform.toString())
  .update(lockfile)
  .update(process.versions.node)
  .digest("hex")
const resolveCached = createResolveCache()

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "fuzzysort" &&
      context.parentURL?.startsWith(pathToFileURL(path.join(root, "packages/tui")).href + "/")
    ) {
      const url = pathToFileURL(path.join(root, "node-runtime/fuzzysort.mjs"))
      url.searchParams.set("source", nextResolve(specifier, context).url)
      return { url: url.href, shortCircuit: true }
    }
    if (specifier === "solid-js" || specifier.startsWith("solid-js/")) {
      return nextResolve(specifier, { ...context, conditions: ["browser", ...context.conditions] })
    }
    if (specifier.startsWith("@/") && context.parentURL?.includes("/packages/opencode/")) {
      const base = path.join(root, "packages/opencode/src", specifier.slice(2))
      const file = [base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")].find(
        (item) => existsSync(item),
      )
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(path.join(root, "packages")).href)) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      const source = base.endsWith(".js") ? base.slice(0, -3) : base
      const file = [
        source + ".ts",
        source + ".tsx",
        path.join(source, "index.ts"),
        path.join(source, "index.tsx"),
      ].find((item) => existsSync(item))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return resolveCached(specifier, context, nextResolve)
  },
  load(url, context, nextLoad) {
    if (url.includes("/node_modules/@opentui/core/chunk-node-") && url.endsWith(".js")) {
      const result = nextLoad(url, context)
      const source = String(result.source)
      const original = `  processResize(width, height) {
    if (width === this._terminalWidth && height === this._terminalHeight)
      return;`
      return {
        ...result,
        source: source
          .replace(
            original,
            `  processResize(width, height) {
    if (width === this._terminalWidth && height === this._terminalHeight) {
      // A rapid resize can return to the same size after the terminal cleared its display.
      this.forceFullRepaintRequested = true;
      this.requestRender();
      return;
    }`,
          )
          .replace(
            `  render(buffer, deltaTime) {
    if (!this.visible)
      return;
    for (const renderable of this._ctx.getLifecyclePasses()) {`,
            `  render(buffer, deltaTime) {
    if (!this.visible)
      return;
    // Native buffer reuse can retain a clip from the previous frame.
    buffer.clearScissorRects();
    for (const renderable of this._ctx.getLifecyclePasses()) {`,
          )
          .replace(
            `  const pointerArgIndexes = (definition.args ?? []).flatMap((type, index) => isNodePointerArgumentType(type) ? [index] : []);
  if (pointerArgIndexes.length === 0) {`,
            `  const pointerArgIndexes = (definition.args ?? []).flatMap((type, index) => isNodePointerArgumentType(type) ? [index] : []);
  const unsignedArgIndexes = (definition.args ?? []).flatMap((type, index) => type === FFIType.u32 || type === FFIType.uint32_t ? [index] : []);
  if (pointerArgIndexes.length === 0 && unsignedArgIndexes.length === 0) {`,
          )
          .replace(
            `      normalizedArgs[index] = toNodePointerArgument(normalizedArgs[index]);
    }
    return fn(...normalizedArgs);`,
            `      normalizedArgs[index] = toNodePointerArgument(normalizedArgs[index]);
    }
    // Render coordinates can be negative before the native buffer clips them.
    // Bun wraps these to u32; Node's FFI rejects negative numbers.
    for (const index of unsignedArgIndexes) {
      if (typeof normalizedArgs[index] === "number" && normalizedArgs[index] < 0)
        normalizedArgs[index] >>>= 0;
    }
    return fn(...normalizedArgs);`,
          ),
      }
    }
    if (url.startsWith(pathToFileURL(path.join(root, "packages")).href) && /\.tsx?$/.test(new URL(url).pathname)) {
      const file = fileURLToPath(url)
      const source = readFileSync(file, "utf8")
      const key = createHash("sha256").update(cacheVersion).update(file).update(source).digest("hex")
      const target = path.join(cache, `${key}.js`)
      const cached = existsSync(target) ? readFileSync(target, "utf8") : undefined
      const code = cached ?? transform(file, source)
      if (cached === undefined) {
        try {
          mkdirSync(cache, { recursive: true })
          const temporary = `${target}.${process.pid}.${threadId}`
          writeFileSync(temporary, code)
          renameSync(temporary, target)
        } catch {
          // Source transforms still work when the checkout is read-only.
        }
      }
      return {
        format: "module",
        source: code,
        shortCircuit: true,
      }
    }
    if (url.startsWith("file:") && /\.(txt|md)$/.test(new URL(url).pathname)) {
      return {
        format: "module",
        source: `export default ${JSON.stringify(readFileSync(fileURLToPath(url), "utf8"))}`,
        shortCircuit: true,
      }
    }
    if (url.startsWith("file:") && /\.(mp3|wasm)$/.test(new URL(url).pathname)) {
      return {
        format: "module",
        source: `export default ${JSON.stringify(fileURLToPath(url))}`,
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})

function createResolveCache() {
  if (process.env.OPENCODE_NODE_RESOLVE_CACHE === "0") return (specifier, context, nextResolve) => nextResolve(specifier, context)

  const manifest = path.join(root, "package.json")
  const packages = (JSON.parse(readFileSync(manifest, "utf8")).workspaces?.packages ?? [])
    .flatMap((entry) => {
      if (!entry.endsWith("/*")) return [path.join(root, entry, "package.json")]
      const directory = path.join(root, entry.slice(0, -2))
      if (!existsSync(directory)) return []
      return readdirSync(directory, { withFileTypes: true })
        .filter((child) => child.isDirectory())
        .map((child) => path.join(directory, child.name, "package.json"))
    })
    .filter((file) => existsSync(file))
    .sort()
  const hash = createHash("sha256")
    .update(root)
    .update(process.versions.node)
    .update(process.platform)
    .update(process.arch)
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .update(lockfile)
    .update(readFileSync(manifest))
  packages.forEach((file) => hash.update(file).update(readFileSync(file)))
  if (existsSync(path.join(root, "node_modules/.modules.yaml"))) {
    hash.update(readFileSync(path.join(root, "node_modules/.modules.yaml")))
  }

  const file = path.join(root, "node-runtime/.cache/resolve", hash.digest("hex") + ".json")
  const prefix = pathToFileURL(root).href + "/"
  const entries = readResolveCache(file)
  let dirty = false

  process.on("exit", () => {
    if (!isMainThread || !dirty) return
    try {
      mkdirSync(path.dirname(file), { recursive: true })
      const temporary = `${file}.${process.pid}.${threadId}`
      writeFileSync(temporary, JSON.stringify({ ...readResolveCache(file), ...entries }))
      renameSync(temporary, file)
    } catch {
      // Module resolution still works when the checkout is read-only.
    }
  })

  return (specifier, context, nextResolve) => {
    if (!context.parentURL?.startsWith(prefix)) return nextResolve(specifier, context)
    const key = JSON.stringify([specifier, context.parentURL, context.conditions, context.importAttributes])
    if (entries[key]?.url?.startsWith(prefix)) return { ...entries[key], shortCircuit: true }
    const result = nextResolve(specifier, context)
    if (result.url.startsWith(prefix)) {
      entries[key] = { url: result.url, format: result.format }
      dirty = true
    }
    return result
  }
}

function readResolveCache(file) {
  try {
    const data = JSON.parse(readFileSync(file, "utf8"))
    return data && typeof data === "object" && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

function transform(file, source) {
  if (file.endsWith(".tsx")) {
    const { transformSync } = require("@babel/core")
    return transformSync(source, {
      filename: file,
      cwd: root,
      configFile: false,
      babelrc: false,
      presets: [
        ["babel-preset-solid", { moduleName: "@opentui/solid", generate: "universal" }],
        ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
      ],
    }).code
  }
  const ts = require("typescript")
  return ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
  }).outputText
}
