import { DEMOGRAPHICS } from "@/lib/patient"
import type { Biomarker, Point } from "@/lib/record"
import { classify, monthYear, watchList, type Trend } from "@/lib/trends"

/* What the two biological age screens (onboarding/biological-age.tsx and
   onboarding/what-is-driving-it.tsx) read. Agreed on the 16 Oct 2026 call
   with Dr. Blanchard: after "trending the wrong way" comes the biological
   age, then what is driving it (e.g. BMI, blood sugar, blood pressure), then
   the plans that can help. BMI is taken from the record.

   There is NO approved biological age model yet (the AI lead owns it), so
   the number below is a labelled sample, not a calculation. Calendar age,
   BMI and the drivers are all real: they come from the patient's date of
   birth and her record. Contribution values (years per driver) are left out
   on purpose until the model supplies them. */

/** The sample gap, in years, until the model exists. The portal's patient
    list also uses a sample (src/components/practice/patients.tsx). Swap this
    one value for the model's output; nothing else on the screens changes. */
export const SAMPLE_GAP_YEARS = 8

/** Whole years between a "MM/DD/YYYY" birthday and a day. */
export function calendarAge(dateOfBirth: string = DEMOGRAPHICS.dateOfBirth, on: Date = new Date()) {
  const [m, d, y] = dateOfBirth.split("/").map(Number)
  const years = on.getFullYear() - y
  const had = on.getMonth() + 1 > m || (on.getMonth() + 1 === m && on.getDate() >= d)
  return had ? years : years - 1
}

export type BiologicalAge = {
  calendar: number
  biological: number
  /** Biological minus calendar: above 0 is older. */
  gap: number
  /** True while the number is the sample, not the model's. */
  sample: boolean
}

export function biologicalAge(on: Date = new Date()): BiologicalAge {
  const calendar = calendarAge(DEMOGRAPHICS.dateOfBirth, on)
  return { calendar, biological: calendar + SAMPLE_GAP_YEARS, gap: SAMPLE_GAP_YEARS, sample: true }
}

/** The sample history, oldest first: years above today's number at each
    quarter over the last 12 months, so the line falls to the current value
    (21 Oct 2026 call: "this is what it's done over time"). A sample like
    SAMPLE_GAP_YEARS; swap this list for the model's readings. */
export const SAMPLE_HISTORY_OFFSETS = [2, 2, 1, 1, 0]

export type BiologicalAgeReading = { at: Date; biological: number; calendar: number; gap: number }

/** One reading per quarter, the last on `on`, ending at biologicalAge(). */
export function biologicalAgeHistory(on: Date = new Date()): { readings: BiologicalAgeReading[]; sample: boolean } {
  const now = biologicalAge(on)
  const last = SAMPLE_HISTORY_OFFSETS.length - 1
  const readings = SAMPLE_HISTORY_OFFSETS.map((offset, i) => {
    const at = new Date(on.getFullYear(), on.getMonth() - (last - i) * 3, Math.min(on.getDate(), 28))
    const calendar = calendarAge(DEMOGRAPHICS.dateOfBirth, at)
    const biological = now.biological + offset
    return { at, biological, calendar, gap: biological - calendar }
  })
  return { readings, sample: now.sample }
}

/** The history as a record marker, so the chart kit and the trend tile draw
    and colour it like any result: today's calendar age is the top of her
    range, so older than her years reads out of range and a falling line
    improves. */
export function biologicalAgeMarker(on: Date = new Date()): Biomarker {
  const { calendar } = biologicalAge(on)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const points: Point[] = biologicalAgeHistory(on).readings.map((r) => ({
    date: monthYear(r.at.getTime()),
    at: iso(r.at),
    value: r.biological,
    origin: "report",
  }))
  return { id: "biological-age", name: "Biological age", unit: "years", high: calendar, target: `${calendar} or younger`, points }
}

/** The history as a trend: status, movement and the latest reading. */
export const biologicalAgeTrend = (on: Date = new Date()): Trend => classify(biologicalAgeMarker(on))

/** The one line under the card's trend: "Down 2 years since Oct 2025". */
export function changeLabel(t: Trend): string | undefined {
  const { first, latest } = t
  if (!first || !latest || first === latest) return undefined
  const d = Math.round((latest.value - first.value) * 10) / 10
  const since = `since ${monthYear(first.t)}`
  if (!d) return `No change ${since}`
  const n = Math.abs(d)
  return `${d < 0 ? "Down" : "Up"} ${n} ${n === 1 ? "year" : "years"} ${since}`
}

/** Her BMI as the record holds it (measured at a visit from her height and
    weight), with its status and last date. Undefined with no BMI on file. */
export function bmiOf(markers: Biomarker[]): Trend | undefined {
  const b = markers.find((m) => m.id === "bmi")
  const t = b && classify(b)
  return t?.latest ? t : undefined
}

/** What is weighing on it: the results out of range or borderline, or
    moving away from her range, in the app's watch order. No weights, no
    years. BMI leads when it is one, as the call listed it first (BMI,
    blood sugar, blood pressure). */
export function drivers(markers: Biomarker[]): Trend[] {
  const list = watchList(markers).filter((t) => t.status !== "in" || t.meaning === "away")
  return [...list.filter((t) => t.id === "bmi"), ...list.filter((t) => t.id !== "bmi")]
}
