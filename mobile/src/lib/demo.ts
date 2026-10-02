import type { Answers } from "@/lib/conversation"
import { dayKey, monthKey, showDate } from "@/lib/dates"
import { BONE_SAMPLE_MEALS, BONE_VERSIONS, MEMBER_SCORES, PLAN_VERSIONS, SAMPLE_MEALS, addDays, clock, dayLabel, profileOf, thisWeek } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { DEMOGRAPHICS, PATIENT } from "@/lib/patient"
import { BASELINE, SETUP } from "@/lib/program"
import { localIso } from "@/lib/todo"

/* The sample patients a review can open the app as, from /demo/<id>
   (app/demo/[variant].tsx, FINAL-SPEC B.4 and E.11): most straight onto
   Home with onboarding already done, the onboarding seeds onto one step of
   setup. Each is a patch on the store; `free` and `member` are the two
   Olivias, and every other seed changes one thing:

   free                   onboarded 4 days ago, Dr. Patel still checking,
                          readiness "Quite", 2 of 8 free questions used
   free-checked           Dr. Patel finished the review 2 days ago
   free-new-results       a new Quest batch arrived today
   free-capped            every free question used this month
   free-quiet             readiness "Somewhat" (3): quiet offers only
   free-not-ready         readiness "A little" (2): no offers
   free-first             her first session: no offers anywhere
   free-steady            nothing to watch
   free-caught-up         mammogram and follow up booked, medicines answered
   building               the record still arriving
   declined               never connected
   withdrawn              sharing turned off 2 days ago, data kept
   cancelled              a member who cancelled 20 days ago
   member                 Optimization member since May 3, version 2 live
   member-bone            the same member on a bone strength plan
   member-nothing-logged  nothing logged yesterday
   member-partial         dinner not logged yesterday
   member-setup           just joined, setup at step 3 of 5
   member-review          version 1 with Dr. Patel
   member-redraft         version 3 with Dr. Patel, version 2 live
   paused                 a member who paused
   onboarding-activate    a first run: signed out, on activation
   onboarding-signin      password just created, on sign in with her email
   onboarding-consent     signed in, on the consent

   Dates that depend on today are worked out from the device date when the
   seed runs (T). Sample data only, never a real patient. */

type Patch = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

export type DemoId =
  | "free"
  | "free-checked"
  | "free-new-results"
  | "free-capped"
  | "free-quiet"
  | "free-not-ready"
  | "free-first"
  | "free-steady"
  | "free-caught-up"
  | "building"
  | "declined"
  | "withdrawn"
  | "cancelled"
  | "member"
  | "member-bone"
  | "member-nothing-logged"
  | "member-partial"
  | "member-setup"
  | "member-review"
  | "member-redraft"
  | "paused"
  | "onboarding-activate"
  | "onboarding-signin"
  | "onboarding-consent"

/** Her answers from the "your why" conversation, on the app's own scales:
    importance 5, confidence 3, readiness 4 ("Quite"). */
const WHY: Answers = {
  values: "My kids, my work, and feeling like myself",
  healthyFor: "To keep up with my kids on weekend hikes",
  future: "Hiking the coast trail with my daughter next summer",
  understood: "Yes, that's it",
  reason: "To keep up with my kids and feel like myself again",
  health: "Fair",
  improve: ["Blood sugar", "Weight", "Energy"],
  share: "Yes",
  whichFuture: "The one where I make changes now",
  importance: 5,
  confidence: 3,
  readiness: 4,
  focus: "Movement",
  step: "Walk for 20 minutes after dinner, three evenings a week",
  stepConfidence: 7,
  flourish: [4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 4, 5],
  said: {},
}

/** Every field a seed can set, so a seed never keeps what an earlier
    review left behind. */
const BLANK: Patch = {
  profile: undefined,
  signedAs: undefined,
  why: undefined,
  whyAt: undefined,
  membership: undefined,
  consent: undefined,
  consentAt: undefined,
  consentPeriod: undefined,
  smsConsent: undefined,
  smsConsentAt: undefined,
  meds: undefined,
  added: undefined,
  booked: undefined,
  bookings: undefined,
  notify: undefined,
  faceId: undefined,
  seen: undefined,
  setupDone: undefined,
  intake: undefined,
  devices: undefined,
  foodLogging: undefined,
  tests: undefined,
  plan: undefined,
  log: undefined,
  checkIn: undefined,
  allowance: undefined,
  asked: undefined,
  chat: undefined,
  offers: undefined,
  meals: undefined,
  entries: undefined,
  exercises: undefined,
  questions: undefined,
  dismissed: undefined,
  review: undefined,
  records: undefined,
  sharingOffAt: undefined,
  batches: undefined,
  oneStep: undefined,
  planHistory: undefined,
  memberFocus: undefined,
  scores: undefined,
  gapsDone: undefined,
  demo: undefined,
}

/** A first run from the top: nothing saved, setup at Is this you. */
const firstRun = (): Patch => ({ ...BLANK, step: "about" })

/** Where an onboarding seed leaves the account; every other seed is signed
    in. "activate": signed out with no password, as a new install.
    "sign-in": the password just created, not yet signed in with it. */
export const DEMO_ACCOUNT: Partial<Record<DemoId, "activate" | "sign-in">> = {
  "onboarding-activate": "activate",
  "onboarding-signin": "sign-in",
}

/** A day T plus n days, at a time of day. */
const on = (n: number, h = 9, m = 0) => {
  const d = addDays(new Date(), n)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m)
}

/** The weekday after `d` (Monday after a Friday). */
function weekdayAfter(d: Date): Date {
  let next = addDays(d, 1)
  while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
  return next
}

/** This month's free questions with `n` conversations already counted. */
const questionsUsed = (n: number) => ({ month: monthKey(), threads: Array.from({ length: n }, (_, i) => `demo-${i + 1}`), batches: [] as string[] })

/** Both medicines her records differ on, answered. */
const MEDS_ANSWERED = () => ({
  atorvastatin: { answer: "taking" as const, dose: "20 mg once a day", at: on(-1, 20, 15).toISOString() },
  lisinopril: { answer: "taking" as const, at: on(-1, 20, 16).toISOString() },
})

/** The plan versions as the store keeps them. */
const versionsOf = (list: typeof PLAN_VERSIONS) => list.map((v) => ({ version: v.version, approved: v.approved, why: v.short }))

function free(): Patch {
  const onboarded = on(-4, 8, 45)
  return {
    ...BLANK,
    step: "done",
    // The consent is signed with her legal name, as the real flow saves it.
    signedAs: `${PATIENT.firstName} ${PATIENT.lastName}`,
    profile: { ...DEMOGRAPHICS },
    consent: "signed",
    consentAt: onboarded.toISOString(),
    consentPeriod: "3m",
    why: WHY,
    review: { status: "checking" },
    records: { status: "ready", at: onboarded.toISOString() },
    allowance: questionsUsed(2),
    // Not her first session and nothing declined yet: offers follow the caps.
    offers: { sessions: 3 },
    oneStep: [dayKey(on(-1))],
    added: [{ id: "added-scan", title: "Body composition scan", detail: "8 values read, 1 being checked", at: "Jul 18, 2026", unclear: 1 }],
    questions: [],
    scores: [],
    seen: [],
  }
}

function member(): Patch {
  const now = new Date()
  const yesterday = on(-1)
  const labs = thisWeek({}, now).find((i) => i.id === "repeat-labs")!
  const labsAt = new Date(labs.date.getFullYear(), labs.date.getMonth(), labs.date.getDate(), 7, 30)
  const profile = profileOf({ memberFocus: "weight" })
  const session = profile.sessionOn(yesterday)
  return {
    ...free(),
    consentAt: on(-7, 8, 45).toISOString(),
    records: { status: "ready", at: on(-7, 8, 45).toISOString() },
    membership: {
      tier: "optimization",
      programs: ["metabolic", "weight", "heart"],
      startedAt: "2026-05-03T16:20:00.000Z",
      approvedAt: "2026-05-18T17:05:00.000Z",
      card: "Visa ending 4242",
      renewalConsentAt: "2026-05-03T16:20:00.000Z",
    },
    memberFocus: "weight",
    setupDone: SETUP.map((s) => s.id),
    // Devices arrive in a later update: none connected, nothing faked.
    devices: [],
    foodLogging: "Photo",
    plan: { status: "live", version: 2, versions: versionsOf(PLAN_VERSIONS) },
    review: { status: "checked", at: "2026-05-18" },
    meals: { [dayKey(yesterday)]: SAMPLE_MEALS.yesterday, [dayKey(now)]: SAMPLE_MEALS.today },
    // Yesterday's walk and session; nothing ticked today yet.
    exercises: {
      [dayKey(yesterday)]: {
        walk: { at: on(-1, 19, 45).toISOString(), minutes: 20 },
        ...(session ? { [session.id]: { at: on(-1, 17, 50).toISOString() } } : {}),
      },
    },
    entries: [
      // Last night's blood pressure, typed in by hand.
      { id: "e-bp-1", kind: "bp", at: on(-1, 21, 5).toISOString(), value: 126, value2: 80 },
      // The Thursday weigh in.
      ...(now.getDay() === 4 ? [{ id: "e-weigh-1", kind: "weight" as const, at: on(0, 7, 5).toISOString(), value: 178.0 }] : []),
    ],
    // The repeat labs this week, booked and paid through Inlay.
    bookings: {
      "labs-nov": { where: "Quest Diagnostics, Del Mar", when: labs.when, price: "$39", paid: showDate(on(-7)), at: localIso(labsAt), time: clock(7, 30) },
    },
    meds: MEDS_ANSWERED(),
    scores: MEMBER_SCORES,
    offers: { sessions: 40 },
    // The oldest reminder was read long ago: three new on the bell.
    seen: ["m-mammogram"],
  }
}

function memberSetup(): Patch {
  return {
    ...free(),
    membership: { tier: "optimization", programs: ["metabolic", "weight", "heart"], startedAt: on(-2, 18, 10).toISOString() },
    setupDone: ["questionnaire", "medicines"],
  }
}

export const DEMOS: Record<DemoId, () => Patch> = {
  free,
  "free-checked": () => ({ ...free(), review: { status: "checked", at: on(-2, 14, 20).toISOString() } }),
  "free-new-results": () => ({
    ...free(),
    review: { status: "checked", at: on(-2, 14, 20).toISOString() },
    batches: [{ id: "quest-new", at: on(0, 7, 40).toISOString(), source: "Quest", count: 4 }],
  }),
  "free-capped": () => ({ ...free(), allowance: questionsUsed(8) }),
  "free-quiet": () => ({ ...free(), why: { ...WHY, readiness: 3 } }),
  "free-not-ready": () => ({ ...free(), why: { ...WHY, readiness: 2 } }),
  "free-first": () => ({ ...free(), offers: { sessions: 0 } }),
  "free-steady": () => ({ ...free(), demo: { steady: true } }),
  "free-caught-up": () => {
    const mammogram = on(2, 10, 15)
    return {
      ...free(),
      bookings: {
        mammogram: { where: "Basha Diagnostics, La Jolla", when: `${dayLabel(mammogram)}, 10:15 AM`, price: "$120", paid: showDate(on(-1)), at: localIso(mammogram), time: "10:15 AM" },
      },
      booked: { "follow-up": dayKey(on(5)) },
      meds: MEDS_ANSWERED(),
    }
  },
  building: () => ({ ...free(), records: { status: "building", got: 2, of: 3 }, review: undefined }),
  declined: () => ({ ...free(), consent: "declined", consentAt: undefined, review: undefined, records: undefined }),
  withdrawn: () => ({ ...free(), consent: "declined", sharingOffAt: on(-2, 19, 30).toISOString() }),
  cancelled: () => ({
    ...free(),
    membership: { tier: "free", programs: ["metabolic", "weight", "heart"], cancelledAt: on(-20, 10).toISOString(), endsAt: on(-5, 23, 59).toISOString() },
    planHistory: versionsOf(PLAN_VERSIONS),
  }),
  member,
  "member-bone": () => {
    const m = member()
    const now = new Date()
    const yesterday = on(-1)
    const session = profileOf({ memberFocus: "bone" }).sessionOn(yesterday)
    return {
      ...m,
      membership: { ...m.membership!, programs: ["bone"] },
      memberFocus: "bone",
      plan: { status: "live", version: 2, versions: versionsOf(BONE_VERSIONS) },
      meals: { [dayKey(yesterday)]: BONE_SAMPLE_MEALS.yesterday, [dayKey(now)]: BONE_SAMPLE_MEALS.today },
      exercises: {
        [dayKey(yesterday)]: {
          walk: { at: on(-1, 19, 45).toISOString(), minutes: 20 },
          ...(session ? { [session.id]: { at: on(-1, 17, 50).toISOString() } } : {}),
        },
      },
    }
  },
  // Nothing logged yesterday, and nothing yet today: "Log today's
  // breakfast" is the next step.
  "member-nothing-logged": () => {
    const m = member()
    const yesterday = dayKey(on(-1))
    const { [yesterday]: _done, ...exercises } = m.exercises ?? {}
    return { ...m, meals: {}, exercises }
  },
  "member-partial": () => {
    const m = member()
    const yesterday = dayKey(on(-1))
    return { ...m, meals: { ...m.meals, [yesterday]: SAMPLE_MEALS.yesterday.filter((x) => x.slot !== "dinner") } }
  },
  "member-setup": memberSetup,
  "member-review": () => {
    const next = weekdayAfter(new Date())
    const blood = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 7, 30)
    const after = weekdayAfter(blood)
    const dexa = new Date(after.getFullYear(), after.getMonth(), after.getDate(), 10, 0)
    const tests = { blood: `${dayLabel(blood)}, ${clock(7, 30)}`, dexa: `${dayLabel(dexa)}, ${clock(10)}` }
    const where = Object.fromEntries(BASELINE.missing.map((t) => [t.id, t.where]))
    return {
      ...memberSetup(),
      setupDone: SETUP.map((s) => s.id),
      devices: [],
      foodLogging: "Photo",
      plan: { status: "review", version: 1, versions: [] },
      tests,
      // The two starting tests as the tests step books them (lib/setup.ts
      // bookingsFor): booked through her plan, nothing paid here.
      bookings: {
        blood: { where: where.blood, when: tests.blood, price: "", paid: "", at: localIso(blood), time: clock(7, 30) },
        dexa: { where: where.dexa, when: tests.dexa, price: "", paid: "", at: localIso(dexa), time: clock(10) },
      },
    }
  },
  "member-redraft": () => ({ ...member(), plan: { status: "review", version: 3, versions: versionsOf(PLAN_VERSIONS) } }),
  paused: () => {
    const m = member()
    return { ...m, membership: { ...m.membership!, paused: true } }
  },
  "onboarding-activate": firstRun,
  "onboarding-signin": firstRun,
  // Is this you already answered, as that step saves it.
  "onboarding-consent": () => ({ ...firstRun(), step: "consent", profile: { ...DEMOGRAPHICS } }),
}
