import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg"

import { comparable, inRange, type Biomarker } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The record's charts, drawn with react-native-svg: a biomarker's dated
   results over its target band, a sparkline for lists, the Inlay score
   dial, and plan progress with its forecast drawn dashed. */

/** Measures its own width, so a chart fills the column it is given. */
function useWidth(initial = 300) {
  const [width, setWidth] = React.useState(initial)
  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) => setWidth(Math.round(e.nativeEvent.layout.width))
  return { width, onLayout }
}

const line = (xy: [number, number][]) => xy.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")

/* ------------------------------------------------------------- trend -- */

/** Every dated result, the target band behind them, out of range points in
    red. Results from a different testing method are drawn hollow and left
    off the line. */
export function TrendChart({ marker, height = 190 }: { marker: Biomarker; height?: number }) {
  const { width, onLayout } = useWidth()
  const pts = marker.points
  const joined = comparable(marker)
  const pad = { top: 16, bottom: 30, left: 8, right: 40 }

  const values = [...pts.map((p) => p.value), ...(marker.low !== undefined ? [marker.low] : []), ...(marker.high !== undefined ? [marker.high] : [])]
  const spread = Math.max(...values) - Math.min(...values) || 1
  const min = Math.min(...values) - spread * 0.2
  const max = Math.max(...values) + spread * 0.2
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * (height - pad.top - pad.bottom)
  // Inset far enough that the first and last date labels fit.
  const inset = 30
  const x = (i: number) =>
    pad.left + inset + (pts.length === 1 ? (width - pad.left - pad.right - inset * 2) / 2 : (i / (pts.length - 1)) * (width - pad.left - pad.right - inset * 2))

  const bandTop = y(marker.high ?? max)
  const bandBottom = y(marker.low ?? min)

  return (
    <View onLayout={onLayout} accessibilityRole="image" accessibilityLabel={`${marker.name}, ${pts.length} results`}>
      <Svg width={width} height={height}>
        <Rect x={pad.left} y={bandTop} width={width - pad.left - pad.right} height={bandBottom - bandTop} rx={8} fill={color.okTint} />
        {marker.high !== undefined && (
          <SvgText x={width - pad.right + 6} y={y(marker.high) + 4} fontSize={11} fill={color.muted} fontFamily={font.regular}>
            {marker.high}
          </SvgText>
        )}
        {marker.low !== undefined && (
          <SvgText x={width - pad.right + 6} y={y(marker.low) + 4} fontSize={11} fill={color.muted} fontFamily={font.regular}>
            {marker.low}
          </SvgText>
        )}
        {joined.length > 1 && (
          <Path
            d={line(joined.map((p) => [x(pts.indexOf(p)), y(p.value)]))}
            stroke={color.primary}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
          />
        )}
        {pts.map((p, i) => {
          const out = !inRange(marker, p.value)
          const other = !joined.includes(p)
          return (
            <React.Fragment key={i}>
              <Circle
                cx={x(i)}
                cy={y(p.value)}
                r={5}
                fill={other ? color.background : out ? color.high : color.primary}
                stroke={out ? color.high : color.primary}
                strokeWidth={2}
              />
              <SvgText x={x(i)} y={y(p.value) - 10} fontSize={11} fill={color.text} fontFamily={font.medium} textAnchor="middle">
                {p.shown ?? String(p.value)}
              </SvgText>
              <SvgText x={x(i)} y={height - 8} fontSize={11} fill={color.muted} fontFamily={font.regular} textAnchor="middle">
                {p.date}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </View>
  )
}

/** A small line of the comparable results, for a list row. */
export function Sparkline({ marker, width = 64, height = 26 }: { marker: Biomarker; width?: number; height?: number }) {
  const pts = comparable(marker)
  const last = pts.at(-1)!
  const values = pts.map((p) => p.value)
  // Never less than a tenth of the value tall, so a small wobble stays small.
  const mid = (Math.min(...values) + Math.max(...values)) / 2
  const span = Math.max(Math.max(...values) - Math.min(...values), Math.abs(mid) * 0.1)
  const min = mid - span / 2
  const xy = pts.map((p, i): [number, number] => [
    4 + (pts.length === 1 ? (width - 8) / 2 : (i / (pts.length - 1)) * (width - 8)),
    4 + (1 - (p.value - min) / span) * (height - 8),
  ])
  const tone = inRange(marker, last.value) ? color.primary : color.high
  return (
    <Svg width={width} height={height}>
      {xy.length > 1 && <Path d={line(xy)} stroke={tone} strokeWidth={1.6} fill="none" strokeLinejoin="round" />}
      <Circle cx={xy.at(-1)![0]} cy={xy.at(-1)![1]} r={3} fill={tone} />
    </Svg>
  )
}

/* ------------------------------------------------------------- score -- */

const DIAL_SWEEP = 240

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const [x1, y1] = point(from)
  const [x2, y2] = point(to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** The Inlay score out of 100 on an open dial. */
export function ScoreDial({ score, size = 148, label = "Inlay score" }: { score: number; size?: number; label?: string }) {
  const stroke = 12
  const r = size / 2 - stroke
  const start = -DIAL_SWEEP / 2
  const end = start + (DIAL_SWEEP * Math.max(1, Math.min(100, score))) / 100
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={`${label} ${score} out of 100`}>
      <Svg width={size} height={size}>
        <Path d={arcPath(size / 2, size / 2, r, start, DIAL_SWEEP / 2)} stroke={color.canvas} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        <Path d={arcPath(size / 2, size / 2, r, start, end)} stroke={color.primary} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.dialCenter]}>
        <Text style={styles.dialValue}>{score}</Text>
        <Text style={styles.dialLabel}>{label}</Text>
      </View>
    </View>
  )
}

/* ---------------------------------------------------------- progress -- */

/** Results since the start, then the forecast dashed and labelled as one,
    against the goal. */
export function ProgressChart({
  points,
  forecast,
  goal,
  height = 150,
}: {
  points: number[]
  forecast: number[]
  goal: number
  height?: number
}) {
  const { width, onLayout } = useWidth()
  const all = [...points, ...forecast, goal]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const pad = { top: 18, bottom: 24, side: 10 }
  const count = points.length + forecast.length - 1
  const x = (i: number) => pad.side + (i / (count - 1)) * (width - pad.side * 2)
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min || 1)) * (height - pad.top - pad.bottom)
  const actual = points.map((v, i): [number, number] => [x(i), y(v)])
  const ahead = forecast.map((v, i): [number, number] => [x(points.length - 1 + i), y(v)])
  const now = actual.at(-1)!
  return (
    <View onLayout={onLayout} accessibilityRole="image" accessibilityLabel="Progress since you started, with a forecast">
      <Svg width={width} height={height}>
        <Line x1={pad.side} x2={width - pad.side} y1={y(goal)} y2={y(goal)} stroke={color.border} strokeWidth={1.5} strokeDasharray="4 4" />
        <SvgText x={pad.side} y={y(goal) - 6} fontSize={11} fill={color.muted} fontFamily={font.regular}>
          Goal
        </SvgText>
        <Path d={line(actual)} stroke={color.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <Path d={line(ahead)} stroke={color.primary} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="5 5" fill="none" />
        <Circle cx={now[0]} cy={now[1]} r={5} fill={color.primary} />
        <SvgText x={ahead.at(-1)![0]} y={height - 6} fontSize={11} fill={color.muted} fontFamily={font.regular} textAnchor="end">
          Forecast
        </SvgText>
        <SvgText x={pad.side} y={height - 6} fontSize={11} fill={color.muted} fontFamily={font.regular}>
          Start
        </SvgText>
        <SvgText x={now[0]} y={height - 6} fontSize={11} fill={color.text} fontFamily={font.medium} textAnchor="middle">
          Today
        </SvgText>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  dialCenter: { alignItems: "center", justifyContent: "center", paddingBottom: 4 },
  dialValue: { fontFamily: font.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: color.text },
  dialLabel: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
