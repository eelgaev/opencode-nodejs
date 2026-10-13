import { existsSync } from "node:fs"
import { registerHooks } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const packages = pathToFileURL(path.resolve(import.meta.dirname, "../packages")).href + "/"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(".") || !context.parentURL?.startsWith(packages)) return nextResolve(specifier, context)
    const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    const source = target.endsWith(".js") ? target.slice(0, -3) : target
    const file = [source + ".ts", source + ".tsx", path.join(source, "index.ts")].find(existsSync)
    return file ? { url: pathToFileURL(file).href, shortCircuit: true } : nextResolve(specifier, context)
  },
})
