import * as React from "react"
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { Art, type ArtName } from "@/components/art"
import { creditTone } from "@/components/hol"
import { useEntrance } from "@/components/charts"
import { RecentDots } from "@/components/recent-dots"
import { useReducedMotion } from "@/components/chat"
import { ArrowDownRight, ArrowRight, ArrowUpRight, CaretRight, Check, DotsThree, Minus, ShieldCheck, Warning, X } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { toast } from "@/components/toast"
import { withQuestion } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, cardRadius, chart, color, font, gutter, hairline, ink, outOfRangeColor, space, type } from "@/lib/theme"
import { isGrowth, monthYear, type Trend as MarkerTrend } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/* The signed-in record's pieces, built to the Frontline patient app's
   design system (Figma, "Patient Mob App" and its component sheet), in
   Inlay teal, restyled to the Figma "Hol" file (5 Oct 2026): cards in 60%
   white at radius 8 with a soft shadow and no edge, round 28 icon tiles on
   Primary/00 holding a 16 Phosphor icon, tint badges for what
   changed, white status badges with a dot for what a value means, a warm
   banner with one small action, the gradient task card, rows for results,
   segmented tabs on a grey track, and dated steps. Text, greys and spacing
   follow Frontline's roles in lib/theme.ts (type, ink, space). Every piece
   carries information; nothing is decoration.

   Both homes, the free record and the Optimization member's, are composed
   from the same pieces: rows for what needs the patient and what is coming
   up, count tiles, the one summary line under the greeting, the status
   banner that follows the doctor's review, the member's plan line, and the
   one offer card every membership touchpoint shares (Nudge). Status speaks
   the client's words (30 Sep): "Out of range" is a filled dot, "Borderline"
   a ring, "In range" a dot; never "Outside target", High or Low. Red sits
   only on the small out of range mark; anything that needs attention
   ("Overdue", "Records differ") is clay. */

/** The card radius, from the theme (it was 8 before the rounder system). */
export const CARD_RADIUS = cardRadius

/** The app's one confirmation pill, kept with the kit so a screen can take
    every piece from one place. */
export { Toast, ToastHost, toast } from "@/components/toast"

/* The kit's marks that are not text (text greys are the theme's ink, lines
   its hairline): a calm mark for what has not happened yet, a bar's track,
   and a step's ring before it is reached. */
const MARK = {
  faint: "#98A2B3",
  track: chart.track,
  off: "#D0D5DD",
} as const

/** Opacity and transforms run on the native driver except on the web
    build, which has none. */
const native = Platform.OS !== "web"

export type Hue = "teal" | "blue" | "amber" | "green" | "red" | "violet" | "neutral"

/** Each category hue: its ink, its tint, and the edge a tinted block (a
    banner) is drawn with. `neutral` is the calm grey of something that has
    not happened yet (C.0.3): an open order's tile in Coming up. */
export const HUE: Record<Hue, { ink: string; tint: string; edge: string }> = {
  teal: { ink: color.primary, tint: color.primaryTint, edge: color.primaryHalo },
  neutral: { ink: "#667085", tint: "#F2F4F7", edge: hairline.edge },
  blue: { ink: color.blue, tint: color.blueTint, edge: "#C7D5FF" },
  amber: { ink: color.amber, tint: color.amberTint, edge: color.amberEdge },
  green: { ink: color.ok, tint: color.okTint, edge: "#ABEFC6" },
  red: { ink: color.high, tint: color.highTint, edge: "#FECDCA" },
  violet: { ink: color.violet, tint: color.violetTint, edge: "#DDD0F7" },
}

export type Tone = "high" | "low" | "ok" | "primary" | "muted" | "soon"

/* Frontline's badge tints: ink on a pale fill with a faint edge. A tag is
   words, and red is never words (FINAL-SPEC C.0.3), so "high" draws the
   same calm clay as "low": "Overdue" and "Records differ" need attention,
   not alarm (V-07). */
const CLAY_TAG = { ink: "#A95413", fill: "#FFF8F1", edge: "rgba(137, 67, 15, 0.04)" }
const BADGE: Record<Tone, { ink: string; fill: string; edge: string }> = {
  high: CLAY_TAG,
  low: CLAY_TAG,
  ok: { ink: ink.good, fill: "#ECFDF3", edge: "rgba(47, 127, 77, 0.06)" },
  // Words on the teal tint take the text teal, as Frontline's badges take
  // the darker step of their hue.
  primary: { ink: ink.primary, fill: color.primarySoft, edge: color.primaryEdge },
  muted: { ink: ink.secondary, fill: "#F7F7F7", edge: "rgba(80, 80, 80, 0.08)" },
  // Something on its way ("Coming soon"): a warm yellow, never a warning.
  soon: { ink: "#93690A", fill: "#FEF7D6", edge: "rgba(202, 150, 4, 0.18)" },
}

/* A status mark's colour: the chart kit's out of range, borderline and in
   range tokens (catalog 7.3), so a dot means one thing everywhere. Out of
   range is read at render, so the red or clay swap (Q-06, /demo/kit) moves
   badges and charts together. */
const markOf = (t: Tone) =>
  t === "high" ? outOfRangeColor() : t === "low" ? chart.borderline : t === "ok" ? chart.inRange : t === "primary" ? color.primary : t === "soon" ? "#CA9604" : MARK.faint

/* ------------------------------------------------------------- words -- */

/** Where a result sits against the patient's range, in the client's words
    (30 Sep): out of range, borderline (inside the range but near an edge),
    or in range. */
export type Level = "out" | "borderline" | "in"

export const LEVEL_WORD: Record<Level, string> = { out: "Out of range", borderline: "Borderline", in: "In range" }

/** A level's mark colour, shared with the charts. Borderline is always
    drawn as a ring, out of range and in range as filled dots. Out of range
    is read when asked for (outOfRangeColor), so the review's red or clay
    swap reaches it. */
export const LEVEL_COLOR: Record<Level, string> = {
  get out() {
    return outOfRangeColor()
  },
  borderline: chart.borderline,
  in: chart.inRange,
}

/** A level's colour as text on white: green and red as the marks, borderline
    a deeper amber (5.5:1), as the yellow mark itself is too light to read. */
export const LEVEL_TEXT: Record<Level, string> = {
  get out() {
    return outOfRangeColor()
  },
  borderline: "#8A6200",
  in: chart.inRange,
}

const LEVEL_TONE: Record<Level, Tone> ={ out: "high", borderline: "low", in: "ok" }

/** Which way a marker's last comparable results are going, as a fact. */
export type Trend = "up" | "down" | "steady"

export const TREND_WORD: Record<Trend, string> = { up: "Trending up", down: "Trending down", steady: "Steady" }

/** What the movement means for the patient, said instead of the fact when
    it helps. "unknown" is fewer than two comparable results. */
export type Meaning = "improving" | "away" | "steady" | "unknown"

export const MEANING_WORD: Record<Meaning, string> = {
  improving: "Improving",
  away: "Moving away from your range",
  steady: "Steady",
  unknown: "Not enough results yet",
}

/* Status words the client ruled out (30 Sep), each with the patient word
   that replaces it, so no screen can print them through the kit. */
const RULED_OUT: Record<string, string> = {
  "outside target": "Out of range",
  "out of target": "Out of range",
  "outside range": "Out of range",
  abnormal: "Out of range",
  high: "Out of range",
  low: "Out of range",
  normal: "In range",
}

/** A status word in the patient's language. */
export function patientWord(word: string) {
  return RULED_OUT[word.trim().toLowerCase()] ?? word
}

/** "See all", or "See all 6", or "See all 7 to watch". */
export function seeAllLabel(count?: number, what?: string) {
  return count ? `See all ${count}${what ? ` ${what}` : ""}` : "See all"
}

/* --------------------------------------------------------- surfaces -- */

/** A white card on the cool page. `accessibilityLabel` makes the card
    one stop for a screen reader that says it all ("Unread. Colorectal
    cancer screening. Reminder 1 of 3, Sep 29"). */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  accessibilityLabel?: string
}) {
  if (!onPress)
    return (
      <View style={[styles.card, style]} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    )
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  )
}

/* Rows on the Hero's white panel sit 12 in from its edges with no edge or
   shadow of their own, so the panel stays compact and a row's words keep
   to one line each (FINAL-SPEC C.1.2): the Hero's own 16 already frames
   the panel. */
const InsetContext = React.createContext(false)

/** Rows on one white card, split by hairlines. `inset` drops the edge and
    the shadow, for rows on a white panel inside the Hero (radius 8, 12
    inside, round 28 tiles). */
export function Group({ children, inset, style }: { children: React.ReactNode; inset?: boolean; style?: StyleProp<ViewStyle> }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <InsetContext.Provider value={!!inset}>
      <View style={[inset ? styles.inset : styles.card, styles.group, inset && styles.groupInset, style]}>
        {rows.map((row, i) => (
          <View key={i} style={i < rows.length - 1 && styles.rule}>
            {row}
          </View>
        ))}
      </View>
    </InsetContext.Provider>
  )
}

/** An icon on a round tile tinted by what it stands for: 28 by default,
    its icon resized to the tile. */
export function Tile({ hue = "teal", size = 28, children }: { hue?: Hue; size?: number; children: React.ReactNode }) {
  // Figma "Hol": a round 28 tile on Primary/00 holding a 16 icon. An icon
  // passed at another size is drawn at the tile's own.
  const glyph = Math.round(size * 0.57)
  const icon = React.isValidElement<{ size?: number }>(children) && "size" in (children.props ?? {}) ? React.cloneElement(children, { size: glyph }) : children
  return <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2, backgroundColor: HUE[hue].tint }]}>{icon}</View>
}

type HeadingProps = {
  title: string
  /** Anything on the right. Wins over `link`, `meta` and `onSeeAll`. */
  action?: React.ReactNode
  /** A link with its own words on the right, drawn as "See all" is: "See
      progress". */
  link?: { label: string; onPress: () => void }
  /** Plain muted text on the right, e.g. "7 to watch" or "Wed, Sep 30". */
  meta?: string
  /** Adds the section's "See all" link; with `count`, "See all 6". */
  onSeeAll?: () => void
  count?: number
  /** "label" is the quiet grey section label (type.sectionLabel); "title"
      the darker block title (type.section) for a home's top level
      sections. */
  variant?: "label" | "title"
}

/** A section's label, with a link or a count on the right. */
export function Heading({ title, action, link, meta, onSeeAll, count, variant = "label" }: HeadingProps) {
  const big = variant === "title"
  const right =
    action ??
    (meta || onSeeAll || link ? (
      <View style={styles.headingRight}>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link" style={({ pressed }) => [styles.seeAllLink, pressed && styles.pressed]}>
            <Text style={styles.seeAllLinkText}>{seeAllLabel(count)}</Text>
            <CaretRight size={16} color={color.primary} />
          </Pressable>
        )}
        {link && (
          <Pressable onPress={link.onPress} hitSlop={8} accessibilityRole="link" style={({ pressed }) => [styles.seeAllLink, pressed && styles.pressed]}>
            <Text style={styles.seeAllLinkText}>{link.label}</Text>
            <CaretRight size={16} color={color.primary} />
          </Pressable>
        )}
      </View>
    ) : null)
  return (
    <View style={styles.heading}>
      <Text style={big ? styles.headingTitle : styles.headingText} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  )
}

/** A label and its content. */
export function Block({ children, ...heading }: HeadingProps & { children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Heading {...heading} />
      {children}
    </View>
  )
}

/* ----------------------------------------------------- tags, status -- */

/** Frontline's tint badge: what something is or what changed ("Changed",
    "New", "Overdue", "Booked"). */
export function Tag({ tone, children }: { tone: Tone; children: string }) {
  const b = BADGE[tone]
  return (
    <View style={[styles.tag, { backgroundColor: b.fill, borderColor: b.edge }]}>
      <Text style={[styles.tagText, { color: b.ink }]}>{patientWord(children)}</Text>
    </View>
  )
}

/** A status mark's shape: a filled dot, a ring, or a check in a filled
    circle. */
export type Mark = "dot" | "ring" | "check"

/** A status mark, 8 pt: a filled dot, or a 1.8 pt ring for borderline and
    "Records differ" (clay), so the meaning never rests on colour alone (Ed
    is colour blind). `mark` sets the shape for a state that is not a
    result's (FINAL-SPEC C.0.4): an order "Not booked yet" is a dot (clay
    once overdue), one done and waiting for its results a teal ring, and
    "Results in" a green check. */
export function Dot({ level, tone, size = 8, mark }: { level?: Level; tone?: Tone; size?: number; mark?: Mark }) {
  const t: Tone = level ? LEVEL_TONE[level] : (tone ?? "muted")
  const shape: Mark = mark ?? (t === "low" ? "ring" : "dot")
  if (shape === "check")
    return (
      <View style={[styles.dotCheck, { backgroundColor: markOf(t) }]}>
        <Check size={8} color={color.onPrimary} weight="bold" />
      </View>
    )
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        shape === "ring" ? { borderWidth: Math.max(1.5, size * 0.225), borderColor: markOf(t) } : { backgroundColor: markOf(t) },
      ]}
    />
  )
}

/** Frontline's status badge: what a value means, white with a mark and a
    word. Give a result its `level` ("Out of range", "Borderline", "In
    range"); `tone` with your own word is kept for other states, such as an
    order's. `bare` drops the pill, for a status inside a row. Words the
    client ruled out ("Outside target", High, Low) print as patient words. */
export function Status({ level, tone, mark, children, bare, tinted }: { level?: Level; tone?: Tone; mark?: Mark; children?: string; bare?: boolean; tinted?: boolean }) {
  const word = patientWord(children ?? (level ? LEVEL_WORD[level] : ""))
  const hue = tinted && level ? { backgroundColor: `${LEVEL_COLOR[level]}1A`, borderColor: `${LEVEL_COLOR[level]}4D` } : undefined
  return (
    <View style={[styles.status, bare && styles.statusBare, hue]}>
      <Dot level={level} tone={tone} mark={mark} />
      <Text style={[styles.statusText, tinted && level ? { color: LEVEL_TEXT[level] } : undefined]}>{word}</Text>
    </View>
  )
}

const ARROW: Record<Trend, typeof ArrowRight> = { up: ArrowUpRight, down: ArrowDownRight, steady: ArrowRight }

/** Which way a marker is going: the status badge with a neutral grey
    arrow in place of the dot ("Trending up", "Trending down", "Steady").
    Pass a meaning word as children instead ("Improving", "Moving away from
    your range"); with no trend it reads "Not enough results yet". Never in
    a status colour: the level's dot is the one colour beside it. */
export function TrendPill({ trend, children, bare }: { trend?: Trend; children?: string; bare?: boolean }) {
  return (
    <View style={[styles.status, bare && styles.statusBare]}>
      {trend && React.createElement(ARROW[trend], { size: 12, color: ink.detail, weight: "bold" })}
      <Text style={styles.statusText}>{children ?? (trend ? TREND_WORD[trend] : MEANING_WORD.unknown)}</Text>
    </View>
  )
}

/* ---------------------------------------------------------- banners -- */

/** A small dot that breathes while something is under way (a review,
    records arriving). Still when the phone asks for reduced motion. */
export function LiveDot({ size = 8, color: tone = color.primary }: { size?: number; color?: string }) {
  const still = useReducedMotion()
  const t = React.useRef(new Animated.Value(1)).current
  React.useEffect(() => {
    if (still) {
      t.setValue(1)
      return
    }
    const ease = Easing.inOut(Easing.quad)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 0.35, duration: 800, easing: ease, useNativeDriver: native }),
        Animated.timing(t, { toValue: 1, duration: 800, easing: ease, useNativeDriver: native }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [still, t])
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone, opacity: t }} />
}

/** Something to know now, tinted and edged, with one small action. Without
    `onPress` it is plain text to a screen reader, not a button. `live`
    adds a breathing dot to the tile while something is under way. */
export function Banner({
  icon,
  title,
  meta,
  action,
  onPress,
  hue = "amber",
  live,
  onDismiss,
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  action?: string
  onPress?: () => void
  hue?: Hue
  live?: boolean
  /** Adds a close X on the right, as in the alert layout. */
  onDismiss?: () => void
}) {
  const h = HUE[hue]
  const body = (
    <>
      <View style={styles.bannerIcon}>
        {icon}
        {live && (
          <View style={styles.bannerLive}>
            <LiveDot size={7} color={h.ink} />
          </View>
        )}
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {!!meta && <Text style={styles.bannerMeta}>{meta}</Text>}
      </View>
      {action ? (
        <View style={[styles.bannerAction, { borderColor: h.edge }]}>
          <Text style={styles.bannerActionText}>{action}</Text>
        </View>
      ) : (
        onPress && <CaretRight size={16} color={card.chevron} />
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} style={styles.bannerClose}>
          <X size={18} color={ink.content} />
        </Pressable>
      )}
    </>
  )
  const look = [styles.banner, { backgroundColor: h.tint }]
  if (!onPress)
    return (
      <View style={look} accessible accessibilityRole="text">
        {body}
      </View>
    )
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [...look, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

/** A date as the data gives it: a Date, "2026-10-03", or "Oct 3, 2026". */
export type DateLike = Date | string

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/* A DateLike as a local calendar day. ISO dates are read as local days,
   never UTC midnight, so a date does not slip back a day in California
   (audit A-40). */
function toDay(d: DateLike | null | undefined): Date | undefined {
  if (!d) return undefined
  if (d instanceof Date) return isNaN(d.getTime()) ? undefined : new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  const named = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(d.trim())
  if (!named) return undefined
  const month = MONTHS.findIndex((m) => m.toLowerCase() === named[1].toLowerCase())
  return month < 0 ? undefined : new Date(+named[3], month, +named[2])
}

/* Whole calendar days from a to b (rounded, so a daylight saving day of 23
   or 25 hours still counts as one). */
const daysFrom = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)

/* "Oct 3", with the year when it is not this year: "Oct 3, 2025". The
   month and day are joined by a no-break space, so they never part at the
   end of a line. */
function shortDay(d: Date, today: Date) {
  const day = `${MONTHS[d.getMonth()]}\u00A0${d.getDate()}`
  return d.getFullYear() === today.getFullYear() ? day : `${day}, ${d.getFullYear()}`
}

/* "Dr. Patel" and "Oct 3" held together on one line, wherever the words
   came from, and the last two words too (lib/words.ts keepEnd), so a
   banner on a narrow phone never leaves one word alone on its second
   line ("Dr. Patel is checking your / new record"). */
const keep = (text: string) =>
  keepEnd(text.replace(/\b(Dr|Mr|Mrs|Ms)\. /g, "$1.\u00A0").replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})\b/g, "$1\u00A0$2"))

/** The status banner's states (catalog F-13, 2.2 row 2). `sharing-off` is
    the patient turning sharing off herself; it shows on every tab. */
export type BannerState =
  | { kind: "sharing-off"; since: string }
  | { kind: "sharing-ended"; on: string }
  | { kind: "sharing-ends"; days: number; on: string }
  | { kind: "arriving"; got?: number; of?: number }
  | { kind: "not-found"; place: string }
  | { kind: "new-results"; count: number; from?: string; on?: string; batch?: string }
  | { kind: "plan-review"; version: number; by: string }
  | { kind: "checking"; by: string }
  | { kind: "checked"; by: string; on: string }

/** What the home knows that the status banner can say. */
export type BannerFacts = {
  /** When the patient turned sharing off (consent withdrawn after it was
      given). Everything collected before stays visible. */
  sharingOff?: DateLike | null
  /** The doctor's review of the newly built record; `done` once finished. */
  review?: { by: string; done?: DateLike | null } | null
  /** Results that arrived and have not been opened yet; `batch` is the
      batch's id, so the banner opens that batch. */
  newResults?: { count: number; from?: string; on?: DateLike; batch?: string } | null
  /** When the patient's permission to pull records ends. */
  sharingEnds?: DateLike | null
  /** Places answered so far while the record is still being built. */
  arriving?: { got: number; of: number } | null
  /** A place where no records were found. */
  notFound?: string | null
  /** Member: a newer plan version with the doctor. */
  planReview?: { version: number; by: string } | null
  /** Today, for review links and tests; defaults to now. */
  today?: Date
}

/** How long the timed states show: "checked" for seven days (F-13), and
    the renewal warning from 30 days before sharing ends (Q-12). */
export const BANNER_DAYS = { checked: 7, sharingWarn: 30 } as const

/** The one banner to show, highest first: sharing turned off; sharing
    ended, or ends within 30 days; records still arriving; a place with no
    records; new results; a member's new plan version with the doctor; the
    doctor checking the new record; then "checked your record on Oct 3" for
    seven days, after which nothing shows. A null means no banner. */
export function pickBanner(f: BannerFacts): BannerState | null {
  const today = toDay(f.today ?? new Date())!
  if (f.sharingOff) {
    const off = toDay(f.sharingOff)
    return { kind: "sharing-off", since: off ? shortDay(off, today) : "" }
  }
  const ends = toDay(f.sharingEnds)
  if (ends) {
    const days = daysFrom(today, ends)
    if (days < 0) return { kind: "sharing-ended", on: shortDay(ends, today) }
    if (days <= BANNER_DAYS.sharingWarn) return { kind: "sharing-ends", days, on: shortDay(ends, today) }
  }
  if (f.arriving && f.arriving.got < f.arriving.of) return { kind: "arriving", got: f.arriving.got, of: f.arriving.of }
  if (f.notFound) return { kind: "not-found", place: f.notFound }
  if (f.newResults && f.newResults.count > 0) {
    const on = toDay(f.newResults.on)
    return { kind: "new-results", count: f.newResults.count, from: f.newResults.from, on: on && shortDay(on, today), batch: f.newResults.batch }
  }
  if (f.planReview) return { kind: "plan-review", version: f.planReview.version, by: f.planReview.by }
  if (f.review) {
    const done = toDay(f.review.done)
    if (!done) return { kind: "checking", by: f.review.by }
    const age = daysFrom(done, today)
    if (age >= 0 && age < BANNER_DAYS.checked) return { kind: "checked", by: f.review.by, on: shortDay(done, today) }
  }
  return null
}

type BannerIcon = "shield" | "documents" | "hospital" | "labs" | "clinic" | "check"

/** A banner state's words and look, shared with anything that announces
    the same event (a notification) so it reads the same everywhere.
    `tappable` is false where there is nothing to open. */
export function bannerCopy(s: BannerState): BannerCopy {
  const c = bannerWords(s)
  return { ...c, title: keep(c.title), meta: c.meta && keep(c.meta) }
}

type BannerCopy = { hue: Hue; icon: BannerIcon; title: string; meta?: string; action?: string; live?: boolean; tappable: boolean }

function bannerWords(s: BannerState): BannerCopy {
  switch (s.kind) {
    case "sharing-off":
      return {
        hue: "amber",
        icon: "shield",
        title: s.since ? `You turned off sharing on ${s.since}` : "You turned off sharing",
        meta: "Your record stopped updating",
        action: "Turn on",
        tappable: true,
      }
    case "sharing-ended":
      return { hue: "amber", icon: "shield", title: `Sharing your records ended on ${s.on}`, meta: "Your record stopped updating", action: "Renew", tappable: true }
    case "sharing-ends":
      return {
        hue: "amber",
        icon: "shield",
        title: s.days === 0 ? "Sharing your records ends today" : s.days === 1 ? "Sharing your records ends tomorrow" : `Sharing your records ends in ${s.days}\u00A0days`,
        meta: s.days > 1 ? `On ${s.on}` : undefined,
        action: "Renew",
        tappable: true,
      }
    case "arriving":
      return {
        hue: "teal",
        icon: "documents",
        title: "Your record is still arriving",
        meta: s.of ? `${s.got ?? 0} of ${s.of} places so far` : undefined,
        live: true,
        tappable: false,
      }
    case "not-found":
      return { hue: "amber", icon: "hospital", title: `We couldn't find records at ${s.place}`, action: "Tell us", tappable: true }
    case "new-results":
      return {
        hue: "teal",
        icon: "labs",
        title: s.count === 1 ? "A new result is in" : "New results are in",
        meta: [`${s.count} ${s.count === 1 ? "result" : "results"}${s.from ? ` from ${s.from}` : ""}`, s.on].filter(Boolean).join(", "),
        tappable: true,
      }
    case "plan-review":
      return { hue: "teal", icon: "documents", title: `Version ${s.version} is with ${s.by}`, meta: "Your current plan stays in place", live: true, tappable: true }
    case "checking":
      return { hue: "teal", icon: "clinic", title: `${s.by} is checking your new record`, live: true, tappable: false }
    case "checked":
      // Teal, not green: the review is done, which says nothing about whether
      // the results themselves are good.
      return { hue: "teal", icon: "check", title: `${s.by} checked your record on ${s.on}`, tappable: true }
  }
}

function BannerGlyph({ icon, hue }: { icon: BannerIcon; hue: Hue }) {
  const tone = HUE[hue].ink
  // Amber is the warning look: a filled triangle, as in the alert layout.
  if (hue === "amber") return <Warning size={22} color={tone} weight="fill" />
  if (icon === "shield") return <ShieldCheck size={18} color={tone} />
  if (icon === "check") return <Check size={18} color={tone} weight="bold" />
  return <RecordIcon name={icon} size={18} color={tone} />
}

/** The home's one status banner, drawn from its state (see pickBanner).
    `onPress` opens what the state is about (renew, Tell us, the new
    results, the plan, the record); states with nothing to open (checking,
    arriving) stay plain text whatever is passed. */
export function ReviewBanner({ state, onPress }: { state: BannerState | null | undefined; onPress?: () => void }) {
  if (!state) return null
  const c = bannerCopy(state)
  const press = c.tappable ? onPress : undefined
  return (
    <Banner
      hue={c.hue}
      icon={<BannerGlyph icon={c.icon} hue={c.hue} />}
      title={c.title}
      meta={c.meta}
      action={press ? c.action : undefined}
      live={c.live}
      onPress={press}
    />
  )
}

/* ------------------------------------------------------------- hero -- */

/** The one strong block on a screen: Frontline's gradient task card, in
    teal. The gradient fills whatever the block holds (rows on a white inset
    panel, count tiles); the two soft circles keep their size in the top and
    bottom right corners. `muted` is the Ask banner's softer grey teal. */
export function Hero({ children, onPress, muted, alert }: { children: React.ReactNode; onPress?: () => void; muted?: boolean; alert?: boolean }) {
  const [from, to] = alert ? HERO_RED : muted ? HERO_MUTED : HERO_TEAL
  // On a phone, react-native-svg sizes a percentage Svg once, so a block
  // that grew after its first layout (fonts loading, rows arriving) kept a
  // smaller gradient and its panel spilled past it. The gradient is drawn
  // at the block's measured size instead, and redrawn when that changes;
  // the block's own teal shows until the first measure.
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)
  const gradient = `hero${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }))
  }
  const inner = (
    <>
      {size && (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={gradient} x1="0.41" y1="0" x2="0.59" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${gradient})`} />
        </Svg>
      )}
      {/* Figma's three soft circles, kept at their size from the top
          left corner. */}
      <Svg style={styles.heroTop} width={387} height={251} viewBox="10 95 387 251">
        <Circle cx={64.5} cy={151.5} r={64.5} fill="#000" fillOpacity={0.1} />
        <Circle cx={297} cy={161} r={90} fill="#000" fillOpacity={0.1} />
        <Circle cx={216} cy={63} r={63} fill="#FFF" fillOpacity={0.1} />
      </Svg>
      {children}
    </>
  )
  // Without an action it stays a plain view, so buttons inside it are not
  // nested in another button.
  if (!onPress)
    return (
      <View style={styles.hero} onLayout={onLayout}>
        {inner}
      </View>
    )
  return (
    <Pressable onPress={onPress} onLayout={onLayout} accessibilityRole="button" style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
      {inner}
    </Pressable>
  )
}

/** The Hero's gradient, top to bottom: the brand teal, the Ask banner's
    grey teal (user, 5 Oct 2026), or the muted red for what needs her
    (6 Oct 2026). */
const HERO_TEAL = ["#2D6F7B", "#4FA3A5"] as const
const HERO_MUTED = ["#3E6B72", "#6A9EA0"] as const
const HERO_RED = ["#A9484D", "#C9676B"] as const

/** Words on the Hero's gradient: the title ("3 things need you", "Today"),
    a line under it (the focus line, "Step 3 of 5: Connect a device") and
    meta on the right ("0 of 4 done"). The title is Frontline's one white
    hero title: a block title in semibold. */
export const heroText = {
  title: { ...type.section, fontFamily: font.semibold, color: ink.onColor },
  line: { ...type.label, color: "rgba(255, 255, 255, 0.85)" },
  meta: { ...type.metaStrong, color: ink.onColor },
}

/** How far along something is, with round ends: 8 high in teal on a card,
    6 high in white on a 25% white track on the Hero. `done` may be a part
    (a meal logged moves the bar). */
export function ProgressBar({ done, total, onHero = false }: { done: number; total: number; onHero?: boolean }) {
  const share = total ? Math.min(Math.max(done / total, 0), 1) : 0
  return (
    <View style={[styles.track, onHero && styles.trackHero]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }}>
      {share > 0 && <View style={[styles.fill, onHero && styles.fillHero, { width: `${Math.max(3, share * 100)}%`, backgroundColor: onHero ? color.onPrimary : color.primary }]} />}
    </View>
  )
}

/* ----------------------------------------------------- dates, steps -- */

export type Step = { label: string; date?: string; state: "done" | "now" | "next" | "alert" }

/** One date on a test's track: "Ordered" and "Mar 4", or no date yet. */
export type TrackDate = { label: string; date?: string }

/** The track as a sentence, for screen readers. */
const trackWords = (dates: TrackDate[]) => dates.map((d) => `${d.label} ${d.date ?? "not yet"}`).join(", ")

/** A test's three dates across a card: ordered, booked, done. Each date
    reached is ticked; one still missing reads "Not yet". `mini` is the
    compact track for a row: small dots, the first date flush left and the
    last flush right, so it lines up with the row's text. */
export function DateTrack({ dates, late, mini }: { dates: TrackDate[]; late?: boolean; mini?: boolean }) {
  const reached = dates.filter((d) => d.date).length
  if (mini) {
    const last = dates.length - 1
    return (
      <View accessible accessibilityLabel={trackWords(dates)}>
        <View style={styles.miniRail}>
          {dates.map((d, i) => (
            <React.Fragment key={d.label}>
              {i > 0 && <View style={[styles.miniLine, i < reached && styles.trackLineOn]} />}
              <View style={[styles.miniDot, !!d.date && styles.trackDotOn, i === reached && late && styles.trackDotLate]} />
            </React.Fragment>
          ))}
        </View>
        <View style={styles.miniLabels}>
          {dates.map((d, i) => (
            <View key={d.label} style={[styles.miniStep, i === 0 ? styles.miniFirst : i === last ? styles.miniLast : null]}>
              <Text style={styles.miniLabel} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={[styles.miniDate, !d.date && styles.trackDateOff, i === reached && late && styles.trackDateLate]} numberOfLines={1}>
                {d.date ?? "Not yet"}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }
  return (
    <View style={styles.dateTrack} accessible accessibilityLabel={trackWords(dates)}>
      {dates.map((d, i) => {
        const on = !!d.date
        const next = i === reached
        const lateHere = next && late
        return (
          <React.Fragment key={d.label}>
            {i > 0 && <View style={styles.trackJoin} />}
            <View style={styles.trackPill}>
              <Text style={styles.trackLabel} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={[styles.trackDate, !on && styles.trackDateOff, lateHere && styles.trackDateLate]} numberOfLines={1}>
                {d.date ?? "Not yet"}
              </Text>
              {on ? (
                <View style={styles.trackBadge}>
                  <Check size={7} color={color.onPrimary} weight="bold" />
                </View>
              ) : (
                lateHere && (
                  <View style={[styles.trackBadge, styles.trackBadgeLate]}>
                    <Text style={styles.trackBadgeMark}>!</Text>
                  </View>
                )
              )}
            </View>
          </React.Fragment>
        )
      })}
    </View>
  )
}

/** How far the current step's band reaches past its text. */
const STEP_BAND = 10
/** How far the band reaches past the steps on each side. */
const STEP_BAND_X = 6

/** Dated steps down a line: each done one ticked with its date, the
    current one ringed on a soft teal band, the rest still to come. The
    line runs teal through what is done and dashed from the current step
    to the next. */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <View>
      {steps.map((s, i) => {
        const now = s.state === "now"
        const after = i < steps.length - 1
        const cameFromDone = i > 0 && steps[i - 1].state === "done"
        return (
          <View key={i} style={[styles.step, now && styles.stepNow]}>
            {now && <View style={styles.stepBand} pointerEvents="none" />}
            <View style={[styles.rail, now && styles.railNow]}>
              {now && <View style={[styles.lineStub, i === 0 && styles.lineNone, cameFromDone && styles.lineDone]} />}
              <View style={[styles.node, s.state === "done" && styles.nodeDone, now && styles.nodeNow, s.state === "alert" && styles.nodeAlert]}>
                {s.state === "done" && <Check size={10} color={color.onPrimary} weight="bold" />}
                {now && <View style={styles.nodeNowDot} />}
              </View>
              {after && (now ? <DashedLine /> : <View style={[styles.line, s.state === "done" && styles.lineDone]} />)}
            </View>
            <View style={[styles.stepBody, now && styles.stepBodyNow]}>
              <Text style={[styles.stepLabel, (s.state === "next" || s.state === "alert") && styles.stepLater]}>{s.label}</Text>
              {!!s.date && <Text style={styles.stepDate}>{s.date}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** The line from the current step on: short grey dashes, drawn as views
    since a one sided dashed border does not draw on iOS. */
function DashedLine() {
  return (
    <View style={styles.dashTrack}>
      <View style={styles.dashes}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
    </View>
  )
}

/* ------------------------------------------------------------- rows -- */

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/* A row's date as a local day: the record kit's DateLike, or a local day
   and time as lib/todo.ts writes it ("2026-12-08T09:00"). */
const dayOfRow = (date: DateLike) => toDay(typeof date === "string" ? date.slice(0, 10) : date)

/** A row's date block as a screen reader says it, since the block is
    drawn, not read: "Tuesday, December 8", with the year when it is not
    this one (C.0.5, C.0.9). */
export function spokenDate(date: DateLike, now: Date = new Date()): string | undefined {
  const d = dayOfRow(date)
  if (!d) return undefined
  const day = `${WEEKDAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  return d.getFullYear() === now.getFullYear() ? day : `${day}, ${d.getFullYear()}`
}

/** A calendar block for a dated row, in place of an icon tile: the weekday
    over the day for a date within six days of today ("Wed" over "7"), the
    month over the day for one further off ("Oct" over "21"), so a date
    weeks away never reads as a day this week. */
export function DateBlock({ date, hue = "teal", size = "md" }: { date: DateLike | { weekday: string; day: string | number }; hue?: Hue; size?: "md" | "lg" }) {
  const given = typeof date === "string" || date instanceof Date ? undefined : date
  const day = given ? undefined : dayOfRow(date as DateLike)
  const near = !!day && Math.abs(daysFrom(toDay(new Date())!, day)) <= 6
  const top = day ? (near ? WEEKDAYS[day.getDay()] : MONTHS[day.getMonth()]) : (given?.weekday ?? "")
  const num = day ? day.getDate() : (given?.day ?? "")
  const lg = size === "lg"
  return (
    <View style={[styles.tile, styles.dateBlock, lg && styles.dateBlockLg, { backgroundColor: HUE[hue].tint }]}>
      <Text style={[styles.dateWeekday, lg && [styles.dateWeekdayLg, { color: HUE[hue].ink }]]}>{top}</Text>
      <Text style={[styles.dateDay, lg && styles.dateDayLg, hue === "teal" && { color: ink.primary }]}>{num}</Text>
    </View>
  )
}

export type NeedsRowProps = {
  /** The icon, on a tile tinted by `hue`. */
  icon?: React.ReactNode
  hue?: Hue
  /** A calendar block in place of the icon, for a dated row: "Wed" over
      "7" this week, "Oct" over "21" further off. Its day is said to a
      screen reader after the title. */
  date?: DateLike | { weekday: string; day: string | number }
  title: string
  /** One line of facts: the date, the place, "Reminder 2 of 3". */
  meta?: string
  /** A second line in teal for something extra, e.g. "2 questions saved"
      or a fasting note, two lines at most. */
  note?: string
  /** A tag beside the title, only for an exception ("Overdue", "Booked");
      it wraps under the title when both do not fit. */
  tag?: { tone: Tone; label: string }
  /** Anything else on the right: a date ("Oct 12") as text, or a node such
      as a bare Status. Not drawn with `action`. */
  right?: React.ReactNode
  /** An order's three dates, as a mini track under the meta line. */
  track?: { dates: TrackDate[]; late?: boolean }
  /** The row's one action on the title line: a pill ("Book", "Call",
      "Check"), or a quiet grey text button ("Remove"), which sits at the
      end of the facts when there are any. The facts then take the row's
      full width and are never cut short (To do's long lines). */
  action?: { label: string; onPress: () => void; quiet?: boolean; accessibilityLabel?: string }
  /** Something not there yet, in a muted title: "Snack not logged". */
  muted?: boolean
  /** The whole row opens its item. */
  onPress?: () => void
  /** A pressable row shows a chevron unless this is false (never with an
      action). */
  chevron?: boolean
  accessibilityLabel?: string
}

/** The height of a small pill and of a text button's target (SmallAction,
    TextAction): what a row's words line up against. */
const ACTION_HEIGHT = 32

/** One thing that needs the patient, or one that is coming up: a tile (or a
    date block), the title with a tag beside it for an exception, one line
    of facts, and a date or a status on the right, or the row's one action
    on its title line. The whole row is the button. Set three at most in a
    Group, then a SeeAllRow (F-10); the same row sits on the Hero's white
    inset panel. */
export function NeedsRow({
  icon,
  hue = "teal",
  date,
  title,
  meta,
  note,
  tag,
  right,
  track,
  action,
  muted,
  onPress,
  chevron = true,
  accessibilityLabel,
}: NeedsRowProps) {
  const inset = React.useContext(InsetContext)
  const left = date ? (
    <DateBlock date={date} hue={hue} />
  ) : icon ? (
    <Tile hue={hue} size={28}>
      {icon}
    </Tile>
  ) : null
  // The block's day is drawn, so it is said: after the title and its tag,
  // before the facts (which then need not repeat its weekday).
  const dated = date && (typeof date === "string" || date instanceof Date) ? date : undefined
  const day = dated ? dayOfRow(dated) : undefined
  const spoken = dated ? spokenDate(dated) : undefined
  const spokenMeta = day && meta?.startsWith(`${WEEKDAYS[day.getDay()]}, `) ? meta.slice(5) : meta
  const label =
    accessibilityLabel ??
    [title, tag?.label, spoken, spokenMeta, note, typeof right === "string" ? right : undefined, track && trackWords(track.dates)].filter(Boolean).join(", ")
  // A quiet action sits at the end of the facts; with none, beside the
  // title like a pill.
  const quietOnMeta = !!action?.quiet && !!meta
  const onTitle = !!action && !quietOnMeta
  const quiet = action?.quiet && (
    <TextAction tone="muted" onPress={action.onPress}>
      {action.label}
    </TextAction>
  )
  const titleText = (
    <Text style={[styles.rowTitle, muted && styles.rowTitleMuted]} numberOfLines={action ? undefined : 2}>
      {title}
    </Text>
  )
  const body = (
    <>
      {left}
      <View style={styles.rowBody}>
        {action ? (
          <View style={styles.rowActionLine}>
            <View style={[styles.rowTitleLine, styles.rowTitleFill, onTitle && styles.rowTitleByAction]}>
              {titleText}
              {tag && <Tag tone={tag.tone}>{tag.label}</Tag>}
            </View>
            {onTitle &&
              (action.quiet ? (
                quiet
              ) : (
                <SmallAction onPress={action.onPress} accessibilityLabel={action.accessibilityLabel ?? `${action.label}: ${title}`}>
                  {action.label}
                </SmallAction>
              ))}
          </View>
        ) : tag ? (
          <View style={styles.rowTitleLine}>
            {titleText}
            <Tag tone={tag.tone}>{tag.label}</Tag>
          </View>
        ) : (
          titleText
        )}
        {!!meta &&
          (quietOnMeta ? (
            <View style={styles.rowMetaLine}>
              <Text style={[styles.rowMeta, styles.rowTitleFill]}>{meta}</Text>
              <View style={styles.rowMetaAction}>{quiet}</View>
            </View>
          ) : (
            <Text style={styles.rowMeta} numberOfLines={action ? undefined : 2}>
              {meta}
            </Text>
          ))}
        {!!note && (
          <Text style={styles.rowNote} numberOfLines={2}>
            {note}
          </Text>
        )}
        {track && (
          <View style={styles.rowTrack}>
            <DateTrack mini dates={track.dates} late={track.late} />
          </View>
        )}
      </View>
      {!action && right != null && <View style={styles.rowSide}>{typeof right === "string" ? <Text style={styles.rowDate}>{right}</Text> : <View>{right}</View>}</View>}
      {onPress && chevron && !action && (
        <View style={styles.rowSide}>
          <CaretRight size={16} color={card.chevron} />
        </View>
      )}
    </>
  )
  const look = [styles.row, inset && styles.rowInset, (!!track || !!action) && styles.rowTop]
  if (!onPress)
    return (
      <View style={look} accessible={!action} accessibilityLabel={action ? undefined : label}>
        {body}
      </View>
    )
  // With an action, a screen reader hears the row as one button that opens
  // the item, its pill offered as an action on it ("Book"), so neither is
  // lost.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={action ? [{ name: "activate" }, { name: "action", label: action.label }] : undefined}
      onAccessibilityAction={action ? (e) => (e.nativeEvent.actionName === "action" ? action.onPress() : onPress()) : undefined}
      style={({ pressed }) => [...look, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  )
}

/** The last row of a truncated section: "See all 6", opening the full list.
    `onHero` draws it as the Hero's white footer link instead. */
export function SeeAllRow({ count, what, label, onPress, onHero }: { count?: number; what?: string; label?: string; onPress: () => void; onHero?: boolean }) {
  const tone = onHero ? ink.onColor : color.primary
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={onHero ? 8 : undefined}
      style={({ pressed }) => [onHero ? styles.seeAllHero : styles.seeAll, pressed && styles.rowPressed]}
    >
      <Text style={[styles.seeAllText, { color: tone }]}>{label ?? seeAllLabel(count, what)}</Text>
      <CaretRight size={16} color={tone} />
    </Pressable>
  )
}

/* ---------------------------------------------------- counts, lines -- */

/* "1,640": thousands separators without relying on Intl, which Hermes may
   not carry. */
const grouped = (n: number) => {
  const [whole, part] = String(n).split(".")
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (part ? `.${part}` : "")
}

export type StatTileProps = {
  value: string | number
  unit?: string
  label: string
  /** A change line under the label, in meta: "11 lb down", "Held steady". */
  meta?: string
  icon?: React.ReactNode
  hue?: Hue
  level?: Level
  done?: boolean
  onPress?: () => void
  /** The white tile on the Hero's gradient: the member's three doors. */
  onHero?: boolean
  /** No card of its own, for stats inside a card ("Since you started",
      "Your week"); a StatRow of bare tiles draws 1 pt dividers between
      them. */
  bare?: boolean
  accessibilityLabel?: string
}

/** A small count on a tile: an optional icon (or a status dot), the number,
    what it counts, and a change line. `done` pins a green check to the
    corner; `onHero` is the white tile on the Hero's gradient; `bare` drops
    the card for stats inside one. */
export function StatTile({ value, unit, label, meta, icon, hue = "teal", level, done, onPress, onHero, bare, accessibilityLabel }: StatTileProps) {
  const shown = typeof value === "number" ? grouped(value) : value
  const a11y = accessibilityLabel ?? [`${shown}${unit ? ` ${unit}` : ""}`, label, meta, done ? "done" : undefined].filter(Boolean).join(", ")
  const body = (
    <>
      {(!!icon || !!level || done) && (
        <View style={styles.statTop}>
          {icon ? (
            <Tile hue={hue} size={onHero ? 32 : 28}>
              {icon}
            </Tile>
          ) : level ? (
            <Dot level={level} />
          ) : (
            <View />
          )}
          {done && (
            <View style={styles.statDone}>
              <Check size={10} color={color.onPrimary} weight="bold" />
            </View>
          )}
        </View>
      )}
      <View style={[styles.statFoot, bare && styles.statFootBare]}>
        {/* A door's value and unit stay on one line, one size across the
            three doors ("Breakfast", "2,000 kcal"). */}
        <Text
          style={styles.statValue}
          numberOfLines={onHero ? 1 : undefined}
          adjustsFontSizeToFit={onHero && native}
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.3}
        >
          {shown}
          {!!unit && <Text style={styles.statUnit}>{`${unit === "%" ? "" : " "}${unit}`}</Text>}
        </Text>
        <Text style={onHero ? styles.statLabelHero : styles.statLabel} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {!!meta && (
          <Text style={styles.statMeta} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {meta}
          </Text>
        )}
      </View>
    </>
  )
  const look = onHero ? styles.statHero : bare ? styles.statBare : [styles.card, styles.stat]
  if (!onPress)
    return (
      <View style={look} accessible accessibilityLabel={a11y}>
        {body}
      </View>
    )
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [look, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

/** Count tiles side by side, equal widths and heights, their numbers lined
    up at the bottom. Bare tiles (inside a card) sit on one line with 1 pt
    dividers between them instead of gaps, their numbers lined up at the
    top: a label that wraps simply runs further down. */
export function StatRow({ children }: { children: React.ReactNode }) {
  const cells = React.Children.toArray(children).filter(Boolean)
  const divided = cells.length > 0 && cells.every((c) => React.isValidElement<{ bare?: boolean }>(c) && !!c.props.bare)
  return (
    <View style={[styles.statRow, divided && styles.statRowDivided]}>
      {cells.map((c, i) => (
        <View key={i} style={[styles.statCell, divided && i > 0 && styles.statCellDivided]}>
          {c}
        </View>
      ))}
    </View>
  )
}

/** The member's plan line for the home header: "Version 2, approved by Dr.
    Patel", and while a newer version is with the doctor a second line,
    "Version 3 is with Dr. Patel", with a breathing dot (M-55). The current
    version stays live meanwhile. */
export function PlanLine({
  version,
  by,
  on,
  reviewing,
  paused,
  onPress,
}: {
  version: number
  /** Who approved it, e.g. "Dr. Patel". */
  by: string
  /** When, e.g. "Sep 12". */
  on?: string
  /** A newer version's number while it is with the doctor. */
  reviewing?: number
  paused?: boolean
  onPress?: () => void
}) {
  const body = (
    <>
      <View style={styles.planRow}>
        {paused ? (
          <View style={styles.planMarkWrap}>
            <Dot tone="muted" />
          </View>
        ) : (
          <View style={styles.planMark}>
            <Check size={9} color={color.onPrimary} weight="bold" />
          </View>
        )}
        <Text style={styles.planText} numberOfLines={1}>
          <Text style={styles.planStrong}>{`Version ${version}`}</Text>
          {paused ? " is paused" : keep(`, approved by ${by}${on ? ` on ${on}` : ""}`)}
        </Text>
      </View>
      {reviewing != null && (
        <View style={styles.planRow}>
          <View style={styles.planMarkWrap}>
            <LiveDot size={7} />
          </View>
          <Text style={styles.planText} numberOfLines={1}>{`Version ${reviewing} is with ${keep(by)}`}</Text>
        </View>
      )}
    </>
  )
  if (!onPress) return <View style={styles.planLine}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.planLine, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

/* ---------------------------------------------------------- actions -- */

/** A small flat pill for an action inside a card, a banner or a row
    ("Renew", "Save", "See the plan"). `tint` on white cards, `outline` on
    grey or tinted ground, `onHero` on the teal gradient. Never a shadow. */
export function SmallAction({
  children,
  onPress,
  tone = "tint",
  accessibilityLabel,
  style,
}: {
  children: string
  onPress: () => void
  tone?: "tint" | "outline" | "onHero"
  accessibilityLabel?: string
  /** E.g. alignSelf "center" inside a centred column. */
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.small, tone === "outline" ? styles.smallOutline : tone === "onHero" ? styles.smallHero : styles.smallTint, style, pressed && styles.pressed]}
    >
      <Text style={styles.smallText}>{children}</Text>
    </Pressable>
  )
}

/** A text button: teal for the one action, grey for a quiet one ("Not
    now"), and the destructive ink, flat, for the quiet way out of
    something ("Cancel membership"). `chevron` points the way for an action
    that opens a page. */
export function TextAction({
  children,
  onPress,
  tone = "primary",
  chevron,
}: {
  children: string
  onPress: () => void
  tone?: "primary" | "muted" | "destructive"
  chevron?: boolean
}) {
  const fg = tone === "primary" ? color.primary : tone === "destructive" ? color.error : ink.secondary
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
      <Text style={[styles.textActionText, { color: fg }]}>{children}</Text>
      {chevron && <CaretRight size={14} color={fg} />}
    </Pressable>
  )
}

/* ------------------------------------------------------------ offer -- */

export type NudgeProps = {
  /** card: a quiet white card, for the free home's last card and the
      marker page's last block. inline: no card of its own, for inside an
      assistant answer or a sheet. link: one quiet line, for a soft mention
      (readiness 4 to 6, the score page, a recap's last line). */
  variant?: "card" | "inline" | "link"
  /** A card's title at the row title size, for a card inside a chat. */
  compact?: boolean
  /** One soft 3D object beside the words (card only), at most 64 pt. */
  art?: ArtName
  artSize?: number
  /** E.g. "Want to change course?" */
  title?: string
  /** One or two lines built from the patient's own data, e.g. "Your A1c has
      gone from 5.3 to 5.9 across your last 5 results." */
  body?: string | string[]
  /** Up to three things a plan would add for this patient, each ticked. */
  points?: string[]
  /** A quiet last line, e.g. "Reviewed by a physician before it starts." */
  note?: string
  /** The one action, e.g. "See how the plan works". Left out where only
      "Not now" belongs (the assistant's limit card at low readiness, with
      its own "Save for my next visit" as a child). */
  action?: string
  onAction?: () => void
  /** "Not now" by default; the home card says "Hide for now". */
  dismissLabel?: string
  /** Not now: the nudge folds away, then this runs. */
  onDismiss?: () => void
  /** "Not for me", kept in a small overflow menu so it never competes with
      the action. Folds the nudge away, then runs. */
  onDecline?: () => void
  /** Runs once when the nudge first shows, for the offer log and caps. */
  onShow?: () => void
  /** Anything that belongs above the actions, e.g. a "Save for my next
      visit" button on the AI credit limit card. */
  children?: React.ReactNode
}

/* An offer never carries a price (that lives on the plan page, B-06) or a
   physician's name (the doctor never sells, B-03). Warns while building. */
function guardOffer(words: string) {
  if (/\$\s?\d/.test(words)) console.warn(`Nudge: an offer never shows a price ("${words}")`)
  if (/\b(Dr\.?|Doctor)\s+[A-Z]/.test(words)) console.warn(`Nudge: an offer never names a physician ("${words}")`)
}

/** The one offer component: every membership touchpoint shows the plan
    through it, so the look, the words and the ways to say no are the same
    everywhere (catalog 5.3, 5.4). It takes callbacks only: whether it may
    show at all is the offer service's decision (lib/offers.ts). Quiet by
    design: no price, no doctor, one teal action, "Not now" beside it, and
    "Not for me" one tap further in the overflow. */
export function Nudge({
  variant = "card",
  compact = false,
  art,
  artSize = 64,
  title,
  body,
  points,
  note,
  action,
  onAction,
  dismissLabel = "Not now",
  onDismiss,
  onDecline,
  onShow,
  children,
}: NudgeProps) {
  const still = useReducedMotion()
  const lines = body === undefined ? [] : Array.isArray(body) ? body : [body]
  const words = [title, ...lines, ...(points ?? []), note, action].filter(Boolean).join(" ")

  // Tell the offer log once that this nudge was seen.
  const shown = React.useRef(false)
  React.useEffect(() => {
    if (shown.current) return
    shown.current = true
    onShow?.()
  }, [onShow])

  React.useEffect(() => {
    if (__DEV__) guardOffer(words)
  }, [words])

  // Said no to: the nudge folds away (220 ms), then the screen is told, so
  // it can drop it and record the choice.
  const [height, setHeight] = React.useState(0)
  const [leaving, setLeaving] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const fold = React.useRef(new Animated.Value(1)).current
  const leave = (then: () => void) => {
    setMenu(false)
    if (still || !height) return then()
    setLeaving(true)
    Animated.timing(fold, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => then())
  }

  if (variant === "link") {
    const line = (
      <Pressable onPress={onAction} accessibilityRole="link" hitSlop={6} style={({ pressed }) => [styles.nudgeLink, pressed && styles.pressed]}>
        <Text style={styles.nudgeLinkText}>
          {title ? `${title} ` : ""}
          {!!action && <Text style={styles.nudgeLinkAction}>{action}</Text>}
        </Text>
      </Pressable>
    )
    if (!onDismiss) return line
    const dismiss = onDismiss
    // With a way to say no, the sentence stands alone and the action and
    // "Not now" sit under it, as on the card, so the no is as easy as the
    // yes (D.1.5). Said no to, it folds away like the card (220 ms).
    const quiet = (
      <View style={styles.nudgeLinkBlock} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        {!!title && <Text style={styles.nudgeLinkText}>{title}</Text>}
        <View style={styles.nudgeActions}>
          {!!action && onAction && (
            <TextAction onPress={onAction} chevron>
              {action}
            </TextAction>
          )}
          <TextAction tone="muted" onPress={() => leave(dismiss)}>
            {dismissLabel}
          </TextAction>
        </View>
      </View>
    )
    if (!leaving) return quiet
    return (
      <Animated.View style={{ height: fold.interpolate({ inputRange: [0, 1], outputRange: [0, height] }), opacity: fold, overflow: "hidden" }}>
        {quiet}
      </Animated.View>
    )
  }

  const inline = variant === "inline"
  const content = (
    <View style={inline ? styles.nudgeInline : styles.nudge} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {(!!title || lines.length > 0 || (!!art && !inline)) && (
        <View style={styles.nudgeTop}>
          <View style={styles.nudgeWords}>
            {!!title && (
              <Text style={inline || compact ? styles.nudgeTitleInline : styles.nudgeTitle} accessibilityRole="header">
                {title}
              </Text>
            )}
            {lines.map((l, i) => (
              <Text key={i} style={inline ? styles.nudgeBodyInline : styles.nudgeBody}>
                {l}
              </Text>
            ))}
          </View>
          {!!art && !inline && <Art name={art} size={Math.min(artSize, 64)} />}
        </View>
      )}
      {!!points?.length && (
        <View style={styles.nudgePoints}>
          {points.slice(0, 3).map((p) => (
            <View key={p} style={styles.nudgePoint}>
              <Check size={14} color={color.primary} weight="bold" />
              <Text style={styles.nudgePointText}>{p}</Text>
            </View>
          ))}
        </View>
      )}
      {!!note && <Text style={styles.nudgeNote}>{note}</Text>}
      {children}
      <View style={styles.nudgeActions}>
        {!!action &&
          onAction &&
          (inline ? (
            <SmallAction tone="outline" onPress={onAction}>
              {action}
            </SmallAction>
          ) : (
            <TextAction onPress={onAction} chevron>
              {action}
            </TextAction>
          ))}
        {onDismiss && (
          <TextAction tone="muted" onPress={() => leave(onDismiss)}>
            {dismissLabel}
          </TextAction>
        )}
        {onDecline && (
          <View style={styles.nudgeMoreWrap}>
            {menu && (
              <View style={styles.nudgeMenu}>
                <Pressable
                  onPress={() => leave(onDecline)}
                  accessibilityRole="menuitem"
                  style={({ pressed }) => [styles.nudgeMenuItem, pressed && styles.rowPressed]}
                >
                  <Text style={styles.nudgeMenuText}>Not for me</Text>
                </Pressable>
              </View>
            )}
            <Pressable
              onPress={() => setMenu((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="More options"
              accessibilityState={{ expanded: menu }}
              aria-expanded={menu}
              style={({ pressed }) => [styles.nudgeMore, pressed && styles.pressed]}
            >
              <DotsThree size={18} color={ink.secondary} weight="bold" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
  if (!leaving) return content
  return (
    <Animated.View style={{ height: fold.interpolate({ inputRange: [0, 1], outputRange: [0, height] }), opacity: fold, overflow: "hidden" }}>
      {content}
    </Animated.View>
  )
}

/** An empty block: one object, a title, one line only when it carries
    information, and one action ("Your results are steady", "17 markers in
    range", "See all results"). Children go under it, e.g. a full Button. */
export function EmptyState({
  art,
  artSize = 80,
  title,
  line,
  action,
  onAction,
  children,
}: {
  art?: ArtName
  artSize?: number
  title: string
  line?: string
  action?: string
  onAction?: () => void
  children?: React.ReactNode
}) {
  return (
    <View style={[styles.card, styles.empty]}>
      {!!art && <Art name={art} size={artSize} />}
      <Text style={styles.emptyTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!line && <Text style={styles.emptyLine}>{line}</Text>}
      {!!action && onAction && (
        <View style={styles.emptyAction}>
          <SmallAction onPress={onAction}>{action}</SmallAction>
        </View>
      )}
      {children}
    </View>
  )
}

/* -------------------------------------------------- questions, quotes -- */

/** This week's AI credit as a thin bar filled by the share used, in the
    orb's colours (green, orange past 60%, red past 90%), with the words
    beside it. Pass useAllowance()'s `line` for the words at 100% ("until
    Mon, Oct 12"). */
export function AllowanceMeter({ share, line }: { share: number; line?: string }) {
  const used = Math.max(0, Math.min(1, share))
  const words = line ?? (used >= 1 ? "No AI credit left this week" : `${Math.min(99, Math.round(used * 100))}% of this week's AI credit used`)
  return (
    <View style={styles.meter} accessible accessibilityRole="text" accessibilityLabel={words}>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${used * 100}%`, backgroundColor: creditTone(used) }]} />
      </View>
      <Text style={styles.meterText} maxFontSizeMultiplier={1.3}>
        {words}
      </Text>
    </View>
  )
}

/** "Save" for a question to bring to the next visit: a small pill that
    becomes a teal check and "Saved", writing the store's `questions`
    (lib/member.ts withQuestion, which never saves the same words twice)
    and confirming with a toast. Already saved, it shows "Saved". `label`
    names the pill where more words help: "Save for my next visit" at the
    end of an assistant answer or on a care gap. */
export function SaveQuestion({ text, about, forVisit, label = "Save" }: { text: string; about?: string; forVisit?: string; label?: string }) {
  const onboarding = useOnboarding()
  const same = (q: { text: string }) => q.text.trim().toLowerCase() === text.trim().toLowerCase()
  const saved = (onboarding.questions ?? []).some(same)
  if (saved)
    return (
      <View style={styles.saved} accessible accessibilityRole="text" accessibilityLabel="Saved for your next visit">
        <Check size={14} color={color.primary} weight="bold" />
        <Text style={styles.savedText}>Saved</Text>
      </View>
    )
  return (
    <SmallAction
      onPress={() => {
        onboarding.save({ questions: withQuestion(onboarding.questions, text, about, forVisit) }).catch(() => {})
        toast("Saved for your next visit")
      }}
      accessibilityLabel={`Save for your next visit: ${text}`}
    >
      {label}
    </SmallAction>
  )
}

/** The patient's own words in curly quotes, two lines at most, with where
    they came from under them: "From your conversation on Oct 1". */
export function Quote({ text, meta }: { text: string; meta?: string }) {
  const words = text.trim().replace(/^["“‘']+|["”’']+$/g, "")
  return (
    <View style={styles.quote}>
      <Text style={styles.quoteText} numberOfLines={2}>{`“${words}”`}</Text>
      {!!meta && <Text style={styles.quoteMeta}>{meta}</Text>}
    </View>
  )
}

/* ----------------------------------------------------------- results -- */

/** One marker in a list (the Record tab, Results, Progress, a batch of
    new results), from the client's reference (6 Oct 2026): the name with
    its status badge, under it the value and unit (an arrow when out of
    range or borderline; in range needs no mark, the badge says it), and
    on the right its last results as a small trend chart and a caret.
    `since` adds a quiet line under the value: the member's change since
    she started, or a new result's words. The whole row opens the marker;
    without `onPress` (setup, before a marker's page can open) it is a
    plain row with no caret. Feed it a classified marker from lib/trends.ts. */
export function ResultRow({ trend: t, since, onPress }: { trend: MarkerTrend; since?: string; onPress?: () => void }) {
  const unit = t.marker.unit
  const tone = t.status === "out" ? outOfRangeColor() : chart.borderline
  const Arrow = t.side === "below" ? ArrowDownRight : ArrowUpRight
  // Out of range says which side ("Above target"), as the client's reference does.
  // A size with no range says stable, growing or growing fast.
  const status = isGrowth(t.marker) ? t.statusWord : t.status === "out" ? (t.side === "below" ? "Below target" : "Above target") : LEVEL_WORD[t.status]
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[t.spoken, since].filter(Boolean).join(" ")}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
    >
      <View style={styles.resultBody}>
        <Text style={styles.resultNameText} numberOfLines={2}>
          {t.marker.name}
        </Text>
        {t.latest ? (
          <View style={styles.resultValueLine}>
            <Text style={styles.resultValue}>
              {t.value}
              {!!unit && <Text style={styles.resultUnit}>{`${unit === "%" ? "" : " "}${unit}`}</Text>}
            </Text>
            {t.status !== "in" && (
              <View style={styles.resultArrow}>
                <Arrow size={16} color={tone} weight="bold" />
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.rowMeta}>No results</Text>
        )}
        {!!since && <Text style={styles.resultSince}>{since}</Text>}
      </View>
      {t.latest && <RecentDots trend={t} plain style={styles.resultBar} alert={t.status === "out"} />}
      {t.latest && (
        <View style={styles.resultStatus}>
          <Tag tone={LEVEL_TONE[t.status]}>{status}</Tag>
          <Text style={styles.resultDate} numberOfLines={1}>
            {monthYear(t.latest.t)}
          </Text>
        </View>
      )}
      {onPress && <CaretRight size={16} color={card.chevron} weight="bold" />}
    </Pressable>
  )
}

/* ---------------------------------------------------------- choosers -- */

/** Frontline's segmented control: a grey track, the chosen view white
    with a soft lift. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  scroll = false,
  snug = false,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Many tabs: the track scrolls sideways, to the screen's edges. */
  scroll?: boolean
  /** Short words in equal cells (a meal's four slots): the chip's text size
      and a narrow inset, so every label fits on one line. */
  snug?: boolean
}) {
  const track = (
    <View style={styles.tabs} accessibilityRole="tablist">
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            style={[styles.tab, scroll && styles.tabScroll, snug && styles.tabSnug, on && styles.tabOn, i === options.length - 1 && styles.tabLast]}
          >
            <Text style={[styles.tabText, snug && styles.tabTextSnug, on && styles.tabTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
  if (!scroll) return track
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBleed} contentContainerStyle={styles.tabsScroll}>
      {track}
    </ScrollView>
  )
}

/** Frontline's filter chip in Inlay teal: a white pill with a hairline,
    teal edged on its tint with a check once chosen. On its own it toggles
    (a checkbox, for picking several); ChipRow sets `radio` for one choice
    of many. Onboarding keeps flow's Chip as it is; the signed-in screens
    use this one. */
export function Chip({ label, selected, onPress, radio, tick = true }: { label: string; selected: boolean; onPress: () => void; radio?: boolean; tick?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.chipPressed]}
    >
      {selected && tick && <Check size={14} color={color.primary} weight="bold" />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

/** One answer among a ChipRow's chips. */
export type Choice<T extends string> = { value: T; label: string }

/** Filter chips in a row that scrolls sideways, to the screen's edges. One
    is chosen at a time, so each announces itself as a radio button in a
    group, named by `label` (the question) when given. `wrap` keeps every
    chip in view inside a card ("Which dose do you take?"): the chips wrap
    onto a second line in place, with no sideways scroll and no bleed.
    Nothing is chosen while `value` is unset. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  wrap,
  label,
  tick,
}: {
  options: Choice<T>[]
  value?: T
  onChange: (value: T) => void
  wrap?: boolean
  label?: string
  /** `false` leaves the check off the chosen chip (the fill and edge still mark it). */
  tick?: boolean
}) {
  const chips = options.map((o) => <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} radio tick={tick} />)
  if (wrap)
    return (
      <View style={styles.chipsWrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {chips}
      </View>
    )
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsBleed}
      contentContainerStyle={styles.chips}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {chips}
    </ScrollView>
  )
}

/** A label and value row inside a card, the label muted. A long value
    wraps within 60% of the row and never squeezes a short label ("Seen
    by"); a long label wraps beside a short value ("Where it came from").
    `action` sits on the right after the value, or in its place: a text
    button ("Change") or a pill ("Add a card"), the row then 44 tall with
    the action centred. `tag` follows the value: "Estimated". */
export function KeyValue({
  label,
  value,
  action,
  tag,
  last,
}: {
  label: string
  value?: string
  action?: React.ReactNode
  tag?: { tone: Tone; label: string }
  last?: boolean
}) {
  const side = !!action || !!tag
  return (
    <View style={[styles.kv, side && styles.kvSide, !last && styles.rule]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {side ? (
        <View style={styles.kvRight}>
          {!!value && <Text style={styles.kvValueBeside}>{value}</Text>}
          {tag && <Tag tone={tag.tone}>{tag.label}</Tag>}
          {action}
        </View>
      ) : (
        !!value && <Text style={styles.kvValue}>{value}</Text>
      )}
    </View>
  )
}

/* ------------------------------------------------------ check lines -- */

/** One ticked line in a list: a teal check on its tint and a sentence ("No
    charge until your plan is approved", a change in a plan's new
    version). `soon` adds the muted "Coming soon" tag after the words;
    `excluded` is something not included, a muted minus in place of the
    check and the words in the label grey ("Not included: Medicines"). */
export function CheckLine({ children, soon, excluded }: { children: string; soon?: boolean; excluded?: boolean }) {
  return (
    <View
      style={styles.checkLine}
      accessible
      accessibilityLabel={excluded ? `Not included: ${children}` : soon ? `${children}, coming soon` : children}
    >
      <View style={[styles.checkMark, excluded && styles.checkMarkOff]}>
        {excluded ? <Minus size={14} color={ink.secondary} weight="bold" /> : <Check size={14} color={color.primary} weight="bold" />}
      </View>
      <View style={styles.checkWords}>
        <Text style={[styles.checkText, excluded && styles.checkTextOff]}>{holdNumbers(children)}</Text>
        {soon && <Tag tone="muted">Coming soon</Tag>}
      </View>
    </View>
  )
}

/** Lines of a list, evenly apart. A line can be a plain sentence, or one
    with `soon` or `excluded`. */
export function CheckLines({ lines }: { lines: readonly (string | { text: string; soon?: boolean; excluded?: boolean })[] }) {
  return (
    <View style={styles.checkLines}>
      {lines.map((l) => {
        const line = typeof l === "string" ? { text: l } : l
        return (
          <CheckLine key={line.text} soon={line.soon} excluded={line.excluded}>
            {line.text}
          </CheckLine>
        )
      })}
    </View>
  )
}

/** A number stays on the line of the word it counts ("every 3 months",
    "2,300 mg"), however the sentence wraps. */
const holdNumbers = (text: string) => text.replace(/(\d) (?=[A-Za-z])/g, "$1\u00A0")

/** A tick a patient sets herself (the walk, a weigh in done): a 24 pt ring
    in the resting mark grey, filled green with a white check once done.
    Home and Today's exercise draw the same one. */
export function TickCircle({ done }: { done: boolean }) {
  return <View style={[styles.tick, done && styles.tickDone]}>{done && <Check size={13} color={color.onPrimary} weight="bold" />}</View>
}

/* --------------------------------------------------------- entrances -- */

/** A home section's entrance (C.0.7): it fades in and rises 8 pt over 280
    ms, 40 ms after the one before it (`at`, at most the sixth), once a
    session (`id` is its key), and not at all under Reduce Motion. */
export function Rise({ at, id, children }: { at: number; id: string; children: React.ReactNode }) {
  const t = useEntrance(id, { delay: Math.min(at, 5) * 40, duration: 280 })
  const rise = t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
  return <Animated.View style={{ opacity: t, transform: [{ translateY: rise }] }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  // Figma "Hol" (5 Oct 2026): white at 60% on the page gradient, radius 8,
  // 12 inside, the softest lift; no edge.
  card: {
    backgroundColor: card.fill,
    borderRadius: CARD_RADIUS,
    padding: space.card,
    boxShadow: card.shadow,
  },
  inset: { backgroundColor: color.background, borderRadius: CARD_RADIUS },
  group: { paddingVertical: 0, paddingHorizontal: space.rowX },
  groupInset: { paddingHorizontal: space.compact },
  rule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  tile: { alignItems: "center", justifyContent: "center" },

  block: { gap: space.item },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, minHeight: 20 },
  headingText: { flexShrink: 1, ...type.sectionLabel },
  headingTitle: { flexShrink: 1, ...type.section },
  headingRight: { flexDirection: "row", alignItems: "center", gap: space.item },
  seeAllLink: { flexDirection: "row", alignItems: "center", gap: space.inline },
  seeAllLinkText: { ...type.seeAll },

  // Frontline's small badge: 2 by 8 inside, a faint edge in its hue.
  // Figma's badge: 10 medium, 8 at the sides and 2 above and below.
  tag: { alignSelf: "flex-start", borderRadius: 16, borderWidth: 1, paddingHorizontal: space.inline, paddingVertical: space.line },
  tagText: { ...type.tag },
  // Frontline's status chip: white, an outline, the mark 6 from its word.
  // Figma's dot badge: white, a faint edge, the mark 6 from its word.
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    alignSelf: "flex-start",
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: "rgba(80, 80, 80, 0.08)",
    borderRadius: 16,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: space.stack,
  },
  statusBare: { alignSelf: "auto", backgroundColor: "transparent", borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 },
  statusText: { ...type.captionStrong, color: ink.detail },
  // A check in a 12 pt circle: "Results in".
  dotCheck: { width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },

  // Flat tinted bar, no edge: bare icon, title over message, close on the right.
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  bannerIcon: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  bannerClose: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  bannerLive: { position: "absolute", top: -4, right: -4, padding: 2, borderRadius: 6, backgroundColor: color.background },
  bannerBody: { flex: 1, gap: space.stack },
  bannerTitle: { ...type.title },
  bannerMeta: { ...type.label },
  // Flat: a white pill with the banner's own edge, never a shadow.
  bannerAction: { backgroundColor: color.background, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, justifyContent: "center", boxShadow: card.shadowXs },
  bannerActionText: { ...type.action },

  hero: { borderRadius: CARD_RADIUS, overflow: "hidden", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 10, backgroundColor: "#3B8790" },
  heroTop: { position: "absolute", top: 0, left: 0 },
  heroBottom: { position: "absolute", bottom: 0, right: 0 },

  track: { height: 8, borderRadius: 4, backgroundColor: MARK.track, overflow: "hidden" },
  trackHero: { height: 6, borderRadius: 3, backgroundColor: "rgba(255, 255, 255, 0.25)" },
  fill: { height: 8, borderRadius: 4 },
  fillHero: { height: 6, borderRadius: 3 },

  // Figma's reminders: an 18 mark, done filled teal with a check, still to
  // come a 1.6 pt grey ring, late a clay ring; a 2 pt grey rail between.
  step: { flexDirection: "row", gap: space.lead },
  rail: { alignItems: "center", width: 18 },
  node: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.6, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: color.primary, borderColor: color.primary },
  nodeNow: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.background },
  nodeNowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  // Something late needs attention, in clay, never red.
  nodeAlert: { borderColor: chart.borderline, borderWidth: 2 },
  line: { flex: 1, width: 2, minHeight: 12, backgroundColor: hairline.outline },
  lineDone: { backgroundColor: color.primary },
  lineNone: { backgroundColor: "transparent" },
  lineStub: { width: 2, height: STEP_BAND, backgroundColor: hairline.outline },
  // The dashes fill the rail's height without setting it: they sit
  // absolutely in a clipped track, so the row keeps its text's height.
  dashTrack: { flex: 1, minHeight: 12, width: 2, overflow: "hidden" },
  dashes: { position: "absolute", top: 3, left: 0, gap: 3 },
  dash: { width: 2, height: 4, borderRadius: 1, backgroundColor: hairline.outline },
  // The current step sits on a soft teal band, a little wider than the
  // steps; the rail reaches up through the band's top to meet the line.
  stepNow: { paddingTop: STEP_BAND },
  stepBand: { position: "absolute", top: 0, bottom: space.item, left: -STEP_BAND_X, right: -STEP_BAND_X, borderRadius: 12, backgroundColor: color.primaryTint },
  railNow: { marginTop: -STEP_BAND },
  stepBodyNow: { paddingBottom: STEP_BAND + space.item },
  stepBody: { flex: 1, paddingBottom: space.item, gap: space.stack },
  stepLabel: { ...type.chip },
  stepLater: { color: ink.secondary },
  stepDate: { ...type.label },

  // Figma's segmented control: cells side by side in a 6 radius frame,
  // split by hairlines; the chosen one on the teal tint.
  tabs: { flexDirection: "row", backgroundColor: "#FAFAFA", borderRadius: 6, borderWidth: 1, borderColor: "#E9E9EE", overflow: "hidden" },
  // Each tab is as wide as its label plus an equal share of the rest, so a
  // long label ("Since you started") keeps to one line in its 32 pt tab.
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: space.gutter, paddingVertical: space.inline, backgroundColor: "#FBFBFB", borderRightWidth: 1, borderRightColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  // Figma's order track: three lifted pills joined by short grey lines,
  // each date reached ticked in green at its corner.
  dateTrack: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackJoin: { width: 24, height: 1, backgroundColor: hairline.outline },
  trackPill: {
    flex: 1,
    alignItems: "center",
    gap: space.stack,
    paddingHorizontal: 10,
    paddingVertical: space.inline,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  trackBadge: { position: "absolute", top: -2.5, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: chart.inRange, alignItems: "center", justifyContent: "center" },
  trackBadgeLate: { backgroundColor: "#FFF9EF", borderWidth: 1, borderColor: chart.borderline },
  trackBadgeMark: { fontFamily: font.semibold, fontSize: 8, lineHeight: 9, color: chart.borderline },
  trackStep: { flex: 1, alignItems: "center", gap: space.line },
  trackRail: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginBottom: space.stack },
  trackLine: { flex: 1, height: 2, backgroundColor: hairline.edge },
  trackLineOn: { backgroundColor: color.primary },
  trackHidden: { opacity: 0 },
  trackDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: MARK.off, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  trackDotOn: { borderColor: color.primary, backgroundColor: color.primary },
  trackDotLate: { borderColor: chart.borderline },
  trackLabel: { ...type.metaStrong, color: ink.detail },
  trackDate: { ...type.caption, fontVariant: ["tabular-nums"] },
  trackDateOff: { color: ink.secondary },
  trackDateLate: { color: "#A95413" },
  // Frontline's segment: 16 either side of its word.
  tabScroll: { flexGrow: 0, flexShrink: 0, paddingHorizontal: 16 },
  // Scrolling tabs and chips bleed by onboarding's wider gutter: on a
  // signed-in page (space.gutter) and in a sheet alike they run to the
  // screen's edges, and the first one still lines up with the content.
  tabsScroll: { paddingHorizontal: gutter },
  tabSnug: { paddingHorizontal: 4 },
  tabTextSnug: { ...type.chip, color: ink.secondary },
  tabOn: { backgroundColor: color.primaryTint },
  tabLast: { borderRightWidth: 0 },
  tabText: { ...type.title, color: ink.secondary },
  tabTextOn: { color: color.primary },

  miniRail: { flexDirection: "row", alignItems: "center", height: 8, marginBottom: space.mark },
  miniLine: { flex: 1, height: 1.5, backgroundColor: hairline.edge },
  miniDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: MARK.off, backgroundColor: color.background },
  miniLabels: { flexDirection: "row" },
  miniStep: { flex: 1, alignItems: "center" },
  miniFirst: { alignItems: "flex-start" },
  miniLast: { alignItems: "flex-end" },
  miniLabel: { ...type.captionStrong },
  miniDate: { ...type.caption, fontVariant: ["tabular-nums"] },

  chipsBleed: { marginHorizontal: -gutter },
  chips: { gap: space.inline, paddingHorizontal: gutter },
  // Chips in a row, and a wrapped line under them, 8 apart (Frontline).
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  // Figma's choice chip: a white pill with a hairline, 12 regular; chosen,
  // the teal tint with its edge.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.stack,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  chipOn: { borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  chipPressed: { opacity: 0.85 },
  chipText: { ...type.label, color: ink.content },
  chipTextOn: { color: ink.primary },
  link: { ...type.link },
  meta: { ...type.meta },

  // The value is the row's fact (a due date, a place, a price), so it reads
  // as a row's title; its key reads as the line under one.
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.item, paddingVertical: space.rowY },
  // A row with an action is as tall as a plain one (a 20 pt value with a
  // row's room above and below), the action centred in it.
  kvSide: { alignItems: "center", minHeight: space.rowY * 2 + type.title.lineHeight, paddingVertical: (space.rowY * 2 + type.title.lineHeight - 32) / 2 },
  // The label wraps when it is long; the value keeps its width up to 60%
  // of the row, so a long value wraps there and never squeezes the label.
  // Figma's detail rows: the key 14 regular, the value 14 medium, both in
  // Grey/08.
  kvLabel: { ...type.body, flexShrink: 1 },
  kvValue: { flexShrink: 0, maxWidth: "60%", textAlign: "right", ...type.title, color: ink.detail },
  kvRight: { flexShrink: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.item },
  kvValueBeside: { flexShrink: 1, textAlign: "right", ...type.title, color: ink.detail },

  checkLines: { gap: space.mark },
  // The mark sits on the middle of the sentence's first line, however it
  // wraps.
  checkLine: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  checkMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: (type.body.lineHeight - 20) / 2,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarkOff: { backgroundColor: "#F2F4F7" },
  checkWords: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  checkText: { ...type.body, flexShrink: 1 },
  checkTextOff: { color: ink.secondary },

  // The ring is the kit's resting mark grey (a step not reached yet).
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: MARK.off, alignItems: "center", justifyContent: "center" },
  tickDone: { borderWidth: 0, backgroundColor: chart.inRange },

  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  // On the Hero's white panel the tile sits 10 from its words.
  rowInset: { gap: 10 },
  rowTop: { alignItems: "flex-start" },
  rowPressed: { opacity: 0.6 },
  rowBody: { flex: 1, gap: space.stack },
  rowTitle: { ...type.title },
  rowTitleMuted: { color: ink.tertiary },
  rowTitleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  rowTitleFill: { flex: 1 },
  // The title and its action side by side; the title's first line is
  // centred on the pill beside it.
  rowActionLine: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  rowTitleByAction: { paddingTop: (ACTION_HEIGHT - type.title.lineHeight) / 2 },
  rowMetaLine: { flexDirection: "row", alignItems: "center", gap: space.item },
  // The text button keeps its full target without making the line taller.
  rowMetaAction: { marginVertical: -(ACTION_HEIGHT - type.label.lineHeight) / 2 },
  rowMeta: { ...type.label },
  rowNote: { ...type.metaStrong, color: ink.primary },
  rowTrack: { marginTop: space.inline, marginBottom: space.line },
  rowSide: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: space.inline },
  rowDate: { ...type.label, fontVariant: ["tabular-nums"] },
  // Figma's date block: 32 wide on Primary/00, radius 6, as tall as the
  // row's words; the month 10 regular over the day 13 semibold.
  dateBlock: { width: 32, height: 40, alignSelf: "flex-start", borderRadius: 6, gap: space.line },
  dateWeekday: { ...type.caption, color: ink.detail },
  dateDay: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: ink.strong, fontVariant: ["tabular-nums"] },
  // The appointment card's larger block (AppointmentCard): 44 by 52, the
  // weekday 12 medium over the day 20 semibold.
  dateBlockLg: { width: 44, height: 52, borderRadius: 10 },
  dateWeekdayLg: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  dateDayLg: { fontSize: 20, lineHeight: 24 },

  seeAll: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.rowY },
  seeAllHero: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: space.line, minHeight: 24 },
  seeAllText: { ...type.link },

  stat: { flexGrow: 1, gap: space.inline, minHeight: 84 },
  // A door: about 99 wide on a phone, so "1,700 kcal" keeps to one line
  // (Frontline's raised tiles keep 10 inside).
  statHero: { flexGrow: 1, minHeight: 104, backgroundColor: color.background, borderRadius: CARD_RADIUS, padding: 10, gap: space.inline },
  statBare: { flexGrow: 1, gap: space.inline },
  // The number and its label sit at the bottom, so tiles in a row line up.
  statFoot: { marginTop: "auto", gap: space.line },
  // Bare tiles share one line inside a card: their numbers line up at the
  // top, whatever their labels take.
  statFootBare: { marginTop: 0 },
  statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", minHeight: 16 },
  statDone: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.ok, alignItems: "center", justifyContent: "center" },
  // Proportional figures: a stat is not a column (FINAL-SPEC C.0.2), and
  // they keep "1,700 kcal" on one line in a door.
  statValue: { ...type.stat },
  statUnit: { ...type.unit },
  statLabel: { ...type.label },
  statLabelHero: { ...type.title },
  statMeta: { ...type.meta },
  statRow: { flexDirection: "row", gap: space.inline },
  statRowDivided: { gap: 0 },
  // Equal widths whatever the numbers inside take.
  statCell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, flexDirection: "column" },
  statCellDivided: { borderLeftWidth: 0.8, borderLeftColor: hairline.rule, paddingLeft: space.item, marginLeft: space.item },

  // A wrapped line keeps its mark beside the first line.

  planLine: { gap: space.stack },
  planRow: { flexDirection: "row", alignItems: "center", gap: space.mark },
  planMark: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  planMarkWrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  planText: { flexShrink: 1, ...type.label },
  planStrong: { fontFamily: font.medium, color: ink.content },

  // Figma's small action: the teal tint, its edge, radius 8, 10 by 6.
  small: { minHeight: 30, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", boxShadow: card.shadowXs },
  smallTint: { backgroundColor: color.primaryTint, borderColor: color.primaryEdge },
  smallOutline: { backgroundColor: color.primaryTint, borderColor: color.primaryEdge },
  smallHero: { backgroundColor: color.background, borderColor: color.background },
  smallText: { ...type.action },
  textAction: { flexDirection: "row", alignItems: "center", gap: space.line, minHeight: 32 },
  textActionText: { ...type.link },

  // The offer is the quietest card on the page: no shadow, the kit's edge.
  nudge: { backgroundColor: card.fill, borderRadius: CARD_RADIUS, padding: space.card, gap: space.item, boxShadow: card.shadow },
  nudgeInline: { gap: space.item, marginTop: space.stack, paddingTop: space.item, borderTopWidth: 1, borderTopColor: "#E3E3E0" },
  nudgeTop: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  nudgeWords: { flex: 1, gap: space.stack },
  nudgeTitle: { ...type.section },
  nudgeBody: { ...type.body },
  nudgeTitleInline: { ...type.title },
  nudgeBodyInline: { ...type.body },
  nudgePoints: { gap: space.mark },
  nudgePoint: { flexDirection: "row", alignItems: "flex-start", gap: space.mark },
  nudgePointText: { flex: 1, ...type.label },
  nudgeNote: { ...type.meta },
  // Two words side by side with no container need more room than a pair
  // of buttons.
  nudgeActions: { flexDirection: "row", alignItems: "center", gap: 20, zIndex: 2 },
  nudgeMoreWrap: { marginLeft: "auto" },
  nudgeMore: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nudgeMenu: {
    position: "absolute",
    right: 0,
    bottom: 38,
    minWidth: 140,
    paddingVertical: space.stack,
    // A Hol card, kept opaque so the offer's words do not show through.
    borderRadius: CARD_RADIUS,
    backgroundColor: color.background,
    boxShadow: card.shadow,
    zIndex: 3,
  },
  nudgeMenuItem: { paddingHorizontal: 12, paddingVertical: 10 },
  nudgeMenuText: { ...type.title },
  nudgeLink: { alignSelf: "flex-start", paddingVertical: space.stack },
  nudgeLinkBlock: { gap: space.stack },
  nudgeLinkText: { ...type.label },
  nudgeLinkAction: { fontFamily: font.medium, color: ink.primary },

  empty: { alignItems: "center", gap: space.inline, paddingHorizontal: 20, paddingVertical: 24 },
  emptyTitle: { ...type.section, textAlign: "center" },
  emptyLine: { ...type.body, color: ink.secondary, textAlign: "center" },
  emptyAction: { marginTop: space.stack },

  meter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: space.inline, rowGap: space.stack },
  meterTrack: { width: 64, height: 6, borderRadius: 3, backgroundColor: "#DDE3EA", overflow: "hidden" },
  meterFill: { height: 6, borderRadius: 3 },
  meterText: { ...type.metaStrong },
  saved: { flexDirection: "row", alignItems: "center", gap: space.stack, height: 32, alignSelf: "flex-start" },
  savedText: { ...type.action },
  quote: { gap: space.stack },
  quoteText: { ...type.body },
  quoteMeta: { ...type.meta },

  /* The result row: rows 14 above and below, the trend 12 from the
     words. Three levels: the value (20 semibold, darkest), the name (14
     medium), the unit (12 regular, grey). The value's own 26 line keeps
     the air between the lines, so only 2 is added. */
  resultRow: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: 14 },
  resultBody: { flex: 1, minWidth: 0 },
  resultNameText: { ...type.title, color: ink.content, flexShrink: 1 },
  resultValueLine: { flexDirection: "row", alignItems: "baseline", gap: space.mark, marginTop: space.line },
  resultValue: { ...type.hero, lineHeight: 26, color: ink.strong, flexShrink: 1, fontVariant: ["tabular-nums"] },
  resultUnit: { ...type.unit, color: ink.secondary, fontVariant: [] },
  // The arrow sits on the value's middle, not its baseline.
  resultArrow: { alignSelf: "center" },
  resultSince: { ...type.meta, color: ink.tertiary, marginTop: space.line },
  resultBar: { width: 72 },
  // The status badge with the latest result's month under it, on the right.
  resultStatus: { alignItems: "flex-start", gap: space.stack, minWidth: 84 },
  resultDate: { ...type.meta, color: ink.tertiary },
})
