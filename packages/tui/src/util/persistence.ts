import path from "path"
import { appendFile, mkdir, readFile, rename, rm, writeFile } from "fs/promises"

export function readText(filePath: string) {
  return typeof Bun !== "undefined" ? Bun.file(filePath).text() : readFile(filePath, "utf8")
}

export function readJson<T>(filePath: string) {
  return typeof Bun !== "undefined"
    ? (Bun.file(filePath).json() as Promise<T>)
    : readFile(filePath, "utf8").then((content) => JSON.parse(content) as T)
}

export async function writeText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await (typeof Bun !== "undefined" ? Bun.write(filePath, content) : writeFile(filePath, content))
}

export async function appendText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, content)
}

export async function writeJsonAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`
  await (
    typeof Bun !== "undefined"
      ? Bun.write(temporary, JSON.stringify(value))
      : writeFile(temporary, JSON.stringify(value))
  ).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
  await rename(temporary, filePath).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
}
