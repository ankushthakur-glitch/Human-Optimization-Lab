import { DEMOGRAPHICS } from "@/lib/patient"
import type { Biomarker } from "@/lib/record"
import { classify, watchList, type Trend } from "@/lib/trends"

/* What the biological age card on home (components/biological-age-card.tsx)
   reads. Agreed on the 16 Oct 2026 call
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
