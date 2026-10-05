import type { Answers } from "@/lib/conversation"
import { dayKey, monthKey, showDate } from "@/lib/dates"
import { BONE_SAMPLE_MEALS, BONE_VERSIONS, MEMBER_SCORES, PLAN_VERSIONS, SAMPLE_MEALS, addDays, clock, dayLabel, profileOf, thisWeek } from "@/lib/member"
import type { PastChat, useOnboarding } from "@/lib/onboarding"
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
  | "returning"

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
  chats: undefined,
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
  chatCategories: undefined,
  corrections: undefined,
  testAnswers: undefined,
}

/** A first run from the top: nothing saved, setup at Is this you. The
    chat history is filled all the same, so the assistant's drawer shows
    past chats and categories at the end of the walkthrough. */
const firstRun = (): Patch => ({ ...BLANK, step: "about", chats: pastChats(), chatCategories: CHAT_CATEGORIES })

/** Where an onboarding seed leaves the account; every other seed is signed
    in. "activate": signed out with no password, as a new install.
    "sign-in": the password just created, not yet signed in with it.
    "returning": set up long ago and signed out, back at sign in with Face
    ID offered. */
export const DEMO_ACCOUNT: Partial<Record<DemoId, "activate" | "sign-in" | "returning">> = {
  "onboarding-activate": "activate",
  "onboarding-signin": "sign-in",
  returning: "returning",
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
    chats: pastChats(),
    chatCategories: CHAT_CATEGORIES,
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
    chats: pastChats(true),
    // The oldest reminder was read long ago: three new on the bell.
    seen: ["m-mammogram"],
  }
}

function memberSetup(): Patch {
  return {
    ...free(),
    membership: { tier: "optimization", programs: ["metabolic", "weight", "heart"], startedAt: on(-2, 18, 10).toISOString() },
    setupDone: [],
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
  // The free patient, signed out: sign in with her password or Face ID.
  returning: free,
  // Is this you already answered, as that step saves it.
  "onboarding-consent": () => ({ ...firstRun(), step: "consent", profile: { ...DEMOGRAPHICS } }),
}

/* ------------------------------------------------------ chat history -- */

/** One past conversation for the assistant's chat history: her question,
    the answer, a day T minus `daysAgo` at a time of day. The messages take
    the assistant thread's own shape (app/assistant.tsx), so a past chat
    opens as it was. */
function pastChat(id: string, topic: PastChat["topic"], title: string, daysAgo: number, h: number, m: number, said: string[]): PastChat {
  const at = on(-daysAgo, h, m)
  const messages = said.map((text, i) => ({
    id: `${id}-${i}`,
    at: clock(h, m + i),
    kind: "text",
    from: i % 2 === 0 ? "patient" : "assistant",
    text,
  }))
  return { id, title, topic, startedAt: at.toISOString(), lastAt: new Date(at.getTime() + said.length * 60000).toISOString(), messages }
}

/** Olivia's past chats, newest first: her record's results, her two
    medicine differences, her visits, and for a member her plan. */
function pastChats(member = false): PastChat[] {
  const chats = [
    pastChat("past-a1c", "result", "Why is my A1c going up?", 1, 19, 10, [
      "Why is my A1c going up?",
      "Your A1c was 5.9% on Aug 14, up from 5.7% a year before. That is in the prediabetes range. Meals, sleep and activity all move it, and a repeat test in three months shows the direction.",
    ]),
    pastChat("past-atorvastatin", "medicine", "Atorvastatin dose difference", 2, 20, 5, [
      "Why do my lists show two doses of atorvastatin?",
      "Dr. Patel's list from Aug 12 says 20 mg once a day. The hospital's list from Jun 3 says 10 mg. The newer one is likely the current dose, so tell us which one you take and Dr. Patel's team will confirm.",
    ]),
    pastChat("past-dr-lee", "visit", "What to ask Dr. Lee", 3, 8, 40, [
      "What should I ask Dr. Lee at my cardiology follow up?",
      "Three good ones: what the echocardiogram is looking for, whether your blood pressure of 134/86 needs a change, and how your LDL of 162 fits with your heart risk. I saved them to your visit.",
    ]),
    pastChat("past-ldl", "result", "Is my LDL cholesterol high?", 6, 12, 25, [
      "Is my LDL cholesterol high?",
      "Yes. It was 162 mg/dL on Aug 14, above the range of below 100. Atorvastatin is meant to bring it down, and the next lipid panel shows how well it is working.",
    ]),
    pastChat("past-lisinopril", "medicine", "Lisinopril and a dry cough", 9, 21, 0, [
      "Can lisinopril cause a dry cough?",
      "It can. A dry, tickly cough is a known side effect of lisinopril. Don't stop it on your own: mention it to Dr. Patel, who can switch you to another medicine if it bothers you.",
    ]),
    pastChat("past-vitamin-d", "result", "Vitamin D level explained", 13, 9, 15, [
      "What does my vitamin D result mean?",
      "Your vitamin D was 21 ng/mL, below the range of 30 to 100. Low vitamin D is common and can leave you tired. The 2,000 IU you added is a usual dose, and a repeat test shows if it is enough.",
    ]),
    pastChat("past-hospital", "other", "Best hospital for foot surgery", 4, 18, 45, [
      "Which hospital near me is best for foot surgery?",
      "For foot surgery, look for a hospital with a dedicated foot and ankle team and a high yearly volume of the procedure you need. Ask Dr. Patel for a referral: the clinic can point you to orthopedic surgeons your plan covers.",
    ]),
    pastChat("past-tired", "other", "Feeling tired in the afternoons", 18, 15, 30, [
      "I feel tired most afternoons. Should I worry?",
      "Many things cause it, and two in your record can: low vitamin D and blood sugar in the prediabetes range. If it is new or getting worse, bring it up with Dr. Patel.",
    ]),
    pastChat("past-thyroid-hospital", "other", "Best hospital for thyroid cancer", 21, 11, 5, [
      "Which hospital is best for thyroid cancer?",
      "Look for a center with a dedicated endocrine surgery team that treats many thyroid cancers each year, often an NCI designated cancer center. Dr. Patel can refer you to one your plan covers.",
    ]),
    ...categoryChats(),
  ]
  if (!member) return chats
  return [
    pastChat("past-dinner", "plan", "Swapping dinner for chicken", 1, 17, 20, [
      "Can I swap tonight's salmon for chicken?",
      "Yes. Grilled chicken keeps tonight's protein on target. Keep the vegetables and the half cup of brown rice as planned.",
    ]),
    ...chats.slice(0, 4),
    pastChat("past-walk", "plan", "Is a 20 minute walk enough?", 5, 19, 50, [
      "Is a 20 minute walk after dinner enough?",
      "For now, yes. Your plan builds to 30 minutes over the next two weeks. A walk after dinner also helps your blood sugar after the meal.",
    ]),
    ...chats.slice(4),
  ]
}

/** The categories Olivia made herself, oldest first: each holds a few
    chats, so the chat history shows them filed beside the built in ones. */
export const CHAT_CATEGORIES = [
  { id: "cat-thyroid", name: "Thyroid" },
  { id: "cat-foot", name: "Foot surgery" },
  { id: "cat-sleep", name: "Sleep" },
  { id: "cat-family", name: "Family history" },
]

/** Her chats in the categories she made. */
function categoryChats(): PastChat[] {
  return [
    pastChat("past-thyroid-tsh", "cat-thyroid", "What does a TSH test check?", 2, 9, 30, [
      "What does a TSH test check?",
      "TSH is a hormone from the pituitary gland that tells the thyroid how hard to work. A high TSH usually means an underactive thyroid, a low one an overactive thyroid. It is the usual first thyroid test.",
    ]),
    pastChat("past-thyroid-nodule", "cat-thyroid", "Should a thyroid nodule worry me?", 10, 20, 10, [
      "My sister has a thyroid nodule. Should I get checked?",
      "Most thyroid nodules are harmless. A family history is worth mentioning to Dr. Patel, who can feel your neck at your next visit and order an ultrasound if anything is found.",
    ]),
    pastChat("past-thyroid-symptoms", "cat-thyroid", "Signs of an underactive thyroid", 24, 8, 15, [
      "What are the signs of an underactive thyroid?",
      "Common ones are tiredness, feeling cold, weight gain, dry skin and constipation. They overlap with many other things, so a TSH test is the way to know.",
    ]),
    pastChat("past-foot-recovery", "cat-foot", "Recovery time after bunion surgery", 3, 18, 0, [
      "How long is recovery after bunion surgery?",
      "Most people wear a surgical shoe for about six weeks and are back in normal shoes by three months. Full recovery can take up to a year. Your surgeon will give you a plan for your own procedure.",
    ]),
    pastChat("past-foot-questions", "cat-foot", "Questions for my foot surgeon", 7, 12, 40, [
      "What should I ask the foot surgeon before deciding?",
      "Ask which procedure they recommend and why, how many they do each year, the recovery time, when you can drive and work, and what happens if you wait. I saved these to your next visit.",
    ]),
    pastChat("past-sleep-waking", "cat-sleep", "Waking up at 3 AM", 4, 7, 10, [
      "Why do I keep waking up at 3 AM?",
      "Common causes are stress, alcohol in the evening, a late meal, a warm room and blood sugar dipping overnight. A steady bedtime and no screens in the last hour help. If it lasts weeks, tell Dr. Patel.",
    ]),
    pastChat("past-sleep-magnesium", "cat-sleep", "Does magnesium help sleep?", 15, 22, 0, [
      "Does magnesium help with sleep?",
      "Some small studies show a modest benefit, mostly for people low in magnesium. It is generally safe at usual doses, but check with Dr. Patel first because it can interact with some medicines.",
    ]),
    pastChat("past-family-heart", "cat-family", "My father's heart attack at 55", 12, 19, 25, [
      "My father had a heart attack at 55. What does that mean for me?",
      "A heart attack in a father before 55 raises your own risk, which makes your LDL of 162 and blood pressure more important to keep in range. Tell Dr. Patel so it counts in your heart risk score.",
    ]),
  ]
}
