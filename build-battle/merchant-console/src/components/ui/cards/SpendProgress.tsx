import { Currency } from "@/data/types"
import { formatMoney } from "@/lib/money"
import { cx } from "@/lib/utils"

/**
 * Tailwind width classes are static, so the percentage (integer math only,
 * used for width alone) is mapped onto one of these 13 fixed steps rather
 * than built as a dynamic arbitrary-value class.
 */
const WIDTH_STEPS = [
  "w-0",
  "w-1/12",
  "w-2/12",
  "w-3/12",
  "w-4/12",
  "w-5/12",
  "w-6/12",
  "w-7/12",
  "w-8/12",
  "w-9/12",
  "w-10/12",
  "w-11/12",
  "w-full",
] as const

function widthClassFor(percent: number): string {
  const step = Math.round((percent / 100) * (WIDTH_STEPS.length - 1))
  return WIDTH_STEPS[step]
}

function percentSpent(spent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((spent * 100) / limit))
}

function colorClassFor(percent: number): string {
  if (percent === 100) return "bg-red-500"
  if (percent > 80) return "bg-amber-500"
  return "bg-blue-500"
}

export function SpendProgress({
  spent,
  limit,
  currency,
}: {
  spent: number
  limit: number
  currency: Currency
}) {
  const percent = percentSpent(spent, limit)

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={spent}
        aria-label="Spend against limit"
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
      >
        <div
          className={cx(
            "h-full rounded-full transition-all",
            widthClassFor(percent),
            colorClassFor(percent),
          )}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {formatMoney(spent, currency)} of {formatMoney(limit, currency)} · {percent}%
      </p>
    </div>
  )
}
