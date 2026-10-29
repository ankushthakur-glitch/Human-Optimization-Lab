import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CaretRight, ChartLine, ChatText, ClipboardText, Flask, Heart, ShieldCheck } from "@/components/ph"
import { NeedsRow } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { logEvent, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* "What an optimization plan adds" (client deck, screen 20 of 56, 27 Oct
   2026): the free plan's upgrade moment. AI is no longer part of the free
   account, so this says what the membership actually buys, and Ask Inlay is
   the headline: first, marked NEW, unlimited questions answered from the
   patient's own results and explicitly not available free. Then the five that
   follow from it: plans built from the record, tests ordered and scheduled, a
   daily plan, progress against day one, and everything going to the
   physician. Stated at the foot: the record, medications and appointments
   stay free whether or not anyone ever takes a plan; the upgrade adds, it
   does not withhold. The call to action is "See what we found", not
   "Subscribe": the next screen is the argument.

   It is the free Plan tab, and where every offer in the app leads (/plans);
   a cancelled member finds her past plans above it. */

type Icon = typeof Heart

const ADDS: { key: string; title: string; says: string; Icon: Icon; isNew?: boolean }[] = [
  {
    key: "ask",
    title: "Ask Inlay about your own record",
    says: "Unanswered questions, answered from your results rather than from the internet. Not available on the free account.",
    Icon: ChatText,
    isNew: true,
  },
  { key: "plans", title: "Optimization plans built from your record", says: "Every opportunity your results and your answers reveal, ranked by what matters most", Icon: Heart },
  { key: "tests", title: "Tests ordered, scheduled and tracked", says: "Priced before you buy, booked in the app, and never re-ordered if we already hold it", Icon: Flask },
  { key: "daily", title: "A daily plan you can answer", says: "Six topics a day, each with four ways to answer and a score that follows what you did", Icon: ClipboardText },
  { key: "progress", title: "Progress measured against day one", says: "Week, month, six months and year, with every number paired to the point it moved from", Icon: ChartLine },
  { key: "physician", title: "Your physician sees all of it", says: "Every result and every change goes to their file, in a form they can keep", Icon: ShieldCheck },
]

export function PlanAdds() {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: "tab" })
  useShown(offer)
  // The plan seen, and from where (D.7), once each time the page opens.
  const viewed = React.useRef(false)
  React.useEffect(() => {
    if (viewed.current || !onboarding.loaded) return
    viewed.current = true
    logEvent(onboarding, "plan_viewed", { from: "tab" })
  }, [onboarding])

  const past = onboarding.planHistory ?? []

  return (
    <TabScreen
      tab="plan"
      back
      title="What an optimization plan adds"
      solidFooter
      footer={
        <Button
          onPress={() => {
            offer.markOpened()
            logEvent(onboarding, "checkout_started", { from: "tab" })
            router.push("/opportunities")
          }}
          trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}
        >
          See what we found
        </Button>
      }
    >
      {past.length > 0 && (
        <View style={styles.past}>
          <Text style={styles.pastHead}>Your past plans</Text>
          {past.map((v) => (
            <NeedsRow key={v.version} title={`Version ${v.version}`} meta={`Started ${v.approved.replace(/,\s*\d{4}$/, "")}. Kept.`} />
          ))}
        </View>
      )}
      <View style={styles.list}>
        {ADDS.map((a) => (
          <View key={a.key} style={[styles.item, a.isNew && styles.itemNew]} accessible accessibilityLabel={`${a.title}${a.isNew ? ", new" : ""}. ${a.says}`}>
            <View style={[styles.tile, a.isNew && styles.tileNew]}>
              <a.Icon size={18} color={a.key === "plans" ? color.high : ink.primary} />
            </View>
            <View style={styles.words}>
              <Text style={styles.name}>{a.title}</Text>
              <Text style={styles.says}>{a.says}</Text>
            </View>
            {a.isNew && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NEW</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  // The cards sit 8 apart, as in every list; the page's 20 is for between sections.
  list: { gap: space.inline },
  past: { gap: space.inline, marginBottom: space.inline },
  pastHead: { ...type.sectionLabel },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.lead,
    paddingVertical: space.item,
    paddingHorizontal: space.rowX,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  // The headline: Ask Inlay, a soft teal card with a light teal edge and a white tile.
  itemNew: { borderColor: color.primaryEdge, backgroundColor: color.primarySoft },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  tileNew: { backgroundColor: color.onPrimary },
  words: { flex: 1, gap: 2 },
  name: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  says: { ...type.label, color: ink.secondary, lineHeight: 17 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: color.primary },
  badgeText: { fontFamily: font.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.4, color: color.onPrimary },
})
