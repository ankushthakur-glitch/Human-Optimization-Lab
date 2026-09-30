import * as React from "react"
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from "react-native"

import { FlowScreen, Section } from "@/components/flow"
import { RecordBlocks } from "@/components/record-blocks"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DATA_TYPES, SOURCES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Step 4, the last: the record builds, told the way a patient thinks about
   it rather than the way the networks work. One progress bar with the stage
   in plain words, then each kind of record filling in with its count. Timed for the prototype: the real Patient360 pull is
   asynchronous and can take minutes, so the patient may leave and is told
   when it's ready. */

const FOLDER = require("../../../assets/images/record-folder.png")

const count = (key: (typeof DATA_TYPES)[number]["key"]) => DATA_TYPES.find((t) => t.key === key)!.count
const TOTAL = DATA_TYPES.reduce((sum, t) => sum + t.count, 0)

/** The finished record by share: the three biggest kinds, then the rest. */
const SHARE = [
  { label: "Lab results", count: count("Observation.lab"), tone: color.primary },
  { label: "Vitals", count: count("Observation.vital"), tone: "#7FB3BC" },
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
    dashboard. */
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
      back={false}
      title={done ? "Your record is ready" : "Building your record"}
      art={
        done ? (
          <Image source={FOLDER} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <RecordBlocks size={130} />
        )
      }
      footer={
        <Button onPress={onDone} disabled={!done}>
          Go to my dashboard
        </Button>
      }
    >
      {done ? <RecordShare /> : <Progress percent={percent} label={STAGE_TEXT[stage]} />}

      {stage !== "finding" && !done && (
        <Section title="Your record">
          <View style={styles.list}>
            {DATA_TYPES.map((t, i) => {
              const inNow = i < landed
              const loading = i === landed && stage === "collecting"
              return (
                <View key={t.key} style={[styles.row, i < DATA_TYPES.length - 1 && styles.rule]}>
                  <Tile icon={t.icon} muted={!inNow} />
                  <Text style={[styles.rowLabel, !inNow && styles.dim]}>{t.label}</Text>
                  {inNow ? (
                    <Text style={styles.count}>{t.count}</Text>
                  ) : loading ? (
                    <ActivityIndicator size="small" color={color.primary} />
                  ) : (
                    <View style={styles.placeholder} />
                  )}
                </View>
              )
            })}
          </View>
        </Section>
      )}
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

function Tile({ icon, muted }: { icon: RecordIconName; muted?: boolean }) {
  return (
    <View style={[styles.tile, muted && styles.tileMuted]}>
      <RecordIcon name={icon} size={18} color={muted ? color.muted : color.primary} />
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
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressPercent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { width }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  art: { width: 112, height: 112 },

  progress: { gap: 10 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressLabel: { fontFamily: font.medium, fontSize: 15, color: color.text },
  progressPercent: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: color.canvas, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4, backgroundColor: color.primary },

  share: { backgroundColor: color.canvas, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  shareHead: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingTop: 12 },
  shareValue: { fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.6, color: color.text },
  shareText: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  shareBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 2, marginTop: 12 },
  legend: { paddingVertical: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sharePercent: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  legendCount: { fontFamily: font.semibold, fontSize: 15, color: color.text, minWidth: 28, textAlign: "right" },

  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  tileMuted: { backgroundColor: color.canvas },

  list: { borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.text },
  dim: { color: color.muted },
  count: { fontFamily: font.semibold, fontSize: 17, color: color.text, minWidth: 24, textAlign: "right" },
  placeholder: { width: 24, height: 8, borderRadius: 4, backgroundColor: color.canvas },
})
