import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { WeekBars } from "@/components/charts"
import { Card, ChipRow, Block, Tabs } from "@/components/record-kit"
import { Foot } from "@/components/topic-kit"
import {
  WINDOWS_ALL,
  WINDOWS_TOPIC,
  averageOf,
  barsOf,
  cell,
  changeOf,
  changeShort,
  figure,
  type Change,
  type Metric,
  type TopicHistory,
  type Win,
} from "@/lib/history"
import { color, hairline, ink, space, surface, type } from "@/lib/theme"

/* One history view (Journey_14 screens 41 to 47): the same figures graphed
   over time in the shape patients already know from Apple Health. The
   window (week, month, six months, year, and the day on a topic) and the
   metric switch independently, so any of the twelve or more combinations
   is one screen. The graph carries the target as a hairline, so a bar is
   read as over or under it rather than as tall or short; the readout above
   it follows the bar she taps. Under it, every window's average at once:
   one metric down the windows on the overall view, every metric across
   them on a topic, where a row opens its chart. A cell with no history is
   "—", never a zero: an average that quietly drops what did not exist
   would read well and mean nothing. */

/** The words of a change: green when it is the right way, clay when not
    (red is never words), grey when it is level. */
const TONE: Record<Change["tone"], { ink: string; fill: string }> = {
  good: { ink: ink.good, fill: color.okTint },
  bad: { ink: "#A95413", fill: color.amberTint },
  plain: { ink: ink.secondary, fill: surface.inset },
}

const DAY_WORD: Record<Win, string> = { day: "blocks", week: "days", month: "weeks", half: "months", year: "months" }

export function HistoryView({ history, overall }: { history: TopicHistory; overall?: boolean }) {
  const windows = overall ? WINDOWS_ALL : WINDOWS_TOPIC
  const [win, setWin] = React.useState<Win>("week")
  const chips = history.metrics.filter((x) => x.chip)
  const [metricId, setMetricId] = React.useState(chips[0].id)
  const metric = history.metrics.find((x) => x.id === metricId) ?? chips[0]
  const bars = React.useMemo(() => barsOf(metric, win), [metric, win])
  const [picked, setPicked] = React.useState<number>()
  React.useEffect(() => setPicked(undefined), [metric.id, win])
  const open = (id: string) => {
    if (history.metrics.find((x) => x.id === id)?.chip) setMetricId(id)
  }

  return (
    <View style={styles.wrap}>
      <Tabs options={windows} value={win} onChange={setWin} snug />
      <ChipRow options={chips.map((x) => ({ value: x.id, label: x.chip }))} value={metric.id} onChange={setMetricId} tick={false} label="Metric" />

      <Card style={styles.card}>
        {bars ? <Chart metric={metric} win={win} bars={bars} picked={picked} onPick={setPicked} /> : <Young text={history.young} />}
      </Card>

      <Block title={overall ? "Averaged across every window" : "Across every window"} meta={overall ? "per day" : "average"}>
        {overall ? <WindowTable metric={metric} /> : <MetricTable history={history} selected={metric.id} onOpen={open} />}
      </Block>

      <Foot>{history.foot}</Foot>
    </View>
  )
}

/* --------------------------------------------------------------- chart -- */

function Chart({ metric, win, bars, picked, onPick }: { metric: Metric; win: Win; bars: { label: string; value: number }[]; picked?: number; onPick: (i: number) => void }) {
  const shift = metric.axisMin ?? 0
  const yesterday = win === "day" && !metric.additive
  // A day that does not add up (a score, an efficiency) is read from its
  // latest night; every other window from its average.
  const head = yesterday ? bars[bars.length - 1].value : (averageOf(metric, win) as number)
  const change = changeOf(metric, win)
  const unit = metric.unit
  const target = metric.target
  const met = (v: number) => (target === undefined ? false : metric.better === "down" ? v <= target : v >= target)
  const count = bars.filter((b) => met(b.value)).length
  const trailing =
    target !== undefined && metric.shape !== "trend"
      ? `${count} of ${bars.length} ${DAY_WORD[win]} ${metric.better === "down" ? "under" : "on"} target`
      : metric.shape === "trend"
        ? `Latest ${figure(metric, metric.latest ?? head)} ${unit}`
        : `Average ${figure(metric, head)}`

  return (
    <View style={styles.chart}>
      <Text style={styles.cap}>{(yesterday ? metric.title.replace(/, (nightly|daily) average/, ", last night") : metric.title)}</Text>
      <View style={styles.headRow}>
        <Text style={styles.headValue} accessibilityRole="header">
          {metric.shape === "trend" ? figure(metric, metric.latest ?? head) : figure(metric, head)}
          {!!unit && <Text style={type.unitLarge}>{` ${unit}`}</Text>}
        </Text>
        {change && <Text style={[styles.change, { color: TONE[change.tone].ink }]}>{change.text}</Text>}
      </View>
      <WeekBars
        days={bars.map((b) => ({ label: b.label, value: b.value - shift }))}
        goal={target !== undefined ? target - shift : undefined}
        format={(v) => figure(metric, v + shift)}
        unit={unit === "of 100" ? "" : unit}
        name={metric.title}
        dayWord={DAY_WORD[win]}
        trailing={trailing}
        selected={picked ?? bars.length - 1}
        onSelect={onPick}
        playKey={`history:${metric.id}:${win}`}
      />
    </View>
  )
}

/** A window with no history yet: said, not drawn as an empty chart. */
function Young({ text = "There is no history in this window yet." }: { text?: string }) {
  return (
    <View style={styles.young}>
      <Text style={type.title}>Not enough history yet</Text>
      <Text style={type.label}>{text}</Text>
    </View>
  )
}

/* -------------------------------------------------------------- tables -- */

const WINDOW_ROWS: { win: Win; label: string; index: number }[] = [
  { win: "week", label: "Week", index: 0 },
  { win: "month", label: "Month", index: 1 },
  { win: "half", label: "6 months", index: 2 },
  { win: "year", label: "Year", index: 3 },
]

/** One metric down the four windows, each with its change on the next. */
function WindowTable({ metric }: { metric: Metric }) {
  return (
    <View style={styles.table}>
      {WINDOW_ROWS.map((r, i) => {
        const text = cell(metric, r.index)
        const change = changeShort(metric, r.win)
        return (
          <View key={r.win} style={[styles.row, i > 0 && styles.rule]} accessible accessibilityLabel={`${r.label}, ${text ?? "no history"} ${metric.row}${change ? `, ${change.text}` : ""}`}>
            <Text style={[styles.rowName, styles.fill]}>{r.label}</Text>
            <Text style={type.meta}>{metric.row}</Text>
            <Text style={[styles.value, text === null && styles.none]}>{text ?? "—"}</Text>
            <View style={[styles.chip, { backgroundColor: change ? TONE[change.tone].fill : "transparent" }]}>
              <Text style={[styles.chipText, { color: change ? TONE[change.tone].ink : ink.tertiary }]}>{change?.text ?? "—"}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Every metric across the windows, the one she is looking at marked. */
function MetricTable({ history, selected, onOpen }: { history: TopicHistory; selected: string; onOpen: (id: string) => void }) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headRowTable]}>
        <Text style={[styles.th, styles.fill]}>Metric</Text>
        {["WK", "MO", "6 MO", "YR"].map((h) => (
          <Text key={h} style={[styles.th, styles.col]}>
            {h}
          </Text>
        ))}
      </View>
      {history.metrics.map((x) => {
        const on = x.id === selected
        const cells = [0, 1, 2, 3].map((i) => cell(x, i))
        return (
          <Pressable
            key={x.id}
            onPress={() => onOpen(x.id)}
            disabled={!x.chip}
            accessibilityRole={x.chip ? "button" : undefined}
            accessibilityLabel={`${x.row}: ${cells.map((c, i) => `${["week", "month", "six months", "year"][i]} ${c ?? "no history"}`).join(", ")}`}
            accessibilityHint={x.chip ? "Shows its chart" : undefined}
            style={({ pressed }) => [styles.row, styles.rule, on && styles.rowOn, pressed && styles.pressed]}
          >
            <Text style={[styles.rowName, styles.fill, on && styles.rowNameOn]}>{x.row}</Text>
            {cells.map((c, i) => (
              <Text key={i} style={[styles.value, styles.col, c === null && styles.none]} numberOfLines={1}>
                {c ?? "—"}
              </Text>
            ))}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.item },
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  card: { gap: space.inline },
  chart: { gap: space.inline },
  cap: { ...type.caption, color: ink.secondary },
  headRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  headValue: { ...type.display, fontSize: 28, lineHeight: 34, fontVariant: ["tabular-nums"] },
  change: { ...type.metaStrong },
  young: { gap: space.stack, paddingVertical: space.gutter },

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, minHeight: 40, paddingHorizontal: space.item, paddingVertical: 8 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowOn: { backgroundColor: color.primaryTint },
  headRowTable: { minHeight: 30, paddingVertical: 6, backgroundColor: surface.inset },
  th: { ...type.caption, color: ink.secondary },
  col: { width: 52, textAlign: "right" },
  rowName: { ...type.title, color: ink.strong },
  rowNameOn: { color: ink.primary },
  value: { ...type.value, fontVariant: ["tabular-nums"] },
  none: { color: ink.tertiary, fontFamily: type.body.fontFamily },
  chip: { minWidth: 44, alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  chipText: { ...type.tag, fontVariant: ["tabular-nums"] },
})

