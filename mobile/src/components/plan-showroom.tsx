import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ArrowsClockwise, Barbell, Bone, ChartLineUp, Flask, ForkKnife, Heartbeat, Stethoscope } from "@/components/ph"
import { AskButton } from "@/components/hol"
import { Block, Card, Group, NeedsRow, StatRow, StatTile } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { FOCUS_NAME, logEvent, planFocus, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { BENEFITS, CADENCES, FOCUS_DOES, TIERS, priceLabel } from "@/lib/plans"
import type { Biomarker, FocusArea } from "@/lib/record"
import { color, space, type } from "@/lib/theme"
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

/** What Inlay sees in one watched marker, as a row's facts: "5.9%, up
    from 5.3 in Apr 2022". */
function seenLine(t: Trend) {
  return t.takeaway ? `${t.valueWithUnit}, ${t.takeaway.charAt(0).toLowerCase()}${t.takeaway.slice(1)}` : t.valueWithUnit
}

/** What membership includes, an icon each, in BENEFITS' order. */
const BENEFIT_ICON = [Stethoscope, ForkKnife, ChartLineUp, ArrowsClockwise]

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

  const watched = watchList(markers, { improve: onboarding.why?.improve }).filter((t) => t.latest)
  const shown = watched.slice(0, 3)
  // The program focuses on the areas of the numbers shown above it, so
  // every patient's page names her own; her own answers when none show.
  const shownAreas = [...new Set(shown.map((t) => t.marker.focus).filter((f): f is FocusArea => Boolean(f)))]
  const areas = shownAreas.length ? shownAreas : planFocus(onboarding, markers, 3).areas
  const context = contextOf(from, markers)

  return (
    <>
      <View style={styles.lead}>
        {mode === "tab" && (
          <Text style={styles.leadTitle} accessibilityRole="header">
            A plan built around you
          </Text>
        )}
        <Text style={mode === "tab" ? styles.body : styles.leadTitle}>
          {shown.length ? `Your record shows ${shown.length === 1 ? "1 area" : `${shown.length} areas`} worth working on` : "Your record is in range"}
        </Text>
        {!!context.line && <Text style={styles.body}>{context.line}</Text>}
      </View>

      {shown.length > 0 && (
        <Block title="My health">
          <StatRow>
            {shown.map((t) => (
              <StatTile key={t.id} value={t.value} label={t.marker.short ?? t.marker.name} meta={t.statusWord} level={t.status} accessibilityLabel={t.spoken} />
            ))}
          </StatRow>
        </Block>
      )}

      {shown.length > 0 && (
        <Block title="What Inlay sees">
          <Group>
            {shown.map((t) => (
              <NeedsRow key={t.id} title={t.marker.short ?? t.marker.name} meta={seenLine(t)} />
            ))}
          </Group>
        </Block>
      )}

      <Block title="Your personalized program would focus on">
        <Group>
          {areas.map((area) => {
            const Icon = FOCUS_ICON[area]
            return <NeedsRow key={area} icon={<Icon size={16} color={color.primary} />} title={FOCUS_NAME[area]} meta={FOCUS_DOES[area]} />
          })}
        </Group>
      </Block>

      <Block title="What membership includes">
        <Group>
          {BENEFITS.map((b, i) => {
            const Icon = BENEFIT_ICON[i]
            return <NeedsRow key={b.title} icon={<Icon size={16} color={color.primary} />} title={b.title} meta={b.text} />
          })}
        </Group>
      </Block>

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
  lead: { gap: space.stack },
  leadTitle: { ...type.section },
  body: { ...type.body },

  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.inline },
})
