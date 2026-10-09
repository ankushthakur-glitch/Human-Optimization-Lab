import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { toast } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { TOP_UP, useAllowance } from "@/lib/allowance"
import { space } from "@/lib/theme"

/* This week's AI credit, as Claude shows its session limit (user, 6 Oct
   2026): no page of its own and no line on the tabs, only the orb's arc
   there. Over the assistant's composer, from 75% used, a strip joined to
   the field (ChatBar `notice`): amber with how much is used, then red at
   100% with when it comes back and one small action, upgrade (the free
   record) or add more (a member). A chat in progress when the credit runs
   out finishes on its own (lib/allowance.ts grace), so nothing here
   borrows. Adding asks once in CreditSheet first, which the screen draws
   over everything through `onAsk`. */

/** From this share the line shows. */
export const CREDIT_WARN = 0.75

/** What the credit says now, or null below 75%: the words, amber or red,
    and the one small action. */
export type CreditNotice = { words: string; hue: "amber" | "red"; action?: { label: string; onPress: () => void } }

export function useCreditNotice(onAsk: () => void): CreditNotice | null {
  const credit = useAllowance()
  const upgrade = { label: "Upgrade", onPress: () => router.push("/plan") }
  // The free record's share is always shown, with the upgrade prompt from
  // 75% used; a member's only from 75%, with adding more.
  if (credit.member && credit.share < CREDIT_WARN) return null
  const high = credit.share >= CREDIT_WARN
  return {
    words: credit.line,
    hue: credit.out ? "red" : "amber",
    action: credit.member ? { label: "Add more", onPress: onAsk } : high ? upgrade : undefined,
  }
}

/** Asks once before a member adds more credit for this week. `onDone`
    runs after it went through, e.g. to send a waiting question. */
export function CreditSheet({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const credit = useAllowance()

  function go() {
    onClose()
    credit.topUp()
    toast(`${TOP_UP.share}% more AI credit added`)
    onDone?.()
  }

  return (
    <Sheet title="Add more AI credit?" onClose={onClose}>
      <SheetText>{`${TOP_UP.share}% more AI credit for this week, ${TOP_UP.price}, charged to your card on file. What you don't use ends on ${credit.resetsOn}.`}</SheetText>
      <View style={styles.actions}>
        <Button onPress={go}>{`Add for ${TOP_UP.price}`}</Button>
        <Button variant="outline" onPress={onClose}>
          Not now
        </Button>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  actions: { gap: space.item },
})
