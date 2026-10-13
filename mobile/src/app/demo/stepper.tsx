import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Check } from "@/components/ph"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Review page, not a product screen: three steppers for the five-step set-up
   (goals, insights, about you, testing, payment). Today's is a "3 of 5"
   label over a plain bar. Each variation shows the same three states:
   completed (filled, with a check), current (ringed or tinted, named) and
   upcoming (quiet outline). Every one reads as one control to a screen
   reader ("Step 3 of 5, About you, 2 completed") and never relies on colour
   alone: completed has a check, current has its name or ring, upcoming has
   its number. Use the buttons to move through the steps. */

const STEPS = [
  { name: "Your goals", short: "Goals" },
  { name: "Your data insights", short: "Insights" },
  { name: "About you", short: "About you" },
  { name: "Required testing", short: "Testing" },
  { name: "Payment", short: "Payment" },
]

type State = "done" | "current" | "upcoming"
const stateOf = (i: number, now: number): State => (i < now ? "done" : i === now ? "current" : "upcoming")
const summary = (now: number) => `Step ${now + 1} of ${STEPS.length}, ${STEPS[now].name}, ${now} completed`

/** The wrapper every variation shares: one progressbar for assistive tech,
    the visual parts hidden from it so they are not read twice. */
function Stepper({ now, children }: { now: number; children: React.ReactNode }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={summary(now)} accessibilityValue={{ min: 1, max: STEPS.length, now: now + 1 }}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
    </View>
  )
}

/* 1 · Segmented bar: one segment per step under a "Step 3 of 5" line that
   names the step. Closest to today's bar, so the smallest change. */
function Segments({ now }: { now: number }) {
  return (
    <Stepper now={now}>
      <View style={styles.gap}>
        <View style={styles.between}>
          <Text style={styles.strong}>{STEPS[now].name}</Text>
          <Text style={styles.meta}>{`${now + 1} of ${STEPS.length}`}</Text>
        </View>
        <View style={styles.segments}>
          {STEPS.map((s, i) => {
            const st = stateOf(i, now)
            return <View key={s.name} style={[styles.segment, st === "done" && styles.segDone, st === "current" && styles.segNow]} />
          })}
        </View>
      </View>
    </Stepper>
  )
}

/* 2 · Numbered dots on a line: every step named, completed ones ticked,
   the current one ringed. The most explicit, and shows what is still
   ahead. Labels are the short names so five fit a phone's width. */
function Dots({ now }: { now: number }) {
  return (
    <Stepper now={now}>
      <View style={styles.dots}>
        {STEPS.map((s, i) => {
          const st = stateOf(i, now)
          return (
            <View key={s.name} style={styles.dotCol}>
              <View style={styles.dotLine}>
                <View style={[styles.rail, i === 0 && styles.railHide, i <= now && styles.railDone]} />
                <View style={[styles.dot, st === "done" && styles.dotDone, st === "current" && styles.dotNow]}>
                  {st === "done" ? <Check size={12} color={color.onPrimary} weight="bold" /> : <Text style={[styles.dotNum, st === "current" && styles.dotNumNow]}>{i + 1}</Text>}
                </View>
                <View style={[styles.rail, i === STEPS.length - 1 && styles.railHide, i < now && styles.railDone]} />
              </View>
              <Text style={[styles.dotLabel, st === "current" && styles.dotLabelNow]} numberOfLines={1}>
                {s.short}
              </Text>
            </View>
          )
        })}
      </View>
    </Stepper>
  )
}

/* 3 · Pills: completed steps shrink to a ticked circle, the current step
   opens into a tinted pill with its number and name, upcoming steps stay
   small numbered circles. Saves the most room and names the current step
   in full, so "Your data insights" does not need shortening. */
function Pills({ now }: { now: number }) {
  return (
    <Stepper now={now}>
      <View style={styles.gap}>
        <View style={styles.pills}>
          {STEPS.map((s, i) => {
            const st = stateOf(i, now)
            if (st === "current")
              return (
                <View key={s.name} style={styles.pillNow}>
                  <View style={styles.pillNum}>
                    <Text style={styles.pillNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.pillName} numberOfLines={1}>
                    {s.name}
                  </Text>
                </View>
              )
            return (
              <View key={s.name} style={[styles.pillDot, st === "done" && styles.pillDotDone]}>
                {st === "done" ? <Check size={14} color={color.onPrimary} weight="bold" /> : <Text style={styles.dotNum}>{i + 1}</Text>}
              </View>
            )
          })}
        </View>
        {now < STEPS.length - 1 && <Text style={styles.meta}>{`Next: ${STEPS[now + 1].name}`}</Text>}
      </View>
    </Stepper>
  )
}

const VARIANTS = [
  { id: "1", name: "Segmented bar", note: "One segment per step under the step's name. The smallest change from today's bar.", Body: Segments },
  { id: "2", name: "Numbered dots", note: "Every step named on a line: ticked when done, ringed when current. Shows the whole road.", Body: Dots },
  { id: "3", name: "Expanding pill", note: "Done and upcoming steps stay small; the current one opens to its full name, with the next step named below.", Body: Pills },
]

export default function StepperReview() {
  const [now, setNow] = React.useState(2)
  return (
    <FlowScreen page title="Stepper options">
      <View style={styles.controls}>
        <Pressable onPress={() => setNow(Math.max(0, now - 1))} disabled={now === 0} accessibilityRole="button" accessibilityLabel="Previous step" style={[styles.ctl, now === 0 && styles.ctlOff]}>
          <Text style={styles.ctlText}>Back</Text>
        </Pressable>
        <Text style={styles.meta}>{`Showing step ${now + 1} of ${STEPS.length}`}</Text>
        <Pressable onPress={() => setNow(Math.min(STEPS.length - 1, now + 1))} disabled={now === STEPS.length - 1} accessibilityRole="button" accessibilityLabel="Next step" style={[styles.ctl, now === STEPS.length - 1 && styles.ctlOff]}>
          <Text style={styles.ctlText}>Next</Text>
        </Pressable>
      </View>
      {VARIANTS.map(({ id, name, note, Body }) => (
        <View key={id} style={styles.variant}>
          <Text style={styles.name} accessibilityRole="header">{`${id} · ${name}`}</Text>
          <Text style={styles.meta}>{note}</Text>
          <View style={styles.frame}>
            <Body now={now} />
          </View>
        </View>
      ))}
    </FlowScreen>
  )
}

const DOT = 28
const styles = StyleSheet.create({
  gap: { gap: space.inline },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  strong: { ...type.title },
  meta: { ...type.meta },
  name: { ...type.section },
  variant: { gap: space.inline },
  frame: { padding: space.card, borderRadius: 12, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ctl: { minHeight: 44, minWidth: 72, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  ctlOff: { opacity: 0.4 },
  ctlText: { ...type.title, color: color.primary },

  segments: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: hairline.edge },
  segDone: { backgroundColor: color.primary },
  segNow: { backgroundColor: color.primary, opacity: 0.55 },

  dots: { flexDirection: "row" },
  dotCol: { flex: 1, alignItems: "center", gap: 6 },
  dotLine: { flexDirection: "row", alignItems: "center", width: "100%" },
  rail: { flex: 1, height: 2, backgroundColor: hairline.edge },
  railDone: { backgroundColor: color.primary },
  railHide: { backgroundColor: "transparent" },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5, borderColor: hairline.edge, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: color.primary, borderColor: color.primary },
  dotNow: { borderColor: color.primary, backgroundColor: color.primaryTint, borderWidth: 2 },
  dotNum: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.secondary },
  dotNumNow: { color: color.primary },
  dotLabel: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: ink.secondary },
  dotLabelNow: { fontFamily: font.medium, color: ink.strong },

  pills: { flexDirection: "row", alignItems: "center", gap: space.inline },
  pillDot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5, borderColor: hairline.edge, alignItems: "center", justifyContent: "center" },
  pillDotDone: { backgroundColor: color.primary, borderColor: color.primary },
  pillNow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: DOT + 8, paddingHorizontal: 4, paddingRight: 12, borderRadius: (DOT + 8) / 2, borderWidth: 1, borderColor: color.primary, backgroundColor: color.primaryTint },
  pillNum: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  pillNumText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.onPrimary },
  pillName: { ...type.title, flex: 1, color: color.primary },
})
