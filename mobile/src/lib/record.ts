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

/** The latest lab panel in the record, the home screen's lead card. */
export const LATEST_LABS = { source: "Quest Diagnostics", date: "Aug 14, 2026" } as const

/** HOL's score for the record, out of 100. A stand in until HOL's clinical
    team sets the formula. */
export const HOL_SCORE = 71

/** The Inlay score: half from how the patient says they are flourishing
    (the index, 1 to 5), half from what the record says (fewer flagged
    results, higher). A stand in formula, like HOL_SCORE, until the
    clinical team sets one. */
export function inlayScore(flourish?: number[]) {
  if (!flourish?.length) return HOL_SCORE
  const said = (flourish.reduce((s, x) => s + x, 0) / flourish.length) * 20
  const record = 100 - FINDINGS.length * 6
  return Math.round((said + record) / 2)
}

/** Lab results in range: every lab the record holds less the flagged ones. */
export const LABS_IN_RANGE = {
  inRange: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count - FINDINGS.filter((f) => f.kind === "lab").length,
  total: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count,
}

export type BodySystem = "thyroid" | "heart" | "metabolism"

/** The body map on home: each system glows teal when its results are in
    range and amber when one of them is flagged. */
export const SYSTEMS: { id: BodySystem; name: string; findings: string[] }[] = [
  { id: "thyroid", name: "Thyroid", findings: [] },
  { id: "heart", name: "Heart", findings: ["ldl", "tg", "bp"] },
  { id: "metabolism", name: "Metabolism", findings: ["a1c", "bmi"] },
]

export const systemWatch = (id: BodySystem) =>
  FINDINGS.some((f) => SYSTEMS.find((s) => s.id === id)!.findings.includes(f.id))

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

/** Who reviews the record: the doctor confirms it once it is assembled,
    then every quarter. */
export const REVIEW = {
  by: "Dr. Maya Patel",
  every: "Every 3 months",
} as const

/* ------------------------------------------------------------ medicines -- */

export type MedAnswer = "taking" | "not" | "different"

export const MED_ANSWER_LABEL: Record<MedAnswer, string> = {
  taking: "Taking it",
  not: "Not taking it",
  different: "Taking it differently",
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

export type Direction = "toward" | "away" | "steady" | "unknown"

export const DIRECTION_LABEL: Record<Direction, string> = {
  toward: "Toward target",
  away: "Away from target",
  steady: "Steady",
  unknown: "Too few results",
}

/** The same, as a sentence, for the assistant. */
export const DIRECTION_SENTENCE: Record<Direction, string> = {
  toward: "It's moving toward the target.",
  away: "It's moving away from the target.",
  steady: "It has stayed steady.",
  unknown: "There aren't enough comparable results yet for a trend.",
}

export type Point = { date: string; value: number; shown?: string; origin: Origin; method?: string }

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
}

export const BIOMARKERS: Biomarker[] = [
  {
    id: "a1c",
    name: "Hemoglobin A1c",
    unit: "%",
    high: 5.7,
    target: "Below 5.7",
    points: [
      { date: "Apr 2022", value: 5.3, origin: "lab" },
      { date: "May 2023", value: 5.4, origin: "lab" },
      { date: "May 2024", value: 5.6, origin: "lab" },
      { date: "Jun 2025", value: 5.7, origin: "lab" },
      { date: "Aug 2026", value: 5.9, origin: "lab" },
    ],
  },
  {
    id: "ldl",
    name: "LDL cholesterol",
    unit: "mg/dL",
    high: 100,
    target: "Below 100",
    points: [
      { date: "Apr 2022", value: 128, origin: "lab" },
      { date: "May 2023", value: 141, origin: "lab" },
      { date: "May 2024", value: 150, origin: "lab" },
      { date: "Aug 2026", value: 162, origin: "lab" },
    ],
  },
  {
    id: "tg",
    name: "Triglycerides",
    unit: "mg/dL",
    high: 150,
    target: "Below 150",
    points: [
      { date: "May 2023", value: 150, origin: "lab" },
      { date: "May 2024", value: 172, origin: "lab" },
      { date: "Aug 2026", value: 188, origin: "lab" },
    ],
  },
  {
    id: "bp",
    name: "Blood pressure",
    unit: "mmHg",
    high: 120,
    target: "Below 120/80",
    points: [
      { date: "Mar 2023", value: 124, shown: "124/80", origin: "doctor" },
      { date: "Apr 2024", value: 128, shown: "128/82", origin: "doctor" },
      { date: "Jun 2026", value: 131, shown: "131/84", origin: "hospital" },
      { date: "Aug 2026", value: 134, shown: "134/86", origin: "doctor" },
    ],
  },
  {
    id: "bmi",
    name: "Body mass index",
    unit: "kg/m²",
    low: 18.5,
    high: 24.9,
    target: "18.5 to 24.9",
    points: [
      { date: "Mar 2023", value: 30.2, origin: "doctor" },
      { date: "Apr 2024", value: 31.1, origin: "doctor" },
      { date: "Aug 2026", value: 32.4, origin: "doctor" },
    ],
  },
  {
    id: "vitd",
    name: "Vitamin D, 25 hydroxy",
    unit: "ng/mL",
    low: 30,
    high: 100,
    target: "30 to 100",
    points: [
      { date: "May 2024", value: 24, origin: "lab", method: "Blood draw" },
      { date: "Mar 2026", value: 19, origin: "you", method: "Home finger prick kit" },
      { date: "Aug 2026", value: 21, origin: "lab", method: "Blood draw" },
    ],
    methodNote: "One result is from a home finger prick kit, measured differently from a blood draw, so it is shown but not joined to the line.",
  },
  {
    id: "hdl",
    name: "HDL cholesterol",
    unit: "mg/dL",
    low: 50,
    target: "50 or above",
    points: [
      { date: "May 2023", value: 52, origin: "lab" },
      { date: "May 2024", value: 51, origin: "lab" },
      { date: "Aug 2026", value: 52, origin: "lab" },
    ],
  },
  {
    id: "tsh",
    name: "Thyroid stimulating hormone",
    unit: "mIU/L",
    low: 0.4,
    high: 4,
    target: "0.4 to 4.0",
    points: [{ date: "Aug 2026", value: 2.1, origin: "lab" }],
  },
]

export const biomarker = (id: string) => BIOMARKERS.find((b) => b.id === id)

/** Points on the same method as the latest, oldest first: only these draw
    a line or a direction. */
export const comparable = (b: Biomarker) => {
  const last = b.points.at(-1)!
  return b.points.filter((p) => p.method === last.method)
}

/** How far outside the target band a value is; 0 inside it. A "Below"
    target leaves its own edge out: an A1c of 5.7 is not below 5.7. */
const distance = (b: Biomarker, v: number) => {
  if (b.high !== undefined && (v > b.high || (v === b.high && b.target.startsWith("Below")))) return Math.max(v - b.high, 0.001)
  if (b.low !== undefined && v < b.low) return b.low - v
  return 0
}

/** Direction only, never what it means clinically: that needs the
    doctor. Two or more comparable results, compared first to last. */
export function direction(b: Biomarker): Direction {
  const pts = comparable(b)
  if (pts.length < 2) return "unknown"
  const first = pts[0].value
  const last = pts.at(-1)!.value
  const span = (b.high ?? b.low ?? last) * 0.03
  if (Math.abs(last - first) < span) return "steady"
  const before = distance(b, first)
  const now = distance(b, last)
  if (now === before) return "steady"
  return now > before ? "away" : "toward"
}

export const inRange = (b: Biomarker, v: number) => distance(b, v) === 0

/* ---------------------------------------------------- visits and more -- */

export const VISITS = [
  { id: "annual", name: "Annual physical", where: "Harborview Longevity Clinic", date: "Aug 12, 2026", origin: "doctor" as Origin },
  {
    id: "cardiology",
    name: "Cardiology visit",
    where: "Dr. Lee, Pacific Heart",
    date: "Jul 21, 2026",
    origin: "you" as Origin,
    note: "Your doctor may not know about this",
  },
  {
    id: "urgent",
    name: "Urgent care, headache and high blood pressure",
    where: "Scripps Memorial Hospital",
    date: "Jun 3, 2026",
    origin: "hospital" as Origin,
    note: "Your doctor may not know about this",
  },
  { id: "annual-25", name: "Annual physical", where: "Harborview Longevity Clinic", date: "Apr 8, 2025", origin: "doctor" as Origin },
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

export type OrderState = "planned" | "due-soon" | "due" | "overdue" | "done"

export const ORDER_LABEL: Record<OrderState, string> = {
  planned: "Planned",
  "due-soon": "Due soon",
  due: "Due",
  overdue: "Overdue",
  done: "Done",
}

/** Tests ordered, and whether they were actually done. */
export const ORDERS: { id: string; name: string; by: string; ordered: string; due: string; state: OrderState }[] = [
  { id: "mammogram", name: "Screening mammogram", by: "Dr. Maya Patel", ordered: "Mar 4, 2026", due: "By Apr 4, 2026", state: "overdue" },
  { id: "echo", name: "Echocardiogram", by: "Dr. Lee, Pacific Heart", ordered: "Jul 21, 2026", due: "By Oct 21, 2026", state: "due-soon" },
  { id: "lipids", name: "Repeat lipid panel", by: "Dr. Maya Patel", ordered: "Aug 12, 2026", due: "By Nov 12, 2026", state: "planned" },
  { id: "a1c", name: "Repeat hemoglobin A1c", by: "Dr. Maya Patel", ordered: "Aug 12, 2026", due: "By Nov 12, 2026", state: "planned" },
  { id: "labs-26", name: "Lipid and metabolic panel", by: "Dr. Maya Patel", ordered: "Aug 1, 2026", due: "Aug 14, 2026", state: "done" },
]

export type GapKind = "preventive" | "condition" | "follow-up" | "order"

export const GAP_LABEL: Record<GapKind, string> = {
  preventive: "Preventive care",
  condition: "Condition to check on",
  "follow-up": "Missed follow-up",
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
  where?: string
  /** Cash price partners, offered only when the order names no facility. */
  partners?: { name: string; price: string; soonest: string }[]
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
    partners: [
      { name: "Coastal Imaging, Del Mar", price: "$145", soonest: "Thu, Oct 1" },
      { name: "Basha Diagnostics, La Jolla", price: "$120", soonest: "Mon, Oct 5" },
      { name: "RadNet, Encinitas", price: "$165", soonest: "Wed, Sep 30" },
    ],
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
  },
  {
    id: "a1c",
    kind: "condition",
    title: "Blood sugar is rising",
    why: "Your A1c has gone up in each of your last 4 results, from 5.3 to 5.9.",
    reminders: 0,
    sent: [],
    action: "talk",
  },
]

/* --------------------------------------------------------- access log -- */

/** Who looked at what, and when. */
export const ACCESS_LOG = [
  { who: "Dr. Maya Patel", role: "Physician", what: "Viewed your lab results", when: "Today, 10:14 AM" },
  { who: "Sam Ortiz", role: "Care coordinator", what: "Viewed your care gaps", when: "Today, 9:02 AM" },
  { who: "Inlay Health", role: "Record check", what: "Matched your records from 3 providers", when: "Today, 8:47 AM" },
  { who: "You", role: "Patient", what: "Signed the authorization", when: "Today, 8:45 AM" },
]
