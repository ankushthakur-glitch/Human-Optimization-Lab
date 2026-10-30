import { router } from "expo-router"

import { useAllowance } from "@/lib/allowance"

/* This week's AI credit, as Claude shows its session limit (user, 6 Oct
   2026): no page of its own and no line on the tabs, only the orb's arc
   there. Over the assistant's composer, from 75% used, a strip joined to
   the field (ChatBar `notice`): amber with how much is used, then red at
   100% with when it comes back and upgrade, for the free record only; a
   member adds more from the limit card (/ai-credit). A chat in progress when the credit runs
   out finishes on its own (lib/allowance.ts grace), so nothing here
   borrows. */

/** From this share the line shows. */
export const CREDIT_WARN = 0.75

/** What the credit says now, or null below 75%: the words, amber or red,
    and the one small action. */
export type CreditNotice = { words: string; hue: "amber" | "red"; action?: { label: string; onPress: () => void } }

export function useCreditNotice(): CreditNotice | null {
  const credit = useAllowance()
  const upgrade = { label: "Upgrade", onPress: () => router.push("/plan") }
  // The free record's share is always shown, with the upgrade prompt from
  // 75% used. A paid member's Ask Inlay has no banner at all (user, 26 Oct
  // 2026): the orb's arc shows the share, and the limit card in the chat
  // offers adding more when it runs out.
  if (credit.member) return null
  const high = credit.share >= CREDIT_WARN
  return {
    words: credit.line,
    hue: credit.out ? "red" : "amber",
    action: high ? upgrade : undefined,
  }
}
