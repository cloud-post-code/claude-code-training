"use client"

import { Button } from "@/components/Button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/Table"
import { StatusBadge } from "@/components/ui/payments/StatusBadge"
import { Card, CardStatus } from "@/data/types"
import { CARD_CATEGORY_LABELS, maskCardNumber } from "@/lib/cards"
import { formatDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { cx } from "@/lib/utils"
import { RiCloseLine } from "@remixicon/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { patchCardStatus } from "./card-status-client"

function RowActions({
  card,
  pendingId,
  onAction,
}: {
  card: Card
  pendingId: string | null
  onAction: (id: string, status: CardStatus) => void
}) {
  if (card.status === "cancelled") return null

  const isPending = pendingId === card.id
  const next: CardStatus = card.status === "active" ? "frozen" : "active"
  const label = card.status === "active" ? "Freeze" : "Unfreeze"

  return (
    <Button
      variant="secondary"
      className="py-1.5"
      disabled={isPending}
      onClick={() => onAction(card.id, next)}
    >
      {isPending ? "Working…" : label}
    </Button>
  )
}

export function CardsTable({
  cards,
  merchantNames,
}: {
  cards: Card[]
  merchantNames: Record<string, string>
}) {
  const [rows, setRows] = useState(cards)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(cards)
  }, [cards])

  const handleAction = async (id: string, status: CardStatus) => {
    setError(null)
    setPendingId(id)
    const result = await patchCardStatus(id, status)
    setPendingId(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setRows((current) => current.map((row) => (row.id === id ? result.card : row)))
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className={cx(
            "mx-4 mb-4 flex items-start justify-between gap-3 rounded-md border",
            "border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 sm:mx-6",
            "dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-400",
          )}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="shrink-0 rounded-sm text-red-900 hover:opacity-70 dark:text-red-400"
          >
            <RiCloseLine className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <TableRoot className="border-t border-gray-200 dark:border-gray-800">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nickname</TableHeaderCell>
              <TableHeaderCell>Merchant</TableHeaderCell>
              <TableHeaderCell>Number</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell className="text-right">Spend limit</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    No cards issued yet
                  </p>
                  <p className="mt-1 text-gray-500">
                    Use the Issue card button above to create the first one.
                  </p>
                </TableCell>
              </TableRow>
            )}
            {rows.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <Link
                    href={`/cards/${card.id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-500"
                  >
                    {card.nickname}
                  </Link>
                </TableCell>
                <TableCell>{merchantNames[card.merchantId]}</TableCell>
                <TableCell className="font-mono">
                  {maskCardNumber(card.last4)}
                </TableCell>
                <TableCell>{CARD_CATEGORY_LABELS[card.category]}</TableCell>
                <TableCell
                  className={cx(
                    "text-right font-medium tabular-nums",
                    "text-gray-900 dark:text-gray-50",
                  )}
                >
                  {formatMoney(card.spendLimit, card.currency)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={card.status} />
                </TableCell>
                <TableCell>{formatDate(card.createdAt)}</TableCell>
                <TableCell>
                  <RowActions card={card} pendingId={pendingId} onAction={handleAction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRoot>
    </>
  )
}
