"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { CardCategory, Currency } from "@/data/types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { IssueCardForm } from "./issue-card-form"
import { IssueCardSuccess } from "./issue-card-success"

export type MerchantOption = { id: string; name: string; currency: Currency }

export type IssuedCardResult = {
  number: string
  nickname: string
  merchantName: string
  spendLimit: number
  currency: Currency
  category: CardCategory
}

export function IssueCardDrawer({ merchants }: { merchants: MerchantOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [issued, setIssued] = useState<IssuedCardResult | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setIssued(null)
      router.refresh()
    }
    setOpen(next)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button className="w-full gap-2 sm:w-fit">Issue card</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{issued ? "Card issued" : "Issue card"}</DrawerTitle>
          {!issued && (
            <DrawerDescription>
              Set a nickname, merchant, spend limit, and optional category lock.
            </DrawerDescription>
          )}
        </DrawerHeader>
        <DrawerBody>
          {issued ? (
            <IssueCardSuccess result={issued} />
          ) : (
            <IssueCardForm merchants={merchants} onIssued={setIssued} />
          )}
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="secondary">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
