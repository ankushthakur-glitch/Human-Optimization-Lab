import ArrowDownRight01Icon from "@hugeicons/core-free-icons/ArrowDownRight01Icon"
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { Art, type ArtName } from "@/components/art"
import { RangeBar, useEntrance } from "@/components/charts"
import { useReducedMotion } from "@/components/chat"
import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"
import { IconCheck, IconChevronRight, IconMinus, IconShield } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { toast } from "@/components/toast"
import { Button } from "@/components/ui"
import { useAllowance } from "@/lib/allowance"
import { withQuestion } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import type { OrderState } from "@/lib/record"
import { cardRadius, chart, color, font, gutter, hairline, ink, outOfRangeColor, space, type } from "@/lib/theme"
import { directionWords, type Trend as MarkerTrend } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/* The signed-in record's pieces, built to the Frontline patient app's
   design system (Figma, "Patient Mob App" and its component sheet), in
   Inlay teal, made rounder (catalog V-10): white cards with a 1px #EAECF0
   edge at radius 20, icon tiles at 36 and radius 12, tint badges for what
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

export type Tone = "high" | "low" | "ok" | "primary" | "muted"

/* Frontline's badge tints: ink on a pale fill with a faint edge. A tag is
   words, and red is never words (FINAL-SPEC C.0.3), so "high" draws the
   same calm clay as "low": "Overdue" and "Records differ" need attention,
   not alarm (V-07). */
const CLAY_TAG = { ink: chart.borderline, fill: "#FFF8F1", edge: "#FCE1BE" }
const BADGE: Record<Tone, { ink: string; fill: string; edge: string }> = {
  high: CLAY_TAG,
  low: CLAY_TAG,
  ok: { ink: ink.good, fill: "#ECFDF3", edge: "#ABEFC6" },
  // Words on the teal tint take the text teal, as Frontline's badges take
  // the darker step of their hue.
  primary: { ink: ink.primary, fill: color.primaryTint, edge: color.primaryHalo },
  muted: { ink: ink.secondary, fill: "#F2F4F7", edge: hairline.edge },
}

/* A status mark's colour: the chart kit's out of range, borderline and in
   range tokens (catalog 7.3), so a dot means one thing everywhere. Out of
   range is read at render, so the red or clay swap (Q-06, /demo/kit) moves
   badges and charts together. */
const markOf = (t: Tone) =>
  t === "high" ? outOfRangeColor() : t === "low" ? chart.borderline : t === "ok" ? chart.inRange : t === "primary" ? color.primary : MARK.faint

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

const LEVEL_TONE: Record<Level, Tone> = { out: "high", borderline: "low", in: "ok" }

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

/** At most three rows in a home section; the rest sit behind "See all"
    (catalog F-10). */
export const ROW_LIMIT = 3

/** How each state of a test ordered reads: neutral before it is due, clay
    once it is due or overdue (never red), teal booked, green done
    (FINAL-SPEC C.0.4). */
export const ORDER_TONE: Record<OrderState, Tone> = {
  overdue: "low",
  due: "low",
  "due-soon": "muted",
  planned: "muted",
  booked: "primary",
  done: "ok",
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

/* Rows on the Hero's white panel take a smaller tile (32) and a 10 gap
   inside a panel 12 in from its edges, so the panel stays compact and a
   row's words keep to one line each (FINAL-SPEC C.1.2): the Hero's own 16
   already frames the panel. */
const InsetContext = React.createContext(false)

/** Rows on one white card, split by hairlines. `inset` drops the edge and
    the shadow, for rows on a white panel inside the Hero (radius 14, 12
    inside, a 10 gap, tiles 32). */
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

/** An icon on a tile tinted by what it stands for: 36 at radius 12 (the
    radius scales with a smaller tile). */
export function Tile({ hue = "teal", size = 36, children }: { hue?: Hue; size?: number; children: React.ReactNode }) {
  return <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size / 3), backgroundColor: HUE[hue].tint }]}>{children}</View>
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
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>{seeAllLabel(count)}</Text>
          </Pressable>
        )}
        {link && (
          <Pressable onPress={link.onPress} hitSlop={8} accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.link}>{link.label}</Text>
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
        <IconCheck size={8} color={color.onPrimary} strokeWidth={3} />
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
export function Status({ level, tone, mark, children, bare }: { level?: Level; tone?: Tone; mark?: Mark; children?: string; bare?: boolean }) {
  const word = patientWord(children ?? (level ? LEVEL_WORD[level] : ""))
  return (
    <View style={[styles.status, bare && styles.statusBare]}>
      <Dot level={level} tone={tone} mark={mark} />
      <Text style={styles.statusText}>{word}</Text>
    </View>
  )
}

const ARROW: Record<Trend, IconSvgObject> = { up: ArrowUpRight01Icon, down: ArrowDownRight01Icon, steady: ArrowRight02Icon }

/** Which way a marker is going: the status badge with a neutral grey
    arrow in place of the dot ("Trending up", "Trending down", "Steady").
    Pass a meaning word as children instead ("Improving", "Moving away from
    your range"); with no trend it reads "Not enough results yet". Never in
    a status colour: the level's dot is the one colour beside it. */
export function TrendPill({ trend, children, bare }: { trend?: Trend; children?: string; bare?: boolean }) {
  return (
    <View style={[styles.status, bare && styles.statusBare]}>
      {trend && <HugeIcon icon={ARROW[trend]} size={12} color={ink.detail} strokeWidth={2} />}
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
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  action?: string
  onPress?: () => void
  hue?: Hue
  live?: boolean
}) {
  const h = HUE[hue]
  const body = (
    <>
      <View style={[styles.bannerTile, { borderColor: h.edge }]}>
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
        onPress && <IconChevronRight size={16} color={ink.tertiary} />
      )}
    </>
  )
  const look = [styles.banner, { backgroundColor: h.tint, borderColor: h.edge }]
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
  if (icon === "shield") return <IconShield size={18} color={tone} />
  if (icon === "check") return <IconCheck size={18} color={tone} strokeWidth={2.2} />
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
    bottom right corners. */
export function Hero({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
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
            <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2D6F7B" />
              <Stop offset="1" stopColor="#4FA3A5" />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${gradient})`} />
        </Svg>
      )}
      <Svg style={styles.heroTop} width={110} height={90} viewBox="0 0 110 90">
        <Circle cx={78} cy={11} r={76} fill="#000" fillOpacity={0.1} />
      </Svg>
      <Svg style={styles.heroBottom} width={145} height={70} viewBox="0 0 145 70">
        <Circle cx={69} cy={70} r={65} fill="#FFF" fillOpacity={0.1} />
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
    <View style={styles.dateTrack}>
      {dates.map((d, i) => {
        const on = !!d.date
        const next = i === reached
        return (
          <View key={d.label} style={styles.trackStep}>
            <View style={styles.trackRail}>
              <View style={[styles.trackLine, i === 0 && styles.trackHidden, on && styles.trackLineOn]} />
              <View style={[styles.trackDot, on && styles.trackDotOn, next && late && styles.trackDotLate]}>
                {on && <IconCheck size={8} color={color.onPrimary} strokeWidth={3} />}
              </View>
              <View style={[styles.trackLine, i === dates.length - 1 && styles.trackHidden, i < reached - 1 && styles.trackLineOn]} />
            </View>
            <Text style={styles.trackLabel}>{d.label}</Text>
            <Text style={[styles.trackDate, !on && styles.trackDateOff, next && late && styles.trackDateLate]}>{d.date ?? "Not yet"}</Text>
          </View>
        )
      })}
    </View>
  )
}

/** Dated steps down a line: each done one ticked with its date, the
    current one ringed, the rest still to come. */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.node, s.state === "done" && styles.nodeDone, s.state === "now" && styles.nodeNow, s.state === "alert" && styles.nodeAlert]}>
              {s.state === "done" && <IconCheck size={11} color={color.onPrimary} strokeWidth={2.6} />}
            </View>
            {i < steps.length - 1 && <View style={[styles.line, s.state === "done" && styles.lineDone]} />}
          </View>
          <View style={styles.stepBody}>
            <Text style={[styles.stepLabel, s.state === "next" && styles.stepLater]}>{s.label}</Text>
            {!!s.date && <Text style={styles.stepDate}>{s.date}</Text>}
          </View>
        </View>
      ))}
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
export function DateBlock({ date, hue = "teal" }: { date: DateLike | { weekday: string; day: string | number }; hue?: Hue }) {
  const given = typeof date === "string" || date instanceof Date ? undefined : date
  const day = given ? undefined : dayOfRow(date as DateLike)
  const near = !!day && Math.abs(daysFrom(toDay(new Date())!, day)) <= 6
  const top = day ? (near ? WEEKDAYS[day.getDay()] : MONTHS[day.getMonth()]) : (given?.weekday ?? "")
  const num = day ? day.getDate() : (given?.day ?? "")
  return (
    <View style={[styles.tile, styles.dateBlock, { backgroundColor: HUE[hue].tint }]}>
      <Text style={[styles.dateWeekday, { color: HUE[hue].ink }]}>{top}</Text>
      <Text style={styles.dateDay}>{num}</Text>
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
    <Tile hue={hue} size={inset ? 32 : 36}>
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
          <IconChevronRight size={16} color={ink.tertiary} />
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
      <IconChevronRight size={16} color={tone} />
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
              <IconCheck size={10} color={color.onPrimary} strokeWidth={3} />
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

/** The home's one summary sentence: "2 things need you this week", or
    "You're all caught up" at zero. */
export function summaryText(count: number, when = "this week") {
  if (count <= 0) return "You're all caught up"
  return `${count} ${count === 1 ? "thing needs" : "things need"} you ${when}`
}

/** The one summary line under the greeting: a teal dot and how many things
    need the patient, or a green check and "You're all caught up". Pass
    `children` for other words, and `done` to show the check with them. */
export function SummaryLine({
  count = 0,
  when = "this week",
  children,
  done,
  onPress,
}: {
  count?: number
  when?: string
  children?: string
  done?: boolean
  onPress?: () => void
}) {
  const clear = done ?? (!children && count <= 0)
  const body = (
    <>
      {clear ? (
        <View style={styles.summaryCheck}>
          <IconCheck size={10} color={color.onPrimary} strokeWidth={3} />
        </View>
      ) : (
        <View style={styles.summaryDot} />
      )}
      <Text style={styles.summaryText} numberOfLines={2}>
        {children ?? summaryText(count, when)}
      </Text>
      {onPress && (
        <View style={styles.summaryChevron}>
          <IconChevronRight size={14} color={ink.tertiary} />
        </View>
      )}
    </>
  )
  if (!onPress) return <View style={styles.summary}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
      {body}
    </Pressable>
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
            <IconCheck size={9} color={color.onPrimary} strokeWidth={3} />
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
      {chevron && <IconChevronRight size={14} color={fg} />}
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
      visit" button on the free questions limit card. */
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
              <Text style={inline ? styles.nudgeTitleInline : styles.nudgeTitle} accessibilityRole="header">
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
              <IconCheck size={14} color={color.primary} strokeWidth={2.2} />
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
              <HugeIcon icon={MoreHorizontalIcon} size={18} color={ink.secondary} />
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

/** The free questions left this month, as one line in meta ("6 of 8 free
    questions left this month", or at the cap "No free questions left until
    Nov 1"), from useAllowance(). A member has no count, so it draws
    nothing. On the free home's ask row and above the marker page's "Ask
    about this result". */
export function AllowanceLine({ align = "left" }: { align?: "left" | "center" }) {
  const a = useAllowance()
  if (a.member || !a.line) return null
  return (
    <Text style={[styles.allowanceLine, align === "center" && styles.allowanceCenter]} maxFontSizeMultiplier={1.3}>
      {a.line}
    </Text>
  )
}

/** The free questions as eight 6 pt dots, teal while a question is left and
    grey once used, with the words beside them: the assistant's header. Pass
    useAllowance()'s `line` for the words at the cap ("until Nov 1"). */
export function AllowanceMeter({ left, total, line }: { left: number; total: number; line?: string }) {
  const words =
    line ??
    (left <= 0 ? "No free questions left this month" : left === 1 ? "1 free question left this month" : `${left} of ${total} free questions left this month`)
  return (
    <View style={styles.meter} accessible accessibilityRole="text" accessibilityLabel={words}>
      <View style={styles.meterDots}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.meterDot, i < left && styles.meterDotLeft]} />
        ))}
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
        <IconCheck size={14} color={color.primary} strokeWidth={2.4} />
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

/* A result's day in a row: "Aug 14" this year, "Aug 14, 2025" before it,
   or the record's own "Aug 2026" when it has no day. */
function resultDay(p: { date: string; at?: string; t: number }) {
  if (!p.at) return p.date
  const d = new Date(p.t)
  const day = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return d.getFullYear() === new Date().getFullYear() ? day : `${day}, ${d.getFullYear()}`
}

/** One marker in a list (the Record tab, Results, Progress): a status dot
    only when out of range or borderline, the name, the direction words and
    the short date ("Trending up, Aug 14"; or the member's `since` line,
    "Down 0.1 since you started in May"), and on the right the value with
    its unit over a compact range bar. The whole row opens the marker. Feed
    it a classified marker from lib/trends.ts. */
export function ResultRow({ trend: t, since, onPress }: { trend: MarkerTrend; since?: string; onPress: () => void }) {
  const level: Level | undefined = t.status === "out" || t.status === "borderline" ? t.status : undefined
  // The direction ("Trending up", "One result so far") and the day ("Aug
  // 14") are each held whole, so a narrow phone wraps after a comma:
  // "Trending up, / improving, Aug 14", "One result so far, / Aug 14".
  const day = t.latest ? resultDay(t.latest).replace(/ /g, "\u00A0") : undefined
  const words = directionWords(t).replace(/^(?:Trending (?:up|down)|One result so far)/, (w) => w.replace(/ /g, "\u00A0"))
  const meta = since ?? (day ? `${words}, ${day}` : words)
  // A number stays with its word ("Vitamin D, / 25 hydroxy"), and a long
  // name takes a third line on a narrow phone rather than being cut short.
  const name = t.marker.name.replace(/(\d) (?=[a-z])/g, "$1\u00A0")
  const unit = t.marker.unit
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[t.spoken, since].filter(Boolean).join(" ")}
      accessibilityHint="Opens details"
      style={({ pressed }) => [styles.row, styles.resultRow, pressed && styles.rowPressed]}
    >
      <View style={styles.resultMark}>{level && <Dot level={level} />}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={3}>
          {name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      {t.latest ? (
        <View style={styles.resultSide}>
          <Text style={styles.resultRowValue} numberOfLines={1}>
            {t.value}
            {!!unit && <Text style={styles.resultRowUnit}>{`${unit === "%" ? "" : " "}${unit}`}</Text>}
          </Text>
          <RangeBar compact value={t.latest.value} low={t.band.low} high={t.band.high} status={t.status} unit={unit} style={styles.resultBar} />
        </View>
      ) : (
        <Text style={styles.rowMeta}>No results</Text>
      )}
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
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Many tabs: the track scrolls sideways, to the screen's edges. */
  scroll?: boolean
}) {
  const track = (
    <View style={styles.tabs} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            style={[styles.tab, scroll && styles.tabScroll, on && styles.tabOn]}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
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
export function Chip({ label, selected, onPress, radio }: { label: string; selected: boolean; onPress: () => void; radio?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.chipPressed]}
    >
      {selected && <IconCheck size={14} color={color.primary} />}
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
}: {
  options: Choice<T>[]
  value?: T
  onChange: (value: T) => void
  wrap?: boolean
  label?: string
}) {
  const chips = options.map((o) => <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} radio />)
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

/** A section's link, e.g. "See all". */
export function SectionLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
      <Text style={styles.link}>{children}</Text>
    </Pressable>
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
        {excluded ? <IconMinus size={14} color={ink.secondary} /> : <IconCheck size={14} color={color.primary} strokeWidth={2.2} />}
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
  return <View style={[styles.tick, done && styles.tickDone]}>{done && <IconCheck size={13} color={color.onPrimary} strokeWidth={2.6} />}</View>
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

/* ----------------------------------------------------- not connected -- */

/** The one state for a patient who never connected her records, on every
    tab (C.28): the neutral document object, "Your records aren't
    connected", one line, and the full width "Connect my records". To do
    passes its own line. */
export function NotConnected({ line = "Nothing has been collected. Connect when you're ready and we'll bring your history\u00A0together.", onConnect }: { line?: string; onConnect: () => void }) {
  return (
    <EmptyState art="document" artSize={112} title="Your records aren't connected" line={line}>
      <View style={styles.emptyButton}>
        <Button onPress={onConnect}>Connect my records</Button>
      </View>
    </EmptyState>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  // The one card after onboarding (FINAL-SPEC C.0.1): white, a hairline,
  // radius 20, 16 inside, the faintest lift.
  card: {
    backgroundColor: color.background,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: hairline.edge,
    padding: space.card,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
  },
  inset: { backgroundColor: color.background, borderRadius: 14 },
  group: { paddingVertical: 0, paddingHorizontal: space.rowX },
  groupInset: { paddingHorizontal: space.compact },
  rule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  tile: { alignItems: "center", justifyContent: "center" },

  block: { gap: space.item },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, minHeight: 20 },
  headingText: { flexShrink: 1, ...type.sectionLabel },
  headingTitle: { flexShrink: 1, ...type.section },
  headingRight: { flexDirection: "row", alignItems: "center", gap: space.item },

  // Frontline's small badge: 2 by 8 inside, a faint edge in its hue.
  tag: { alignSelf: "flex-start", borderRadius: 16, borderWidth: 1, paddingHorizontal: space.inline, paddingVertical: space.line },
  tagText: { ...type.tag },
  // Frontline's status chip: white, an outline, the mark 6 from its word.
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    alignSelf: "flex-start",
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.outline,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: space.line,
  },
  statusBare: { alignSelf: "auto", backgroundColor: "transparent", borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 },
  statusText: { ...type.metaStrong },
  // A check in a 12 pt circle: "Results in".
  dotCheck: { width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },

  banner: { flexDirection: "row", alignItems: "center", gap: space.lead, borderRadius: CARD_RADIUS, borderWidth: 1, padding: space.compact },
  bannerTile: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  bannerLive: { position: "absolute", top: -4, right: -4, padding: 2, borderRadius: 6, backgroundColor: color.background },
  bannerBody: { flex: 1, gap: space.line },
  bannerTitle: { ...type.title },
  bannerMeta: { ...type.label },
  // Flat: a white pill with the banner's own edge, never a shadow.
  bannerAction: { backgroundColor: color.background, borderRadius: 16, borderWidth: 1, height: 32, paddingHorizontal: 12, justifyContent: "center" },
  bannerActionText: { ...type.action },

  hero: { borderRadius: CARD_RADIUS, overflow: "hidden", padding: space.card, gap: space.item, backgroundColor: "#3B8790" },
  heroTop: { position: "absolute", top: 0, right: 0 },
  heroBottom: { position: "absolute", bottom: 0, right: 0 },

  track: { height: 8, borderRadius: 4, backgroundColor: MARK.track, overflow: "hidden" },
  trackHero: { height: 6, borderRadius: 3, backgroundColor: "rgba(255, 255, 255, 0.25)" },
  fill: { height: 8, borderRadius: 4 },
  fillHero: { height: 6, borderRadius: 3 },

  step: { flexDirection: "row", gap: space.lead },
  rail: { alignItems: "center", width: 20 },
  node: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: hairline.outline, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: color.primary, borderColor: color.primary },
  nodeNow: { borderColor: color.primary, borderWidth: 6 },
  // Something late needs attention, in clay, never red.
  nodeAlert: { backgroundColor: color.background, borderColor: chart.borderline, borderWidth: 6 },
  line: { flex: 1, width: 1.5, minHeight: 16, backgroundColor: hairline.edge, marginVertical: 2 },
  lineDone: { backgroundColor: color.primary },
  stepBody: { flex: 1, paddingBottom: space.item, gap: space.line },
  stepLabel: { ...type.title },
  stepLater: { color: ink.tertiary },
  stepDate: { ...type.meta },

  tabs: { flexDirection: "row", backgroundColor: "#E3E8EF", borderRadius: 10, padding: space.stack, gap: space.stack, borderWidth: 1, borderColor: "#D8DEE6" },
  // Each tab is as wide as its label plus an equal share of the rest, so a
  // long label ("Since you started") keeps to one line in its 32 pt tab.
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: "auto", paddingHorizontal: space.inline, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  dateTrack: { flexDirection: "row" },
  trackStep: { flex: 1, alignItems: "center", gap: space.line },
  trackRail: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginBottom: space.stack },
  trackLine: { flex: 1, height: 2, backgroundColor: hairline.edge },
  trackLineOn: { backgroundColor: color.primary },
  trackHidden: { opacity: 0 },
  trackDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: MARK.off, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  trackDotOn: { borderColor: color.primary, backgroundColor: color.primary },
  trackDotLate: { borderColor: chart.borderline },
  trackLabel: { ...type.metaStrong },
  trackDate: { ...type.label, fontVariant: ["tabular-nums"] },
  trackDateOff: { color: ink.tertiary },
  trackDateLate: { color: chart.borderline },
  // Frontline's segment: 16 either side of its word.
  tabScroll: { flexGrow: 0, flexShrink: 0, paddingHorizontal: 16 },
  // Scrolling tabs and chips bleed by onboarding's wider gutter: on a
  // signed-in page (space.gutter) and in a sheet alike they run to the
  // screen's edges, and the first one still lines up with the content.
  tabsScroll: { paddingHorizontal: gutter },
  tabOn: { backgroundColor: color.background, boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 23, 40, 0.1)" },
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  chipOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  chipPressed: { opacity: 0.85 },
  chipText: { ...type.chip },
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
  kvLabel: { ...type.label, flexShrink: 1 },
  kvValue: { flexShrink: 0, maxWidth: "60%", textAlign: "right", ...type.title },
  kvRight: { flexShrink: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.item },
  kvValueBeside: { flexShrink: 1, textAlign: "right", ...type.title },

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
  rowBody: { flex: 1, gap: space.line },
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
  rowSide: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: space.inline },
  rowDate: { ...type.label, fontVariant: ["tabular-nums"] },
  dateBlock: { width: 36, height: 36, borderRadius: 12, gap: 0 },
  dateWeekday: { ...type.captionStrong, lineHeight: 12 },
  dateDay: { ...type.value, lineHeight: 18, fontVariant: ["tabular-nums"] },

  seeAll: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.rowY },
  seeAllHero: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: space.line, minHeight: 24 },
  seeAllText: { ...type.link },

  stat: { flexGrow: 1, gap: space.inline, minHeight: 84 },
  // A door: about 99 wide on a phone, so "1,700 kcal" keeps to one line
  // (Frontline's raised tiles keep 10 inside).
  statHero: { flexGrow: 1, minHeight: 104, backgroundColor: color.background, borderRadius: 14, padding: 10, gap: space.inline },
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
  statCellDivided: { borderLeftWidth: 1, borderLeftColor: hairline.edge, paddingLeft: space.item, marginLeft: space.item },

  // A wrapped line keeps its mark beside the first line.
  summary: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, minHeight: 20 },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: color.primary },
  summaryCheck: { width: 16, height: 16, borderRadius: 8, marginTop: 2, backgroundColor: color.ok, alignItems: "center", justifyContent: "center" },
  summaryText: { flexShrink: 1, ...type.title },
  summaryChevron: { height: 20, justifyContent: "center" },

  planLine: { gap: space.stack },
  planRow: { flexDirection: "row", alignItems: "center", gap: space.mark },
  planMark: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  planMarkWrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  planText: { flexShrink: 1, ...type.label },
  planStrong: { fontFamily: font.medium, color: ink.content },

  small: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  smallTint: { backgroundColor: color.primaryTint, borderColor: color.primaryHalo },
  smallOutline: { backgroundColor: color.background, borderColor: hairline.outline },
  smallHero: { backgroundColor: color.background, borderColor: color.background },
  smallText: { ...type.action },
  textAction: { flexDirection: "row", alignItems: "center", gap: space.line, minHeight: 32 },
  textActionText: { ...type.link },

  // The offer is the quietest card on the page: no shadow, the kit's edge.
  nudge: { backgroundColor: color.background, borderRadius: CARD_RADIUS, borderWidth: 1, borderColor: hairline.edge, padding: space.card, gap: space.item },
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
    elevation: 4,
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
  // A full width button a card's padding under the line, the empty
  // state's own gap included.
  emptyButton: { alignSelf: "stretch", marginTop: space.card - space.inline },

  allowanceLine: { ...type.meta },
  allowanceCenter: { textAlign: "center" },
  meter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: space.inline, rowGap: space.stack },
  meterDots: { flexDirection: "row", gap: space.stack },
  meterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DDE3EA" },
  meterDotLeft: { backgroundColor: color.primary },
  meterText: { ...type.metaStrong },
  saved: { flexDirection: "row", alignItems: "center", gap: space.stack, height: 32, alignSelf: "flex-start" },
  savedText: { ...type.action },
  quote: { gap: space.stack },
  quoteText: { ...type.body },
  quoteMeta: { ...type.meta },

  // The value sits on the name's line and its bar beside the first meta
  // line, however far the words wrap.
  resultRow: { alignItems: "flex-start" },
  resultMark: { width: 8, alignItems: "center", alignSelf: "flex-start", marginTop: 6 },
  resultSide: { alignItems: "flex-end", gap: space.mark },
  resultRowValue: { ...type.value, fontVariant: ["tabular-nums"] },
  resultRowUnit: { ...type.unit, fontVariant: [] },
  resultBar: { width: 104 },
})
