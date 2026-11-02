/* The ten Executive Health KPIs (client doc "Executive Health KPI's", 2 Nov
   2026): what an employer's investment is accomplishing, as "we identify
   risk, intervene, measure improvement". The provider and clinic manager
   portals both report these. The doc calls the Inlay optimization score the
   centerpiece. Most of it comes from structured Epic data: diagnoses,
   vitals, labs, medications, immunizations, health maintenance, encounters
   and questionnaires. Aggregate only, never a row per patient.

   Count reports on the shared engine, a row per provider, with sums behind
   every rate and average so the Total row is the rate of the summed counts
   and each executive counts once. A rate with nobody to measure reads
   "None". Sample numbers, seeded. */

import {
  type Counts,
  type Draw,
  type FilterOption,
  type Report,
  type ReportFilter,
  raw,
  scaled,
  seeded,
  shareOf,
} from "@/components/provider/reports/reports-data"

/* -------------------------------------------------------------------------- */
/*  Columns                                                                    */
/* -------------------------------------------------------------------------- */

/** A percent of `den`, or NaN ("None") when there is nobody in it. */
const rate = (num: string, den: string) => (c: Counts) =>
  c[den] ? (c[num] / c[den]) * 100 : NaN
/** A mean held as a sum over a count, or NaN when the count is 0. */
const mean = (sum: string, n: string) => (c: Counts) => (c[n] ? c[sum] / c[n] : NaN)
/** The mean change from a baseline sum to a latest sum. */
const change = (latest: string, baseline: string, n: string) => (c: Counts) =>
  c[n] ? (c[latest] - c[baseline]) / c[n] : NaN

/* -------------------------------------------------------------------------- */
/*  Population filters                                                         */
/* -------------------------------------------------------------------------- */

const choices = (words: readonly string[]): FilterOption[] =>
  words.map((w) => ({ label: w, value: w }))

/* The executive population's mix, so a sex or age group keeps the same
   share in every report and the groups add up to everyone. */
const SEX_MIX = { Female: 0.4, Male: 0.6 }
const AGE_MIX = { "Under 40": 0.28, "40 to 49": 0.32, "50 to 64": 0.32, "65 and over": 0.08 }
type Sex = keyof typeof SEX_MIX
type Age = keyof typeof AGE_MIX
type Mix<K extends string> = Record<K, number>

/** A factor per group, scaled so the whole population averages 1: picking
    every group changes nothing. */
function normal<K extends string>(mix: Mix<K>, factor: Mix<K>): Mix<K> {
  const keys = Object.keys(mix) as K[]
  const avg = keys.reduce((s, k) => s + mix[k] * factor[k], 0)
  return Object.fromEntries(keys.map((k) => [k, factor[k] / avg])) as Mix<K>
}

/* How a group leans, per kind of measure. Risk: cardiometabolic disease,
   higher with age and in men. Mood: depression and anxiety, higher in women
   and younger adults. Care: keeping up with screening and follow up,
   higher with age and in women. */
const LEAN = {
  risk: {
    sex: normal(SEX_MIX, { Female: 0.8, Male: 1.13 }),
    age: normal(AGE_MIX, { "Under 40": 0.5, "40 to 49": 0.85, "50 to 64": 1.35, "65 and over": 1.9 }),
  },
  mood: {
    sex: normal(SEX_MIX, { Female: 1.3, Male: 0.8 }),
    age: normal(AGE_MIX, { "Under 40": 1.25, "40 to 49": 1.05, "50 to 64": 0.85, "65 and over": 0.7 }),
  },
  care: {
    sex: normal(SEX_MIX, { Female: 1.06, Male: 0.96 }),
    age: normal(AGE_MIX, { "Under 40": 0.88, "40 to 49": 0.97, "50 to 64": 1.05, "65 and over": 1.1 }),
  },
}
type Lean = keyof typeof LEAN

const EMPLOYER: ReportFilter = {
  id: "employer",
  label: "Employer",
  all: "All employers",
  options: ({ employers }) =>
    employers.filter((e) => e.status === "Active").map((e) => ({ label: e.name, value: e.id })),
}
const SEX: ReportFilter = { id: "sex", label: "Sex", all: "All sexes", options: choices(Object.keys(SEX_MIX)) }
const AGE: ReportFilter = { id: "age", label: "Age group", all: "All ages", options: choices(Object.keys(AGE_MIX)) }

/** The population filters every KPI takes. */
const POPULATION = [EMPLOYER, SEX, AGE]

const sexes = (d: Draw) => (d.filters.sex ? [d.filters.sex as Sex] : (Object.keys(SEX_MIX) as Sex[]))
const ages = (d: Draw) => (d.filters.age ? [d.filters.age as Age] : (Object.keys(AGE_MIX) as Age[]))

/** The mix-weighted average of a factor over the picked groups. */
function over<K extends string>(picked: K[], mix: Mix<K>, factor: Mix<K>) {
  const w = picked.reduce((s, k) => s + mix[k], 0)
  return picked.reduce((s, k) => s + mix[k] * factor[k], 0) / w
}

/** How much the picked employer, sex and age group lean one way: 1 for
    everyone. Each employer's workforce leans its own way, seeded. */
function lean(d: Draw, kind: Lean) {
  const emp = d.filters.employer
  const byEmployer = emp ? 0.86 + seeded(`${kind}|${emp}`)() * 0.28 : 1
  return over(sexes(d), SEX_MIX, LEAN[kind].sex) * over(ages(d), AGE_MIX, LEAN[kind].age) * byEmployer
}

/** `value` leaned by `factor`, whole, and no more than `whole`. */
const tilt = (whole: number, value: number, factor: number) =>
  Math.min(whole, Math.max(0, Math.round(value * factor)))

/** The share of a provider's executives the employer, sex and age group
    filters keep. */
const keptShare = (d: Draw) =>
  shareOf(d.id, d.filters.employer, 0.12, 0.35) *
  sexes(d).reduce((s, x) => s + SEX_MIX[x], 0) *
  ages(d).reduce((s, x) => s + AGE_MIX[x], 0)

/** A row's counts cut down to the kept share. A sum behind a mean is
    rescaled with its own count, so a small group's mean stays its mean. */
function narrowed(c: Counts, d: Draw, means: Record<string, string> = {}) {
  const out = scaled(c, keptShare(d))
  for (const [sum, n] of Object.entries(means)) out[sum] = c[n] ? (c[sum] / c[n]) * out[n] : 0
  return out
}

/* -------------------------------------------------------------------------- */
/*  1. Preventive care                                                         */
/* -------------------------------------------------------------------------- */

/* Who each is due for, from USPSTF and ACIP: the share of a sex and age
   group that is eligible. */
type Screening = { id: string; name: string; due: (sex: Sex, age: Age) => number }

const SCREENINGS: Screening[] = [
  /* 45 to 75. */
  { id: "colorectal", name: "Colorectal", due: (_, a) => ({ "Under 40": 0, "40 to 49": 0.5, "50 to 64": 1, "65 and over": 0.9 })[a] },
  /* Women 40 to 74. */
  { id: "breast", name: "Breast", due: (s, a) => (s !== "Female" ? 0 : { "Under 40": 0, "40 to 49": 1, "50 to 64": 1, "65 and over": 0.8 }[a]) },
  /* Women 21 to 65. */
  { id: "cervical", name: "Cervical", due: (s, a) => (s !== "Female" ? 0 : { "Under 40": 1, "40 to 49": 1, "50 to 64": 1, "65 and over": 0.05 }[a]) },
  /* A PSA discussion for men 55 to 69. */
  { id: "prostate", name: "Prostate PSA discussion", due: (s, a) => (s !== "Male" ? 0 : { "Under 40": 0, "40 to 49": 0, "50 to 64": 0.65, "65 and over": 0.4 }[a]) },
  /* Influenza and Tdap for all, shingles and pneumococcal from 50. */
  { id: "vaccines", name: "Vaccines", due: () => 1 },
  /* Men 65 to 75 who have ever smoked. */
  { id: "aaa", name: "AAA", due: (s, a) => (s === "Male" && a === "65 and over" ? 0.35 : 0) },
  /* Women 65 and over, younger postmenopausal women at risk. */
  { id: "osteoporosis", name: "Osteoporosis", due: (s, a) => (s !== "Female" ? 0 : { "Under 40": 0, "40 to 49": 0, "50 to 64": 0.25, "65 and over": 1 }[a]) },
]

export const PREVENTIVE_CARE: Report = {
  id: "preventive-care",
  name: "Preventive care completion",
  tiles: ["rate", "current", "overdue", "dueSoon"],
  columns: [
    { id: "patients", header: "Eligible executives", format: "count", value: raw("patients") },
    { id: "current", header: "Current on all", format: "count", value: raw("current") },
    { id: "rate", header: "Completion rate", format: "percent", value: rate("current", "patients") },
    { id: "overdue", header: "Overdue on one or more", format: "count", value: raw("overdue") },
    { id: "dueSoon", header: "Due in 90 days", format: "count", value: raw("dueSoon") },
    ...SCREENINGS.map((s) => ({
      id: s.id,
      header: s.name,
      format: "percent" as const,
      value: rate(`${s.id}Current`, `${s.id}Due`),
    })),
  ],
  filters: POPULATION,
  counts: (d) => {
    const all = d.size(30, 70)
    const kept = all * shareOf(d.id, d.filters.employer, 0.12, 0.35)
    const patients = Math.round(all * keptShare(d))
    const care = lean(d, "care")
    const c: Counts = { patients }
    let lowest = 1
    for (const s of SCREENINGS) {
      /* The kept population's eligible share, over its sexes and ages. */
      let due = 0
      for (const x of sexes(d)) for (const a of ages(d)) due += SEX_MIX[x] * AGE_MIX[a] * s.due(x, a)
      const eligible = Math.round(kept * due)
      const done = Math.min(0.98, (0.62 + d.rand() * 0.3) * care)
      c[`${s.id}Due`] = eligible
      c[`${s.id}Current`] = Math.round(eligible * done)
      if (eligible) lowest = Math.min(lowest, done)
    }
    /* Current on everything they're due for: under the weakest screening. */
    const current = Math.round(patients * lowest * (0.75 + d.rand() * 0.2))
    return { ...c, current, overdue: patients - current, dueSoon: d.part(current, 0.08, 0.18) }
  },
}

/* -------------------------------------------------------------------------- */
/*  2. Cardiovascular                                                          */
/* -------------------------------------------------------------------------- */

export const CARDIOVASCULAR: Report = {
  id: "cardiovascular",
  name: "Cardiovascular risk and control",
  tiles: ["htnRate", "controlRate", "ldlRate", "lipidTreatedRate"],
  columns: [
    { id: "patients", header: "Executives", format: "count", value: raw("patients") },
    { id: "htn", header: "Hypertensive", format: "count", value: raw("htn") },
    { id: "htnRate", header: "Hypertensive rate", format: "percent", value: rate("htn", "patients") },
    { id: "bpTreated", header: "On blood pressure treatment", format: "count", value: raw("bpTreated") },
    { id: "bpTreatedRate", header: "Blood pressure treated rate", format: "percent", value: rate("bpTreated", "htn") },
    { id: "controlled", header: "Blood pressure controlled", format: "count", value: raw("controlled") },
    { id: "controlRate", header: "Controlled rate", format: "percent", value: rate("controlled", "htn") },
    { id: "ldl", header: "Elevated LDL or non-HDL", format: "count", value: raw("ldl") },
    { id: "ldlRate", header: "Elevated lipids rate", format: "percent", value: rate("ldl", "patients") },
    { id: "lipidTreated", header: "On lipid treatment", format: "count", value: raw("lipidTreated") },
    { id: "lipidTreatedRate", header: "Lipids treated rate", format: "percent", value: rate("lipidTreated", "ldl") },
  ],
  filters: [
    ...POPULATION,
    { id: "bpTarget", label: "Blood pressure target", all: "Under 130/80", options: choices(["Under 140/90"]) },
    { id: "ldlCut", label: "Elevated lipids", all: "LDL 130 or non-HDL 160 and over", options: choices(["LDL 160 or non-HDL 190 and over"]) },
  ],
  counts: (d) => {
    const risk = lean(d, "risk")
    const care = lean(d, "care")
    const patients = d.size(30, 70)
    const htn = tilt(patients, d.part(patients, 0.22, 0.4), risk)
    const bpTreated = tilt(htn, d.part(htn, 0.65, 0.88), care)
    const loose = d.filters.bpTarget === "Under 140/90"
    const high = d.filters.ldlCut === "LDL 160 or non-HDL 190 and over"
    const ldl = tilt(patients, d.part(patients, high ? 0.08 : 0.25, high ? 0.16 : 0.45), risk)
    return narrowed(
      {
        patients, htn, bpTreated, ldl,
        /* Control comes from treatment, so it can't pass it. */
        controlled: tilt(bpTreated, d.part(htn, loose ? 0.6 : 0.45, loose ? 0.8 : 0.65), care),
        lipidTreated: tilt(ldl, d.part(ldl, high ? 0.7 : 0.5, high ? 0.9 : 0.8), care),
      },
      d
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  3. Metabolic health                                                        */
/* -------------------------------------------------------------------------- */

export const METABOLIC: Report = {
  id: "metabolic",
  name: "Metabolic health and diabetes risk",
  tiles: ["diabetesRate", "prediabetesRate", "controlRate", "change"],
  columns: [
    { id: "patients", header: "Executives", format: "count", value: raw("patients") },
    { id: "diabetes", header: "Diabetes", format: "count", value: raw("diabetes") },
    { id: "diabetesRate", header: "Diabetes prevalence", format: "percent", value: rate("diabetes", "patients") },
    { id: "prediabetes", header: "Prediabetes", format: "count", value: raw("prediabetes") },
    { id: "prediabetesRate", header: "Prediabetes prevalence", format: "percent", value: rate("prediabetes", "patients") },
    { id: "controlled", header: "A1c controlled", format: "count", value: raw("controlled") },
    { id: "controlRate", header: "A1c controlled rate", format: "percent", value: rate("controlled", "diabetes") },
    { id: "baseline", header: "Mean A1c at baseline, %", format: "decimal", value: mean("baselineSum", "diabetes") },
    { id: "latest", header: "Mean A1c now, %", format: "decimal", value: mean("latestSum", "diabetes") },
    { id: "change", header: "A1c change, points", format: "decimal", value: change("latestSum", "baselineSum", "diabetes") },
  ],
  filters: [
    ...POPULATION,
    { id: "a1cTarget", label: "A1c target", all: "Under 7%", options: choices(["Under 8%"]) },
  ],
  counts: (d) => {
    const risk = lean(d, "risk")
    const care = lean(d, "care")
    const patients = d.size(30, 70)
    const diabetes = tilt(patients, d.part(patients, 0.07, 0.14), risk)
    const prediabetes = tilt(patients - diabetes, d.part(patients - diabetes, 0.18, 0.32), risk)
    const loose = d.filters.a1cTarget === "Under 8%"
    const baseline = 7.2 + d.rand() * 1.2 + (risk - 1) * 0.3
    const latest = baseline - (0.1 + d.rand() * 0.6) * care
    return narrowed(
      {
        patients, diabetes, prediabetes,
        controlled: tilt(diabetes, d.part(diabetes, loose ? 0.72 : 0.48, loose ? 0.9 : 0.72), care),
        baselineSum: baseline * diabetes,
        latestSum: latest * diabetes,
      },
      d,
      { baselineSum: "diabetes", latestSum: "diabetes" }
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  4. Healthy weight                                                          */
/* -------------------------------------------------------------------------- */

/* BMI classes: under 18.5 underweight, 18.5 to 24.9 normal, 25 to 29.9
   overweight, obesity class I 30 to 34.9, class II 35 to 39.9, class III
   40 and over. */
export const HEALTHY_WEIGHT: Report = {
  id: "healthy-weight",
  name: "Healthy weight and obesity risk",
  tiles: ["bmi", "obeseRate", "lostRate", "overRate"],
  columns: [
    { id: "patients", header: "Executives", format: "count", value: raw("patients") },
    { id: "bmi", header: "Mean BMI", format: "decimal", value: mean("bmiSum", "patients") },
    { id: "underRate", header: "Underweight", format: "percent", value: rate("under", "patients") },
    { id: "normalRate", header: "Normal", format: "percent", value: rate("normal", "patients") },
    { id: "overRate", header: "Overweight", format: "percent", value: rate("over", "patients") },
    { id: "class1Rate", header: "Obesity class I", format: "percent", value: rate("class1", "patients") },
    { id: "class2Rate", header: "Obesity class II", format: "percent", value: rate("class2", "patients") },
    { id: "class3Rate", header: "Obesity class III", format: "percent", value: rate("class3", "patients") },
    {
      id: "obeseRate",
      header: "Obesity rate",
      format: "percent",
      value: (c) => (c.patients ? ((c.class1 + c.class2 + c.class3) / c.patients) * 100 : NaN),
    },
    { id: "lost", header: "Meaningful weight loss", format: "count", value: raw("lost") },
    /* Of those above a healthy weight. */
    { id: "lostRate", header: "Weight loss rate", format: "percent", value: rate("lost", "above") },
  ],
  filters: [
    ...POPULATION,
    { id: "loss", label: "Weight loss", all: "5% or more", options: choices(["10% or more"]) },
  ],
  counts: (d) => {
    const risk = lean(d, "risk")
    const care = lean(d, "care")
    const patients = d.size(30, 70)
    const under = d.part(patients, 0, 0.02)
    /* Weight climbs with age less steeply than blood pressure or A1c. */
    const heavier = Math.sqrt(risk)
    const class3 = tilt(patients, d.part(patients, 0.02, 0.05), heavier)
    const class2 = tilt(patients - class3, d.part(patients, 0.05, 0.09), heavier)
    const class1 = tilt(patients - class3 - class2, d.part(patients, 0.14, 0.2), heavier)
    const over = Math.min(patients - under - class1 - class2 - class3, tilt(patients, d.part(patients, 0.32, 0.4), Math.sqrt(heavier)))
    const above = over + class1 + class2 + class3
    const big = d.filters.loss === "10% or more"
    return narrowed(
      {
        patients, under, over, class1, class2, class3, above,
        normal: patients - under - above,
        bmiSum: (26 + d.rand() * 2.5 + (risk - 1) * 1.8) * patients,
        lost: tilt(above, d.part(above, big ? 0.06 : 0.18, big ? 0.14 : 0.34), care),
      },
      d,
      { bmiSum: "patients" }
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  5. Cardiometabolic score                                                   */
/* -------------------------------------------------------------------------- */

/* Out of 100, from blood pressure, lipids, glucose or A1c and BMI, each
   scored as AHA's Life's Essential 8 scores it, then averaged. */
const BANDS = { High: [80, 100], Moderate: [50, 79], Low: [0, 49] } as const
type Band = keyof typeof BANDS
const PARTS = ["bp", "lipid", "glucose", "bmi"] as const

export const CARDIOMETABOLIC_SCORE: Report = {
  id: "cardiometabolic-score",
  name: "Cardiometabolic health score",
  tiles: ["score", "change", "high", "low"],
  columns: [
    { id: "patients", header: "Executives scored", format: "count", value: raw("patients") },
    { id: "baseline", header: "Score at baseline", format: "decimal", value: mean("baselineSum", "patients") },
    { id: "score", header: "Score now", format: "decimal", value: mean("scoreSum", "patients") },
    { id: "change", header: "Change", format: "decimal", value: change("scoreSum", "baselineSum", "patients") },
    { id: "bp", header: "Blood pressure", format: "decimal", value: mean("bpSum", "patients") },
    { id: "lipids", header: "Lipids", format: "decimal", value: mean("lipidSum", "patients") },
    { id: "glucose", header: "Glucose or A1c", format: "decimal", value: mean("glucoseSum", "patients") },
    { id: "weight", header: "BMI", format: "decimal", value: mean("bmiSum", "patients") },
    { id: "high", header: "High, 80 to 100", format: "count", value: raw("high") },
    { id: "moderate", header: "Moderate, 50 to 79", format: "count", value: raw("moderate") },
    { id: "low", header: "Low, under 50", format: "count", value: raw("low") },
  ],
  filters: [
    ...POPULATION,
    {
      id: "band",
      label: "Score band",
      all: "All score bands",
      options: (Object.keys(BANDS) as Band[]).map((b) => ({ label: b, value: b })),
    },
  ],
  counts: (d) => {
    const risk = lean(d, "risk")
    const all = d.size(30, 70)
    const low = tilt(all, d.part(all, 0.1, 0.2), risk)
    const high = tilt(all - low, d.part(all, 0.22, 0.38), 1 / risk)
    const counts = { High: high, Low: low, Moderate: all - high - low }
    const band = d.filters.band as Band | undefined
    const patients = band ? counts[band] : all
    /* A band's mean sits inside it; everyone's is the mix of the bands. */
    const inside = (b: Band) => BANDS[b][0] + (BANDS[b][1] - BANDS[b][0]) * (0.35 + d.rand() * 0.3)
    const means = { High: inside("High"), Moderate: inside("Moderate"), Low: inside("Low") }
    const score = band
      ? means[band]
      : all
        ? (high * means.High + counts.Moderate * means.Moderate + low * means.Low) / all
        : 0
    const sums: Counts = {}
    for (const p of PARTS) sums[`${p}Sum`] = Math.min(100, Math.max(0, score + (d.rand() - 0.5) * 16)) * patients
    return narrowed(
      {
        patients,
        high: !band || band === "High" ? high : 0,
        moderate: !band || band === "Moderate" ? counts.Moderate : 0,
        low: !band || band === "Low" ? low : 0,
        scoreSum: score * patients,
        baselineSum: (score - (1 + d.rand() * 6) * lean(d, "care")) * patients,
        ...sums,
      },
      d,
      Object.fromEntries(["scoreSum", "baselineSum", ...PARTS.map((p) => `${p}Sum`)].map((k) => [k, "patients"]))
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  6. High risk detection                                                     */
/* -------------------------------------------------------------------------- */

/* Previously unrecognized: not on the problem list before the program. */
const CONDITIONS = [
  { id: "htn", name: "Hypertension", share: 0.08 },
  { id: "diabetes", name: "Diabetes", share: 0.025 },
  { id: "prediabetes", name: "Prediabetes", share: 0.09 },
  { id: "arrhythmia", name: "Arrhythmia", share: 0.02 },
  { id: "apnea", name: "Sleep apnea", share: 0.04 },
  { id: "cancer", name: "Cancer screening abnormality", share: 0.015 },
]

export const HIGH_RISK_DETECTION: Report = {
  id: "high-risk-detection",
  name: "High risk condition detection",
  tiles: ["found", "rate", "followUpRate", "treated"],
  columns: [
    { id: "assessed", header: "Executives assessed", format: "count", value: raw("assessed") },
    { id: "found", header: "With a new finding", format: "count", value: raw("found") },
    { id: "rate", header: "Detection rate", format: "percent", value: rate("found", "assessed") },
    ...CONDITIONS.map((c) => ({ id: c.id, header: c.name, format: "count" as const, value: raw(c.id) })),
    { id: "followUp", header: "Follow up started", format: "count", value: raw("followUp") },
    { id: "followUpRate", header: "Follow up rate", format: "percent", value: rate("followUp", "found") },
    { id: "treated", header: "Now under treatment", format: "count", value: raw("treated") },
  ],
  filters: [
    ...POPULATION,
    { id: "condition", label: "Condition", all: "All conditions", options: choices(CONDITIONS.map((c) => c.name)) },
    {
      id: "source",
      label: "Found by",
      all: "Any source",
      options: choices(["Annual exam", "Labs", "Imaging", "Questionnaire", "Wearable"]),
    },
  ],
  counts: (d) => {
    const risk = lean(d, "risk")
    const assessed = d.n(18, 30)
    const source = shareOf(d.id, d.filters.source, 0.1, 0.4)
    const by: Counts = {}
    for (const c of CONDITIONS) {
      const picked = !d.filters.condition || d.filters.condition === c.name
      by[c.id] = picked ? Math.round(assessed * c.share * (0.6 + d.rand() * 0.8) * source * risk) : 0
    }
    /* One executive can have more than one finding. */
    const findings = Object.values(by).reduce((s, v) => s + v, 0)
    const found = Math.min(assessed, Math.round(findings * (d.filters.condition ? 1 : 0.85)))
    const followUp = tilt(found, d.part(found, 0.75, 0.95), lean(d, "care"))
    return narrowed({ assessed, ...by, found, followUp, treated: d.part(followUp, 0.5, 0.9) }, d)
  },
}

/* -------------------------------------------------------------------------- */
/*  7. Behavioral health                                                       */
/* -------------------------------------------------------------------------- */

/* Positive: PHQ-9 or GAD-7 of 10 or more. A drop is improvement. */
export const BEHAVIORAL_HEALTH: Report = {
  id: "behavioral-health",
  name: "Behavioral health and well-being",
  tiles: ["phqRate", "gadRate", "intervened", "improvedRate"],
  columns: [
    { id: "screened", header: "Executives screened", format: "count", value: raw("screened") },
    { id: "phq", header: "Depression positive, PHQ-9", format: "count", value: raw("phq") },
    { id: "phqRate", header: "Depression positive rate", format: "percent", value: rate("phq", "screened") },
    { id: "gad", header: "Anxiety positive, GAD-7", format: "count", value: raw("gad") },
    { id: "gadRate", header: "Anxiety positive rate", format: "percent", value: rate("gad", "screened") },
    { id: "positive", header: "Positive on either", format: "count", value: raw("positive") },
    { id: "intervened", header: "Intervention started", format: "count", value: raw("intervened") },
    { id: "phqChange", header: "Mean PHQ-9 change", format: "decimal", value: mean("phqChangeSum", "phq") },
    { id: "gadChange", header: "Mean GAD-7 change", format: "decimal", value: mean("gadChangeSum", "gad") },
    { id: "improved", header: "Improved", format: "count", value: raw("improved") },
    { id: "improvedRate", header: "Improved rate", format: "percent", value: rate("improved", "positive") },
  ],
  filters: [
    ...POPULATION,
    { id: "tool", label: "Screening", all: "PHQ-9 and GAD-7", options: choices(["PHQ-9", "GAD-7"]) },
  ],
  counts: (d) => {
    const mood = lean(d, "mood")
    const care = lean(d, "care")
    const screened = d.size(24, 60)
    const tool = d.filters.tool
    const phq = tool === "GAD-7" ? 0 : tilt(screened, d.part(screened, 0.08, 0.16), mood)
    const gad = tool === "PHQ-9" ? 0 : tilt(screened, d.part(screened, 0.1, 0.18), mood)
    /* Positive on either: the two overlap. */
    const positive = Math.min(screened, Math.max(phq, gad) + Math.round(Math.min(phq, gad) * 0.4))
    const intervened = tilt(positive, d.part(positive, 0.6, 0.88), care)
    return narrowed(
      {
        screened, phq, gad, positive, intervened,
        phqChangeSum: phq * -(1.5 + d.rand() * 4) * care,
        gadChangeSum: gad * -(1 + d.rand() * 3.5) * care,
        improved: d.part(intervened, 0.45, 0.8),
      },
      d,
      { phqChangeSum: "phq", gadChangeSum: "gad" }
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  8. Access and continuity                                                   */
/* -------------------------------------------------------------------------- */

const ENCOUNTERS = ["MyChart", "Virtual visit", "In person visit"] as const

export const ACCESS_CONTINUITY: Report = {
  id: "access-continuity",
  name: "Access and continuity of care",
  tiles: ["examRate", "encounters", "perYear", "virtual"],
  columns: [
    { id: "patients", header: "Executives", format: "count", value: raw("patients") },
    { id: "exam", header: "Annual exam in 12 months", format: "count", value: raw("exam") },
    { id: "examRate", header: "Annual exam rate", format: "percent", value: rate("exam", "patients") },
    { id: "mychart", header: "MyChart encounters", format: "count", value: raw("mychart") },
    { id: "virtual", header: "Virtual visits", format: "count", value: raw("virtual") },
    { id: "inPerson", header: "In person visits", format: "count", value: raw("inPerson") },
    { id: "encounters", header: "Total encounters", format: "count", value: (c) => c.mychart + c.virtual + c.inPerson },
    {
      id: "perYear",
      header: "Encounters per executive a year",
      format: "decimal",
      value: (c) => (c.patientMonths ? ((c.mychart + c.virtual + c.inPerson) * 12) / c.patientMonths : NaN),
    },
  ],
  filters: [
    ...POPULATION,
    { id: "encounter", label: "Encounter type", all: "All encounter types", options: choices(ENCOUNTERS) },
  ],
  counts: (d) => {
    const care = lean(d, "care")
    /* Older and higher risk executives are seen more. */
    const need = care * Math.sqrt(lean(d, "risk"))
    const patients = d.size(30, 70)
    const pick = d.filters.encounter
    const keep = (type: (typeof ENCOUNTERS)[number], v: number) => (!pick || pick === type ? Math.round(v * need) : 0)
    return narrowed(
      {
        patients,
        exam: tilt(patients, d.part(patients, 0.7, 0.9), care),
        mychart: keep("MyChart", d.n(14, 36)),
        virtual: keep("Virtual visit", d.n(8, 22)),
        inPerson: keep("In person visit", d.n(6, 16)),
        /* Months of care in the period, which sum across rows where the
           period's length would not. */
        patientMonths: patients * d.months,
      },
      d
    )
  },
}

/* -------------------------------------------------------------------------- */
/*  9. Population improvement                                                  */
/* -------------------------------------------------------------------------- */

const RISK_FACTORS = ["Blood pressure", "LDL or non-HDL", "A1c", "BMI or weight", "Smoking status"] as const

/* How each factor tends to move in a year: the improved share's range and
   the worsened share of the rest. Quitting is rarer than a lower A1c, and a
   quit is seldom undone. */
const FACTOR_MOVES: Record<string, [number, number, number]> = {
  "Blood pressure": [0.28, 0.46, 0.2],
  "LDL or non-HDL": [0.25, 0.42, 0.16],
  A1c: [0.3, 0.5, 0.15],
  "BMI or weight": [0.18, 0.36, 0.26],
  "Smoking status": [0.1, 0.25, 0.04],
}

/* Each executive once: with every factor, improved when more of their key
   risk factors got better than worse. */
export const POPULATION_IMPROVEMENT: Report = {
  id: "population-improvement",
  name: "Population health improvement",
  tiles: ["improvedRate", "improved", "stable", "worsened"],
  columns: [
    { id: "compared", header: "Executives compared", format: "count", value: raw("compared") },
    { id: "improved", header: "Improved", format: "count", value: raw("improved") },
    { id: "stable", header: "Stable", format: "count", value: raw("stable") },
    { id: "worsened", header: "Worsened", format: "count", value: raw("worsened") },
    { id: "improvedRate", header: "Improved rate", format: "percent", value: rate("improved", "compared") },
    { id: "stableRate", header: "Stable rate", format: "percent", value: rate("stable", "compared") },
    { id: "worsenedRate", header: "Worsened rate", format: "percent", value: rate("worsened", "compared") },
  ],
  filters: [
    ...POPULATION,
    { id: "factor", label: "Risk factor", all: "All key risk factors", options: choices(RISK_FACTORS) },
    { id: "compare", label: "Compared with", all: "Same time last year", options: choices(["Enrolment"]) },
  ],
  counts: (d) => {
    const care = lean(d, "care")
    const risk = lean(d, "risk")
    /* Smoking compares only those who smoked at the start. */
    const compared = d.filters.factor === "Smoking status" ? d.size(3, 9) : d.size(26, 64)
    const since = d.filters.compare === "Enrolment"
    const [lo, hi, worse] = FACTOR_MOVES[d.filters.factor] ?? [0.24, 0.42, 0.18]
    const lift = since ? 1.35 : 1
    const improved = tilt(compared, d.part(compared, lo * lift, hi * lift), care)
    const worsened = tilt(compared - improved, d.part(compared - improved, worse * 0.6, worse * 1.3), risk)
    const out = narrowed({ compared, improved, worsened }, d)
    /* Stable is what is left, after rounding. */
    return { ...out, stable: Math.max(0, out.compared - out.improved - out.worsened) }
  },
}

/* -------------------------------------------------------------------------- */
/*  10. Inlay optimization score                                               */
/* -------------------------------------------------------------------------- */

/* The centerpiece: "is the overall health of our executive population
   getting better?" One score out of 100 from the flourishing index (0 to
   10) and the defined biomarkers, tracked over time. Optimization members
   only, as only they are scored. */
const TENURE = { "Under 6 months": 0.4, "6 to 12 months": 0.35, "Over 12 months": 0.25 }

export const OPTIMIZATION_SCORE: Report = {
  id: "optimization-score",
  name: "Inlay optimization health score",
  typeFilter: false,
  tiles: ["score", "change", "flourishing", "improvedRate"],
  columns: [
    { id: "members", header: "Members scored", format: "count", value: raw("members") },
    { id: "baseline", header: "Score at baseline", format: "decimal", value: mean("baselineSum", "members") },
    { id: "score", header: "Score now", format: "decimal", value: mean("scoreSum", "members") },
    { id: "change", header: "Change", format: "decimal", value: change("scoreSum", "baselineSum", "members") },
    { id: "flourishing", header: "Flourishing index", format: "decimal", value: mean("flourishingSum", "members") },
    { id: "inRange", header: "Biomarkers in range", format: "percent", value: rate("inRange", "markers") },
    { id: "improved", header: "Improved", format: "count", value: raw("improved") },
    { id: "stable", header: "Stable", format: "count", value: raw("stable") },
    { id: "worsened", header: "Worsened", format: "count", value: raw("worsened") },
    { id: "improvedRate", header: "Improved rate", format: "percent", value: rate("improved", "members") },
  ],
  filters: [
    ...POPULATION,
    { id: "tenure", label: "Time on plan", all: "Any time on plan", options: choices(Object.keys(TENURE)) },
  ],
  counts: (d) => {
    const care = lean(d, "care")
    const risk = lean(d, "risk")
    const tenure = d.filters.tenure as keyof typeof TENURE | undefined
    const members = Math.round(d.size(10, 28) * (tenure ? TENURE[tenure] : 1))
    /* Gains build with time on the plan. */
    const gain = (tenure === "Under 6 months" ? 2 : tenure === "Over 12 months" ? 9 : 5) * care
    const baseline = 58 + d.rand() * 10 - (risk - 1) * 10
    const improved = tilt(members, d.part(members, 0.45, 0.68), care)
    const worsened = d.part(members - improved, 0.1, 0.3)
    const markers = members * 12
    const out = narrowed(
      {
        members, improved, worsened, markers,
        baselineSum: baseline * members,
        scoreSum: (baseline + gain * (0.6 + d.rand() * 0.8)) * members,
        flourishingSum: (6.4 + d.rand() * 2) * lean(d, "mood") ** -0.3 * members,
        inRange: Math.round(markers * Math.min(0.95, (0.62 + d.rand() * 0.22) / Math.sqrt(risk))),
      },
      d,
      { baselineSum: "members", scoreSum: "members", flourishingSum: "members" }
    )
    return { ...out, stable: Math.max(0, out.members - out.improved - out.worsened) }
  },
}

/* -------------------------------------------------------------------------- */
/*  List                                                                       */
/* -------------------------------------------------------------------------- */

export const KPI_REPORTS: Report[] = [
  PREVENTIVE_CARE,
  CARDIOVASCULAR,
  METABOLIC,
  HEALTHY_WEIGHT,
  CARDIOMETABOLIC_SCORE,
  HIGH_RISK_DETECTION,
  BEHAVIORAL_HEALTH,
  ACCESS_CONTINUITY,
  POPULATION_IMPROVEMENT,
  OPTIMIZATION_SCORE,
]
