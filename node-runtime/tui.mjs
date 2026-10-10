import { createRequire } from "node:module"
import { TuiThreadCommand } from "../packages/opencode/src/cli/cmd/tui.ts"
import { Heap } from "../packages/opencode/src/cli/heap.ts"

const yargs = createRequire(new URL("../packages/opencode/package.json", import.meta.url))("yargs")

process.env.OPENCODE_FAST_BOOT ??= "1"
Heap.start()
process.env.AGENT = "1"
process.env.OPENCODE = "1"
process.env.OPENCODE_PID = String(process.pid)

await yargs([]).parserConfiguration({ "populate--": true }).scriptName("opencode").command(TuiThreadCommand).parse()
