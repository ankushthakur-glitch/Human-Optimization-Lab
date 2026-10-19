import * as React from "react"
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { Check, DownloadSimple } from "@/components/ph"
import { HUE, KeyValue } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { dollarsExact } from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { downloadReceipt, receiptOf } from "@/lib/receipt"
import { color, font, ink, space, type } from "@/lib/theme"

/* The payment went through (step 4, /payment): a small popup over the step
   before the enrolled page. It plays as a moment: the page dims, the card
   springs up, the teal tick pops in with a ring spreading from it, the
   amount counts up to what was paid, then the details and the buttons rise
   in turn (all still under Reduce Motion). The details are what a receipt
   answers at a glance: who was paid, with what, when, and the receipt's
   number. "Download receipt" saves the itemized receipt and says so on the
   button; Continue opens the enrolled page. */

const native = Platform.OS !== "web"
const BADGE = 56

export function PaidPopup({ onContinue }: { onContinue: () => void }) {
  const onboarding = useOnboarding()
  const [receipt] = React.useState(() => receiptOf(onboarding))
  const still = useReducedMotion()
  const [saved, setSaved] = React.useState(false)
  const [shown, setShown] = React.useState(still ? receipt.amount : 0)
  const [t] = React.useState(() => ({
    scrim: new Animated.Value(0),
    card: new Animated.Value(0),
    badge: new Animated.Value(0),
    tick: new Animated.Value(0),
    ring: new Animated.Value(0),
    count: new Animated.Value(0),
    rise: [0, 1, 2].map(() => new Animated.Value(0)),
  }))

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Payment complete. ${receipt.total} paid.`)
    const all = [t.scrim, t.card, t.badge, t.tick, t.ring, t.count, ...t.rise]
    if (still) {
      all.forEach((v) => v.setValue(1))
      setShown(receipt.amount)
      return
    }
    // The count runs on the JS side: its value is read back into the text.
    const id = t.count.addListener(({ value }) => setShown(value * receipt.amount))
    const run = Animated.parallel([
      Animated.timing(t.scrim, { toValue: 1, duration: 220, useNativeDriver: native }),
      Animated.spring(t.card, { toValue: 1, friction: 7, tension: 90, useNativeDriver: native }),
      Animated.sequence([
        Animated.delay(160),
        Animated.spring(t.badge, { toValue: 1, friction: 5, tension: 130, useNativeDriver: native }),
        Animated.spring(t.tick, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }),
      ]),
      Animated.sequence([
        Animated.delay(320),
        Animated.timing(t.ring, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(t.count, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.stagger(
        110,
        t.rise.map((v) => Animated.timing(v, { toValue: 1, duration: 380, delay: 520, easing: Easing.out(Easing.cubic), useNativeDriver: native })),
      ),
    ])
    run.start()
    return () => {
      run.stop()
      t.count.removeListener(id)
    }
  }, [still, t, receipt])

  // "Receipt saved" stays on the button a moment, then it can be saved again.
  React.useEffect(() => {
    if (!saved) return
    const back = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(back)
  }, [saved])

  async function save() {
    await downloadReceipt(receipt)
    setSaved(true)
  }

  const rise = (i: number) => ({
    opacity: t.rise[i],
    transform: [{ translateY: t.rise[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  })

  return (
    <View style={styles.frame} accessibilityViewIsModal>
      <Animated.View style={[styles.scrim, { opacity: t.scrim }]} />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: t.card,
            transform: [
              { translateY: t.card.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
              { scale: t.card.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: t.ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }),
                transform: [{ scale: t.ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
              },
            ]}
          />
          <Animated.View style={[styles.halo, { opacity: t.badge, transform: [{ scale: t.badge }] }]}>
            <View style={styles.badge}>
              <Animated.View style={{ opacity: t.tick, transform: [{ scale: t.tick.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
                <Check size={26} color={color.onPrimary} weight="bold" />
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Payment complete
        </Text>
        <Text style={styles.amount} accessibilityLabel={receipt.total}>
          {shown >= receipt.amount ? receipt.total : dollarsExact(Math.round(shown * 100) / 100)}
        </Text>
        <Text style={styles.lead}>Your membership has started.</Text>

        <Animated.View style={[styles.details, rise(0)]}>
          <KeyValue label="Paid to" value="Inlay Health" />
          <KeyValue label="Paid with" value={receipt.paidWith} />
          <KeyValue label="Date" value={receipt.date} />
          <KeyValue label="Receipt" value={receipt.number} last />
        </Animated.View>

        <Animated.View style={[styles.actions, rise(1)]}>
          <Button
            variant="outline"
            onPress={() => void save()}
            icon={({ color: c }) => (saved ? <Check size={18} color={c} weight="bold" /> : <DownloadSimple size={18} color={c} weight="bold" />)}
          >
            {saved ? "Receipt saved" : "Download receipt"}
          </Button>
        </Animated.View>
        <Animated.View style={[styles.actions, rise(2)]}>
          <Button onPress={onContinue}>Continue</Button>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingHorizontal: space.gutter },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.35)" },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: space.line,
    paddingHorizontal: space.section,
    paddingTop: space.section,
    paddingBottom: space.section,
    borderRadius: 24,
    backgroundColor: color.background,
  },
  stage: { width: BADGE * 2, height: BADGE + 24, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 2, borderColor: color.primaryLine },
  halo: { width: BADGE + 16, height: BADGE + 16, borderRadius: (BADGE + 16) / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, color: ink.strong, textAlign: "center" },
  amount: { fontFamily: font.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: ink.strong, fontVariant: ["tabular-nums"] },
  lead: { ...type.body, textAlign: "center" },
  details: { alignSelf: "stretch", marginTop: space.item, paddingHorizontal: space.rowX, borderRadius: 14, backgroundColor: HUE.neutral.tint },
  actions: { alignSelf: "stretch", marginTop: space.inline },
})
