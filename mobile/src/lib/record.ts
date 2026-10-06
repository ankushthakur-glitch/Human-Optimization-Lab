import { dayKey } from "@/lib/dates"
import type { MedRecord } from "@/lib/onboarding"

/* The sample health record the prototype "pulls" once the patient signs the
   authorization. It follows what Health Gorilla's Patient360 retrieve returns
   (the "Health Gorilla: Networks, EHRs and Data Access" sheet in the client
   Drive): the national networks it searches, the organisations it finds, and
   the FHIR resources it brings back, normalised and de-duplicated.
   Invented values for the sample patient, never a real person's. */

/** Searched in this order while the record builds. */
export const NETWORKS = [
  { name: "Carequality", reaches: "Epic, athenahealth, eClinicalWorks" },
  { name: "CommonWell", reaches: "Oracle Health, MEDITECH, Veradigm" },
  { name: "eHealth Exchange", reaches: "Regional HIEs, VA, DoD" },
  { name: "TEFCA", reaches: "Epic Nexus, Kno2, KONZA" },
  { name: "Lab network", reaches: "Quest Diagnostics, Labcorp" },
] as const

/** Where records were found: the organisation and the system it runs. */
export const SOURCES = [
  { name: "Harborview Longevity Clinic", kind: "clinic", label: "Your clinic", system: "athenahealth", network: "Carequality" },
  { name: "Scripps Memorial Hospital", kind: "hospital", label: "Hospital", system: "Epic", network: "TEFCA" },
  { name: "Quest Diagnostics", kind: "lab", label: "Lab", system: "Lab results", network: "Lab network" },
] as const

/** One row per FHIR resource the retrieve reads, with what came back. */
export const DATA_TYPES = [
  { key: "Encounter", icon: "visits", label: "Visits", count: 14 },
  { key: "Condition", icon: "conditions", label: "Conditions", count: 5 },
  { key: "MedicationStatement", icon: "medications", label: "Medications", count: 6 },
  { key: "AllergyIntolerance", icon: "allergies", label: "Allergies", count: 2 },
  { key: "Observation.lab", icon: "labs", label: "Lab results", count: 86 },
  { key: "Observation.vital", icon: "vitals", label: "Vitals", count: 32 },
  { key: "Procedure", icon: "procedures", label: "Procedures", count: 3 },
  { key: "Immunization", icon: "immunizations", label: "Immunizations", count: 9 },
  { key: "DocumentReference", icon: "documents", label: "Documents", count: 11 },
] as const

export type Flag = "high" | "low"

/** Out of range results and problem list entries: what the program engine
    reads to recommend programs. */
export type Finding = {
  id: string
  name: string
  value: string
  range: string
  flag: Flag
  /** A lab result or a vital taken at a visit. */
  kind: "lab" | "vital"
  source: string
  date: string
}

export const FINDINGS: Finding[] = [
  {
    id: "bmi",
    kind: "vital",
    name: "Body mass index",
    value: "32.4 kg/m²",
    range: "18.5 to 24.9",
    flag: "high",
    source: "Harborview",
    date: "Aug 12, 2026",
  },
  {
    id: "ldl",
    kind: "lab",
    name: "LDL cholesterol",
    value: "162 mg/dL",
    range: "Below 100",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "a1c",
    kind: "lab",
    name: "Hemoglobin A1c",
    value: "5.9 %",
    range: "Below 5.7",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "bp",
    kind: "vital",
    name: "Blood pressure",
    value: "134/86 mmHg",
    range: "Below 120/80",
    flag: "high",
    source: "Harborview",
    date: "Aug 12, 2026",
  },
  {
    id: "tg",
    kind: "lab",
    name: "Triglycerides",
    value: "188 mg/dL",
    range: "Below 150",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "vitd",
    kind: "lab",
    name: "Vitamin D, 25 hydroxy",
    value: "21 ng/mL",
    range: "30 to 100",
    flag: "low",
    source: "Quest",
    date: "Aug 14, 2026",
  },
]

/** On the problem list from the EHR (ICD-10). */
export const CONDITIONS = [
  { name: "Obesity, class 1", code: "E66.811" },
  { name: "Prediabetes", code: "R73.03" },
  { name: "Hyperlipidemia", code: "E78.5" },
  { name: "Elevated blood pressure", code: "R03.0" },
  { name: "Seasonal allergic rhinitis", code: "J30.2" },
] as const

/** The Inlay score: half from how the patient says they are flourishing
    (the index, 1 to 5), half from what her own record says: 6 points off
    for each marker whose latest result is out of range. The record half
    always comes from her own markers (trendCounts(useMarkers())), so a
    steady record with every result in range keeps the whole half, as the
    score page's "What goes into it" shows; there is no stand in count to
    fall back on. Screens read it through useInlayScore (lib/experience.ts),
    so she sees one score everywhere. A stand in formula until HOL's
    clinical team sets one. No answers, no score: it is never invented
    (A-44). */
export function inlayScore(flourish: number[] | undefined, record: { out: number }): number | undefined {
  if (!flourish?.length) return undefined
  const said = (flourish.reduce((s, x) => s + x, 0) / flourish.length) * 20
  const fromRecord = Math.max(0, 100 - record.out * 6)
  return Math.round((said + fromRecord) / 2)
}

/** An Inlay score check in as the store keeps it (`scores`): the day of
    her answers, and the score they gave. */
export type ScoreCheckIn = { at: string; value: number }

/** A stored date's local day ("2026-05-03"): a day key as it is, a time on
    the device's calendar. */
const checkInDay = (at: string) => (at.length > 10 ? dayKey(new Date(at)) : at.slice(0, 10))

/** Her Inlay score over time, by the one rule Home, the score page and
    Progress all follow (D.5):
    - which check ins count: those before today, oldest first. Today's
      score is worked out from her answers and her record, so one saved
      today is never shown twice;
    - `history`: those check ins with today's score last ("Today"), for the
      chart, and `previous`, the latest of them, for the dial's tick;
    - `tag`: the change from her first check in, in whole points, "Up 5
      since May", "Down 2 since May" or "Same as in May" ("May 2025" in
      another year), or "First score" before there is one. A rise is the
      ok tone; a fall or no change is muted, never red.
    With no score today (no record yet) there is no tag and no "Today". */
export function scoreOverTime(today: number | undefined, checkIns: readonly ScoreCheckIn[] = [], now: Date = new Date()) {
  const day = dayKey(now)
  const earlier = checkIns
    .filter((c) => checkInDay(c.at) < day)
    .map((c) => ({ at: c.at, day: checkInDay(c.at), value: Math.round(c.value) }))
    .sort((a, b) => a.day.localeCompare(b.day))
  const score = today === undefined ? undefined : Math.round(today)
  const history = [...earlier.map((c) => ({ date: c.at, value: c.value })), ...(score === undefined ? [] : [{ date: "Today", value: score }])]
  const first = earlier[0]
  let tag: { tone: "ok" | "muted"; label: string } | undefined
  if (score !== undefined) {
    if (!first) tag = { tone: "muted", label: "First score" }
    else {
      const [y, m] = first.day.split("-").map(Number)
      const since = y === now.getFullYear() ? MONTH_SHORT[m - 1] : `${MONTH_SHORT[m - 1]} ${y}`
      const change = score - first.value
      tag =
        change > 0
          ? { tone: "ok", label: `Up ${change} since ${since}` }
          : change < 0
            ? { tone: "muted", label: `Down ${-change} since ${since}` }
            : { tone: "muted", label: `Same as in ${since}` }
    }
  }
  return { score, history, previous: earlier[earlier.length - 1]?.value, tag }
}

/** Lab results in range: every lab the record holds less the flagged ones.
    Removed at integration once only the frozen onboarding screens read it;
    lib/trends.ts trendCounts() counts the record's markers. */
export const LABS_IN_RANGE = {
  inRange: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count - FINDINGS.filter((f) => f.kind === "lab").length,
  total: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count,
}

/* ------------------------------------------------------------------------
   What the record holds once it is assembled and checked (the workflow's
   "What the record holds"): every entry keeps where it came from and when,
   nothing is replaced, and where two places disagree both stay visible
   until the doctor settles it. Invented values for the sample patient. */

/** Who an entry came from. "doctor" is the practice's own system, treated
    as the true list; "you" is what the patient told Inlay. */
export type Origin = "doctor" | "hospital" | "lab" | "you" | "report"

export const ORIGIN_LABEL: Record<Origin, string> = {
  doctor: "Your doctor",
  hospital: "Scripps Memorial",
  lab: "Quest",
  you: "You told us",
  report: "Your report",
}

/** Where an entry came from, by the place's own name, for a chart's
    readout and a result's row: "Quest Diagnostics". */
export const PLACE_NAME: Record<Origin, string> = {
  doctor: "Harborview Longevity Clinic",
  hospital: "Scripps Memorial Hospital",
  lab: "Quest Diagnostics",
  you: "You",
  report: "Your report",
}

/** How an entry is known, one label per item in the record lists (S-13). */
export type Provenance = "verified" | "clinician" | "patient" | "device" | "ai" | "confirmed"

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  verified: "Verified source",
  clinician: "Documented by a clinician",
  patient: "Told by you",
  device: "From a device",
  ai: "Suggested by Inlay",
  confirmed: "Confirmed by Dr. Patel",
}

/** The provenance an entry has from where it came: a lab result is a
    verified source, a clinic or hospital entry is documented by a
    clinician, what she told us or photographed is told by you. */
export const PROVENANCE_OF: Record<Origin, Provenance> = {
  doctor: "clinician",
  hospital: "clinician",
  lab: "verified",
  you: "patient",
  report: "patient",
}

/** Who reviews the record: the doctor confirms it once it is assembled,
    then every quarter. */
export const REVIEW = {
  by: "Dr. Maya Patel",
  every: "Every 3 months",
} as const

/* ------------------------------------------------------------ medicines -- */

/** What she says about a medicine (FINAL-SPEC C.10): she takes it, at
    another dose, she stopped it, never started it, or does not take it
    (store field `meds`, lib/onboarding.tsx MedRecord). */
export type MedAnswer = "taking" | "dose" | "stopped" | "never" | "not-taking"

export const MED_ANSWER_LABEL: Record<MedAnswer, string> = {
  taking: "Taking it",
  dose: "Taking a different dose",
  stopped: "I stopped it",
  never: "I never started it",
  "not-taking": "Not taking it",
}

/** Her answer as the provider's chart reads it: the portal's
    PatientMedAnswer (src/components/patient-dashboard/types.ts), which its
    medication reconciliation lists beside each difference. */
export type ProviderMedAnswer = {
  medication: string
  answer: "Taking" | "Not taking" | "Taking differently"
  /** The detail behind the answer: "Takes 10 mg once a day, matching
      Scripps Memorial", "Stopped: side effect". */
  note?: string
  /** "2026-10-06". */
  date: string
}

/** Where a list came from, as the provider's note names it. */
const SOURCE_NOTE: Record<Origin, string> = {
  doctor: "the practice list",
  hospital: ORIGIN_LABEL.hospital,
  lab: ORIGIN_LABEL.lab,
  you: "what they told us before",
  report: "their uploaded report",
}

const STOPPED_NOTE: Record<NonNullable<MedRecord["why"]>, string> = {
  "side-effect": "Stopped: side effect",
  doctor: "Stopped: a doctor told them to",
  "ran-out": "Stopped: ran out",
  other: "Stopped: another reason",
}

/** One saved answer, for the provider: what she takes, set against the
    lists she saw when she answered (the medicine's lists for an answer
    saved before those were kept). */
export function providerAnswer(id: string, r: MedRecord): ProviderMedAnswer | undefined {
  const m = MEDICATIONS.find((x) => x.id === id)
  const medication = r.medication ?? m?.name
  if (!medication) return undefined
  const lists = r.shown ?? m?.lists ?? []
  const date = r.at.slice(0, 10)
  switch (r.answer) {
    case "taking":
      return { medication, answer: "Taking", date }
    case "dose": {
      const match = lists.find((l) => l.dose === r.dose)
      const note = r.dose ? `Takes ${r.dose}${match ? `, matching ${SOURCE_NOTE[match.origin]}` : ""}` : undefined
      // The practice's own dose is no change to its list.
      return { medication, answer: match?.origin === "doctor" ? "Taking" : "Taking differently", note, date }
    }
    case "stopped":
      return { medication, answer: "Not taking", note: r.why === "other" && r.note ? `Stopped: ${r.note}` : r.why ? STOPPED_NOTE[r.why] : "Stopped, reason not given", date }
    case "never":
      return { medication, answer: "Not taking", note: "Never started it", date }
    case "not-taking":
      return { medication, answer: "Not taking", date }
  }
}

/** Every answer she saved, for the provider, newest first. */
export function providerAnswers(meds: Record<string, MedRecord> | undefined): ProviderMedAnswer[] {
  return Object.entries(meds ?? {})
    .map(([id, r]) => providerAnswer(id, r))
    .filter((a): a is ProviderMedAnswer => !!a)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export type Medication = {
  id: string
  name: string
  /** As each place lists it; the doctor's line first when there is one. */
  lists: { origin: Origin; dose: string; date: string }[]
  kind: "medicine" | "supplement"
  /** The doctor already settled a difference; it stays in the record but
      stops coming back. */
  resolved?: string
}

export const MEDICATIONS: Medication[] = [
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    kind: "medicine",
    lists: [
      { origin: "doctor", dose: "20 mg once a day", date: "Aug 12, 2026" },
      { origin: "hospital", dose: "10 mg once a day", date: "Jun 3, 2026" },
    ],
  },
  {
    id: "lisinopril",
    name: "Lisinopril",
    kind: "medicine",
    lists: [{ origin: "hospital", dose: "10 mg once a day", date: "Jun 3, 2026" }],
  },
  {
    id: "cetirizine",
    name: "Cetirizine",
    kind: "medicine",
    lists: [{ origin: "doctor", dose: "10 mg when needed", date: "Aug 12, 2026" }],
  },
  {
    id: "vitamin-d",
    name: "Vitamin D3",
    kind: "supplement",
    lists: [{ origin: "you", dose: "2,000 IU once a day", date: "Sep 29, 2026" }],
  },
  {
    id: "fish-oil",
    name: "Fish oil",
    kind: "supplement",
    lists: [{ origin: "you", dose: "1,000 mg once a day", date: "Sep 29, 2026" }],
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen",
    kind: "medicine",
    lists: [{ origin: "hospital", dose: "400 mg when needed", date: "Jun 3, 2026" }],
    resolved: "Dr. Patel marked this as a short course, finished",
  },
]

/** Prescribed medicines only, without supplements: what the patient confirms. */
export const MEDICINES = MEDICATIONS.filter((m) => m.kind === "medicine")

/** The doctor's list is the true one: anything only elsewhere, or with a
    different dose, is a difference the doctor settles. */
export function medDifference(m: Medication): string | undefined {
  if (m.resolved) return undefined
  const doctor = m.lists.find((l) => l.origin === "doctor")
  const others = m.lists.filter((l) => l.origin !== "doctor")
  if (!doctor) return others.some((l) => l.origin === "you") ? undefined : "Not on your doctor's list"
  if (others.some((l) => l.dose !== doctor.dose)) return "Doses differ"
  return undefined
}

/* ------------------------------------------------------------ allergies -- */

export const ALLERGIES = [
  { id: "penicillin", name: "Penicillin", reaction: "Hives", lists: ["doctor", "hospital"] as Origin[] },
  { id: "sulfa", name: "Sulfa drugs", reaction: "Rash", lists: ["hospital"] as Origin[], difference: "Not on your doctor's list" },
]

/* ----------------------------------------------------------- conditions -- */

export const PROBLEMS = [
  { id: "obesity", name: "Obesity, class 1", since: "2024", origin: "doctor" as Origin },
  { id: "prediabetes", name: "Prediabetes", since: "2023", origin: "doctor" as Origin },
  { id: "lipids", name: "Hyperlipidemia", since: "2022", origin: "doctor" as Origin },
  {
    id: "bp",
    name: "Elevated blood pressure",
    since: "2025",
    origin: "doctor" as Origin,
    difference: "Scripps Memorial lists this as high blood pressure",
  },
  { id: "rhinitis", name: "Seasonal allergic rhinitis", since: "2015", origin: "doctor" as Origin },
]

/* ---------------------------------------------------------- biomarkers -- */

export type Point = {
  date: string
  value: number
  shown?: string
  origin: Origin
  method?: string
  /** The day of the result (ISO, "2026-08-14"), so charts space results by
      time; `date` stays the display string. */
  at?: string
  /** Blood pressure's second number, the pressure between beats. */
  value2?: number
  /** The batch of new results it arrived in ("quest-new"). */
  batch?: string
}

/** Where the Record tab lists a marker, in this order. */
export const BODY_SYSTEMS = [
  "Blood sugar",
  "Cholesterol",
  "Blood pressure and weight",
  "Kidney and liver",
  "Vitamins and minerals",
  "Thyroid",
  "Blood count",
] as const

export type BodySystem = (typeof BODY_SYSTEMS)[number]

/** What an Optimization plan would work on: a marker moving the wrong way
    can lead to the plan only when it maps to one of these. */
export type FocusArea = "blood sugar" | "weight" | "heart" | "bone"

export type Biomarker = {
  id: string
  name: string
  unit: string
  /** The target band; either end may be open. */
  low?: number
  high?: number
  target: string
  points: Point[]
  /** Set when results come from different testing methods. */
  methodNote?: string
  /** The name inside a sentence: "Your A1c has gone from 5.3 to 5.9". */
  short?: string
  /** The short name takes "have": "Your triglycerides have gone up". */
  plural?: boolean
  /** Measured at a lab, or at a visit (blood pressure, BMI). */
  kind?: "lab" | "vital"
  group?: BodySystem
  focus?: FocusArea
  /** "What this measures", in plain words. */
  about?: string
  /** Where that text comes from: "From MedlinePlus" unless set. */
  aboutSource?: string
  /** Questions the patient can save for Dr. Patel. A question that quotes
      her results is a template, filled in by lib/trends.ts questionsOf()
      from the results as they stand: {first} and {latest} are the first
      and latest comparable results at the lab's precision, {since} the
      first result's year. */
  questions?: string[]
  /** In place of `questions` for a member whose plan already does what a
      question suggests (blood pressure, checked at home every evening).
      {home} is the last 7 evenings' average, {month} the month of the
      latest clinic reading, {latest} that reading. */
  memberQuestions?: string[]
  /** Blood pressure's second number must stay below this ("Below 120/80"). */
  high2?: number
  /** Past these values a result goes to the doctor first and never leads to
      an offer. Placeholders until Dr. Blanchard sets the red flag rules (Q-08). */
  review?: { above?: number; below?: number }
}

/* Every marker in the record, one entry per marker with every dated result
   from every source. Labs are Quest panels drawn on Apr 19 2022, May 9 2023,
   May 14 2024, Jun 10 2025 (A1c only) and Aug 14 2026; vitals come from
   visits. The 25 lab markers hold the record's 86 lab results (DATA_TYPES),
   plus one home kit result the patient added. Invented values for the sample
   patient, never a real person's. */
export const BIOMARKERS: Biomarker[] = [
  {
    id: "a1c",
    name: "Hemoglobin A1c",
    short: "A1c",
    unit: "%",
    high: 5.7,
    target: "Below 5.7",
    kind: "lab",
    group: "Blood sugar",
    focus: "blood sugar",
    about: "A1c shows your average blood sugar over the last 2 to 3 months. Lower is better, and your range is below 5.7.",
    questions: ["My A1c has gone from {first} to {latest} since {since}. What would you like me to change?", "When should I have my next A1c?"],
    review: { above: 6.4 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 5.3, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 5.4, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 5.6, origin: "lab" },
      { date: "Jun 2025", at: "2025-06-10", value: 5.7, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 5.9, origin: "lab" },
    ],
  },
  {
    id: "ldl",
    name: "LDL cholesterol",
    short: "LDL",
    unit: "mg/dL",
    high: 100,
    target: "Below 100",
    kind: "lab",
    group: "Cholesterol",
    focus: "heart",
    about: "LDL is the cholesterol that can build up in artery walls. Lower is better, and your range is below 100.",
    questions: ["My LDL has gone from {first} to {latest} since {since}. What would help most?", "Is my atorvastatin dose right for me?"],
    review: { above: 189 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 128, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 141, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 150, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 162, origin: "lab" },
    ],
  },
  {
    id: "tg",
    name: "Triglycerides",
    short: "triglycerides",
    plural: true,
    unit: "mg/dL",
    high: 150,
    target: "Below 150",
    kind: "lab",
    group: "Cholesterol",
    focus: "heart",
    about: "Triglycerides are a type of fat in your blood. They often follow sugar, alcohol and activity. Your range is below 150.",
    questions: ["My triglycerides have gone from {first} to {latest}. What would help most?"],
    review: { above: 499 },
    points: [
      { date: "May 2023", at: "2023-05-09", value: 150, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 172, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 188, origin: "lab" },
    ],
  },
  {
    id: "bp",
    name: "Blood pressure",
    short: "blood pressure",
    unit: "mmHg",
    high: 120,
    high2: 80,
    target: "Below 120/80",
    kind: "vital",
    group: "Blood pressure and weight",
    focus: "heart",
    about: "Blood pressure has two numbers: the pressure when your heart beats, and between beats. Your range is below 120/80.",
    aboutSource: "From the American Heart Association",
    questions: ["My readings have gone from {first} to {latest}. Should I check at home?", "Scripps started lisinopril in June. Should I keep taking it?"],
    memberQuestions: [
      "My evening readings at home average {home}, but at my visit in {month} it was {latest}. Which should we go by?",
      "Scripps started lisinopril in June. Should I keep taking it?",
    ],
    review: { above: 179 },
    points: [
      { date: "Mar 2023", at: "2023-03-14", value: 124, value2: 80, shown: "124/80", origin: "doctor" },
      { date: "Apr 2024", at: "2024-04-23", value: 128, value2: 82, shown: "128/82", origin: "doctor" },
      { date: "Jun 2026", at: "2026-06-03", value: 131, value2: 84, shown: "131/84", origin: "hospital" },
      { date: "Aug 2026", at: "2026-08-12", value: 134, value2: 86, shown: "134/86", origin: "doctor" },
    ],
  },
  {
    id: "bmi",
    name: "Body mass index",
    short: "BMI",
    unit: "kg/m²",
    low: 18.5,
    high: 24.9,
    target: "18.5 to 24.9",
    kind: "vital",
    group: "Blood pressure and weight",
    focus: "weight",
    about: "Body mass index compares your weight with your height. It's a rough guide: your waist size and body makeup say more.",
    aboutSource: "From the CDC",
    questions: ["Would a body composition scan help me?"],
    points: [
      { date: "Mar 2023", at: "2023-03-14", value: 30.2, origin: "doctor" },
      { date: "Apr 2024", at: "2024-04-23", value: 31.1, origin: "doctor" },
      { date: "Aug 2026", at: "2026-08-12", value: 32.4, origin: "doctor" },
    ],
  },
  {
    id: "vitd",
    name: "Vitamin D, 25 hydroxy",
    short: "vitamin D",
    unit: "ng/mL",
    low: 30,
    high: 100,
    target: "30 to 100",
    kind: "lab",
    group: "Vitamins and minerals",
    focus: "bone",
    about: "Vitamin D helps your body use calcium for strong bones and supports your muscles. Your range is 30 to 100.",
    questions: ["I take 2,000 IU of vitamin D3. Is that the right amount for me?"],
    review: { below: 10 },
    points: [
      { date: "May 2024", at: "2024-05-14", value: 24, origin: "lab", method: "Blood draw" },
      { date: "Mar 2026", at: "2026-03-21", value: 19, origin: "you", method: "Home finger prick kit" },
      { date: "Aug 2026", at: "2026-08-14", value: 21, origin: "lab", method: "Blood draw" },
    ],
    methodNote: "One result is from a home finger prick kit, measured differently from a blood draw, so it is shown but not joined to the line.",
  },
  {
    id: "hdl",
    name: "HDL cholesterol",
    short: "HDL",
    unit: "mg/dL",
    low: 50,
    target: "50 or above",
    kind: "lab",
    group: "Cholesterol",
    focus: "heart",
    about: "HDL is the cholesterol that helps clear other cholesterol from your blood. Higher is better, and your range is 50 or above.",
    questions: ["My HDL is close to 50. Is it something to work on?"],
    points: [
      { date: "May 2023", at: "2023-05-09", value: 52, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 51, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 52, origin: "lab" },
    ],
  },
  {
    id: "tsh",
    name: "Thyroid stimulating hormone",
    short: "TSH",
    unit: "mIU/L",
    low: 0.4,
    high: 4,
    target: "0.4 to 4.0",
    kind: "lab",
    group: "Thyroid",
    about: "TSH shows how hard your body is asking your thyroid to work. Your range is 0.4 to 4.0.",
    questions: ["Do I need another thyroid test, or is one enough for now?"],
    review: { above: 10, below: 0.1 },
    points: [{ date: "Aug 2026", at: "2026-08-14", value: 2.1, origin: "lab" }],
  },
  {
    id: "glucose",
    name: "Glucose, fasting",
    short: "fasting glucose",
    unit: "mg/dL",
    low: 70,
    high: 99,
    target: "70 to 99",
    kind: "lab",
    group: "Blood sugar",
    focus: "blood sugar",
    about: "Fasting glucose is the sugar in your blood after 8 hours or more without eating. Your range is 70 to 99.",
    questions: ["My fasting glucose is in range but my A1c isn't. What does that mean for me?"],
    review: { above: 125, below: 54 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 92, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 93, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 95, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 94, origin: "lab" },
    ],
  },
  {
    id: "bun",
    name: "Urea nitrogen (BUN)",
    short: "BUN",
    unit: "mg/dL",
    low: 7,
    high: 25,
    target: "7 to 25",
    kind: "lab",
    group: "Kidney and liver",
    about: "Urea nitrogen is a waste product your kidneys clear from your blood. Your range is 7 to 25.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 13, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 14, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 13, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 15, origin: "lab" },
    ],
  },
  {
    id: "creatinine",
    name: "Creatinine",
    short: "creatinine",
    unit: "mg/dL",
    low: 0.5,
    high: 0.99,
    target: "0.50 to 0.99",
    kind: "lab",
    group: "Kidney and liver",
    about: "Creatinine is a waste product from your muscles that your kidneys clear. Your range is 0.50 to 0.99.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 0.79, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 0.78, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 0.81, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 0.8, shown: "0.80", origin: "lab" },
    ],
  },
  {
    id: "egfr",
    name: "eGFR",
    short: "eGFR",
    unit: "mL/min/1.73m²",
    low: 60,
    target: "60 or above",
    kind: "lab",
    group: "Kidney and liver",
    about: "eGFR estimates how well your kidneys filter your blood, worked out from your creatinine. Your range is 60 or above.",
    review: { below: 30 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 95, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 96, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 92, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 93, origin: "lab" },
    ],
  },
  {
    id: "alt",
    name: "ALT",
    short: "ALT",
    unit: "U/L",
    low: 6,
    high: 29,
    target: "6 to 29",
    kind: "lab",
    group: "Kidney and liver",
    about: "ALT is an enzyme found mostly in your liver. A higher level can mean your liver is under strain. Your range is 6 to 29.",
    review: { above: 200 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 21, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 22, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 25, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 24, origin: "lab" },
    ],
  },
  {
    id: "ast",
    name: "AST",
    short: "AST",
    unit: "U/L",
    low: 10,
    high: 35,
    target: "10 to 35",
    kind: "lab",
    group: "Kidney and liver",
    about: "AST is an enzyme found in your liver and your muscles. Your range is 10 to 35.",
    review: { above: 200 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 19, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 19, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 21, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 20, origin: "lab" },
    ],
  },
  {
    id: "alp",
    name: "Alkaline phosphatase",
    short: "alkaline phosphatase",
    unit: "U/L",
    low: 37,
    high: 153,
    target: "37 to 153",
    kind: "lab",
    group: "Kidney and liver",
    about: "Alkaline phosphatase is an enzyme that comes from your liver and your bones. Your range is 37 to 153.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 66, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 68, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 72, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 70, origin: "lab" },
    ],
  },
  {
    id: "bilirubin",
    name: "Bilirubin, total",
    short: "bilirubin",
    unit: "mg/dL",
    low: 0.2,
    high: 1.2,
    target: "0.2 to 1.2",
    kind: "lab",
    group: "Kidney and liver",
    about: "Bilirubin comes from the normal breakdown of red blood cells, and your liver clears it. Your range is 0.2 to 1.2.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 0.6, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 0.5, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 0.6, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 0.5, origin: "lab" },
    ],
  },
  {
    id: "albumin",
    name: "Albumin",
    short: "albumin",
    unit: "g/dL",
    low: 3.6,
    high: 5.1,
    target: "3.6 to 5.1",
    kind: "lab",
    group: "Kidney and liver",
    about: "Albumin is the main protein your liver makes. It keeps fluid inside your blood vessels. Your range is 3.6 to 5.1.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 4.4, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 4.4, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 4.3, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 4.3, origin: "lab" },
    ],
  },
  {
    id: "protein",
    name: "Protein, total",
    short: "total protein",
    unit: "g/dL",
    low: 6.1,
    high: 8.1,
    target: "6.1 to 8.1",
    kind: "lab",
    group: "Kidney and liver",
    about: "Total protein adds up albumin and the other proteins in your blood. Your range is 6.1 to 8.1.",
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 7, shown: "7.0", origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 7.1, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 7, shown: "7.0", origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 7.2, origin: "lab" },
    ],
  },
  {
    id: "sodium",
    name: "Sodium",
    short: "sodium",
    unit: "mmol/L",
    low: 135,
    high: 146,
    target: "135 to 146",
    kind: "lab",
    group: "Vitamins and minerals",
    about: "Sodium is a salt that helps balance the water in your body. Your range is 135 to 146.",
    review: { above: 155, below: 125 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 139, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 140, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 139, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 141, origin: "lab" },
    ],
  },
  {
    id: "potassium",
    name: "Potassium",
    short: "potassium",
    unit: "mmol/L",
    low: 3.5,
    high: 5.3,
    target: "3.5 to 5.3",
    kind: "lab",
    group: "Vitamins and minerals",
    about: "Potassium helps your nerves and muscles work, your heart included. Your range is 3.5 to 5.3.",
    review: { above: 6, below: 3 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 4.2, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 4.3, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 4.1, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 4.2, origin: "lab" },
    ],
  },
  {
    id: "calcium",
    name: "Calcium",
    short: "calcium",
    unit: "mg/dL",
    low: 8.6,
    high: 10.4,
    target: "8.6 to 10.4",
    kind: "lab",
    group: "Vitamins and minerals",
    focus: "bone",
    about: "Calcium in your blood supports your bones, nerves and muscles. Your range is 8.6 to 10.4.",
    review: { above: 12, below: 7.5 },
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 9.4, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 9.5, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 9.4, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 9.6, origin: "lab" },
    ],
  },
  {
    id: "b12",
    name: "Vitamin B12",
    short: "vitamin B12",
    unit: "pg/mL",
    low: 200,
    high: 1100,
    target: "200 to 1,100",
    kind: "lab",
    group: "Vitamins and minerals",
    about: "Vitamin B12 helps you make red blood cells and keeps your nerves healthy. Your range is 200 to 1,100.",
    points: [
      { date: "May 2024", at: "2024-05-14", value: 486, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 512, origin: "lab" },
    ],
  },
  {
    id: "ferritin",
    name: "Ferritin",
    short: "ferritin",
    unit: "ng/mL",
    low: 16,
    high: 232,
    target: "16 to 232",
    kind: "lab",
    group: "Vitamins and minerals",
    about: "Ferritin shows how much iron your body has stored. Your range is 16 to 232.",
    questions: ["My ferritin is back in range. How often should we check it?"],
    points: [
      { date: "Apr 2022", at: "2022-04-19", value: 9, origin: "lab" },
      { date: "May 2023", at: "2023-05-09", value: 14, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 27, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 46, origin: "lab" },
    ],
  },
  {
    id: "ft4",
    name: "Free T4",
    short: "free T4",
    unit: "ng/dL",
    low: 0.8,
    high: 1.8,
    target: "0.8 to 1.8",
    kind: "lab",
    group: "Thyroid",
    about: "Free T4 is the main hormone your thyroid makes. Your range is 0.8 to 1.8.",
    points: [{ date: "Aug 2026", at: "2026-08-14", value: 1.2, origin: "lab" }],
  },
  {
    id: "wbc",
    name: "White blood cells",
    short: "white blood cells",
    plural: true,
    unit: "thousand/µL",
    low: 3.8,
    high: 10.8,
    target: "3.8 to 10.8",
    kind: "lab",
    group: "Blood count",
    about: "White blood cells help your body fight infection. Your range is 3.8 to 10.8.",
    review: { below: 2 },
    points: [
      { date: "May 2023", at: "2023-05-09", value: 6.6, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 6.4, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 6.1, origin: "lab" },
    ],
  },
  {
    id: "hemoglobin",
    name: "Hemoglobin",
    short: "hemoglobin",
    unit: "g/dL",
    low: 11.7,
    high: 15.5,
    target: "11.7 to 15.5",
    kind: "lab",
    group: "Blood count",
    about: "Hemoglobin carries oxygen in your red blood cells. Your range is 11.7 to 15.5.",
    review: { below: 8 },
    points: [
      { date: "May 2023", at: "2023-05-09", value: 12.9, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 13.3, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 13.2, origin: "lab" },
    ],
  },
  {
    id: "platelets",
    name: "Platelets",
    short: "platelets",
    plural: true,
    unit: "thousand/µL",
    low: 140,
    high: 400,
    target: "140 to 400",
    kind: "lab",
    group: "Blood count",
    about: "Platelets help your blood clot. Your range is 140 to 400.",
    review: { below: 50 },
    points: [
      { date: "May 2023", at: "2023-05-09", value: 255, origin: "lab" },
      { date: "May 2024", at: "2024-05-14", value: 251, origin: "lab" },
      { date: "Aug 2026", at: "2026-08-14", value: 248, origin: "lab" },
    ],
  },
]

// Every "What this measures" names its source; MedlinePlus unless set.
for (const b of BIOMARKERS) b.aboutSource ??= "From MedlinePlus"

/** The care gaps and orders tied to a marker: the clinical next step its
    page shows above anything else. While one of them is overdue or being
    reminded about, the marker never leads to an offer. */
export const MARKER_CARE: Record<string, { gaps?: string[]; orders?: string[] }> = {
  a1c: { orders: ["labs-nov"] },
  ldl: { orders: ["labs-nov"] },
  hdl: { orders: ["labs-nov"] },
  tg: { orders: ["labs-nov"] },
  bp: { gaps: ["follow-up"] },
}

/* The eight watched markers with steady, in range results on the same
   dates (/demo/free-steady): nothing to watch, "27 results are in range and
   steady". As [value, second number] per result, oldest first. */
const STEADY_VALUES: Record<string, (number | [number, number])[]> = {
  a1c: [5.3, 5.3, 5.3, 5.3, 5.3],
  ldl: [92, 95, 94, 94],
  tg: [110, 104, 108],
  bp: [
    [112, 74],
    [114, 75],
    [113, 74],
    [113, 74],
  ],
  bmi: [23.1, 23.4, 23.2],
  vitd: [42, 40, 45],
  hdl: [64, 66, 65],
  ferritin: [60, 62, 61, 61],
}

/** The record with every result steady and in range (sample data). */
export const STEADY_RECORD: Biomarker[] = BIOMARKERS.map((b) => {
  const values = STEADY_VALUES[b.id]
  if (!values) return b
  return {
    ...b,
    points: b.points.map((p, i) => {
      const v = values[i] ?? values[values.length - 1]
      return Array.isArray(v) ? { ...p, value: v[0], value2: v[1], shown: `${v[0]}/${v[1]}` } : { ...p, value: v, shown: undefined }
    }),
  }
})

/** Result batches that reach the record after it is built, by batch id
    (sample data): Quest's draw today with A1c 6.0, LDL 158, triglycerides
    181 and HDL 53. The day comes from the store's `batches` entry. */
export const NEW_RESULTS: Record<string, { source: string; values: { marker: string; value: number; shown?: string }[] }> = {
  "quest-new": {
    source: "Quest Diagnostics",
    values: [
      { marker: "a1c", value: 6.0, shown: "6.0" },
      { marker: "ldl", value: 158 },
      { marker: "tg", value: 181 },
      { marker: "hdl", value: 53 },
    ],
  },
}

const pad2 = (n: number) => String(n).padStart(2, "0")
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The markers with every batch that has arrived (store `batches`), each
    result dated the local day the batch came in and marked with its
    batch. Batches without sample results change nothing. */
export function withBatches(markers: Biomarker[], batches: readonly { id: string; at: string }[]): Biomarker[] {
  const added = new Map<string, Point[]>()
  for (const batch of batches) {
    const results = NEW_RESULTS[batch.id]
    if (!results) continue
    const d = batch.at.length > 10 ? new Date(batch.at) : new Date(`${batch.at}T12:00`)
    if (Number.isNaN(d.getTime())) continue
    const at = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const date = `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
    for (const r of results.values) {
      const list = added.get(r.marker) ?? []
      list.push({ date, at, value: r.value, shown: r.shown, origin: "lab", batch: batch.id })
      added.set(r.marker, list)
    }
  }
  if (!added.size) return markers
  return markers.map((b) => (added.has(b.id) ? { ...b, points: [...b.points, ...added.get(b.id)!] } : b))
}

export const biomarker = (id: string) => BIOMARKERS.find((b) => b.id === id)

/** How far outside the target band a value is; 0 inside it. A "Below"
    target leaves its own edge out: an A1c of 5.7 is not below 5.7. */
const distance = (b: Biomarker, v: number) => {
  if (b.high !== undefined && (v > b.high || (v === b.high && b.target.startsWith("Below")))) return Math.max(v - b.high, 0.001)
  if (b.low !== undefined && v < b.low) return b.low - v
  return 0
}

export const inRange = (b: Biomarker, v: number) => distance(b, v) === 0

/* ---------------------------------------------------- visits and more -- */

/** A visit in the record. An outside visit (urgent care, a specialist)
    carries what the record says happened there. */
export type Visit = {
  id: string
  name: string
  where: string
  date: string
  origin: Origin
  /** Seen outside her clinic: "Outside your clinic". */
  outside?: boolean
  reason?: string
  seenBy?: string
  askedFor?: string
}

export const VISITS: Visit[] = [
  { id: "annual", name: "Annual physical", where: "Harborview Longevity Clinic", date: "Aug 12, 2026", origin: "doctor" },
  { id: "cardiology", name: "Cardiology visit", where: "Dr. Lee, Pacific Heart", date: "Jul 21, 2026", origin: "you", outside: true },
  {
    id: "urgent",
    name: "Urgent care visit",
    where: "Scripps Memorial Hospital",
    date: "Jun 3, 2026",
    origin: "hospital",
    outside: true,
    reason: "Headache and high blood pressure",
    seenBy: "Scripps Memorial emergency department",
    askedFor: "See your doctor within 2 weeks",
  },
  { id: "annual-25", name: "Annual physical", where: "Harborview Longevity Clinic", date: "Apr 8, 2025", origin: "doctor" },
]

/** Phone numbers of the places the record names, by the place's full
    name (sample data, 555 numbers). The clinic's own is
    PATIENT.practicePhone; a partner's is on the partner. */
export const PLACE_PHONE: Record<string, string> = {
  "Pacific Heart, La Jolla": "(858) 555-0142",
  "Scripps Memorial Hospital": "(858) 555-0177",
}

/** An appointment on her calendar: a visit, or Dr. Patel's record review
    (no visit needed). `at` is the local day and time ("2026-10-21T10:30").
    A visit keeps the place's `phone`, what to `prepare` (the visit page's
    suggestions and the assistant's "Prepare for my next visit" read this
    one list) and the question that opens the assistant about it (`ask`). */
export type Appointment = {
  id: string
  name: string
  with: string
  place: string
  address?: string
  at: string
  kind: "visit" | "review"
  origin: Origin
  phone?: string
  prepare?: string[]
  ask?: string
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: "cardio-follow-up",
    name: "Cardiology follow up",
    with: "Dr. Lee",
    place: "Pacific Heart, La Jolla",
    address: "9850 Genesee Ave, La Jolla",
    at: "2026-10-21T10:30",
    kind: "visit",
    origin: "you",
    phone: PLACE_PHONE["Pacific Heart, La Jolla"],
    prepare: ["Ask Dr. Lee about your echocardiogram", "Bring your medicine list"],
    ask: "Help me prepare for my cardiology visit",
  },
  { id: "review-dec", name: "Record review by Dr. Patel", with: "Dr. Maya Patel", place: "Harborview Longevity Clinic", at: "2026-12-08T09:00", kind: "review", origin: "doctor" },
]

export const PROCEDURES = [
  { id: "ecg", name: "Electrocardiogram", where: "Scripps Memorial Hospital", date: "Jun 3, 2026", origin: "hospital" as Origin },
  { id: "biopsy", name: "Skin biopsy, left shoulder", where: "Harborview Longevity Clinic", date: "Oct 2021", origin: "doctor" as Origin },
  { id: "knee", name: "Knee arthroscopy, right", where: "Scripps Memorial Hospital", date: "Feb 2019", origin: "hospital" as Origin },
]

export const IMMUNIZATIONS = [
  { id: "flu", name: "Influenza", date: "Oct 2025" },
  { id: "covid", name: "COVID-19", date: "Oct 2025" },
  { id: "tdap", name: "Tdap", date: "Jan 2019" },
  { id: "hepb", name: "Hepatitis B, 3 doses", date: "1999" },
]

export const DOCUMENTS = [
  { id: "physical", name: "Annual physical note", where: "Harborview", date: "Aug 12, 2026" },
  { id: "labs", name: "Lipid and metabolic panel", where: "Quest", date: "Aug 14, 2026" },
  { id: "discharge", name: "Urgent care discharge summary", where: "Scripps Memorial", date: "Jun 3, 2026" },
  { id: "ecg", name: "Electrocardiogram report", where: "Scripps Memorial", date: "Jun 3, 2026" },
  { id: "physical-25", name: "Annual physical note", where: "Harborview", date: "Apr 8, 2025" },
]

/* ------------------------------------------------ orders and care gaps -- */

export type OrderState = "planned" | "due-soon" | "due" | "overdue" | "booked" | "done"

export const ORDER_LABEL: Record<OrderState, string> = {
  planned: "Planned",
  "due-soon": "Due soon",
  due: "Due",
  overdue: "Overdue",
  booked: "Booked",
  done: "Done",
}

/** A place that takes cash for a test, with its phone number (to change or
    cancel a booking there). Its soonest opening is counted in days from
    today, so it is never in the past. */
export type Partner = { name: string; price: string; phone: string; soonestInDays: number; times: string[] }

/** Tests ordered, and whether they were actually done. Each keeps three
    dates: ordered, scheduled and completed. A test booked through Inlay
    gives all three; one booked elsewhere shows only what reaches the
    record. Partners are offered only when the order names no facility. */
export type Order = {
  id: string
  name: string
  by: string
  /** "Mar 4, 2026", and the same as an ISO day. */
  ordered: string
  orderedAt: string
  /** "By Apr 4, 2026", and the day as ISO. */
  due: string
  dueAt: string
  state: OrderState
  scheduled?: string
  completed?: string
  /** The facility the order names, if any: booked there, never with a partner. */
  at?: string
  partners?: Partner[]
  /** The markers this test measures. */
  markers?: string[]
  /** "Fast for 10 to 12 hours. Water is fine." */
  prep?: string
  kind: "lab" | "imaging" | "procedure"
}

const IMAGING_TIMES = ["10:15 AM", "1:30 PM", "3:45 PM"]
const IMAGING: Partner[] = [
  { name: "Basha Diagnostics, La Jolla", price: "$120", phone: "(858) 555-0163", soonestInDays: 2, times: IMAGING_TIMES },
  { name: "Coastal Imaging, Del Mar", price: "$145", phone: "(858) 555-0131", soonestInDays: 1, times: IMAGING_TIMES },
  { name: "RadNet, Encinitas", price: "$165", phone: "(760) 555-0188", soonestInDays: 4, times: IMAGING_TIMES },
]
const BLOOD_TIMES = ["7:30 AM", "8:15 AM", "9:00 AM"]
const BLOOD: Partner[] = [
  { name: "Quest Diagnostics, Del Mar", price: "$39", phone: "(858) 555-0119", soonestInDays: 1, times: BLOOD_TIMES },
  { name: "Labcorp, Solana Beach", price: "$45", phone: "(858) 555-0127", soonestInDays: 3, times: BLOOD_TIMES },
]

/** The phone number of a place the record names: a partner's, or one in
    PLACE_PHONE, matched by its full name or its first part ("Pacific
    Heart"). The clinic's own is PATIENT.practicePhone. */
export function phoneOf(place: string | undefined): string | undefined {
  if (!place) return undefined
  const first = (p: string) => p.split(",")[0].trim().toLowerCase()
  const partner = [...IMAGING, ...BLOOD].find((p) => p.name === place || first(p.name) === first(place))
  if (partner) return partner.phone
  const named = Object.keys(PLACE_PHONE).find((p) => p === place || first(p) === first(place))
  return named ? PLACE_PHONE[named] : undefined
}

export const ORDERS: Order[] = [
  {
    id: "mammogram",
    name: "Screening mammogram",
    by: "Dr. Maya Patel",
    ordered: "Mar 4, 2026",
    orderedAt: "2026-03-04",
    due: "By Apr 4, 2026",
    dueAt: "2026-04-04",
    state: "overdue",
    kind: "imaging",
    partners: IMAGING,
  },
  {
    id: "echo",
    name: "Echocardiogram",
    by: "Dr. Lee, Pacific Heart",
    ordered: "Jul 21, 2026",
    orderedAt: "2026-07-21",
    due: "By Oct 21, 2026",
    dueAt: "2026-10-21",
    state: "due-soon",
    kind: "imaging",
    at: "Pacific Heart, La Jolla",
  },
  // One order for one fasting blood draw (A-41): the repeat A1c and the
  // lipid panel were ordered together.
  {
    id: "labs-nov",
    name: "Repeat A1c and lipid panel",
    by: "Dr. Maya Patel",
    ordered: "Aug 12, 2026",
    orderedAt: "2026-08-12",
    due: "By Nov 12, 2026",
    dueAt: "2026-11-12",
    state: "planned",
    kind: "lab",
    markers: ["a1c", "ldl", "tg", "hdl"],
    prep: "Fast for 10 to 12 hours. Water is fine.",
    partners: BLOOD,
  },
  {
    id: "labs-26",
    name: "Lipid and metabolic panel",
    by: "Dr. Maya Patel",
    ordered: "Aug 1, 2026",
    orderedAt: "2026-08-01",
    due: "Aug 14, 2026",
    dueAt: "2026-08-14",
    state: "done",
    scheduled: "Aug 14, 2026",
    completed: "Aug 14, 2026",
    at: "Quest Diagnostics, Del Mar",
    kind: "lab",
    markers: ["a1c", "ldl", "tg", "hdl", "glucose"],
  },
]

/** Order ids from earlier builds that now live in one order. */
const MERGED_ORDERS: Record<string, string> = { a1c: "labs-nov", lipids: "labs-nov" }

export const order = (id: string) => ORDERS.find((o) => o.id === (MERGED_ORDERS[id] ?? id))

export type GapKind = "preventive" | "condition" | "follow-up" | "order"

export const GAP_LABEL: Record<GapKind, string> = {
  preventive: "Preventive care",
  condition: "To talk about with Dr. Patel",
  "follow-up": "Follow up visit",
  order: "Test not done yet",
}

/** Found automatically. The patient is reminded up to three times, about
    every 2 weeks (an order gets 14 days to be booked first), and at 6 weeks
    the doctor and the practice are told. */
export type CareGap = {
  id: string
  kind: GapKind
  title: string
  why: string
  /** Reminders sent so far, of three. */
  reminders: number
  sent: string[]
  action: "book" | "call" | "talk"
  /** The question to save for her next visit (a "talk" gap). */
  question?: string
}

export const CARE_GAPS: CareGap[] = [
  {
    id: "mammogram",
    kind: "order",
    title: "Screening mammogram",
    why: "Dr. Patel ordered it on Mar 4, 2026. No result has reached your record.",
    reminders: 3,
    sent: ["Mar 18", "Apr 1", "Apr 15"],
    action: "book",
  },
  {
    id: "follow-up",
    kind: "follow-up",
    title: "Follow up after urgent care",
    why: "Scripps Memorial asked you to see your doctor within 2 weeks of your visit on Jun 3, 2026.",
    reminders: 2,
    sent: ["Sep 1", "Sep 15"],
    action: "call",
  },
  {
    id: "colon",
    kind: "preventive",
    title: "Colorectal cancer screening",
    why: "Screening is advised from age 45. There is none in your record.",
    reminders: 1,
    sent: ["Sep 29"],
    action: "talk",
    question: "Which colorectal screening is right for me, and when?",
  },
]

/* -------------------------------------------------------- dashboard -- */

/** When the record last took in something new. */
export const UPDATED = "Today, 8:47 AM"

/* ------------------------------------------------------ notifications -- */

export type NoticeKind = "result" | "reminder" | "review" | "record" | "ai"

export type Notice = {
  id: string
  kind: NoticeKind
  title: string
  body: string
  /** When it arrived: a local day and time ("2026-10-01T08:47"). Day groups
      ("Today", "Yesterday", "Earlier") come from it. */
  at: string
  /** The older screen's words for `at`; removed at integration. */
  when: string
  day: "Today" | "Yesterday" | "Earlier"
  href?: string
}

/** A local day and time, "2026-10-01T08:47", the form the kits read as a
    local day. */
const localAt = (d: Date, h: number, m: number) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(h)}:${pad2(m)}`

/** The day the sample record came together: four days ago, as the demo
    seeds have it. lib/todo.ts noticesFor() dates the first two from the
    store's own onboarding day. */
const ONBOARDED = new Date(Date.now() - 4 * 86400000)

/** What Inlay has told the free patient, newest first: new results, care
    task reminders, the doctor's review, new records. In the app only; a
    push never carries health details or an offer (F-106, F-109). */
export const NOTIFICATIONS: Notice[] = [
  { id: "n1", kind: "record", title: "Your record is ready", body: "We found records from 3 places and put them together.", at: localAt(ONBOARDED, 8, 47), when: "8:47 AM", day: "Earlier", href: "/results" },
  { id: "n2", kind: "review", title: "Dr. Patel is checking your record", body: "Your doctor confirms your record, medicines above all.", at: localAt(ONBOARDED, 8, 50), when: "8:50 AM", day: "Earlier", href: "/results" },
  { id: "n3", kind: "reminder", title: "Colorectal cancer screening", body: "Reminder 1 of 3. Screening is advised from age 45.", at: "2026-09-29T09:00", when: "Sep 29", day: "Earlier", href: "/task/colon" },
  { id: "n4", kind: "reminder", title: "Follow up after urgent care", body: "Reminder 2 of 3. Book a visit with your doctor.", at: "2026-09-15T09:00", when: "Sep 15", day: "Earlier", href: "/task/follow-up" },
  { id: "n5", kind: "result", title: "New lab results", body: "Your lipid and metabolic panel from Quest is in your record.", at: "2026-08-14T16:20", when: "Aug 14", day: "Earlier", href: "/biomarker/ldl" },
]

/** A member's notifications with fixed days, newest first; lib/todo.ts
    noticesFor() adds the one about this week's booked tests. */
export const MEMBER_NOTIFICATIONS: Notice[] = [
  { id: "m-plan-v2", kind: "review", title: "Version 2 of your plan is approved", body: "Dr. Patel approved your updated plan.", at: "2026-09-12T15:10", when: "Sep 12", day: "Earlier", href: "/plan" },
  { id: "m-labs", kind: "result", title: "New lab results", body: "Your lipid and metabolic panel from Quest is in your record.", at: "2026-08-14T16:20", when: "Aug 14", day: "Earlier", href: "/biomarker/ldl" },
  { id: "m-mammogram", kind: "reminder", title: "Screening mammogram", body: "Reminder 3 of 3. Dr. Patel's team will reach out.", at: "2026-04-15T09:00", when: "Apr 15", day: "Earlier", href: "/order/mammogram" },
]

/* ---------------------------------------------------------- timeline -- */

export type TimelineKind = "results" | "visits" | "medicines" | "procedures" | "documents"

export type TimelineEntry = { kind: TimelineKind; title: string; where: string; date: string; year: string; outside?: boolean }

const yearOf = (date: string) => date.match(/\d{4}/)?.[0] ?? ""
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const sortKey = (date: string) => {
  const year = Number(yearOf(date))
  const month = MONTH_NAMES.findIndex((m) => date.startsWith(m))
  const day = Number(date.match(/ (\d{1,2}),/)?.[1] ?? 1)
  return year * 10000 + Math.max(month, 0) * 100 + day
}

/** Everything in the record that happened on a date, newest first. */
export function timeline(): TimelineEntry[] {
  const entries: Omit<TimelineEntry, "year">[] = [
    ...VISITS.map((v) => ({ kind: "visits" as const, title: v.name, where: v.where, date: v.date, outside: v.origin !== "doctor" })),
    ...PROCEDURES.map((p) => ({ kind: "procedures" as const, title: p.name, where: p.where, date: p.date })),
    ...DOCUMENTS.map((d) => ({ kind: "documents" as const, title: d.name, where: d.where, date: d.date })),
    ...ORDERS.filter((o) => o.completed).map((o) => ({ kind: "results" as const, title: o.name, where: o.at ?? "", date: o.completed! })),
    ...MEDICATIONS.flatMap((m) =>
      m.lists.filter((l) => l.origin !== "you").map((l) => ({ kind: "medicines" as const, title: `${m.name}, ${l.dose}`, where: ORIGIN_LABEL[l.origin], date: l.date }))
    ),
  ]
  return entries.map((e) => ({ ...e, year: yearOf(e.date) })).sort((a, b) => sortKey(b.date) - sortKey(a.date))
}

/* --------------------------------------------------------- access log -- */

/** Who looked at what, and when. */
export const ACCESS_LOG = [
  { who: "Dr. Maya Patel", role: "Physician", what: "Viewed your lab results", when: "Today, 10:14 AM" },
  { who: "Sam Ortiz", role: "Care coordinator", what: "Viewed your care gaps", when: "Today, 9:02 AM" },
  { who: "Inlay Health", role: "Record check", what: "Matched your records from 3 providers", when: "Today, 8:47 AM" },
  { who: "You", role: "Patient", what: "Signed the authorization", when: "Today, 8:45 AM" },
]
