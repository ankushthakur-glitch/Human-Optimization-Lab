import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, RadialGradient, Stop } from "react-native-svg"

import { type BodySystem, SYSTEMS, systemWatch } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The home screen's art, drawn rather than photographed so it stays one
   family with the app's soft pearl objects: the grey body with its systems
   glowing, the lab tube, the plan book and the record sheet. */

const TEAL_GLOW = "#2BB5AC"
const AMBER_GLOW = "#F2A33A"

/** Where each system glows on the body, in the body's 300 x 330 box. */
const SPOTS: Record<BodySystem, { cx: number; cy: number; r: number }> = {
  thyroid: { cx: 150, cy: 112, r: 22 },
  heart: { cx: 160, cy: 172, r: 42 },
  metabolism: { cx: 146, cy: 238, r: 40 },
}

/** Head, neck, shoulders and arms, cut at the waist and fading into white. */
const TORSO =
  "M136 88 C136 104 134 114 130 120 C118 126 100 128 86 134 C72 140 64 154 62 172 " +
  "C60 200 58 250 56 330 L82 330 C84 270 86 232 92 198 C94 232 98 272 100 330 " +
  "L200 330 C202 272 206 232 208 198 C214 232 216 270 218 330 L244 330 " +
  "C242 250 240 200 238 172 C236 154 228 140 214 134 C200 128 182 126 170 120 " +
  "C166 114 164 104 164 88 Z"

const ARMS = [
  "M86 134 C72 140 64 154 62 172 C60 200 58 250 56 330 L82 330 C84 270 86 232 92 198 C92 172 90 150 86 134 Z",
  "M214 134 C228 140 236 154 238 172 C240 200 242 250 244 330 L218 330 C216 270 214 232 208 198 C208 172 210 150 214 134 Z",
]

export function BodyMap({ width = 300 }: { width?: number }) {
  const height = (width * 330) / 300
  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={SYSTEMS.map((s) => `${s.name} ${systemWatch(s.id) ? "to watch" : "in range"}`).join(", ")}
    >
      <Svg width={width} height={height} viewBox="0 0 300 330">
        <Defs>
          <RadialGradient id="skin" cx="50%" cy="38%" r="62%">
            <Stop offset="0" stopColor="#F4F5F5" />
            <Stop offset="0.55" stopColor="#E1E4E4" />
            <Stop offset="1" stopColor="#C9CECE" />
          </RadialGradient>
          <RadialGradient id="face" cx="42%" cy="36%" r="70%">
            <Stop offset="0" stopColor="#F6F7F7" />
            <Stop offset="0.7" stopColor="#DDE1E1" />
            <Stop offset="1" stopColor="#C8CDCD" />
          </RadialGradient>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.62" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.95" stopColor="#FFFFFF" stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id="glowTeal" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={TEAL_GLOW} stopOpacity={0.75} />
            <Stop offset="0.5" stopColor={TEAL_GLOW} stopOpacity={0.3} />
            <Stop offset="1" stopColor={TEAL_GLOW} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowAmber" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={AMBER_GLOW} stopOpacity={0.75} />
            <Stop offset="0.5" stopColor={AMBER_GLOW} stopOpacity={0.3} />
            <Stop offset="1" stopColor={AMBER_GLOW} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Path d={TORSO} fill="url(#skin)" />
        {/* The arms a shade deeper than the chest, and faint lines at the
            collarbones, down the sternum and under the chest, for form. */}
        {ARMS.map((d) => (
          <Path key={d} d={d} fill="#B9BFBF" fillOpacity={0.28} />
        ))}
        <Path d="M121 131 C131 136 141 137 147 134 M153 134 C159 137 169 136 179 131" stroke="#C3C8C8" strokeOpacity={0.6} strokeWidth={1.2} fill="none" />
        <Path d="M150 140 L150 214" stroke="#C3C8C8" strokeOpacity={0.5} strokeWidth={1.2} />
        <Path d="M112 196 C126 206 140 206 148 200 M152 200 C160 206 174 206 188 196" stroke="#C3C8C8" strokeOpacity={0.45} strokeWidth={1.2} fill="none" />
        <Ellipse cx="150" cy="58" rx="27" ry="34" fill="url(#face)" />

        {SYSTEMS.map((s) => {
          const { cx, cy, r } = SPOTS[s.id]
          return <Circle key={s.id} cx={cx} cy={cy} r={r} fill={systemWatch(s.id) ? "url(#glowAmber)" : "url(#glowTeal)"} />
        })}

        <Rect x="0" y="0" width="300" height="330" fill="url(#fade)" />
      </Svg>
    </View>
  )
}

/** The legend under the body: what the two glows mean. */
export function BodyLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: TEAL_GLOW }]} />
        <Text style={styles.legendText}>In range</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: AMBER_GLOW }]} />
        <Text style={styles.legendText}>To watch</Text>
      </View>
    </View>
  )
}

/** A blood collection tube, tilted, for the latest labs card. */
export function LabTube({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Defs>
        <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F4F6F6" />
          <Stop offset="0.5" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DADFDF" />
        </LinearGradient>
      </Defs>
      <G transform="rotate(18 22 22)">
        <Rect x="17" y="10" width="10" height="30" rx="5" fill="url(#glass)" stroke="#D5DADA" strokeWidth={0.8} />
        <Rect x="17.8" y="24" width="8.4" height="15.2" rx="4.2" fill="#A3212B" />
        <Rect x="16" y="3" width="12" height="9" rx="2.4" fill={color.primary} />
        <Rect x="18" y="16" width="8" height="5" rx="1" fill="#FFFFFF" stroke="#E2E6E6" strokeWidth={0.6} />
      </G>
    </Svg>
  )
}

/** The plan tile's art: a teal book with its title and a bookmark rule. */
export function PlanBook({ programs }: { programs: number }) {
  return (
    <View style={styles.book}>
      <Text style={styles.bookTitle}>Your plan</Text>
      <Text style={styles.bookMeta}>{programs === 1 ? "1 program" : `${programs} programs`}</Text>
      <View style={styles.bookRule} />
    </View>
  )
}

/** The record tile's art: a white report sheet with ruled lines. */
export function RecordSheet() {
  const lines = [0.7, 0.9, 0.55, 0.85, 0.6, 0.8]
  return (
    <View style={styles.sheet}>
      {lines.map((w, i) => (
        <View key={i} style={styles.sheetLine}>
          <View style={[styles.sheetBar, { flex: w, backgroundColor: i === 0 ? "#BFC4C4" : "#DDE1E1" }]} />
          <View style={{ flex: 1 - w }} />
          {i > 0 && <View style={styles.sheetValue} />}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", justifyContent: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: font.regular, fontSize: 12, color: color.muted },

  book: {
    height: 104,
    marginHorizontal: 10,
    backgroundColor: color.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 12,
    gap: 2,
    boxShadow: "0 6px 16px rgba(1, 131, 126, 0.22)",
  },
  bookTitle: { fontFamily: font.semibold, fontSize: 14, color: color.onPrimary },
  bookMeta: { fontFamily: font.regular, fontSize: 11, color: "rgba(255,255,255,0.75)" },
  bookRule: { marginTop: "auto", height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },

  sheet: {
    height: 104,
    marginHorizontal: 12,
    backgroundColor: color.background,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E6E8E8",
    padding: 12,
    gap: 8,
    transform: [{ rotate: "-2deg" }],
    boxShadow: "0 6px 16px rgba(16, 24, 40, 0.08)",
  },
  sheetLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  sheetBar: { height: 3, borderRadius: 2 },
  sheetValue: { width: 12, height: 3, borderRadius: 2, backgroundColor: "#CDD2D2" },
})
