import * as React from "react"
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Defs, LinearGradient, Mask, Path, Rect, Stop } from "react-native-svg"

import { inRange } from "@/lib/record"
import { movingThreshold, pointStatus, valueText, type Status, type Trend } from "@/lib/trends"

/* The trend tile's graph (Figma "Hol" component 40024605:199273): three
   bands (white over two #F8FCF8 with a 0.3 #DFDFE4 rule), the teal area
   and its #92CAC8 line, the latest mark at the line's end. Drawn through
   the marker's last five comparable results, each a dot (5 Oct call: the
   last results, not one number). The trend tile draws it. */

/** The status colours: the ring's edge (/07) and the latest dot's fill (/06). */
export const TONE: Record<Status, { edge: string; fill: string; word: string; line: string; card: string; band: string }> = {
  out: { edge: "#D9363E", fill: "#E94A52", word: "Out of range", line: "#EF4444", card: "#FFFFFF", band: "#FEF2F2" },
  borderline: { edge: "#B88700", fill: "#E2A400", word: "Borderline", line: "#E2A400", card: "#FFFFFF", band: "#FFFBEB" },
  in: { edge: "#2F7F4D", fill: "#34A862", word: "In range", line: "#34A862", card: "#FFFFFF", band: "#F0FAF4" },
}

const GREEN = [0x34, 0xa8, 0x62]
const YELLOW = [0xe2, 0xa4, 0x00]
const RED = [0xe5, 0x48, 0x4d]
const mix = (a: number[], b: number[], k: number) => `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("")}`

/** How far a result is from its range, as a colour on a green, yellow, red
    scale: green inside, yellow at the edge, red once it is a quarter of the
    limit beyond it. A run that drifts away turns from green to red. */
export function severityColor(t: Trend, p: Parameters<typeof pointStatus>[1]): string {
  const b = t.marker
  const status = pointStatus(b, p)
  if (status === "in") return mix(GREEN, GREEN, 0)
  if (status === "borderline") return mix(YELLOW, YELLOW, 0)
  if (b.zones && b.zones.length > 1) return mix(RED, RED, 0)
  const over = b.high !== undefined && p.value >= b.high ? (p.value - b.high) / b.high : b.low !== undefined ? (b.low - p.value) / b.low : 1
  const k = Math.min(Math.max(over, 0) / 0.25, 1)
  return mix(YELLOW, RED, k)
}

/** The graph line's colour by the patient's progress against their
    baseline, the first result (13 Oct 2026): red when they are further from
    their target than at the baseline, orange when they have closed less than
    half the gap, green when they have closed half or more, blue once the
    goal is reached (the latest result is in range). Undefined with no
    baseline to compare, one result only. */
export const PROGRESS = { below: "#E5484D", slight: "#F28C28", well: "#2FAE6B", goal: "#2F6FED" } as const

export function progressColor(t: Trend): string | undefined {
  const first = t.series[0]
  const latest = t.series[t.series.length - 1]
  if (!first || !latest || t.series.length < 2) return undefined
  const b = t.marker
  if (inRange(b, latest.value)) return PROGRESS.goal
  const above = b.high !== undefined && latest.value >= b.high
  // The gap to close at the baseline, and how much of it is closed now.
  const gap = above ? first.value - b.high! : b.low !== undefined ? b.low - first.value : 0
  // Already in range at the baseline and out now: further away.
  if (gap <= 0) return PROGRESS.below
  const closed = (above ? first.value - latest.value : latest.value - first.value) / gap
  return closed < 0 ? PROGRESS.below : closed < 0.5 ? PROGRESS.slight : PROGRESS.well
}

/** A line's colour across the graph: each result's own status colour at its
    x, so a run that worsens turns from green through orange to red (the
    line, the dots and the area under it all read this one gradient). */
export function statusStops(t: Trend, xs: readonly number[]) {
  const progress = progressColor(t)
  if (progress)
    return [<Stop key="from" offset={0} stopColor={progress} />, <Stop key="to" offset={1} stopColor={progress} />]
  const from = xs[0]
  const span = Math.max(xs[xs.length - 1] - from, 1)
  return recentPoints(t).map((p, i) => <Stop key={p.t} offset={(xs[i] - from) / span} stopColor={severityColor(t, p)} />)
}

/** One result's status colour, for its dot. */
export const dotTone = (t: Trend, p: Parameters<typeof pointStatus>[1]) => {
  const base = TONE[pointStatus(t.marker, p)]
  const c = progressColor(t) ?? severityColor(t, p)
  return { ...base, line: c, fill: c, edge: c }
}

const MOST = 5
/** The graph's height, as the Figma's. */
const PLOT = 52
/** The latest mark's ring: how far the first and last dots keep from the
    sides, and the line from the top. */
const REACH = 4

/** The values the graph shows, latest last: the last five. */
export const recentPoints = (t: Trend) => t.series.slice(-MOST)

/** "Last 3 results: 5.3, 5.7, 5.9" for a screen reader. */
export const recentWords = (t: Trend) => {
  const recent = t.series.slice(-MOST)
  if (recent.length < 2) return ""
  return `Last ${recent.length} ${t.noun}: ${recent.map((p) => valueText(t.marker, p)).join(", ")}`
}

/** `plain` draws just the line, its area and the latest mark: no bands, no
    dots along the way (the results row). */
export function RecentDots({ trend: t, style, plain }: { trend: Trend; style?: StyleProp<ViewStyle>; alert?: boolean; plain?: boolean }) {
  const [w, setW] = React.useState(0)
  const gid = `spark${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    setW((old) => (old === width ? old : width))
  }
  const points = w > 0 ? recentPoints(t) : []
  const values = points.map((p) => p.value)
  // The line rises from near the bottom to just under the top, but a
  // change smaller than counts as moving (lib/trends.ts) stays a ripple:
  // the scale spans at least twice that threshold.
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, movingThreshold(t.marker) * 2)
  const lo = (min + max) / 2 - span / 2
  const y = (v: number) => (span > 0 ? PLOT - 6 - ((v - lo) / span) * (PLOT - 6 - REACH * 2) : PLOT * 0.55)
  const x = (i: number) => (points.length > 1 ? REACH + (i * (w - 2 * REACH)) / (points.length - 1) : w / 2)
  const xy = points.map((p, i) => [x(i), y(p.value)] as const)
  // A smooth line that never overshoots a result: each bend's handles sit
  // level with its ends, halfway across.
  const line = xy.length
    ? xy
        .map(([px, py], i) => {
          if (!i) return `M0 ${py} L${px} ${py}`
          const [ax, ay] = xy[i - 1]
          const mid = (ax + px) / 2
          return `C${mid} ${ay} ${mid} ${py} ${px} ${py}`
        })
        .join(" ") + ` L${w} ${xy[xy.length - 1][1]}`
    : ""
  const area = line ? `${line} L${w} ${PLOT} L0 ${PLOT} Z` : ""
  const tone = TONE[t.status]
  const last = points.length - 1
  const xs = xy.map(([px]) => px)
  const stroke = `url(#${gid}-line)`

  return (
    <View style={[styles.graph, style]} onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w > 0 && points.length > 0 && (
        <>
          <Svg width={w} height={PLOT}>
            <Defs>
              <LinearGradient id={`${gid}-line`} gradientUnits="userSpaceOnUse" x1={xs[0]} y1="0" x2={xs[xs.length - 1] + 0.01} y2="0">
                {statusStops(t, xs)}
              </LinearGradient>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <Mask id={`${gid}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={PLOT}>
                <Path d={area} fill={`url(#${gid})`} />
              </Mask>
            </Defs>
            {!plain && <Rect x={0} y={0} width={w} height={PLOT} fill={tone.band} />}
            <Rect x={0} y={0} width={w} height={PLOT} fill={stroke} mask={`url(#${gid}-mask)`} />
            <Path d={line} stroke={stroke} strokeWidth={1.8} fill="none" />
            {xy.map(([px, py], i) => {
              const dot = dotTone(t, points[i])
              return plain && i !== last ? null : i === last ? (
                <React.Fragment key={points[i].t}>
                  <Circle cx={px} cy={py} r={4.2} fill="#FFFFFF" stroke={dot.edge} strokeWidth={0.754} strokeOpacity={0.2} />
                  <Circle cx={px} cy={py} r={2.4} fill={dot.fill} stroke={dot.edge} strokeWidth={0.754} />
                </React.Fragment>
              ) : (
                <Circle key={points[i].t} cx={px} cy={py} r={2.6} fill="#FFFFFF" stroke={dot.line} strokeWidth={1} />
              )
            })}
          </Svg>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  graph: { height: PLOT },
})
