import { describe, expect, it } from "vitest"
import {
  CARD_TRANSITIONS,
  canTransition,
  eventTypeForTransition,
  generateCardNumber,
  isValidLuhn,
  luhnCheckDigit,
  maskCardNumber,
} from "./cards"
import { CardStatus } from "@/data/types"

/**
 * Generated numbers always sit on the 4242 test BIN with a valid Luhn check
 * digit. Nothing here may resemble a real PAN: every literal below starts
 * with 4242.
 */

describe("generateCardNumber", () => {
  it("starts with the 4242 test BIN and is 16 digits", () => {
    const number = generateCardNumber()
    expect(number).toMatch(/^4242\d{12}$/)
    expect(number).toHaveLength(16)
  })

  it("passes isValidLuhn", () => {
    expect(isValidLuhn(generateCardNumber())).toBe(true)
  })

  it("is deterministic with an injected RNG", () => {
    const sequence = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05, 0.15]
    let i = 0
    const random = () => sequence[i++ % sequence.length]
    const first = generateCardNumber(random)
    i = 0
    const second = generateCardNumber(random)
    expect(first).toBe(second)
    expect(first).toMatch(/^4242/)
  })
})

describe("isValidLuhn", () => {
  it("rejects a number with one digit changed", () => {
    const number = generateCardNumber()
    const lastDigit = Number(number[number.length - 1])
    const flipped = number.slice(0, -1) + ((lastDigit + 1) % 10).toString()
    expect(isValidLuhn(flipped)).toBe(false)
  })

  it("accepts a known valid test number", () => {
    expect(isValidLuhn("4242424242424242")).toBe(true)
  })
})

describe("luhnCheckDigit", () => {
  it("computes the check digit for a known value", () => {
    expect(luhnCheckDigit("424242424242424")).toBe(2)
  })
})

describe("maskCardNumber", () => {
  it("renders bullet, space, last four", () => {
    expect(maskCardNumber("4242")).toBe("•••• 4242")
  })
})

describe("CARD_TRANSITIONS and canTransition", () => {
  it("allows every documented transition", () => {
    expect(canTransition("active", "frozen")).toBe(true)
    expect(canTransition("active", "cancelled")).toBe(true)
    expect(canTransition("frozen", "active")).toBe(true)
    expect(canTransition("frozen", "cancelled")).toBe(true)
  })

  it("disallows every other transition", () => {
    expect(canTransition("active", "active")).toBe(false)
    expect(canTransition("frozen", "frozen")).toBe(false)
    expect(canTransition("cancelled", "active")).toBe(false)
    expect(canTransition("cancelled", "frozen")).toBe(false)
    expect(canTransition("cancelled", "cancelled")).toBe(false)
  })

  it("makes cancelled terminal with no outbound transitions", () => {
    const statuses: CardStatus[] = ["active", "frozen", "cancelled"]
    expect(CARD_TRANSITIONS.cancelled).toHaveLength(0)
    for (const to of statuses) {
      expect(canTransition("cancelled", to)).toBe(false)
    }
  })
})

describe("eventTypeForTransition", () => {
  it("maps frozen to the frozen event", () => {
    expect(eventTypeForTransition("frozen")).toBe("frozen")
  })

  it("maps active to the unfrozen event", () => {
    expect(eventTypeForTransition("active")).toBe("unfrozen")
  })

  it("maps cancelled to the cancelled event", () => {
    expect(eventTypeForTransition("cancelled")).toBe("cancelled")
  })
})
