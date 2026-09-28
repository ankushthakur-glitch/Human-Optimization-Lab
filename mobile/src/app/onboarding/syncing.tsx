import * as React from "react"
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native"

import { FlowScreen, Section, SoftOrb } from "@/components/flow"
import { IconCheck } from "@/components/icons"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DATA_TYPES, SOURCES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Step 3, the last: the record builds, told the way a patient thinks about
   it rather than the way the networks work. One progress bar with the stage
   in plain words; the places their records were found (clinic, hospital,
   lab) appearing as they turn up; then each kind of record filling in with
   its count. Timed for the prototype: the real Patient360 pull is
   asynchronous and can take minutes, so the patient may leave and is told
   when it's ready. */

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
  const total = DATA_TYPES.reduce((sum, t) => sum + t.count, 0)

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
      step={3}
      back={false}
      title={done ? "Your record is ready" : "Building your record"}
      art={<SoftOrb size={130} orbit={!done} />}
      footer={
        // Setup is done: the route guard opens the dashboard.
        <Button onPress={() => onboarding.save({ step: "done" })} disabled={!done}>
          Go to my dashboard
        </Button>
      }
    >
      {done ? (
        <View style={styles.summary}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryText}>records from {SOURCES.length} providers</Text>
        </View>
      ) : (
        <Progress percent={percent} label={STAGE_TEXT[stage]} />
      )}

      <Section title="Found" gap={10}>
        {SOURCES.slice(0, found).map((s) => (
          <View key={s.name} style={styles.source}>
            <Tile icon={s.kind} />
            <View style={styles.sourceBody}>
              <Text style={styles.sourceName}>{s.name}</Text>
              <Text style={styles.sourceMeta}>{s.label}</Text>
            </View>
            <View style={styles.check}>
              <IconCheck size={12} color={color.onPrimary} strokeWidth={2.6} />
            </View>
          </View>
        ))}
        {stage === "finding" && (
          <View style={[styles.source, styles.searching]}>
            <ActivityIndicator size="small" color={color.primary} />
            <Text style={styles.searchingText}>Looking for more</Text>
          </View>
        )}
      </Section>

      {stage !== "finding" && (
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
  progress: { gap: 10 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressLabel: { fontFamily: font.medium, fontSize: 15, color: color.text },
  progressPercent: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: color.canvas, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4, backgroundColor: color.primary },

  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
    backgroundColor: color.primaryTint,
    borderRadius: 18,
    paddingVertical: 16,
  },
  summaryValue: { fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.6, color: color.primary },
  summaryText: { fontFamily: font.medium, fontSize: 15, color: color.text },

  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.canvas,
    borderRadius: 16,
    padding: 12,
  },
  sourceBody: { flex: 1, gap: 2 },
  sourceName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  sourceMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searching: { backgroundColor: color.background, borderWidth: 1, borderColor: color.border, borderStyle: "dashed", height: 64 },
  searchingText: { fontFamily: font.regular, fontSize: 14, color: color.muted },

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
