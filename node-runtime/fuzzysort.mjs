// Node exposes this CommonJS package as a default export, while the TUI also
// imports its methods through an ESM namespace.
const source = new URL(import.meta.url).searchParams.get("source")
if (!source) throw new Error("Missing fuzzysort source URL")
const module = await import(source)
const fuzzysort = module.default

export default fuzzysort
export const go = fuzzysort.go
export const single = fuzzysort.single
export const prepare = fuzzysort.prepare
export const cleanup = fuzzysort.cleanup
