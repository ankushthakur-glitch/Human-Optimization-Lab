import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg"

import {
  Bandaids,
  Buildings,
  CalendarBlank,
  CaretRight,
  ChartLine,
  FileText,
  FirstAidKit,
  Flask,
  Heartbeat,
  Hospital,
  Microscope,
  Pill,
  Syringe,
  WarningCircle,
} from "@/components/ph"
import type { RecordIconName } from "@/components/record-icons"
import { Hero } from "@/components/record-kit"
import { color, font, ink, space } from "@/lib/theme"

/* The pieces both homes share in the Figma "Hol" language (5 Oct 2026):
   the collapsed teal banner ("3 things need you", "Ask about your
   results"), the Phosphor glyph for a record row, and a row's facts split
   by a dot as the Figma's Upcoming rows are. */

/** A record kind as the Figma draws its row: a 16 Phosphor glyph, teal on
    its round tile. */
const GLYPH: Record<RecordIconName, typeof Flask> = {
  visits: CalendarBlank,
  conditions: FirstAidKit,
  medications: Pill,
  allergies: WarningCircle,
  labs: Flask,
  vitals: Heartbeat,
  procedures: Bandaids,
  immunizations: Syringe,
  documents: FileText,
  clinic: Buildings,
  hospital: Hospital,
  lab: Microscope,
  chart: ChartLine,
}

export function RecordGlyph({ name, size = 16, tone = color.primary }: { name: RecordIconName; size?: number; tone?: string }) {
  const Glyph = GLYPH[name] ?? Flask
  return <Glyph size={size} color={tone} />
}

/** "Not booked yet. Due by Oct 21 at Pacific Heart" as the Figma sets it,
    "Not booked yet • Due by Oct 21 at Pacific Heart": sentences become
    facts split by a dot, "Dr. Lee" kept whole. */
export function dotted(meta: string | undefined, wrap: (s: string) => string = (s) => s) {
  if (!meta) return undefined
  const parts: string[] = []
  for (const piece of meta.replace(/\.$/, "").split(". ")) {
    const last = parts.length - 1
    if (last >= 0 && /\bDr$/.test(parts[last])) parts[last] = `${parts[last]}. ${piece}`
    else parts.push(piece)
  }
  return parts.map(wrap).join("  •  ")
}

/** The Figma's sparkle, two four point stars (the Ask banner's glyph). */
export function SparkleGlyph({ size = 18, tone = "#417D88" }: { size?: number; tone?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M11.25 1.5L11.654 3.29368C11.9968 4.81511 13.1849 6.00323 14.7063 6.34595L16.5 6.75L14.7063 7.15405C13.1849 7.49677 11.9968 8.68485 11.654 10.2063L11.25 12L10.846 10.2063C10.5032 8.68485 9.31515 7.49677 7.7937 7.15405L6 6.75L7.7937 6.34595C9.31507 6.00323 10.5032 4.81511 10.846 3.29369L11.25 1.5Z"
        fill={tone}
        stroke={tone}
        strokeWidth={1.125}
        strokeLinejoin="round"
      />
      <Path
        d="M5.25 9L5.53861 10.2812C5.78341 11.3679 6.63206 12.2166 7.71878 12.4614L9 12.75L7.71878 13.0386C6.63206 13.2834 5.78341 14.132 5.53861 15.2188L5.25 16.5L4.96139 15.2188C4.71659 14.132 3.86794 13.2834 2.7812 13.0386L1.5 12.75L2.7812 12.4614C3.86794 12.2166 4.71659 11.368 4.96139 10.2812L5.25 9Z"
        fill={tone}
        stroke={tone}
        strokeWidth={1.125}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** The collapsed teal banner (Figma 40024634:979 and :1127): an 18 glyph on
    a round 32 tile, a white title, one line under it and a white caret.
    The whole banner is the button. */
export function HeroRow({
  icon,
  tile = color.primarySoft,
  title,
  line,
  onPress,
  muted,
  alert,
  tileSize = 32,
}: {
  icon: React.ReactNode
  /** The round tile's diameter; the glyph is sized by the caller. */
  tileSize?: number
  /** The tile's fill: Primary/01, or the Ask banner's grey teal. */
  tile?: string
  title: string
  line?: string
  onPress: () => void
  /** The Hero's softer grey teal, for the Ask banner. */
  muted?: boolean
  /** The muted red gradient, for what needs her. */
  alert?: boolean
}) {
  // What needs her is a light red card, not a gradient (user, 7 Oct 2026):
  // a red title, a grey line and a grey caret.
  if (alert)
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}>
        <View style={[styles.tile, { backgroundColor: tile, width: tileSize, height: tileSize, borderRadius: tileSize / 2 }]}>{icon}</View>
        <View style={styles.words}>
          <Text style={styles.alertTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          {!!line && (
            <Text style={styles.alertLine} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {line}
            </Text>
          )}
        </View>
        <CaretRight size={16} color={ink.secondary} />
      </Pressable>
    )
  return (
    <Hero onPress={onPress} muted={muted}>
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: tile, width: tileSize, height: tileSize, borderRadius: tileSize / 2 }]}>{icon}</View>
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          {!!line && (
            <Text style={styles.line} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {line}
            </Text>
          )}
        </View>
        <CaretRight size={16} color={ink.onColor} />
      </View>
    </Hero>
  )
}

/** The "A healthier you is possible" banner (8 Oct 2026), drawn in code so
    its words scale with her text size and are read as real text, not a
    picture: a green gradient (white text on it holds 4.5 to 1 or better), a
    heart tile, a title, one line and a caret. The whole banner is one
    button, at least 68 tall, and grows with larger text. The gradient is
    one static SVG and the soft circles are plain views, so it costs no
    image to load or decode. */
const UPGRADE_GREEN = ["#06694A", "#128A5C"] as const

export const UpgradeBanner = React.memo(function UpgradeBanner({
  title,
  line,
  hint,
  onPress,
}: {
  title: string
  line: string
  /** What the button does, spoken after its label. */
  hint?: string
  onPress: () => void
}) {
  const gradient = React.useId().replace(/:/g, "")
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      accessibilityHint={hint}
      android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      style={({ pressed }) => [styles.upgrade, pressed && styles.pressed]}
    >
      <View style={styles.upgradeArt} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 1 1" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="0.4">
              <Stop offset="0" stopColor={UPGRADE_GREEN[0]} />
              <Stop offset="1" stopColor={UPGRADE_GREEN[1]} />
            </LinearGradient>
          </Defs>
          <Rect width="1" height="1" fill={`url(#${gradient})`} />
        </Svg>
        <View style={[styles.upgradeCircle, styles.upgradeCircleBig]} />
        <View style={[styles.upgradeCircle, styles.upgradeCircleSmall]} />
      </View>
      <View style={styles.upgradeTile} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Heartbeat size={24} weight="bold" color={UPGRADE_GREEN[0]} />
      </View>
      <View style={styles.upgradeWords}>
        <Text style={styles.upgradeTitle} maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        <Text style={styles.upgradeLine} maxFontSizeMultiplier={1.4}>
          {line}
        </Text>
      </View>
      <View style={styles.upgradeCaret} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <CaretRight size={14} weight="bold" color={ink.onColor} />
      </View>
    </Pressable>
  )
})

/** The Ask banner's tile (Figma #EAF1F2). */
export const ASK_TILE = "#EAF1F2"

const styles = StyleSheet.create({
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.highTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F5C6CA",
  },
  pressed: { opacity: 0.85 },
  // Full width of the page column, taller with larger text.
  upgrade: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 16px rgba(6, 105, 74, 0.25)" },
  upgradeArt: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  upgradeCircle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  upgradeCircleBig: { width: 150, height: 150, right: -30, top: -50 },
  upgradeCircleSmall: { width: 90, height: 90, right: 60, bottom: -50 },
  upgradeTile: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)" },
  upgradeWords: { flex: 1, gap: 2 },
  upgradeTitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: ink.onColor },
  upgradeLine: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: "#F2FBF7" },
  upgradeCaret: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  alertTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: color.high },
  alertLine: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, gap: space.stack },
  title: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.onColor },
  // Grey/02 on the gradient.
  line: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: "#F7F7F7" },
})
