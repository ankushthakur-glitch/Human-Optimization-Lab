import type { Trend } from "@/components/dashboard-kit"
import { NOW, daysSince, ms } from "@/components/provider/mock-clock"
import type {
  CareGap,
  ClinicalReport,
  DashCondition,
  DashboardData,
  LabReading,
  LabResult,
  MedEntry,
  OutsideEncounter,
  PatientMedAnswer,
  ReconciliationState,
  ReviewLog,
  TrackedOrder,
} from "@/components/patient-dashboard/types"

/* The dashboard's rules, as pure functions over its data. Nothing here is
   stored: statuses, trends, counts, the sections shown and their order are
   all read off the data each render, so a changed value changes the page. */

/* --------------------------------------------------------------- keys -- */

export const orderKey = (o: { order: string }) => `order:${o.order}`
export const gapKey = (g: { gap: string }) => `gap:${g.gap}`
export const encounterKey = (e: { event: string; date: string }) =>
  `encounter:${e.event}:${e.date}`
export const reportKey = (r: { report: string; date: string }) =>
  `report:${r.report}:${r.date}`
export const intakeKey = (i: { completedAt: string }) =>
  `intake:${i.completedAt}`
export const resultKey = (code: string, date: string) =>
  `result:${code}:${date}`

/* ------------------------------------------------------------ sources -- */

/** The short name a source goes by in a sentence or a chip. */
const SHORT_SOURCE: Record<string, string> = {
  "Quest Diagnostics": "Quest",
  "Practice EHR": "Practice",
}

/** "UC San Diego Health (Epic)" as "UC San Diego Health": the system without its vendor. */
export function sourceName(source: string) {
  return source.replace(/\s*\([^)]*\)\s*$/, "")
}

/** The short name a source goes by in a brief: "Quest", "UC San Diego Health". */
export function shortSource(source: string) {
  return SHORT_SOURCE[source] ?? sourceName(source)
}

/* ------------------------------------------------------------ results -- */

export type ResultStatus = "Critical" | "High" | "Low" | "In range"

/** Same code and same unit: readings in another unit never share a line. */
export function comparable(lab: LabResult): LabReading[] {
  return lab.history.filter((h) => (h.unit ?? lab.unit) === lab.unit)
}

export function latestOf(lab: LabResult): LabReading | undefined {
  const h = comparable(lab)
  return h[h.length - 1]
}

export function previousOf(lab: LabResult): LabReading | undefined {
  const h = comparable(lab)
  return h[h.length - 2]
}

/** A lab flag wins (Critical, then H or L); otherwise the value against the range. */
export function readingStatus(lab: LabResult, r: LabReading): ResultStatus {
  if (r.flag === "Critical") return "Critical"
  if (r.flag === "H") return "High"
  if (r.flag === "L") return "Low"
  if (lab.refHigh != null && r.value > lab.refHigh) return "High"
  if (lab.refLow != null && r.value < lab.refLow) return "Low"
  return "In range"
}

export function statusOf(lab: LabResult): ResultStatus {
  const last = latestOf(lab)
  return last ? readingStatus(lab, last) : "In range"
}

/**
 * In range now, but the last three comparable readings move strictly one
 * way and the latest is within 10% of the limit it is heading for.
 */
export function isTrending(lab: LabResult): boolean {
  const h = comparable(lab)
  if (h.length < 3 || statusOf(lab) !== "In range") return false
  const [a, b, c] = h.slice(-3).map((r) => r.value)
  if (a < b && b < c) return lab.refHigh != null && c >= lab.refHigh * 0.9
  if (a > b && b > c) return lab.refLow != null && c <= lab.refLow * 1.1
  return false
}

/** How far inside the range a value sits; negative outside it. */
function margin(lab: LabResult, v: number) {
  const sides = [
    lab.refLow != null ? v - lab.refLow : Infinity,
    lab.refHigh != null ? lab.refHigh - v : Infinity,
  ]
  return Math.min(...sides)
}

/**
 * The last two comparable readings, judged by which way is better: a move
 * of more than 5% is Worsening or Improving, less is Stable, one reading is
 * New. For range markers, worse is toward the nearer limit or further out.
 */
export function trendOf(lab: LabResult): Trend {
  const h = comparable(lab)
  if (h.length < 2) return "new"
  const prev = h[h.length - 2].value
  const last = h[h.length - 1].value
  if (Math.abs(last - prev) / Math.abs(prev || 1) <= 0.05) return "stable"
  const worse =
    lab.betterDirection === "lower"
      ? last > prev
      : lab.betterDirection === "higher"
        ? last < prev
        : margin(lab, last) < margin(lab, prev)
  return worse ? "worsening" : "improving"
}

/** How far outside the range the latest sits, as a share of the limit. */
export function distanceOutside(lab: LabResult) {
  const v = latestOf(lab)?.value
  if (v == null) return 0
  if (lab.refHigh != null && v > lab.refHigh)
    return (v - lab.refHigh) / Math.abs(lab.refHigh || 1)
  if (lab.refLow != null && v < lab.refLow)
    return (lab.refLow - v) / Math.abs(lab.refLow || 1)
  return 0
}

/** Out of range from an outside source, or Critical. */
export function isUrgentResult(lab: LabResult) {
  const status = statusOf(lab)
  if (status === "Critical") return true
  return status !== "In range" && Boolean(latestOf(lab)?.isOutsideSource)
}

/** Critical, then urgent, then newest, then Worsening, then furthest outside the range. */
export function byConcern(a: LabResult, b: LabResult) {
  const rank = (l: LabResult) => [
    statusOf(l) === "Critical" ? 0 : 1,
    isUrgentResult(l) ? 0 : 1,
    -ms(latestOf(l)?.date ?? "1970-01-01"),
    trendOf(l) === "worsening" ? 0 : 1,
    -distanceOutside(l),
  ]
  const ra = rank(a)
  const rb = rank(b)
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
  return a.name.localeCompare(b.name)
}

/** How much room a trending result has left before the limit it is heading for. */
function closeness(lab: LabResult) {
  const v = latestOf(lab)?.value ?? 0
  const rising = v > (previousOf(lab)?.value ?? v)
  const limit = rising ? lab.refHigh : lab.refLow
  return limit != null ? Math.abs(limit - v) / Math.abs(limit || 1) : 1
}

export function outOfRange(labs: LabResult[]) {
  return labs
    .filter((l) => latestOf(l) && statusOf(l) !== "In range")
    .sort(byConcern)
}

export function trending(labs: LabResult[]) {
  return labs.filter(isTrending).sort((a, b) => closeness(a) - closeness(b))
}

/** Latest in range and not trending. */
export function inRangeCount(labs: LabResult[]) {
  return labs.filter(
    (l) => latestOf(l) && statusOf(l) === "In range" && !isTrending(l)
  ).length
}

/* ------------------------------------------------------ medications -- */

export type MedCase = {
  key: string
  medication: string
  practice?: MedEntry
  /** The other source's entry that differs from the practice list. */
  other?: MedEntry
  answer?: PatientMedAnswer
  /** The recorded allergy the drug matches. */
  allergy?: string
  /** The entry or answer date the case was last touched. */
  date: string
}

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

/** "10 mg daily". */
export const doseText = (m: MedEntry) =>
  [m.dose, m.frequency].filter(Boolean).join(" ")

/** Medication + source + dose: a later entry that differs is a new case. */
export function caseKey(medication: string, source: string, value: string) {
  return `${medication}|${source}|${value}`
}

/**
 * One case per medication that needs a decision: another source lists a
 * different dose, or a drug the practice list lacks; the patient answers
 * anything but Taking; or a source lists a drug matching an allergy.
 */
export function medicationCases(
  data: Pick<DashboardData, "medications" | "answers" | "allergies">,
  states: ReconciliationState[]
): MedCase[] {
  const names = [
    ...new Set([
      ...data.medications.map((m) => m.medication),
      ...data.answers.map((a) => a.medication),
    ]),
  ]
  const cases: MedCase[] = []
  for (const name of names) {
    const entries = data.medications.filter((m) => same(m.medication, name))
    const practice = entries.find((m) => m.isPracticeList)
    const others = entries
      .filter((m) => !m.isPracticeList)
      .sort((a, b) => b.date.localeCompare(a.date))
    const other = others.find((m) => !practice || !same(m.dose, practice.dose))
    const answer = data.answers
      .filter((a) => same(a.medication, name))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const allergy = data.allergies.find((a) =>
      entries.some((m) =>
        m.medication.toLowerCase().includes(a.substance.toLowerCase())
      )
    )?.substance
    const asked = answer && answer.answer !== "Taking"
    if (!other && !asked && !allergy) continue

    const key = other
      ? caseKey(name, other.source, other.dose)
      : asked
        ? caseKey(name, "Patient", answer.answer)
        : caseKey(name, entries[0]?.source ?? "", entries[0]?.dose ?? "")
    const state = states.find((s) => s.key === key)
    if (state && state.status !== "open") continue

    const date =
      [other?.date, answer?.date, practice?.date]
        .filter(Boolean)
        .sort()
        .pop() ?? ""
    cases.push({
      key,
      medication: name,
      practice,
      other,
      answer,
      allergy,
      date,
    })
  }
  /* A change another source reports leads; the patient's own answers follow. */
  return cases.sort((a, b) => Number(!a.other) - Number(!b.other))
}

/* ------------------------------------------------- orders and gaps -- */

export type Clock =
  | { kind: "future"; scheduledAt: string }
  | {
      kind: "running"
      day: number
      marks: number[]
      escalateAt: number
      overdue: boolean
    }

/** A pushed-back item restarts its clock on the day the postponement ends. */
export type Postponed = { postponedUntil?: string }

const dayFrom = (iso: string) => Math.max(0, daysSince(iso))

/**
 * Not scheduled: days since ordered, reminders at 14 and 28, escalation at
 * 42. Scheduled and not done: days since the date, 1 and 14, then 28. A
 * date still ahead is a future order with an empty clock.
 */
export function orderClock(o: TrackedOrder & Postponed): Clock {
  const today = NOW.slice(0, 10)
  if (o.scheduledAt && o.scheduledAt > today)
    return { kind: "future", scheduledAt: o.scheduledAt }
  if (o.scheduledAt) {
    const day = dayFrom(o.postponedUntil ?? o.scheduledAt)
    return {
      kind: "running",
      day,
      marks: [1, 14],
      escalateAt: 28,
      overdue: day >= 28,
    }
  }
  const day = dayFrom(o.postponedUntil ?? o.orderedAt)
  return {
    kind: "running",
    day,
    marks: [14, 28],
    escalateAt: 42,
    overdue: day >= 42,
  }
}

/** Days since due; overdue once more than 30 days past. */
export function gapClock(g: CareGap & Postponed): Clock {
  const day = dayFrom(g.postponedUntil ?? g.due)
  return {
    kind: "running",
    day,
    marks: [14, 28],
    escalateAt: 30,
    overdue: day > 30,
  }
}

export const isOverdue = (c: Clock) => c.kind === "running" && c.overdue

/** Reminders sent since the clock last started. */
export function orderReminders(o: TrackedOrder & Postponed) {
  return o.reminderDates.filter(
    (d) => !o.postponedUntil || d > o.postponedUntil
  ).length
}
export function gapReminders(g: CareGap & Postponed) {
  return g.postponedUntil ? 0 : g.remindersSent
}

/* ---------------------------------------------------- review window -- */

export function lastReview(log: ReviewLog[]): ReviewLog | undefined {
  return [...log].sort((a, b) => a.at.localeCompare(b.at)).pop()
}

const after = (date: string, cutoff?: string) =>
  !cutoff || ms(date) > ms(cutoff)

export type EventType =
  "result" | "medication" | "outside visit" | "diagnosis" | "report"
export type DashEvent = { date: string; type: EventType; label: string }

/** Abnormal or Critical reports still waiting for the physician. */
export function reportsToReview(reports: ClinicalReport[]) {
  return reports
    .filter((r) => !r.reviewed && r.flag !== "Normal")
    .sort(
      (a, b) =>
        Number(isUrgentReport(b)) - Number(isUrgentReport(a)) ||
        b.date.localeCompare(a.date)
    )
}

export function isUrgentReport(r: ClinicalReport) {
  return Boolean(r.redFlag) || r.isOutsideSource
}

/** Everything dated after the last review, one event per item. */
export function sinceEvents(
  data: DashboardData,
  cases: MedCase[],
  cutoff: string | undefined
): DashEvent[] {
  const events: DashEvent[] = []
  for (const lab of data.labs)
    for (const r of comparable(lab))
      if (after(r.date, cutoff))
        events.push({
          date: r.date,
          type: "result",
          label: `${lab.name} ${r.value} ${lab.unit}`,
        })
  for (const c of cases) {
    const dates = [c.other?.date, c.answer?.date].filter(
      (d): d is string => !!d && after(d, cutoff)
    )
    if (dates.length)
      events.push({
        date: dates.sort().pop()!,
        type: "medication",
        label: c.medication,
      })
  }
  for (const e of data.encounters)
    if (after(e.date, cutoff))
      events.push({
        date: e.date,
        type: "outside visit",
        label: `${e.event}, ${e.facility}`,
      })
  for (const c of data.conditions)
    if (after(c.addedAt, cutoff))
      events.push({ date: c.addedAt, type: "diagnosis", label: c.name })
  for (const r of data.reports)
    if (r.flag !== "Normal" && after(r.date, cutoff))
      events.push({ date: r.date, type: "report", label: r.report })
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

const NOUN: Record<EventType, [one: string, many: string]> = {
  result: ["new result", "new results"],
  medication: ["medication change", "medication changes"],
  "outside visit": ["outside visit", "outside visits"],
  diagnosis: ["new diagnosis", "new diagnoses"],
  report: ["new report", "new reports"],
}

export const EVENT_ORDER: EventType[] = [
  "result",
  "medication",
  "outside visit",
  "diagnosis",
  "report",
]

/** "4 new results", one per type with any, in a fixed order. */
export function eventChips(events: DashEvent[]) {
  return EVENT_ORDER.map((type) => {
    const n = events.filter((e) => e.type === type).length
    return { type, count: n, label: `${n} ${NOUN[type][n === 1 ? 0 : 1]}` }
  }).filter((c) => c.count > 0)
}

/* ---------------------------------------------------- record sources -- */

export type RecordSource = {
  source: string
  isPractice: boolean
  counts: { label: string; count: number }[]
  first: string
  last: string
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** One row per system the record came from, for validating a new record. */
export function recordSources(data: DashboardData): RecordSource[] {
  const by = new Map<
    string,
    {
      results: number
      meds: number
      encounters: number
      reports: number
      dates: string[]
    }
  >()
  const row = (source: string) => {
    if (!by.has(source))
      by.set(source, {
        results: 0,
        meds: 0,
        encounters: 0,
        reports: 0,
        dates: [],
      })
    return by.get(source)!
  }
  for (const lab of data.labs)
    for (const r of lab.history) {
      row(r.source).results++
      row(r.source).dates.push(r.date)
    }
  for (const m of data.medications) {
    row(m.source).meds++
    row(m.source).dates.push(m.date)
  }
  for (const e of data.encounters) {
    row(e.source).encounters++
    row(e.source).dates.push(e.date)
  }
  for (const r of data.reports) {
    row(r.source).reports++
    row(r.source).dates.push(r.date)
  }
  return [...by.entries()]
    .map(([source, r]) => {
      const dates = r.dates.sort()
      return {
        source,
        isPractice: source === data.practiceSource,
        counts: [
          { label: plural(r.results, "result", "results"), count: r.results },
          { label: plural(r.meds, "medication", "medications"), count: r.meds },
          {
            label: plural(r.encounters, "encounter", "encounters"),
            count: r.encounters,
          },
          { label: plural(r.reports, "report", "reports"), count: r.reports },
        ].filter((c) => c.count > 0),
        first: dates[0],
        last: dates[dates.length - 1],
      }
    })
    .sort(
      (a, b) =>
        Number(b.isPractice) - Number(a.isPractice) ||
        b.last.localeCompare(a.last)
    )
}

/* ------------------------------------------------------ problem list -- */

export type ProblemRow = {
  condition: DashCondition
  line?:
    | {
        kind: "value"
        label: string
        /** The latest reading as shown beside the problem: "6.1%", "138", "158/94". */
        value: string
        unit: string
        points: { date: string; value: number; flag?: "H" | "L" | "Critical" }[]
        refLow?: number
        refHigh?: number
        trend: Trend
      }
    | { kind: "stale" }
}

const MARKER: Record<string, { label: string; code?: string }> = {
  hba1c: { label: "HbA1c", code: "4548-4" },
  ldl: { label: "LDL-C", code: "13457-7" },
  egfr: { label: "eGFR", code: "33914-3" },
  tsh: { label: "TSH", code: "3016-3" },
  bp: { label: "BP" },
  weight: { label: "Weight" },
}

const STALE_DAYS = 365

function problemLine(
  c: DashCondition,
  data: DashboardData
): ProblemRow["line"] {
  if (!c.controlMarker) return undefined
  const m = MARKER[c.controlMarker]
  if (c.controlMarker === "bp") {
    const bp = [...data.bp].sort((a, b) => a.date.localeCompare(b.date))
    const last = bp[bp.length - 1]
    if (!last || daysSince(last.date) > STALE_DAYS) return { kind: "stale" }
    /* The trend reads systolic, judged lower is better. */
    const sys: LabResult = {
      code: "bp",
      name: m.label,
      unit: "mmHg",
      betterDirection: "lower",
      history: bp.map((r) => ({
        date: r.date,
        value: r.systolic,
        source: r.source,
        isOutsideSource: false,
      })),
    }
    return {
      kind: "value",
      label: m.label,
      value: `${last.systolic}/${last.diastolic}`,
      unit: "mmHg",
      points: bp.map((r) => ({ date: r.date, value: r.systolic })),
      trend: trendOf(sys),
    }
  }
  const lab = m.code ? data.labs.find((l) => l.code === m.code) : undefined
  const last = lab && latestOf(lab)
  if (!lab || !last || daysSince(last.date) > STALE_DAYS)
    return { kind: "stale" }
  return {
    kind: "value",
    label: m.label,
    /* The unit shows only when it is part of the number, as a percentage is. */
    value: lab.unit === "%" ? `${last.value}%` : String(last.value),
    unit: lab.unit,
    points: comparable(lab).map((r) => ({
      date: r.date,
      value: r.value,
      flag: r.flag,
    })),
    refLow: lab.refLow,
    refHigh: lab.refHigh,
    trend: trendOf(lab),
  }
}

/** Worsening first, then the newest condition. */
export function problemRows(data: DashboardData): ProblemRow[] {
  return data.conditions
    .map((condition) => ({ condition, line: problemLine(condition, data) }))
    .sort((a, b) => {
      const wa =
        a.line?.kind === "value" && a.line.trend === "worsening" ? 0 : 1
      const wb =
        b.line?.kind === "value" && b.line.trend === "worsening" ? 0 : 1
      return wa - wb || b.condition.since.localeCompare(a.condition.since)
    })
}

/* -------------------------------------------------------- key trends -- */

export type KeyTrend = {
  id: string
  /** "HbA1c", "Systolic BP". */
  label: string
  unit: string
  points: { date: string; value: number; flagged: boolean; source: string }[]
  refLow?: number
  refHigh?: number
  betterDirection: LabResult["betterDirection"]
}

/** Systolic above this reads as raised (ACC/AHA stage 1). */
export const SYSTOLIC_HIGH = 130

/** Markers read beside a problem's own control marker. */
const COMPANION: Partial<Record<string, string[]>> = { hba1c: ["1558-6"] }

function labTrend(lab: LabResult, label = lab.name): KeyTrend {
  return {
    id: lab.code,
    label,
    unit: lab.unit,
    points: comparable(lab).map((r) => ({
      date: r.date,
      value: r.value,
      flagged: readingStatus(lab, r) !== "In range",
      source: r.source,
    })),
    refLow: lab.refLow,
    refHigh: lab.refHigh,
    betterDirection: lab.betterDirection,
  }
}

/**
 * One series per active problem's control marker that has results, in the
 * problem list's own order, then their companion markers.
 */
export function keyTrends(data: DashboardData): KeyTrend[] {
  const main: KeyTrend[] = []
  const extra: KeyTrend[] = []
  const seen = new Set<string>()
  const push = (list: KeyTrend[], t?: KeyTrend) => {
    if (!t || t.points.length === 0 || seen.has(t.id)) return
    seen.add(t.id)
    list.push(t)
  }
  for (const c of data.conditions) {
    const marker = c.controlMarker
    if (!marker) continue
    if (marker === "bp") {
      const bp = [...data.bp].sort((a, b) => a.date.localeCompare(b.date))
      push(main, {
        id: "bp",
        label: "Systolic BP",
        unit: "mmHg",
        points: bp.map((r) => ({
          date: r.date,
          value: r.systolic,
          flagged: r.systolic > SYSTOLIC_HIGH,
          source: r.source,
        })),
        refHigh: SYSTOLIC_HIGH,
        betterDirection: "lower",
      })
      continue
    }
    const m = MARKER[marker]
    const lab = m.code ? data.labs.find((l) => l.code === m.code) : undefined
    if (lab) push(main, labTrend(lab, m.label))
    for (const code of COMPANION[marker] ?? []) {
      const comp = data.labs.find((l) => l.code === code)
      if (comp) push(extra, labTrend(comp))
    }
  }
  return [...main, ...extra]
}

/** How far inside its limits a value sits; negative outside them. */
function inside(
  t: {
    refLow?: number
    refHigh?: number
    betterDirection: LabResult["betterDirection"]
  },
  v: number
) {
  if (t.refLow == null && t.refHigh == null)
    return t.betterDirection === "higher" ? v : -v
  return Math.min(
    t.refLow != null ? v - t.refLow : Infinity,
    t.refHigh != null ? t.refHigh - v : Infinity
  )
}

export type Change = {
  /** "Up 1.4 mmol/L", "Down 2 mg/dL", "No change". */
  text: string
  rising: boolean
  /** Toward the limit or further out (red), or back toward range (green). */
  worse: boolean
  flat: boolean
}

/** The move from one value to another, judged against the range. */
export function changeBetween(
  t: {
    unit: string
    refLow?: number
    refHigh?: number
    betterDirection: LabResult["betterDirection"]
  },
  from: number,
  to: number
): Change {
  const places = Math.max(
    ...[from, to].map((n) => (String(n).split(".")[1] ?? "").length)
  )
  const amount = Math.abs(to - from).toFixed(places)
  const flat = Number(amount) === 0
  return {
    text: flat
      ? "No change"
      : `${to > from ? "Up" : "Down"} ${amount} ${t.unit}`,
    rising: to > from,
    worse: inside(t, to) < inside(t, from),
    flat,
  }
}

/** Whole months between two dates. */
export function monthsBetween(from: string, to: string) {
  return Math.max(1, Math.round((ms(to) - ms(from)) / (30.44 * 86_400_000)))
}

/* ------------------------------------------------------ outside care -- */

/** Encounters from the last twelve months, newest first. */
export function recentEncounters(encounters: OutsideEncounter[]) {
  return encounters
    .filter((e) => daysSince(e.date) <= STALE_DAYS)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/* ------------------------------------------------------------ urgent -- */

export type UrgentItem = {
  key: string
  /** "Potassium 5.8 mmol/L (range 3.5-5.1)", "ECG: sinus tachycardia with frequent PVCs". */
  text: string
  source: string
  date: string
  target: { kind: "result"; code: string } | { kind: "report"; key: string }
}

/** "Sinus tachycardia" as "sinus tachycardia"; an acronym keeps its case. */
const lowerFirst = (s: string) =>
  /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s

/**
 * Out-of-range results from an outside source or Critical, and reports
 * with a red flag or from outside; only what nobody has reviewed yet.
 */
export function urgentItems(
  labs: LabResult[],
  reports: ClinicalReport[],
  isReviewed: (lab: LabResult, r: LabReading) => boolean
): UrgentItem[] {
  const items: UrgentItem[] = []
  for (const lab of outOfRange(labs).filter(isUrgentResult)) {
    const last = latestOf(lab)!
    if (isReviewed(lab, last)) continue
    const range = rangeText(lab)
    items.push({
      key: `result:${lab.code}`,
      text: `${lab.name} ${last.value} ${lab.unit}${range ? ` (range ${range})` : ""}`,
      source: last.source,
      date: last.date,
      target: { kind: "result", code: lab.code },
    })
  }
  for (const r of reportsToReview(reports).filter(isUrgentReport))
    items.push({
      key: reportKey(r),
      text: `${r.report}: ${lowerFirst(r.finding)}`,
      source: r.source,
      date: r.date,
      target: { kind: "report", key: reportKey(r) },
    })
  return items
}

/* ------------------------------------------------------------ layout -- */

export type SectionId =
  | "alert"
  | "brief"
  | "person"
  | "results"
  | "detail"
  | "meds"
  | "orders"
  | "outside"
  | "problems"

export type ZoneId = "needs" | "summary" | "work" | "context"

export type Zone = {
  id: ZoneId
  label: string
  rows: { id: SectionId; span: number }[][]
}

/**
 * The four tiers, top to bottom, in the order of the physician's questions:
 * is anything dangerous, what changed, what do I act on, then context. A
 * pair shares a row on a wide screen, in these twelfths.
 */
export const ZONES: Zone[] = [
  { id: "needs", label: "Needs you now", rows: [[{ id: "alert", span: 12 }]] },
  {
    id: "summary",
    label: "Summary",
    rows: [
      [
        { id: "brief", span: 8 },
        { id: "person", span: 4 },
      ],
    ],
  },
  {
    id: "work",
    label: "Work",
    rows: [
      [
        { id: "results", span: 8 },
        { id: "detail", span: 4 },
      ],
      [{ id: "meds", span: 12 }],
      [
        { id: "orders", span: 6 },
        { id: "outside", span: 6 },
      ],
    ],
  },
  { id: "context", label: "Context", rows: [[{ id: "problems", span: 12 }]] },
]

/**
 * The zones and rows to show. Positions never move: a hidden card drops
 * out and its row partner takes the full width; a zone with nothing in it
 * drops out too, except Needs you now, which keeps its done state.
 */
export function zoneLayout(visible: Set<SectionId>): Zone[] {
  return ZONES.map((zone) => ({
    ...zone,
    rows: zone.rows
      .map((row) => row.filter((c) => visible.has(c.id)))
      .filter((row) => row.length > 0)
      .map((row) => (row.length === 1 ? [{ ...row[0], span: 12 }] : row)),
  })).filter((zone) => zone.id === "needs" || zone.rows.length > 0)
}

/* ------------------------------------------------------------ display -- */

/** The range as printed: "3.5-5.1", "< 100" or "≥ 60". */
export function rangeText(lab: LabResult) {
  if (lab.refText) return lab.refText
  if (lab.refLow != null && lab.refHigh != null) {
    /* Both ends to the same decimals, as the lab prints them: 4.0-5.6. */
    const places = (n: number) => (String(n).split(".")[1] ?? "").length
    const d = Math.max(places(lab.refLow), places(lab.refHigh))
    return `${lab.refLow.toFixed(d)}-${lab.refHigh.toFixed(d)}`
  }
  if (lab.refHigh != null) return `< ${lab.refHigh}`
  if (lab.refLow != null) return `≥ ${lab.refLow}`
  return ""
}

/** Whether the latest comparable reading is above the one before it. */
export function isRising(lab: LabResult) {
  const last = latestOf(lab)
  const prev = previousOf(lab)
  return Boolean(last && prev && last.value > prev.value)
}
