import * as React from "react"
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg"

import { color } from "@/lib/theme"
import { movingThreshold, valueText, type Status, type Trend } from "@/lib/trends"

/* The trend tile's graph (Figma "Hol" component 40024605:199273): three
   bands (white over two #F8FCF8 with a 0.3 #DFDFE4 rule), the teal area
   and its #92CAC8 line, the latest mark at the line's end. Drawn through
   the marker's last five comparable results, each a dot (5 Oct call: the
   last results, not one number). The trend tile draws it. */

/** The status colours: the ring's edge (/07) and the latest dot's fill (/06). */
export const TONE: Record<Status, { edge: string; fill: string; word: string }> = {
  out: { edge: "#D9363E", fill: "#E94A52", word: "Out of range" },
  borderline: { edge: "#B25A12", fill: "#C8641B", word: "Borderline" },
  in: { edge: "#2F7F4D", fill: "#3C9B61", word: "In range" },
}

/** The two lower bands and the rule over them, as the Figma's. */
const BAND = "#F8FCF8"
const BAND_EDGE = "#DFDFE4"

const MOST = 5
/** The graph's height, as the Figma's. */
const PLOT = 40
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

/** A rising result out of its range: its line and area are red instead
    of teal, wherever the graph is drawn (6 Oct 2026). */
export const risingAway = (t: Trend) => t.movement === "rising" && t.status !== "in"

const RED_LINE = "#E5484D"

export function RecentDots({ trend: t, style, alert = risingAway(t) }: { trend: Trend; style?: StyleProp<ViewStyle>; alert?: boolean }) {
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
  const band = PLOT / 3
  const stroke = alert ? RED_LINE : color.primaryLine
  const fill = alert ? color.high : color.primaryText

  return (
    <View style={[styles.graph, style]} onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w > 0 && points.length > 0 && (
        <>
          <Svg width={w} height={PLOT}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={fill} stopOpacity={0.16} />
                <Stop offset="1" stopColor={fill} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={band} fill="#FFFFFF" />
            <Rect x={0} y={band} width={w} height={PLOT - band} fill={BAND} />
            <Line x1={0} x2={w} y1={band} y2={band} stroke={BAND_EDGE} strokeWidth={0.3} />
            <Path d={area} fill={`url(#${gid})`} />
            <Path d={line} stroke={stroke} strokeWidth={1} fill="none" />
            {xy.map(([px, py], i) =>
              i === last ? (
                <React.Fragment key={points[i].t}>
                  <Circle cx={px} cy={py} r={3.6} fill="#FFFFFF" stroke={tone.edge} strokeWidth={0.754} strokeOpacity={0.2} />
                  <Circle cx={px} cy={py} r={1.8} fill={tone.fill} stroke={tone.edge} strokeWidth={0.754} />
                </React.Fragment>
              ) : (
                <Circle key={points[i].t} cx={px} cy={py} r={2.2} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
              ),
            )}
          </Svg>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  graph: { height: PLOT },
})
