import { beforeEach, describe, expect, it } from "vitest"
import {
  cardById,
  issueCard,
  issuedCardForKey,
  listCards,
  transitionCard,
  validateIssueCardInput,
} from "./cards"
import { merchants } from "./merchants"
import { store } from "./store"

/**
 * Validation guards the boundary before anything reaches the store; the
 * store operations then guard the reveal-once rule and the status machine.
 */

const merchantId = merchants[0].id

const validBody = {
  merchantId,
  nickname: "Ad platform card",
  spendLimit: 100_000,
  currency: "USD",
  category: "advertising",
}

describe("validateIssueCardInput", () => {
  it("accepts a valid body", () => {
    const result = validateIssueCardInput(validBody)
    expect(result.ok).toBe(true)
  })

  it("defaults category to any when absent", () => {
    const { category, ...withoutCategory } = validBody
    void category
    const result = validateIssueCardInput(withoutCategory)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.category).toBe("any")
  })

  it("rejects a missing merchant", () => {
    const { merchantId: _drop, ...rest } = validBody
    void _drop
    const result = validateIssueCardInput(rest)
    expect(result.ok).toBe(false)
  })

  it("rejects an unknown merchant", () => {
    const result = validateIssueCardInput({ ...validBody, merchantId: "mch_does_not_exist" })
    expect(result.ok).toBe(false)
  })

  it.each([0, -1, 5_000_001, 25000.5])("rejects a spend limit of %s", (spendLimit) => {
    const result = validateIssueCardInput({ ...validBody, spendLimit })
    expect(result.ok).toBe(false)
  })

  it("rejects a currency outside the allowlist", () => {
    const result = validateIssueCardInput({ ...validBody, currency: "JPY" })
    expect(result.ok).toBe(false)
  })

  it("rejects a currency that does not match the merchant's currency", () => {
    const result = validateIssueCardInput({ ...validBody, currency: "GBP" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain("must match the merchant")
  })

  it("rejects a category outside the allowlist", () => {
    const result = validateIssueCardInput({ ...validBody, category: "groceries" })
    expect(result.ok).toBe(false)
  })

  it("rejects a body that is not an object", () => {
    expect(validateIssueCardInput(null).ok).toBe(false)
    expect(validateIssueCardInput("nope").ok).toBe(false)
  })

  it("rejects a blank or overlong nickname", () => {
    expect(validateIssueCardInput({ ...validBody, nickname: "  " }).ok).toBe(false)
    expect(validateIssueCardInput({ ...validBody, nickname: "x".repeat(61) }).ok).toBe(false)
  })
})

describe("issueCard", () => {
  it("returns the same card for a repeated Idempotency-Key and records no second card", () => {
    const input = {
      merchantId,
      nickname: "Retry",
      spendLimit: 1_000,
      currency: "USD" as const,
      category: "any" as const,
    }
    const before = listCards().length
    const { card } = issueCard(input, "key-retry")

    expect(issuedCardForKey("key-retry")).toBe(card)
    expect(issuedCardForKey("key-unknown")).toBeNull()
    expect(listCards().length).toBe(before + 1)
  })

  it("gives consecutive cards distinct ids and number references", () => {
    const input = {
      merchantId,
      nickname: "Twin",
      spendLimit: 1_000,
      currency: "USD" as const,
      category: "any" as const,
    }
    const first = issueCard(input).card
    const second = issueCard(input).card

    expect(second.id).not.toBe(first.id)
    expect(second.numberRef).not.toBe(first.numberRef)
    expect(cardById(second.id)).toBe(second)
  })

  it("returns a full number on the 4242 test BIN and a card with no number", () => {
    const { card, number } = issueCard({
      merchantId,
      nickname: "New card",
      spendLimit: 50_000,
      currency: "USD",
      category: "any",
    })

    expect(number.startsWith("4242")).toBe(true)
    expect(number).toHaveLength(16)
    expect(card.last4).toBe(number.slice(-4))

    const serialized = JSON.stringify(card)
    expect(serialized).not.toMatch(/\d{16}/)
  })
})

describe("listCards", () => {
  it("excludes full numbers from every record", () => {
    issueCard({
      merchantId,
      nickname: "Another card",
      spendLimit: 25_000,
      currency: "USD",
      category: "any",
    })

    const serialized = JSON.stringify(listCards())
    expect(serialized).not.toMatch(/\d{16}/)
  })
})

describe("transitionCard", () => {
  beforeEach(() => {
    store.cards.length = 0
  })

  it("allows active to frozen and back to active", () => {
    const { card } = issueCard({
      merchantId,
      nickname: "Transition card",
      spendLimit: 10_000,
      currency: "USD",
      category: "any",
    })

    const toFrozen = transitionCard(card.id, "frozen")
    expect(toFrozen.ok).toBe(true)
    if (toFrozen.ok) expect(toFrozen.card.status).toBe("frozen")

    const toActive = transitionCard(card.id, "active")
    expect(toActive.ok).toBe(true)
    if (toActive.ok) expect(toActive.card.status).toBe("active")
  })

  it("rejects moving a cancelled card back to active with 409", () => {
    const { card } = issueCard({
      merchantId,
      nickname: "Cancelled card",
      spendLimit: 10_000,
      currency: "USD",
      category: "any",
    })
    transitionCard(card.id, "cancelled")

    const result = transitionCard(card.id, "active")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(409)
  })

  it("returns 404 for an unknown card id", () => {
    const result = transitionCard("card_does_not_exist", "frozen")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(404)
  })
})

describe("cardById", () => {
  it("finds an issued card and returns null for an unknown id", () => {
    const { card } = issueCard({
      merchantId,
      nickname: "Findable card",
      spendLimit: 10_000,
      currency: "USD",
      category: "any",
    })
    expect(cardById(card.id)?.id).toBe(card.id)
    expect(cardById("card_does_not_exist")).toBeNull()
  })
})
