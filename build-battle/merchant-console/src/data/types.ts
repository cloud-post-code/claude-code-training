export type Currency = "USD" | "EUR" | "GBP"

export type PaymentStatus =
  | "authorized"
  | "captured"
  | "refunded"
  | "failed"
  | "disputed"

export type DisputeStatus = "needs_response" | "under_review" | "won" | "lost"

export type PayoutStatus = "paid" | "in_transit" | "pending"

export interface Merchant {
  id: string
  name: string
  country: string
  /** IANA timezone. Display converts to this; storage never does. */
  timezone: string
  currency: Currency
  riskTier: "low" | "standard" | "elevated"
}

export interface Payment {
  id: string
  merchantId: string
  /** Integer minor units. Never a float. */
  amount: number
  currency: Currency
  status: PaymentStatus
  method: "card" | "wallet" | "bank_transfer"
  cardBrand: "visa" | "mastercard" | "amex" | null
  last4: string | null
  /** ISO 8601, always UTC. */
  createdAt: string
  description: string
}

export interface Refund {
  id: string
  paymentId: string
  amount: number
  currency: Currency
  reason: "requested_by_customer" | "duplicate" | "fraudulent"
  createdAt: string
}

export interface Dispute {
  id: string
  paymentId: string
  merchantId: string
  amount: number
  currency: Currency
  reasonCode: string
  status: DisputeStatus
  openedAt: string
  /** Evidence deadline, UTC. */
  evidenceDueAt: string
}

export interface Payout {
  id: string
  merchantId: string
  periodStart: string
  periodEnd: string
  gross: number
  fees: number
  net: number
  currency: Currency
  status: PayoutStatus
  paymentIds: string[]
}

export interface PaymentFilters {
  status?: PaymentStatus | "all"
  merchantId?: string
  search?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  sort?: "createdAt" | "amount"
  direction?: "asc" | "desc"
}

/**
 * Virtual cards (NWP-201).
 *
 * Status is a state machine: active ⇄ frozen, either to cancelled, and
 * cancelled is terminal. The transition table lives in `src/lib/cards.ts`.
 */
export type CardStatus = "active" | "frozen" | "cancelled"

/** Merchant category lock, chosen at issue time. `any` means no lock. */
export type CardCategory =
  | "any"
  | "advertising"
  | "software"
  | "contractors"
  | "travel"
  | "office"

export type CardEventType = "issued" | "frozen" | "unfrozen" | "cancelled"

export interface CardEvent {
  type: CardEventType
  /** ISO 8601, always UTC. */
  at: string
}

/**
 * A stored card never carries the full number. It carries the last four and
 * a reference to the generated number; the number itself is returned once,
 * in the creation response, and then does not exist anywhere in the store.
 */
export interface Card {
  id: string
  merchantId: string
  nickname: string
  /** Last four digits of the generated number. Always on the 4242 test BIN. */
  last4: string
  /** Opaque reference to the generated number. Not the number. */
  numberRef: string
  /** Integer minor units. Never a float. */
  spendLimit: number
  /** Integer minor units spent so far against the limit. */
  spent: number
  currency: Currency
  status: CardStatus
  category: CardCategory
  /** ISO 8601, always UTC. */
  createdAt: string
  /** Status history, oldest first. The first entry is always `issued`. */
  events: CardEvent[]
}

/** What the issue form sends. Everything here is validated on the server. */
export interface IssueCardInput {
  merchantId: string
  nickname: string
  spendLimit: number
  currency: Currency
  category: CardCategory
}
