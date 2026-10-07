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

/** The "A healthier you is possible" banner as the 7 Oct 2026 reference
    draws it: a deep teal gradient card with a soft lift, a round mint tile
    with a heart and its pulse, a white title on one line, two lines under
    it, and a plant with three sparks on the right. The whole card is the
    button. */
export function UpgradeBanner({ title, line, onPress }: { title: string; line: string; onPress: () => void }) {
  // The plant is drawn at a share of the card's measured width, so it
  // scales with the screen and stays behind the words.
  const [w, setW] = React.useState(0)
  const artW = Math.max(80, Math.min(130, w * 0.28))
  const id = `up${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.upgrade, pressed && styles.pressed]}
    >
      <View style={styles.upgradeClip} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1F6F7A" />
              <Stop offset="1" stopColor="#0E5560" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
        <Svg style={styles.upgradeArt} opacity={0.35} width={artW} height={artW * 0.95} viewBox="0 0 120 114" preserveAspectRatio="xMaxYMax meet">
          <Path d="M0 114C6 92 34 82 62 86C92 90 112 98 120 114Z" fill="#3A9C93" fillOpacity={0.45} />
          <Path d="M74 114C76 94 82 72 96 50" stroke="#6FD0B8" strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M96 50C116 48 126 60 124 76C106 78 94 68 96 50Z" fill="#5CC6AB" fillOpacity={0.9} />
          <Path d="M80 86C62 86 50 74 50 58C68 56 82 68 80 86Z" fill="#46B09B" fillOpacity={0.9} />
          <Path d="M90 62C84 48 86 36 96 28C102 40 100 54 90 62Z" fill="#82DCC4" fillOpacity={0.9} />
          <Path d="M62 26L56 16M76 20L74 8M90 22L98 12" stroke="#4FCB99" strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </View>
      <View style={styles.upgradeTile}>
        <Svg width={22} height={22} viewBox="0 0 36 36" fill="none">
          <Path
            d="M18 32C18 32 3 23.5 3 12.8C3 8.5 6.3 5.5 10.2 5.5C13.4 5.5 16.4 7.2 18 10C19.6 7.2 22.6 5.5 25.8 5.5C29.7 5.5 33 8.5 33 12.8C33 23.5 18 32 18 32Z"
            fill="#2BB5A0"
          />
          <Path d="M7 18H13L15.5 12.5L19.5 23L22 18H29" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={styles.upgradeWords}>
        <Text style={styles.upgradeTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={styles.upgradeLine} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.1}>
          {line}
        </Text>
      </View>
      <View style={styles.upgradeCaret}>
        <CaretRight size={20} weight="bold" color="#FFFFFF" />
      </View>
    </Pressable>
  )
}

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
  upgrade: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#14606B",
    // A soft lift so the card stands off the page.
    shadowColor: "#0E5560",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  upgradeClip: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, overflow: "hidden" },
  upgradeArt: { position: "absolute", right: 0, bottom: 0 },
  upgradeTile: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E3F6F1", alignItems: "center", justifyContent: "center" },
  upgradeCaret: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  upgradeWords: { flex: 1, gap: 6 },
  upgradeTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: ink.onColor },
  upgradeLine: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: "#F7F7F7" },
  alertTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: color.high },
  alertLine: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, gap: space.stack },
  title: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.onColor },
  // Grey/02 on the gradient.
  line: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: "#F7F7F7" },
})
