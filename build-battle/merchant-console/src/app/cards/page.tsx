import { listCards } from "@/data/cards"
import { merchants } from "@/data/merchants"
import { cx } from "@/lib/utils"
import { CardsTable } from "./cards-table"
import { IssueCardDrawer } from "./issue-card-drawer"

export default async function CardsPage() {
  const cards = listCards()
  const merchantNames = Object.fromEntries(merchants.map((m) => [m.id, m.name]))

  return (
    <section aria-label="Cards">
      <div
        className={cx(
          "flex flex-col justify-between gap-2 px-4 py-6",
          "sm:flex-row sm:items-center sm:p-6",
        )}
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Cards
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {cards.length} {cards.length === 1 ? "card" : "cards"} issued
          </p>
        </div>
        <IssueCardDrawer
          merchants={merchants.map((m) => ({
            id: m.id,
            name: m.name,
            currency: m.currency,
          }))}
        />
      </div>

      <CardsTable cards={cards} merchantNames={merchantNames} />
    </section>
  )
}
