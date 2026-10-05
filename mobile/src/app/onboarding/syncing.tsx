import * as React from "react"
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { RecordBlocks } from "@/components/record-blocks"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DATA_TYPES, SOURCES } from "@/lib/record"
import { card, chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 4, the last: the record builds, told the way a patient thinks about
   it rather than the way the networks work. The same panel as the finished
   record: a running total with the stage in plain words, one bar filling,
   then each kind of record landing with its count. Timed for the prototype: the real Patient360 pull is
   asynchronous and can take minutes, so the patient may leave and is told
   when it's ready. */

const FOLDER = require("../../../assets/images/record-folder.png")

const count = (key: (typeof DATA_TYPES)[number]["key"]) => DATA_TYPES.find((t) => t.key === key)!.count
const TOTAL = DATA_TYPES.reduce((sum, t) => sum + t.count, 0)

/** The finished record by share: the three biggest kinds, then the rest. */
const SHARE = [
  { label: "Lab results", count: count("Observation.lab"), tone: color.primary },
  { label: "Vitals", count: count("Observation.vital"), tone: "#39BAB4" },
  { label: "Visits", count: count("Encounter"), tone: color.primaryHalo },
  {
    label: "Everything else",
    count: TOTAL - count("Observation.lab") - count("Observation.vital") - count("Encounter"),
    tone: "#DCE3E2",
  },
]

const SOURCE_MS = 900
const TYPE_MS = 240
const ORGANIZE_MS = 900

type Stage = "finding" | "collecting" | "organizing" | "done"

const STAGE_TEXT: Record<Exclude<Stage, "done">, string> = {
  finding: "Finding your providers",
  collecting: "Collecting your records",
  organizing: "Organizing your record",
}

export default function SyncingScreen() {
  const onboarding = useOnboarding()
  // Setup is done: the route guard opens the dashboard.
  return <BuildRecord onDone={() => onboarding.save({ step: "done" })} />
}

/** The record building, shared by setup and by connecting later from the
    dashboard. The swipe back leaves it, and it starts over on return. */
export function BuildRecord({ onDone }: { onDone: () => void }) {
  // How many providers have turned up, then how many kinds of record are in.
  const [found, setFound] = React.useState(0)
  const [landed, setLanded] = React.useState(0)
  const [organized, setOrganized] = React.useState(false)

  const stage: Stage =
    found < SOURCES.length ? "finding" : landed < DATA_TYPES.length ? "collecting" : organized ? "done" : "organizing"
  const done = stage === "done"
  const percent = Math.round(
    stage === "finding"
      ? (found / SOURCES.length) * 35
      : stage === "collecting"
        ? 35 + (landed / DATA_TYPES.length) * 55
        : stage === "organizing"
          ? 94
          : 100
  )

  React.useEffect(() => {
    if (done) return
    const [ms, step] =
      stage === "finding"
        ? [SOURCE_MS, () => setFound((n) => n + 1)]
        : stage === "collecting"
          ? [TYPE_MS, () => setLanded((n) => n + 1)]
          : [ORGANIZE_MS, () => setOrganized(true)]
    const timer = setTimeout(step, ms)
    return () => clearTimeout(timer)
  }, [stage, found, landed, done])

  return (
    <FlowScreen
      hol
      title={done ? "Your record is ready" : "Building your record"}
      art={
        done ? (
          <Image source={FOLDER} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <RecordBlocks size={112} />
        )
      }
      footer={
        <Button onPress={onDone} disabled={!done}>
          Go to my dashboard
        </Button>
      }
    >
      {done ? <RecordShare /> : <Building stage={stage} percent={percent} landed={landed} />}
    </FlowScreen>
  )
}

/** The finished record in one panel: the total, one bar split by share, and
    a dot legend with each part's share and count. */
function RecordShare() {
  return (
    <View style={styles.share}>
      <View style={styles.shareHead}>
        <Text style={styles.shareValue}>{TOTAL}</Text>
        <Text style={styles.shareText}>records from {SOURCES.length} providers</Text>
      </View>
      <View style={styles.shareBar}>
        {SHARE.map((x) => (
          <View key={x.label} style={{ flex: x.count, backgroundColor: x.tone }} />
        ))}
      </View>
      <View style={styles.legend}>
        {SHARE.map((x) => (
          <View key={x.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: x.tone }]} />
            <Text style={styles.rowLabel}>{x.label}</Text>
            <Text style={styles.sharePercent}>{Math.round((x.count / TOTAL) * 100)}%</Text>
            <Text style={styles.legendCount}>{x.count}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/** The record while it builds, in the same panel as the finished one: the
    running total and stage, one bar filling, then each kind of record with
    its count as it lands. */
function Building({ stage, percent, landed }: { stage: Exclude<Stage, "done">; percent: number; landed: number }) {
  const total = DATA_TYPES.slice(0, landed).reduce((sum, t) => sum + t.count, 0)
  return (
    <View style={styles.share}>
      <View style={styles.shareHead}>
        <Text style={styles.shareValue}>{total}</Text>
        <Text style={[styles.shareText, styles.grow]}>{STAGE_TEXT[stage]}</Text>
        <Text style={styles.progressPercent}>{percent}%</Text>
      </View>
      <Progress percent={percent} label={STAGE_TEXT[stage]} />
      <View style={styles.legend}>
        {DATA_TYPES.map((t, i) => {
          const inNow = i < landed
          const loading = i === landed && stage === "collecting"
          return (
            <View key={t.key} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: inNow ? color.primary : chart.track }]} />
              <Text style={[styles.rowLabel, !inNow && styles.dim]}>{t.label}</Text>
              {inNow ? (
                <Text style={styles.legendCount}>{t.count}</Text>
              ) : loading ? (
                <ActivityIndicator size="small" color={color.primary} />
              ) : (
                <View style={styles.placeholder} />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

/** The bar glides to each new value rather than jumping. */
function Progress({ percent, label }: { percent: number; label: string }) {
  const value = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.timing(value, {
      toValue: percent,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [percent, value])
  const width = value.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] })
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View style={[styles.bar, { width }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  art: { width: 112, height: 112 },

  progressPercent: { ...type.value, color: ink.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: chart.track, overflow: "hidden", marginTop: space.item },
  bar: { height: "100%", borderRadius: 4, backgroundColor: color.primary },
  grow: { flex: 1 },

  // The Figma "Hol" card: white at 60% on the page, radius 8, 12 inside.
  share: { backgroundColor: card.fill, borderRadius: 8, padding: space.card, boxShadow: card.shadow },
  shareHead: { flexDirection: "row", alignItems: "baseline", gap: space.inline },
  shareValue: { ...type.hero, color: ink.content },
  shareText: { ...type.label },
  shareBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginTop: space.item },
  // Rows split by the Figma's 0.8 rule, 12 either side of it.
  legend: { marginTop: space.stack },
  legendRow: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.rowY - 2, borderTopWidth: 0.8, borderTopColor: hairline.rule },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sharePercent: { ...type.label },
  legendCount: { ...type.value, color: ink.content, minWidth: 28, textAlign: "right" },

  rowLabel: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.detail },
  dim: { color: card.chevron },
  placeholder: { width: 24, height: 8, borderRadius: 4, backgroundColor: chart.track },
})
