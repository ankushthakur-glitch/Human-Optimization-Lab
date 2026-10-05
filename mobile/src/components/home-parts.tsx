import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"

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
}: {
  icon: React.ReactNode
  /** The tile's fill: Primary/01, or the Ask banner's grey teal. */
  tile?: string
  title: string
  line?: string
  onPress: () => void
}) {
  return (
    <Hero onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: tile }]}>{icon}</View>
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

/** The Ask banner's tile (Figma #EAF1F2). */
export const ASK_TILE = "#EAF1F2"

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, gap: space.stack },
  title: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.onColor },
  // Grey/02 on the gradient.
  line: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: "#F7F7F7" },
})
