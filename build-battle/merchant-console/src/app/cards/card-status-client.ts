import { Card, CardStatus } from "@/data/types"

const FALLBACK_MESSAGE = "Something went wrong. Try again."

export type PatchCardResult =
  | { ok: true; card: Card }
  | { ok: false; message: string }

/**
 * The one client call for a status change. The server guards the state
 * machine; this only carries its answer back with a message safe to show.
 */
export async function patchCardStatus(id: string, status: CardStatus): Promise<PatchCardResult> {
  try {
    const response = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = (await response.json()) as { card?: Card; message?: string }
    if (!response.ok || !data.card) {
      return { ok: false, message: data.message ?? FALLBACK_MESSAGE }
    }
    return { ok: true, card: data.card }
  } catch {
    return { ok: false, message: FALLBACK_MESSAGE }
  }
}
