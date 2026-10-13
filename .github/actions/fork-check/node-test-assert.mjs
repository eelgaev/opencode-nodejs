import assert from "node:assert/strict"

export { describe, test } from "node:test"

// Only the matchers used by the selected Node-compatible upstream tests belong here.
export function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected)
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected)
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined)
    },
    toHaveLength(expected) {
      assert.strictEqual(actual.length, expected)
    },
  }
}
