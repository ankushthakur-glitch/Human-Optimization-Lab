import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { ScoreRing } from "@/components/charts"
import { IconBowl, IconCamera, IconDumbbell } from "@/components/icons"
import { FocusIcon } from "@/components/plan-tab-pieces"
import { Block, Card, CheckLines, Group, NeedsRow, Steps, TextAction, Tag, type Step } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { FOCUS_NAME, logEvent, planFocus, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { BENEFITS, FREE_STAYS, TIERS, planPreview, priceLabel } from "@/lib/plans"
import type { Biomarker, FocusArea } from "@/lib/record"
import { color, ink, space, type } from "@/lib/theme"

/* The plan showroom (FINAL-SPEC C.14.3, D.4): the one place that tells the
   whole story of the Optimization membership, told one way in two places,
   the free Plan tab and the plan page every offer pushes (/plans). In
   order: what a plan would work on for her, from her record and her own
   words; an example day drawn with the member's own pieces; what she
   would get; how it starts; what it costs, with the first charge and the
   way out beside the price; what stays free; what happens if she stops;
   then "Start my plan" and a real "Not for me" (ShowroomActions), which
   close the showroom on the tab and are the plan page's pinned footer.

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

/** How a plan starts, in the order she would live it. */
const HOW_IT_STARTS: Step[] = [
  { label: "Answer a few questions about your goals and your week", date: "About 10 minutes", state: "now" },
  { label: "We draft your plan from your record", state: "next" },
  { label: "A physician reviews and approves it", state: "next" },
  { label: "You start, and we book your starting tests", state: "next" },
]

const COSTS = ["No charge until your plan is approved", "Cancel anytime in Profile", "Tests and imaging are priced when you book them"]

/** "Start again" for someone who had a plan before, "Start my plan" for
    everyone else. */
function startLabelOf(s: Snapshot) {
  return s.membership?.cancelledAt || s.planHistory?.length ? "Start again" : "Start my plan"
}

/** The example day's score ring, and the row tile it stands beside (the
    kit's Tile at its default size). */
const RING = 40
const TILE = 36

/** The example day's rows, each with the icon of the member piece it
    stands for. */
function PreviewIcon({ title }: { title: string }) {
  if (/strength/i.test(title)) return <IconDumbbell size={18} color={color.primary} />
  if (/log/i.test(title)) return <IconCamera size={18} color={color.primary} />
  return <IconBowl size={18} color={color.primary} />
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
      <Card style={styles.built}>
        <View style={styles.builtHead}>
          {/* On the page the first line leads, across the card; on the tab
              the card's own title does. */}
          {mode === "page" && !!context.line && <Text style={styles.context}>{context.line}</Text>}
          <View style={styles.builtTop}>
            <View style={styles.builtWords}>
              {mode === "tab" && (
                <Text style={styles.cardTitle} accessibilityRole="header">
                  A plan built around you
                </Text>
              )}
              {mode === "tab" && !!context.line && <Text style={styles.context}>{context.line}</Text>}
              <Text style={styles.body}>Built from your record and what you told us. A physician reviews it before it starts.</Text>
            </View>
            <Art name="seedling" size={64} />
          </View>
        </View>
        <View style={styles.focus}>
          <Text style={styles.label}>It would focus on</Text>
          {focus.areas.map((area, i) => (
            <View key={area} style={[styles.focusRow, context.focus === area && styles.focusRowOn]}>
              <NeedsRow icon={<FocusIcon area={area} />} hue="teal" title={FOCUS_NAME[area]} meta={focus.reasons[i]} />
            </View>
          ))}
        </View>
      </Card>

      <Block title="A day on the plan" variant="title" action={<Tag tone="muted">Example</Tag>}>
        <Group>
          {preview.rows.map((r) => (
            <NeedsRow key={r.title} icon={<PreviewIcon title={r.title} />} hue="teal" title={r.title} meta={r.meta} />
          ))}
          <View style={styles.scoreRow} accessible accessibilityLabel={`Daily score, ${preview.score} percent. How yesterday went, goal by goal.`}>
            <ScoreRing percent={preview.score} size={RING} playKey="showroom:ring" />
            <Text style={styles.scoreText}>How yesterday went, goal by goal</Text>
          </View>
        </Group>
      </Block>

      <Block title="What you get" variant="title">
        <Card>
          <CheckLines lines={BENEFITS} />
        </Card>
      </Block>

      <Block title="How it starts" variant="title">
        <Card style={styles.steps}>
          <Steps steps={HOW_IT_STARTS} />
        </Card>
      </Block>

      <Block title="What it costs" variant="title">
        <Card style={styles.cost}>
          <View style={styles.price} accessible accessibilityLabel={priceLabel()}>
            <Text style={styles.priceValue}>{TIERS.optimization.price}</Text>
            <Text style={styles.pricePer}>{TIERS.optimization.period}</Text>
          </View>
          <CheckLines lines={COSTS} />
        </Card>
      </Block>

      <Block title="What stays free" variant="title">
        <Card style={styles.cost}>
          <Text style={styles.body}>Your record, trends, reminders and care gaps stay free, always.</Text>
          <CheckLines lines={FREE_STAYS} />
        </Card>
      </Block>

      <Block title="If you stop" variant="title">
        <Text style={styles.body}>You go back to the free record. You keep your record and every version of your plan.</Text>
      </Block>

      {props.mode === "tab" && <ShowroomActions mode="tab" from={from} onStart={props.onStart} />}
    </>
  )
}

/** The showroom's actions (C.14.3 h): "Start my plan" with a quiet "Not for
    me" under it. They close the showroom on the tab; on /plans they are the
    pinned footer, so the no is in reach whenever the yes is (D.1.5). "Not
    for me" is a real answer: offers stop for 90 days and the actions say
    so, with a way back. Once said, the button alone stays (a place she
    opens herself is never closed to her). Logged on the same offer as the
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
  const [declined, setDeclined] = React.useState(false)
  const saidNo = Boolean(onboarding.offers?.notForMe)

  if (declined)
    return (
      <View style={styles.declined} accessibilityLiveRegion="polite">
        <Text style={styles.declinedText}>Got it. The plan is always here when you want it.</Text>
        <TextAction
          onPress={() => {
            offer.undoNotForMe()
            setDeclined(false)
          }}
        >
          Undo
        </TextAction>
      </View>
    )

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
      {!saidNo && (
        <View style={styles.quiet}>
          <TextAction
            tone="muted"
            onPress={() => {
              offer.notForMe()
              setDeclined(true)
            }}
          >
            Not for me
          </TextAction>
        </View>
      )}
    </View>
  )
}

/** The highlighted focus row reaches a step (4 pt) from the card's edge,
    inside a 1.5 pt teal edge. */
const FOCUS_EDGE = 1.5
const FOCUS_OUT = space.card - space.stack

const styles = StyleSheet.create({
  // The card's head (its words and object) and the focus list.
  built: { gap: space.card },
  // On the page, the context line and the sentence under it.
  builtHead: { gap: space.inline },
  builtTop: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  // On the tab, the card's title and the line under it.
  builtWords: { flex: 1, gap: space.stack },
  cardTitle: { ...type.section },
  context: { ...type.body },
  body: { ...type.body },
  label: { ...type.label },
  // The label sits a step above the first row, whose own space finishes
  // the gap.
  focus: { gap: space.stack },
  // Every focus row keeps the same edge width, so the highlighted one does
  // not shift; its words still line up with the card's (12 out, then the
  // edge and the rest of the 12 in).
  focusRow: { marginHorizontal: -FOCUS_OUT, paddingHorizontal: FOCUS_OUT - FOCUS_EDGE, borderRadius: 14, borderWidth: FOCUS_EDGE, borderColor: "transparent" },
  focusRowOn: { borderColor: color.primary },

  // A row like the ones above it: the ring is wider than their tile, so the
  // gap is that much less and the words line up.
  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.lead - (RING - TILE), paddingVertical: space.rowY },
  scoreText: { ...type.title, flex: 1 },

  // The last step keeps its own space below (the kit's space.item), so the
  // card's is trimmed to make up its padding.
  steps: { paddingBottom: space.card - space.item },
  // The price, or the sentence, and the lines under it.
  cost: { gap: space.item },
  price: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  priceValue: { ...type.stat },
  pricePer: { ...type.unit },

  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.stack },
  quiet: { alignItems: "center" },
  declined: { alignItems: "center", gap: space.line },
  declinedText: { ...type.body, textAlign: "center", color: ink.detail },
})
