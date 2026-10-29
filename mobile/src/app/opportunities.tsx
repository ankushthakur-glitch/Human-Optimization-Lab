import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight } from "@/components/ph"
import { ListHead, UpgradePage } from "@/components/upgrade-kit"
import { useOnboarding } from "@/lib/onboarding"
import { OPPS, inPlan, words } from "@/lib/upgrade"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* "Nine opportunities, from your own record" (client deck, screen 21): all
   nine, not a shortlist. The record produced nine opportunities and all nine
   are in the plan; the screen says so in a band at the top rather than
   ranking three and leaving six as options. Each line carries the evidence
   that produced it (AHI 5.3 for sleep, eGFR 57 for kidney, lean mass falling
   121.9 to 119.3 lb for body composition); tapping one opens why it was
   identified and what it needs (/opportunity/[id]). Nothing here is a menu:
   the ordering reflects what moves first, not what sells. A patient can
   still take any one out before paying, which is where the next screens go.
   "See what it needs" opens the priced list (/plan-tests). */

export default function OpportunitiesScreen() {
  const onboarding = useOnboarding()
  const plan = new Set(inPlan(onboarding.removedOpps).map((o) => o.id))
  const all = plan.size === OPPS.length

  return (
    <UpgradePage
      back="/plans"
      headerTitle={`${words(OPPS.length).replace(/^./, (c) => c.toUpperCase())} Opportunities in Your Record`}
      nextLabel="See what it needs"
      onNext={() => router.push("/plan-tests")}
    >
      <View style={styles.band} accessible accessibilityLabel={`${all ? "All nine" : `${plan.size} of nine`} are in your plan. 412 results read across 6 sources.`}>
        <View style={styles.bandWords}>
          <Text style={styles.bandTitle}>{all ? "All nine are in your plan" : `${words(plan.size).replace(/^./, (c) => c.toUpperCase())} of nine are in your plan`}</Text>
          <Text style={styles.bandSays}>412 results read across 6 sources. Tap any one to see why it was identified.</Text>
        </View>
        <Text style={styles.bandCount}>{plan.size}</Text>
      </View>

      <ListHead title="What we will optimize" />
      <View style={styles.group}>
        {OPPS.map((o, i) => {
          const on = plan.has(o.id)
          return (
            <Pressable
              key={o.id}
              onPress={() => router.push({ pathname: "/opportunity/[id]", params: { id: o.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${o.n}. ${o.name}. ${o.evidence}. ${on ? "In your plan" : "Taken out"}`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rule, pressed && styles.pressed]}
            >
              <View style={styles.num}>
                <Text style={styles.numText}>{o.n}</Text>
              </View>
              <View style={styles.words}>
                <Text style={[styles.name, !on && styles.dim]}>{o.name}</Text>
                <Text style={styles.says}>{o.evidence}</Text>
              </View>
              <CaretRight size={14} color={ink.tertiary} />
            </Pressable>
          )
        })}
      </View>
    </UpgradePage>
  )
}

const styles = StyleSheet.create({
  // The one solid teal card: all nine are in, said once at the top.
  band: { flexDirection: "row", alignItems: "center", gap: space.item, padding: space.item, borderRadius: 10, borderWidth: 1, borderColor: color.primary, backgroundColor: color.primary },
  bandWords: { flex: 1, gap: 2 },
  bandTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: color.onPrimary },
  bandSays: { ...type.label, color: color.onPrimary, lineHeight: 17 },
  bandCount: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, color: color.onPrimary, fontVariant: ["tabular-nums"] },

  group: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  pressed: { opacity: 0.7 },
  num: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  numText: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, color: ink.secondary },
  words: { flex: 1, gap: 1 },
  name: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  dim: { color: ink.tertiary },
  says: { ...type.label, color: ink.secondary },
})
