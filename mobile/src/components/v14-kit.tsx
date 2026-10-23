import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { WeekBars, formatNumber } from "@/components/charts"
import { Barbell, Brain, CaretRight, ForkKnife, Moon, Pill, Ruler, Watch } from "@/components/ph"
import { Block, Card, ChipRow, Group, HUE, Tabs, Tag, Tile, type Hue, type Tone } from "@/components/record-kit"
import { color, hairline, ink, space, type } from "@/lib/theme"
import { WEEKDAYS, WINDOWS, show, type GoalState, type History, type Metric, type TopicId, type Window } from "@/lib/v14"

/* The shared pieces of the v14 dummy screens (lib/v14.ts): a topic's icon
   and hue, its state as a tag, the device a number came from, the way a
   topic is answered, the Plan tab's four sections, and a topic's history
   (window tabs, metric chips, the week's bars against the goal, and the
   average over every window). Composed from the record kit, so the dummy
   reads as the same app. */

/* ------------------------------------------------------------ topics -- */

export const TOPIC_HUE: Record<TopicId, Hue> = {
  exercise: "amber",
  eat: "green",
  sleep: "violet",
  mind: "blue",
  medication: "teal",
  measure: "neutral",
}

export function TopicIcon({ id, size = 16 }: { id: TopicId; size?: number }) {
  const tint = HUE[TOPIC_HUE[id]].ink
  const Icon = { exercise: Barbell, eat: ForkKnife, sleep: Moon, mind: Brain, medication: Pill, measure: Ruler }[id]
  return <Icon size={size} color={tint} weight="bold" />
}

export function TopicTile({ id, size = 36 }: { id: TopicId; size?: number }) {
  return (
    <Tile hue={TOPIC_HUE[id]} size={size}>
      <TopicIcon id={id} />
    </Tile>
  )
}

/** A goal's state as one honest word: done, part done, short, not started,
    or due later today. */
export const STATE: Record<GoalState, { label: string; tone: Tone }> = {
  done: { label: "Done", tone: "ok" },
  partial: { label: "In progress", tone: "primary" },
  short: { label: "Short", tone: "low" },
  notStarted: { label: "Not started", tone: "muted" },
  due: { label: "Due later", tone: "soon" },
}

export function StateTag({ state }: { state: GoalState }) {
  return <Tag tone={STATE[state].tone}>{STATE[state].label}</Tag>
}

/** Where a number came from when nobody typed it (22 Oct call: exercise
    and sleep come off the wearable). */
export function Source({ from }: { from: string }) {
  return (
    <View style={styles.source}>
      <Watch size={12} color={ink.tertiary} />
      <Text style={type.meta}>{`From your ${from}`}</Text>
    </View>
  )
}

/* -------------------------------------------------------------- ways -- */

export type Way = {
  title: string
  line: string
  /** What it counts for: "Counts in full", "Dr. Patel is told". */
  effect: string
  icon: React.ReactNode
  onPress: () => void
}

/** How a topic is answered today. The deck lays out four equal ways; here
    the one most people take is the page's main card, and the other three
    sit under it as quieter rows, so the usual path is one tap and the
    rest are still in reach. */
export function Ways({ main, others, title = "Other ways to answer" }: { main: Way; others: Way[]; title?: string }) {
  return (
    <>
      <Card onPress={main.onPress} style={styles.main} accessibilityLabel={`${main.title}. ${main.line}. ${main.effect}`}>
        <View style={styles.mainIcon}>{main.icon}</View>
        <View style={styles.grow}>
          <Text style={type.section}>{main.title}</Text>
          <Text style={type.label}>{main.line}</Text>
        </View>
        <Tag tone="ok">{main.effect}</Tag>
      </Card>
      <Block title={title}>
        <Group>
          {others.map((w) => (
            <Pressable key={w.title} onPress={w.onPress} accessibilityRole="button" style={({ pressed }) => [styles.way, pressed && styles.pressed]}>
              <View style={styles.wayIcon}>{w.icon}</View>
              {/* What it counts for sits under the line, in teal, so the
                  title keeps the row's full width. */}
              <View style={styles.grow}>
                <Text style={type.title}>{w.title}</Text>
                <Text style={type.label}>{w.line}</Text>
                <Text style={styles.effect}>{w.effect}</Text>
              </View>
              <CaretRight size={14} color={hairline.outline} />
            </Pressable>
          ))}
        </Group>
      </Block>
    </>
  )
}

/** A dark band carrying today's target for a topic, as the deck draws it. */
export function TargetBand({ title, line, right, icon }: { title: string; line: string; right: string; icon: React.ReactNode }) {
  return (
    <View style={styles.band}>
      <View style={styles.bandIcon}>{icon}</View>
      <View style={styles.grow}>
        <Text style={styles.bandTitle}>{title}</Text>
        <Text style={styles.bandLine}>{line}</Text>
      </View>
      <Text style={styles.bandRight}>{right}</Text>
    </View>
  )
}

/** A short note from the plan, on the teal tint. */
export function PlanNote({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <Text style={type.body}>{children}</Text>
    </View>
  )
}

/* ----------------------------------------------------------- plan tab -- */

export type Section = "today" | "progress" | "history" | "outlook"

const SECTIONS: { value: Section; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "progress", label: "Progress" },
  { value: "history", label: "History" },
  { value: "outlook", label: "Outlook" },
]

/** The Plan tab's four sections (22 Oct call), pinned under its title. */
export function PlanSections({ value }: { value: Section }) {
  return <Tabs options={SECTIONS} value={value} snug onChange={(s) => s !== value && router.replace(`/v14/plan?section=${s}` as never)} />
}

/* ------------------------------------------------------------ history -- */

/** A topic's history: the window across the top, the metric under it, this
    week's bars against the goal, and every window's average below. The
    week is drawn for Day and Week; the longer windows lead with their
    average and keep the same table, so nothing jumps. */
export function TopicHistory({ history }: { history: History }) {
  const [win, setWin] = React.useState<Window>("week")
  const [metricId, setMetricId] = React.useState(history.metrics[0].id)
  const metric = history.metrics.find((m) => m.id === metricId) ?? history.metrics[0]
  const avg = win === "day" ? metric.week[6] : metric.windows[win]
  const prev = win === "week" ? metric.windows.month : win === "month" ? metric.windows["6mo"] : win === "6mo" ? metric.windows.year : undefined
  const change = typeof avg === "number" && typeof prev === "number" ? avg - prev : undefined
  const better = change !== undefined && metric.better ? (metric.better === "up" ? change >= 0 : change <= 0) : undefined
  return (
    <>
      <Tabs options={WINDOWS} value={win} onChange={setWin} snug />
      <ChipRow options={history.metrics.map((m) => ({ value: m.id, label: m.name }))} value={metric.id} onChange={setMetricId} tick={false} />
      <Card style={styles.chart}>
        <Text style={type.label}>{win === "day" ? `${metric.name}, yesterday` : `${metric.name}, ${win === "week" ? "daily average" : "average"}`}</Text>
        <View style={styles.readout}>
          <Text style={type.display}>
            {avg === undefined ? "No data" : show(avg, metric.format)}
            {avg !== undefined && <Text style={type.unitLarge}>{` ${metric.unit}`}</Text>}
          </Text>
          {change !== undefined && Math.abs(change) > 0 && (
            <Tag tone={better ? "ok" : "low"}>{`${change > 0 ? "+" : ""}${show(change, metric.format)} on the window before`}</Tag>
          )}
        </View>
        <WeekBars
          days={metric.week.map((v, i) => ({ label: WEEKDAYS[i], value: v, today: i === 6 }))}
          goal={metric.goal}
          unit={metric.unit}
          name={metric.name}
          format={(v) => (metric.format === "1dp" ? v.toFixed(1) : formatNumber(Math.round(v)))}
          readout={false}
          height={120}
        />
      </Card>
      <WindowTable metrics={history.metrics} />
      <Text style={type.meta}>{history.note}</Text>
    </>
  )
}

/** Every metric averaged over each window. An empty cell stays empty. */
export function WindowTable({ metrics }: { metrics: Metric[] }) {
  const cols: Exclude<Window, "day">[] = ["week", "month", "6mo", "year"]
  return (
    <Block title="Across every window" meta="Average">
      <View style={styles.table}>
        <View style={[styles.tr, styles.thead]}>
          <Text style={[type.caption, styles.tdName]}>Metric</Text>
          {cols.map((c) => (
            <Text key={c} style={[type.caption, styles.td]}>
              {WINDOWS.find((w) => w.value === c)?.label}
            </Text>
          ))}
        </View>
        {metrics.map((m, i) => (
          <View key={m.id} style={[styles.tr, i < metrics.length - 1 && styles.rule]}>
            <Text style={[type.title, styles.tdName]} numberOfLines={1}>
              {m.name}
            </Text>
            {cols.map((c) => (
              <Text key={c} style={[type.value, styles.td, m.windows[c] === undefined && styles.empty]} numberOfLines={1}>
                {m.windows[c] === undefined ? "Not yet" : show(m.windows[c], m.format)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Block>
  )
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.line },
  pressed: { opacity: 0.7 },
  source: { flexDirection: "row", alignItems: "center", gap: space.stack },
  main: { flexDirection: "row", alignItems: "center", gap: space.lead, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  mainIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  way: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  wayIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  effect: { ...type.meta, color: ink.primary },
  band: { flexDirection: "row", alignItems: "center", gap: space.lead, backgroundColor: "#1F2E2A", borderRadius: 12, padding: space.card },
  bandIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  bandTitle: { ...type.title, color: ink.onColor },
  bandLine: { ...type.label, color: "rgba(255,255,255,0.75)" },
  bandRight: { ...type.stat, color: ink.onColor },
  note: { backgroundColor: color.primaryTint, borderRadius: 8, padding: space.card },
  chart: { gap: space.inline },
  readout: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline, flexWrap: "wrap" },
  table: { backgroundColor: color.background, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: space.rowX, gap: space.stack },
  thead: { backgroundColor: "#F7F7FA" },
  rule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  tdName: { flex: 1.6 },
  td: { flex: 1, textAlign: "right" },
  empty: { color: ink.tertiary, fontFamily: type.meta.fontFamily },
})
