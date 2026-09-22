import { cardById, transitionCard } from "@/data/cards"
import { CardStatus } from "@/data/types"
import { CARD_STATUSES } from "@/lib/cards"
import { NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const card = cardById(id)
  if (!card) {
    return NextResponse.json({ message: "Card not found." }, { status: 404 })
  }
  return NextResponse.json({ card })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Request body must be JSON." }, { status: 400 })
  }

  const status = (body as Record<string, unknown> | null)?.status
  if (typeof status !== "string" || !CARD_STATUSES.includes(status as CardStatus)) {
    return NextResponse.json({ message: "Status must be active, frozen, or cancelled." }, {
      status: 400,
    })
  }

  const result = transitionCard(id, status as CardStatus)
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status })
  }

  return NextResponse.json({ card: result.card })
}
