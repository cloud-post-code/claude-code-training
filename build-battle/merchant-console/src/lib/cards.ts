import { CardCategory, CardEventType, CardStatus, Currency } from "@/data/types"

/**
 * Virtual card numbers are always on the 4242 test BIN with a valid Luhn
 * check digit. Nothing here may resemble a real PAN. The full number is
 * returned exactly once, in the creation response; after that only the
 * last four digits and a masked form ever exist.
 */

const TEST_BIN = "4242"

/** Allowlists. Anything from the client is checked against these on the server. */
export const CARD_CURRENCIES: readonly Currency[] = ["USD", "EUR", "GBP"]

export const CARD_STATUSES: readonly CardStatus[] = ["active", "frozen", "cancelled"]

export const CARD_CATEGORIES: readonly CardCategory[] = [
  "any",
  "advertising",
  "software",
  "contractors",
  "travel",
  "office",
]

/** Upper bound on a spend limit, in minor units (50,000.00). */
export const MAX_SPEND_LIMIT = 5_000_000

/** Display labels for the category lock. `any` means the card is not locked. */
export const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  any: "Any category",
  advertising: "Advertising",
  software: "Software",
  contractors: "Contractors",
  travel: "Travel",
  office: "Office",
}

/** Check digit for a partial number string, via the standard Luhn algorithm. */
export function luhnCheckDigit(digits: string): number {
  let sum = 0
  let double = true
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = Number(digits[i]) * (double ? 2 : 1)
    if (value > 9) value -= 9
    sum += value
    double = !double
  }
  return (10 - (sum % 10)) % 10
}

/** True when the full number passes the Luhn checksum. */
export function isValidLuhn(number: string): boolean {
  if (!/^\d+$/.test(number)) return false
  const body = number.slice(0, -1)
  const checkDigit = Number(number.slice(-1))
  return luhnCheckDigit(body) === checkDigit
}

/**
 * 16 digits: the 4242 test BIN, 11 random digits, then the Luhn check digit.
 * Accepts an injectable RNG so seed data can generate deterministically.
 */
export function generateCardNumber(random: () => number = Math.random): string {
  let body = TEST_BIN
  for (let i = 0; i < 11; i++) {
    body += Math.floor(random() * 10).toString()
  }
  return body + luhnCheckDigit(body).toString()
}

/** Display form: bullet, space, last four. Never the full number. */
export function maskCardNumber(last4: string): string {
  return `•••• ${last4}`
}

/** active ⇄ frozen, either to cancelled, and cancelled is terminal. */
export const CARD_TRANSITIONS: Record<CardStatus, readonly CardStatus[]> = {
  active: ["frozen", "cancelled"],
  frozen: ["active", "cancelled"],
  cancelled: [],
}

/** Guards a status transition against the state machine above. */
export function canTransition(from: CardStatus, to: CardStatus): boolean {
  return CARD_TRANSITIONS[from].includes(to)
}

/** The event type recorded when a card moves to a given status. */
export function eventTypeForTransition(to: CardStatus): CardEventType {
  if (to === "frozen") return "frozen"
  if (to === "cancelled") return "cancelled"
  return "unfrozen"
}
