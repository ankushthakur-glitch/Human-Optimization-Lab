import * as React from "react"
import { Animated, type LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native"

import { useEntrance } from "@/components/charts"
import { chart, color, ink, radius, space, surface, type } from "@/lib/theme"

/* Biological age against calendar age on one shared age line (the reference
   card: the biological age as the big number, the calendar age under it, and
   a zoned line with a hollow dot for "you" and a solid one for "body").

   It plays once on arrival: the number counts up from the calendar age and
   the solid dot slides out from the hollow one. Touch or drag anywhere on the
   line to compare any age with the calendar age; the readout below says how
   many years older or younger that is. Letting go returns to the estimate.
   The line runs a few decades either side, on round numbers, so the gap
   reads without being stretched. */

const DOT = 22
const HIT = 48
const EDGE = 0.14
const TAG_W = 72
const STEP = 10

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

export function AgeCompare({ calendar, biological }: { calendar: number; biological: number }) {
  const gap = biological - calendar
  const lo = Math.floor((Math.min(calendar, biological) - 12) / STEP) * STEP
  const hi = Math.ceil((Math.max(calendar, biological) + 12) / STEP) * STEP
  const at = (age: number) => (age - lo) / (hi - lo)
  const a = at(calendar)
  const b = at(biological)

  const tone = gap > 0 ? chart.outside : gap < 0 ? chart.inRange : chart.data
  const t = useEntrance("age-compare", { delay: 150, duration: 900 })

  /* The big number counts from the calendar age to the estimate. */
  const [shown, setShown] = React.useState(biological)
  React.useEffect(() => {
    const id = t.addListener(({ value }) => setShown(Math.round(calendar + (biological - calendar) * value)))
    return () => t.removeListener(id)
  }, [t, calendar, biological])

  /* The scrubber: an age under the finger, or null when at rest. */
  const [probe, setProbe] = React.useState<number | null>(null)
  const width = React.useRef(1)
  const onLayout = (e: LayoutChangeEvent) => {
    width.current = Math.max(e.nativeEvent.layout.width, 1)
  }
  const [responder] = React.useState(() => {
    const pick = (x: number) => setProbe(Math.round(lo + clamp(x / width.current, 0, 1) * (hi - lo)))
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: () => setProbe(null),
      onPanResponderTerminate: () => setProbe(null),
      onPanResponderTerminationRequest: () => true,
    })
  })
  const nudge = (step: number) => setProbe((p) => clamp((p ?? biological) + step, lo, hi))

  const bodyLeft = t.interpolate({ inputRange: [0, 1], outputRange: [`${a * 100}%`, `${b * 100}%`] })
  const spanW = t.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.abs(b - a) * 100}%`] })

  /* Zones: easy up to the calendar age, then the stretch to the estimate,
     then beyond it. A younger estimate leaves the whole stretch below the
     calendar age easy. */
  const zones =
    gap > 0
      ? [
          { w: a, c: chart.zoneIn },
          { w: b - a, c: chart.zoneBorderline },
          { w: 1 - b, c: chart.zoneOut },
        ]
      : [
          { w: a, c: chart.zoneIn },
          { w: 1 - a, c: chart.zoneBorderline },
        ]

  const probeGap = probe === null ? 0 : probe - calendar
  const summary = `Calendar age ${calendar}. Estimated biological age ${biological}, ${
    gap === 0 ? "the same" : `${years(Math.abs(gap))} ${gap > 0 ? "older" : "younger"}`
  }.`

  return (
    <View style={styles.wrap}>
      <View accessible accessibilityLabel={summary} style={styles.head}>
        <Text style={styles.cap} maxFontSizeMultiplier={1.3}>
          Biological age
        </Text>
        <Text style={[styles.big, { color: tone }]} maxFontSizeMultiplier={1.2}>
          {shown}
        </Text>
        <Text style={styles.cap} maxFontSizeMultiplier={1.3}>
          Your calendar age is <Text style={styles.capStrong}>{calendar}</Text>
        </Text>
      </View>

      <View>
        <View style={styles.tags}>
          <Tag at={a} value={calendar} word="you" tone={chart.dataStrong} />
          <Tag at={b} value={biological} word="body" tone={tone} fade={t} />
        </View>

        <View style={styles.lineArea} onLayout={onLayout}>
          <View style={styles.track}>
            {zones.map((z, i) => (
              <View key={i} style={{ flex: z.w, backgroundColor: z.c }} />
            ))}
          </View>
          {gap !== 0 && (
            <Animated.View style={[styles.span, { left: `${Math.min(a, b) * 100}%`, width: spanW, borderColor: tone }]} />
          )}
          <View style={[styles.dot, styles.dotCalendar, { left: `${a * 100}%` }]} />
          {gap !== 0 && <Animated.View style={[styles.dot, { left: bodyLeft, backgroundColor: tone }]} />}
          {probe !== null && <View style={[styles.dot, styles.probe, { left: `${at(probe) * 100}%` }]} />}

          <View
            {...responder.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Compare an age with your calendar age"
            accessibilityValue={{ min: lo, max: hi, now: probe ?? biological }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === "increment" ? 1 : -1)}
            style={styles.hit}
          />
        </View>

        <View style={styles.ends}>
          <Text style={styles.axis}>{lo}</Text>
          <Text style={styles.axis}>{hi}</Text>
        </View>
      </View>

      {/* Only while the line is touched: no standing hint under it. */}
      {probe !== null && (
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
            <Text style={styles.hintStrong}>Age {probe}</Text>
            {probeGap === 0
              ? " is your calendar age"
              : ` is ${years(Math.abs(probeGap))} ${probeGap > 0 ? "older" : "younger"} than you`}
          </Text>
        </View>
      )}
    </View>
  )
}

/** A number and its word centred over its dot, kept inside the card. The
    body tag fades in as its dot leaves the hollow one. */
function Tag({
  at,
  value,
  word,
  tone,
  fade,
}: {
  at: number
  value: number
  word: string
  tone: string
  fade?: Animated.Value
}) {
  const x = clamp(at, EDGE, 1 - EDGE)
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.tag, { left: `${x * 100}%` }, fade && { opacity: fade.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }) }]}
    >
      <Text style={[styles.tagText, { color: tone }]} maxFontSizeMultiplier={1.3}>
        {value} {word}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
  head: { alignItems: "center", gap: space.stack },
  cap: { ...type.body, textAlign: "center" },
  capStrong: { fontFamily: type.value.fontFamily, color: ink.strong },
  big: { fontFamily: type.display.fontFamily, fontSize: 64, lineHeight: 72, fontVariant: ["tabular-nums"] },

  tags: { height: 24 },
  tag: { position: "absolute", bottom: 4, width: TAG_W, marginLeft: -TAG_W / 2, alignItems: "center" },
  tagText: { ...type.metaStrong, fontVariant: ["tabular-nums"] },

  lineArea: { height: DOT, justifyContent: "center" },
  track: { height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row" },
  span: { position: "absolute", height: 14, borderRadius: 7, borderWidth: 1, opacity: 0.35 },
  dot: {
    position: "absolute",
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    borderRadius: DOT / 2,
    borderWidth: 3,
    borderColor: ink.onColor,
    boxShadow: "0 1px 3px rgba(16, 24, 40, 0.25)",
  },
  dotCalendar: { backgroundColor: ink.onColor, borderColor: chart.data },
  probe: { width: DOT - 6, height: DOT - 6, marginLeft: -(DOT - 6) / 2, borderRadius: DOT / 2, backgroundColor: chart.goal, borderColor: ink.onColor },
  hit: { position: "absolute", left: 0, right: 0, top: (DOT - HIT) / 2, height: HIT },

  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: space.mark },
  axis: { ...type.axis },

  readout: { minHeight: 36, justifyContent: "center", alignItems: "center", paddingHorizontal: space.item, borderRadius: radius, backgroundColor: surface.inset },
  hint: { ...type.label, textAlign: "center", color: ink.secondary },
  hintStrong: { fontFamily: type.metaStrong.fontFamily, color: color.text },
})
