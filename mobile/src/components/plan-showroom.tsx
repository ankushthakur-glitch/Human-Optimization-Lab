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
import type { FocusArea } from "@/lib/record"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList, type Trend } from "@/lib/trends"

/* The plan showroom (FINAL-SPEC C.14.3, D.4): the one place that tells the
   whole story of the Optimization membership, on the free Plan tab, where
   every offer leads. In five sections up to the decision (6 Oct 2026 feedback): her
   health, the numbers her record is watching; what Inlay sees in them;
   what her personalized program would focus on, built from those areas,
   so no two patients see the same page; what membership includes; the
   price. Then one line on what stays free, and "Build my personalized
   plan" (ShowroomActions), which closes the showroom. Built from the record kit, as every
   other screen: section labels over stat tiles and grouped rows, so the
   page reads with the app's one hierarchy.

   Inlay speaks here, never her doctor: "your doctor" is named only as a
   role, with no physician's name, photo or quote anywhere near the price
   (B-03). The words are placeholders from lib/plans.ts until Fynn's team
   sends the final copy. The price is read from the one placeholder in
   lib/plans.ts. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

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

export function PlanShowroom() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const offer = useOffer("plan-tab", { key: "tab" })
  useShown(offer)
  // The plan seen, and from where (D.7), once each time the showroom opens.
  const viewed = React.useRef(false)
  React.useEffect(() => {
    if (viewed.current || !onboarding.loaded) return
    viewed.current = true
    logEvent(onboarding, "plan_viewed", { from: "tab" })
  }, [onboarding])

  const shown = watchList(markers, { improve: onboarding.why?.improve })
    .filter((t) => t.latest)
    .slice(0, 3)
  return (
    <>
      <UpgradeHero />

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
    "Ask to Health Agent" button is gone, 8 Oct 2026), closing the
    showroom. Logged on the same offer as the showroom's view. */
export function ShowroomActions({
  onStart,
}: {
  /** Opens the checkout sheet, which the screen draws over itself. */
  onStart: () => void
}) {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: "tab" })
  return (
    <Button
      trailing={({ color: c }) => <ArrowRight size={18} weight="bold" color={c} />}
      onPress={() => {
        offer.markOpened()
        logEvent(onboarding, "checkout_started", { from: "tab" })
        onStart()
      }}
    >
      {startLabelOf(onboarding)}
    </Button>
  )
}

const styles = StyleSheet.create({

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
