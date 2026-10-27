import * as React from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import Svg, { Circle, Defs, G, Line, LinearGradient, Mask, Path, Rect, Stop, Text as SvgText } from "react-native-svg"

import { ORIGIN_LABEL, inRange, type Biomarker } from "@/lib/record"
import { cardRadius, chart, color, font, ink, outOfRangeColor, space, surface, type } from "@/lib/theme"
import { THRESHOLDS } from "@/lib/trends"

/* The chart kit: every chart in the patient app, drawn with react-native-svg
   to one set of marks (requirements catalog 7.3, with the geometry of the
   dataviz benchmark and the Figma chart study).

   One meaning per mark, everywhere: a filled teal dot is a result; a hollow
   ring is a result measured another way, never joined; the pale green band
   is the patient's range; a solid grey hairline is a goal or a target,
   always labelled; a dashed line is a forecast and nothing else. Status
   colour sits only on small marks and never alone: out of range is a filled
   dot, borderline a ring, and a word goes with them. Time is to scale,
   sparse lab results are joined by straight segments with no fill, and the
   readout sits above the plot instead of in a bubble over the data.

   Every chart takes plain data (values with dates, a band, a goal, a
   status), so screens can feed it from lib/record.ts today and from the
   trend and member data later. Each has a takeaway slot for its point in
   words, a spoken summary, designed empty, single result and "No reading"
   states, and draws itself in once (lines 600 ms, rings 700 ms, bars 450 ms
   staggered 35 ms), or not at all under Reduce Motion. */

/* ---------------------------------------------------------------- data -- */

/** When a reading was taken: a record date ("Aug 2026", "Aug 14, 2026",
    "2024", "Today"), an ISO date, a timestamp or a Date. */
export type When = string | number | Date

/** Where a value sits against the patient's range. */
export type Standing = "in" | "borderline" | "out"

/** Which way results move, as a fact. What it means is the data layer's. */
export type Trend = "up" | "down" | "flat"

/** One result. */
export type Reading = {
  /** As it reads beside the value and under the axis: "Aug 2026". */
  date: When
  /** The exact day, for the time scale ("2026-08-14"); `date` when left out. */
  at?: When
  value: number
  /** As the lab reported it ("5.9", "134/86"); the value by default. */
  shown?: string
  /** Where it came from, for the readout: "Quest", "Your doctor". */
  source?: string
  /** Measured another way (a home kit): drawn hollow and never joined. */
  other?: boolean
  /** The method's name, for the legend: "Home finger prick kit". */
  method?: string
  /** Its place against the range; worked out from the band when left out. */
  status?: Standing
}

/** A marker's results as plain data, oldest first. */
export type MarkerSeries = {
  name: string
  unit: string
  /** The patient's range; either end may be open. */
  low?: number
  high?: number
  /** The range in words: "Below 5.7", "30 to 100". */
  range?: string
  readings: Reading[]
  /** The latest result's standing, where the data layer knows more than the
      band does (borderline is a clinical rule). */
  status?: Standing
  /** The direction; worked out from the comparable results when left out. */
  trend?: Trend
}

/** A chart's data: the plain series, or a record Biomarker to read it from. */
export type SeriesInput = MarkerSeries | { marker: Biomarker; status?: Standing; trend?: Trend }

/** A value on a date, for progress lines and forecasts. */
export type Dated = { date: When; value: number }

/* --------------------------------------------------------------- words -- */

/** The patient's words for a standing (catalog 6.1): never "abnormal",
    "outside target", High or Low. */
export const STATUS_WORD: Record<Standing, string> = {
  in: "In range",
  borderline: "Borderline",
  out: "Out of range",
}

export const TREND_WORD: Record<Trend, string> = {
  up: "Trending up",
  down: "Trending down",
  flat: "Steady",
}

/** A status mark's colour beside its word. Out of range is read at render
    (outOfRangeColor), so the review's red or clay swap reaches every mark. */
const TONE: Record<Standing, string> = {
  in: chart.inRange,
  borderline: chart.borderline,
  get out() {
    return outOfRangeColor()
  },
}

/* The status colour scale, by value. Deep inside the range is green; it turns
   orange across the borderline margin (the app's own Q-05 rule: a tenth of a
   two sided range's width, a twentieth of a one sided limit) and is orange
   at the edge; one more margin beyond the edge it is red. So a line that
   climbs out of its range goes green, orange, red, and one that comes back
   goes red, orange, green. */

const mixHex = (a: string, b: string, t: number) => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [p, q] = [rgb(a), rgb(b)]
  return `#${p.map((c, i) => Math.round(c + (q[i] - c) * t).toString(16).padStart(2, "0")).join("")}`
}

/** How wide the orange stretch is, in the marker's unit. */
function marginOf(low?: number, high?: number) {
  if (low !== undefined && high !== undefined) return (high - low) * THRESHOLDS.borderline
  const edge = high ?? low
  return edge === undefined ? 0 : Math.abs(edge) * THRESHOLDS.borderlineOneSided
}

/** 0 well inside the range, 1 at its edge, 2 a margin beyond it. */
function severityAt(v: number, low?: number, high?: number) {
  const m = marginOf(low, high) || 1e-9
  let s = 0
  if (high !== undefined) s = Math.max(s, clamp((v - (high - m)) / m, 0, 2))
  if (low !== undefined) s = Math.max(s, clamp((low + m - v) / m, 0, 2))
  return s
}

/** A value's colour on that scale; teal for a marker with no range. */
function tintAt(v: number, low?: number, high?: number) {
  if (low === undefined && high === undefined) return chart.data
  const s = severityAt(v, low, high)
  return s <= 1 ? mixHex(chart.inRange, chart.borderline, s) : mixHex(chart.borderline, outOfRangeColor(), s - 1)
}

/** The scale as gradient stops across a line (use with a userSpaceOnUse
    gradient from the first x to the last): the line is sampled along each
    segment, so a run that climbs out of its range passes through green,
    orange and red in order, and the line and the fill under it share them. */
function curveStops(xy: [number, number][], values: number[], tint: (v: number) => string) {
  const x0 = xy[0][0]
  const span = Math.max(xy[xy.length - 1][0] - x0, 1)
  const out: React.ReactElement[] = []
  for (let k = 0; k < xy.length - 1; k++) {
    for (let j = k ? 1 : 0; j <= 8; j++) {
      const t = j / 8
      const x = xy[k][0] + (xy[k + 1][0] - xy[k][0]) * t
      out.push(<Stop key={`${k}-${j}`} offset={(x - x0) / span} stopColor={tint(values[k] + (values[k + 1] - values[k]) * t)} />)
    }
  }
  return out
}

/** A result dot's colour on a plot: teal inside the range (it is the
    patient's data), status colour only outside it. */
const DOT: Record<Standing, string> = {
  in: chart.inRange,
  borderline: chart.borderline,
  get out() {
    return outOfRangeColor()
  },
}

const SPOKEN_UNIT: Record<string, string> = {
  "%": "percent",
  "mg/dL": "milligrams per deciliter",
  "ng/mL": "nanograms per milliliter",
  "mIU/L": "milli international units per liter",
  "U/L": "units per liter",
  mmHg: "millimeters of mercury",
  "kg/m²": "kilograms per square meter",
  lb: "pounds",
  kg: "kilograms",
  in: "inches",
  g: "grams",
  mg: "milligrams",
  kcal: "calories",
  h: "hours",
  bpm: "beats per minute",
}

/** A unit as a screen reader should say it: "percent", not "%". */
const spokenUnit = (unit: string) => SPOKEN_UNIT[unit] ?? unit

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** A value with its unit as a screen reader says it: "5.9 percent", "13
    chair stands"; the bare number without a unit. */
const withSpokenUnit = (value: string, unit?: string) => (unit ? `${value} ${spokenUnit(unit)}` : value)

/** The range in a screen reader's words, as the legend and the edge labels
    write it, with its unit: "Range below 5.7 percent", "Range 30 to 100
    nanograms per milliliter", "Goal 30 to 35 percent". Empty without one. */
function rangeSpoken(low: number | undefined, high: number | undefined, unit: string, words?: string, zone = "Range") {
  const decimals = Math.max(decimalsOf(low ?? 0), decimalsOf(high ?? 0))
  const n = (v: number) => formatNumber(v, decimals)
  const body = words
    ? lowerFirst(words)
    : low !== undefined && high !== undefined
      ? `${n(low)} to ${n(high)}`
      : high !== undefined
        ? `below ${n(high)}`
        : low !== undefined
          ? `${n(low)} or above`
          : ""
  if (!body) return ""
  // The unit follows the number: "100 pounds or above", "below 35 inches".
  const open = body.match(/^(.*?)( or above)$/i)
  return `${zone} ${open ? `${withSpokenUnit(open[1], unit)}${open[2]}` : withSpokenUnit(body, unit)}`
}

/* ------------------------------------------------------------- numbers -- */

/** Decimal places a value carries, at most three. */
const decimalsOf = (v: number) => {
  const s = Math.abs(v)
    .toFixed(3)
    .replace(/\.?0+$/, "")
  const dot = s.indexOf(".")
  return dot < 0 ? 0 : s.length - dot - 1
}

/** "8,412", "5.9", "186.4": thousands separators, at the precision the value
    came with (or the one asked for). */
export function formatNumber(v: number, decimals = decimalsOf(v)) {
  const [whole, part] = Math.abs(v).toFixed(decimals).split(".")
  const sign = v < 0 && Number(Math.abs(v).toFixed(decimals)) !== 0 ? "-" : ""
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${part ? `.${part}` : ""}`
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const clampIndex = (i: number, n: number) => clamp(Math.round(i), 0, Math.max(n - 1, 0))

/** About how wide a short label sets in Inter, to keep labels apart and
    inside the plot. Chart labels are type.axis's size. */
const textWidth = (s: string, size: number = type.axis.fontSize) => s.length * size * 0.58

/** A plot's trailing gutter: as wide as its widest label (set 6 pt from the
    plot, with room to spare), never narrower than `min`. */
const gutterFor = (labels: string[], min: number) => Math.max(min, ...labels.map((l) => Math.ceil(textWidth(l)) + 10))

type Anchor = "start" | "middle" | "end"

/** Where a label sits on a plot: its baseline and anchor as drawn, and the
    box it covers, for keeping labels apart. */
type Spot = { x: number; y: number; anchor: Anchor; box: Box }
type Box = { x0: number; x1: number; y0: number; y1: number }

/** A 12 pt label's box: about as wide as it sets, from its cap height over
    the baseline to its descenders under it. */
function spotAt(x: number, y: number, text: string, anchor: Anchor = "start"): Spot {
  const w = textWidth(text)
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w
  return { x, y, anchor, box: { x0, x1: x0 + w, y0: y - 12, y1: y + 3 } }
}

/** Two labels read as two: 12 pt apart sideways, or, one over the other,
    24 pt apart (a line and a half), so a value under another never reads
    as one stacked figure (today's "13" under the goal's "15"): each sits
    nearer its own mark than the other label. */
function apart(a: Box, b: Box) {
  return sideways(a, b) >= 12 || Math.max(a.y0 - b.y1, b.y0 - a.y1) >= 24
}

/** How far apart two labels sit sideways; below zero when they overlap. */
const sideways = (a: Box, b: Box) => Math.max(a.x0 - b.x1, b.x0 - a.x1)

/** Two labels that cannot be mistaken for one figure (one names itself,
    "Goal 175 lb") only need a little air between them. */
const clearBy = (a: Box, b: Box, gap: number) => Math.max(sideways(a, b), a.y0 - b.y1, b.y0 - a.y1) >= gap

/** Whether a horizontal line at `y` runs through a label. */
const crosses = (box: Box, y: number) => y > box.y0 - 2 && y < box.y1 + 2

/* --------------------------------------------------------------- dates -- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAY = 86_400_000

const monthIndex = (word: string) => (/^[A-Za-z]{3}/.test(word) ? MONTHS.findIndex((m) => m.toLowerCase() === word.slice(0, 3).toLowerCase()) : -1)

/** Reads a date for the time scale. A month alone sits in its middle and a
    year alone mid-year, so "Aug 2026" and "Aug 14, 2026" share one scale; a
    day without a year ("Sep 30") is the latest one not in the future. */
export function parseWhen(when: When, today: Date = new Date()): number | undefined {
  if (when instanceof Date) return when.getTime()
  if (typeof when === "number") return Number.isFinite(when) ? when : undefined
  const s = when.trim()
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (/^today$/i.test(s)) return midnight
  if (/^yesterday$/i.test(s)) return midnight - DAY
  const iso = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, iso[3] ? Number(iso[3]) : 15).getTime()
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 6, 1).getTime()
  const parts = s.replace(/,/g, " ").split(/\s+/)
  const month = monthIndex(parts[0])
  if (month >= 0 && parts.length === 3) return new Date(Number(parts[2]), month, Number(parts[1])).getTime()
  if (month >= 0 && parts.length === 2 && /^\d{4}$/.test(parts[1])) return new Date(Number(parts[1]), month, 15).getTime()
  if (month >= 0 && parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
    const d = new Date(today.getFullYear(), month, Number(parts[1]))
    if (d.getTime() > midnight + DAY) d.setFullYear(d.getFullYear() - 1)
    return d.getTime()
  }
  const parsed = Date.parse(s)
  return Number.isNaN(parsed) ? undefined : parsed
}

/** A date as it reads beside a value: as the record wrote it ("Aug 2026"),
    or "Aug 14, 2026". */
export function showWhen(when: When) {
  if (typeof when === "string" && !/^\d{4}-\d{2}/.test(when.trim())) return when
  const t = parseWhen(when)
  if (t === undefined) return String(when)
  const d = new Date(t)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** Spelled out for a screen reader: "August 14, 2026". */
const spokenWhen = (when: When) => showWhen(when).replace(/^([A-Z][a-z]{2})\b/, (m) => MONTH_NAMES[MONTHS.indexOf(m)] ?? m)

/** "May 18". */
const monthDay = (t: number) => `${MONTHS[new Date(t).getMonth()]} ${new Date(t).getDate()}`

/** "early November", "mid January": a forecast's honest precision. */
const partOfMonth = (t: number) => {
  const d = new Date(t)
  return `${d.getDate() <= 10 ? "early" : d.getDate() <= 20 ? "mid" : "late"} ${MONTH_NAMES[d.getMonth()]}`
}

/** When something happened, for the time scale: its exact day when known. */
const timeOf = (item: { date: When; at?: When }) => parseWhen(item.at ?? item.date)

/** Oldest first, by date; a list with a date that cannot be read keeps its
    order. */
function sortByTime<T extends { date: When; at?: When }>(list: readonly T[]): T[] {
  const keyed = list.map((item, i) => ({ item, i, t: timeOf(item) }))
  if (keyed.some((k) => k.t === undefined)) return [...list]
  return keyed.sort((a, b) => a.t! - b.t! || a.i - b.i).map((k) => k.item)
}

/** Each date as a time, or its place in the list when a date cannot be read. */
function timesOf(list: readonly { date: When; at?: When }[]): number[] {
  const ts = list.map(timeOf)
  return ts.every((t): t is number => t !== undefined) ? ts : list.map((_, i) => i)
}

/* ------------------------------------------------------------- series -- */

/** In or out of the range, from the band alone (an edge counts as inside).
    Borderline is a clinical rule (Q-05), so it comes from the data layer. */
export function statusOf(value: number, low?: number, high?: number): Standing {
  return (low !== undefined && value < low) || (high !== undefined && value > high) ? "out" : "in"
}

/** The direction across comparable results, as a fact: first against last,
    steady within 3%. */
export function trendOf(readings: readonly Reading[]): Trend | undefined {
  const same = readings.filter((r) => !r.other)
  if (same.length < 2) return undefined
  const first = same[0].value
  const last = same[same.length - 1].value
  if (Math.abs(last - first) <= Math.max(Math.abs(first), Math.abs(last)) * 0.03) return "flat"
  return last > first ? "up" : "down"
}

/** A record Biomarker as chart data. Results join on the reference method
    (the latest one not reported by the patient, which is the lab draw when
    there is one); any other method is drawn hollow and never joined. Each
    result's standing follows the record's own rule, so an A1c of 5.7 is not
    "below 5.7". A marker with no range gets no standing at all. */
export function seriesOf(b: Biomarker): MarkerSeries {
  const counted = [...b.points].reverse()
  const reference = (counted.find((p) => p.origin !== "you") ?? counted[0])?.method
  const banded = b.low !== undefined || b.high !== undefined
  return {
    name: b.name,
    unit: b.unit,
    low: b.low,
    high: b.high,
    range: b.target || undefined,
    readings: b.points.map((p) => ({
      date: p.date,
      at: p.at,
      value: p.value,
      shown: p.shown,
      source: ORIGIN_LABEL[p.origin],
      other: p.method !== reference,
      method: p.method,
      status: banded ? (inRange(b, p.value) ? "in" : "out") : undefined,
    })),
  }
}

function seriesFrom(input: SeriesInput): MarkerSeries {
  if ("marker" in input) return { ...seriesOf(input.marker), status: input.status, trend: input.trend }
  return input
}

/** Results only measured different ways, under a chart (C.3). */
const OTHER_METHODS = "Measured with different methods, so there is no trend yet."

/** The value scale of a marker chart, so a change looks as large as it is.
    It holds the results and the range's edge nearest the latest; the whole
    range when every result sits inside a two sided one (glucose at 92 to 95
    reads as a calm line in its 70 to 99 band); the far edge too when it is
    close; padded so dots never touch the plot's edge. It never spans less
    than five times the app's own movement threshold (Q-05: a tenth of a two
    sided range's width, a twentieth of a one sided limit), so a wobble the
    app calls steady stays nearly flat and a real move reads as one: A1c's
    5.3 to 5.9 against "below 5.7" climbs about 40% of the plot, not all of
    it. A wide range never squashes results outside it: vitamin D at 19 to
    24 against 30 to 100 scales to about 7 to 42. */
function valueDomain(values: number[], low?: number, high?: number, pad = 0.18): [number, number] {
  let min = Math.min(...values)
  let max = Math.max(...values)
  const latest = values[values.length - 1]
  const edges = [low, high].filter((e): e is number => e !== undefined)
  if (low !== undefined && high !== undefined && min >= low && max <= high) {
    min = low
    max = high
  } else if (edges.length) {
    const near = edges.reduce((a, e) => (Math.abs(e - latest) < Math.abs(a - latest) ? e : a))
    const reach = 1.5 * Math.max(max - min, Math.abs(near - latest))
    min = Math.min(min, near)
    max = Math.max(max, near)
    for (const e of edges) {
      if (e === near) continue
      if ((e > max ? e - max : min - e) <= reach) {
        min = Math.min(min, e)
        max = Math.max(max, e)
      }
    }
  }
  const span = max - min || Math.max(Math.abs(max) * 0.1, 1)
  let lo = min - span * pad
  let hi = max + span * pad
  const floor =
    low !== undefined && high !== undefined
      ? 5 * THRESHOLDS.moving * (high - low)
      : edges.length
        ? 5 * THRESHOLDS.movingOneSided * Math.abs(edges[0])
        : 0
  if (hi - lo < floor) {
    const c = (lo + hi) / 2
    lo = c - floor / 2
    hi = c + floor / 2
  }
  // Amounts that cannot be negative start at zero at the lowest, keeping
  // the span.
  if (lo < 0 && Math.min(...values, ...edges) >= 0) {
    hi -= lo
    lo = 0
  }
  return [lo, hi]
}

/** The range bar's scale: the range readable and the value always on it.
    "Below X" shows from 75% of X, "X or above" up to 160% of X. */
export function rangeDomain(low: number | undefined, high: number | undefined, value: number, start?: number): [number, number] {
  const a = low ?? (high !== undefined ? high * 0.75 : value * 0.75)
  const z = high ?? (low !== undefined ? low * 1.6 : value * 1.25)
  const span = Math.max(z - a, Math.abs(value) * 0.1, 1e-6)
  const vals = start === undefined ? [value] : [value, start]
  let min = Math.min(a - span * 0.35, ...vals.map((v) => v - span * 0.08))
  const max = Math.max(z + span * 0.35, ...vals.map((v) => v + span * 0.08))
  if (min < 0 && Math.min(a, ...vals) >= 0) min = 0
  return [min, max]
}

/** Where the range sits on a plot, clipped to it. An open side (no edge, or
    an edge off the scale) runs to the plot's edge. */
function bandBox(low: number | undefined, high: number | undefined, d0: number, d1: number, y: (v: number) => number, top: number, bottom: number) {
  if (low === undefined && high === undefined) return null
  if ((high !== undefined && high < d0) || (low !== undefined && low > d1)) return null
  const openTop = high === undefined || high > d1
  const openBottom = low === undefined || low < d0
  return { top: openTop ? top : y(high!), bottom: openBottom ? bottom : y(low!), openTop, openBottom }
}

/* ------------------------------------------------------------ geometry -- */

/** Positions on a time scale between x0 and x1; one point sits in the
    middle. A minimum gap nudges crowded dots apart, keeping their order and
    the ends in place, so close results stay readable without lying about
    time. Times must be oldest first. */
export function timeScale(times: number[], x0: number, x1: number, minGap = 0): number[] {
  if (!times.length) return []
  const a = Math.min(...times)
  const b = Math.max(...times)
  const xs = times.map((t) => (a === b ? (x0 + x1) / 2 : x0 + ((t - a) / (b - a)) * (x1 - x0)))
  if (minGap <= 0 || xs.length < 2) return xs
  if ((xs.length - 1) * minGap > x1 - x0) return xs.map((_, i) => x0 + (i / (xs.length - 1)) * (x1 - x0))
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + minGap)
  xs[xs.length - 1] = Math.min(xs[xs.length - 1], Math.max(x1, xs[0] + minGap))
  for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - minGap)
  return xs
}

type XY = [number, number]

const line = (xy: XY[]) => xy.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")

const lengthOf = (xy: XY[]) => xy.slice(1).reduce((s, [x, y], i) => s + Math.hypot(x - xy[i][0], y - xy[i][1]), 0)

/** How far along a polyline each point sits, 0 to 1. */
const fractions = (xy: XY[]) => {
  const total = lengthOf(xy) || 1
  let run = 0
  return xy.map(([x, y], i) => {
    if (i) run += Math.hypot(x - xy[i - 1][0], y - xy[i - 1][1])
    return run / total
  })
}

/** A smooth line through the points that never overshoots one (Fritsch and
    Carlson), for dense plan series such as a weight trend. Sparse lab
    results never use it. */
export function monotone(xy: XY[]): string {
  const n = xy.length
  if (n < 3) return line(xy)
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = xy[i + 1][0] - xy[i][0]
    d.push(dx ? (xy[i + 1][1] - xy[i][1]) / dx : 0)
  }
  const m: number[] = [d[0]]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m.push(0)
      continue
    }
    const h0 = xy[i][0] - xy[i - 1][0]
    const h1 = xy[i + 1][0] - xy[i][0]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]))
  }
  m.push(d[n - 2])
  let path = `M ${xy[0][0].toFixed(1)} ${xy[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = xy[i]
    const [bx, by] = xy[i + 1]
    const h = (bx - ax) / 3
    path += ` C ${(ax + h).toFixed(1)} ${(ay + m[i] * h).toFixed(1)} ${(bx - h).toFixed(1)} ${(by - m[i + 1] * h).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
  }
  return path
}

/** A bar track segment: round at the bar's outer ends, square where it meets
    a neighbour, 1 pt short of it so neighbours sit 2 pt apart. */
function segment(x0: number, x1: number, y: number, h: number, roundLeft: boolean, roundRight: boolean) {
  const a = roundLeft ? x0 : x0 + 1
  const b = roundRight ? x1 : x1 - 1
  if (b - a < 1) return ""
  const r = Math.min(h / 2, (b - a) / 2)
  const rl = roundLeft ? r : 0
  const rr = roundRight ? r : 0
  const right = rr ? `A ${rr} ${rr} 0 0 1 ${(b - rr).toFixed(2)} ${y + h}` : `L ${b.toFixed(2)} ${y + h}`
  const left = rl ? `A ${rl} ${rl} 0 0 1 ${(a + rl).toFixed(2)} ${y}` : `L ${a.toFixed(2)} ${y}`
  return `M ${(a + rl).toFixed(2)} ${y} L ${(b - rr).toFixed(2)} ${y} ${right} L ${(a + rl).toFixed(2)} ${y + h} ${left} Z`
}

/** A point on a dial: degrees from 12 o'clock, clockwise. */
function polar(cx: number, cy: number, r: number, deg: number): XY {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/* -------------------------------------------------------------- motion -- */

const easeOut = Easing.out(Easing.cubic)

/** Entrances already played this session, by key, so a chart seen once does
    not draw itself again when the patient comes back to it. */
const PLAYED = new Set<string>()

/** Reduce Motion as last reported, so a chart that mounts later starts on
    its final frame straight away. */
let stillKnown = false

/* A review page can show every chart as Reduce Motion would draw it. */
const StillContext = React.createContext(false)

/** Draws every chart under it at its final frame, as Reduce Motion does:
    /demo/kit's "Reduce motion" switch. Never used on a product screen. */
export function StillPreview({ still, children }: { still: boolean; children: React.ReactNode }) {
  return <StillContext.Provider value={still}>{children}</StillContext.Provider>
}

/** Whether the device asks for reduced motion. */
export function useStill() {
  const forced = React.useContext(StillContext)
  const [still, setStill] = React.useState(stillKnown)
  React.useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        stillKnown = on
        if (live) setStill(on)
      })
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => {
      stillKnown = on
      setStill(on)
    })
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return forced || still
}

type Motion = { t: Animated.Value; done: boolean }

/** A chart's entrance: `t` runs from 0 to 1 over `duration` ms, once. Reduce
    Motion, or a `playKey` already played this session, starts it at the end.
    `done` turns true once it lands, so the final frame drops its animation
    props and nothing is left half drawn. */
function useMotion(
  duration: number,
  { delay = 0, playKey, easing = Easing.linear }: { delay?: number; playKey?: string; easing?: (v: number) => number } = {}
): Motion {
  const still = useStill()
  const skip = still || (playKey !== undefined && PLAYED.has(playKey))
  const [t] = React.useState(() => new Animated.Value(skip ? 1 : 0))
  const [done, setDone] = React.useState(skip)
  React.useEffect(() => {
    if (skip) {
      t.stopAnimation()
      t.setValue(1)
      setDone(true)
      return
    }
    // Linear by default: each part of a chart eases its own stretch.
    const run = Animated.timing(t, { toValue: 1, duration, delay, easing, useNativeDriver: false })
    run.start(({ finished }) => {
      if (!finished) return
      if (playKey) PLAYED.add(playKey)
      setDone(true)
    })
    return () => run.stop()
    // Plays once: a later change of timing does not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])
  return { t, done }
}

/** The entrance on its own, for a piece outside the kit: 0 to 1, eased out,
    once per `playKey` a session, at the end under Reduce Motion. */
export function useEntrance(playKey?: string, o: { delay?: number; duration?: number } = {}) {
  return useMotion(o.duration ?? 600, { delay: o.delay, playKey, easing: easeOut }).t
}

type Anim = number | Animated.AnimatedInterpolation<number | string>

/** One part of an entrance: `from` to `to` while `t` runs from `a` to `b`
    (fractions of the whole), or just `to` once it has landed. */
function phase(m: Motion, a: number, b: number, from: number, to: number, easing?: (v: number) => number): Anim {
  if (m.done) return to
  return m.t.interpolate({ inputRange: [a, b > a ? b : a + 1e-6], outputRange: [from, to], extrapolate: "clamp", easing })
}

/** The same through several steps, e.g. a pop past full size and back. */
function steps(m: Motion, at: number[], values: number[]): Anim {
  if (m.done) return values[values.length - 1]
  const inputs = at.map((v, i) => (i && v <= at[i - 1] ? at[i - 1] + 1e-6 * i : v))
  return m.t.interpolate({ inputRange: inputs, outputRange: values, extrapolate: "clamp" })
}

/** A number in step with an entrance, for achievement numbers only. A
    screen reader always hears the final value. */
function Counter({
  motion,
  value,
  format,
  until = 1,
  style,
}: {
  motion: Motion
  value: number
  format: (v: number) => string
  until?: number
  style?: StyleProp<TextStyle>
}) {
  const [shown, setShown] = React.useState(motion.done ? value : 0)
  React.useEffect(() => {
    if (motion.done) {
      setShown(value)
      return
    }
    const id = motion.t.addListener(({ value: p }) => setShown(value * easeOut(Math.min(1, p / until))))
    return () => motion.t.removeListener(id)
  }, [motion.t, motion.done, value, until])
  return (
    <Text style={style} accessibilityLabel={format(value)}>
      {format(motion.done ? value : shown)}
    </Text>
  )
}

/** A number that counts up as it appears: achievement numbers only (a daily
    score, pounds lost, steps), never a lab value. */
export function CountUp({
  value,
  format = (v) => formatNumber(Math.round(v)),
  duration = 600,
  delay = 0,
  playKey,
  style,
}: {
  value: number
  format?: (v: number) => string
  duration?: number
  delay?: number
  playKey?: string
  style?: StyleProp<TextStyle>
}) {
  const motion = useMotion(duration, { delay, playKey })
  return <Counter motion={motion} value={value} format={format} style={style} />
}

const APath = Animated.createAnimatedComponent(Path)
const ACircle = Animated.createAnimatedComponent(Circle)
const ARect = Animated.createAnimatedComponent(Rect)
const AG = Animated.createAnimatedComponent(G)

/* ---------------------------------------------------------- interaction -- */

/** Measures its own width, so a chart fills the column it is given. Starts
    at the phone's chart width so the first frame is already close. */
function useWidth(initial = 313) {
  const [width, setWidth] = React.useState(initial)
  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width)
    if (w > 0) setWidth(w)
  }, [])
  return { width, onLayout }
}

/** An id for SVG defs, unique on the page (the web shares one document). */
function useSvgId(prefix: string) {
  return `${prefix}${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
}

/** The whole plot as one touch target: a tap or a drag picks the result
    nearest the finger by x. A mostly vertical drag is left to the page's
    scroll. */
export function useScrub(xs: number[], onSelect: (index: number) => void): GestureResponderHandlers {
  const latest = React.useRef({ xs, onSelect })
  React.useEffect(() => {
    latest.current = { xs, onSelect }
  })
  const [responder] = React.useState(() => {
    const pick = (x: number) => {
      const { xs: at, onSelect: select } = latest.current
      if (!at.length) return
      let best = 0
      for (let i = 1; i < at.length; i++) if (Math.abs(at[i] - x) < Math.abs(at[best] - x)) best = i
      select(best)
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderTerminationRequest: () => true,
    })
  })
  return responder.panHandlers
}

const ADJUST = [{ name: "increment" }, { name: "decrement" }]

/** Swipe up or down on a selected chart to move between results. */
const onAdjust = (sel: number, n: number, select: (i: number) => void) => (e: AccessibilityActionEvent) => {
  const step = e.nativeEvent.actionName === "increment" ? 1 : e.nativeEvent.actionName === "decrement" ? -1 : 0
  if (step) select(clampIndex(sel + step, n))
}

/* -------------------------------------------------------------- pieces -- */

/** The status shape beside its word: a filled dot for in range or out of
    range, a ring for borderline. */
export function StatusMark({ status, size = 8 }: { status: Standing; size?: number }) {
  const ring = status === "borderline"
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring ? Math.max(1.5, size * 0.22) : 0,
        borderColor: TONE.borderline,
        backgroundColor: ring ? "transparent" : TONE[status],
      }}
    />
  )
}

/** A status as a shape and a word: "Out of range". */
export function StatusLabel({ status, children, style }: { status: Standing; children?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.status, style]}>
      <StatusMark status={status} />
      <Text style={styles.statusText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {children ?? STATUS_WORD[status]}
      </Text>
    </View>
  )
}

/** An arrow for a direction, in neutral grey: up and to the right, down and
    to the right, or level. */
export function TrendArrow({ trend, size = 12, tone = ink.detail }: { trend: Trend; size?: number; tone?: string }) {
  const d =
    trend === "up" ? "M3.5 8.5 L8.5 3.5 M4.5 3.5 H8.5 V7.5" : trend === "down" ? "M3.5 3.5 L8.5 8.5 M8.5 4.5 V8.5 H4.5" : "M2.5 6 H9.5 M6.5 3 L9.5 6 L6.5 9"
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d={d} stroke={tone} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

/** Words first: a chart's point in one line, above the plot. */
function Takeaway({ children }: { children?: string }) {
  if (!children) return null
  return <Text style={styles.takeaway}>{children}</Text>
}

/** The readout above a plot: what is selected, so nothing covers the data.
    "Latest" returns to the newest result. */
function Readout({
  meta,
  value,
  unit,
  status,
  dim = false,
  trailing,
  onLatest,
}: {
  meta: string
  value: string
  unit?: string
  status?: Standing
  /** "No reading": the value in grey. */
  dim?: boolean
  trailing?: string
  onLatest?: () => void
}) {
  return (
    <View style={styles.readout}>
      <View style={styles.readoutBody}>
        {/* Two lines at most, never cut: a home kit's date, source and
            method run long on a small phone. */}
        <Text style={styles.readoutMeta} numberOfLines={2}>
          {meta}
        </Text>
        <View style={styles.readoutLine}>
          <Text style={[styles.readoutValue, dim && styles.readoutDim]} numberOfLines={1}>
            {value}
            {!!unit && !dim && <Text style={styles.readoutUnit}>{`${unit === "%" ? "" : " "}${unit}`}</Text>}
          </Text>
          {status && <StatusLabel status={status} />}
        </View>
      </View>
      {onLatest ? (
        <Pressable
          onPress={onLatest}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Show the latest"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.latest}>Latest</Text>
        </Pressable>
      ) : trailing ? (
        <Text style={styles.readoutTrailing} numberOfLines={1}>
          {trailing}
        </Text>
      ) : null}
    </View>
  )
}

type GlyphKind = "dot" | "ring" | "hollow" | "band" | "zone" | "line" | "dash" | "goal" | "pale" | "square"

/** A legend key, drawn with the mark it explains. */
function Glyph({ kind, tone = chart.data }: { kind: GlyphKind; tone?: string }) {
  switch (kind) {
    case "dot":
      return <Circle cx={8} cy={6} r={4} fill={tone} />
    case "ring":
      return <Circle cx={8} cy={6} r={3.25} fill={color.background} stroke={tone} strokeWidth={1.75} />
    case "hollow":
      return <Circle cx={8} cy={6} r={3.5} fill={color.background} stroke={chart.other} strokeWidth={1.5} />
    case "band":
      return <Rect x={1} y={1.5} width={14} height={9} rx={2.5} fill={chart.band} stroke={chart.bandEdge} strokeWidth={1} />
    case "zone":
      return <Rect x={1} y={2.5} width={14} height={7} rx={3.5} fill={chart.targetZone} />
    case "line":
      return <Line x1={2} x2={14} y1={6} y2={6} stroke={tone} strokeWidth={2.5} strokeLinecap="round" />
    case "dash":
      return <Line x1={1} x2={15} y1={6} y2={6} stroke={chart.data} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="4 3" />
    case "goal":
      return <Line x1={1} x2={15} y1={6} y2={6} stroke={chart.goal} strokeWidth={1.25} />
    case "pale":
      return <Circle cx={8} cy={6} r={2.75} fill={chart.data} fillOpacity={0.35} />
    case "square":
      return <Rect x={4} y={2} width={8} height={8} rx={2} fill={tone} />
  }
}

type LegendItem = { kind: GlyphKind; tone?: string; label: string }

/** What each mark means, under the plot. Read by sight; the spoken summary
    carries the same for a screen reader. */
function Legend({ items }: { items: LegendItem[] }) {
  if (!items.length) return null
  return (
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <Svg width={16} height={12}>
            <Glyph kind={item.kind} tone={item.tone} />
          </Svg>
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

const Note = ({ children }: { children?: string }) => (children ? <Text style={styles.note}>{children}</Text> : null)

/** No results: no plot at all, one line on a quiet ground. */
function EmptyChart({ title, line: second, height = 112 }: { title: string; line?: string; height?: number }) {
  return (
    <View style={[styles.empty, { minHeight: height }]}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!second && <Text style={styles.emptyLine}>{second}</Text>}
    </View>
  )
}

type Weight = "regular" | "medium" | "semibold"
const FACE: Record<Weight, string> = { regular: font.regular, medium: font.medium, semibold: font.semibold }

/** Text inside a plot: Frontline's chart labels (type.axis, 12 pt in the
    secondary grey); a value or the latest date takes a stronger weight and
    ink. With a halo it stays legible over lines and bands. */
function Label({
  x,
  y,
  children,
  anchor = "start",
  weight = "regular",
  tone = type.axis.color,
  size = type.axis.fontSize,
  halo = false,
}: {
  x: number
  y: number
  children: string
  anchor?: "start" | "middle" | "end"
  weight?: Weight
  tone?: string
  size?: number
  halo?: boolean
}) {
  return (
    <>
      {halo && (
        <SvgText
          x={x}
          y={y}
          fontSize={size}
          fontFamily={FACE[weight]}
          textAnchor={anchor}
          fill={color.background}
          stroke={color.background}
          strokeWidth={3.5}
          strokeLinejoin="round"
        >
          {children}
        </SvgText>
      )}
      <SvgText x={x} y={y} fontSize={size} fontFamily={FACE[weight]} textAnchor={anchor} fill={tone}>
        {children}
      </SvgText>
    </>
  )
}

/** The dates under a plot that scrubs: the first and the latest, and the
    picked result's own date under its rule, kept inside the chart's width
    so it is never cut. The first and the latest give way to it, and the
    date of the result shown is the one in the strong ink. One result: its
    date, centred under it. */
function AxisDates({ xs, sel, dates, width, y }: { xs: number[]; sel: number; dates: string[]; width: number; y: number }) {
  const latest = xs.length - 1
  if (latest < 0) return null
  if (latest === 0)
    return (
      <Label x={xs[0]} y={y} anchor="middle" weight="medium" tone={ink.strong}>
        {dates[0]}
      </Label>
    )
  const strong = (on: boolean) => (on ? { weight: "medium" as const, tone: ink.strong } : {})
  const first = spotAt(xs[0], y, dates[0], "start")
  const last = spotAt(xs[latest], y, dates[latest], "end")
  const pickedText = sel > 0 && sel < latest ? dates[sel] : ""
  const half = textWidth(pickedText) / 2
  const picked = pickedText ? spotAt(clamp(xs[sel], half, width - half), y, pickedText, "middle") : undefined
  return (
    <>
      {apart(first.box, last.box) && (!picked || apart(first.box, picked.box)) && (
        <Label x={first.x} y={y} anchor="start" {...strong(sel === 0)}>
          {dates[0]}
        </Label>
      )}
      {picked && (
        <Label x={picked.x} y={y} anchor="middle" {...strong(true)}>
          {pickedText}
        </Label>
      )}
      {(!picked || apart(last.box, picked.box)) && (
        <Label x={last.x} y={y} anchor="end" {...strong(sel === latest)}>
          {dates[latest]}
        </Label>
      )}
    </>
  )
}

/** The range behind a plot. An open side runs to the plot's edge and fades
    over its last quarter, saying the range goes on; a closed side gets a
    1 pt edge. */
function Band({
  id,
  x,
  width,
  top,
  bottom,
  openTop,
  openBottom,
  edges = true,
  radius = 0,
}: {
  id: string
  x: number
  width: number
  top: number
  bottom: number
  openTop: boolean
  openBottom: boolean
  edges?: boolean
  radius?: number
}) {
  const h = bottom - top
  if (h <= 0.5) return null
  const fades = openTop || openBottom
  return (
    <>
      {fades && (
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chart.band} stopOpacity={openTop ? 0 : 1} />
            <Stop offset={openTop ? "0.3" : "0"} stopColor={chart.band} stopOpacity={1} />
            <Stop offset={openBottom ? "0.7" : "1"} stopColor={chart.band} stopOpacity={1} />
            <Stop offset="1" stopColor={chart.band} stopOpacity={openBottom ? 0 : 1} />
          </LinearGradient>
        </Defs>
      )}
      <Rect x={x} y={top} width={width} height={h} rx={radius} fill={fades ? `url(#${id})` : chart.band} />
      {edges && !openTop && <Line x1={x} x2={x + width} y1={top} y2={top} stroke={chart.bandEdge} strokeWidth={1} />}
      {edges && !openBottom && <Line x1={x} x2={x + width} y1={bottom} y2={bottom} stroke={chart.bandEdge} strokeWidth={1} />}
    </>
  )
}

type DotKind = Standing | "plain" | "other"

/** The selected result: a ring in its colour around its own mark, with a
    white gap between, so the pick reads at a glance and the legend still
    reads the same for the mark inside: filled in range and out of range, a
    ring when borderline, hollow grey when measured another way. The white
    disc under it keeps lines and bands from showing through the gap. */
function SelectedMark({ x, y, tone, kind, opacity }: { x: number; y: number; tone: string; kind: DotKind; opacity: Anim }) {
  return (
    <AG opacity={opacity}>
      <Circle cx={x} cy={y} r={11} fill={color.background} />
      <Circle cx={x} cy={y} r={9.25} fill={color.background} stroke={tone} strokeWidth={2} />
      {kind === "borderline" ? (
        <Circle cx={x} cy={y} r={4.25} fill={color.background} stroke={tone} strokeWidth={2.25} />
      ) : kind === "other" ? (
        <Circle cx={x} cy={y} r={4.25} fill={color.background} stroke={chart.other} strokeWidth={1.5} />
      ) : (
        <Circle cx={x} cy={y} r={5} fill={tone} />
      )}
    </AG>
  )
}

/* ---------------------------------------------------------- dot graph -- */

export type DotGraphProps = SeriesInput & {
  /** Fills its container when left out. */
  width?: number
  height?: number
  /** How many of the latest comparable results to show. */
  max?: number
  delay?: number
  playKey?: string
  /** Inside something that already says it all, such as a trend tile:
      left out for a screen reader. On its own (the assistant's context
      card) it reads its results, their dates and the range. */
  hidden?: boolean
}

/** The tile's graph: a dot for each of the latest comparable results, to
    scale in time, over the range strip, with a faint join so the movement
    reads. Earlier dots stay quiet whatever their status; only the latest
    carries a colour, with a halo. No axes, labels or grid. */
export function DotGraph(props: DotGraphProps) {
  const { height = 40, max = 5, delay = 0, playKey, hidden = false } = props
  const s = seriesFrom(props)
  const measured = useWidth(props.width ?? 138)
  const W = props.width ?? measured.width
  const pts = sortByTime(s.readings.filter((r) => !r.other)).slice(-max)
  const n = pts.length
  const D = 520
  const motion = useMotion(D, { delay, playKey })
  const gid = useSvgId("dots")
  const onLayout = props.width === undefined ? measured.onLayout : undefined
  if (!n) return <View style={{ height }} onLayout={onLayout} />

  const last = pts[n - 1]
  const status = s.status ?? last.status ?? statusOf(last.value, s.low, s.high)
  const xs = timeScale(timesOf(pts), 6, W - 10, 10)
  const [d0, d1] = valueDomain(
    pts.map((p) => p.value),
    s.low,
    s.high
  )
  const y = (v: number) => 9 + (1 - (v - d0) / (d1 - d0)) * (height - 18)
  const xy = pts.map((p, i): XY => [xs[i], y(p.value)])
  const band = bandBox(s.low, s.high, d0, d1, y, 0, height)
  const length = lengthOf(xy)
  const reach = fractions(xy).map((f) => (300 * f) / D)
  const pop = [300 / D, 410 / D, 1]
  const k = (size: number) => steps(motion, pop, [size * 0.6, size * 1.15, size])
  const visible = phase(motion, 300 / D, 340 / D, 0, 1)
  const [lx, ly] = xy[n - 1]
  const tone = DOT[status]
  // What the dots show, in words: each result with its date, oldest first,
  // the latest's standing and the range.
  const summary = [
    `${s.name}, ${n === 1 ? "one result" : `the last ${n} results`}: ${pts.map((p) => `${withSpokenUnit(p.shown ?? formatNumber(p.value), s.unit)}, ${spokenWhen(p.date)}`).join("; ")}.`,
    `Latest ${lowerFirst(STATUS_WORD[status])}.`,
    rangeSpoken(s.low, s.high, s.unit, s.range) && `${rangeSpoken(s.low, s.high, s.unit, s.range)}.`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      pointerEvents="none"
      accessible={!hidden}
      accessibilityRole={hidden ? undefined : "image"}
      accessibilityLabel={hidden ? undefined : summary}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "yes"}
    >
      <Svg width={W} height={height}>
        {band && (
          <Band id={gid} x={0} width={W} top={band.top} bottom={band.bottom} openTop={band.openTop} openBottom={band.openBottom} edges={false} radius={4} />
        )}
        <Defs>
          <LinearGradient id={`${gid}-j`} gradientUnits="userSpaceOnUse" x1={xs[0]} y1="0" x2={xs[n - 1] + 0.01} y2="0">
            {pts.map((p, i) => (
              <Stop
                key={i}
                offset={n > 1 ? (xs[i] - xs[0]) / Math.max(xs[n - 1] - xs[0], 1) : 0}
                stopColor={DOT[p.status ?? statusOf(p.value, s.low, s.high)]}
              />
            ))}
          </LinearGradient>
        </Defs>
        {n > 1 && (
          <APath
            d={line(xy)}
            stroke={`url(#${gid}-j)`}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={motion.done ? undefined : `${length} ${length}`}
            strokeDashoffset={motion.done ? undefined : phase(motion, 0, 300 / D, length, 0, easeOut)}
          />
        )}
        {xy.slice(0, -1).map(([x, yy], i) => (
          <AG key={i} opacity={phase(motion, reach[i], reach[i] + 120 / D, 0, 1)}>
            <Circle cx={x} cy={yy} r={4.5} fill={color.background} />
            <Circle
              cx={x}
              cy={yy}
              r={3}
              fill={color.background}
              stroke={DOT[pts[i].status ?? statusOf(pts[i].value, s.low, s.high)]}
              strokeWidth={1.8}
            />
          </AG>
        ))}
        <ACircle cx={lx} cy={ly} r={8.5} fill={tone} opacity={steps(motion, pop, [0, 0.3, 0.14])} />
        <ACircle cx={lx} cy={ly} r={k(6.5)} fill={color.background} opacity={visible} />
        {status === "borderline" ? (
          <ACircle cx={lx} cy={ly} r={k(4)} fill={color.background} stroke={tone} strokeWidth={2} opacity={visible} />
        ) : (
          <ACircle cx={lx} cy={ly} r={k(4.5)} fill={tone} opacity={visible} />
        )}
      </Svg>
    </View>
  )
}

/* --------------------------------------------------------- trend tile -- */

export type TrendTileProps = SeriesInput & {
  /** The status word; "Out of range", "Borderline" or "In range" by default. */
  label?: string
  /** The direction in words under the value: lib/trends.ts directionWords(t),
      "Trending up", "Trending up, improving", "Steady", "One result so far".
      Worked out from the shown results when left out. */
  direction?: string
  /** The latest value as shown; the latest reading's by default. */
  value?: string
  onPress?: () => void
  /** Spans the row: the only tile, or an odd last one. */
  wide?: boolean
  /** Its place in the grid: entrances follow 60 ms apart. */
  index?: number
  playKey?: string
  style?: StyleProp<ViewStyle>
  /** The screen reader sentence, when the screen has the pre-built one
      (lib/trends.ts `spoken`: "Hemoglobin A1c, 5.9 percent, out of range,
      trending up across 5 results since April 2022."); the tile builds a
      shorter one when left out. */
  spoken?: string
}

/** The direction words when the screen gives none: the fact, never what it
    means (lib/trends.ts knows when a movement is an improvement). */
const directionFallback = (trend: Trend | undefined, count: number) =>
  count < 2 ? "One result so far" : trend ? TREND_WORD[trend] : "Not enough results yet"

/** The direction line as a tile shows it, on one line from a 375 pt phone
    down to 320: "Trending up, improving" and "Trending down, improving" run
    wider than a tile, so an improving marker reads "Improving" beside its
    arrow, which carries the direction. The tile's spoken label keeps every
    word. */
const tileDirection = (words: string) => (/,\s*improving$/i.test(words) ? "Improving" : words)

/** The free home's trend tile (Ed, 30 Sep: "little squares", a dot every
    time a test was taken): the status as a shape and a word, the marker's
    name, the latest value, the direction in words beside a neutral arrow
    ("Trending up"; "Improving" for "Trending up, improving", one line on
    every phone), and the dot graph of the last five
    comparable results over the range, on the tile's bottom edge. The whole
    tile opens the marker. 172 tall at least, taller with larger text; in a
    grid row both tiles take the taller one's height, values and graphs
    lined up. */
export function TrendTile(props: TrendTileProps) {
  const { onPress, wide = false, index = 0, playKey, style } = props
  const s = seriesFrom(props)
  const same = sortByTime(s.readings.filter((r) => !r.other))
  const shown = same.slice(-5)
  const last = same[same.length - 1]
  const status = s.status ?? last?.status ?? (last ? statusOf(last.value, s.low, s.high) : "in")
  const trend = s.trend ?? trendOf(shown)
  const word = props.label ?? STATUS_WORD[status]
  const value = props.value ?? (last ? (last.shown ?? formatNumber(last.value)) : "No results")
  const direction = props.direction ?? directionFallback(trend, same.length)
  // The arrow goes with a movement only: none for one result.
  const arrow: Trend | undefined = same.length > 1 ? (trend ?? undefined) : undefined
  // The screen's pre-built sentence when it has one, with the meaning the
  // tile shows added where the sentence leaves it out ("trending up,
  // improving, across 4 results"); else the tile's own words.
  const told =
    props.spoken && /improving/i.test(direction) && !/improving/i.test(props.spoken)
      ? props.spoken.replace(/\b(trending (?:up|down))\b/i, "$1, improving,")
      : props.spoken
  const summary =
    told ?? [s.name, last ? withSpokenUnit(value, s.unit) : "no results yet", lowerFirst(word), last ? lowerFirst(direction) : undefined].filter(Boolean).join(", ")

  const graph = <DotGraph {...s} readings={same} status={status} height={wide ? 64 : 40} delay={index * 60} playKey={playKey} hidden />
  const words = (
    <>
      <StatusLabel status={status}>{word}</StatusLabel>
      <Text style={styles.tileName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {s.name}
      </Text>
      <Text style={styles.tileValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {value}
        {!!s.unit && !!last && <Text style={styles.tileUnit}>{`${s.unit === "%" ? "" : " "}${s.unit}`}</Text>}
      </Text>
      {!!last && (
        <View style={styles.tileDirection}>
          {arrow && (
            <View style={styles.tileArrow}>
              <TrendArrow trend={arrow} size={12} />
            </View>
          )}
          <Text style={styles.tileDirectionText} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {tileDirection(direction)}
          </Text>
        </View>
      )}
    </>
  )

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={summary}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, pressed && styles.tilePressed, style]}
    >
      {wide ? (
        <>
          <View style={styles.tileTextWide}>{words}</View>
          <View style={styles.tileGraphWide}>{graph}</View>
        </>
      ) : (
        <>
          <View>{words}</View>
          {/* The graph sits on the tile's bottom edge, so graphs line up
              across a row whatever the words above them take. */}
          <View style={styles.tileGraph}>{graph}</View>
        </>
      )}
    </Pressable>
  )
}

/* ------------------------------------------------------ marker trend -- */

export type BiomarkerTrendProps = SeriesInput & {
  /** The plot's height, its date labels included. */
  height?: number
  /** The selected result, an index into the readings oldest first; the
      latest by default. */
  selected?: number
  onSelect?: (index: number) => void
  /** Words first: the chart's point, above everything else. */
  takeaway?: string
  /** The selection line above the plot. Leave it on unless the card shows
      its own, fed by onSelect. */
  readout?: boolean
  legend?: boolean
  /** New results on the way: the previous render stays, dimmed. */
  loading?: boolean
  /** The plot's spoken summary, when the screen has the pre-built sentence
      (lib/trends.ts `spoken`); the chart builds its own when left out. */
  spoken?: string
  playKey?: string
}

/** A marker's results over the years, for its own page, as the Figma "Hol"
    marker page draws it (5 Oct 2026, "Over time"): the readout above (the
    selected result's day and source over its value), then a plot to scale
    in time with the patient's range as the pale green zone under a
    hairline, a soft curve through the comparable results (Primary/03 over
    a teal wash fading to nothing), the selected result as a ringed mark in
    its status colour with a small white label beside it, and the first and
    latest dates under the plot. Results measured another way are hollow
    rings, never joined. The whole plot is the touch target and snaps to
    the nearest result; the readout and the label follow it. */
export function BiomarkerTrend(props: BiomarkerTrendProps) {
  const { height = 120, takeaway, readout = true, legend = true, loading = false, playKey } = props
  const s = seriesFrom(props)
  const readings = sortByTime(s.readings)
  const n = readings.length
  const latest = n - 1
  const banded = s.low !== undefined || s.high !== undefined
  const standing = (r: Reading): Standing | undefined => r.status ?? (banded ? statusOf(r.value, s.low, s.high) : undefined)
  const [own, setOwn] = React.useState(latest)
  // Every result carries its value on the plot; the label beside the mark
  // appears only once a result has been picked.
  const [picked, setPicked] = React.useState(false)
  // A new result moves the selection to it.
  React.useEffect(() => {
    setOwn(latest)
    setPicked(false)
  }, [latest])
  const sel = clampIndex(props.selected ?? own, n)
  const select = (i: number) => {
    setOwn(i)
    setPicked(true)
    if (i !== sel) props.onSelect?.(i)
  }
  const { width: W, onLayout } = useWidth(329)
  const motion = useMotion(700, { playKey })
  const gid = useSvgId("wash")
  const lid = useSvgId("line")
  const mid = useSvgId("mask")

  // The selected mark's ring reaches 10 from its centre: it stays inside
  // the plot at the top and the right.
  const H = height
  const yTop = 14
  const yBottom = H - 6
  const [d0, d1] = n
    ? valueDomain(
        readings.map((r) => r.value),
        s.low,
        s.high
      )
    : [0, 1]
  const y = (v: number) => yTop + (1 - (v - d0) / (d1 - d0)) * (yBottom - yTop)
  const xs = n ? timeScale(timesOf(readings), 4, W - 12, 12) : []
  const scrub = useScrub(xs, select)

  if (!n)
    return (
      <View style={[styles.frame, loading && styles.loading]}>
        <Takeaway>{takeaway}</Takeaway>
        <EmptyChart title="No results yet" />
      </View>
    )

  const xy = readings.map((r, i): XY => [xs[i], y(r.value)])
  const joined = readings.map((_, i) => i).filter((i) => !readings[i].other)
  const joinedXY = joined.map((i) => xy[i])
  const drawn = joined.length > 1
  const curve = drawn ? monotone(joinedXY) : ""
  const wash = drawn ? `${curve} L ${joinedXY[joinedXY.length - 1][0].toFixed(1)} ${H} L ${joinedXY[0][0].toFixed(1)} ${H} Z` : ""

  // The colour of a result's mark, from where its value sits against the
  // range: the same scale the line and the fill under it are painted with.
  const tintOf = (v: number) => tintAt(v, s.low, s.high)

  // The orange and red stretches also get a pale full-height backdrop in
  // their colour, with a dashed divider where the colour changes, halfway
  // between the two results. The green stretch has none: only the fill under
  // the line. The last zone reaches the plot's right edge.
  const zoneOf = (v: number): Standing => {
    const sev = severityAt(v, s.low, s.high)
    return sev >= 1.5 ? "out" : sev >= 0.5 ? "borderline" : "in"
  }
  const zones: { from: number; to: number; status: Standing }[] = []
  if (drawn && banded) {
    joined.forEach((i, k) => {
      const status = zoneOf(readings[i].value)
      const prev = zones[zones.length - 1]
      if (prev && prev.status === status) return
      const cut = k === 0 ? 0 : (xy[joined[k - 1]][0] + xy[i][0]) / 2
      if (prev) prev.to = cut
      zones.push({ from: cut, to: W, status })
    })
  }

  const r = readings[sel]
  const st = standing(r)
  // The selected mark takes its place on the colour scale.
  const tone = r.other ? chart.other : banded ? tintOf(r.value) : chart.data
  const shownValue = r.shown ?? formatNumber(r.value)
  const meta = [sel === latest ? "Latest" : undefined, showWhen(r.date), r.source, r.other ? r.method : undefined].filter(Boolean).join(", ")

  // The label sits left of the mark, its pointer on the mark's middle; with
  // no room on the left it turns to the right.
  const tipW = 100
  const [mx, my] = xy[sel]
  const tipLeft = mx - 13 - 6 - tipW >= 0
  const tipX = tipLeft ? mx - 13 - 6 - tipW : mx + 13 + 6
  const tipY = clamp(my - 21, -8, H - 42)

  // Each result's value sits over its mark; a mark too close to the last
  // label's turns its value under the mark, and near the top it goes under.
  let lastX = -Infinity
  let lastUnder = true
  const valueSpots = readings.map((reading, i) => {
    const x = xy[i][0]
    const close = x - lastX < 26
    const under = xy[i][1] < 26 || (close && !lastUnder)
    lastX = x
    lastUnder = under
    return { x: clamp(x, 12, W - 12), y: under ? xy[i][1] + 17 : xy[i][1] - 9, text: reading.shown ?? formatNumber(reading.value) }
  })

  const trend = s.trend ?? trendOf(readings)
  const latestStatus = s.status ?? standing(readings[latest])
  const others = readings.filter((x) => x.other).length
  // What the plot shows, in its own words: the dates, the latest value and
  // its standing, the direction, the range, and results measured another way.
  const summary = [
    n === 1
      ? `${s.name}, one result, ${spokenWhen(r.date)}: ${withSpokenUnit(shownValue, s.unit)}${latestStatus ? `, ${lowerFirst(STATUS_WORD[latestStatus])}` : ""}.`
      : `${s.name}, ${n} results from ${spokenWhen(readings[0].date)} to ${spokenWhen(readings[latest].date)}. Latest ${withSpokenUnit(readings[latest].shown ?? formatNumber(readings[latest].value), s.unit)}${latestStatus ? `, ${lowerFirst(STATUS_WORD[latestStatus])}` : ""}${trend && drawn ? `, ${lowerFirst(TREND_WORD[trend])}` : ""}.`,
    rangeSpoken(s.low, s.high, s.unit, s.range) && `${rangeSpoken(s.low, s.high, s.unit, s.range)}.`,
    others ? `${others === 1 ? "One result" : `${others} results`} measured another way, not joined to the line.` : "",
  ]
    .filter(Boolean)
    .join(" ")
  const valueText = `${spokenWhen(r.date)}, ${withSpokenUnit(shownValue, s.unit)}${st ? `, ${lowerFirst(STATUS_WORD[st])}` : ""}${r.source ? `, ${r.source}` : ""}${r.other && r.method ? `, ${lowerFirst(r.method)}` : ""}`

  const note = n === 1 ? "One result so far. A trend needs two from the same test." : !drawn ? OTHER_METHODS : undefined
  const methods = [...new Set(readings.filter((x) => x.other).map((x) => x.method ?? "Another method"))]
  const show = phase(motion, 0, 1, 0, 1, easeOut)

  return (
    <View style={[styles.frame, loading && styles.loading]}>
      <Takeaway>{takeaway}</Takeaway>
      {readout && (
        <View style={styles.trendReadout}>
          <Text style={styles.readoutMeta} numberOfLines={2}>
            {meta}
          </Text>
          <Text style={styles.readoutValue} numberOfLines={1}>
            {shownValue}
            {!!s.unit && <Text style={styles.readoutUnit}>{` ${s.unit}`}</Text>}
          </Text>
        </View>
      )}
      <View style={styles.trendPlotWrap}>
        <View onLayout={onLayout} style={[styles.trendPlot, { height: H }]}>
          <Animated.View style={{ opacity: show }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={W} height={H}>
              <Defs>
                <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={banded ? "#FFFFFF" : color.primaryText} stopOpacity={banded ? 0.38 : 0.16} />
                  <Stop offset="1" stopColor={banded ? "#FFFFFF" : color.primaryText} stopOpacity={0} />
                </LinearGradient>
                {/* With a range the wash fades down through a mask and takes
                    the line's colours across: green, orange, red as the
                    values leave the range, and back the other way. It sits
                    under the line only. */}
                {drawn && banded && (
                  <Mask id={mid} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                    <Path d={wash} fill={`url(#${gid})`} />
                  </Mask>
                )}
                {drawn && banded && (
                  <LinearGradient id={lid} gradientUnits="userSpaceOnUse" x1={joinedXY[0][0]} y1="0" x2={joinedXY[joinedXY.length - 1][0] + 0.01} y2="0">
                    {curveStops(
                      joinedXY,
                      joined.map((i) => readings[i].value),
                      tintOf
                    )}
                  </LinearGradient>
                )}
              </Defs>
              {zones.slice(1).map((z, k) => (
                <Line key={`d${z.from}`} x1={z.from} x2={z.from} y1={0} y2={H} stroke={DOT[z.status === "in" ? zones[k].status : z.status]} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.7} />
              ))}
              {drawn && !banded && <Path d={wash} fill={`url(#${gid})`} />}
              {drawn && banded && <Rect x={0} y={0} width={W} height={H} fill={`url(#${lid})`} mask={`url(#${mid})`} />}
              {drawn && <Path d={curve} stroke={banded ? `url(#${lid})` : color.primaryLine} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              {readings.map((reading, i) =>
                i === sel ? null : reading.other ? (
                  <Circle key={i} cx={xs[i]} cy={xy[i][1]} r={3.5} fill={color.background} stroke={chart.other} strokeWidth={1.5} />
                ) : (
                  <Circle key={i} cx={xs[i]} cy={xy[i][1]} r={3.5} fill={color.background} stroke={banded ? tintOf(reading.value) : color.primaryLine} strokeWidth={1.8} />
                )
              )}
              <Circle cx={mx} cy={my} r={9.1} fill="none" stroke={tone} strokeOpacity={0.2} strokeWidth={2.1} />
              <Circle cx={mx} cy={my} r={4.5} fill={color.background} stroke={tone} strokeWidth={2.1} />
              {valueSpots.map((v, i) => (
                <Label key={`v${i}`} x={v.x} y={v.y} anchor="middle" size={11} weight={i === sel ? "semibold" : "regular"} tone={i === sel ? ink.content : ink.secondary} halo>
                  {v.text}
                </Label>
              ))}
            </Svg>
          </Animated.View>
          {picked && <Animated.View pointerEvents="none" style={[styles.tip, { left: tipX, top: tipY, width: tipW, opacity: show }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.tipLabel} numberOfLines={1}>
              {sel === latest ? "Latest reading" : showWhen(r.date)}
            </Text>
            <Text style={styles.tipValue} numberOfLines={1}>
              {shownValue}
              {!!s.unit && <Text style={styles.tipUnit}>{` ${s.unit}`}</Text>}
            </Text>
            <View style={[styles.tipPointer, tipLeft ? styles.tipPointerRight : styles.tipPointerLeft]} />
          </Animated.View>}
          <View
            style={StyleSheet.absoluteFill}
            {...scrub}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={props.spoken ?? summary}
            aria-valuetext={valueText}
            accessibilityActions={ADJUST}
            onAccessibilityAction={onAdjust(sel, n, select)}
          />
        </View>
        <View style={styles.trendDates}>
          <Text style={type.axis}>{showWhen(readings[0].date)}</Text>
          {n > 1 && <Text style={type.axis}>{showWhen(readings[latest].date)}</Text>}
        </View>
      </View>
      <Note>{note}</Note>
      {legend && methods.length > 0 && <Legend items={methods.map((m) => ({ kind: "hollow" as const, label: `${m}, not joined` }))} />}
    </View>
  )
}

/* ----------------------------------------------------------- range bar -- */

export type RangeBarProps = {
  /** Left out for a marker with no results yet: the track, the range and
      its edge labels, with no marker (C.3). */
  value?: number
  low?: number
  high?: number
  /** The marker's tone; "neutral" is a plan goal's journey, drawn teal.
      Worked out from the range when left out. */
  status?: Standing | "neutral"
  /** Where the value began (the client's "journey"): a hollow start point
      and a line from it to now. */
  start?: number
  unit?: string
  /** The range in words, for the spoken summary: "Below 5.7". */
  range?: string
  /** The word in the coloured zone: "Range", or "Goal" for a plan's goal. */
  zoneLabel?: string
  /** The 6 pt version for result rows: no labels. */
  compact?: boolean
  /** The value over the marker; off when the card's readout shows it. */
  showValue?: boolean
  format?: (v: number) => string
  /** Words first, above the bar. */
  takeaway?: string
  playKey?: string
  style?: StyleProp<ViewStyle>
}

/** Where today's value sits against the range: an 8 pt track in zones with
    2 pt gaps, only the range coloured ("aim here"), the value as a marker
    with a white collar, the range's edges under the track. The marker
    fades in place: sliding would suggest a change over time. With no value
    the bar shows the range alone. */
export function RangeBar({
  value,
  low,
  high,
  status,
  start,
  unit = "",
  range,
  zoneLabel = "Range",
  compact = false,
  showValue = true,
  format,
  takeaway,
  playKey,
  style,
}: RangeBarProps) {
  const { width: W, onLayout } = useWidth(compact ? 104 : 313)
  // Edges share one precision ("0.4" and "4.0"); the value keeps its own.
  const edgeDecimals = Math.max(decimalsOf(low ?? 0), decimalsOf(high ?? 0))
  const show = format ?? ((v: number) => formatNumber(v))
  const showEdge = format ?? ((v: number) => formatNumber(v, edgeDecimals))
  const D = 500
  const motion = useMotion(D, { playKey })
  const H = compact ? 12 : 56
  const th = compact ? 6 : 8
  const cy = compact ? 6 : 28
  const ty = cy - th / 2
  // With no value the scale is set as if one sat in the range's middle.
  const has = value !== undefined
  const at = value ?? (low !== undefined && high !== undefined ? (low + high) / 2 : (low ?? high ?? 0))
  const [d0, d1] = rangeDomain(low, high, at, start)
  const x = (v: number) => 1 + ((v - d0) / (d1 - d0)) * (W - 2)
  const kind = status ?? statusOf(at, low, high)
  const tone = kind === "neutral" ? chart.data : TONE[kind]

  const a = low !== undefined ? x(low) : undefined
  const b = high !== undefined ? x(high) : undefined
  const zones: { from: number; to: number; fill: string }[] = []
  const beyond = kind === "neutral" ? chart.track : kind === "in" ? chart.track : kind === "borderline" ? chart.zoneBorderline : chart.zoneOut
  if (a !== undefined) zones.push({ from: 0, to: a, fill: at < (low ?? -Infinity) ? beyond : chart.track })
  zones.push({ from: a ?? 0, to: b ?? W, fill: chart.targetZone })
  if (b !== undefined) zones.push({ from: b, to: W, fill: at > (high ?? Infinity) || (kind === "borderline" && at >= b - (b - (a ?? 0)) * 0.2) ? beyond : chart.track })

  const edge = compact ? 5.5 : 9
  const mx = clamp(x(at), edge, W - edge)
  const sx = start !== undefined ? clamp(x(start), compact ? 4.5 : 6, W - (compact ? 4.5 : 6)) : undefined
  const journey = sx !== undefined && has ? Math.abs(mx - sx) : 0
  const pop = phase(motion, 0, 200 / D, 0, 1)
  const k = (size: number) => phase(motion, 0, 200 / D, size * 0.6, size, easeOut)

  // Labels under the track: the range's edges, and the zone's word when it
  // has room. Two edges closer than 28 keep the one nearer the value.
  let edges = [low, high].filter((v): v is number => v !== undefined).map((v) => ({ v, x: x(v), text: showEdge(v) }))
  if (edges.length === 2 && Math.abs(edges[0].x - edges[1].x) < 28) edges = [edges.reduce((p, e) => (Math.abs(e.v - at) < Math.abs(p.v - at) ? e : p))]
  const placed = edges.map((e) => ({ ...e, at: clamp(e.x, textWidth(e.text) / 2, W - textWidth(e.text) / 2) }))
  const zoneFrom = a ?? 0
  const zoneTo = b ?? W
  const zoneMid = (zoneFrom + zoneTo) / 2
  const zoneWord = !compact && zoneTo - zoneFrom >= 72 && placed.every((e) => Math.abs(e.at - zoneMid) >= textWidth(e.text) / 2 + textWidth(zoneLabel) / 2 + 8)
  const valueText = has ? show(at) : ""
  const valueAt = clamp(mx, textWidth(valueText) / 2, W - textWidth(valueText) / 2)
  const startText = start !== undefined ? show(start) : ""
  const startAt = sx !== undefined ? clamp(sx, textWidth(startText) / 2, W - textWidth(startText) / 2) : 0
  const startLabel = !compact && sx !== undefined && (!has || Math.abs(startAt - valueAt) > (textWidth(startText) + textWidth(valueText)) / 2 + 6)

  // The bar in words, as it reads: the value and its unit (once, where a
  // format already writes "%"), the zone by its own word ("Range" or
  // "Goal") with the edges under the track, where the value sits, and the
  // start.
  const said = (text: string) => withSpokenUnit(unit && text.endsWith(unit) ? text.slice(0, -unit.length).trimEnd() : text, unit)
  const rangeWords = rangeSpoken(low, high, unit, range, zoneLabel)
  const decimals = Math.max(decimalsOf(at), decimalsOf(low ?? 0), decimalsOf(high ?? 0))
  const where =
    !has || kind === "neutral"
      ? ""
      : high !== undefined && at > high
        ? `${formatNumber(at - high, decimals)} above ${lowerFirst(zoneLabel)}.`
        : low !== undefined && at < low
          ? `${formatNumber(low - at, decimals)} below ${lowerFirst(zoneLabel)}.`
          : `${STATUS_WORD[kind]}.`
  const summary = [has ? `${said(valueText)}.` : "No results yet.", rangeWords && `${rangeWords}.`, where, start !== undefined ? `Started at ${said(startText)}.` : ""]
    .filter(Boolean)
    .join(" ")

  const bar = (
    <View onLayout={onLayout} style={[{ height: H }, !takeaway && style]} accessible accessibilityRole="image" accessibilityLabel={summary}>
      <Svg width={W} height={H}>
        {zones.map((z, i) => (
          <Path key={i} d={segment(z.from, z.to, ty, th, i === 0, i === zones.length - 1)} fill={z.fill} />
        ))}
        {sx !== undefined && journey > 1 && (
          <APath
            d={`M ${sx.toFixed(1)} ${cy} L ${mx.toFixed(1)} ${cy}`}
            stroke={chart.data}
            strokeOpacity={0.55}
            strokeWidth={compact ? 1.5 : 2}
            strokeLinecap="round"
            strokeDasharray={motion.done ? undefined : `${journey} ${journey}`}
            strokeDashoffset={motion.done ? undefined : phase(motion, 200 / D, 1, journey, 0, easeOut)}
          />
        )}
        {sx !== undefined && (
          <AG opacity={pop}>
            <Circle cx={sx} cy={cy} r={compact ? 4.5 : 5.5} fill={color.background} />
            <Circle cx={sx} cy={cy} r={compact ? 3 : 4} fill={color.background} stroke={chart.other} strokeWidth={1.5} />
          </AG>
        )}
        {has && !compact && <ACircle cx={mx} cy={cy + 1} r={k(9)} fill="#101828" opacity={phase(motion, 0, 200 / D, 0, 0.1)} />}
        {has && <ACircle cx={mx} cy={cy} r={k(compact ? 5.5 : 8.5)} fill={color.background} opacity={pop} />}
        {has &&
          (kind === "borderline" ? (
            <ACircle cx={mx} cy={cy} r={k(compact ? 3.25 : 5)} fill={color.background} stroke={tone} strokeWidth={compact ? 2 : 2.75} opacity={pop} />
          ) : (
            <ACircle cx={mx} cy={cy} r={k(compact ? 4 : 6)} fill={tone} opacity={pop} />
          ))}
        {has && !compact && showValue && (
          <Label x={valueAt} y={14} anchor="middle" weight="semibold" tone={ink.strong}>
            {valueText}
          </Label>
        )}
        {startLabel && (
          <Label x={startAt} y={14} anchor="middle">
            {startText}
          </Label>
        )}
        {!compact &&
          placed.map((e) => (
            <Label key={e.v} x={e.at} y={50} anchor="middle">
              {e.text}
            </Label>
          ))}
        {zoneWord && (
          <Label x={zoneMid} y={50} anchor="middle" weight="medium" tone={ink.detail}>
            {zoneLabel}
          </Label>
        )}
      </Svg>
    </View>
  )
  if (!takeaway) return bar
  return (
    <View style={[styles.frame, style]}>
      <Takeaway>{takeaway}</Takeaway>
      {bar}
    </View>
  )
}

/* ---------------------------------------------------------- goal rows -- */

export type GoalRow = {
  id?: string
  name: string
  unit: string
  /** What was eaten or done; left out when nothing was logged, which is
      never shown as zero. */
  actual?: number
  /** The goal; for a range, its upper end. */
  goal: number
  /** "atLeast" (protein), "atMost" (added sugar, a limit) or "within"
      (calories, from `low` to `goal`). */
  kind?: "atLeast" | "atMost" | "within"
  low?: number
  /** Worked out from a photo or a guess: labelled, never passed off as exact. */
  estimated?: boolean
  /** A day still running or not fully logged: the known subtotal, "so far". */
  partial?: boolean
  /** Words for the gap, under the bar: "26 g short". */
  note?: string
}

/** Whether a goal was met. A partial day meets nothing yet. */
export function goalMet(row: GoalRow) {
  if (row.actual === undefined || row.partial) return false
  const kind = row.kind ?? "atLeast"
  if (kind === "atLeast") return row.actual >= row.goal
  if (kind === "atMost") return row.actual <= row.goal
  return row.actual >= (row.low ?? 0) && row.actual <= row.goal
}

/** Yesterday against the plan's goals (Ed, 30 Sep: "what I took in versus
    what I should have"). Every track runs from 0 to 125% of its goal, so
    each goal tick sits at the same place and the ticks line up down the
    card. Under a goal stays teal with words, never a warning colour; only
    the part past a limit is clay. `onRowPress` makes each whole row a
    button, 44 pt tall at the least (one that opens the screen that explains
    that nutrient), with `rowHint` saying what it does. The words under each
    bar ("Goal met" with its check, "30 g short") end on the amounts' right
    edge. A row with no amount reads `missingWord`: "Not logged", or "No
    calcium data" on a day with meals that carry no value for it. */
export function GoalRows({
  rows,
  takeaway,
  playKey,
  style,
  onRowPress,
  rowHint,
  missingWord = "Not logged",
}: {
  rows: GoalRow[]
  takeaway?: string
  playKey?: string
  style?: StyleProp<ViewStyle>
  onRowPress?: (row: GoalRow) => void
  rowHint?: string
  missingWord?: string | ((row: GoalRow) => string)
}) {
  const { width, onLayout } = useWidth()
  const D = 150 + 450 + 35 * Math.max(rows.length - 1, 0)
  const motion = useMotion(D, { playKey })
  // When any row has words under its bar, every row keeps the line, so the
  // rows share one height and one rhythm; a list with none (a day still
  // running, with no notes) stays compact.
  const words = rows.some((r) => goalMet(r) || !!r.note)
  return (
    <View style={[styles.goals, style]}>
      <Takeaway>{takeaway}</Takeaway>
      <View style={styles.goals} onLayout={onLayout}>
        {rows.map((row, i) => (
          <GoalBar
            key={row.id ?? row.name}
            row={row}
            width={width}
            index={i}
            motion={motion}
            total={D}
            missing={typeof missingWord === "function" ? missingWord(row) : missingWord}
            words={words}
            onPress={onRowPress && (() => onRowPress(row))}
            hint={rowHint}
          />
        ))}
      </View>
    </View>
  )
}

function GoalBar({
  row,
  width,
  index,
  motion,
  total,
  missing,
  words,
  onPress,
  hint,
}: {
  row: GoalRow
  width: number
  index: number
  motion: Motion
  total: number
  missing: string
  /** The words line under the bar, kept on every row of the list. */
  words: boolean
  onPress?: () => void
  hint?: string
}) {
  const kind = row.kind ?? "atLeast"
  const scale = row.goal * 1.25
  const x = (v: number) => clamp(v / scale, 0, 1) * width
  const known = row.actual !== undefined
  const actual = row.actual ?? 0
  const met = goalMet(row)
  const over = known && kind !== "atLeast" && actual > row.goal
  const fill = !known || actual <= 0 ? 0 : over ? x(row.goal) - 1 : Math.max(x(actual), 6)
  const excessFrom = x(row.goal) + 1
  const excess = over ? Math.max(x(actual) - excessFrom, 4) : 0
  const goalText = kind === "within" && row.low !== undefined ? `${formatNumber(row.low)} to ${formatNumber(row.goal)}` : formatNumber(row.goal)
  const start = (150 + 35 * index) / total
  const end = (150 + 35 * index + 450) / total
  const fillWidth = phase(motion, start, end, 0, fill, easeOut)
  const excessWidth = phase(motion, start + (end - start) * 0.6, end, 0, excess, easeOut)
  const label = [
    row.name,
    known ? `${formatNumber(actual)} of ${goalText} ${spokenUnit(row.unit)}${kind === "atMost" ? " limit" : ""}${row.partial ? " so far" : ""}` : lowerFirst(missing),
    met ? "goal met" : undefined,
    // The row's own words for the gap when it has them ("4 g over"), else
    // the amount past the limit.
    over && !row.note ? `${formatNumber(actual - row.goal)} ${spokenUnit(row.unit)} over the limit` : undefined,
    row.estimated ? "estimated" : undefined,
    row.note,
  ]
    .filter(Boolean)
    .join(", ")

  // The row's body; with a press the button carries the row's own words,
  // so the inner view is not a second stop.
  const body = (
    <View style={styles.goalRow} accessible={!onPress} accessibilityLabel={onPress ? undefined : label}>
      <View style={styles.goalHead}>
        <Text style={styles.goalName} numberOfLines={1}>
          {row.name}
        </Text>
        <View style={styles.goalRight}>
          {/* A partial amount says "so far" in its own words; an estimate
              gets a label. */}
          {known && row.estimated && (
            <View style={styles.goalTag}>
              <Text style={styles.goalTagText}>Estimated</Text>
            </View>
          )}
          {known ? (
            <Text style={styles.goalAmount} numberOfLines={2}>
              <Text style={styles.goalActual}>{formatNumber(actual)}</Text>
              {` of ${goalText} ${row.unit}${kind === "atMost" ? " limit" : ""}${row.partial ? " so far" : ""}`}
            </Text>
          ) : (
            <Text style={styles.goalAmount}>{missing}</Text>
          )}
        </View>
      </View>
      <View style={styles.goalTrack}>
        {kind === "within" && row.low !== undefined && <View style={[styles.goalZone, { left: x(row.low), width: x(row.goal) - x(row.low) }]} />}
        <Animated.View style={[styles.goalFill, { width: fillWidth }]} />
        {over && <Animated.View style={[styles.goalExcess, { left: excessFrom, width: excessWidth }]} />}
        {kind !== "within" && (
          <Animated.View style={[styles.goalTick, { left: x(row.goal) - 2, opacity: phase(motion, 0, 150 / total, 0, 1) }]}>
            <View style={styles.goalTickInner} />
          </Animated.View>
        )}
      </View>
      {/* The words under the bar's end, the card's trailing column: a met
          goal's check with "Goal met" (a mark and its word, as every
          status reads), or the gap ("30 g short"), all ending on the one
          right edge the amounts end on. */}
      {words && (
        <View style={styles.goalWords}>
          {met ? (
            <>
              <Check size={12} />
              <Text style={styles.goalMet}>Goal met</Text>
            </>
          ) : row.note ? (
            <Text style={styles.goalNote}>{row.note}</Text>
          ) : null}
        </View>
      )}
    </View>
  )
  if (!onPress) return body
  // The whole row is the button, 44 pt tall at the least.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.goalPress, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

/** A met goal's check. */
function Check({ size = 14, tone = chart.inRange }: { size?: number; tone?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M3 7.4 L5.8 10 L11 4.2" stroke={tone} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

/* ---------------------------------------------------------- score ring -- */

export type ScoreRingProps = {
  /** The day's score, the share of the plan's goals met. Left out when
      nothing was logged. Past 100 (steps), a second lap. */
  percent?: number | null
  size?: number
  stroke?: number
  /** The word in the middle when there is no number. */
  label?: string
  /** A line under the number: "Partial", "Estimated". */
  caption?: string
  /** What the percent is of, for the spoken summary. */
  of?: string
  playKey?: string
}

/** The daily score (Ed, 30 Sep: "I only made 85% of my goal"): one teal ring
    on its tint, round caps, from 12 o'clock clockwise, the number counting up
    as it sweeps. A full day gets a check and one small beat. Sizes: 132 on
    the day page, 96 on Yesterday, 72 in a row, 40 in history rows and the
    showroom preview (a thin ring, the number alone). */
export function ScoreRing({ percent, size = 96, stroke, label = "No log", caption, of = "Daily score", playKey }: ScoreRingProps) {
  const sw = stroke ?? (size >= 120 ? 12 : size >= 88 ? 10 : size >= 56 ? 8 : 4)
  const known = percent !== undefined && percent !== null
  const p = known ? Math.max(0, percent) : 0
  const r = (size - sw) / 2
  const c = size / 2
  const C = 2 * Math.PI * r
  const lap1 = Math.min(p, 100) / 100
  const lap2 = Math.min(Math.max(p - 100, 0), 100) / 100
  const full = p >= 100
  const D = full ? 1000 : 700
  const motion = useMotion(D, { playKey })
  const sweepEnd = 700 / D
  const split = lap2 > 0 ? (sweepEnd * lap1) / (lap1 + lap2) : sweepEnd
  const sliver = lap1 > 0 && lap1 * C < sw
  const beat = full ? steps(motion, [sweepEnd, sweepEnd + 150 / D, 1], [1, 1.04, 1]) : 1
  const big = size >= 120
  const tiny = size < 56
  const numberStyle = big ? styles.ringNumberBig : size >= 88 ? styles.ringNumber : tiny ? styles.ringNumberTiny : styles.ringNumberSmall
  const [ex, ey] = polar(c, c, r, 360 * lap2)

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ scale: beat }] }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={known ? `${of}, ${Math.round(p)} percent${caption ? `, ${lowerFirst(caption)}` : ""}` : `${of}, ${label ? lowerFirst(label) : "no score"}`}
    >
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={chart.dataTrack} strokeWidth={sw} fill="none" />
        {sliver ? (
          <ACircle cx={c} cy={c - r} r={sw / 2} fill={chart.data} opacity={phase(motion, 0, 0.1, 0, 1)} />
        ) : (
          lap1 > 0 && (
            <ACircle
              cx={c}
              cy={c}
              r={r}
              stroke={chart.data}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={phase(motion, 0, split, C, C * (1 - lap1), lap2 > 0 ? undefined : easeOut)}
              opacity={phase(motion, 0, 0.02, 0, 1)}
              transform={`rotate(-90 ${c} ${c})`}
            />
          )
        )}
        {lap2 > 0 && motion.done && <Circle cx={ex} cy={ey + 1} r={sw / 2} fill="#101828" fillOpacity={0.16} />}
        {lap2 > 0 && (
          <ACircle
            cx={c}
            cy={c}
            r={r}
            stroke={chart.dataStrong}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            strokeDashoffset={phase(motion, split, sweepEnd, C, C * (1 - lap2), easeOut)}
            opacity={phase(motion, split, split + 0.01, 0, 1)}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCentre]} pointerEvents="none">
        {full && !tiny && <Check size={12} />}
        {known ? (
          <View style={styles.ringRow}>
            <Counter motion={motion} value={Math.round(p)} format={(v) => String(Math.round(v))} until={sweepEnd} style={numberStyle} />
            <Text style={[styles.ringPercent, big && styles.ringPercentBig, tiny && styles.ringPercentTiny]}>%</Text>
          </View>
        ) : (
          <Text style={[styles.ringLabel, tiny && styles.ringLabelTiny]}>{label}</Text>
        )}
        {!!caption && !tiny && <Text style={styles.ringCaption}>{caption}</Text>}
      </View>
    </Animated.View>
  )
}

/* ------------------------------------------------------- progress line -- */

export type ProgressChartProps = {
  /** Raw readings, oldest first, drawn pale. Plain numbers (older call sites)
      are read as a week apart, the last today. */
  points?: readonly (number | Dated)[]
  /** The same, by its plan name. */
  readings?: readonly (number | Dated)[]
  /** The smoothed line. Left out, the kit fits one (a local straight line
      around each week); given, it is joined to the start and the latest
      reading so it meets both dots. */
  trend?: readonly Dated[]
  /** The frozen baseline; the first reading by default. */
  start?: Dated
  goal?: number
  /** From today on, oldest first: dashed inside a widening cone. Plain
      numbers are a week apart, the first today. Leave it out when the
      forecast rule fails (catalog M-44). */
  forecast?: readonly (number | Dated)[]
  /** The last reading's date by default. */
  today?: When
  unit?: string
  /** What is tracked, for the legend and the summary: "weight". */
  name?: string
  /** The pale dots' legend word: "Weigh-ins". */
  readingsLabel?: string
  /** The home's smaller version: 132 tall, no legend. */
  compact?: boolean
  height?: number
  /** Under the chart: the forecast's sentence by default (when a unit is
      given), null for none. */
  caption?: string | null
  legend?: boolean
  /** A less certain forecast gets a wider cone. */
  confidence?: "high" | "moderate"
  /** The start date on the axis; "May 18" by default. */
  startLabel?: string
  takeaway?: string
  /** The reading picked on the plot, an index into `readings` (oldest
      first), drawn with the selection mark on its rule; left out, today's
      reading is the one the screen's readout shows. */
  selected?: number
  /** Makes the plot a scrub (detail size, C.25): a tap or a drag picks the
      nearest reading and the screen's readout follows it; a screen reader
      swipes up and down through the readings. */
  onSelect?: (index: number) => void
  playKey?: string
}

type TV = { t: number; value: number }

/** Readings as times: plain numbers a week apart, the last on `anchor`. */
function datedOf(list: readonly (number | Dated)[], anchor: number, forward = false): TV[] {
  const n = list.length
  return list
    .map((p, i) =>
      typeof p === "number" ? { t: anchor + (forward ? i : i - (n - 1)) * 7 * DAY, value: p } : { t: parseWhen(p.date) ?? anchor, value: p.value }
    )
    .sort((a, b) => a.t - b.t)
}

/** The trend under noisy readings: a local straight line fitted around each
    week (tricube weights, 12 days either side), which does not lag at the
    ends the way a moving average does. It is pinned to the first and latest
    readings, so the line starts on the start point and ends on today's dot. */
function smoothTrend(points: TV[]): TV[] {
  if (points.length < 4) return points
  const first = points[0]
  const last = points[points.length - 1]
  const reach = 12 * DAY
  const fit = (t: number) => {
    let sw = 0
    let sx = 0
    let sy = 0
    let sxx = 0
    let sxy = 0
    for (const p of points) {
      const u = Math.abs(p.t - t) / reach
      if (u >= 1) continue
      const w = (1 - u ** 3) ** 3
      const dx = (p.t - t) / DAY
      sw += w
      sx += w * dx
      sy += w * p.value
      sxx += w * dx * dx
      sxy += w * dx * p.value
    }
    if (!sw) return undefined
    const det = sw * sxx - sx * sx
    return Math.abs(det) < 1e-9 ? sy / sw : (sxx * sy - sx * sxy) / det
  }
  const out: TV[] = [first]
  for (let t = first.t + 7 * DAY; t < last.t - 3 * DAY; t += 7 * DAY) {
    const v = fit(t)
    if (v !== undefined) out.push({ t, value: v })
  }
  out.push(last)
  return out
}

/** A supplied trend joined to the start point and the latest reading, so
    the line starts on the start dot and ends on today's, and today's label
    is the weigh-in the card's headline quotes, not a lagging average. */
function pinned(trend: TV[], first: TV, last: TV): TV[] {
  const inner = trend.filter((p) => p.t - first.t > 3 * DAY && last.t - p.t > 3 * DAY)
  return [first, ...inner, last]
}

/** Where a polyline crosses x, for keeping labels off the line. */
function yAt(xy: XY[], x: number) {
  if (!xy.length) return undefined
  if (x <= xy[0][0]) return xy[0][1]
  for (let i = 1; i < xy.length; i++) {
    const [ax, ay] = xy[i - 1]
    const [bx, by] = xy[i]
    if (x <= bx) return bx === ax ? by : ay + ((x - ax) / (bx - ax)) * (by - ay)
  }
  return xy[xy.length - 1][1]
}

/** Progress since the start (Ed, 30 Sep: "I started in May ... I've lost 11
    pounds"): time to scale in days, the raw readings pale, a 2.5 pt trend
    line, the goal as a solid labelled hairline, the forecast dashed inside a
    cone that widens with time over the future's pale ground, a "Today" rule,
    the frozen start as a hollow point, and a caption that calls the
    forecast a forecast. */
export function ProgressChart(props: ProgressChartProps) {
  const { goal, unit, name, readingsLabel = "Readings", compact = false, confidence = "high", takeaway, playKey } = props
  const legend = props.legend ?? !compact
  const H = props.height ?? (compact ? 132 : 196)
  const { width: W, onLayout } = useWidth()
  // The line draws in 600 ms, today's marker pops in 160, then the forecast
  // and its cone fade in over 200.
  const D = 960
  const motion = useMotion(D, { playKey })

  const anchor = props.today !== undefined ? parseWhen(props.today) : undefined
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const raw = datedOf(props.readings ?? props.points ?? [], anchor ?? midnight)
  // The reading she picked, today's when none is. The scrub's hook runs
  // before the empty state returns; the readings' x positions are filled in
  // below, once the time scale is known, and read when a finger lands.
  const latest = raw.length - 1
  const sel = clampIndex(props.selected ?? latest, raw.length)
  const select = (i: number) => {
    if (i !== sel) props.onSelect?.(i)
  }
  const xs: number[] = []
  const scrub = useScrub(xs, select)
  const gid = useSvgId("wash")
  if (!raw.length) {
    return (
      <View style={styles.frame}>
        <Takeaway>{takeaway}</Takeaway>
        <EmptyChart title="No readings yet" />
      </View>
    )
  }
  const today = anchor ?? raw[raw.length - 1].t
  const start = props.start ? { t: parseWhen(props.start.date) ?? raw[0].t, value: props.start.value } : raw[0]
  const series = start === raw[0] ? raw : [start, ...raw.filter((p) => p.t > start.t)]
  const trend = props.trend
    ? pinned(
        props.trend.map((p) => ({ t: parseWhen(p.date) ?? today, value: p.value })).sort((a, b) => a.t - b.t),
        start,
        raw[raw.length - 1]
      )
    : smoothTrend(series)
  const now0 = trend[trend.length - 1]
  const ahead = props.forecast ? datedOf(props.forecast, today, true).filter((p) => p.t >= today) : []
  const forecast = ahead.length ? (ahead[0].t > today ? [{ t: today, value: now0.value }, ...ahead] : ahead) : []
  const end = forecast.length > 1 ? forecast[forecast.length - 1] : undefined

  // The plot runs the chart's full width: the goal labels itself on its own
  // line ("Goal 175 lb", FINAL-SPEC F.3), so no gutter is kept for it, and
  // today's ring keeps 12 pt from the right edge.
  const plotRight = W
  const x0 = 10
  const x1 = plotRight - 12
  const top = compact ? 22 : 26
  const base = H - (compact ? 26 : 34)
  const yTop = top + 6
  const yBottom = base - 10
  const tMin = Math.min(start.t, raw[0].t)
  const tMax = Math.max(today, end?.t ?? today, tMin + DAY)
  const x = (t: number) => x0 + ((t - tMin) / (tMax - tMin)) * (x1 - x0)
  const values = [...raw, ...trend, start, ...forecast].map((p) => p.value).concat(goal !== undefined ? [goal] : [])
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const span = hi - lo || Math.max(Math.abs(hi) * 0.1, 1)
  lo -= span * 0.12
  hi += span * 0.12
  const y = (v: number) => yTop + (1 - (v - lo) / (hi - lo)) * (yBottom - yTop)
  xs.push(...raw.map((p) => x(p.t)))
  const picked = sel !== latest ? sel : undefined

  const trendXY = trend.map((p): XY => [x(p.t), y(p.value)])
  const trendLength = lengthOf(trendXY) * 1.08 + 4
  const xt = x(today)
  const yt = y(now0.value)
  // The readings show pale under the line whenever the line is a trend of
  // them (given, or fitted: smoothTrend hands back its own input when there
  // are too few readings to fit) rather than the readings themselves. A
  // weekly weigh-in gives about one fitted point a reading, so counting
  // points would hide the weigh-ins.
  const pale = props.trend !== undefined || trend !== series
  const lineEnd = 600 / D
  const popEnd = 760 / D
  const spread = confidence === "moderate" ? 14 : 10
  const forecastXY = forecast.map((p): XY => [x(p.t), y(p.value)])
  const cone = end
    ? [
        ...forecast.map((p) => [x(p.t), y(p.value) - (spread * (p.t - today)) / (end.t - today || 1)] as XY),
        ...[...forecast].reverse().map((p) => [x(p.t), y(p.value) + (spread * (p.t - today)) / (end.t - today || 1)] as XY),
      ]
    : []

  // The labels, placed so that no two ever touch or read as one, whatever
  // the values. The goal's label sits on its own line at the left end, over
  // it or under it: a goal is set away from where she started, so that end
  // is clear, while today's dot, nearing the goal, is at the right (the
  // bone plan's 13 chair stands under a goal of 15 sit a chart's width
  // apart). Only when the left end is taken does it move to the line's
  // right end. Today's value sits over its dot or under it, else beside it;
  // the start's over or under its point. Each takes the first place clear
  // of the other labels, of the marks, of the goal line and of the lines.
  const sx = x(start.t)
  const sy = y(start.value)
  const gy = goal !== undefined ? y(goal) : 0
  const goalText = goal !== undefined ? `Goal ${formatNumber(goal)}${unit ? ` ${unit}` : ""}` : ""
  const goalSpots: (Spot | undefined)[] =
    goal === undefined
      ? [undefined]
      : [spotAt(2, gy - 5, goalText), spotAt(2, gy + 15, goalText), spotAt(plotRight - 2, gy - 5, goalText, "end"), spotAt(plotRight - 2, gy + 15, goalText, "end")]
  // Readings at the precision they were taken at, so today's label agrees
  // with the readout above it ("178.0 lb", never "178 lb" under "178.0").
  const places = Math.min(1, Math.max(0, ...raw.map((p) => decimalsOf(p.value))))
  const reading = (v: number) => formatNumber(v, places)
  const todayText = `${reading(now0.value)}${unit ? ` ${unit}` : ""}`
  const todayW = textWidth(todayText)
  const centred = clamp(xt, todayW / 2 + 2, plotRight - todayW / 2 - 2)
  // Clear of today's ring (10 pt): over it, under it, then beside it a
  // little over or under its middle, the right first (the future's side).
  const todaySpots = [
    spotAt(centred, yt - 14, todayText, "middle"),
    spotAt(centred, yt + 24, todayText, "middle"),
    spotAt(xt + 12, yt - 7, todayText, "start"),
    spotAt(xt - 12, yt - 7, todayText, "end"),
    spotAt(xt + 12, yt + 16, todayText, "start"),
    spotAt(xt - 12, yt + 16, todayText, "end"),
  ]
  // Clear of a line: where the line runs under the label, at its ends and
  // its middle, it stays off the figures (a box's top clears their cap
  // height by 3 pt; the halo covers what is left).
  const offLine = (box: Box, xy: XY[]) =>
    [box.x0, (box.x0 + box.x1) / 2, box.x1].every((px) => {
      if (!xy.length || px < xy[0][0] || px > xy[xy.length - 1][0]) return true
      const ly = yAt(xy, px) ?? 0
      return ly < box.y0 + 2 || ly > box.y1 - 1
    })
  const clearOf = (box: Box) => offLine(box, trendXY) && offLine(box, forecastXY)
  const inside = (box: Box) => box.x0 >= 0 && box.x1 <= plotRight && box.y0 >= 0 && box.y1 <= base - 2
  // Clear of a round mark: no part of the box within `r` of its centre.
  const offMark = (box: Box, cx: number, cy: number, r: number) => Math.hypot(clamp(cx, box.x0, box.x1) - cx, clamp(cy, box.y0, box.y1) - cy) >= r
  // In one column with the goal's label (closer than 12 pt sideways),
  // today's value also sits across the goal line from it.
  const above = (box: Box) => box.y1 < gy
  const todayFits = (spot: Spot, g: Spot | undefined) =>
    inside(spot.box) &&
    (goal === undefined || !crosses(spot.box, gy)) &&
    clearOf(spot.box) &&
    (!g || (apart(spot.box, g.box) && (sideways(spot.box, g.box) >= 12 || above(spot.box) !== above(g.box))))
  const placed = (() => {
    const clear = goalSpots.filter((g) => !g || (inside(g.box) && clearOf(g.box) && offMark(g.box, sx, sy, 8) && offMark(g.box, xt, yt, 12)))
    const options = clear.length ? clear : goalSpots.slice(0, 1)
    for (const g of options) for (const spot of todaySpots) if (todayFits(spot, g)) return { goalAt: g, todayAt: spot as Spot | undefined }
    // Nowhere clear: the goal keeps its label and today's value is left to
    // the words above the chart.
    return { goalAt: options[0], todayAt: undefined }
  })()
  const goalAt = placed.goalAt
  // A reading picked right beside today's takes the spot: today's value
  // steps aside rather than crowd it (the readout above says the pick).
  const todayAt =
    placed.todayAt && (picked === undefined || xs[picked] < placed.todayAt.box.x0 - 12 || xs[picked] > placed.todayAt.box.x1 + 12) ? placed.todayAt : undefined
  const startText = reading(start.value)
  // Over the start point, or under it when the line climbs through that
  // spot; left out when neither is clear (the card's words carry it).
  const startX = Math.max(sx - 4, 0)
  const startSpot = [spotAt(startX, sy - 10, startText), spotAt(startX, sy + 18, startText)].find(
    (spot) =>
      spot.box.y0 >= top - 8 &&
      spot.box.y1 <= base - 2 &&
      offLine(spot.box, trendXY) &&
      (goal === undefined || !crosses(spot.box, gy)) &&
      (!todayAt || apart(spot.box, todayAt.box)) &&
      (!goalAt || clearBy(spot.box, goalAt.box, 6))
  )
  // The Today rule stops short of today's value when it sits over or under
  // the dot, so it never runs through the number.
  const todayOver = !!todayAt && todayAt.anchor === "middle" && todayAt.y < yt
  const ruleSpans: [number, number][] =
    todayAt && todayAt.anchor === "middle"
      ? todayOver
        ? [[todayAt.box.y1 + 2, base]]
        : [
            [top, todayAt.box.y0 - 2],
            [todayAt.box.y1 + 2, base],
          ]
      : [[top, base]]

  const startLabelText = props.startLabel ?? monthDay(start.t)
  // A near end reads as a date ("Oct 29"); a far one as its month ("Jan").
  const endText = end ? (end.t - today < 75 * DAY ? monthDay(end.t) : MONTHS[new Date(end.t).getMonth()]) : undefined
  const todayLabelX = clamp(xt, textWidth("Today") / 2, W - textWidth("Today") / 2)
  const showStartLabel = xt - textWidth("Today") / 2 - 8 > x0 + textWidth(startLabelText)
  const showEndLabel = !!endText && plotRight - textWidth(endText) - 8 > todayLabelX + textWidth("Today") / 2

  const caption =
    props.caption === null
      ? undefined
      : (props.caption ??
        (end && unit !== undefined
          ? `If current habits continue, you may reach ${formatNumber(end.value)} ${unit} by ${partOfMonth(end.t)}. An estimate, not a guarantee.`
          : undefined))
  const items: LegendItem[] = [
    { kind: "line", label: name ? `Your ${name}` : "Trend" },
    ...(pale ? [{ kind: "pale" as const, label: readingsLabel }] : []),
    ...(end ? [{ kind: "dash" as const, label: "Forecast" }] : []),
    ...(goal !== undefined ? [{ kind: "goal" as const, label: goalText }] : []),
  ]
  // The chart in its own words: where it started and when, today's value,
  // the goal and the forecast, each with its unit (or what is counted:
  // "13 chair stands").
  const spokenName = name ? name.charAt(0).toUpperCase() + name.slice(1) : "Progress"
  const said = (v: number) => withSpokenUnit(reading(v), unit ?? name)
  const valueText = `${spokenWhen(raw[sel].t)}, ${said(raw[sel].value)}`
  const summary = [
    `${spokenName} since ${spokenWhen(start.t)}: from ${said(start.value)} to ${said(now0.value)} today.`,
    // The goal and the forecast as their label and caption write them.
    goal !== undefined ? `Goal ${withSpokenUnit(formatNumber(goal), unit ?? name)}.` : "",
    end ? `Forecast ${withSpokenUnit(formatNumber(end.value), unit ?? name)} by ${partOfMonth(end.t)}, if current habits continue.` : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <View style={styles.frame}>
      <Takeaway>{takeaway}</Takeaway>
      <View
        onLayout={onLayout}
        style={{ height: H }}
        accessible={!props.onSelect}
        accessibilityRole={props.onSelect ? undefined : "image"}
        accessibilityLabel={props.onSelect ? undefined : summary}
      >
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={W} height={H}>
            <Defs>
              {/* The same wash as the biomarker trend: the line's teal at
                  16% fading to nothing down the page. */}
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.primaryText} stopOpacity={0.16} />
                <Stop offset="1" stopColor={color.primaryText} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {end && <Rect x={xt} y={top} width={Math.max(plotRight - xt, 0)} height={base - top} fill={chart.future} />}
            <AG opacity={phase(motion, 0, lineEnd, 0, 1)}>
              <Path d={`${monotone(trendXY)} L ${trendXY[trendXY.length - 1][0].toFixed(1)} ${base} L ${trendXY[0][0].toFixed(1)} ${base} Z`} fill={`url(#${gid})`} />
            </AG>
            <Line x1={0} x2={plotRight} y1={base} y2={base} stroke={chart.track} strokeWidth={1} />
            {goal !== undefined && <Line x1={0} x2={plotRight} y1={gy} y2={gy} stroke={chart.goal} strokeWidth={1} />}
            {end && (
              <AG opacity={phase(motion, popEnd, 1, 0, 1)}>
                <Path d={`${line(cone)} Z`} fill={chart.data} fillOpacity={0.08} />
                <Path d={line(forecastXY)} stroke={chart.data} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="4 4" fill="none" />
              </AG>
            )}
            {pale &&
              raw.map((p, i) => {
                const f = clamp((x(p.t) - x0) / Math.max(xt - x0, 1), 0, 1)
                return (
                  <ACircle
                    key={i}
                    cx={x(p.t)}
                    cy={y(p.value)}
                    r={2.5}
                    fill={chart.data}
                    fillOpacity={0.35}
                    opacity={phase(motion, f * lineEnd, f * lineEnd + 0.08, 0, 1)}
                  />
                )
              })}
            {ruleSpans.map(([a, b]) => (b > a ? <Line key={a} x1={xt} x2={xt} y1={a} y2={b} stroke={chart.rule} strokeWidth={1} /> : null))}
            {picked !== undefined && <Line x1={xs[picked]} x2={xs[picked]} y1={top} y2={base} stroke={chart.rule} strokeWidth={1} />}
            <APath
              d={monotone(trendXY)}
              stroke={chart.data}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={motion.done ? undefined : `${trendLength} ${trendLength}`}
              strokeDashoffset={motion.done ? undefined : phase(motion, 0, lineEnd, trendLength, 0, easeOut)}
            />
            <Circle cx={sx} cy={sy} r={5.5} fill={color.background} />
            <Circle cx={sx} cy={sy} r={4} fill={color.background} stroke={chart.other} strokeWidth={1.5} />
            {startSpot && (
              <Label x={startSpot.x} y={startSpot.y} weight="medium" halo>
                {startText}
              </Label>
            )}
            {goalAt && (
              <Label x={goalAt.x} y={goalAt.y} anchor={goalAt.anchor} weight="medium" tone={ink.detail} halo>
                {goalText}
              </Label>
            )}
            {picked !== undefined && <SelectedMark x={xs[picked]} y={y(raw[picked].value)} tone={chart.data} kind="plain" opacity={phase(motion, lineEnd, popEnd, 0, 1)} />}
            {/* Today's reading is the one shown until another is picked:
                the selection's ring and dot, then a plain dot. */}
            {picked === undefined ? (
              <SelectedMark x={xt} y={yt} tone={chart.data} kind="plain" opacity={phase(motion, lineEnd, popEnd, 0, 1)} />
            ) : (
              <AG opacity={phase(motion, lineEnd, popEnd, 0, 1)}>
                <Circle cx={xt} cy={yt} r={7} fill={color.background} />
                <Circle cx={xt} cy={yt} r={5} fill={chart.data} />
              </AG>
            )}
            {todayAt && (
              <AG opacity={phase(motion, lineEnd, popEnd, 0, 1)}>
                <Label x={todayAt.x} y={todayAt.y} anchor={todayAt.anchor} weight="semibold" tone={ink.strong} halo>
                  {todayText}
                </Label>
              </AG>
            )}
            {showStartLabel && (
              <Label x={x0 - 2} y={H - (compact ? 8 : 12)}>
                {startLabelText}
              </Label>
            )}
            <Label x={todayLabelX} y={H - (compact ? 8 : 12)} anchor="middle" weight="medium" tone={ink.strong}>
              Today
            </Label>
            {showEndLabel && endText && (
              <Label x={plotRight} y={H - (compact ? 8 : 12)} anchor="end">
                {endText}
              </Label>
            )}
          </Svg>
        </View>
        {props.onSelect && (
          <View
            style={StyleSheet.absoluteFill}
            {...scrub}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={summary}
            aria-valuetext={valueText}
            accessibilityActions={ADJUST}
            onAccessibilityAction={onAdjust(sel, raw.length, select)}
          />
        )}
      </View>
      {legend && <Legend items={items} />}
      <Note>{caption}</Note>
    </View>
  )
}

/* ---------------------------------------------------------- week bars -- */

export type WeekDay = {
  /** "Mon"; the last day reads "Today" when `today` is set. */
  label: string
  /** Left out for a day with no reading, drawn as a grey dot on the
      baseline, never a zero bar. */
  value?: number
  /** Not fully logged: a hollow bar (a teal edge round a pale fill) to its
      amount so far, read out as partial. A partial day with no value (a
      daily score is never given to a partial day, M-28) is a short hollow
      stub on the baseline that reads `partialWord`. Partial days are never
      averaged or counted. */
  partial?: boolean
  today?: boolean
  /** Still to come in a week that is running (a weekly recap shown before
      Sunday is over): a quiet empty column, the height of the goal or of
      the plot, over a quieter weekday. */
  future?: boolean
}

export type WeekBarsProps = {
  days: WeekDay[]
  goal?: number
  /** The goal is a ceiling (drinks at one time): its line reads Limit, a
      bar on or under it counts, and a bar over it is drawn out of range. */
  limit?: boolean
  /** A range to land in (sleep, 7 to 9 h): a band behind the bars. */
  band?: [number, number]
  format?: (v: number) => string
  unit?: string
  /** What the bars count, for the spoken summary: "Steps". */
  name?: string
  /** The readout's count: "3 of 6 days on goal", or "nights" for sleep. */
  dayWord?: string
  /** A day without a value in the readout: "No reading", or "Nothing logged"
      for daily scores. */
  emptyWord?: string
  /** A partial day without a value in the readout: "Partial day". */
  partialWord?: string
  /** The readout's right side, when the screen has better words ("Average
      90% on 6 scored days" from lib/member.ts averageOf); otherwise the
      count on goal, or the average rounded down. */
  trailing?: string
  /** The selected day; today by default. */
  selected?: number
  onSelect?: (index: number) => void
  readout?: boolean
  /** The 64 pt strip for a weekly recap: no gutter, no readout, no goal. */
  mini?: boolean
  /** Mini only: the day drawn strong, such as the best one. */
  highlight?: number
  takeaway?: string
  height?: number
  playKey?: string
}

/** Seven days as columns (steps, sleep, daily scores), each day's state in
    its own shape: a complete day a solid bar (past days in a lighter teal,
    the selected one, today by default, in the strong one), a partial day a
    hollow bar or stub, a day with nothing logged a grey dot on the
    baseline, a day still to come a quiet empty column. The goal is a solid
    hairline labelled with its unit. The scale fits the data and the goal
    exactly, so no empty band sits over the bars. Tapping a day changes the
    readout above; nothing sits on the bar tops to collide with the goal. */
export function WeekBars(props: WeekBarsProps) {
  const {
    days,
    goal,
    limit = false,
    band,
    format = (v: number) => formatNumber(v),
    unit = "",
    name,
    dayWord = "days",
    emptyWord = "No reading",
    partialWord = "Partial day",
    mini = false,
    takeaway,
    playKey,
  } = props
  /** What a day without a value is called. */
  const emptyOf = (d: WeekDay) => (d.partial ? partialWord : emptyWord)
  const readout = props.readout ?? !mini
  const n = days.length
  const H = props.height ?? (mini ? 64 : 168)
  const { width: W, onLayout } = useWidth()
  const D = 450 + 35 * Math.max(n - 1, 0)
  const motion = useMotion(D, { playKey })
  const flagged = days.findIndex((d) => d.today)
  // Today by default, else the last day that has happened.
  const happened = days.map((d) => !d.future).lastIndexOf(true)
  const todayIndex = flagged >= 0 ? flagged : happened >= 0 ? happened : n - 1
  const [own, setOwn] = React.useState(todayIndex)
  React.useEffect(() => setOwn(todayIndex), [todayIndex])
  const sel = mini ? (props.highlight ?? -1) : clampIndex(props.selected ?? own, n)
  const select = (i: number) => {
    setOwn(i)
    if (i !== sel) props.onSelect?.(i)
  }
  if (!n) return <EmptyChart title="No readings yet" />

  // The goal (with its unit: "28 g", "2,300 mg") or the band's ends label
  // themselves in a gutter that fits them; with neither, the bars take the
  // whole width.
  const goalText = goal !== undefined ? `${format(goal)}${unit ? ` ${unit}` : ""}` : ""
  const goalWord = limit ? "Limit" : "Goal"
  const gutter = mini || (goal === undefined && !band) ? 0 : gutterFor([...(goal !== undefined ? [goalWord, goalText] : []), ...(band ?? []).map((v) => format(v))], 36)
  const plotW = W - gutter
  const slot = plotW / n
  const bw = Math.min(22, Math.max(10, slot * 0.52))
  const top = mini ? 2 : 6
  const base = mini ? 44 : 140
  const labelY = mini ? 60 : 160
  const values = days.map((d) => d.value).filter((v): v is number => v !== undefined)
  // Partial days are drawn, and set the scale, but are never averaged or
  // counted (M-28, M-32).
  const counted = days.filter((d) => d.value !== undefined && !d.partial).map((d) => d.value as number)
  // The scale fits the data and the goal exactly: no ticks are drawn, so
  // any headroom would only be an empty band over the bars. The tallest of
  // the bars, the goal and the band's top reaches the plot's top; the
  // goal's labels sit under its line when there is no room over it.
  const ceiling = Math.max(mini ? 0 : (goal ?? 0), mini ? 0 : (band?.[1] ?? 0), ...values, 0) || 1
  const y = (v: number) => base - (clamp(v, 0, ceiling) / ceiling) * (base - top)
  const radius = Math.min(4, bw / 2)
  const dayLabel = (d: WeekDay) => (d.today ? "Today" : d.label)
  const gy = goal !== undefined ? y(goal) : 0
  const goalSpots = gy - 17 >= 0 ? [gy - 5, gy + 13] : [gy + 13, gy + 28]
  // A partial day with no amount: a stub as tall as a bar is wide, about.
  const stub = Math.round(Math.min(12, Math.max(8, bw * 0.55)))
  // A day still to come: an empty column up to the goal, or the plot's top.
  const slotTop = !mini && goal !== undefined ? gy : top

  const day = sel >= 0 ? days[sel] : undefined
  const logged = counted.length
  // The average at the values' own precision (whole steps, whole percents),
  // rounded down like the daily score and lib/member.ts averageOf, so the
  // chart and the words beside it never disagree by one.
  const places = 10 ** Math.max(0, ...counted.map(decimalsOf))
  const average = logged ? Math.floor(((counted.reduce((s, v) => s + v, 0) / logged) * places) + 1e-9) / places : 0
  const over = (v: number) => limit && goal !== undefined && v > goal
  const onGoal = goal !== undefined ? counted.filter((v) => (limit ? v <= goal : v >= goal)).length : band ? counted.filter((v) => v >= band[0] && v <= band[1]).length : undefined
  // The bars in words, as they read: the days shown, the goal or range with
  // its unit, the average and the count of complete days (a count only when
  // some made it), the days still to come. The mini strip has no buttons
  // per day, so it also says each day; elsewhere each day is its own button.
  const amount = (v: number) => `${format(v)}${unit ? ` ${unit}` : ""}`
  const past = days.filter((d) => !d.future)
  const ahead = days.filter((d) => d.future)
  const span = (list: WeekDay[]) => (list.length > 1 ? `${dayLabel(list[0])} to ${dayLabel(list[list.length - 1])}` : list.length ? dayLabel(list[0]) : "")
  const dayWords = (d: WeekDay) => `${dayLabel(d)}, ${d.value !== undefined ? `${amount(d.value)}${d.partial ? " so far" : ""}` : lowerFirst(emptyOf(d))}`
  const summary = [
    `${name ?? "Daily values"}, ${span(past) || span(days)}.`,
    mini && past.length ? `${past.map(dayWords).join("; ")}.` : "",
    !mini && goal !== undefined ? `${goalWord} ${amount(goal)}.` : !mini && band ? `Range ${format(band[0])} to ${amount(band[1])}.` : "",
    logged ? `Average ${amount(average)}.` : values.length ? "" : "No readings.",
    onGoal && logged ? `${goal !== undefined ? (limit ? "Within limit" : "On goal") : "In range"} ${onGoal} of ${logged} ${dayWord}.` : "",
    ahead.length ? `${span(ahead)} still to come.` : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <View style={styles.frame}>
      <Takeaway>{takeaway}</Takeaway>
      {readout && day && (
        <Readout
          meta={day.partial && day.value !== undefined ? `${dayLabel(day)}, partial` : dayLabel(day)}
          value={day.value !== undefined ? format(day.value) : emptyOf(day)}
          unit={unit}
          dim={day.value === undefined}
          trailing={
            // A count only when some days made it: "0 of 5" would read as a
            // verdict, so the average stands in for it.
            props.trailing ??
            (onGoal && logged
              ? `${onGoal} of ${logged} ${dayWord} ${goal !== undefined ? (limit ? "within limit" : "on goal") : "in range"}`
              : logged
                ? `Average ${format(average)}`
                : undefined)
          }
        />
      )}
      <View onLayout={onLayout} style={{ height: H }}>
        {/* The plot reads as one image with its summary; the days are
            buttons over it. */}
        <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={summary}>
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            {!mini && band && <Rect x={0} y={y(band[1])} width={plotW} height={Math.max(y(band[0]) - y(band[1]), 0)} fill={chart.band} />}
            <Line x1={0} x2={plotW} y1={base} y2={base} stroke={color.border} strokeWidth={1} />
          </Svg>
          {days.map((d, i) => {
            const at = { left: i * slot + (slot - bw) / 2, bottom: H - base, width: bw, borderTopLeftRadius: radius, borderTopRightRadius: radius }
            // Still to come: the empty column it will fill, in the quiet
            // track grey, with no edge.
            if (d.future) return <View key={i} style={[styles.bar, styles.barAhead, at, { height: Math.max(base - slotTop, 0) }]} />
            // Nothing logged: the grey dot below, no column.
            if (d.value === undefined && !d.partial) return null
            const strong = i === sel
            const h = d.value === undefined ? stub : Math.max(base - y(d.value), 3)
            return (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  at,
                  d.partial
                    ? [styles.barPartial, { borderColor: strong ? chart.dataStrong : chart.dataPast }]
                    : { backgroundColor: d.value !== undefined && over(d.value) ? outOfRangeColor() : strong ? chart.dataStrong : chart.dataPast },
                  { height: phase(motion, (35 * i) / D, (35 * i + 450) / D, 0, h, easeOut) },
                ]}
              />
            )
          })}
          <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {!mini && goal !== undefined && (
              <>
                <Line x1={0} x2={plotW} y1={gy} y2={gy} stroke={chart.goal} strokeWidth={1} />
                <Label x={plotW + 6} y={goalSpots[0]}>
                  {goalWord}
                </Label>
                <Label x={plotW + 6} y={goalSpots[1]} weight="medium" tone={ink.detail}>
                  {goalText}
                </Label>
              </>
            )}
            {!mini &&
              band &&
              band.map((v) => (
                <Label key={v} x={plotW + 6} y={Math.max(y(v) + 4, 12)} weight="medium" tone={ink.detail}>
                  {format(v)}
                </Label>
              ))}
            {days.map((d, i) =>
              d.value === undefined && !d.partial && !d.future ? <Circle key={`none${i}`} cx={i * slot + slot / 2} cy={base - 3.5} r={3} fill={chart.rule} /> : null
            )}
            {days.map((d, i) => (
              <Label
                key={`day${i}`}
                x={i * slot + slot / 2}
                y={labelY}
                anchor="middle"
                weight={i === sel || d.today ? "medium" : "regular"}
                tone={i === sel || d.today ? ink.strong : d.future ? ink.tertiary : type.axis.color}
              >
                {dayLabel(d)}
              </Label>
            ))}
          </Svg>
        </View>
        {!mini &&
          days.map((d, i) =>
            d.future ? null : (
              <Pressable
                key={`hit${i}`}
                onPress={() => select(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: i === sel }}
                aria-selected={i === sel}
                accessibilityLabel={`${dayLabel(d)}, ${d.value !== undefined ? `${format(d.value)}${unit ? ` ${unit}` : ""}${d.partial ? ", partial" : ""}` : lowerFirst(emptyOf(d))}`}
                style={[styles.barHit, { left: i * slot, width: slot }]}
              />
            )
          )}
      </View>
    </View>
  )
}

/* ------------------------------------------------------ blood pressure -- */

export type PressureReading = {
  date: When
  /** The exact day or time, for the time scale. */
  at?: When
  systolic: number
  diastolic: number
  source?: string
  /** Against the target; above either number is out of range by default. */
  status?: Standing
}

export type PressureChartProps = {
  readings: PressureReading[]
  /** The doctor's targets; 120 and 80 by default. */
  target?: { systolic: number; diastolic: number }
  selected?: number
  onSelect?: (index: number) => void
  readout?: boolean
  legend?: boolean
  takeaway?: string
  height?: number
  playKey?: string
}

/** Blood pressure, both numbers (never one smoothed line): a capsule from
    the bottom number to the top one, the top a circle and the bottom a
    rounded square, so shape tells them apart, not colour. A fixed 60 to 160
    scale so weeks and people compare; the targets as labelled hairlines.
    Readings stay teal; only the selected one takes its status colour. */
export function PressureChart({
  readings: input,
  target = { systolic: 120, diastolic: 80 },
  selected,
  onSelect,
  readout = true,
  legend = true,
  takeaway,
  height = 192,
  playKey,
}: PressureChartProps) {
  const readings = sortByTime(input)
  const n = readings.length
  const latest = n - 1
  const [own, setOwn] = React.useState(latest)
  // A new result moves the selection to it.
  React.useEffect(() => setOwn(latest), [latest])
  const sel = clampIndex(selected ?? own, n)
  const select = (i: number) => {
    setOwn(i)
    if (i !== sel) onSelect?.(i)
  }
  const { width: W, onLayout } = useWidth()
  const pid = useSvgId("bp")
  const stagger = n > 1 ? Math.min(35, 450 / (n - 1)) : 0
  const D = 450 + stagger * Math.max(n - 1, 0) + 160
  const motion = useMotion(D, { playKey })
  // The scale's top and the targets label themselves in a gutter that fits
  // three digits.
  const gutter = gutterFor([String(target.systolic), String(target.diastolic), "160"], 30)
  const plotRight = W - gutter
  const x0 = 12
  const x1 = plotRight - 12
  const top = 10
  const base = height - 30
  const dense = n > 30
  const xs = n ? timeScale(timesOf(readings), x0, x1, dense ? 4 : 14) : []
  const scrub = useScrub(xs, select)
  if (!n)
    return (
      <View style={styles.frame}>
        <Takeaway>{takeaway}</Takeaway>
        <EmptyChart title="No readings yet" />
      </View>
    )

  let lo = 60
  let hi = 160
  while (Math.min(...readings.map((r) => r.diastolic)) < lo + 4) lo -= 20
  while (Math.max(...readings.map((r) => r.systolic)) > hi - 4) hi += 20
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (base - top)
  const statusAt = (r: PressureReading): Standing => r.status ?? (r.systolic >= target.systolic || r.diastolic >= target.diastolic ? "out" : "in")
  const cap = dense ? 4 : 6
  const dot = dense ? 3 : 4.5
  const sq = dense ? 6 : 8
  const ring = dense ? 0 : 2
  const r = readings[sel]
  const st = statusAt(r)
  const grow = (i: number): [number, number] => [(stagger * i) / D, (stagger * i + 450) / D]
  const marksAt = (i: number) => phase(motion, grow(i)[1], Math.min(grow(i)[1] + 160 / D, 1), 0, 1)
  const meta = [sel === latest ? "Latest" : undefined, showWhen(r.date), r.source].filter(Boolean).join(", ")
  const summary = `Blood pressure, ${n} ${n === 1 ? "reading" : "readings"}${n > 1 ? ` from ${spokenWhen(readings[0].date)} to ${spokenWhen(readings[latest].date)}` : ""}. Latest ${readings[latest].systolic} over ${readings[latest].diastolic} millimeters of mercury, ${lowerFirst(STATUS_WORD[statusAt(readings[latest])])}. Range below ${target.systolic} over ${target.diastolic}.`
  const valueText = `${spokenWhen(r.date)}, ${r.systolic} over ${r.diastolic}, ${lowerFirst(STATUS_WORD[st])}${r.source ? `, ${r.source}` : ""}`
  const lines = [
    { v: hi, tone: chart.track, label: type.axis.color, weight: "regular" as const },
    { v: target.systolic, tone: chart.goal, label: ink.detail, weight: "medium" as const },
    { v: target.diastolic, tone: chart.goal, label: ink.detail, weight: "medium" as const },
  ].filter((l, i, all) => l.v > lo && l.v <= hi && all.findIndex((m) => m.v === l.v) === i)

  return (
    <View style={styles.frame}>
      <Takeaway>{takeaway}</Takeaway>
      {readout && (
        <Readout meta={meta} value={`${r.systolic}/${r.diastolic}`} unit="mmHg" status={st} onLatest={sel !== latest ? () => select(latest) : undefined} />
      )}
      <View onLayout={onLayout} style={{ height }}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={W} height={height}>
            {lines.map((l) => (
              <React.Fragment key={l.v}>
                {l.tone === chart.track && <Line x1={0} x2={plotRight} y1={y(l.v)} y2={y(l.v)} stroke={l.tone} strokeWidth={1} />}
                <Label x={plotRight + 6} y={y(l.v) + 4} weight={l.weight} tone={l.label}>
                  {String(l.v)}
                </Label>
              </React.Fragment>
            ))}
            <Line x1={0} x2={plotRight} y1={base} y2={base} stroke={chart.track} strokeWidth={1} />
            <Line x1={xs[sel]} x2={xs[sel]} y1={top} y2={base} stroke={chart.rule} strokeWidth={1} />
            {readings.map((reading, i) => {
              const [a, b] = grow(i)
              const ys = y(reading.systolic)
              const yd = y(reading.diastolic)
              // The capsule runs from the top number's colour to the bottom
              // number's, each placed on the green, orange, red scale.
              return (
                <React.Fragment key={i}>
                  <Defs>
                    <LinearGradient id={`${pid}-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={ys} x2="0" y2={yd + 0.01}>
                      <Stop offset="0" stopColor={tintAt(reading.systolic, undefined, target.systolic)} stopOpacity={0.35} />
                      <Stop offset="1" stopColor={tintAt(reading.diastolic, undefined, target.diastolic)} stopOpacity={0.35} />
                    </LinearGradient>
                  </Defs>
                  <ARect
                    x={xs[i] - cap / 2}
                    width={cap}
                    rx={cap / 2}
                    y={phase(motion, a, b, yd, ys, easeOut)}
                    height={phase(motion, a, b, 0, Math.max(yd - ys, 0), easeOut)}
                    fill={`url(#${pid}-${i})`}
                  />
                </React.Fragment>
              )
            })}
            {/* The marks' white collars sit under the target lines, so a line
                stays whole between the marks and never looks dashed. */}
            {ring > 0 &&
              readings.map((reading, i) => (
                <AG key={i} opacity={marksAt(i)}>
                  <Circle cx={xs[i]} cy={y(reading.systolic)} r={dot + ring} fill={color.background} />
                  <Rect
                    x={xs[i] - sq / 2 - ring}
                    y={y(reading.diastolic) - sq / 2 - ring}
                    width={sq + ring * 2}
                    height={sq + ring * 2}
                    rx={3}
                    fill={color.background}
                  />
                </AG>
              ))}
            {lines
              .filter((l) => l.tone !== chart.track)
              .map((l) => (
                <Line key={l.v} x1={0} x2={plotRight} y1={y(l.v)} y2={y(l.v)} stroke={l.tone} strokeWidth={1} />
              ))}
            {readings.map((reading, i) => {
              const ys = y(reading.systolic)
              const yd = y(reading.diastolic)
              const on = i === sel
              const topTone = tintAt(reading.systolic, undefined, target.systolic)
              const bottomTone = tintAt(reading.diastolic, undefined, target.diastolic)
              // The selected reading as every chart marks a pick: a ring in
              // its colour round each mark, a white gap between (a rounded
              // square's ring round the bottom number's square).
              return (
                <AG key={i} opacity={marksAt(i)}>
                  {on && <Circle cx={xs[i]} cy={ys} r={9.25} fill={color.background} stroke={topTone} strokeWidth={2} />}
                  {on && <Rect x={xs[i] - 9.25} y={yd - 9.25} width={18.5} height={18.5} rx={6} fill={color.background} stroke={bottomTone} strokeWidth={2} />}
                  <Circle cx={xs[i]} cy={ys} r={dot} fill={topTone} />
                  <Rect x={xs[i] - sq / 2} y={yd - sq / 2} width={sq} height={sq} rx={2} fill={bottomTone} />
                </AG>
              )
            })}
            <AxisDates xs={xs} sel={sel} dates={readings.map((x) => showWhen(x.date))} width={W} y={height - 6} />
          </Svg>
        </View>
        <View
          style={StyleSheet.absoluteFill}
          {...scrub}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={summary}
          aria-valuetext={valueText}
          accessibilityActions={ADJUST}
          onAccessibilityAction={onAdjust(sel, n, select)}
        />
      </View>
      {legend && (
        <Legend
          items={[
            { kind: "dot", label: "Top number" },
            { kind: "square", label: "Bottom number" },
            { kind: "goal", label: `Range, below ${target.systolic}/${target.diastolic}` },
          ]}
        />
      )}
    </View>
  )
}

/* --------------------------------------------------------- score gauge -- */

export type ScoreGaugeProps = {
  score: number
  /** The top of the scale; 100 for the Inlay score, 5 for flourishing. */
  max?: number
  /** The last check-in's score: a short tick outside the arc. */
  previous?: number
  /** 184 on the score page, 88 on a home card. */
  size?: number
  /** Under the number: "out of 100". Hidden on a small gauge. */
  label?: string
  /** What is scored, for the spoken summary: "Inlay score". */
  name?: string
  format?: (v: number) => string
  /** Soft zones on a thin outer scale, for the flourishing speedometer that
      Dr. Blanchard asked for: still growing, and doing well. Never red. */
  bands?: { from: number; to: number; tone: "low" | "high" }[]
  /** A word under the label, with the bands: "Doing well". */
  word?: string
  /** The change since last time as a chip under the dial. A drop is never
      red. */
  change?: { text: string; direction: "up" | "down" | "same" }
  /** "0" and the top of the scale under the arc's ends, on a large gauge. */
  ends?: boolean
  playKey?: string
}

/** The Inlay score on an open 240° dial (a conversation about wellbeing, not
    a diagnosis, so no red, amber or green zones): teal on its tint, round
    caps, a white bead at the end, the previous check-in as a tick outside
    the arc, the number counting up in the middle. */
export function ScoreGauge({
  score,
  max = 100,
  previous,
  size = 184,
  label = `out of ${max}`,
  name = "Score",
  format = (v) => formatNumber(Math.round(v)),
  bands,
  word,
  change,
  ends = true,
  playKey,
}: ScoreGaugeProps) {
  const big = size >= 140
  const stroke = big ? 14 : size >= 100 ? 12 : 8
  const room = bands?.length ? 9 : big ? 10 : 1
  const r = size / 2 - stroke / 2 - room
  const cx = size / 2
  const cy = size / 2
  const frac = clamp(score / max, 0, 1)
  const C = 2 * Math.PI * r
  const arc = (240 / 360) * C * frac
  const endDeg = -120 + 240 * frac
  const D = 700
  const motion = useMotion(D, { playKey })
  const svgH = big ? Math.round(size * 0.9) : Math.ceil(cy + r * 0.5 + stroke / 2 + 2)
  const bead = motion.done
    ? `rotate(${endDeg.toFixed(2)} ${cx} ${cy})`
    : motion.t.interpolate({
        inputRange: [0, 1],
        outputRange: [`rotate(-120 ${cx} ${cy})`, `rotate(${endDeg.toFixed(2)} ${cx} ${cy})`],
        easing: easeOut,
        extrapolate: "clamp",
      })
  const prevDeg = previous !== undefined ? -120 + 240 * clamp(previous / max, 0, 1) : undefined
  const endPoints = [polar(cx, cy, r, -120), polar(cx, cy, r, 120)]
  const labelY = cy + r * 0.5 + stroke / 2 + 16
  const numberStyle = big ? styles.gaugeNumber : styles.gaugeNumberSmall
  const centreTop = big ? cy - (word ? 36 : 30) : cy - 15
  // The dial in words, with the change its chip shows.
  const summary = `${name}, ${format(score)} out of ${format(max)}${previous !== undefined ? `, ${format(previous)} last time` : ""}${word ? `, ${lowerFirst(word)}` : ""}.${change ? ` ${change.text}.` : ""}`

  return (
    <View style={styles.gauge} accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={{ width: size, height: svgH }}>
        <Svg width={size} height={svgH}>
          {bands?.map((band, i) => {
            const from = -120 + 240 * clamp(band.from / max, 0, 1)
            const to = -120 + 240 * clamp(band.to / max, 0, 1)
            return to - from > 1 ? (
              <Path
                key={i}
                d={arcPath(cx, cy, r + stroke / 2 + 5, from + 0.6, to - 0.6)}
                stroke={band.tone === "high" ? chart.gaugeHigh : chart.gaugeLow}
                strokeWidth={4}
                fill="none"
              />
            ) : null
          })}
          <Path d={arcPath(cx, cy, r, -120, 120)} stroke={chart.dataTrack} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          {frac > 0 && (
            <ACircle
              cx={cx}
              cy={cy}
              r={r}
              stroke={chart.data}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${C}`}
              strokeDashoffset={phase(motion, 0, 1, arc, 0, easeOut)}
              opacity={phase(motion, 0, 0.03, 0, 1)}
              transform={`rotate(150 ${cx} ${cy})`}
            />
          )}
          {frac > 0 && (
            <AG transform={bead} opacity={phase(motion, 0, 0.03, 0, 1)}>
              <Circle cx={cx} cy={cy - r} r={big ? 3 : 2} fill={color.background} />
            </AG>
          )}
          {big && prevDeg !== undefined && (
            <Line
              x1={polar(cx, cy, r + stroke / 2 + 3, prevDeg)[0]}
              y1={polar(cx, cy, r + stroke / 2 + 3, prevDeg)[1]}
              x2={polar(cx, cy, r + stroke / 2 + 9, prevDeg)[0]}
              y2={polar(cx, cy, r + stroke / 2 + 9, prevDeg)[1]}
              stroke={color.text}
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
          {big && ends && (
            <>
              <Label x={endPoints[0][0]} y={labelY} anchor="middle">
                0
              </Label>
              <Label x={endPoints[1][0]} y={labelY} anchor="middle">
                {formatNumber(max)}
              </Label>
            </>
          )}
        </Svg>
        <View style={[styles.gaugeCentre, { top: centreTop }]} pointerEvents="none">
          <Counter motion={motion} value={score} format={format} style={numberStyle} />
          {big && !!label && <Text style={styles.gaugeLabel}>{label}</Text>}
          {big && !!word && <Text style={styles.gaugeWord}>{word}</Text>}
        </View>
      </View>
      {change && (
        <View style={[styles.changeChip, change.direction === "up" ? styles.changeUp : styles.changeFlat]}>
          {change.direction !== "same" && <TrendArrow trend={change.direction} size={12} tone={change.direction === "up" ? ink.good : ink.detail} />}
          <Text style={[styles.changeText, change.direction === "up" && styles.changeTextUp]}>{change.text}</Text>
        </View>
      )}
    </View>
  )
}

/* ------------------------------------------------------- score history -- */

export type CheckIn = { date: When; value: number; label?: string }

export type ScoreHistoryProps = {
  checkIns: CheckIn[]
  max?: number
  selected?: number
  onSelect?: (index: number) => void
  takeaway?: string
  height?: number
  playKey?: string
}

/** The Inlay score at each check-in, as columns on a fixed 0 to 100 scale (an
    automatic scale would turn 3 points into a cliff): earlier check-ins
    light, the latest teal with its value over it, the first with its value
    in grey; with four check ins or fewer every column carries its value.
    One score is a sentence, not a chart (F.3). */
export function ScoreHistory({ checkIns, max = 100, selected, onSelect, takeaway, height = 150, playKey }: ScoreHistoryProps) {
  const list = sortByTime(checkIns)
  const n = list.length
  const latest = n - 1
  const [own, setOwn] = React.useState(latest)
  // A new result moves the selection to it.
  React.useEffect(() => setOwn(latest), [latest])
  const sel = clampIndex(selected ?? own, n)
  const select = (i: number) => {
    setOwn(i)
    if (i !== sel) onSelect?.(i)
  }
  const { width: W, onLayout } = useWidth()
  const D = 450 + 35 * Math.max(n - 1, 0)
  const motion = useMotion(D, { playKey })
  if (n < 2)
    return (
      <View style={styles.frame}>
        <Takeaway>{takeaway}</Takeaway>
        <Note>{n ? "One score so far." : "No scores yet."}</Note>
      </View>
    )

  const gutter = gutterFor([formatNumber(max), formatNumber(max / 2)], 26)
  const plotW = W - gutter
  const slot = plotW / n
  const bw = Math.min(24, slot * 0.6)
  const top = 22
  const base = height - 32
  const y = (v: number) => base - (clamp(v, 0, max) / max) * (base - top)
  const years = new Set(list.map((c) => new Date(parseWhen(c.date) ?? 0).getFullYear())).size > 1
  const labelOf = (c: CheckIn, i: number) => {
    if (c.label) return c.label
    if (typeof c.date === "string" && /^today$/i.test(c.date.trim())) return "Today"
    const t = parseWhen(c.date)
    if (t === undefined) return String(c.date)
    const d = new Date(t)
    return years && (i === 0 || d.getMonth() === 0) && slot >= 50 ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : MONTHS[d.getMonth()]
  }
  // Every value with a few check ins (a column with no number reads as
  // lost data); past four, the first, the latest and the one picked.
  const valued = new Set(n <= 4 ? list.map((_, i) => i) : [0, latest, sel])
  // The columns in words: every check in with its value when each column
  // shows one, else the first and the latest.
  const summary =
    n <= 4
      ? `${n} check ins, out of ${max}: ${list.map((c, i) => `${labelOf(c, i)}, ${formatNumber(c.value)}`).join("; ")}.`
      : `${n} check ins from ${spokenWhen(list[0].date)} to ${spokenWhen(list[latest].date)}, from ${formatNumber(list[0].value)} to ${formatNumber(list[latest].value)} out of ${max}.`

  return (
    <View style={styles.frame}>
      <Takeaway>{takeaway}</Takeaway>
      <View onLayout={onLayout} style={{ height }}>
        <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={summary}>
          <Svg width={W} height={height} style={StyleSheet.absoluteFill}>
            {[max / 2, max].map((v) => (
              <React.Fragment key={v}>
                <Line x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke={chart.track} strokeWidth={1} />
                <Label x={plotW + 6} y={y(v) + 4}>
                  {formatNumber(v)}
                </Label>
              </React.Fragment>
            ))}
            <Line x1={0} x2={plotW} y1={base} y2={base} stroke={color.border} strokeWidth={1} />
          </Svg>
          {list.map((c, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  left: i * slot + (slot - bw) / 2,
                  bottom: height - base,
                  width: bw,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: i === sel ? chart.data : chart.dataSoft,
                  height: phase(motion, (35 * i) / D, (35 * i + 450) / D, 0, Math.max(base - y(c.value), 2), easeOut),
                },
              ]}
            />
          ))}
          <Svg width={W} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {list.map((c, i) =>
              valued.has(i) ? (
                <AG key={`v${i}`} opacity={phase(motion, (35 * i + 450) / D - 0.05, (35 * i + 450) / D, 0, 1)}>
                  <Label
                    x={i * slot + slot / 2}
                    y={y(c.value) - 7}
                    anchor="middle"
                    weight={i === sel || i === latest ? "semibold" : "regular"}
                    tone={i === sel || i === latest ? ink.strong : type.axis.color}
                  >
                    {formatNumber(c.value)}
                  </Label>
                </AG>
              ) : null
            )}
            {list.map((c, i) => (
              <Label
                key={`l${i}`}
                x={i * slot + slot / 2}
                y={height - 12}
                anchor="middle"
                weight={i === latest || i === sel ? "medium" : "regular"}
                tone={i === latest || i === sel ? ink.strong : type.axis.color}
              >
                {labelOf(c, i)}
              </Label>
            ))}
          </Svg>
        </View>
        {list.map((c, i) => (
          <Pressable
            key={`hit${i}`}
            onPress={() => select(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: i === sel }}
            aria-selected={i === sel}
            accessibilityLabel={`${labelOf(c, i)}, ${formatNumber(c.value)} out of ${max}`}
            style={[styles.barHit, { left: i * slot, width: slot }]}
          />
        ))}
      </View>
    </View>
  )
}

/* ---------------------------------------------------- composition bar -- */

/** The record at a glance: one 8 pt bar split in range, borderline and out
    of range, with 2 pt gaps and counts in the legend, so nothing rests on
    colour alone. */
export function CompositionBar({
  inRange: inCount,
  borderline = 0,
  out,
  height = 8,
  legend = true,
  takeaway,
  playKey,
  style,
}: {
  inRange: number
  borderline?: number
  out: number
  height?: number
  legend?: boolean
  takeaway?: string
  playKey?: string
  style?: StyleProp<ViewStyle>
}) {
  const { width, onLayout } = useWidth()
  const motion = useMotion(450, { playKey })
  const parts = [
    { key: "in", n: inCount, tone: chart.data, label: `${inCount} in range` },
    { key: "borderline", n: borderline, tone: chart.borderline, label: `${borderline} borderline` },
    { key: "out", n: out, tone: outOfRangeColor(), label: `${out} out of range` },
  ].filter((p) => p.n > 0)
  const summary = parts.map((p) => p.label).join(", ")
  return (
    <View style={[styles.frame, style]}>
      <Takeaway>{takeaway}</Takeaway>
      {/* The bar and its legend read as one image with the counts. */}
      <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={summary || "No results yet"}>
        <View onLayout={onLayout} style={[styles.compTrack, { height, borderRadius: height / 2 }, !parts.length && styles.compEmpty]}>
          <Animated.View style={[styles.compReveal, { width: phase(motion, 0, 1, 0, width, easeOut) }]}>
            <View style={[styles.compRow, { width, height }]}>
              {parts.map((p) => (
                <View key={p.key} style={{ flexGrow: p.n, flexBasis: 0, minWidth: height, backgroundColor: p.tone }} />
              ))}
            </View>
          </Animated.View>
        </View>
        {legend && parts.length > 0 && (
          <View style={styles.legend}>
            {parts.map((p) => (
              <View key={p.key} style={styles.legendItem}>
                {p.key === "borderline" ? <StatusMark status="borderline" /> : <View style={[styles.compDot, { backgroundColor: p.tone }]} />}
                <Text style={styles.compText}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

/* -------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  frame: { gap: space.item },
  loading: { opacity: 0.5 },
  pressed: { opacity: 0.7 },

  takeaway: { ...type.body },

  status: { flexDirection: "row", alignItems: "center", gap: space.mark, flexShrink: 1 },
  statusText: { ...type.metaStrong, flexShrink: 1 },

  readout: { flexDirection: "row", alignItems: "center", gap: space.item },
  readoutBody: { flex: 1, gap: space.line },
  readoutMeta: { ...type.meta },
  readoutLine: { flexDirection: "row", alignItems: "center", gap: space.inline, flexWrap: "wrap" },
  readoutValue: { ...type.stat },
  readoutDim: { fontFamily: font.medium, color: ink.tertiary },
  readoutUnit: { ...type.unit },
  readoutTrailing: { ...type.meta },
  latest: { ...type.link },

  // The marker plot (BiomarkerTrend): the readout's day over its value
  // (16 semibold), the plot over its first and latest dates 8 apart.
  trendReadout: { gap: space.stack },
  trendPlotWrap: { gap: space.inline },
  trendPlot: { borderLeftWidth: 0.7, borderBottomWidth: 0.7, borderColor: chart.edge },
  trendDates: { flexDirection: "row", justifyContent: "space-between" },
  // The small white label beside the selected result (Figma tooltip).
  tip: {
    position: "absolute",
    gap: space.stack,
    paddingHorizontal: 6,
    paddingVertical: space.stack,
    borderRadius: 4,
    backgroundColor: color.background,
    boxShadow: "0 12px 8px rgba(16, 24, 40, 0.08), 2px 0 3px rgba(16, 24, 40, 0.04)",
  },
  tipLabel: { ...type.caption, color: "#818181" },
  tipValue: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: ink.strong },
  tipUnit: { ...type.caption },
  tipPointer: { position: "absolute", top: 15, width: 8, height: 8, backgroundColor: color.background, transform: [{ rotate: "45deg" }] },
  tipPointerRight: { right: -4 },
  tipPointerLeft: { left: -4 },

  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: space.item, rowGap: space.mark },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.mark },
  legendText: { ...type.label },
  note: { ...type.label },

  empty: { alignItems: "center", justifyContent: "center", gap: space.line, paddingHorizontal: space.card, paddingVertical: 20, borderRadius: 14, backgroundColor: surface.inset },
  emptyTitle: { ...type.title, textAlign: "center" },
  emptyLine: { ...type.label, textAlign: "center" },

  // 172 tall at least, taller with larger text (FINAL-SPEC F.3), with a
  // compact card's padding.
  tile: {
    minHeight: 172,
    paddingTop: space.compact,
    paddingHorizontal: space.compact,
    paddingBottom: 10,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: chart.edge,
    backgroundColor: color.background,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
  },
  // The whole row: the words 150 wide on the left, the graph about 156 by
  // 64 on the right.
  tileWide: { minHeight: 112, paddingBottom: space.compact, flexDirection: "row", alignItems: "center", gap: space.inline },
  tilePressed: { opacity: 0.85 },
  tileTextWide: { width: 150 },
  tileName: { marginTop: space.inline, ...type.title },
  tileValue: { marginTop: space.mark, ...type.stat },
  tileUnit: { ...type.unit },
  tileDirection: { flexDirection: "row", alignItems: "flex-start", gap: space.stack, marginTop: space.line },
  tileArrow: { height: 16, justifyContent: "center" },
  tileDirectionText: { flexShrink: 1, ...type.label },
  tileGraph: { height: 40, marginTop: "auto", paddingTop: 0 },
  tileGraphWide: { flex: 1, height: 64, justifyContent: "center" },

  allHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  allTitle: { flexShrink: 1, ...type.title },
  allLine: { marginTop: space.line, ...type.label },
  allFoot: { marginTop: "auto", gap: space.item, paddingBottom: 6 },

  grid: { gap: space.item },
  gridRow: { flexDirection: "row", gap: space.item },
  // minWidth 0: a chart that measures its own width never props its cell
  // wider than its neighbour.
  gridCell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },

  goals: { gap: space.card },
  goalRow: { gap: space.inline },
  goalPress: { minHeight: 44, justifyContent: "center" },
  goalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  goalName: { flexShrink: 0, maxWidth: "45%", ...type.title },
  goalRight: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.mark, flexShrink: 1 },
  // The amount in the second line's grey, its number as a value, on one
  // baseline: "80 of 110 g".
  goalAmount: { flexShrink: 1, textAlign: "right", ...type.label, lineHeight: type.value.lineHeight, fontVariant: ["tabular-nums"] },
  goalActual: { ...type.value },
  goalTag: { borderRadius: 999, paddingHorizontal: space.inline, paddingVertical: space.line, backgroundColor: color.page },
  goalTagText: { ...type.tag },
  goalTrack: { height: 6, borderRadius: 3, backgroundColor: chart.track },
  goalZone: { position: "absolute", top: 0, height: 6, borderRadius: 3, backgroundColor: chart.targetZone },
  goalFill: { position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3, backgroundColor: chart.data },
  goalExcess: { position: "absolute", top: 0, height: 6, borderRadius: 3, backgroundColor: chart.borderline },
  goalTick: { position: "absolute", top: -5, width: 4, height: 16, borderRadius: 2, backgroundColor: color.background },
  goalTickInner: { position: "absolute", left: 1, top: 1, width: 2, height: 14, borderRadius: 1, backgroundColor: ink.detail, opacity: 0.6 },
  goalNote: { ...type.meta, textAlign: "right" },
  goalMet: { ...type.metaStrong },
  goalWords: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.stack, minHeight: 16 },

  // A ring's number by its size: display at 120 and up, hero at 88 and up,
  // stat below that, a caption in a 40 pt ring.
  ringCentre: { alignItems: "center", justifyContent: "center", gap: 1 },
  ringRow: { flexDirection: "row", alignItems: "baseline" },
  ringNumber: { ...type.hero },
  ringNumberBig: { ...type.display },
  ringNumberSmall: { ...type.stat },
  ringNumberTiny: { ...type.captionStrong, fontFamily: font.semibold, color: ink.strong },
  ringPercent: { marginLeft: 1, ...type.unit },
  ringPercentBig: { ...type.unitLarge },
  ringPercentTiny: { marginLeft: 0, fontSize: 8, lineHeight: 10 },
  ringLabel: { ...type.label },
  ringLabelTiny: { ...type.caption },
  ringCaption: { ...type.caption },

  bar: { position: "absolute" },
  // A partial day: a teal edge round a pale fill, open at the baseline.
  barPartial: { backgroundColor: chart.dataTrack, borderWidth: 1.5, borderBottomWidth: 0 },
  // A day still to come: an empty column in the track grey.
  barAhead: { backgroundColor: chart.track },
  barHit: { position: "absolute", top: 0, bottom: 0 },

  gauge: { alignItems: "center", gap: space.item },
  gaugeCentre: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  gaugeNumber: { ...type.display },
  gaugeNumberSmall: { ...type.hero },
  gaugeLabel: { ...type.label },
  gaugeWord: { marginTop: space.line, ...type.metaStrong },
  changeChip: { flexDirection: "row", alignItems: "center", gap: space.stack, height: 24, paddingHorizontal: 10, borderRadius: 12 },
  changeUp: { backgroundColor: color.okTint },
  changeFlat: { backgroundColor: color.page },
  changeText: { ...type.metaStrong },
  changeTextUp: { color: ink.good },

  compTrack: { overflow: "hidden", backgroundColor: color.background },
  compEmpty: { backgroundColor: chart.track },
  compReveal: { height: "100%", overflow: "hidden" },
  compRow: { flexDirection: "row", gap: 2 },
  compDot: { width: 8, height: 8, borderRadius: 4 },
  compText: { ...type.label },
})
