import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Barbell, Bone, BowlFood, Camera, Check, Flask, Heartbeat } from "@/components/ph"
import { AskButton } from "@/components/hol"
import { Block, Card, Tag } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { FOCUS_NAME, logEvent, planFocus, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { BENEFITS, CADENCES, FREE_STAYS, GOALS, TIERS, UPSELL_LEAD, planPreview, priceLabel } from "@/lib/plans"
import type { Biomarker, FocusArea } from "@/lib/record"
import { card, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* The plan showroom (FINAL-SPEC C.14.3, D.4): the one place that tells the
   whole story of the Optimization membership, told one way in two places,
   the free Plan tab and the plan page every offer pushes (/plans). In
   order (6 Oct 2026): the lead, a personal plan from her own record with
   her doctor, and what it would work on for her; the goals a plan can
   work toward, well past diet; what she would get (her doctor, meals and
   exercise, daily monitoring, her wearables); an example day drawn with
   the member's own pieces; how it starts; what it costs, monthly or
   yearly, with the first charge and the way out beside the price; what stays free; what happens if she stops;
   then "Start my plan" and a real "Not for me" (ShowroomActions), which
   close the showroom on the tab and are the plan page's pinned footer.
   Drawn as the Figma "Hol" Plan (5 Oct 2026, the extended frame): the
   teal tinted card with the focus areas as three lifted tiles, the day's
   rows on a white card, and the rest as lifted cards whose lines sit on
   an inset grey panel.

   Inlay speaks here, never her doctor: "your doctor" is named only as a
   role, with no physician's name, photo or quote anywhere near the price
   (B-03). The words are placeholders from lib/plans.ts until Fynn's team
   sends the final copy. The price is read from the one
   placeholder in lib/plans.ts. `from` says where she came from, and sets
   the first line and the focus row it highlights. */

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

/** How a plan starts, in the order she would live it: the first step is
    where she starts, ticked in teal; the rest wait in grey. */
const HOW_IT_STARTS: { label: string; meta?: string; first?: boolean }[] = [
  { label: "Tell us about your goals and your week", meta: "About 10 minutes", first: true },
  { label: "We draft your plan from your own record" },
  { label: "Your doctor reviews and approves it" },
  { label: "You start, and we book your first tests" },
]

const COSTS = ["No charge until your doctor approves your plan", "Monthly: cancel anytime in Profile", "Tests and imaging are priced when you book them"]

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

/** Ticked lines on the inset panel: a 14 teal check and 14 words. */
function Ticks({ lines }: { lines: readonly (string | { text: string; soon?: boolean })[] }) {
  return (
    <>
      {lines.map((l) => {
        const line = typeof l === "string" ? { text: l } : l
        return (
          <View key={line.text} style={styles.tick} accessible accessibilityLabel={line.soon ? `${line.text}, coming soon` : line.text}>
            <View style={styles.checkBox}>
              <Check size={14} color={color.primary} />
            </View>
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
        <Text style={mode === "tab" ? styles.body : styles.lead}>{UPSELL_LEAD}</Text>
        {!!context.line && <Text style={styles.body}>{context.line}</Text>}
        <Text style={styles.label}>Where yours would start:</Text>
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

      <Lifted title="What a plan can help you do">
        <Ticks lines={GOALS.map((g) => g.text)} />
      </Lifted>

      <Lifted title="What you get">
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefit} accessible accessibilityLabel={`${b.title}. ${b.text}${b.soon ? ". Coming soon" : ""}`}>
            <View style={styles.benefitHead}>
              <View style={styles.checkBox}>
                <Check size={14} color={color.primary} />
              </View>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              {b.soon && <Tag tone="muted">Coming soon</Tag>}
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </Lifted>

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

      <Lifted title="What it costs">
        <View style={styles.prices}>
          {CADENCES.map((c) => {
            const b = TIERS.optimization.billing[c]
            return (
              <View key={c} style={styles.priceOption} accessible accessibilityLabel={`${b.name}, ${priceLabel(c)}, ${b.save ?? b.note}`}>
                <Text style={styles.priceName}>{b.name}</Text>
                <Text style={styles.priceValue}>{b.price}</Text>
                <Text style={styles.pricePer}>{b.period}</Text>
                <Text style={styles.priceNote}>{b.save ?? b.note}</Text>
              </View>
            )
          })}
        </View>
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
    padding: space.gutter,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
    boxShadow: card.shadow,
  },
  cardTitle: { ...type.section },
  lead: { ...type.section },
  body: { ...type.body },
  // "Where yours would start:" heads the tiles, a step above their words.
  label: { ...type.sectionLabel, marginTop: space.stack },
  // Three lifted tiles side by side, as tall as the tallest.
  focus: { flexDirection: "row", alignItems: "stretch", gap: space.inline },
  focusTile: {
    flex: 1,
    gap: space.stack,
    paddingHorizontal: 10,
    paddingVertical: space.compact,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  // The area she came from, edged in teal.
  focusTileOn: { borderColor: color.primary },
  focusName: { ...type.title, marginTop: space.stack },
  focusWhy: { ...type.label },

  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },

  // The day's rows: 12 apart over a hairline.
  day: { gap: space.card },
  rule: { height: 0.8, backgroundColor: hairline.rule },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.lead },
  dayWords: { flex: 1, gap: space.stack },
  dayTitle: { ...type.title },
  dayMeta: { ...type.label },

  lifted: {
    gap: space.item,
    padding: space.gutter,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LIFTED_EDGE,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  liftedHead: { gap: space.stack },
  // Every card's title the same level as the top card's.
  liftedTitle: { ...type.section },
  inset: { gap: space.card, padding: space.compact, borderRadius: 8, backgroundColor: surface.inset },
  // A check sits on the first line of its words, however many they wrap to.
  checkBox: { height: 20, justifyContent: "center" },
  tick: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  tickText: { flexShrink: 1, ...type.chip },
  // A benefit: its ticked title, its line under the words.
  benefit: { gap: space.line },
  benefitHead: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  benefitTitle: { flexShrink: 1, ...type.title },
  benefitText: { ...type.label, paddingLeft: 14 + space.inline },

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

  // The two ways to pay side by side, each a white tile on the inset.
  prices: { flexDirection: "row", gap: space.inline },
  priceOption: { flex: 1, gap: space.line, padding: space.compact, borderRadius: 8, backgroundColor: "#FFFFFF" },
  priceName: { ...type.metaStrong, color: ink.detail },
  priceValue: { ...type.section, color: color.primaryText },
  pricePer: { ...type.label, color: ink.detail },
  priceNote: { ...type.label, color: ink.primary },
  freeLine: { ...type.body },

  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.inline },
})
