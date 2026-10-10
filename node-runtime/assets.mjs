import { existsSync, readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"
import { transformSync } from "@babel/core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

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
      return {
        format: "module",
        source: file.endsWith(".tsx")
          ? transformSync(source, {
              filename: file,
              configFile: false,
              babelrc: false,
              presets: [
                ["babel-preset-solid", { moduleName: "@opentui/solid", generate: "universal" }],
                ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
              ],
            }).code
          : ts.transpileModule(source, {
              fileName: file,
              compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ESNext,
              },
            }).outputText,
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
