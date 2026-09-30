import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { TrendChart } from "@/components/charts"
import { Badge, FlowScreen, Section } from "@/components/flow"
import { List, ListRow } from "@/components/list"
import { Button } from "@/components/ui"
import { PageNotFoundState } from "@/components/error-state"
import { DIRECTION_LABEL, ORIGIN_LABEL, biomarker, direction, inRange } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* One biomarker: the latest value against its target, every dated result
   on a chart over the target band, and each result with where it came
   from. The direction is only a direction; what it means is for the
   doctor. */

export default function BiomarkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const b = biomarker(id)
  if (!b) return <PageNotFoundState />

  const last = b.points.at(-1)!
  const out = !inRange(b, last.value)
  const dir = direction(b)

  return (
    <FlowScreen
      title={b.name}
      footer={
        <Button
          variant="outline"
          onPress={() => router.push({ pathname: "/assistant", params: { ask: `Explain my ${b.name} results` } })}
        >
          Ask the assistant about this
        </Button>
      }
    >
      <View style={styles.now}>
        <View style={styles.nowValue}>
          <Text style={[styles.value, out && { color: color.high }]}>{last.shown ?? last.value}</Text>
          <Text style={styles.unit}>{b.unit}</Text>
        </View>
        <View style={styles.nowMeta}>
          <Badge tone={out ? "high" : "ok"}>{out ? "Out of range" : "In range"}</Badge>
          <Text style={styles.meta}>Target {b.target.replace(/^Below/, "below")}</Text>
        </View>
      </View>

      <View style={styles.chart}>
        <TrendChart marker={b} />
        <View style={styles.direction}>
          <Text style={styles.directionLabel}>Direction</Text>
          <Text style={styles.directionValue}>{DIRECTION_LABEL[dir]}</Text>
        </View>
      </View>

      {b.methodNote && (
        <View style={styles.note}>
          <Text style={styles.noteText}>{b.methodNote}</Text>
        </View>
      )}

      <Section title="Every result">
        <List>
          {[...b.points].reverse().map((p, i) => (
            <ListRow
              key={i}
              title={`${p.shown ?? p.value} ${b.unit}`}
              meta={[p.date, ORIGIN_LABEL[p.origin], p.method].filter(Boolean).join(", ")}
              right={!inRange(b, p.value) ? <Badge tone="high">Out of range</Badge> : <Badge tone="ok">In range</Badge>}
            />
          ))}
        </List>
      </Section>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  now: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: -12 },
  nowValue: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  value: { fontFamily: font.semibold, fontSize: 44, lineHeight: 50, letterSpacing: -1.4, color: color.text },
  unit: { fontFamily: font.regular, fontSize: 16, color: color.muted },
  nowMeta: { alignItems: "flex-end", gap: 6, paddingBottom: 6 },
  meta: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  chart: { borderWidth: 1, borderColor: color.border, borderRadius: 20, paddingTop: 8, overflow: "hidden" },
  direction: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  directionLabel: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  directionValue: { fontFamily: font.medium, fontSize: 14, color: color.text },

  note: { backgroundColor: color.lowTint, borderRadius: 16, padding: 14 },
  noteText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },
})
