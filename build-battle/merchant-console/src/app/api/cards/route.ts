import { issueCard, issuedCardForKey, listCards, validateIssueCardInput } from "@/data/cards"
import { NextRequest, NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({ cards: listCards() })
}

/**
 * Issues a card. A repeated request carrying the same Idempotency-Key
 * returns the card it already issued, without the number: the number was
 * revealed once, in the first response, and is not stored to be re-sent.
 */
export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined
  const existing = idempotencyKey ? issuedCardForKey(idempotencyKey) : null
  if (existing) {
    return NextResponse.json({ card: existing, replayed: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Request body must be JSON." }, { status: 400 })
  }

  const result = validateIssueCardInput(body)
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 })
  }

  const { card, number } = issueCard(result.value, idempotencyKey)
  return NextResponse.json({ card, number }, { status: 201 })
}
