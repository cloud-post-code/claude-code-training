"use client"

import { Input } from "@/components/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select"
import { Button } from "@/components/Button"
import { CardCategory, Currency } from "@/data/types"
import { CARD_CATEGORIES, CARD_CATEGORY_LABELS, CARD_CURRENCIES } from "@/lib/cards"
import { parseAmountToMinorUnits } from "@/lib/money"
import { cx } from "@/lib/utils"
import { useState } from "react"
import { IssuedCardResult, MerchantOption } from "./issue-card-drawer"

const LABEL_CLASS = "text-sm font-medium text-gray-900 dark:text-gray-50"

const FALLBACK_ERROR = "Something went wrong. Try again."

async function submitCard(body: {
  merchantId: string
  nickname: string
  spendLimit: number
  currency: Currency
  category: CardCategory
}) {
  try {
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) {
      return { ok: false as const, message: data?.message ?? FALLBACK_ERROR }
    }
    return { ok: true as const, number: data.number as string }
  } catch {
    return { ok: false as const, message: FALLBACK_ERROR }
  }
}

export function IssueCardForm({
  merchants,
  onIssued,
}: {
  merchants: MerchantOption[]
  onIssued: (result: IssuedCardResult) => void
}) {
  const [nickname, setNickname] = useState("")
  const [merchantId, setMerchantId] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<Currency>("USD")
  const [category, setCategory] = useState<CardCategory>("any")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleMerchantChange = (id: string) => {
    setMerchantId(id)
    const merchant = merchants.find((m) => m.id === id)
    if (merchant) setCurrency(merchant.currency)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const spendLimit = parseAmountToMinorUnits(amount)
    if (spendLimit === null) {
      setError("Enter an amount like 250.00")
      return
    }

    setSubmitting(true)
    const result = await submitCard({ merchantId, nickname, spendLimit, currency, category })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    const merchant = merchants.find((m) => m.id === merchantId)
    onIssued({
      number: result.number,
      nickname,
      merchantName: merchant?.name ?? merchantId,
      spendLimit,
      currency,
      category,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className={cx(
            "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900",
            "dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-400",
          )}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-nickname" className={LABEL_CLASS}>
          Nickname
        </label>
        <Input
          id="card-nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Marketing — Q4 campaigns"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-merchant" className={LABEL_CLASS}>
          Merchant
        </label>
        <Select value={merchantId} onValueChange={handleMerchantChange}>
          <SelectTrigger id="card-merchant">
            <SelectValue placeholder="Select a merchant" />
          </SelectTrigger>
          <SelectContent>
            {merchants.map((merchant) => (
              <SelectItem key={merchant.id} value={merchant.id}>
                {merchant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-limit" className={LABEL_CLASS}>
          Spend limit
        </label>
        <Input
          id="card-limit"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="250.00"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-currency" className={LABEL_CLASS}>
          Currency
        </label>
        <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
          <SelectTrigger id="card-currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARD_CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-category" className={LABEL_CLASS}>
          Category lock
        </label>
        <Select value={category} onValueChange={(value) => setCategory(value as CardCategory)}>
          <SelectTrigger id="card-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARD_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CARD_CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" isLoading={submitting} loadingText="Issuing…" className="mt-2">
        Issue card
      </Button>
    </form>
  )
}
