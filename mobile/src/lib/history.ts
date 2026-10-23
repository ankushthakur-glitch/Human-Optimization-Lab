import type { TopicId } from "@/lib/topics"

/* The history under Plan > Your history (Journey_14 screens 41 to 47): the
   same figures averaged over every window since she enrolled, as Apple
   Health shows them, with the window and the metric switched independently.
   Screen 41 is every topic at once (deficit, steps, exercise, weight);
   screens 42 to 47 are one topic each (Exercise, Eat, Sleep, Mind,
   Medication, Measure) with the day as a window too.

   Like lib/topics.ts this is the sample patient's record (twelve weeks in):
   the four averages of each metric are the ones the screens print, and the
   bars under a window are drawn from them (the same bars every time she
   opens it), so a bar chart and its table never disagree. Two rules the
   design insists on are kept here and not left to the screens:
   - a cell with no history is empty ("—"), never zero: CPAP and AHI have no
     year column because they did not exist before the sleep study came back,
     and the eight-week mind programme has no six-month or year column;
   - rest days count as zeroes in a daily average, and a figure that is a
     count (days on target, doses taken) is counted, not averaged. */

export type Win = "day" | "week" | "month" | "half" | "year"

/** The windows the overall view and a topic offer. */
export const WINDOWS_ALL: { value: Win; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "half", label: "6 months" },
  { value: "year", label: "Year" },
]
export const WINDOWS_TOPIC: { value: Win; label: string }[] = [{ value: "day", label: "Day" }, ...WINDOWS_ALL.map((w) => (w.value === "half" ? { ...w, label: "6 mo" } : w))]

/** How a figure is written: whole numbers, one decimal, hours:minutes. */
type Fmt = "num" | "dec1" | "hm"

export type Metric = {
  id: string
  /** The chip. */
  chip: string
  /** The row in the table across windows; absent for a metric that is only a chip. */
  row: string
  /** Over the chart, in capitals: "AVERAGE DAILY DEFICIT". */
  title: string
  unit: string
  /** Week, month, six months, year; null where there is no history. */
  avg: (number | null)[]
  /** Table cells and headlines written out where the figure is a count. */
  cells?: (string | null)[]
  fmt: Fmt
  better: "up" | "down"
  target?: number
  /** Bars wobble about the average ("avg"), or climb to the latest entry ("trend"). */
  shape: "avg" | "trend"
  /** How much a bar strays from the average, as a share of it. */
  noise: number
  /** A day adds up (steps, minutes), so the Day window splits it by the hour. */
  additive?: boolean
  /** The chart's axis starts here instead of at zero (weight, calories). */
  axisMin?: number
  /** Trend metrics: the latest entry and the day-one figure it is measured from. */
  latest?: number
  start?: number
  /** Said under the table when it matters. */
  chart?: "pct"
}

export type TopicHistory = {
  /** Under the page's name. */
  intro: string
  metrics: Metric[]
  foot: string
  /** Shown instead of a chart when the window has no history. */
  young?: string
}

const m = (x: Omit<Metric, "fmt" | "better" | "shape" | "noise"> & Partial<Pick<Metric, "fmt" | "better" | "shape" | "noise">>): Metric => ({ fmt: "num", better: "up", shape: "avg", noise: 0.2, ...x })

/* ----------------------------------------------------------------- all -- */

export const OVERALL: TopicHistory = {
  intro: "The same numbers, averaged over every window since you enrolled.",
  metrics: [
    m({ id: "deficit", chip: "Deficit", row: "kcal deficit", title: "Average daily deficit", unit: "kcal", avg: [505, 463, 410, 349], target: 500, noise: 0.16 }),
    m({ id: "steps", chip: "Steps", row: "steps a day", title: "Average daily steps", unit: "steps", avg: [10400, 9800, 8900, 7600], target: 10000, noise: 0.22, additive: true }),
    m({ id: "exercise", chip: "Exercise", row: "min a day", title: "Average exercise minutes", unit: "min", avg: [42, 38, 31, 26], target: 40, noise: 0.5, additive: true }),
    m({ id: "weight", chip: "Weight", row: "lb, latest", title: "Weight, latest entry", unit: "lb", avg: [178.4, 180.1, 183.6, 186.4], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 170, latest: 178.0, start: 186.4 }),
  ],
  foot: "Switch the metric and the window independently. Weight, steps and exercise minutes carry the same four averages and the same graph.",
}

/* -------------------------------------------------------------- topics -- */

const EVERY = "Day, week, month, six months and year — the same figures, every window."

export const HISTORY: Record<TopicId, TopicHistory> = {
  exercise: {
    intro: EVERY,
    metrics: [
      m({ id: "minutes", chip: "Minutes", row: "Exercise min", title: "Exercise minutes, daily average", unit: "min", avg: [42, 38, 31, 26], target: 40, noise: 0.55, additive: true }),
      m({ id: "energy", chip: "Active energy", row: "Active energy", title: "Active energy, daily average", unit: "kcal", avg: [870, 810, 720, 640], noise: 0.3, additive: true }),
      m({ id: "steps", chip: "Steps", row: "Steps", title: "Steps, daily average", unit: "steps", avg: [10400, 9800, 8900, 7600], target: 10000, noise: 0.22, additive: true }),
      m({ id: "sessions", chip: "Sessions", row: "Sessions a week", title: "Sessions a week", unit: "", avg: [4.0, 3.6, 3.1, 2.4], fmt: "dec1", target: 4, noise: 0.15 }),
    ],
    foot: "Rest days are zeroes, not gaps. An average that quietly drops them would read forty per cent higher and mean nothing.",
  },
  eat: {
    intro: EVERY,
    metrics: [
      m({ id: "calories", chip: "Calories", row: "Calories in", title: "Calories in, daily average", unit: "kcal", avg: [1712, 1735, 1790, 1880], better: "down", target: 1740, noise: 0.1, additive: true, axisMin: 1500 }),
      m({ id: "protein", chip: "Protein", row: "Protein, g", title: "Protein, daily average", unit: "g", avg: [138, 131, 119, 104], target: 150, noise: 0.14, additive: true }),
      m({ id: "deficit", chip: "Deficit", row: "Deficit", title: "Average daily deficit", unit: "kcal", avg: [505, 463, 410, 349], target: 500, noise: 0.16 }),
      m({ id: "ontarget", chip: "On target", row: "Days on target", title: "Days on target", unit: "%", avg: [71, 73, 65, 54], cells: ["5 of 7", "22/30", "118/182", "198/365"], noise: 0.12, chart: "pct" }),
    ],
    foot: "Protein climbing while calories fall is the pattern that keeps muscle. Either number alone would hide it.",
  },
  sleep: {
    intro: EVERY,
    metrics: [
      m({ id: "score", chip: "Score", row: "Sleep score", title: "Sleep score, nightly average", unit: "of 100", avg: [66, 63, 58, 51], target: 80, noise: 0.12 }),
      m({ id: "hours", chip: "Hours", row: "Hours asleep", title: "Hours asleep, nightly average", unit: "h", avg: [384, 371, 352, 338], fmt: "hm", target: 450, noise: 0.1 }),
      m({ id: "eff", chip: "Efficiency", row: "Efficiency", title: "Sleep efficiency, nightly average", unit: "%", avg: [88, 86, 83, 80], noise: 0.04 }),
      m({ id: "cpap", chip: "CPAP", row: "CPAP worn", title: "CPAP worn, nightly average", unit: "h", avg: [348, 330, 302, null], fmt: "hm", noise: 0.12 }),
      m({ id: "ahi", chip: "AHI", row: "AHI", title: "AHI, events an hour", unit: "", avg: [11, 13, 18, null], better: "down", noise: 0.1 }),
    ],
    foot: "AHI and CPAP hours only exist from the night the study came back. Before that the row is empty, not zero.",
  },
  mind: {
    intro: EVERY,
    metrics: [
      m({ id: "minutes", chip: "Minutes", row: "Minutes a day", title: "Minutes practised, daily average", unit: "min", avg: [19, 18, null, null], target: 20, noise: 0.25, additive: true }),
      m({ id: "sessions", chip: "Sessions", row: "Sessions done", title: "Sessions done", unit: "%", avg: [100, 90, null, null], cells: ["7 of 7", "27/30", null, null], noise: 0.1, chart: "pct" }),
      m({ id: "irritability", chip: "Irritability", row: "Irritability, 0–10", title: "Irritability, 0 to 10", unit: "", avg: [3, 4, null, null], better: "down", noise: 0.2 }),
      m({ id: "week", chip: "", row: "Week of eight", title: "Week of eight", unit: "", avg: [3, null, null, null], noise: 0 }),
    ],
    foot: "The programme is eight weeks old, so it has no six-month or year column. An empty cell is more honest than a short average dressed up as a long one.",
    young: "The programme is eight weeks old, so this window has no history yet.",
  },
  medication: {
    intro: EVERY,
    metrics: [
      m({ id: "adherence", chip: "Adherence", row: "Adherence", title: "Adherence, daily average · target 100%", unit: "%", avg: [88, 90, 87, 83], target: 100, noise: 0.12 }),
      m({ id: "doses", chip: "Doses", row: "Doses taken", title: "Doses taken", unit: "%", avg: [86, 90, 87, 83], cells: ["12/14", "54/60", "317/364", "605/730"], noise: 0.1, chart: "pct" }),
      m({ id: "held", chip: "Supplements", row: "Supplements held", title: "Supplements held", unit: "", avg: [3, 3, 2, 1], noise: 0 }),
      m({ id: "flagged", chip: "", row: "Interactions flagged", title: "Interactions flagged", unit: "", avg: [1, 1, 2, 3], better: "down", noise: 0 }),
    ],
    foot: "One missed evening dose drops a perfect week to 88%. The scale is unforgiving on purpose, because so is the blood panel that gets read against it.",
  },
  measure: {
    intro: EVERY,
    metrics: [
      m({ id: "weight", chip: "Weight", row: "Weight, lb", title: "Weight, latest entry", unit: "lb", avg: [178.4, 180.1, 183.6, 186.4], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 170, latest: 178.0, start: 186.4 }),
      m({ id: "waist", chip: "Waist", row: "Waist, in", title: "Waist, latest entry", unit: "in", avg: [36.5, 37.2, 38.4, 39.1], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 34, latest: 36.5, start: 39.1 }),
      m({ id: "chest", chip: "Chest", row: "Chest, in", title: "Chest, latest entry", unit: "in", avg: [38.2, 38.6, 39.4, 40.0], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 36, latest: 38.2, start: 40.0 }),
      m({ id: "hips", chip: "Hips", row: "Hips, in", title: "Hips, latest entry", unit: "in", avg: [41.1, 41.8, 42.9, 43.6], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 39, latest: 41.1, start: 43.6 }),
      m({ id: "thigh", chip: "", row: "Thigh, in", title: "Thigh, latest entry", unit: "in", avg: [22.5, 22.8, 23.4, 23.9], fmt: "dec1", better: "down", shape: "trend", noise: 0.002, axisMin: 20, latest: 22.5, start: 23.9 }),
    ],
    foot: "The axis starts above zero on purpose: eight pounds on a zero axis is a flat line, and a flat line is the wrong answer.",
  },
}

/* --------------------------------------------------------------- words -- */

const WIN_AVG: Record<Win, number> = { day: -1, week: 0, month: 1, half: 2, year: 3 }

/** What the next longer window is called, for "vs month". */
const NEXT: Record<Win, string> = { day: "week", week: "month", month: "6 months", half: "year", year: "" }

/** A figure written as the metric writes it. */
export function figure(metric: Metric, v: number): string {
  if (metric.fmt === "hm") return `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`
  if (metric.fmt === "dec1") return v.toFixed(1)
  return Math.round(v).toLocaleString("en-US")
}

/** Its average for a window (the day has its own: yesterday), or null where
    there is no history. */
export function averageOf(metric: Metric, win: Win): number | null {
  if (win === "day") return metric.avg[0]
  return metric.avg[WIN_AVG[win]]
}

/** The cell of the table across windows: "505", "5 of 7", or an empty "—". */
export function cell(metric: Metric, index: number): string | null {
  const v = metric.avg[index]
  if (v === null) return null
  return metric.cells?.[index] ?? `${figure(metric, v)}${metric.unit === "%" ? "%" : ""}`
}

export type Change = { text: string; tone: "good" | "bad" | "plain" }

/** How a window compares with the next longer one: "+42 vs month". A
    trend metric speaks of the whole way from day one instead. */
export function changeOf(metric: Metric, win: Win): Change | undefined {
  if (metric.shape === "trend" && metric.latest !== undefined && metric.start !== undefined) {
    const d = Math.round((metric.start - metric.latest) * 10) / 10
    return { text: `${Math.abs(d).toFixed(1)} ${metric.unit} ${d > 0 ? "down" : "up"} since day one`, tone: (d > 0) === (metric.better === "down") ? "good" : "bad" }
  }
  const now = averageOf(metric, win)
  const next = NEXT[win] ? averageOf(metric, win === "day" ? "week" : (["week", "month", "half", "year"][WIN_AVG[win] + 1] as Win)) : null
  if (now === null || next === null) return undefined
  const d = Math.round((now - next) * 100) / 100
  if (d === 0) return { text: `same as the ${NEXT[win]}`, tone: "plain" }
  const text = `${d > 0 ? "+" : "−"}${figure(metric, Math.abs(d))}`
  return { text: `${text} vs ${NEXT[win]}`, tone: (d > 0) === (metric.better === "up") ? "good" : "bad" }
}

/** The change in the table beside a window's figure, short: "+42". */
export function changeShort(metric: Metric, win: Win): Change | undefined {
  const c = changeOf(metric, win)
  return c && { ...c, text: c.text.replace(/ vs .*$/, "") }
}

/* ---------------------------------------------------------------- bars -- */

export type Bar = { label: string; value: number }

const seeded = (seed: string) => {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  let a = (h = (h << 13) | (h >>> 19))
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const INITIAL = ["S", "M", "T", "W", "T", "F", "S"]
const MONTH = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
const MONTH_NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const HOURS = [
  { label: "6a", share: 0.1 },
  { label: "9a", share: 0.16 },
  { label: "12p", share: 0.2 },
  { label: "3p", share: 0.2 },
  { label: "6p", share: 0.2 },
  { label: "9p", share: 0.14 },
]

/** The bars under a window, ending on the latest. They wobble about the
    window's average and are scaled so their mean is exactly it (a trend
    metric climbs to its latest entry instead), so the chart agrees with the
    table. Null where the window has no history. */
export function barsOf(metric: Metric, win: Win, now = new Date()): Bar[] | null {
  const avg = averageOf(metric, win)
  if (avg === null) return null
  const rand = seeded(`${metric.id}:${win}`)
  const labels: string[] =
    win === "week" || (win === "day" && !metric.additive)
      ? Array.from({ length: 7 }, (_, i) => INITIAL[(now.getDay() + i + 1) % 7])
      : win === "day"
        ? HOURS.map((h) => h.label)
        : win === "month"
          ? ["W1", "W2", "W3", "W4", "W5"]
          : win === "half"
            ? Array.from({ length: 6 }, (_, i) => MONTH_NAME[(now.getMonth() - 5 + i + 12) % 12])
            : Array.from({ length: 12 }, (_, i) => MONTH[(now.getMonth() - 11 + i + 12) % 12])

  let values: number[]
  if (win === "day" && metric.additive) {
    values = HOURS.map((h) => avg * h.share)
  } else if (metric.shape === "trend") {
    const to = metric.latest ?? avg
    const from = win === "year" ? (metric.start ?? avg) : win === "half" ? metric.avg[3]! : win === "month" ? metric.avg[2]! : metric.avg[1]!
    values = labels.map((_, i) => from + (to - from) * (labels.length === 1 ? 1 : i / (labels.length - 1)) + (rand() - 0.5) * 2 * metric.noise * avg)
  } else {
    const raw = labels.map(() => 1 + (rand() - 0.5) * 2 * metric.noise)
    const mean = raw.reduce((s, v) => s + v, 0) / raw.length
    values = raw.map((r) => (avg * r) / mean)
  }
  // A scale that is a share never passes 100.
  const cap = metric.chart === "pct" || metric.unit === "%" ? 100 : Infinity
  return labels.map((label, i) => ({ label, value: Math.max(0, Math.min(cap, values[i])) }))
}
