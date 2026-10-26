import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import {
  ArrowsLeftRight,
  Barbell,
  Brain,
  Camera,
  Check,
  ClockClockwise,
  DownloadSimple,
  FlowerLotus,
  Leaf,
  Lightbulb,
  MagnifyingGlass,
  Microphone,
  Moon,
  PencilSimple,
  Phone,
  Pill,
  Scales,
  Watch,
} from "@/components/ph"
import { HUE, Block, Tile, type Hue } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { type IconKey, type Tone, type Topic, type Way } from "@/lib/topics"
import { card, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* The pieces the six topic pages share (Journey_14 screens 31 to 37) and
   the figures Today, Review and Yesterday in numbers draw: a topic's icon,
   its programme chip, the dark card holding today's target, the four ways
   to answer it, a quiet note, and the footnote. The ways are the same four
   on every topic, so a new programme lands in a row that already exists. */

type IconProps = { size?: number; color?: string; weight?: "regular" | "bold" | "fill" }

const ICON: Record<IconKey, React.ComponentType<IconProps>> = {
  exercise: Barbell,
  eat: Leaf,
  sleep: Moon,
  mind: Brain,
  medication: Pill,
  measure: Scales,
  check: Check,
  pencil: PencilSimple,
  mic: Microphone,
  import: DownloadSimple,
  search: MagnifyingGlass,
  camera: Camera,
  upload: DownloadSimple,
  phone: Phone,
  device: Watch,
  shift: ClockClockwise,
  swap: ArrowsLeftRight,
  practice: FlowerLotus,
}

export function TopicIcon({ name, size = 16, color: tone = color.primary, weight }: { name: IconKey; size?: number; color?: string; weight?: IconProps["weight"] }) {
  const Icon = ICON[name]
  return <Icon size={size} color={tone} weight={weight} />
}

/** The words of a figure: green on target, clay when short or missed (red
    is never words), plain when nothing has happened yet. */
export const TONE_INK: Record<Tone, string> = { good: ink.good, warn: "#A95413", bad: "#A95413", plain: ink.strong }

const TILE: Record<Topic["id"], Hue> = { exercise: "red", eat: "red", sleep: "violet", mind: "green", medication: "blue", measure: "teal" }

/** A topic's round tile in its own hue, on Today, Review and the pages. */
export function TopicTile({ topic, size = 36 }: { topic: Topic; size?: number }) {
  const hue = TILE[topic.id]
  return (
    <Tile hue={hue} size={size}>
      <TopicIcon name={topic.id} color={HUE[hue].ink} />
    </Tile>
  )
}

/** The page's own top: the topic's name and its programme chip, then one
    line of what the page holds. */
export function TopicHead({ topic, intro }: { topic: Topic; intro: string }) {
  return (
    <View style={styles.head}>
      <View style={styles.headRow}>
        <Text style={styles.title} accessibilityRole="header">
          {topic.name}
        </Text>
      </View>
      <Text style={type.body}>{intro}</Text>
    </View>
  )
}

/** Today's target, on a teal tinted card: what it is, what sits behind it, and
    the figure on the right. */
export function TargetCard({ icon, title, detail, figure }: { icon: IconKey; title: string; detail: string; figure?: string }) {
  return (
    <View style={styles.target} accessible accessibilityLabel={[title, detail, figure].filter(Boolean).join(". ")}>
      <View style={styles.targetTile}>
        <TopicIcon name={icon} size={18} color={ink.primary} />
      </View>
      <View style={styles.fill}>
        <Text style={styles.targetTitle}>{title}</Text>
        <Text style={styles.targetDetail}>{detail}</Text>
      </View>
      {!!figure && <Text style={styles.targetFigure}>{figure}</Text>}
    </View>
  )
}

/** "How would you like to answer it?": the four ways, one tap each. */
export function Ways({ ways, onPick, picked }: { ways: Way[]; onPick: (w: Way) => void; picked?: string }) {
  return (
    <Block title="How would you like to answer it?">
      <View style={styles.ways}>
        {ways.map((w) => {
          const on = picked === w.id
          return (
            <Pressable
              key={w.id}
              onPress={() => onPick(w)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${w.title}. ${w.says}`}
              style={({ pressed }) => [styles.way, on && styles.wayOn, pressed && styles.pressed]}
            >
              <View style={[styles.wayTile, on && styles.wayTileOn]}>
                <TopicIcon name={w.icon} size={16} color={on ? color.primary : ink.secondary} weight={on ? "bold" : "regular"} />
              </View>
              <View style={styles.fill}>
                <Text style={styles.wayTitle}>{w.title}</Text>
                <Text style={type.label}>{w.says}</Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </Block>
  )
}

/** A note on the pale teal ground, a bulb beside it. */
export function Note({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <Lightbulb size={16} color={color.primary} />
      <Text style={[type.body, styles.fill]}>{children}</Text>
    </View>
  )
}

/** A topic's own page: the back caret, the tab bar kept (Plan stays lit),
    the head, the page's own cards, then the four ways, and the note. */
export function TopicPage({ children, sheet, footer, title }: { children: React.ReactNode; sheet?: React.ReactNode; footer?: React.ReactNode; title: string }) {
  return (
    <TabScreen tab="today" back title={title} overlay={sheet} footer={footer} solidFooter>
      {children}
    </TabScreen>
  )
}

/** A score on a ring: the number in the middle and "of 100" under it, drawn
    in one colour on its track (the dial of Sleep's last night, the day's
    score on Review). */
export function ScoreDial({ value, size = 52, stroke = 4, tone, track, ink: words, of = "OF 100" }: { value: number; size?: number; stroke?: number; tone: string; track: string; ink: string; of?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={`Score ${value} of 100`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(Math.max(0, Math.min(value, 100)) / 100) * c} ${c}`} fill="none" />
      </Svg>
      <View style={styles.dialMiddle}>
        <Text style={[type.stat, { color: words }]}>{value}</Text>
        <Text style={[type.caption, styles.dialOf, { color: words }]}>{of}</Text>
      </View>
    </View>
  )
}

/** Opens the assistant on a topic in her own words. */
export const askAbout = (ask: string) => router.push({ pathname: "/assistant", params: { ask } })

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },

  head: { gap: space.stack },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.inline, flexWrap: "wrap" },
  title: { ...type.hero, fontSize: 24, lineHeight: 32 },

  target: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.item, borderRadius: 8, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  targetTile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: color.background },
  // A touch smaller than title/label so a long target fits the card; it wraps rather than cuts off.
  targetTitle: { ...type.title, fontSize: 13, lineHeight: 18 },
  targetDetail: { ...type.label, fontSize: 11, lineHeight: 15 },
  targetFigure: { ...type.stat, fontSize: 14, lineHeight: 18, flexShrink: 0, fontVariant: ["tabular-nums"] },

  ways: { gap: space.inline },
  way: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    padding: space.item,
    borderRadius: 12,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
    boxShadow: card.shadowXs,
  },
  wayOn: { borderColor: color.primaryLine, backgroundColor: color.primaryTint },
  wayTile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: surface.inset },
  wayTileOn: { backgroundColor: color.primarySoft },
  wayTitle: { ...type.title, color: ink.strong },

  note: { flexDirection: "row", gap: space.lead, padding: space.card, borderRadius: 8, backgroundColor: color.primarySoft },

  dialMiddle: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  dialOf: { fontSize: 7, lineHeight: 9, letterSpacing: 0.4 },
})
