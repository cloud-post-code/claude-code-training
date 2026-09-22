"use client"

import { Button } from "@/components/Button"
import { formatMoney } from "@/lib/money"
import { cx } from "@/lib/utils"
import { RiFileCopyLine } from "@remixicon/react"
import { useState } from "react"
import { IssuedCardResult } from "./issue-card-drawer"

export function IssueCardSuccess({ result }: { result: IssuedCardResult }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!result.number) return
    try {
      await navigator.clipboard.writeText(result.number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cx(
          "rounded-md border border-gray-200 bg-gray-50 p-4",
          "dark:border-gray-800 dark:bg-gray-900",
        )}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Card number
        </p>
        {result.number ? (
          <>
            <p className="mt-1 break-all font-mono text-lg text-gray-900 dark:text-gray-50">
              {result.number}
            </p>
            <Button variant="secondary" className="mt-3 gap-2 py-1.5" onClick={handleCopy}>
              <RiFileCopyLine className="size-4 shrink-0" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </>
        ) : (
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-50">
            This card was already issued by an earlier submit. Its number was shown once
            and cannot be shown again.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Nickname</dt>
        <dd className="text-gray-900 dark:text-gray-50">{result.nickname}</dd>
        <dt className="text-gray-500">Merchant</dt>
        <dd className="text-gray-900 dark:text-gray-50">{result.merchantName}</dd>
        <dt className="text-gray-500">Spend limit</dt>
        <dd className="text-gray-900 dark:text-gray-50">
          {formatMoney(result.spendLimit, result.currency)}
        </dd>
      </dl>

      <p className="text-sm text-amber-700 dark:text-amber-500">
        This is the only time the full card number will be shown. It will not be
        displayed again.
      </p>
    </div>
  )
}
