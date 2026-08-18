import { describe, expect, it } from "vitest"
import { extractJson, safeParseDate } from "./extraction"

describe("extractJson", () => {
  it("returns clean JSON unchanged", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}')
  })

  it("strips a <think> preamble", () => {
    const input = '<think>reasoning...</think>\n{"a":1}'
    expect(extractJson(input)).toBe('{"a":1}')
  })

  it("strips markdown code fences", () => {
    const input = '```json\n{"a":1}\n```'
    expect(extractJson(input)).toBe('{"a":1}')
  })

  it("falls back to the trimmed input when no braces are found", () => {
    expect(extractJson("no json here")).toBe("no json here")
  })
})

describe("safeParseDate", () => {
  it("parses a valid ISO date", () => {
    const result = safeParseDate("2020-09-13")
    expect(result?.toISOString().slice(0, 10)).toBe("2020-09-13")
  })

  it("returns null for null/undefined input", () => {
    expect(safeParseDate(null)).toBeNull()
    expect(safeParseDate(undefined)).toBeNull()
  })

  it("returns null for unparseable input", () => {
    expect(safeParseDate("not a date")).toBeNull()
  })
})
