import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ArrowDown, ArrowRight, ArrowUp, Barbell, Bone, Check, Flask, Heartbeat, Sparkle } from "@/components/ph"
import { AskButton } from "@/components/hol"
import { Block, Card, HUE, Tile, StatRow, StatTile, type Hue } from "@/components/record-kit"
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

/** The warm accent of the upgrade card in the assistant, carried here. */
const AMBER = "#F5A524"

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

/** One watched marker in the "areas worth working on" card: its icon, the
    name with its value and the way it is moving, and one line of why. */
function AreaRow({ t, last }: { t: Trend; last?: boolean }) {
  const hue = STATUS_HUE[t.status]
  const Icon = (t.marker.focus && FOCUS_ICON[t.marker.focus]) || Flask
  const Arrow = t.movement === "rising" ? ArrowUp : t.movement === "falling" ? ArrowDown : undefined
  return (
    <View style={[styles.area, !last && styles.areaRule]} accessible accessibilityLabel={t.spoken}>
      <Tile hue={hue} size={36}>
        <Icon size={20} color={HUE[hue].ink} />
      </Tile>
      <View style={styles.areaWords}>
        <View style={styles.areaTitle}>
          <Text style={styles.areaName}>{t.marker.short ?? t.marker.name}</Text>
          <Text style={styles.areaValue}>{t.valueWithUnit}</Text>
          {Arrow && <Arrow size={14} weight="bold" color={HUE[hue].ink} />}
        </View>
        <Text style={styles.areaMeta}>{t.change?.words ?? t.movementWord}</Text>
      </View>
    </View>
  )
}

/** The checklist under the card: what a member gets, a green tick each. */
function MemberGets() {
  return (
    <Block title="What you get as a member">
      <Card>
        <View style={styles.gets}>
          {MEMBER_GETS.map((line) => (
            <View key={line} style={styles.get}>
              <Check size={16} weight="bold" color={color.ok} />
              <Text style={styles.getText}>{line}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Block>
  )
}

/** A plain checklist block: ticks for what stays free, dashes for what is charged apart. */
function Points({ title, lines, tick }: { title: string; lines: readonly string[]; tick?: boolean }) {
  return (
    <Block title={title}>
      <Card>
        <View style={styles.gets}>
          {lines.map((line) => (
            <View key={line} style={styles.get}>
              {tick ? <Check size={16} weight="bold" color={color.ok} /> : <Text style={styles.dash}>–</Text>}
              <Text style={styles.getText}>{line}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Block>
  )
}

/** The page's one question and its answer, in the words the assistant's
    upgrade card uses, so the two say the same thing. */
function Pitch() {
  return (
    <View style={styles.pitch}>
      <View style={styles.pitchHead}>
        <View style={styles.pitchBadge}>
          <Sparkle size={22} color="#FFFFFF" weight="fill" />
        </View>
        <Text style={styles.pitchTitle} accessibilityRole="header">
          Want unlimited AI and a personalized plan?
        </Text>
      </View>
      <Text style={styles.pitchBody}>Get answers, guidance and a plan built from your complete health record.</Text>
    </View>
  )
}

function Prices() {
  return (
    <Block title="Price">
      <Card>
        <StatRow>
          {CADENCES.map((c) => {
            const b = TIERS.optimization.billing[c]
            return <StatTile key={c} bare value={b.price} label={b.name} meta={b.save ?? b.note} accessibilityLabel={`${b.name}, ${priceLabel(c)}, ${b.save ?? b.note}`} />
          })}
        </StatRow>
      </Card>
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
        <Text style={styles.leadTitle} accessibilityRole="header">
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
        {shown.length > 0 && (
          <View>
            {shown.map((t, i) => (
              <AreaRow key={t.id} t={t} last={i === shown.length - 1} />
            ))}
          </View>
        )}
        <View style={styles.note}>
          <Text style={styles.noteText}>Inlay can turn these insights into a personalized program designed around you and reviewed by a physician.</Text>
        </View>
      </Card>

      <Pitch />

      <MemberGets />

      <Prices />

      <Points title="What stays free" lines={FREE_STAYS} tick />

      <Points title="Charged separately" lines={TIERS.optimization.excluded} />

      {props.mode === "tab" && <ShowroomActions mode="tab" from={from} onStart={props.onStart} />}
    </>
  )
}

/** The showroom's actions (C.14.3 h): "Build my personalized plan" as the primary
    button and under it the "Ask to Health Agent" button as the
    secondary one, with its orb and sparkle (user, 5 Oct 2026: no "Not for me"). On the tab they close the showroom; on
    /plans they are the pinned footer. Logged on the same offer as the
    showroom's view, keyed by where she came from. */
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
    <View style={styles.actions}>
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
      <AskButton params={{ topic: "plan" }} secondary />
    </View>
  )
}

const styles = StyleSheet.create({
  body: { ...type.body },
  leadTitle: { ...type.section },
  count: { fontFamily: font.semibold, color: ink.primary },

  // The card's rows carry their own rule and room, as a Group's do.
  areas: { gap: space.item },
  area: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  areaRule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  areaWords: { flex: 1, gap: space.line },
  areaTitle: { flexDirection: "row", alignItems: "center", gap: space.mark },
  areaName: { ...type.title },
  areaValue: { ...type.value },
  areaMeta: { ...type.label },
  note: { backgroundColor: color.primarySoft, borderRadius: 8, padding: space.compact },
  noteText: { ...type.body, color: ink.primary },

  pitch: {
    padding: 16,
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F6D99A",
    backgroundColor: "#FFFAEE",
    shadowColor: AMBER,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pitchHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  pitchBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: AMBER },
  pitchTitle: { ...type.section, flex: 1, color: ink.primary },
  pitchBody: { ...type.body, color: ink.detail },

  gets: { gap: space.item },
  get: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  getText: { ...type.body, flex: 1, color: ink.content },
  dash: { ...type.body, width: 16, textAlign: "center", color: ink.detail },

  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.inline },
})
