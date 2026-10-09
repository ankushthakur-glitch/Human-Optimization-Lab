import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { Art } from "@/components/art"
import { TextAction } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { planFor, useExperience } from "@/lib/experience"
import { useOffer, useShown } from "@/lib/offers"
import { space } from "@/lib/theme"

/* "Watch, ring or scale" (FINAL-SPEC C.18, item 6), the one devices sheet
   for Profile and the member's Plan tab. Devices are coming, never shown
   as connected (M-68, A-33).

   For a member: "Coming soon", her plan works without one. For everyone
   else it is the member-feature touchpoint (D.2 #7), shown only because
   she tapped the row: what sync will do, with "See the plan" unless her
   readiness is low, and "Not now". Inlay speaks, never her doctor; no
   price. */

export function DevicesSheet({ onClose }: { onClose: () => void }) {
  const info = useExperience()
  if (planFor(info) === "member")
    return (
      <Sheet title="Coming soon" onClose={onClose}>
        <View style={styles.top}>
          <View style={styles.words}>
            <SheetText>Connecting a watch, ring or scale arrives in a later update. Your plan works without one.</SheetText>
          </View>
          <Art name="watch" size={64} />
        </View>
        <Button onPress={onClose}>Got it</Button>
      </Sheet>
    )
  return <FeatureSheet onClose={onClose} quiet={info.readiness === "low"} />
}

/** The free patient's sheet: the member-feature touchpoint. */
function FeatureSheet({ onClose, quiet }: { onClose: () => void; quiet: boolean }) {
  const offer = useOffer("member-feature", { key: "devices" })
  useShown(offer)
  const plan = !quiet && offer.show
  return (
    <Sheet title="Watch and scale sync comes with the plan" onClose={onClose}>
      <View style={styles.top}>
        <View style={styles.words}>
          <SheetText>When it arrives, your plan will use your steps, sleep and weight to adjust each week. Your record keeps updating from your doctors either way.</SheetText>
        </View>
        <Art name="watch" size={64} />
      </View>
      <View style={styles.actions}>
        {plan && (
          <Button
            onPress={() => {
              offer.markOpened()
              onClose()
              router.push("/plan")
            }}
          >
            See the plan
          </Button>
        )}
        <View style={styles.quiet}>
          <TextAction
            tone="muted"
            onPress={() => {
              if (plan) offer.notNow()
              onClose()
            }}
          >
            Not now
          </TextAction>
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // The words, and the object beside them.
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  words: { flex: 1 },
  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.stack },
  quiet: { alignItems: "center" },
})
