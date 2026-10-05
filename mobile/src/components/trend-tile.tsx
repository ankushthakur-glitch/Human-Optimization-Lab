import * as React from "react"
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg"

import { ChartLine, ChartLineUp } from "@/components/ph"
import { card, cardRadius, color, font, ink, space } from "@/lib/theme"
import { type Status, type Trend } from "@/lib/trends"

/* The home's trend tile (Figma "Hol" component 40024605:199273, 5 Oct
   2026): the marker's name with a trend icon, the latest value and its
   unit, the Figma's 40 high sparkline drawing for its status, and the
   status as a ring and a word. The whole tile opens the marker. */

/** Figma's status colours: the ring's edge (/07) and the latest dot's fill
    (/06); borderline in the clay the record kit uses for it. */
/** The two lower bands and the rule over them, as the Figma's. */
const BAND = "#F8FCF8"
const BAND_EDGE = "#DFDFE4"

const TONE: Record<Status, { edge: string; fill: string; word: string }> = {
  out: { edge: "#D9363E", fill: "#E94A52", word: "Out of range" },
  borderline: { edge: "#B25A12", fill: "#C8641B", word: "Borderline" },
  in: { edge: "#2F7F4D", fill: "#3C9B61", word: "In range" },
}

/** The sparkline's height, and how far its latest mark reaches past the
    plot (the ring's radius). */
const PLOT = 40
const REACH = 4

/* The Figma tile's own drawing (component 40024605:199273, "Out of range"
   and "In range"), kept exactly as the user drew it: three bands (white
   over two #F8FCF8 with a 0.3 #DFDFE4 rule), the teal area and its #92CAC8
   line, stretched to the tile's width, and the latest mark at the line's
   end. The status picks the drawing; the value, unit and status words
   above and below it are her own. */
const FIGMA_W = 150.5
const DRAWING = {
  out: {
    area: "M10.3793 26.037C5.70862 25.6271 1.51365 35.1749 0 40H150.5V0.0325805C142.519 -0.804595 142.499 14.7642 134.607 15.4047C126.714 16.0452 127.579 8.10292 120.551 8.61532C113.524 9.12773 114.172 26.037 107.361 22.3221C100.55 18.6072 99.9009 15.6609 89.954 26.037C80.0072 36.4132 67.5736 21.2973 59.2486 26.037C50.9235 30.7767 48.5449 26.037 40.4361 19.3758C32.3272 12.7145 30.273 31.9297 22.8129 33.3388C15.3527 34.7479 16.2177 26.5494 10.3793 26.037Z",
    line: "M0.203011 40.2128C1.71666 35.3877 5.91163 25.8399 10.5823 26.2498C16.4207 26.7622 15.5557 34.9607 23.0159 33.5516C30.476 32.1425 32.5302 12.9273 40.6391 19.5886C48.7479 26.2498 51.1265 30.9895 59.4516 26.2498C67.7766 21.5101 80.2102 36.626 90.157 26.2498C100.104 15.8737 100.753 18.82 107.564 22.5349C114.375 26.2498 113.727 9.34052 120.754 8.82812C127.782 8.31572 126.917 16.258 134.81 15.6175C142.702 14.977 142.722 -0.591797 150.703 0.245379",
    end: 0,
  },
  in: {
    area: "M0 36.009C1.50366 25.3603 5.67094 22.6221 10.3108 23.5268C15.6513 24.568 15.3457 39.9914 21.0497 40C21.0529 40 21.0561 40 21.0592 40C21.5472 39.9993 22.0792 39.8858 22.6623 39.6412C30.0732 36.5314 32.1138 -5.87489 40.1692 8.82594C48.2245 23.5268 50.5874 33.987 58.8575 23.5268C67.1276 13.0666 79.4791 46.4261 89.3603 23.5268C99.2414 0.627407 99.8859 7.12972 106.652 15.3282C113.419 23.5268 111.019 8.68973 118 7.5589C124.981 6.42806 125.878 1.47553 133.718 0.0619882C141.559 -1.35155 142.572 21.8604 150.5 23.7079V40H21.0592C21.0561 40 21.0529 40 21.0497 40H0V36.009Z",
    line: "M0.210676 36.2221C1.71433 25.5734 5.88162 22.8352 10.5215 23.7398C16.3213 24.8707 15.4621 42.964 22.873 39.8542C30.2838 36.7444 32.3245 -5.66181 40.3798 9.03902C48.4351 23.7398 50.798 34.2 59.0682 23.7398C67.3383 13.2797 79.6898 46.6392 89.5709 23.7398C99.4521 0.840483 100.097 7.3428 106.863 15.5413C113.629 23.7398 111.229 8.90281 118.211 7.77197C125.192 6.64114 126.088 1.68861 133.929 0.275064C141.769 -1.13848 142.782 22.0734 150.711 23.921",
    end: 23.7,
  },
} as const

function Sparkline({ trend }: { trend: Trend }) {
  const [w, setW] = React.useState(0)
  const gid = `spark${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    setW((old) => (old === width ? old : width))
  }
  const d = DRAWING[trend.status === "in" ? "in" : "out"]
  const tone = TONE[trend.status]
  const band = PLOT / 3

  return (
    <View style={styles.plot} onLayout={onLayout}>
      {w > 0 && (
        <>
          <Svg style={StyleSheet.absoluteFill} width={w} height={PLOT}>
            <Rect x={0} y={0} width={w} height={band} fill="#FFFFFF" />
            <Rect x={0} y={band} width={w} height={PLOT - band} fill={BAND} />
            <Line x1={0} x2={w} y1={band} y2={band} stroke={BAND_EDGE} strokeWidth={0.3} />
          </Svg>
          <Svg style={StyleSheet.absoluteFill} width={w} height={PLOT} viewBox={`0 0 ${FIGMA_W} ${PLOT}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gid} x1="108.55" y1="-5.47574" x2="108.55" y2="38.0785" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={color.primaryText} stopOpacity={0.16} />
                <Stop offset="1" stopColor={color.primaryText} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={d.area} fill={`url(#${gid})`} />
            <Path d={d.line} stroke={color.primaryLine} strokeWidth={0.425532} fill="none" vectorEffect="non-scaling-stroke" />
          </Svg>
          <Svg style={[styles.mark, { left: w - REACH + 1.5, top: d.end - REACH }]} width={REACH * 2} height={REACH * 2}>
            <Circle cx={REACH} cy={REACH} r={3.6} fill="none" stroke={tone.edge} strokeWidth={0.754} strokeOpacity={0.2} />
            <Circle cx={REACH} cy={REACH} r={1.6} fill={tone.fill} stroke={tone.edge} strokeWidth={0.754} />
          </Svg>
        </>
      )}
    </View>
  )
}

/** The status under the sparkline: an 8 pt ring and its word. */
function StatusWord({ status }: { status: Status }) {
  const tone = TONE[status]
  return (
    <View style={styles.status}>
      <View style={[styles.ring, { borderColor: tone.edge }]} />
      <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
        {tone.word}
      </Text>
    </View>
  )
}

export function TrendTile({ trend, onPress }: { trend: Trend; onPress?: () => void }) {
  const b = trend.marker
  const tone = TONE[trend.status]
  const Icon = trend.status === "in" ? ChartLine : ChartLineUp
  const unit = b.unit
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={trend.spoken}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {b.name}
            </Text>
            <Icon size={14} color={tone.edge} />
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.value} maxFontSizeMultiplier={1.3}>
              {trend.latest ? trend.value : "No results"}
            </Text>
            {!!trend.latest && !!unit && (
              <Text style={styles.unit} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {unit}
              </Text>
            )}
          </View>
        </View>
        <Sparkline trend={trend} />
      </View>
      <StatusWord status={trend.status} />
    </Pressable>
  )
}

/** Tiles two to a row, 12 apart; an odd last tile keeps its half. */
export function TrendTiles({ trends, onOpen }: { trends: Trend[]; onOpen?: (t: Trend) => void }) {
  const rows: Trend[][] = []
  for (let i = 0; i < trends.length; i += 2) rows.push(trends.slice(i, i + 2))
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((t) => t.id).join(":")} style={styles.row}>
          {row.map((t) => (
            <View key={t.id} style={styles.cell}>
              <TrendTile trend={t} onPress={onOpen ? () => onOpen(t) : undefined} />
            </View>
          ))}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { gap: space.item },
  row: { flexDirection: "row", gap: space.item, alignItems: "stretch" },
  cell: { flex: 1 },
  pressed: { opacity: 0.8 },
  // Figma: the card, 12 inside, the words and the line 12 over the status.
  tile: {
    flex: 1,
    backgroundColor: card.fill,
    borderRadius: cardRadius,
    padding: space.card,
    gap: space.item,
    boxShadow: card.shadow,
  },
  top: { gap: space.stack },
  words: { gap: space.stack },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.mark },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.detail },
  valueRow: { flexDirection: "row", alignItems: "center", gap: space.stack },
  value: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: ink.strong, fontVariant: ["tabular-nums"] },
  unit: { flexShrink: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink.secondary },
  plot: { height: PLOT },
  mark: { position: "absolute" },
  status: { flexDirection: "row", alignItems: "center", gap: space.mark },
  ring: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.6 },
  statusText: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, color: ink.detail },
})
