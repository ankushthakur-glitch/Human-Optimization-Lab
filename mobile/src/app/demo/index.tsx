import { router } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { ArrowsClockwise, ChartLine, Target, User, Warning } from "@/components/ph"
import { Block, Group, NeedsRow, toast } from "@/components/record-kit"
import { giveBackQuestions, spendAllQuestions } from "@/lib/allowance"
import { useAuth } from "@/lib/auth"
import { showDate } from "@/lib/dates"
import { DEMOS } from "@/lib/demo"
import { addDays, clockOf, localDay, shortDay } from "@/lib/member"
import { TOUCHPOINTS, decide, resetOffers, type OfferKind, type Touchpoint } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { color } from "@/lib/theme"

/* Not a product screen, and never linked from one: the review controls
   (FINAL-SPEC C.29). Every sample patient as a row that opens the app as
   her (/demo/<id> seeds this device and lands on home), switches that
   change this device the way the portal or time would (the plan's approval
   and new readings live here, not on the Plan tab), the offer log so HOL
   can watch the caps keep the selling subtle, and the review galleries.
   Like errors/, it sits outside every guard, so it opens whatever the
   account state. Drawn as the Figma "Hol" Record tab: quiet section labels
   over lifted cards of rows, each row on a round teal icon tile. */

type Variant = { id: string; line: string; member?: boolean }

/** Each sample patient's one line (FINAL-SPEC B.4), in the order a review
    walks through them. A seed added to lib/demo.ts without a line here
    still gets a row; a line without a seed gets none. */
const VARIANTS: Variant[] = [
  { id: "free", line: "Free Olivia, onboarded 4 days ago, Dr. Patel still checking, readiness Quite" },
  { id: "free-checked", line: "Dr. Patel finished the review 2 days ago" },
  { id: "free-new-results", line: "A new Quest batch arrived today" },
  { id: "free-capped", line: "8 of 8 free questions used" },
  { id: "free-quiet", line: "Readiness Somewhat, 3 of 5" },
  { id: "free-not-ready", line: "Readiness A little, 2 of 5" },
  { id: "free-first", line: "First session" },
  { id: "free-steady", line: "Nothing to watch" },
  { id: "free-caught-up", line: "Mammogram and follow up booked, medicines answered" },
  { id: "building", line: "Record still arriving" },
  { id: "declined", line: "Never connected" },
  { id: "withdrawn", line: "Turned off sharing 2 days ago" },
  { id: "cancelled", line: "Cancelled 20 days ago, back on the free record" },
  { id: "member", line: "Member Olivia, weight, blood sugar and heart, week 23", member: true },
  { id: "member-bone", line: "Member Olivia with a bone plan", member: true },
  { id: "member-nothing-logged", line: "Nothing logged yesterday", member: true },
  { id: "member-partial", line: "Dinner not logged yesterday", member: true },
  { id: "member-setup", line: "Just joined, step 3 of 5", member: true },
  { id: "member-review", line: "Version 1 with Dr. Patel", member: true },
  { id: "member-redraft", line: "Version 3 with Dr. Patel, version 2 live", member: true },
  { id: "paused", line: "Member, plan paused", member: true },
]

/** Own keys only, so a name such as "toString" is never a seed. */
const seeded = (id: string) => Object.prototype.hasOwnProperty.call(DEMOS, id)

/** Every seed lib/demo.ts has, with its line where known. */
function seeds(): Variant[] {
  const known = new Set(VARIANTS.map((v) => v.id))
  const extra = Object.keys(DEMOS)
    .filter((id) => !known.has(id))
    .map((id) => ({ id, line: "", member: id.startsWith("member") }))
  return [...VARIANTS.filter((v) => seeded(v.id)), ...extra]
}

/** The batch of new results the record's sample data knows (FINAL-SPEC E.1). */
const NEW_BATCH = "quest-new"

const KIND_WORD: Record<OfferKind, string> = { proactive: "Proactive", static: "Static", tap: "On tap", pull: "Pull" }

/** The icon on every switch that changes this device. */
const SWITCH = <ArrowsClockwise size={16} color={color.primary} />

/** "Oct 1, 2:30 PM" */
const stamp = (at: string) => {
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? at : `${shortDay(d)}, ${clockOf(d)}`
}

export default function ReviewScreen() {
  const onboarding = useOnboarding()
  const auth = useAuth()
  const [leaving, setLeaving] = React.useState(false)
  const list = seeds()
  const log = onboarding.offers ?? {}

  // Start over lands on activation once the sign out has reached the
  // guards, so the screen it opens exists by then.
  React.useEffect(() => {
    if (leaving && auth.status === "signedOut") router.replace("/activate")
  }, [leaving, auth.status])

  // A sample patient replaces this page, so home is the bottom of the stack.
  const open = (id: string) => router.replace({ pathname: "/demo/[variant]", params: { variant: id } })

  async function finishReview() {
    await onboarding.save({ review: { status: "checked", at: new Date().toISOString() } })
    toast("Dr. Patel checked the record today")
  }

  async function newResults() {
    const others = (onboarding.batches ?? []).filter((b) => b.id !== NEW_BATCH)
    await onboarding.save({ batches: [...others, { id: NEW_BATCH, at: new Date().toISOString(), source: "Quest", count: 4 }] })
    toast("4 new results from Quest")
  }

  async function spendAll() {
    await spendAllQuestions(onboarding, onboarding.save)
    toast("All of this week's AI credit used")
  }

  async function returnAll() {
    await giveBackQuestions(onboarding, onboarding.save)
    toast("This month's AI credit is back")
  }

  function resetLimits() {
    resetOffers(onboarding.save, onboarding.offers)
    toast("Offer limits reset")
  }

  /** Dr. Patel approves the version with her in the portal: it goes live,
      dated today, and the one before is kept. */
  async function approve() {
    const plan = onboarding.plan
    if (plan?.status !== "review") return toast("No plan is with Dr. Patel")
    const why = plan.versions.length ? "New readings from home" : "Your first plan"
    await onboarding.save({
      plan: { status: "live", version: plan.version, versions: [{ version: plan.version, approved: showDate(), why }, ...plan.versions] },
    })
    toast(`Version ${plan.version} approved`)
  }

  /** New readings redraft a live plan; the live version stays meanwhile. */
  async function redraft() {
    const plan = onboarding.plan
    if (plan?.status !== "live") return toast("No live plan to redraft")
    await onboarding.save({ plan: { ...plan, status: "review", version: plan.version + 1 } })
    toast(`Version ${plan.version + 1} is with Dr. Patel`)
  }

  /** A cancelled membership's paid month runs out today: back to the free
      record, every plan version kept (C.17, S-67), without waiting for the
      end date. */
  async function endMembership() {
    const m = onboarding.membership
    if (m?.tier !== "optimization" || !m.cancelledAt) return toast("No cancelled membership to end")
    const kept = [...(onboarding.planHistory ?? []), ...(onboarding.plan?.versions ?? [])]
      .filter((v, i, all) => all.findIndex((w) => w.version === v.version) === i)
      .sort((a, b) => b.version - a.version)
    await onboarding.save({ membership: { ...m, tier: "free", paused: false, endsAt: new Date().toISOString() }, plan: undefined, planHistory: kept })
    toast("The membership ended today")
  }

  /** Yesterday's meals go; older days keep their sample history. */
  async function clearYesterday() {
    const day = localDay(addDays(new Date(), -1))
    const meals = { ...onboarding.meals }
    if (!meals[day]?.length) return toast("Nothing was logged yesterday")
    delete meals[day]
    await onboarding.save({ meals })
    toast("Yesterday is not logged now")
  }

  const askV2 = onboarding.demo?.assistantVersion !== 1
  async function toggleAssistant() {
    await onboarding.save({ demo: { ...onboarding.demo, assistantVersion: askV2 ? 1 : 2 } })
    toast(askV2 ? "Assistant: version 1" : "Assistant: version 2")
  }

  // Home variation: the orb has no "Ask Inlay" words, the tour's second
  // stop says it. Switching either way replays the tour on Home.
  const tourNamesAsk = !!onboarding.demo?.tourNamesAsk
  async function toggleTourAsk() {
    const { "app-tour": _seen, ...dismissed } = onboarding.dismissed ?? {}
    await onboarding.save({ demo: { ...onboarding.demo, tourNamesAsk: !tourNamesAsk }, dismissed })
    toast(tourNamesAsk ? "Home: Ask Inlay under the orb" : "Home: Ask Inlay in the tour")
  }

  // Home variation: the orb has no words; a tooltip over it says "Ask Inlay"
  // every few seconds.
  const orbTooltip = !!onboarding.demo?.orbTooltip
  async function toggleOrbTooltip() {
    await onboarding.save({ demo: { ...onboarding.demo, orbTooltip: !orbTooltip } })
    toast(orbTooltip ? "Home: Ask Inlay under the orb" : "Home: Ask Inlay in a tooltip")
  }

  async function weekCard() {
    await onboarding.save({ demo: { ...onboarding.demo, forceWeekCard: true } })
    toast("The weekly card shows today")
  }

  async function startOver() {
    await onboarding.reset()
    await auth.forget()
    toast("This device starts over")
    setLeaving(true)
  }

  const rows = (member: boolean) =>
    list
      .filter((v) => !!v.member === member)
      .map((v) => (
        <NeedsRow
          key={v.id}
          icon={member ? <Target size={16} color={color.primary} /> : <User size={16} color={color.primary} />}
          title={v.line || v.id}
          meta={`/demo/${v.id}`}
          onPress={() => open(v.id)}
        />
      ))

  // The last 20 things the cap service wrote, newest first.
  const entries = [
    ...(log.shown ?? []).map((e) => ({ what: e.soft ? "Shown as a quiet line" : "Shown", id: e.id as string, key: e.key, at: e.at })),
    ...(log.notNow ?? []).map((e) => ({ what: "Not now", id: e.id as string, key: e.key, at: e.at })),
    ...(log.opened ?? []).map((e) => ({ what: "Opened", id: e.id as string, key: e.key, at: e.at })),
    ...(log.notForMe ? [{ what: "Not for me", id: "Every offer", key: undefined, at: log.notForMe }] : []),
    ...(log.events ?? []).map((e) => ({ what: e.from ? `From ${e.from}` : "Plan event", id: e.name as string, key: undefined, at: e.at })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 20)

  return (
    <FlowScreen page title="Review">
      <Block title="Free record">
        <Group>{rows(false)}</Group>
      </Block>

      <Block title="Optimization">
        <Group>{rows(true)}</Group>
      </Block>

      <Block title="Change this device">
        <Group>
          <NeedsRow icon={SWITCH} title="Dr. Patel finishes the review" meta="The record shows as checked today" onPress={finishReview} chevron={false} />
          <NeedsRow icon={SWITCH} title="New results arrive" meta="4 results from Quest, today" onPress={newResults} chevron={false} />
          <NeedsRow icon={SWITCH} title="Use all AI credit" meta="The orb turns red, the assistant shows its limit card" onPress={spendAll} chevron={false} />
          <NeedsRow icon={SWITCH} title="Give back the AI credit" meta="A fresh month, nothing borrowed or added" onPress={returnAll} chevron={false} />
          <NeedsRow icon={SWITCH} title="Reset offer limits" meta="Clears every impression, Not now and Not for me" onPress={resetLimits} chevron={false} />
          <NeedsRow icon={SWITCH} title="Dr. Patel approves the plan" meta="The version with Dr. Patel goes live today" onPress={approve} chevron={false} />
          <NeedsRow icon={SWITCH} title="New readings arrive" meta="A new version goes to Dr. Patel, the live one stays" onPress={redraft} chevron={false} />
          <NeedsRow icon={SWITCH} title="Membership ends today" meta="A cancelled member goes back to the free record" onPress={endMembership} chevron={false} />
          <NeedsRow icon={SWITCH} title="Mark yesterday as not logged" meta="Yesterday's meals are cleared" onPress={clearYesterday} chevron={false} />
          <NeedsRow
            icon={SWITCH}
            title={askV2 ? "Assistant: version 2" : "Assistant: version 1"}
            meta={askV2 ? "Tap for version 1, the category picker" : "Tap for version 2: Ask Inlay, questions to tap"}
            onPress={toggleAssistant}
            chevron={false}
          />
          <NeedsRow
            icon={SWITCH}
            title={tourNamesAsk ? "Home: Ask Inlay in the tour" : "Home: Ask Inlay under the orb"}
            meta={tourNamesAsk ? "Tap to put the words back under the orb" : "Tap to drop the words; the tour's second stop says Ask Inlay"}
            onPress={toggleTourAsk}
            chevron={false}
          />
          <NeedsRow
            icon={SWITCH}
            title={orbTooltip ? "Home: Ask Inlay in a tooltip" : "Home: no tooltip over the orb"}
            meta={orbTooltip ? "Tap to put the words back under the orb" : "Tap to drop the words; a tooltip over the orb says Ask Inlay every few seconds"}
            onPress={toggleOrbTooltip}
            chevron={false}
          />
          <NeedsRow icon={SWITCH} title="Show the weekly card today" meta="Whatever the weekday" onPress={weekCard} chevron={false} />
          <NeedsRow icon={SWITCH} title="Start over" meta="Clears this device and signs out" onPress={startOver} chevron={false} />
        </Group>
      </Block>

      <Block title="Offer log" meta={`${log.sessions ?? 0} sessions`}>
        <Group>
          {entries.length ? (
            entries.map((e, i) => (
              <NeedsRow key={`${e.at}-${i}`} title={e.id} meta={[e.what, stamp(e.at), e.key].filter(Boolean).join(", ")} />
            ))
          ) : (
            <NeedsRow title="Nothing shown yet" />
          )}
        </Group>
      </Block>

      <Block title="Each offer now">
        <Group>
          {(Object.keys(TOUCHPOINTS) as Touchpoint[]).map((id) => {
            const d = decide(onboarding, id)
            const now = d.show ? (d.soft ? "Shows as a quiet line" : "Shows") : (d.reason ?? "Hidden")
            return <NeedsRow key={id} title={id} meta={now} right={KIND_WORD[TOUCHPOINTS[id].kind]} />
          })}
        </Group>
      </Block>

      <Block title="Review pages">
        <Group>
          <NeedsRow icon={<ChartLine size={16} color={color.primary} />} title="Kit" meta="Every kit piece and chart in every state" onPress={() => router.push("/demo/kit")} />
          <NeedsRow icon={<Warning size={16} color={color.primary} />} title="Error states" meta="Not found, offline, session expired, crash" onPress={() => router.push("/errors")} />
        </Group>
      </Block>
    </FlowScreen>
  )
}
