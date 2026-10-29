import type { Cadence } from "@/lib/plans"

/* The free plan and upgrade flow (client deck "Free Plan & Upgrade",
   screens 20 to 28, 27 Oct 2026): the record produced nine optimization
   opportunities and all nine are in the plan. Each opportunity is one tick
   and one price, so a patient approves or declines the whole of one, never
   a single line inside it. Membership is $149 a month, or $1,609 for the
   year up front (10% off $1,788); the testing is never discounted and never
   spread across months. The prices are the deck's. */

export type OppId = "sleep" | "body" | "kidney" | "cardio" | "glucose" | "hormone" | "strength" | "sexual" | "survivor"

export type Opp = {
  id: OppId
  /** 1 to 9, the order the record puts them in: what moves first, not what sells. */
  n: number
  /** The name on the list of nine (screen 21). */
  name: string
  /** The name on the priced list (screen 23). */
  short: string
  /** The evidence that produced it, on the list of nine. */
  evidence: string
  /** What is tested, under the price (screen 23). */
  tests: string
  /** Dollars; 0 is "no charge". */
  price: number
  /** The lines it takes to order (the deck counts 14 for all nine). */
  lines: number
  /** The line the patient reads when she is asked to take it out (screen 24). */
  consequence: string
}

export const OPPS: Opp[] = [
  {
    id: "sleep",
    n: 1,
    name: "Sleep and apnoea management",
    short: "Sleep and apnoea",
    evidence: "AHI 5.3 · oxygen nadir 85%",
    tests: "Home sleep study · treatment review",
    price: 299,
    lines: 2,
    consequence: "Your sleep study records an AHI of 5.3, and this is the only line that checks whether treatment is working.",
  },
  {
    id: "body",
    n: 2,
    name: "Body composition and nutrition",
    short: "Body composition",
    evidence: "Lean mass 121.9 → 119.3 lb",
    tests: "DEXA · resting metabolic rate",
    price: 278,
    lines: 2,
    consequence: "Your lean mass fell from 121.9 to 119.3 lb, and this is the only line that measures it.",
  },
  {
    id: "kidney",
    n: 3,
    name: "Kidney health",
    short: "Kidney health",
    evidence: "eGFR 57 · creatinine 1.30 · cystatin C 1.05",
    tests: "Metabolic panel · cystatin C · uACR",
    price: 168,
    lines: 2,
    consequence: "Your eGFR is 57, and this is the only line that follows your kidneys.",
  },
  {
    id: "cardio",
    n: 4,
    name: "Cardiovascular risk and cholesterol",
    short: "Cardiovascular risk",
    evidence: "LDL 75 · ApoB 80 · prior plaque",
    tests: "Advanced lipids · ApoB · Lp(a)",
    price: 189,
    lines: 2,
    consequence: "Your record shows prior plaque, and this is the only line that looks at it in detail.",
  },
  {
    id: "glucose",
    n: 5,
    name: "Glucose and diabetes prevention",
    short: "Glucose prevention",
    evidence: "A1c 5.6% · glucose 105 mg/dL",
    tests: "A1c · fasting insulin",
    price: 79,
    lines: 2,
    consequence: "Your A1c is 5.6%, and this is the only line that tracks your glucose.",
  },
  {
    id: "hormone",
    n: 6,
    name: "Medication, hormone and supplement",
    short: "Hormone and iron",
    evidence: "Testosterone 584 · iron sat 15%",
    tests: "CBC, ferritin, iron, TIBC · testosterone",
    price: 228,
    lines: 2,
    consequence: "Your iron saturation is 15%, and this is the only line that checks your iron and hormones.",
  },
  {
    id: "strength",
    n: 7,
    name: "Strength, balance, mobility and pain",
    short: "Strength and mobility",
    evidence: "Low-back and shoulder pain on file",
    tests: "Physical therapy assessment",
    price: 175,
    lines: 1,
    consequence: "Your physician documented low-back and shoulder pain, and this is the only line that assesses it. The other eight measure you; this one was going to change how you move.",
  },
  {
    id: "sexual",
    n: 8,
    name: "Sexual health",
    short: "Sexual health",
    evidence: "Urology plan, September 2026",
    tests: "Urologist-directed — no test to order",
    price: 0,
    lines: 0,
    consequence: "Your urology plan from September 2026 stays with your urologist, and this line carries no charge.",
  },
  {
    id: "survivor",
    n: 9,
    name: "Survivorship and preventive care",
    short: "Survivorship",
    evidence: "PSA <0.1 · TSH 1.39",
    tests: "Hip and spine bone density",
    price: 175,
    lines: 1,
    consequence: "Your PSA and TSH are on file, and this is the only line that checks your bone density.",
  },
]

export const oppById = (id: string | undefined) => OPPS.find((o) => o.id === id)

/** Three groups of three, as the enrollment page lists them (screen 26). */
export const OPP_GROUPS: { name: string; ids: OppId[] }[] = [
  { name: "Sleep, kidney and cardiovascular", ids: ["sleep", "kidney", "cardio"] },
  { name: "Body composition, glucose and hormones", ids: ["body", "glucose", "hormone"] },
  { name: "Mobility, survivorship and sexual health", ids: ["strength", "survivor", "sexual"] },
]

/** What is already on file and is never re-ordered (screens 22 and 23). */
export const ON_FILE = { tests: "PSA, TSH, A1c and lipids", date: "Sep 26, 2026" }

/** The blood-work and other-test rules, in the deck's words. */
export const RETAKE_RULE = "Blood work older than 30 days and any other test older than six months is re-taken. Everything still current is used as it stands, and you are not charged for it twice."

export const MEMBERSHIP = { monthly: 149, yearlyList: 1788, yearly: 1609, saving: 179 } as const

/** The membership's charge today for how she pays. */
export const membershipToday = (billing: Cadence) => (billing === "yearly" ? MEMBERSHIP.yearly : MEMBERSHIP.monthly)

/** The opportunities still in her plan: all nine until she takes one out. */
export function inPlan(removed: string[] | undefined): Opp[] {
  const out = new Set(removed ?? [])
  return OPPS.filter((o) => !out.has(o.id))
}

/** What the testing costs: the sum of what is ticked, full price either way. */
export function testing(removed: string[] | undefined) {
  const plan = inPlan(removed)
  return {
    plan,
    count: plan.length,
    lines: plan.reduce((sum, o) => sum + o.lines, 0),
    total: plan.reduce((sum, o) => sum + o.price, 0),
  }
}

/** What she owes today, and what the other way of paying would be. Only the
    membership recurs: monthly changes it to $149 and nothing else. */
export function dueToday(removed: string[] | undefined, billing: Cadence) {
  const t = testing(removed)
  const membership = membershipToday(billing)
  return {
    ...t,
    membership,
    total: membership + t.total,
    yearlyToday: MEMBERSHIP.yearly + t.total,
    monthlyToday: MEMBERSHIP.monthly + t.total,
    /** Monthly over the year: the first month with the testing, then eleven more. */
    monthlyYear: MEMBERSHIP.monthly * 12 + t.total,
  }
}

/** "$3,200", "$1,416". */
export const usd = (n: number) => `$${n.toLocaleString("en-US")}`

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

/** 9 as "nine", up to nine; larger numbers as digits. */
export const words = (n: number) => WORDS[n] ?? String(n)

/* The detail page of one opportunity (/opportunity/[id], deck screen 22):
   why it came up, as the signals that produced it, and what it would take to
   confirm it. A signal is from her record, a physician's note or her own
   answers; **bold** marks the figure or finding. What is needed is new
   (nothing on file), outdated (on file but past the re-take rule) or on
   file (current, never re-ordered). Only new and outdated lines are
   ordered; the price on /plan-tests covers them. */

export type SignalKind = "record" | "note" | "said"
export type NeedStatus = "new" | "outdated" | "onfile"

export type Detail = {
  signals: { kind: SignalKind; text: string }[]
  needs: { status: NeedStatus; name: string; says: string }[]
}

export const DETAIL: Record<OppId, Detail> = {
  sleep: {
    signals: [
      { kind: "record", text: "Your sleep study records **AHI 5.3** with an oxygen nadir of **85%**." },
      { kind: "note", text: "Your August physician note documents **interrupted sleep and waking tired**." },
      { kind: "said", text: "You told us you **wake at three and cannot get back off** — which no result in your record would have shown us." },
    ],
    needs: [
      { status: "new", name: "Treatment-effectiveness review", says: "Nothing on file. Needed to see if treatment is working" },
      { status: "outdated", name: "Home sleep study", says: "Feb 12, 2026 · 8 months old — over six months" },
      { status: "onfile", name: "CBC with haematocrit", says: "Sep 26, 2026 · 31 days — re-drawn with the next panel" },
      { status: "onfile", name: "TSH", says: "Sep 26, 2026 · current — not re-ordered" },
    ],
  },
  body: {
    signals: [
      { kind: "record", text: "Your lean mass fell from **121.9 to 119.3 lb** between your last two scans." },
      { kind: "said", text: "You told us your **weight has crept up** while your strength has not." },
    ],
    needs: [
      { status: "new", name: "DEXA body composition scan", says: "Nothing on file. Measures lean and fat mass directly" },
      { status: "new", name: "Resting metabolic rate", says: "Nothing on file. Sets your nutrition targets" },
    ],
  },
  kidney: {
    signals: [
      { kind: "record", text: "Your **eGFR is 57**, with creatinine **1.30** and cystatin C **1.05**." },
      { kind: "note", text: "Your physician's note lists **kidney function** to follow." },
    ],
    needs: [
      { status: "new", name: "Metabolic panel", says: "Nothing current on file. Needed to follow eGFR" },
      { status: "new", name: "Cystatin C", says: "Nothing current on file. Confirms the creatinine" },
      { status: "new", name: "Urine albumin-to-creatinine (uACR)", says: "Nothing on file. Shows early kidney strain" },
    ],
  },
  cardio: {
    signals: [
      { kind: "record", text: "Your **LDL is 75** and **ApoB 80**." },
      { kind: "note", text: "Your record documents **prior plaque**, so the standard targets are not enough." },
    ],
    needs: [
      { status: "new", name: "Advanced lipid panel", says: "Nothing on file. Particle size and number" },
      { status: "new", name: "Lp(a)", says: "Nothing on file. Measured once, inherited risk" },
      { status: "onfile", name: "ApoB", says: "Sep 26, 2026 · current — not re-ordered" },
    ],
  },
  glucose: {
    signals: [{ kind: "record", text: "Your **A1c is 5.6%** and fasting glucose **105 mg/dL**, at the edge of the normal range." }],
    needs: [
      { status: "new", name: "Fasting insulin", says: "Nothing on file. Shows strain before glucose rises" },
      { status: "onfile", name: "A1c", says: "Sep 26, 2026 · current — not re-ordered" },
    ],
  },
  hormone: {
    signals: [
      { kind: "record", text: "Your **testosterone is 584** and your **iron saturation 15%**." },
      { kind: "said", text: "You told us you **tire in the afternoon**, which low iron can explain." },
    ],
    needs: [
      { status: "new", name: "CBC, ferritin, iron and TIBC", says: "Nothing current on file. Needed to confirm iron" },
      { status: "outdated", name: "Testosterone", says: "Sep 26, 2026 · repeated with the next panel" },
    ],
  },
  strength: {
    signals: [
      { kind: "note", text: "Your physician documented **low-back and shoulder pain**." },
      { kind: "said", text: "You told us pain is **limiting how you move**." },
    ],
    needs: [{ status: "new", name: "Physical therapy assessment", says: "Nothing on file. Measures strength, balance and mobility" }],
  },
  sexual: {
    signals: [{ kind: "note", text: "Your **urology plan from September 2026** is on file." }],
    needs: [{ status: "onfile", name: "Urologist-directed plan", says: "Sep 2026 · stays with your urologist — no test to order" }],
  },
  survivor: {
    signals: [{ kind: "record", text: "Your **PSA is below 0.1** and **TSH 1.39**, both on file." }],
    needs: [
      { status: "new", name: "Hip and spine bone density", says: "Nothing on file. Checks bone loss after treatment" },
      { status: "onfile", name: "PSA", says: "Sep 26, 2026 · current — not re-ordered" },
      { status: "onfile", name: "TSH", says: "Sep 26, 2026 · current — not re-ordered" },
    ],
  },
}
