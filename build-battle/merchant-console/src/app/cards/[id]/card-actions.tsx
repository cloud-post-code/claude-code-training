"use client"

import { Button } from "@/components/Button"
import { Card, CardStatus } from "@/data/types"
import { cx } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { patchCardStatus } from "../card-status-client"

export function CardActions({ card }: { card: Card }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTransition = async (status: CardStatus) => {
    setPending(true)
    setError(null)
    const result = await patchCardStatus(card.id, status)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  const handleCancel = () => {
    if (!window.confirm("Cancel this card? This cannot be undone.")) return
    void runTransition("cancelled")
  }

  return (
    <div>
      {error && (
        <p
          role="alert"
          className={cx(
            "mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm",
            "text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
          )}
        >
          {error}
        </p>
      )}

      {card.status === "cancelled" ? (
        <p className="text-sm text-gray-500">
          This card is cancelled and cannot be reactivated.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {card.status === "active" && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void runTransition("frozen")}
            >
              Freeze
            </Button>
          )}
          {card.status === "frozen" && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void runTransition("active")}
            >
              Unfreeze
            </Button>
          )}
          <Button variant="destructive" disabled={pending} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
