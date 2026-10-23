import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { CalendarCheck, ChartLineUp, ClipboardText, Heart, Heartbeat, Info, Sparkle } from "@/components/ph"
import { Group, HUE, NeedsRow, type Hue } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { color, font, ink, space, touchRadius } from "@/lib/theme"

/* Setup's "Your why" page, right after "Updates about your care" (which now
   follows "Connect your health records") and before
   the eight life questions: what the free account does for her, in six
   lines, before anything is asked of her. Read only; Continue goes on to
   "Building your record", which carries on to "About your life". It says plainly that none of
   it needs a purchase. (Not to be confused with the later "Your why"
   conversation, onboarding/why.tsx.) */

const NEXT = "/onboarding/syncing" as const

type Icon = React.ComponentType<{ size?: number; color?: string }>

const BENEFITS: { title: string; meta: string; icon: Icon; hue: Hue }[] = [
  { title: "A comprehensive assessment of your health", meta: "Including your biological age", icon: Heartbeat, hue: "green" },
  { title: "A complete summary of your medical history", meta: "Every result from every provider, in one place", icon: ChartLineUp, hue: "teal" },
  { title: "Your medicines and appointments", meta: "Kept up to date from your records, not by you", icon: CalendarCheck, hue: "blue" },
  { title: "Where your tests stand", meta: "See each test's status without a phone call", icon: ClipboardText, hue: "amber" },
  { title: "How you feel, in body and mind", meta: "What your records can't show, asked directly", icon: Heart, hue: "red" },
  { title: "Ask Inlay about your record", meta: "Free questions every week", icon: Sparkle, hue: "violet" },
]

export default function YourWhyScreen() {
  // The record starts building on the next page; "About your life" follows it.
  const next = () => router.push(NEXT)

  return (
    <FlowScreen
      hol
      title="Your why"
      description="Before we ask anything else, here is what the account you just opened does for you. It is free, and it stays free."
      footer={<Button onPress={next}>Continue</Button>}
    >
      <View style={styles.stack}>
        <Group>
          {BENEFITS.map(({ title, meta, icon: Icon, hue }) => (
            <NeedsRow key={title} icon={<Icon size={16} color={HUE[hue].ink} />} hue={hue} title={title} meta={meta} />
          ))}
        </Group>
        <View style={styles.note} accessible accessibilityRole="text">
          <Info size={18} color={color.blue} />
          <Text style={styles.noteText}>
            None of this asks you to buy anything. The record is yours whether or not you ever take an optimization plan.
          </Text>
        </View>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  stack: { gap: space.section },
  /* A quiet light blue note: outlined info icon, then the sentence, top aligned. */
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.lead,
    backgroundColor: color.blueTint,
    borderRadius: touchRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.content },
})
