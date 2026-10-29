import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CheckMark } from "@/components/flow"
import { Info } from "@/components/ph"
import { UpgradePage } from "@/components/upgrade-kit"
import { useOnboarding } from "@/lib/onboarding"
import { OPPS, RETAKE_RULE, testing, usd, words } from "@/lib/upgrade"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* "What all nine need" (client deck, screen 23): one tick and one price per
   opportunity. Unticking one takes the whole of it out of her plan and
   reprices the total before she pays; nothing inside an opportunity can be
   unticked on its own. Under the list, what is already on file and so is
   never re-ordered. Continue opens /enrollment. */

export default function PlanTestsScreen() {
  const onboarding = useOnboarding()
  const removed = onboarding.removedOpps ?? []
  const { count, total } = testing(removed)
  const out = new Set(removed)

  function flip(id: string) {
    onboarding.save({ removedOpps: out.has(id) ? removed.filter((r) => r !== id) : [...removed, id] })
  }

  const heading = count === OPPS.length ? `What all ${words(count)} need` : `What ${words(count)} need`

  return (
    <UpgradePage
      back="/opportunities"
      title={heading}
      onNext={() => router.push("/enrollment")}
      aboveFoot={
        <View style={styles.total}>
          <View style={styles.band}>
            <Text style={styles.bandLabel}>Added to your plan</Text>
            <Text style={styles.bandSum}>{usd(total)}</Text>
          </View>
        </View>
      }
    >
      <View style={styles.group}>
        {OPPS.map((o, i) => {
          const on = !out.has(o.id)
          return (
            <Pressable
              key={o.id}
              onPress={() => flip(o.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.n}. ${o.short}. ${o.tests}. ${o.price ? usd(o.price) : "No charge"}`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rule, pressed && styles.pressed]}
            >
              <View style={[styles.num, on && styles.numOn]}>
                <Text style={[styles.numText, on ? styles.numTextOn : styles.off]}>{o.n}</Text>
              </View>
              <View style={styles.words}>
                <Text style={[styles.name, !on && styles.off]}>{o.short}</Text>
                <Text style={styles.says}>{o.tests}</Text>
              </View>
              <Text style={[o.price ? styles.price : styles.free, !on && styles.off, !on && o.price > 0 && styles.struck]}>
                {o.price ? usd(o.price) : "no charge"}
              </Text>
              <CheckMark checked={on} centered />
            </Pressable>
          )
        })}
      </View>

      <View style={styles.note}>
        <Info size={16} color={ink.secondary} />
        <Text style={styles.noteText}>{RETAKE_RULE}</Text>
      </View>
    </UpgradePage>
  )
}

const styles = StyleSheet.create({
  // The teal note: the same card the baseline step used for its cash-pay line.
  note: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, padding: space.item, borderRadius: 12, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  noteText: { ...type.label, flex: 1, fontSize: 13, lineHeight: 19, color: ink.content },
  group: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  pressed: { opacity: 0.7 },
  // The opportunity's number in a tile: teal while it is in the plan, grey once it is out.
  num: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  numOn: { backgroundColor: color.primarySoft },
  numText: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  numTextOn: { color: ink.primary },
  words: { flex: 1, gap: 1 },
  name: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  says: { ...type.label, color: ink.secondary },
  price: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: ink.strong, fontVariant: ["tabular-nums"] },
  free: { ...type.label, fontFamily: font.medium, color: ink.primary },
  off: { color: ink.tertiary },
  struck: { textDecorationLine: "line-through" },
  total: { gap: space.inline },
  band: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space.item, borderRadius: 10, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  bandLabel: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: ink.strong },
  bandSum: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.primary, fontVariant: ["tabular-nums"] },
})
