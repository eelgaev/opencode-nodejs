import { existsSync } from "node:fs"
import { registerHooks } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// The selected upstream tests use bun:test but do not call Bun runtime APIs.
const packagesURL =
  pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../packages")).href + "/"
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "bun:test") {
      return { url: new URL("./node-test-assert.mjs", import.meta.url).href, shortCircuit: true }
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(packagesURL) &&
      !context.parentURL.includes("/node_modules/")
    ) {
      const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      const source = target.endsWith(".js") ? target.slice(0, -3) : target
      const file = [source + ".ts", source + ".tsx", path.join(source, "index.ts")].find(existsSync)
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
