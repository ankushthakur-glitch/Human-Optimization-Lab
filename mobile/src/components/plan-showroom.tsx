import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { ArrowDown, ArrowRight, ArrowUp, Barbell, Bone, Buildings, CalendarCheck, ChartLineUp, ChatText, Check, ClipboardText, FileText, Flask, Gauge, Heart, Heartbeat, Microscope, Pill, Target } from "@/components/ph"
import { Block, Card, HUE, Tile, type Hue } from "@/components/record-kit"
import { UpgradeHero } from "@/components/upgrade-hero"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { logEvent, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { CADENCES, FREE_STAYS, MEMBER_GETS, TIERS, priceLabel } from "@/lib/plans"
import type { Biomarker, FocusArea } from "@/lib/record"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList, type Trend } from "@/lib/trends"

/* The plan showroom (FINAL-SPEC C.14.3, D.4): the one place that tells the
   whole story of the Optimization membership, told one way in two places,
   the free Plan tab and the plan page every offer pushes (/plans). In
   five sections up to the decision (6 Oct 2026 feedback): her
   health, the numbers her record is watching; what Inlay sees in them;
   what her personalized program would focus on, built from those areas,
   so no two patients see the same page; what membership includes; the
   price. Then one line on what stays free, and "Build my personalized
   plan" (ShowroomActions), which closes the showroom on the tab and is
   the plan page's pinned footer. Built from the record kit, as every
   other screen: section labels over stat tiles and grouped rows, so the
   page reads with the app's one hierarchy.

   Inlay speaks here, never her doctor: "your doctor" is named only as a
   role, with no physician's name, photo or quote anywhere near the price
   (B-03). The words are placeholders from lib/plans.ts until Fynn's team
   sends the final copy. The price is read from the one placeholder in
   lib/plans.ts. `from` says where she came from, and sets the first line
   and the focus row it highlights. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/** The first line, by where she came from (C.14.3). A marker id is
    handled apart: it names the marker. */
const CONTEXT: Record<string, string> = {
  allowance: "You've used this week's AI credit. Members get more, and can add more.",
  assistant: "You asked how to change something. This is what a plan does.",
  score: "You asked what moves your score. Here's how a plan works on it.",
  results: "Your new results are in. Here's how a plan would use them.",
  devices: "Watch and scale sync will come with the plan.",
}

/** Where she came from, as the first line and the focus it points at. */
function contextOf(from: string | undefined, markers: Biomarker[]): { line?: string; focus?: FocusArea } {
  if (!from) return {}
  if (CONTEXT[from]) return { line: CONTEXT[from] }
  const marker = markers.find((m) => m.id === from)
  if (!marker) return {}
  return { line: `You were looking at your ${marker.short ?? marker.name}. Here's how a plan would work on it.`, focus: marker.focus }
}

/** "Build my personalized plan", or "Start again" for someone who had a
    plan before. */
function startLabelOf(s: Snapshot) {
  return s.membership?.cancelledAt || s.planHistory?.length ? "Start again" : "Build my personalized plan"
}

/** A focus area's icon, Phosphor as the Figma draws them. */
const FOCUS_ICON: Record<FocusArea, typeof Flask> = { "blood sugar": Flask, heart: Heartbeat, weight: Barbell, bone: Bone }

/** A watched marker's tile, by how far out it is: red out of range, amber
    borderline, teal in range. */
const STATUS_HUE: Record<Trend["status"], Hue> = { out: "red", borderline: "amber", in: "teal" }

/** The cost cards' brown ink, on their tan icon block and cream ground. */
const COST_INK = "#8A6A2F"

/** A marker's icon: its focus area's, or the gauge for blood pressure. */
function iconOf(t: Trend): typeof Flask {
  if (t.marker.focus) return FOCUS_ICON[t.marker.focus]
  return /pressure|bp/i.test(`${t.marker.short ?? ""} ${t.marker.name}`) ? Gauge : Flask
}

/** The way a result is moving, for its arrow. */
const directionOf = (t: Trend) => (t.movement === "rising" ? "up" : t.movement === "falling" ? "down" : undefined)

/** One watched marker in the "areas worth working on" card: its icon, the
    name and the way it is moving, and the value with its arrow; the row
    opens the marker. */
function AreaRow({ t }: { t: Trend }) {
  const hue = STATUS_HUE[t.status]
  const Icon = iconOf(t)
  const Arrow = directionOf(t) === "up" ? ArrowUp : directionOf(t) === "down" ? ArrowDown : undefined
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })}
      accessibilityRole="button"
      accessibilityLabel={t.spoken}
      style={({ pressed }) => [styles.area, pressed && styles.areaPressed]}
    >
      <Tile hue={hue} size={40}>
        <Icon size={22} color={HUE[hue].ink} />
      </Tile>
      <View style={styles.areaWords}>
        <Text style={styles.areaName}>{t.marker.short ?? t.marker.name}</Text>
        <Text style={styles.areaMeta}>{t.change?.words ?? t.movementWord}</Text>
      </View>
      <View style={styles.areaValue}>
        <Text style={styles.areaValueText}>{t.valueWithUnit}</Text>
        {Arrow && <Arrow size={14} weight="bold" color={HUE[hue].ink} />}
      </View>
    </Pressable>
  )
}

/** One icon for each line of MEMBER_GETS, in its order. */
const GET_ICON = [ClipboardText, FileText, ChatText, CalendarCheck, ChartLineUp, Target] as const

/** What a member gets, as a grid of small cards (6 Oct 2026 reference): each
    a soft teal icon tile over its words, two to a row and level. Read
    across, then down. */
function MemberGets() {
  const rows: (typeof MEMBER_GETS)[number][][] = []
  for (let i = 0; i < MEMBER_GETS.length; i += 2) rows.push(MEMBER_GETS.slice(i, i + 2))
  return (
    <Block title="What you get as a member">
      <View style={styles.getsGrid}>
        {rows.map((pair, r) => (
          <View key={r} style={styles.getsRow}>
            {pair.map((line, c) => {
              const Icon = GET_ICON[(r * 2 + c) % GET_ICON.length]
              return (
                <View key={line} style={styles.get} accessible accessibilityLabel={line}>
                  <View style={styles.getIcon}>
                    <Icon size={18} color={color.primary} />
                  </View>
                  <Text style={styles.getText}>{line}</Text>
                </View>
              )
            })}
            {pair.length < 2 && <View style={styles.getSpacer} />}
          </View>
        ))}
      </View>
    </Block>
  )
}

/** One icon for each line of FREE_STAYS, in its order. */
const FREE_ICON = [Heartbeat, Heart, Flask, ChatText] as const

/** What stays free, however she pays (S-03): all the lines in one soft mint
    card, a row each with a teal icon block and a tick on the right. */
function FreeStays() {
  return (
    <Block title="What stays free">
      <View style={styles.frees}>
        {FREE_STAYS.map((line, i, all) => {
          const Icon = FREE_ICON[i % FREE_ICON.length]
          return (
            <View key={line} style={[styles.free, i < all.length - 1 && styles.freeRule]} accessible accessibilityLabel={`${line}, free`}>
              <View style={styles.freeIcon}>
                <Icon size={18} color={color.primary} />
              </View>
              <Text style={styles.freeText}>{line}</Text>
              <View style={styles.freeTick}>
                <Check size={12} weight="bold" color={color.primary} />
              </View>
            </View>
          )
        })}
      </View>
    </Block>
  )
}

/** One icon for each line of TIERS.optimization.excluded, in its order. */
const COST_ICON = [Microscope, Buildings, Pill] as const

/** What is charged apart from the plan (S-66): all the lines in one soft cream
    card, a row each with a small tan icon block, so it reads as a cost to know
    about and not as something the plan includes. */
function ChargedSeparately() {
  return (
    <Block title="Charged separately">
      <View style={styles.costs}>
        {TIERS.optimization.excluded.map((line, i, all) => {
          const Icon = COST_ICON[i % COST_ICON.length]
          return (
            <View key={line} style={[styles.cost, i < all.length - 1 && styles.costRule]} accessible accessibilityLabel={line}>
              <View style={styles.costIcon}>
                <Icon size={18} color={COST_INK} />
              </View>
              <Text style={styles.costText}>{line}</Text>
            </View>
          )
        })}
      </View>
    </Block>
  )
}

/** The Premium Plan's two prices (8 Oct 2026): Monthly and Yearly as two
    cards side by side, each a name, a figure and its period. View only:
    nothing here is picked; the checkout is where she confirms how she pays,
    from the pinned "Build my personalized plan". Yearly carries its saving
    on a badge over the edge and a light green to white wash. */
function Prices() {
  const gradient = React.useId().replace(/:/g, "")
  return (
    <Block title="Premium Plan">
      <View style={styles.prices}>
        {CADENCES.map((c) => {
          const b = TIERS.optimization.billing[c]
          const yearly = c === "yearly"
          return (
            <View
              key={c}
              style={[styles.price, yearly && styles.priceYearly]}
              accessible
              accessibilityLabel={`${b.name}, ${priceLabel(c)}${b.save ? `, ${b.save}` : ""}`}
            >
              {yearly && (
                <View style={styles.priceWash} pointerEvents="none">
                  <Svg style={StyleSheet.absoluteFill} viewBox="0 0 1 1" preserveAspectRatio="none">
                    <Defs>
                      <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#D9F1EC" />
                        <Stop offset="1" stopColor="#FFFFFF" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="1" height="1" fill={`url(#${gradient})`} />
                  </Svg>
                </View>
              )}
              <Text style={styles.priceName}>{b.name}</Text>
              <Text style={styles.priceFigure} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {b.price}
                <Text style={styles.pricePeriod}>{` / ${b.period}`}</Text>
              </Text>
              {!!b.save && (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>{b.save}</Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </Block>
  )
}

type ShowroomProps = {
  /** Where she came from: a marker id, or allowance, assistant, score,
      results, devices, home, profile. */
  from?: string
} & (
  | {
      /** On the free Plan tab: the card carries its title and the actions
          close the showroom. */
      mode: "tab"
      /** Opens the checkout sheet, which the screen draws over itself. */
      onStart: () => void
    }
  | {
      /** On /plans: the page title names it, and the page pins the
          actions as its footer (ShowroomActions); a member reading the
          page gets the story alone. */
      mode: "page"
      /** Opens the checkout sheet from the pricing card. */
      onStart?: () => void
    }
)

export function PlanShowroom(props: ShowroomProps) {
  const { mode, from } = props
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const offer = useOffer("plan-tab", { key: from ?? mode })
  useShown(offer)
  // The plan seen, and from where (D.7), once each time the showroom opens.
  const viewed = React.useRef(false)
  React.useEffect(() => {
    if (viewed.current || !onboarding.loaded) return
    viewed.current = true
    logEvent(onboarding, "plan_viewed", { from: from ?? mode })
  }, [onboarding, from, mode])

  const shown = watchList(markers, { improve: onboarding.why?.improve })
    .filter((t) => t.latest)
    .slice(0, 3)
  const context = contextOf(from, markers)
  return (
    <>
      <UpgradeHero />

      {!!context.line && <Text style={styles.body}>{context.line}</Text>}

      <Card style={styles.areas}>
        <View style={styles.lead}>
          <Text style={styles.leadTitle} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {shown.length ? (
              <>
                {"Your record shows "}
                <Text style={styles.count}>{shown.length === 1 ? "1 area" : `${shown.length} areas`}</Text>
                {" worth working on"}
              </>
            ) : (
              "Your record is in range"
            )}
          </Text>
        </View>
        {shown.map((t) => (
          <AreaRow key={t.id} t={t} />
        ))}
      </Card>

      <MemberGets />

      <Prices />

      <FreeStays />

      <ChargedSeparately />

    </>
  )
}

/** The showroom's one action (C.14.3 h): "Build my personalized plan" (the
    "Ask to Health Agent" button is gone, 8 Oct 2026). On the tab it closes
    the showroom; on /plans it is the pinned footer. Logged on the same
    offer as the showroom's view, keyed by where she came from. */
export function ShowroomActions({
  mode,
  from,
  onStart,
}: {
  mode: "tab" | "page"
  from?: string
  /** Opens the checkout sheet, which the screen draws over itself. */
  onStart: () => void
}) {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: from ?? mode })
  return (
    <Button
      trailing={({ color: c }) => <ArrowRight size={18} weight="bold" color={c} />}
      onPress={() => {
        offer.markOpened()
        logEvent(onboarding, "checkout_started", { from: from ?? mode })
        onStart()
      }}
    >
      {startLabelOf(onboarding)}
    </Button>
  )
}

const styles = StyleSheet.create({
  body: { ...type.body },

  // The areas card: a lead row, then each marker on its own white row.
  areas: { gap: space.item, padding: space.item },
  lead: { flexDirection: "row", alignItems: "center", gap: space.lead },
  leadTitle: { ...type.section, flex: 1, fontSize: 14, lineHeight: 20 },
  count: { fontFamily: font.semibold, color: ink.primary },
  area: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    padding: space.item,
    borderRadius: 12,
    backgroundColor: color.background,
    boxShadow: "0 1px 6px rgba(16, 24, 40, 0.06)",
  },
  areaPressed: { opacity: 0.7 },
  areaWords: { flex: 1, gap: space.line },
  areaName: { ...type.title },
  areaMeta: { ...type.label },
  areaValue: { flexDirection: "row", alignItems: "center", gap: space.mark },
  areaValueText: { ...type.value },

  getsGrid: { gap: space.item },
  getsRow: { flexDirection: "row", gap: space.item },
  get: {
    flex: 1,
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6EAE7",
    backgroundColor: color.background,
  },
  getSpacer: { flex: 1 },
  getIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: color.primaryTint },
  getText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: ink.strong },

  costs: { paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: "#F4ECD6", backgroundColor: "#FFFCF3" },
  cost: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  costRule: { borderBottomWidth: 1, borderBottomColor: "#F4ECD6" },
  costIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F4E5BE" },
  costText: { ...type.body, flex: 1, color: ink.content },

  frees: { paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "#CFE8E3", backgroundColor: "#F3FAF8" },
  free: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  freeRule: { borderBottomWidth: 1, borderBottomColor: "#DCEEEA" },
  freeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#D7EFEA" },
  freeText: { ...type.body, flex: 1, color: ink.content },
  freeTick: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#CBEBE5" },

  // The two price cards, level and equal; the badge floats over the top edge.
  prices: { flexDirection: "row", gap: space.item, paddingTop: 10 },
  price: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6EAE7",
    backgroundColor: color.background,
  },
  priceYearly: { borderWidth: 1.5, borderColor: color.primary },
  priceWash: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: 14, overflow: "hidden" },
  priceName: { ...type.title },
  priceFigure: { ...type.hero, textAlign: "center" },
  pricePeriod: { ...type.label, fontFamily: font.medium },
  priceBadge: { position: "absolute", top: -10, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: color.primary },
  priceBadgeText: { fontFamily: font.semibold, fontSize: 11, lineHeight: 16, color: "#FFFFFF" },
})
