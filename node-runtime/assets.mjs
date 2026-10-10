import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { threadId } from "node:worker_threads"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const cache = path.join(root, "node-runtime/.cache/transform")
const cacheVersion = createHash("sha256")
  .update(readFileSync(fileURLToPath(import.meta.url)))
  .update(readFileSync(path.join(root, "pnpm-lock.yaml")))
  .update(process.versions.node)
  .digest("hex")

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
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
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

function transform(file, source) {
  if (file.endsWith(".tsx")) {
    const { transformSync } = require("@babel/core")
    return transformSync(source, {
      filename: file,
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
