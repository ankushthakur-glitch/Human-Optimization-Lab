import * as React from "react"

import { MEMBER, membershipOn } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_GAPS, MARKER_CARE, ORDERS, type Biomarker, type FocusArea } from "@/lib/record"
import { classify, needsReview, valueText, watchList, type Trend } from "@/lib/trends"

/* The one cap service behind every offer of the Optimization membership
   (catalog 5.2 to 5.5, FINAL-SPEC D.3). Every touchpoint asks it before it
   shows: the marker page's "Want to change course?", the line after an
   assistant answer, the allowance at its limit, the assistant's way to the
   plan page when she asks about the plan, the score page link, the new
   results line, a member feature she taps, the home's plan card, the
   quarterly recap, and the Plan tab.

   decide() says no, in this order, when:
   1. she is a member (paused included);
   2. the screen's own clinical check says the offer is not eligible;
   3. (a pull, the Plan tab, always shows from here on)
   4. offers are switched off (OFFERS_ENABLED), consent is not signed,
      sharing is off, the record is still arriving, or setup is not done;
   5. it is her first session;
   6. her readiness is low (1 or 2 of 5);
   7. "Not for me" in the last 90 days, or a membership cancelled in the
      last 90 days;
   8. "Not now" hides this touchpoint and key;
   9. (a tap shows from here on; a static placement shows, as its quiet
      variant at readiness 3 when it has one)
   10. for a proactive prompt: two "Not now" in 30 days pause prompts for
      60 days; readiness 3 allows only its quiet variant; a held out
      patient never gets one; one has already shown this session; four
      were shown in the last 30 days; or its own cap is reached.

   What she chose is kept in the onboarding store (`offers`); which prompt
   took this session's one slot is kept in memory, so a new launch is a new
   session. No offer ever goes out by push, SMS or email. */

/** Counsel's switch for record triggered offers (H.1): off, every offer
    but the Plan tab she opens herself says no. On in the prototype. */
export const OFFERS_ENABLED = true

/** The share of patients held out of every proactive prompt, to measure
    the lift (D.7): 0 in the prototype, 0.1 in production. */
export const HOLDOUT_SHARE = 0

export type Touchpoint =
  | "change-course"
  | "assistant-answer"
  | "allowance"
  | "assistant-plan"
  | "score-page"
  | "new-results"
  | "member-feature"
  | "home-benefits"
  | "quarterly-recap"
  | "plan-tab"

/** proactive: a suggestion she did not ask for, counted against the caps.
    static: a fixed, quiet placement, not counted.
    tap: the answer to something she tapped or tried, not counted.
    pull: a place she opened to see the plan, never capped. */
export type OfferKind = "proactive" | "static" | "tap" | "pull"

type Rule = {
  kind: OfferKind
  /** The lowest readiness band it may show at. */
  readiness: "high" | "mid"
  /** At mid readiness it shows as a quiet text link instead of a card. */
  soft?: boolean
  /** How long "Not now" hides it; Infinity until its key changes. */
  hideDays?: number
  /** At most this many impressions in 30 days. */
  perMonth?: number
  /** At most one impression in this many days. */
  everyDays?: number
}

export const TOUCHPOINTS: Record<Touchpoint, Rule> = {
  "change-course": { kind: "proactive", readiness: "high", soft: true, hideDays: Infinity },
  "assistant-answer": { kind: "proactive", readiness: "high", perMonth: 3, hideDays: Infinity },
  "new-results": { kind: "proactive", readiness: "high", everyDays: 30, hideDays: Infinity },
  "score-page": { kind: "static", readiness: "high", hideDays: 30 },
  "home-benefits": { kind: "static", readiness: "mid", soft: true, hideDays: 60 },
  "quarterly-recap": { kind: "static", readiness: "mid", hideDays: Infinity },
  allowance: { kind: "tap", readiness: "mid" },
  // "See the plan" under the assistant's answer to a question she asked
  // about the plan; the answer itself always stands.
  "assistant-plan": { kind: "tap", readiness: "mid" },
  "member-feature": { kind: "tap", readiness: "mid" },
  "plan-tab": { kind: "pull", readiness: "mid" },
}

export const CAPS = {
  perSession: 1,
  per30Days: 4,
  notNowLimit: 2,
  notNowWindowDays: 30,
  notNowPauseDays: 60,
  notForMeDays: 90,
  /** No offers this long after a membership is cancelled, but the Plan tab. */
  cancelledDays: 90,
} as const

/** What the store keeps (onboarding field `offers`). */
export type OfferLog = {
  /** App sessions so far, counted once per launch by the first offer check. */
  sessions?: number
  /** Every impression: which touchpoint, for what, when, in which session. */
  shown?: { id: Touchpoint; key?: string; at: string; session: string; soft?: boolean }[]
  /** "Not now" and "Hide for now". */
  notNow?: { id: Touchpoint; key?: string; at: string }[]
  /** The last "Not for me". */
  notForMe?: string
  /** Taps on an offer's action, for measuring (first party only, L-45). */
  opened?: { id: Touchpoint; key?: string; at: string }[]
  /** The plan's own events (D.7): the plan viewed, from where, and the
      checkout started and completed. */
  events?: { name: PlanEvent; from?: string; at: string }[]
  /** The readiness answer from the latest check in, which replaces the why
      conversation's, with the scale it was asked on. */
  readiness?: { value: number; at: string; outOf?: 5 | 10 }
}

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

export type OfferDecision = {
  show: boolean
  /** Show it as a quiet text link, not a card (readiness 3). */
  soft: boolean
  /** Why not, for the /demo offer log. */
  reason?: string
}

const DAY = 86400000
const ageDays = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / DAY

/* ------------------------------------------------------------ session -- */

/** This launch: its id, and the one proactive prompt it has shown. */
const session: { id: string; claim?: string; counted: boolean } = {
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  counted: false,
}
const listeners = new Set<() => void>()
let version = 0
const emit = () => {
  version++
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => version

const claimOf = (id: Touchpoint, key?: string) => `${id}:${key ?? ""}`

/* ----------------------------------------------------------- readiness -- */

/** Readiness on the why conversation's own scale, 1 to 5 ("Not ready", "A
    little", "Somewhat", "Quite", "Ready now"). A later check in replaces
    it; one asked out of 10 is halved. Unknown when never answered. */
export function readinessOf(s: Snapshot): number | undefined {
  const checkIn = s.offers?.readiness
  const value = checkIn ? (checkIn.outOf === 10 ? checkIn.value / 2 : checkIn.value) : s.why?.readiness
  return value === undefined || Number.isNaN(value) ? undefined : value
}

/** 4 or 5 is "high": every offer may show. 3 is "mid": static placements
    and the quiet link variants only. 1 or 2 is "low": no offers until the
    next check in (B-05 on the app's scale, Q-28). Unanswered reads as
    "mid". */
export function readinessBand(s: Snapshot): "low" | "mid" | "high" {
  const r = readinessOf(s)
  if (r === undefined) return "mid"
  return r < 3 ? "low" : r >= 4 ? "high" : "mid"
}

/** Her first session (B-02): fewer than two launches, this one included
    before its count is saved. No offers anywhere. */
export function firstSession(s: Snapshot): boolean {
  return (s.offers?.sessions ?? 0) + (session.counted ? 0 : 1) < 2
}

/** A stable share in [0, 1) for this account, for the holdout. */
function shareOf(s: Snapshot): number {
  const key = s.signedAs ?? `${s.profile?.firstName ?? ""} ${s.profile?.lastName ?? ""} ${s.profile?.dateOfBirth ?? ""}`
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

/** Held out of every proactive prompt, to measure what the prompts add. */
export const heldOut = (s: Snapshot) => HOLDOUT_SHARE > 0 && shareOf(s) < HOLDOUT_SHARE

/* ---------------------------------------------------------------- rules -- */

export const isMember = (s: Snapshot) => membershipOn(s.membership)

/** True while two "Not now" taps within 30 days keep proactive prompts off. */
export function pausedUntil(log: OfferLog): Date | undefined {
  const taps = (log.notNow ?? [])
    .filter((n) => TOUCHPOINTS[n.id]?.kind === "proactive" || TOUCHPOINTS[n.id]?.kind === "static")
    .map((n) => Date.parse(n.at))
    .sort((a, b) => a - b)
  let until: number | undefined
  for (let i = CAPS.notNowLimit - 1; i < taps.length; i++) {
    if (taps[i] - taps[i - CAPS.notNowLimit + 1] <= CAPS.notNowWindowDays * DAY) until = taps[i] + CAPS.notNowPauseDays * DAY
  }
  return until === undefined ? undefined : new Date(until)
}

const counted = (log: OfferLog) => (log.shown ?? []).filter((x) => TOUCHPOINTS[x.id]?.kind === "proactive" && !x.soft)

/** Whether a touchpoint may show now, and why not (the /demo offer log).
    Pure: the hook below adds the session count and the store. */
export function decide(s: Snapshot & { loaded?: boolean }, id: Touchpoint, opts: { eligible?: boolean; key?: string } = {}, now: Date = new Date()): OfferDecision {
  const rule = TOUCHPOINTS[id]
  const no = (reason: string): OfferDecision => ({ show: false, soft: false, reason })
  if (s.loaded === false) return no("Loading")
  if (isMember(s)) return no("A member")
  if (opts.eligible === false) return no("Not eligible here")
  if (rule.kind === "pull") return { show: true, soft: false }
  if (!OFFERS_ENABLED) return no("Offers switched off")
  if (s.consent === "declined" && s.consentAt) return no("Sharing is off")
  if (s.consent !== "signed" || s.step !== "done") return no("Record not here yet")
  if (s.records?.status === "building") return no("Record still arriving")
  const log = s.offers ?? {}
  if (firstSession(s)) return no("First session")
  const band = readinessBand(s)
  if (band === "low") return no("Readiness")
  if (log.notForMe && ageDays(log.notForMe, now) < CAPS.notForMeDays) return no("Not for me")
  if (s.membership?.cancelledAt && ageDays(s.membership.cancelledAt, now) < CAPS.cancelledDays) return no("Recently cancelled")
  const hidden = (log.notNow ?? []).some((n) => n.id === id && (n.key ?? "") === (opts.key ?? "") && ageDays(n.at, now) < (rule.hideDays ?? 0))
  if (hidden) return no("Not now")
  if (rule.kind === "tap") return { show: true, soft: false }
  // A static placement: in full at high readiness; at mid only the ones
  // allowed there, as their quiet link when they have one.
  if (rule.kind === "static") {
    if (band === "high") return { show: true, soft: false }
    return rule.readiness === "mid" ? { show: true, soft: rule.soft === true } : no("Readiness")
  }

  // Proactive from here on.
  const paused = pausedUntil(log)
  if (paused && now < paused) return no("Paused after two Not now")
  if (band === "mid") return rule.soft ? { show: true, soft: true } : no("Readiness")
  if (heldOut(s)) return no("Held out")
  const claim = claimOf(id, opts.key)
  if (session.claim === claim) return { show: true, soft: false }
  if (session.claim) return no("One prompt a session")
  const recent = counted(log).filter((x) => ageDays(x.at, now) < 30)
  if (new Set(recent.map((x) => x.session)).size >= CAPS.per30Days) return no("Four in 30 days")
  const mine = recent.filter((x) => x.id === id)
  if (rule.perMonth !== undefined && mine.length >= rule.perMonth) return no("This prompt's monthly cap")
  if (rule.everyDays !== undefined && counted(log).some((x) => x.id === id && ageDays(x.at, now) < rule.everyDays!)) return no("Shown recently")
  return { show: true, soft: false }
}

/* --------------------------------------------------------------- writes -- */

/* Several offers can write in the same moment (the session count and the
   home card on the first render). Each write builds on the newest log this
   module wrote, unless the store has since been replaced from elsewhere (a
   demo seed), so no write is lost. */
let latest: OfferLog | undefined
const superseded = new WeakSet<object>()

function baseLog(fromStore: OfferLog | undefined): OfferLog {
  if (latest && (fromStore === latest || (fromStore && superseded.has(fromStore)))) return latest
  return fromStore ?? {}
}

const keep = <T extends { at: string }>(list: T[] | undefined, now: Date) => (list ?? []).filter((x) => ageDays(x.at, now) < 180)

function write(save: (patch: Snapshot) => Promise<void>, fromStore: OfferLog | undefined, change: (log: OfferLog) => OfferLog) {
  const base = baseLog(fromStore)
  const next = change(base)
  superseded.add(base)
  if (fromStore) superseded.add(fromStore)
  latest = next
  save({ offers: next }).catch(() => {})
}

/* --------------------------------------------------------------- events -- */

/** A plan event, measured first party only (D.7, L-45): no pixel, no third
    party, nothing leaves the device in the prototype. */
export type PlanEvent = "plan_viewed" | "checkout_started" | "checkout_completed"

/** Logs a plan event to the console while building and to the offer log
    the /demo page shows: "plan_viewed" with where she came from,
    "checkout_started", "checkout_completed". */
export function logEvent(s: { offers?: OfferLog; save: (patch: Snapshot) => Promise<void> }, name: PlanEvent, props: { from?: string } = {}) {
  const now = new Date()
  if (__DEV__) console.log(`[event] ${name}${props.from ? ` from ${props.from}` : ""}`)
  write(s.save, s.offers, (l) => ({ ...l, events: [...keep(l.events, now), { name, ...props, at: now.toISOString() }] }))
}

/* ----------------------------------------------------------------- hook -- */

export type Offer = OfferDecision & {
  /** The design proposals' names: a card, or a one line link when soft.
      `variant` is the record kit Nudge's own prop value, so a card
      touchpoint can pass it straight through (`<Nudge variant={offer.variant}>`);
      the assistant draws its offer `inline` whatever this says. */
  visible: boolean
  variant: "card" | "link"
  /** Call when it is on screen: claims this session's one proactive slot and
      records the impression once a session. */
  markShown: () => void
  /** Call when she taps the offer's action ("See how the plan works"). */
  markOpened: () => void
  /** "Not now" or "Hide for now". */
  notNow: () => void
  /** "Not for me": offers off for 90 days. */
  notForMe: () => void
  /** Takes back "Not for me". */
  undoNotForMe: () => void
}

/** Ask whether a touchpoint may show, and get its actions. `eligible` is the
    screen's own clinical check (see `changeCourse` for the marker page);
    `key` names what it is about (a marker and its latest result, a
    conversation turn, a results batch), so "Not now" hides only that. */
export function useOffer(id: Touchpoint, opts: { eligible?: boolean; key?: string } = {}): Offer {
  const onboarding = useOnboarding()
  React.useSyncExternalStore(subscribe, snapshot, snapshot)
  const { loaded, save } = onboarding
  const ref = React.useRef(onboarding)
  ref.current = onboarding

  // Count this launch once, on the first offer check after the store loads.
  React.useEffect(() => {
    if (!loaded || session.counted) return
    session.counted = true
    write(save, ref.current.offers, (log) => ({ ...log, sessions: (log.sessions ?? 0) + 1 }))
  }, [loaded, save])

  const decision = decide(onboarding, id, opts)
  const { eligible, key } = opts

  const markShown = React.useCallback(() => {
    const now = new Date()
    const d = decide(ref.current, id, { eligible, key }, now)
    if (!d.show) return
    const rule = TOUCHPOINTS[id]
    if (rule.kind === "proactive" && !d.soft && !session.claim) {
      session.claim = claimOf(id, key)
      emit()
    }
    const log = baseLog(ref.current.offers)
    if ((log.shown ?? []).some((x) => x.session === session.id && x.id === id && (x.key ?? "") === (key ?? ""))) return
    write(save, ref.current.offers, (l) => ({
      ...l,
      shown: [...keep(l.shown, now), { id, key, at: now.toISOString(), session: session.id, ...(d.soft ? { soft: true } : {}) }],
    }))
  }, [id, eligible, key, save])

  const markOpened = React.useCallback(() => {
    const now = new Date()
    write(save, ref.current.offers, (l) => ({ ...l, opened: [...keep(l.opened, now), { id, key, at: now.toISOString() }] }))
  }, [id, key, save])

  const notNow = React.useCallback(() => {
    const now = new Date()
    write(save, ref.current.offers, (l) => ({ ...l, notNow: [...keep(l.notNow, now), { id, key, at: now.toISOString() }] }))
  }, [id, key, save])

  const notForMe = React.useCallback(() => {
    write(save, ref.current.offers, (l) => ({ ...l, notForMe: new Date().toISOString() }))
  }, [save])

  const undoNotForMe = React.useCallback(() => {
    write(save, ref.current.offers, (l) => ({ ...l, notForMe: undefined }))
  }, [save])

  return { ...decision, visible: decision.show, variant: decision.soft ? "link" : "card", markShown, markOpened, notNow, notForMe, undoNotForMe }
}

/** Shows the offer's impression once it renders: `useShown(offer)` in the
    component that draws it. */
export function useShown(offer: Pick<Offer, "show" | "markShown">) {
  const { show, markShown } = offer
  React.useEffect(() => {
    if (show) markShown()
  }, [show, markShown])
}

/** Starts a new app session in memory (a review seed opening the app as
    someone else): no prompt shown yet, and the launch counted again. */
export function newSession() {
  session.id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  session.claim = undefined
  session.counted = false
  latest = undefined
  emit()
}

/** Clears every offer choice and impression, for the review build. */
export function resetOffers(save: (patch: Snapshot) => Promise<void>, fromStore?: OfferLog) {
  session.claim = undefined
  emit()
  write(save, fromStore, (l) => ({ sessions: Math.max(l.sessions ?? 0, 2) }))
}

/* ------------------------------------------------------- change course -- */

const PLURAL_RESULTS = { results: "results", readings: "readings", measurements: "measurements" } as const

/** Whether a marker may carry "Want to change course?" (must have 7), and
    its copy. Only a trend going the wrong way: out of range or borderline,
    moving away from the range across two or more comparable results, tied
    to a plan focus, inside the clinical review limits, and no linked order
    overdue or care gap being reminded about (a planned order is fine: the
    marker page shows it above). Steady and improving markers never
    qualify. The cap service still decides; pass `eligible` and `key` to
    useOffer, or call useChangeCourse. */
export function changeCourse(b: Biomarker, s: Snapshot = {}) {
  const t = classify(b)
  const why: string[] = []
  if (t.count < 2) why.push("fewer than two comparable results")
  if (t.status !== "out" && t.status !== "borderline") why.push("in range")
  if (t.meaning !== "away") why.push("not moving away from the range")
  if (!b.focus) why.push("not a plan focus")
  if (needsReview(b, t.latest)) why.push("needs the doctor first")
  if (careBlocks(b.id, s)) why.push("a care step is overdue")
  const latest = t.latest
  const first = t.first
  const name = b.short ?? b.name.toLowerCase()
  const has = b.plural ? "have" : "has"
  const noun = PLURAL_RESULTS[t.noun]
  const body =
    first && latest
      ? `Your ${name} ${has} gone from ${valueText(b, first)} to ${valueText(b, latest)} across your last ${t.count} ${noun}. We can help you work on it, one small step at a time.`
      : ""
  return {
    eligible: why.length === 0,
    /** Why not, for review builds. */
    why,
    /** Hides "Not now" for this marker until a new result arrives. */
    key: `${b.id}@${latest?.at ?? latest?.date ?? ""}`,
    focus: b.focus,
    title: "Want to change course?",
    body,
    meta: "Reviewed by your physician before it starts.",
    action: "See how the plan works",
    dismiss: "Not now",
    /** The quiet variant at middling readiness. */
    link: "Want to change course? See how a plan works",
    /** The marker page's card: what a plan adds to what she already sees
        for free. The intervention only, never the facts about her result. */
    adds: {
      title: "What a plan adds",
      points: [
        `Your own ${name} target and timeline`,
        "Meals and exercise built for you",
        "Weekly progress, with adjustments",
        `${MEMBER.doctorShort} reviews and approves it`,
        `A forecast of where your ${name} ${b.plural ? "are" : "is"} heading`,
        "More AI credit for your assistant",
      ],
      note: "This page stays free.",
      action: "See plans",
    },
  }
}

/** A linked order is overdue, or a linked care gap is being reminded about
    and not booked: the clinical step comes first. */
export function careBlocks(markerId: string, s: Snapshot = {}): boolean {
  const care = MARKER_CARE[markerId]
  if (!care) return false
  const overdue = (care.orders ?? []).some((id) => ORDERS.find((o) => o.id === id)?.state === "overdue" && !s.bookings?.[id])
  const reminded = (care.gaps ?? []).some((id) => {
    const gap = CARE_GAPS.find((g) => g.id === id)
    return gap && gap.reminders > 0 && !s.booked?.[id]
  })
  return overdue || reminded
}

/** The marker page's offer, ready to draw: eligibility from the data and the
    cap service's decision together. */
export function useChangeCourse(b: Biomarker | undefined) {
  const onboarding = useOnboarding()
  // Members never see it; the cap service says so too, this keeps the copy
  // from being built for them.
  const course = b ? changeCourse(b, onboarding) : undefined
  const offer = useOffer("change-course", { eligible: Boolean(course?.eligible), key: course?.key })
  return { ...offer, copy: course }
}

/* ---------------------------------------------------------- plan focus -- */

const FOCUS_ORDER: FocusArea[] = ["blood sugar", "weight", "heart", "bone"]

/** The focus areas as a plan names them (row titles). */
export const FOCUS_NAME: Record<FocusArea, string> = { "blood sugar": "Blood sugar", weight: "Weight", heart: "Heart", bone: "Bone health" }

/** What she said she wants to improve, as the plan's focus areas. */
const SAID_AREA: Record<string, FocusArea> = { "Blood sugar": "blood sugar", Weight: "weight", "Blood pressure": "heart" }

const yearOf = (t: number) => new Date(t).getFullYear()

/** One fact for a focus area, her own words first for weight, else from
    her record: "Your A1c is 5.9%, up since 2022", "Your LDL is 162 and
    your triglycerides 188, both up since 2022", "You said you'd like to
    work on your weight". Never a disease name. */
function reasonFor(area: FocusArea, said: FocusArea[], watched: Trend[]): string {
  const saidIt = said.includes(area)
  const ownWords = `You said you'd like to work on your ${area === "heart" ? "heart health" : area}`
  if (area === "weight" && saidIt) return ownWords
  const mine = watched.filter((t) => t.marker.focus === area && t.latest)
  const moving = mine.filter((t) => t.meaning === "away")
  const pick = (moving.length ? moving : mine).slice(0, 2)
  if (!pick.length) return saidIt ? ownWords : `Part of keeping your ${area === "heart" ? "heart" : area} healthy`
  const nameOf = (t: Trend) => t.marker.short ?? t.marker.name.toLowerCase()
  const direction = (t: Trend) => (t.movement === "rising" ? "up" : t.movement === "falling" ? "down" : undefined)
  const since = Math.min(...pick.map((t) => yearOf(t.first!.t)))
  if (pick.length === 2 && direction(pick[0]) && direction(pick[0]) === direction(pick[1])) {
    const [a, b] = pick
    return `Your ${nameOf(a)} ${a.marker.plural ? "are" : "is"} ${a.value} and your ${nameOf(b)} ${b.value}, both ${direction(a)} since ${since}`
  }
  const t = pick[0]
  const verb = t.marker.plural ? "are" : "is"
  const how = direction(t)
    ? `${direction(t)} since ${yearOf(t.first!.t)}`
    : t.status === "out"
      ? `${t.side === "below" ? "below" : "above"} your range`
      : "close to the edge of your range"
  return `Your ${nameOf(t)} ${verb} ${t.valueWithUnit}, ${how}`
}

/** What a plan would focus on for her: her own "improve" answers first,
    then the markers she is watching, with one fact each for the showroom
    (`reasons[i]` belongs to `areas[i]`): "blood sugar and weight". Never a
    disease name and never a program as a product (B-01). */
export function planFocus(s: Snapshot = {}, markers?: Biomarker[], most = 2) {
  const improve = s.why?.improve ?? []
  const list = watchList(markers, { improve })
  const watched = list.map((t) => t.marker.focus).filter((f): f is FocusArea => Boolean(f))
  const said = improve.map((a) => SAID_AREA[a]).filter((f): f is FocusArea => Boolean(f))
  const areas = [...new Set([...said.filter((f) => watched.includes(f)), ...watched])]
  const chosen = (areas.length ? areas : FOCUS_ORDER.slice(0, 1)).slice(0, most)
  return {
    areas: chosen,
    /** "blood sugar and weight" */
    words: chosen.length > 1 ? `${chosen.slice(0, -1).join(", ")} and ${chosen[chosen.length - 1]}` : chosen[0],
    /** One fact per area, in the same order. */
    reasons: chosen.map((area) => reasonFor(area, said, list)),
  }
}
