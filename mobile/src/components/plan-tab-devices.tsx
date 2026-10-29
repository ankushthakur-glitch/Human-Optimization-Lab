import { router } from "expo-router"
import { StyleSheet, View } from "react-native"

import { Art } from "@/components/art"
import { Watch } from "@/components/ph"
import { TextAction, toast } from "@/components/record-kit"
import { Row, Rows } from "@/components/settings-rows"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { ADDABLE, type Connection } from "@/lib/access"
import { planFor, useExperience } from "@/lib/experience"
import { useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { color, space } from "@/lib/theme"

/* "Watch, ring or scale" (FINAL-SPEC C.18, item 6), the one devices sheet
   for Profile, Access and the member's Plan tab.

   For a member (since 29 Oct 2026, no longer "Coming soon"): "Add a
   device", a ring, scale or watch to connect, the ones already connected
   left out; it connects at once and says so. For everyone else it is the
   member-feature touchpoint (D.2 #7), shown only because she tapped the
   row: what sync will do, with "See the plan" unless her readiness is
   low, and "Not now". Inlay speaks, never her doctor; no price. */

export function DevicesSheet({ onClose }: { onClose: () => void }) {
  const info = useExperience()
  if (planFor(info) === "member") return <AddDeviceSheet onClose={onClose} />
  return <FeatureSheet onClose={onClose} quiet={info.readiness === "low"} />
}

/** A member picks a ring, scale or watch to connect. */
function AddDeviceSheet({ onClose }: { onClose: () => void }) {
  const onboarding = useOnboarding()
  const added = onboarding.devices ?? []
  const left = ADDABLE.filter((d) => !added.includes(d.id))

  async function add(c: Connection) {
    await onboarding.save({ devices: [...added, c.id] })
    onClose()
    toast(`${c.name} connected`)
  }

  return (
    <Sheet title="Add a device" onClose={onClose}>
      {left.length ? (
        <Rows>
          {left.map((d) => (
            <Row key={d.id} icon={<Watch size={16} color={color.primary} />} title={d.name} meta={d.via} gap={10} right={<TextAction onPress={() => add(d)}>Connect</TextAction>} />
          ))}
        </Rows>
      ) : (
        <SheetText>Every device we work with is connected.</SheetText>
      )}
      <Button variant="outline" onPress={onClose}>
        Not now
      </Button>
    </Sheet>
  )
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
