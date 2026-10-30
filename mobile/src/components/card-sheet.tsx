import * as React from "react"
import { StyleSheet, View } from "react-native"

import { Check, CreditCard } from "@/components/ph"
import { Group, NeedsRow, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import type { Membership } from "@/lib/onboarding"
import { color, space } from "@/lib/theme"

/* The card a member pays with, shared by her billing pages (Membership,
   Pay your membership, Add AI credit): the prototype's sample cards, and
   the membership with a new one. */

/** The prototype's sample cards: the one from checkout, and one to change
    to. */
export const CARDS = ["Visa ending 4242", "Mastercard ending 4444"]

/** A new card is for the charges to come: the card it replaces is kept
    with the day it stopped, so every receipt already made still names the
    card it was charged to. */
export function withCard(m: Membership, card: string): Membership {
  return m.card ? { ...m, card, pastCards: [...(m.pastCards ?? []), { card: m.card, until: new Date().toISOString() }] } : { ...m, card }
}

/** The card the membership is paid with: the sample cards, the one in use
    ticked. */
export function CardSheet({ current, onUse, onClose }: { current?: string; onUse: (card: string) => void; onClose: () => void }) {
  const [chosen, setChosen] = React.useState(current ?? CARDS[0])
  return (
    <Sheet title="Payment method" onClose={onClose}>
      <Group>
        {CARDS.map((c) => {
          const on = c === chosen
          return (
            <NeedsRow
              key={c}
              icon={<CreditCard size={16} color={color.primary} />}
              title={c}
              meta={c === current ? "In use" : undefined}
              right={on ? <Check size={18} color={color.primary} weight="bold" /> : undefined}
              chevron={false}
              onPress={() => setChosen(c)}
              accessibilityLabel={`${c}${on ? ", selected" : ""}`}
            />
          )
        })}
      </Group>
      <View style={styles.actions}>
        <Button onPress={() => onUse(chosen)} disabled={chosen === current}>
          Use this card
        </Button>
        <View style={styles.quiet}>
          <TextAction tone="muted" onPress={onClose}>
            Not now
          </TextAction>
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.stack },
  quiet: { alignItems: "center" },
})
