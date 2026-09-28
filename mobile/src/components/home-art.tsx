import * as React from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Defs, G, LinearGradient, Rect, RadialGradient, Stop } from "react-native-svg"

import { type BodySystem, SYSTEMS, systemWatch } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The home screen's art, kept to single soft objects so it stays one
   family with the app's soft pearl objects (the body is a render): the grey
   body with its systems glowing, the lab tube, the plan book and the record
   sheet. */

const TEAL_GLOW = "#2BB5AC"
const AMBER_GLOW = "#F2A33A"

/** Where each system glows on the body, in the image's 704 x 751 pixels. */
const SPOTS: Record<BodySystem, { cx: number; cy: number; r: number }> = {
  thyroid: { cx: 352, cy: 262, r: 50 },
  heart: { cx: 382, cy: 440, r: 120 },
  metabolism: { cx: 346, cy: 616, r: 104 },
}

/** The soft grey body, greyed and faded into white at the waist, so the
    glows come from the patient's results rather than the render. */
const BODY = require("../../assets/images/body.png")
const BODY_RATIO = 751 / 704

export function BodyMap({ width = 300 }: { width?: number }) {
  const height = width * BODY_RATIO
  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={SYSTEMS.map((s) => `${s.name} ${systemWatch(s.id) ? "to watch" : "in range"}`).join(", ")}
    >
      <Image source={BODY} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="contain" />
      <Svg width={width} height={height} viewBox="0 0 704 751" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glowTeal" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={TEAL_GLOW} stopOpacity={0.7} />
            <Stop offset="0.5" stopColor={TEAL_GLOW} stopOpacity={0.28} />
            <Stop offset="1" stopColor={TEAL_GLOW} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowAmber" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={AMBER_GLOW} stopOpacity={0.7} />
            <Stop offset="0.5" stopColor={AMBER_GLOW} stopOpacity={0.28} />
            <Stop offset="1" stopColor={AMBER_GLOW} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {SYSTEMS.map((s) => {
          const { cx, cy, r } = SPOTS[s.id]
          return <Circle key={s.id} cx={cx} cy={cy} r={r} fill={systemWatch(s.id) ? "url(#glowAmber)" : "url(#glowTeal)"} />
        })}
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
