import {
  CARD_CATEGORIES,
  CARD_CURRENCIES,
  MAX_SPEND_LIMIT,
  canTransition,
  eventTypeForTransition,
  generateCardNumber,
} from "@/lib/cards"
import { merchantById } from "./merchants"
import { store } from "./store"
import { Card, CardCategory, CardStatus, Currency, IssueCardInput } from "./types"

/**
 * Server-side validation allowlists and store operations for cards.
 *
 * Everything the client sends is checked here before it reaches the store.
 * The full card number is generated and returned exactly once, from
 * `issueCard`; nothing else in this module ever exposes it.
 */

export { CARD_CATEGORIES, CARD_CURRENCIES, MAX_SPEND_LIMIT }

type ValidationResult =
  | { ok: true; value: IssueCardInput }
  | { ok: false; message: string }

/** Validates an unknown request body against the card issue allowlist. */
export function validateIssueCardInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Request body must be an object." }
  }

  const input = body as Record<string, unknown>

  const merchantId = input.merchantId
  const merchant = typeof merchantId === "string" ? merchantById(merchantId) : null
  if (typeof merchantId !== "string" || !merchant) {
    return { ok: false, message: "Merchant is required and must be a known merchant." }
  }

  const nickname = input.nickname
  if (typeof nickname !== "string" || nickname.trim().length === 0) {
    return { ok: false, message: "Nickname is required." }
  }
  if (nickname.length > 60) {
    return { ok: false, message: "Nickname must be 60 characters or fewer." }
  }

  const spendLimit = input.spendLimit
  if (
    typeof spendLimit !== "number" ||
    !Number.isInteger(spendLimit) ||
    spendLimit <= 0 ||
    spendLimit > MAX_SPEND_LIMIT
  ) {
    return {
      ok: false,
      message: "Spend limit must be more than 0 and at most 50,000.00 (5,000,000 minor units).",
    }
  }

  const currency = input.currency
  if (typeof currency !== "string" || !CARD_CURRENCIES.includes(currency as Currency)) {
    return { ok: false, message: "Currency must be one of USD, EUR, GBP." }
  }
  if (currency !== merchant.currency) {
    return {
      ok: false,
      message: `Currency must match the merchant's currency (${merchant.currency}).`,
    }
  }

  const category = input.category ?? "any"
  if (typeof category !== "string" || !CARD_CATEGORIES.includes(category as CardCategory)) {
    return { ok: false, message: "Category is not recognized." }
  }

  return {
    ok: true,
    value: {
      merchantId,
      nickname: nickname.trim(),
      spendLimit,
      currency: currency as Currency,
      category: category as CardCategory,
    },
  }
}

/** The card an earlier request with this Idempotency-Key already issued, if any. */
export function issuedCardForKey(key: string): Card | null {
  const id = store.issuedCardKeys[key]
  return id ? cardById(id) : null
}

/**
 * Generates the number, stores a card carrying only `last4` and
 * `numberRef`, and returns the full number alongside the card. This is the
 * only place the full number ever leaves the server. The optional key makes
 * a retried request return the same card instead of issuing a second one.
 */
export function issueCard(
  input: IssueCardInput,
  idempotencyKey?: string,
): { card: Card; number: string } {
  const number = generateCardNumber()
  const last4 = number.slice(-4)
  const createdAt = new Date().toISOString()

  const card: Card = {
    id: nextCardId(),
    merchantId: input.merchantId,
    nickname: input.nickname,
    last4,
    numberRef: `cn_${crypto.randomUUID()}`,
    spendLimit: input.spendLimit,
    spent: 0,
    currency: input.currency,
    status: "active",
    category: input.category,
    createdAt,
    events: [{ type: "issued", at: createdAt }],
  }

  store.cards.push(card)
  if (idempotencyKey) store.issuedCardKeys[idempotencyKey] = card.id
  return { card, number }
}

/** Sequential ids in the seed style: one past the highest suffix already stored. */
function nextCardId(): string {
  const highest = store.cards.reduce((max, card) => {
    const suffix = Number(card.id.replace("card_", ""))
    return Number.isFinite(suffix) && suffix > max ? suffix : max
  }, 0)
  return `card_${String(highest + 1).padStart(2, "0")}`
}

/** All cards, newest first. */
export function listCards(): Card[] {
  return [...store.cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function cardById(id: string): Card | null {
  return store.cards.find((c) => c.id === id) ?? null
}

type TransitionResult =
  | { ok: true; card: Card }
  | { ok: false; status: 404 | 409; message: string }

/** Guards a status transition against the state machine before applying it. */
export function transitionCard(id: string, to: CardStatus): TransitionResult {
  const card = cardById(id)
  if (!card) {
    return { ok: false, status: 404, message: "Card not found." }
  }

  if (!canTransition(card.status, to)) {
    return {
      ok: false,
      status: 409,
      message: `Cannot move a card from ${card.status} to ${to}.`,
    }
  }

  card.status = to
  card.events.push({ type: eventTypeForTransition(to), at: new Date().toISOString() })
  return { ok: true, card }
}
