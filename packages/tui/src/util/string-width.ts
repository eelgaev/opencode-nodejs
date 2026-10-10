import width from "string-width"

export function stringWidth(value: string) {
  return typeof Bun !== "undefined" ? Bun.stringWidth(value) : width(value)
}
