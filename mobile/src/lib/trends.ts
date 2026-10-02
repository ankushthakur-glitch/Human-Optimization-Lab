import { BIOMARKERS, BODY_SYSTEMS, PLACE_NAME, type Biomarker, type Point } from "@/lib/record"

/* What each marker's results say, in the words the patient sees, for the
   free home's trend tiles, the Record tab and the marker page:

   status    where the latest result sits against the patient's range:
             In range, Borderline, Out of range
   movement  which way the comparable results are going: Trending up,
             Trending down, Steady, or Not enough results yet
   meaning   what that movement means for the range: Improving, Moving
             away from your range, Steady

   Movement is a fact from the results, never a diagnosis. Only results
   measured the same way are compared: a home kit next to lab draws is
   shown, never joined, and never sets the direction.

   The thresholds are the catalog's Q-05 defaults, to confirm with Dr.
   Blanchard: borderline is inside the range and within 10% of its width
   from an edge, or within 5% of a one sided limit; moving is a change of
   at least 10% of the range width (5% of a one sided limit) across the
   last three comparable results, every step going the same way. */

export type Status = "in" | "borderline" | "out"
export type Movement = "rising" | "falling" | "steady" | "unknown"
export type Meaning = "improving" | "away" | "steady" | "unknown"
export type Side = "above" | "below"

export const THRESHOLDS = {
  /** Inside a two sided range, within this share of its width from an edge. */
  borderline: 0.1,
  /** Inside a one sided range, within this share of the limit. */
  borderlineOneSided: 0.05,
  /** A change of at least this share of the range width... */
  moving: 0.1,
  /** ...or of a one sided limit... */
  movingOneSided: 0.05,
  /** ...across this many of the latest comparable results, all going one way. */
  window: 3,
} as const

export const STATUS_WORD: Record<Status, string> = {
  in: "In range",
  borderline: "Borderline",
  out: "Out of range",
}

export const MOVEMENT_WORD: Record<Movement, string> = {
  rising: "Trending up",
  falling: "Trending down",
  steady: "Steady",
  unknown: "Not enough results yet",
}

export const MEANING_WORD: Record<Meaning, string> = {
  improving: "Improving",
  away: "Moving away from your range",
  steady: "Steady",
  unknown: "Not enough results yet",
}

/** A result placed on the time scale (`t`, local noon of its day, in ms). */
export type TrendPoint = Point & { t: number }

/** The change from the first comparable result to the latest. */
export type Change = {
  from: TrendPoint
  to: TrendPoint
  /** Latest minus first in the marker's unit (blood pressure: the top number). */
  delta: number
  /** The size of the change at the lab's precision: "0.6". */
  amount: string
  /** "Up 0.6 since Apr 2022"; blood pressure "Up from 124/80 in Mar 2023". */
  words: string
}

/** The patient's range, for the band behind a chart and the range bar. */
export type Band = {
  low?: number
  high?: number
  /** Blood pressure's second number must stay below this. */
  high2?: number
  /** As the lab writes it: "Below 5.7", "18.5 to 24.9", "50 or above". */
  label: string
  /** The side with no edge, where the band runs off the chart. */
  open?: "below" | "above"
}

/** Everything a tile, a row or the marker page needs about one marker. */
export type Trend = {
  marker: Biomarker
  id: string
  status: Status
  /** Which side of the range an out of range result sits on. */
  side?: Side
  movement: Movement
  meaning: Meaning
  /** Why it is worth watching; undefined for a steady marker in range. */
  reason?: "out" | "borderline" | "moving"
  /** Earns a tile on the free home (F-21): out of range, borderline or moving. */
  watch: boolean
  /** The F-26 order: 1 out of range and moving away, 2 out of range and
      steady, 3 out of range and improving, 4 borderline, 5 in range and
      moving away, 6 in range and improving; 0 when not watched. */
  rank: number
  /** Comparable results, oldest first: the ones a chart joins. */
  series: TrendPoint[]
  /** Results measured differently: shown hollow, never joined. */
  others: TrendPoint[]
  latest?: TrendPoint
  previous?: TrendPoint
  first?: TrendPoint
  /** How many comparable results there are. */
  count: number
  /** "results", or "readings" for blood pressure, "measurements" for BMI. */
  noun: "results" | "readings" | "measurements"
  change?: Change
  band: Band
  statusWord: string
  movementWord: string
  meaningWord: string
  /** One line in plain words: "Up from 5.3 in Apr 2022". */
  takeaway: string
  /** The screen reader sentence, units spelled out. */
  spoken: string
  /** The latest value at the lab's precision ("5.9", "134/86") and with its unit ("5.9%", "162 mg/dL"). */
  value: string
  valueWithUnit: string
}

const EPS = 1e-9

/* --------------------------------------------------------------- time -- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** A record date as a time, from any form the record writes: "2026-08-14",
    "Aug 14, 2026", "Aug 2026" (the middle of the month) or "2019" (the
    middle of the year). Local noon, so day arithmetic never trips on
    daylight saving. NaN when there is no year. */
export function timeOf(date: string): number {
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12).getTime()
  const year = Number(date.match(/\b(\d{4})\b/)?.[1])
  if (!year) return NaN
  const month = MONTHS.findIndex((m) => new RegExp(`\\b${m}`, "i").test(date))
  if (month < 0) return new Date(year, 6, 1, 12).getTime()
  const day = Number(date.match(/\b(\d{1,2}),/)?.[1])
  return new Date(year, month, day || 15, 12).getTime()
}

/** When a result was taken: its ISO day when the record has one. */
export const pointTime = (p: Point) => timeOf(p.at ?? p.date)

/** "Apr 2022" */
export const monthYear = (t: number) => {
  const d = new Date(t)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "April 2022", for screen readers. */
export const monthYearLong = (t: number) => {
  const d = new Date(t)
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/** "Aug 14, 2026" when the record has the day, otherwise its own "Aug 2026". */
export const pointDate = (p: Point) => {
  if (!p.at) return p.date
  const d = new Date(timeOf(p.at))
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/* ------------------------------------------------------------ numbers -- */

const decimalsOf = (n: number) => {
  const s = String(Number(n.toFixed(6)))
  const dot = s.indexOf(".")
  return dot < 0 ? 0 : s.length - dot - 1
}

/** A number as the app writes it: thousands separated, at the given
    precision (by default the number's own, up to two places). */
export function formatNumber(n: number, decimals?: number): string {
  const places = decimals ?? Math.min(decimalsOf(n), 2)
  const [whole, fraction] = Math.abs(n).toFixed(places).split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${n < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`
}

/** The lab's precision for a marker: the most decimals any result shows. */
export function precisionOf(b: Biomarker): number {
  return b.points.reduce((most, p) => {
    const shown = p.shown && /^\d+(\.\d+)?$/.test(p.shown) ? (p.shown.split(".")[1]?.length ?? 0) : decimalsOf(p.value)
    return Math.max(most, shown)
  }, 0)
}

/** One result as written: "5.9", "0.80", "134/86". */
export const valueText = (b: Biomarker, p: Point) => p.shown ?? formatNumber(p.value, precisionOf(b))

/** With the unit: "5.9%", "162 mg/dL", "134/86 mmHg". */
export const withUnit = (b: Biomarker, text: string) => `${text}${b.unit === "%" ? "" : " "}${b.unit}`

const SPOKEN_UNIT: Record<string, string> = {
  "%": "percent",
  "mg/dL": "milligrams per deciliter",
  mmHg: "millimeters of mercury",
  "kg/m²": "kilograms per square meter",
  "ng/mL": "nanograms per milliliter",
  "ng/dL": "nanograms per deciliter",
  "pg/mL": "picograms per milliliter",
  "mIU/L": "milli international units per liter",
  "U/L": "units per liter",
  "g/dL": "grams per deciliter",
  "mmol/L": "millimoles per liter",
  "mL/min/1.73m²": "milliliters per minute",
  "thousand/µL": "thousand per microliter",
}

/** A result for a screen reader: "5.9 percent", "134 over 86 millimeters of mercury". */
export function spokenValue(b: Biomarker, p: Point): string {
  const unit = SPOKEN_UNIT[b.unit] ?? b.unit
  if (p.value2 !== undefined) return `${p.value} over ${p.value2} ${unit}`
  return `${valueText(b, p)} ${unit}`
}

/* -------------------------------------------------------------- range -- */

const strictHigh = (b: Biomarker) => /^below\b/i.test(b.target)

/** Which side of the range a result sits on, or undefined inside it. A
    "Below" range leaves its own edge out: an A1c of 5.7 is not below 5.7.
    Blood pressure is out when either number is. */
export function pointSide(b: Biomarker, p: Pick<Point, "value" | "value2">): Side | undefined {
  const past = (v: number, limit: number) => v > limit + EPS || (strictHigh(b) && Math.abs(v - limit) <= EPS)
  if (b.high !== undefined && past(p.value, b.high)) return "above"
  if (b.high2 !== undefined && p.value2 !== undefined && past(p.value2, b.high2)) return "above"
  if (b.low !== undefined && p.value < b.low - EPS) return "below"
  return undefined
}

/** Inside the range but close to an edge (the Q-05 borderline rule). */
function nearEdge(low: number | undefined, high: number | undefined, v: number) {
  if (low !== undefined && high !== undefined) {
    const reach = (high - low) * THRESHOLDS.borderline + EPS
    return v - low <= reach || high - v <= reach
  }
  if (high !== undefined) return high - v <= high * THRESHOLDS.borderlineOneSided + EPS
  if (low !== undefined) return v - low <= low * THRESHOLDS.borderlineOneSided + EPS
  return false
}

/** In range, Borderline or Out of range, for one result. */
export function pointStatus(b: Biomarker, p: Pick<Point, "value" | "value2">): Status {
  if (pointSide(b, p)) return "out"
  const second = b.high2 !== undefined && p.value2 !== undefined && nearEdge(undefined, b.high2, p.value2)
  return nearEdge(b.low, b.high, p.value) || second ? "borderline" : "in"
}

/** The patient's range as a band. */
export function bandOf(b: Biomarker): Band {
  return {
    low: b.low,
    high: b.high,
    high2: b.high2,
    label: b.target,
    open: b.low === undefined ? "below" : b.high === undefined ? "above" : undefined,
  }
}

/** The smallest change that counts as moving: 10% of the range width, or 5%
    of a one sided limit. */
export function movingThreshold(b: Biomarker): number {
  if (b.low !== undefined && b.high !== undefined) return (b.high - b.low) * THRESHOLDS.moving
  const limit = b.high ?? b.low
  if (limit !== undefined) return Math.abs(limit) * THRESHOLDS.movingOneSided
  const first = b.points[0]?.value ?? 0
  return Math.abs(first) * THRESHOLDS.movingOneSided
}

/** A value past the clinical review limits goes to the doctor first: no
    offer is ever built on it. */
export function needsReview(b: Biomarker, p?: Pick<Point, "value">): boolean {
  if (!p || !b.review) return false
  return (b.review.above !== undefined && p.value > b.review.above) || (b.review.below !== undefined && p.value < b.review.below)
}

/** The values a chart's y axis should cover: every result plus the band edge
    nearest the latest one, padded (18% of the span by default) so dots never
    touch the edge. Never below zero for a measure that cannot be negative. */
export function domainOf(b: Biomarker, points: Point[] = b.points, pad = 0.18): [number, number] {
  const values = points.flatMap((p) => (p.value2 !== undefined ? [p.value, p.value2] : [p.value]))
  const edges = [b.low, b.high].filter((e): e is number => e !== undefined)
  if (!values.length) values.push(...edges)
  if (!values.length) return [0, 1]
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const latest = points.at(-1)?.value
  if (latest !== undefined && edges.length) {
    const nearest = edges.reduce((a, e) => (Math.abs(e - latest) < Math.abs(a - latest) ? e : a))
    lo = Math.min(lo, nearest)
    hi = Math.max(hi, nearest)
  }
  const room = Math.max((hi - lo) * pad, Math.abs(hi) * 0.02, EPS)
  const floor = values.every((v) => v >= 0) ? 0 : -Infinity
  return [Math.max(lo - room, floor), hi + room]
}

/* -------------------------------------------------------- comparable -- */

/** The method a marker's line follows: the clinical draw when the record
    has one, otherwise the most used method. Ties go to the latest result. */
function referenceMethod(sorted: TrendPoint[]): string {
  const key = (p: Point) => p.method ?? ""
  const keys = new Set(sorted.map(key))
  if (keys.size <= 1) return sorted.length ? key(sorted[0]) : ""
  const clinical = sorted.filter((p) => p.origin !== "you" && p.origin !== "report")
  const pool = clinical.length ? clinical : sorted
  const tally = new Map<string, number>()
  for (const p of pool) tally.set(key(p), (tally.get(key(p)) ?? 0) + 1)
  let best = key(pool[pool.length - 1])
  for (const [k, n] of tally) if (n > (tally.get(best) ?? 0)) best = k
  return best
}

/** Every result in time order, split into the comparable ones (joined, and
    the only ones that set a direction) and the ones measured differently. */
export function resultsOf(b: Biomarker): { series: TrendPoint[]; others: TrendPoint[] } {
  const sorted = b.points.map((p) => ({ ...p, t: pointTime(p) })).sort((x, y) => x.t - y.t)
  const ref = referenceMethod(sorted)
  return {
    series: sorted.filter((p) => (p.method ?? "") === ref),
    others: sorted.filter((p) => (p.method ?? "") !== ref),
  }
}

/* ---------------------------------------------------------- movement -- */

/** Rising or falling only when the last three comparable results (or the
    last two) all go one way and the change across them reaches the moving
    threshold; steady otherwise; unknown with fewer than two. */
export function movementOf(b: Biomarker, series: TrendPoint[]): Movement {
  if (series.length < 2) return "unknown"
  const window = series.slice(-THRESHOLDS.window)
  const change = window[window.length - 1].value - window[0].value
  if (Math.abs(change) < movingThreshold(b) - EPS || Math.abs(change) <= EPS) return "steady"
  const steps = window.slice(1).map((p, i) => p.value - window[i].value)
  const oneWay = change > 0 ? steps.every((s) => s >= -EPS) : steps.every((s) => s <= EPS)
  if (!oneWay) return "steady"
  return change > 0 ? "rising" : "falling"
}

/** What a movement means for the range. Toward or into the range, or deeper
    inside it, is improving; toward an edge or further past it is moving
    away. A two sided range is judged from its middle. */
export function meaningOf(b: Biomarker, movement: Movement, latest?: Point): Meaning {
  if (movement === "unknown" || movement === "steady" || !latest) return movement === "unknown" ? "unknown" : "steady"
  const up = movement === "rising"
  const v = latest.value
  if (b.low !== undefined && b.high !== undefined) {
    if (v > b.high) return up ? "away" : "improving"
    if (v < b.low) return up ? "improving" : "away"
    const middle = (b.low + b.high) / 2
    return (up ? v >= middle : v <= middle) ? "away" : "improving"
  }
  if (b.high !== undefined) return up ? "away" : "improving"
  if (b.low !== undefined) return up ? "improving" : "away"
  return "steady"
}

/** How many steps in a row, counted back from the latest, went the way the
    marker is moving: a sort key for equally ranked tiles. */
function runOf(series: TrendPoint[], movement: Movement) {
  if (movement !== "rising" && movement !== "falling") return 0
  let run = 0
  for (let i = series.length - 1; i > 0; i--) {
    const step = series[i].value - series[i - 1].value
    if (movement === "rising" ? step > EPS : step < -EPS) run++
    else break
  }
  return run
}

/** How far past (or how close to) the edge the latest result is, as a share
    of the range: a sort key for equally ranked tiles. */
function distanceShare(b: Biomarker, p?: Point) {
  if (!p) return 0
  const scale = b.low !== undefined && b.high !== undefined ? b.high - b.low : Math.abs(b.high ?? b.low ?? p.value) || 1
  if (b.high !== undefined && p.value >= b.high) return (p.value - b.high) / scale
  if (b.low !== undefined && p.value <= b.low) return (b.low - p.value) / scale
  return 0
}

/* -------------------------------------------------------------- words -- */

export const nounOf = (b: Biomarker): Trend["noun"] => (b.id === "bp" ? "readings" : b.id === "bmi" ? "measurements" : "results")

const RANK: Record<Status, Partial<Record<Meaning, number>>> = {
  out: { away: 1, steady: 2, unknown: 2, improving: 3 },
  borderline: { away: 4, steady: 4, unknown: 4, improving: 4 },
  in: { away: 5, improving: 6 },
}

/** The change since the first comparable result, in words. */
export function changeOf(b: Biomarker, series: TrendPoint[]): Change | undefined {
  if (series.length < 2) return undefined
  const from = series[0]
  const to = series[series.length - 1]
  const delta = to.value - from.value
  const amount = formatNumber(Math.abs(delta), precisionOf(b))
  const when = monthYear(from.t)
  const same = Number(amount.replace(/,/g, "")) === 0 && (from.value2 ?? 0) === (to.value2 ?? 0)
  let words: string
  if (same) words = `Same as in ${when}`
  else if (from.value2 !== undefined) words = `${delta >= 0 ? "Up" : "Down"} from ${valueText(b, from)} in ${when}`
  else words = `${delta > 0 ? "Up" : "Down"} ${amount} since ${when}`
  return { from, to, delta, amount, words }
}

function takeawayOf(b: Biomarker, t: Omit<Trend, "takeaway" | "spoken">): string {
  const { series, latest, first, movement, status, side, noun } = t
  if (!latest || !first) return "No results yet"
  if (series.length === 1) return "One result so far"
  const window = series.slice(-THRESHOLDS.window)
  if (movement === "rising" || movement === "falling") {
    const sign = movement === "rising" ? 1 : -1
    const base = (latest.value - first.value) * sign > 0 ? first : window[0]
    const line = `${sign > 0 ? "Up" : "Down"} from ${valueText(b, base)} in ${monthYear(base.t)}`
    return status !== "out" && pointSide(b, base) ? `${line}, now in your range` : line
  }
  if (status === "out" && side) {
    const where = side === "above" ? "Above" : "Below"
    if (window.every((p) => pointSide(b, p) === side)) return `${where} your range in your last ${window.length} ${noun}`
    return `${where} your range, close to where it was in ${monthYear(window[0].t)}`
  }
  return `Steady since ${monthYear(first.t)}`
}

function spokenOf(b: Biomarker, t: Omit<Trend, "takeaway" | "spoken">): string {
  const { latest, first, count, movement, noun } = t
  if (!latest || !first) return `${b.name}, no results yet.`
  const where = t.statusWord.toLowerCase()
  if (count === 1) return `${b.name}, ${spokenValue(b, latest)}, ${where}, one result so far.`
  const how = movement === "steady" ? "steady" : t.movementWord.toLowerCase()
  return `${b.name}, ${spokenValue(b, latest)}, ${where}, ${how} across ${count} ${noun} since ${monthYearLong(first.t)}.`
}

/* ---------------------------------------------------------- classify -- */

/** Everything the screens need about one marker. Results with no comparable
    history read "One result so far"; a marker with no results reads "No
    results yet" and is never watched. */
export function classify(b: Biomarker): Trend {
  const { series, others } = resultsOf(b)
  const latest = series.at(-1)
  const previous = series.at(-2)
  const first = series[0]
  const status: Status = latest ? pointStatus(b, latest) : "in"
  const side = latest ? pointSide(b, latest) : undefined
  const movement = movementOf(b, series)
  const meaning = meaningOf(b, movement, latest)
  const rank = latest ? (RANK[status][meaning] ?? 0) : 0
  const reason = status === "out" ? "out" : status === "borderline" ? "borderline" : rank ? "moving" : undefined
  const value = latest ? valueText(b, latest) : ""
  const base: Omit<Trend, "takeaway" | "spoken"> = {
    marker: b,
    id: b.id,
    status,
    side,
    movement,
    meaning,
    reason,
    watch: rank > 0,
    rank,
    series,
    others,
    latest,
    previous,
    first,
    count: series.length,
    noun: nounOf(b),
    change: changeOf(b, series),
    band: bandOf(b),
    statusWord: STATUS_WORD[status],
    movementWord: MOVEMENT_WORD[movement],
    meaningWord: MEANING_WORD[meaning],
    value,
    valueWithUnit: latest ? withUnit(b, value) : "",
  }
  return { ...base, takeaway: takeawayOf(b, base), spoken: spokenOf(b, base) }
}

/** One marker read through classify, by id, from the markers the screen
    reads (pass `useMarkers()`). */
export const trendOf = (id: string, markers: Biomarker[] = BIOMARKERS) => {
  const b = markers.find((m) => m.id === id)
  return b ? classify(b) : undefined
}

/** The direction line under a value, in words: "Trending up", "Trending
    down", "Steady"; "Trending up, improving" when the movement takes it
    toward or into its range; "One result so far" with one comparable
    result; "No results yet" with none. Never a number. */
export function directionWords(t: Trend): string {
  if (t.count === 0) return "No results yet"
  if (t.count === 1) return "One result so far"
  if (t.movement !== "rising" && t.movement !== "falling") return MOVEMENT_WORD.steady
  return t.meaning === "improving" ? `${t.movementWord}, improving` : t.movementWord
}

/* ---------------------------------------------------------- questions -- */

/** A marker's questions for Dr. Patel with the values they quote filled in
    from the results as they stand, so a new result never leaves an old
    number in a question she saves to her visit list: {first} and {latest}
    at the lab's precision, {since} the first result's year. `member` takes
    the record's questions for a member where it has them (blood pressure,
    checked at home every evening), with `fill` for what only the screen
    knows ({home}, the evenings' average; {month}, the latest clinic
    reading's month). A question whose values the results cannot give (a
    change with one result) is left out. The marker page and the assistant
    both read this. */
export function questionsOf(t: Trend, opts: { member?: boolean; fill?: Record<string, string> } = {}): string[] {
  const b = t.marker
  const values: Record<string, string | undefined> = {
    first: t.first && t.count > 1 ? valueText(b, t.first) : undefined,
    latest: t.latest ? t.value : undefined,
    since: t.first && t.count > 1 ? String(new Date(t.first.t).getFullYear()) : undefined,
    ...opts.fill,
  }
  const filled = (list: readonly string[]) =>
    list.map((q) => q.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all)).filter((q) => !/\{\w+\}/.test(q))
  const own = opts.member && b.memberQuestions ? filled(b.memberQuestions) : []
  // The member's own questions only when every value they quote is known.
  return own.length === (b.memberQuestions?.length ?? -1) ? own : filled(b.questions ?? [])
}

/* ---------------------------------------------------------- chart kit -- */

/** The chart kit's direction words for a classified marker: "up", "down",
    "flat", or undefined with fewer than two comparable results. */
export const chartTrend = (t: Trend): "up" | "down" | "flat" | undefined =>
  t.movement === "rising" ? "up" : t.movement === "falling" ? "down" : t.movement === "steady" ? "flat" : undefined

/** A marker as the chart kit's series (components/charts.tsx MarkerSeries,
    matched by shape): every result in time order with its own status from
    these rules (borderline included, so a dot and its pill always agree),
    the ones measured another way marked `other`, and the place each came
    from by name. */
export function chartSeries(t: Trend) {
  const b = t.marker
  const others = new Set(t.others)
  return {
    name: b.name,
    unit: b.unit,
    low: b.low,
    high: b.high,
    range: b.target,
    status: t.latest ? t.status : undefined,
    trend: chartTrend(t),
    readings: [...t.series, ...t.others]
      .sort((x, y) => x.t - y.t)
      .map((p) => ({
        date: p.date,
        at: p.at,
        value: p.value,
        shown: p.shown,
        source: PLACE_NAME[p.origin],
        other: others.has(p),
        method: p.method,
        status: pointStatus(b, p),
      })),
  }
}

/** A marker ready for the chart kit's tiles and trend charts, with its
    status and direction from the rules here (so borderline and moving follow
    Q-05, not the band alone): `<TrendTile {...chartInput(t)} />`. The same
    as chartSeries(t). */
export const chartInput = (t: Trend) => chartSeries(t)

/* --------------------------------------------------------- watch list -- */

/** The why conversation's "what would you like to improve" answers, mapped
    to the markers they are about. Used only to order equally ranked tiles,
    so everybody's page leads with what they said matters. */
export const IMPROVE_MARKERS: Record<string, string[]> = {
  "Blood sugar": ["a1c", "glucose"],
  Weight: ["bmi"],
  "Blood pressure": ["bp"],
  Energy: ["ferritin", "hemoglobin", "tsh", "b12", "vitd"],
  Nutrition: ["ldl", "tg", "hdl", "vitd"],
  Fitness: ["hdl", "bmi"],
}

/** Markers worth watching, in the F-26 order: out of range and moving away,
    out of range and steady, out of range and improving, borderline, in range
    and moving away, in range and improving. Steady markers in range never
    appear. Ties go to what the patient said they want to improve (pass the
    why answers' `improve`), then the newest result, then the longest run in
    one direction, then the furthest from the range. */
export function watchList(markers: Biomarker[] = BIOMARKERS, opts: { improve?: string[] } = {}): Trend[] {
  const wanted = (opts.improve ?? []).map((area) => IMPROVE_MARKERS[area] ?? [])
  const preference = (id: string) => {
    const i = wanted.findIndex((ids) => ids.includes(id))
    return i < 0 ? wanted.length : i
  }
  return markers
    .map(classify)
    .filter((t) => t.watch)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        preference(a.id) - preference(b.id) ||
        (b.latest?.t ?? 0) - (a.latest?.t ?? 0) ||
        runOf(b.series, b.movement) - runOf(a.series, a.movement) ||
        distanceShare(b.marker, b.latest) - distanceShare(a.marker, a.latest)
    )
}

/** The tiles the free home shows: the first four of the watch list. With
    `goodNews`, the last tile goes to the best improving marker when the
    four would otherwise all be concerns (a proposal, off by default; the
    catalog's F-26 order is the rule). */
export function homeTiles(list: Trend[], opts: { max?: number; goodNews?: boolean } = {}) {
  const max = opts.max ?? 4
  const tiles = list.slice(0, max)
  if (opts.goodNews && list.length > max && !tiles.some((t) => t.meaning === "improving")) {
    const good = list.find((t) => t.meaning === "improving")
    if (good) tiles[max - 1] = good
  }
  return {
    tiles,
    /** Watched markers not on the home. */
    more: list.length - tiles.length,
    /** "See all 8 to watch", only when some are not shown. */
    seeAll: list.length > tiles.length ? `See all ${list.length} to watch` : undefined,
  }
}

export type TrendCounts = {
  /** Every marker in the record. */
  total: number
  /** Every watched marker, improving ones included. */
  toWatch: number
  /** Every marker not watched: in range and not moving. */
  steady: number
  /** Markers whose latest result is in range, watched ones included (the
      composition bar: in range, borderline, out of range). */
  inRange: number
  out: number
  borderline: number
  movingAway: number
  improving: number
  /** The line over the tiles: "19 steady, 8 to watch"; a zero part is left
      out ("27 steady", "8 to watch"). */
  line: string
}

/** The count line over the trend tiles and the Record tab's composition,
    across every marker the patient's record holds (pass `useMarkers()`). */
export function trendCounts(markers: Biomarker[] = BIOMARKERS): TrendCounts {
  const all = markers.map(classify)
  const toWatch = all.filter((t) => t.watch).length
  const steady = all.length - toWatch
  return {
    total: all.length,
    toWatch,
    steady,
    inRange: all.filter((t) => t.status === "in" && t.latest).length,
    out: all.filter((t) => t.status === "out").length,
    borderline: all.filter((t) => t.status === "borderline").length,
    movingAway: all.filter((t) => t.meaning === "away").length,
    improving: all.filter((t) => t.meaning === "improving").length,
    line: [steady ? `${steady} steady` : "", toWatch ? `${toWatch} to watch` : ""].filter(Boolean).join(", "),
  }
}

/** Markers grouped by body system, in the Record tab's order, each group in
    the record's own order. Markers with no group go last under "Other". */
export function byBodySystem(markers: Biomarker[] = BIOMARKERS, order: readonly string[] = BODY_SYSTEMS) {
  const groups = new Map<string, Biomarker[]>(order.map((g) => [g, []]))
  for (const m of markers) {
    const g = m.group ?? "Other"
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(m)
  }
  return [...groups].filter(([, list]) => list.length).map(([group, list]) => ({ group, markers: list }))
}
