import { createRequire } from "node:module"
import type { Opts, Proc } from "./pty"

export type { Disp, Exit, Opts, Proc } from "./pty"

const require = createRequire(import.meta.url)
const pty = (
  process.platform === "linux" && process.arch === "ppc64"
    ? createRequire(new URL("../../../../node-runtime/addons/package.json", import.meta.url))("node-pty")
    : require("@lydell/node-pty")
) as typeof import("@lydell/node-pty")

export function spawn(file: string, args: string[], opts: Opts): Proc {
  const proc = pty.spawn(file, args, {
    ...opts,
    ...(process.platform === "win32" ? { useConptyDll: true } : {}),
  })
  return {
    pid: proc.pid,
    onData(listener) {
      return proc.onData(listener)
    },
    onExit(listener) {
      return proc.onExit(listener)
    },
    write(data) {
      proc.write(data)
    },
    resize(cols, rows) {
      proc.resize(cols, rows)
    },
    kill(signal) {
      proc.kill(signal)
    },
  }
}
