import { issueCard, listCards, validateIssueCardInput } from "@/data/cards"
import { NextRequest, NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({ cards: listCards() })
}

export async function POST(request: NextRequest) {
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

  const { card, number } = issueCard(result.value)
  return NextResponse.json({ card, number }, { status: 201 })
}
