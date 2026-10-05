import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Barbell, Bone, BowlFood, Camera, Check, Flask, Heartbeat } from "@/components/ph"
import { AskButton } from "@/components/hol"
import { Block, Card, Tag } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { FOCUS_NAME, logEvent, planFocus, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { BENEFITS, FREE_STAYS, TIERS, planPreview, priceLabel } from "@/lib/plans"
import type { Biomarker, FocusArea } from "@/lib/record"
import { card, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* The plan showroom (FINAL-SPEC C.14.3, D.4): the one place that tells the
   whole story of the Optimization membership, told one way in two places,
   the free Plan tab and the plan page every offer pushes (/plans). In
   order: what a plan would work on for her, from her record and her own
   words; an example day drawn with the member's own pieces; what she
   would get; how it starts; what it costs, with the first charge and the
   way out beside the price; what stays free; what happens if she stops;
   then "Start my plan" and a real "Not for me" (ShowroomActions), which
   close the showroom on the tab and are the plan page's pinned footer.
   Drawn as the Figma "Hol" Plan (5 Oct 2026, the extended frame): the
   teal tinted card with the focus areas as three lifted tiles, the day's
   rows on a white card, and the rest as lifted cards whose lines sit on
   an inset grey panel.

   Inlay speaks here, never her doctor: no physician's name, photo or quote
   anywhere near the price (B-03). The price is read from the one
   placeholder in lib/plans.ts. `from` says where she came from, and sets
   the first line and the focus row it highlights. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/** The first line, by where she came from (C.14.3). A marker id is
    handled apart: it names the marker. */
const CONTEXT: Record<string, string> = {
  allowance: "You've used this month's questions. Members ask as many as they like.",
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

/** How a plan starts, in the order she would live it: the first step is
    where she starts, ticked in teal; the rest wait in grey. */
const HOW_IT_STARTS: { label: string; meta?: string; first?: boolean }[] = [
  { label: "Answer a few questions about your goals and your week", meta: "About 10 minutes", first: true },
  { label: "We draft your plan from your record" },
  { label: "A physician reviews and approves it" },
  { label: "You start, and we book your starting tests" },
]

const COSTS = ["No charge until your plan is approved", "Cancel anytime in Profile", "Tests and imaging are priced when you book them"]

/** "Start again" for someone who had a plan before, "Start my plan" for
    everyone else. */
function startLabelOf(s: Snapshot) {
  return s.membership?.cancelledAt || s.planHistory?.length ? "Start again" : "Start my plan"
}

/** A focus area's icon, Phosphor as the Figma draws them. */
const FOCUS_ICON: Record<FocusArea, typeof Flask> = { "blood sugar": Flask, heart: Heartbeat, weight: Flask, bone: Bone }

/** The example day's rows, each with the icon of the member piece it
    stands for. */
function PreviewIcon({ title }: { title: string }) {
  if (/strength/i.test(title)) return <Barbell size={16} color={color.primary} />
  if (/log/i.test(title)) return <Camera size={16} color={color.primary} />
  return <BowlFood size={16} color={color.primary} />
}

/** The round 28 tile on the teal tint. */
const Tile = ({ children }: { children: React.ReactNode }) => <View style={styles.tile}>{children}</View>

/** Figma's lifted card: white fading in from the page inside a faint
    edge, its label on top and its lines on an inset grey panel. */
function Lifted({ title, head, children }: { title: string; head?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.lifted}>
      <View style={styles.liftedHead}>
        <Text style={styles.liftedTitle} accessibilityRole="header">
          {title}
        </Text>
        {head}
      </View>
      <View style={styles.inset}>{children}</View>
    </View>
  )
}

/** Ticked lines on the inset panel: a 12 teal check and 12 words. */
function Ticks({ lines }: { lines: readonly (string | { text: string; soon?: boolean })[] }) {
  return (
    <>
      {lines.map((l) => {
        const line = typeof l === "string" ? { text: l } : l
        return (
          <View key={line.text} style={styles.tick} accessible accessibilityLabel={line.soon ? `${line.text}, coming soon` : line.text}>
            <Check size={12} color={color.primary} />
            <Text style={styles.tickText}>{line.text}</Text>
            {line.soon && <Tag tone="muted">Coming soon</Tag>}
          </View>
        )
      })}
    </>
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

  const focus = planFocus(onboarding, markers, 3)
  const context = contextOf(from, markers)
  const preview = planPreview(focus.areas)

  return (
    <>
      <View style={styles.built}>
        {/* On the page the first line leads; on the tab the card's own
            title does, the line under it. */}
        {mode === "tab" && (
          <Text style={styles.cardTitle} accessibilityRole="header">
            A plan built around you
          </Text>
        )}
        {!!context.line && <Text style={styles.body}>{context.line}</Text>}
        <Text style={styles.body}>Built from your record and what you told us. A physician reviews it before it starts.</Text>
        <View style={styles.focus} accessibilityLabel="It would focus on">
          {focus.areas.map((area, i) => {
            const Icon = FOCUS_ICON[area]
            return (
              <View key={area} style={[styles.focusTile, context.focus === area && styles.focusTileOn]} accessible accessibilityLabel={`${FOCUS_NAME[area]}. ${focus.reasons[i]}`}>
                <Tile>
                  <Icon size={16} color={color.primary} />
                </Tile>
                <Text style={styles.focusName}>{FOCUS_NAME[area]}</Text>
                <Text style={styles.focusWhy}>{focus.reasons[i]}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <Block title="A day on the plan">
        <Card style={styles.day}>
          {preview.rows.map((r, i) => (
            <React.Fragment key={r.title}>
              {i > 0 && <View style={styles.rule} />}
              <View style={styles.dayRow} accessible accessibilityLabel={`${r.title}. ${r.meta}`}>
                <Tile>
                  <PreviewIcon title={r.title} />
                </Tile>
                <View style={styles.dayWords}>
                  <Text style={styles.dayTitle}>{r.title}</Text>
                  <Text style={styles.dayMeta}>{r.meta}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </Card>
      </Block>

      <Lifted title="What you get">
        <Ticks lines={BENEFITS} />
      </Lifted>

      <Lifted title="How it starts">
        <View>
          {HOW_IT_STARTS.map((step, i) => {
            const last = i === HOW_IT_STARTS.length - 1
            return (
              <View key={step.label} style={styles.step}>
                <View style={styles.rail}>
                  <View style={[styles.node, step.first && styles.nodeDone]}>{step.first && <Check size={10} color={color.onPrimary} weight="bold" />}</View>
                  {!last && <View style={styles.railLine} />}
                </View>
                <View style={[styles.stepWords, !last && styles.stepGap]}>
                  <Text style={[styles.stepLabel, step.first && styles.stepLabelFirst]}>{step.label}</Text>
                  {!!step.meta && <Text style={styles.dayMeta}>{step.meta}</Text>}
                </View>
              </View>
            )
          })}
        </View>
      </Lifted>

      <Lifted
        title="What it costs"
        head={
          <View style={styles.price} accessible accessibilityLabel={priceLabel()}>
            <Text style={styles.priceValue}>{TIERS.optimization.price}</Text>
            <Text style={styles.pricePer}>/mo</Text>
          </View>
        }
      >
        <Ticks lines={COSTS} />
      </Lifted>

      <Lifted title="What stays free" head={<Text style={styles.freeLine}>Your record, trends, reminders and care gaps stay free, always.</Text>}>
        <Ticks lines={FREE_STAYS} />
      </Lifted>

      {props.mode === "tab" && <ShowroomActions mode="tab" from={from} onStart={props.onStart} />}
    </>
  )
}

/** The showroom's actions (C.14.3 h): "Start my plan" as the primary
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

/** A lifted card's faint edge (Figma draws it as #007CFF at a whisper). */
const LIFTED_EDGE = "rgba(0, 124, 255, 0.08)"

const styles = StyleSheet.create({
  // The teal tinted card on top: its words, then the focus tiles.
  built: {
    gap: space.item,
    padding: 11.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
    boxShadow: card.shadow,
  },
  cardTitle: { ...type.section },
  body: { ...type.body },
  // Three lifted tiles side by side, as tall as the tallest.
  focus: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  focusTile: {
    flex: 1,
    gap: space.stack,
    paddingHorizontal: 10,
    paddingVertical: space.inline,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  // The area she came from, edged in teal.
  focusTileOn: { borderColor: color.primary },
  focusName: { ...type.metaStrong, color: ink.detail },
  focusWhy: { ...type.caption },

  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },

  // The day's rows: 12 apart over a hairline.
  day: { gap: space.card },
  rule: { height: 0.8, backgroundColor: hairline.rule },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.lead },
  dayWords: { flex: 1, gap: space.stack },
  dayTitle: { ...type.title },
  dayMeta: { ...type.label },

  lifted: {
    gap: 10,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LIFTED_EDGE,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  liftedHead: { gap: space.stack },
  liftedTitle: { ...type.sectionLabel },
  inset: { gap: space.inline, padding: space.inline, borderRadius: 8, backgroundColor: surface.inset },
  tick: { flexDirection: "row", alignItems: "center", gap: space.inline },
  tickText: { flexShrink: 1, ...type.label, color: ink.detail },

  // How it starts: an 18 node on a 2 pt grey rail, the words 12 beside it.
  step: { flexDirection: "row", gap: space.lead },
  rail: { alignItems: "center", width: 18 },
  node: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.6, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: color.primary, borderColor: color.primary },
  railLine: { flex: 1, width: 2, backgroundColor: hairline.outline },
  stepWords: { flex: 1, gap: space.stack },
  stepGap: { paddingBottom: space.item },
  stepLabel: { ...type.chip, color: ink.secondary },
  stepLabelFirst: { color: ink.content },

  price: { flexDirection: "row", alignItems: "center", gap: space.stack },
  priceValue: { ...type.section, color: color.primaryText },
  pricePer: { ...type.label, color: ink.detail },
  freeLine: { ...type.label },

  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.inline },
})
