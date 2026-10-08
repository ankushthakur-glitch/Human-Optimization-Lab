"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { toast } from "@/design-system/ui/sonner"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import { HoverCardSection } from "@/design-system/ui/hover-card"
import { FOCUS, StatusTrace, statusColors } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OrderRow } from "@/components/patient-dashboard/model"
import {
  isInside,
  numericHistory,
  targetText,
  trendOf as markerTrend,
} from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker } from "@/components/patient-dashboard/optimization/types"
import {
  type Clock,
  type MedCase,
  changeBetween,
  comparable,
  isOverdue,
  isRising,
  rangeText,
  readingStatus,
  shortSource,
  statusOf,
  trendOf,
} from "@/components/patient-dashboard/rules"
import type {
  LabResult,
  OutsideEncounter,
} from "@/components/patient-dashboard/types"
import {
  TONE,
  type ToneKey,
} from "@/components/patient-dashboard/widgets/palette"
import {
  PeekChart,
  monotone,
} from "@/components/patient-dashboard/widgets/peek-chart"
import { Pill } from "@/components/patient-dashboard/widgets/status"

/* Dashboard version 2, from the 5 Oct discovery call: the front page tells
   the doctor's story of what changed. Ed's order of what a physician needs
   first: biomarkers out of range with their trend, medication
   discrepancies (the doctor's list, the change another record shows, and
   what the patient confirmed in the app), orders not fulfilled, and care
   outside the practice (ED visits, admissions, abnormal reports). A widget
   shows only when it has something in it, so the page differs patient by
   patient; the most urgent widget rises to the top. Results show their
   last readings as dots with values inline (5.3, 5.7, 5.9), and hovering
   them opens a small trend window, as in the Weather app; clicking opens
   Lab results. An optimization member's enrolled plans follow. */

/* ------------------------------------------------------------ markers -- */

export type Point = {
  date: string
  value: number
  out: boolean
  source: string
}

export type Marker = {
  id: string
  name: string
  unit: string
  points: Point[]
  low?: number
  high?: number
  range: string
  flag: "Critical" | "High" | "Low" | "Watch"
  /** The latest reading came in after the last review. */
  isNew: boolean
  change?: { text: string; worse: boolean }
  trend: "worsening" | "improving" | "stable" | "new"
  rising: boolean
}

const UNITLESS = /^(ratio|index|qualitative|genotype)$/
const unitOf = (u: string) => (UNITLESS.test(u) ? "" : u)
export const after = (date: string, cutoff?: string) =>
  !cutoff || date.slice(0, 10) > cutoff.slice(0, 10)
/** "Sinus tachycardia" as "sinus tachycardia"; an acronym keeps its case. */
export const lowerFirst = (t: string) =>
  /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t

const TREND_RANK = { worsening: 0, new: 1, stable: 2, improving: 3 } as const
const lastDate = (m: Marker) => m.points[m.points.length - 1].date

/** New readings first, then the ones getting worse, then the most recent. */
export const byChange = (a: Marker, b: Marker) =>
  Number(b.isNew) - Number(a.isNew) ||
  TREND_RANK[a.trend] - TREND_RANK[b.trend] ||
  lastDate(b).localeCompare(lastDate(a))

/** A lab from the record: out of range, or in range and heading out. */
export function fromLab(
  lab: LabResult,
  watch: boolean,
  cutoff?: string
): Marker | undefined {
  const readings = comparable(lab)
  const last = readings[readings.length - 1]
  if (!last) return undefined
  const prev = readings[readings.length - 2]
  const status = statusOf(lab)
  return {
    id: lab.code,
    name: lab.name,
    unit: lab.unit,
    points: readings.map((r) => ({
      date: r.date,
      value: r.value,
      out: readingStatus(lab, r) !== "In range",
      source: shortSource(r.source),
    })),
    low: lab.refLow,
    high: lab.refHigh,
    range: rangeText(lab),
    flag: watch ? "Watch" : status === "In range" ? "High" : status,
    isNew: after(last.date, cutoff),
    change: prev ? changeBetween(lab, prev.value, last.value) : undefined,
    trend: trendOf(lab),
    rising: isRising(lab),
  }
}

/** A marker from the optimization tracker, judged on its HOL target. */
export function fromBiomarker(
  b: Biomarker,
  cutoff?: string,
  watch = false
): Marker | undefined {
  const h = numericHistory(b)
  const last = h[h.length - 1]
  if (!last) return undefined
  const prev = h[h.length - 2]
  const hasTarget = b.targetLow != null || b.targetHigh != null
  const trend = markerTrend(b)
  const unit = unitOf(b.unit)
  const amount = prev ? Math.abs(last.n - prev.n) : 0
  return {
    id: b.name,
    name: b.name,
    unit,
    points: h.map((p) => ({
      date: p.date,
      value: p.n,
      out: !isInside(b, p.n),
      source: shortSource(p.source || "Tracker"),
    })),
    low: hasTarget ? b.targetLow : b.labLow,
    high: hasTarget ? b.targetHigh : b.labHigh,
    range: targetText(b),
    flag: watch ? "Watch" : b.status === "Low" ? "Low" : "High",
    isNew: after(last.date, cutoff),
    change: prev
      ? {
          text:
            amount === 0
              ? "No change"
              : `${last.n > prev.n ? "Up" : "Down"} ${+amount.toFixed(2)}${unit ? ` ${unit}` : ""}`,
          worse: trend === "worsening",
        }
      : undefined,
    trend,
    rising: Boolean(prev && last.n > prev.n),
  }
}

export const FLAG_TONE: Record<Marker["flag"], ToneKey> = {
  Critical: "red",
  High: "red",
  Low: "red",
  Watch: "orange",
}

/* A result's latest readings as a small status trend: the last three in
   a row (eight, to scale in time, in a hover window) on a smooth line with
   a soft shadow and a fading area, each dot, the line into it and the area
   under it in the reading's status colour (dashboard-kit-v2/status-trend:
   green in range or moving toward it, orange at the edge, red out). Each
   value sits over its dot. Hovering, or focusing and using the arrow keys,
   picks a reading and shows its date and source. */
export function DotTrend({
  points,
  low,
  high,
  large,
  label,
}: {
  points: Point[]
  low?: number
  high?: number
  large?: boolean
  label: string
  /** Kept for callers; status colours are always the subtle set. */
  subtle?: boolean
}) {
  const count = large ? 8 : 3
  const shown = points.slice(-count)
  const n = shown.length
  /* Status over the whole series, so the first reading shown keeps the
     direction it came in on. */
  const colors = statusColors(
    points.map((p) => p.value),
    low,
    high,
    points.map((p) => p.out)
  ).slice(-count)
  const [sel, setSel] = React.useState<number | null>(null)
  const W = large ? 272 : 176
  const H = large ? 112 : 52
  const top = 18
  const bottom = large ? 24 : 4
  const side = 14
  const values = shown.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  const pad = (max - min || Math.abs(max) || 1) * 0.25
  min -= pad
  max += pad
  const ts = shown.map((p) => new Date(p.date.slice(0, 10)).getTime())
  /* Inline, the readings sit evenly so every value has room; in the
     hover window they sit to scale in time, at least 18 apart. */
  const xs =
    n === 1
      ? [W / 2]
      : large
        ? ts.map(
            (t) =>
              side + ((t - ts[0]) / (ts[n - 1] - ts[0] || 1)) * (W - side * 2)
          )
        : shown.map((_, i) => side + (i * (W - side * 2)) / (n - 1))
  for (let i = 1; i < n; i++) xs[i] = Math.max(xs[i], xs[i - 1] + 18)
  for (let i = n - 1; i >= 0; i--)
    xs[i] = Math.min(xs[i], W - side - (n - 1 - i) * 18)
  const y = (v: number) =>
    top + (1 - (v - min) / (max - min)) * (H - top - bottom - 8)
  const xy = shown.map((p, i): [number, number] => [xs[i], y(p.value)])
  const latest = n - 1
  const active = sel ?? latest
  const picked = shown[active]

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs(xs[best] - px)) best = i
    })
    setSel(best)
  }
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setSel((i) => Math.max(0, (i ?? latest) - 1))
    else if (e.key === "ArrowRight")
      setSel((i) => Math.min(latest, (i ?? latest) + 1))
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span className="relative inline-flex shrink-0">
      <svg
        role="img"
        tabIndex={0}
        aria-label={`${label}. ${picked.value} on ${usDay(picked.date.slice(0, 10))}`}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={cn(
          "shrink-0 overflow-visible rounded-md outline-none",
          FOCUS
        )}
        onPointerMove={pick}
        onPointerLeave={() => setSel(null)}
        onFocus={() => setSel(latest)}
        onBlur={() => setSel(null)}
        onKeyDown={keys}
      >
        {sel !== null && (
          <line
            x1={xs[active]}
            x2={xs[active]}
            y1={xy[active][1] + 6}
            y2={H - (large ? bottom : 0)}
            stroke={colors[active]}
            strokeOpacity={0.45}
            strokeDasharray="2 3"
          />
        )}
        <StatusTrace
          xy={xy}
          colors={colors}
          d={monotone(xy)}
          bottom={H - (large ? bottom : 0)}
          strokeWidth={2}
          dividers={false}
          shadow
          fade={[0.3, 0.02]}
        />
        {shown.map((p, i) => {
          const on = i === active
          const end = i === latest
          return (
            <g key={`${p.date}-${i}`}>
              {on && (
                <circle
                  cx={xs[i]}
                  cy={xy[i][1]}
                  r={8.5}
                  fill={colors[i]}
                  opacity={0.16}
                />
              )}
              <circle
                cx={xs[i]}
                cy={xy[i][1]}
                r={on || end ? 4.25 : 3}
                fill={end ? colors[i] : "var(--card)"}
                stroke={end ? "var(--card)" : colors[i]}
                strokeWidth={end ? 1.5 : 2}
              />
              <text
                x={xs[i]}
                y={xy[i][1] - (on || end ? 10 : 8)}
                textAnchor="middle"
                className={cn(
                  "tabular-nums",
                  on || end
                    ? "fill-foreground text-[11px] font-semibold"
                    : "fill-muted-foreground text-[10px]"
                )}
              >
                {p.value}
              </text>
            </g>
          )
        })}
        {large &&
          shown.map((p, i) =>
            i === 0 || i === latest ? (
              <text
                key={`d-${p.date}-${i}`}
                x={xs[i]}
                y={H - 4}
                textAnchor={n === 1 ? "middle" : i === 0 ? "start" : "end"}
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {`${new Date(`${p.date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short" })} '${p.date.slice(2, 4)}`}
              </text>
            ) : null
          )}
      </svg>
      {sel !== null && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-md bg-popover px-2 py-1.5 whitespace-nowrap shadow-[0_12px_8px_rgba(16,24,40,.08),2px_0_3px_rgba(16,24,40,.04)] ring-1 ring-border/60"
          style={{
            left: `${(xs[active] / W) * 100}%`,
            top: `calc(100% + 6px)`,
          }}
        >
          <span className="text-[10px] leading-3.5 text-muted-foreground tabular-nums">
            {active === latest ? "Latest, " : ""}
            {usDay(picked.date.slice(0, 10))}
            {picked.source ? `, ${picked.source}` : ""}
          </span>
          <span className="text-sm leading-4.5 font-medium tabular-nums">
            {picked.value}
          </span>
        </span>
      )}
    </span>
  )
}

/** The small trend window a row's dots open on hover or focus. */
export function TrendWindow({ m, onOpen }: { m: Marker; onOpen: () => void }) {
  const last = m.points[m.points.length - 1]
  const prev = m.points[m.points.length - 2]
  return (
    <div className="flex flex-col">
      <HoverCardSection>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold">
            {m.name}
          </span>
          <Pill tone={FLAG_TONE[m.flag]}>{m.flag}</Pill>
        </div>
      </HoverCardSection>
      <HoverCardSection className="gap-2.5">
        <PeekChart
          points={m.points}
          low={m.low}
          high={m.high}
          unit={m.unit}
          digits={m.points.some((p) => !Number.isInteger(p.value)) ? 1 : 0}
        />
        <p className="text-[13px] leading-5 text-foreground/80">
          {prev
            ? `${last.value > prev.value ? "Up" : last.value < prev.value ? "Down" : "Unchanged"} from ${prev.value} on ${usDay(prev.date.slice(0, 10))}, ${last.source}.`
            : `First reading on record, ${last.source}.`}
        </p>
      </HoverCardSection>
      <HoverCardSection title="Details">
        <dl className="flex flex-col text-[13px] tabular-nums">
          {[
            m.range ? { k: "Range", v: m.range } : null,
            m.change
              ? {
                  k: "Since last reading",
                  v: m.change.text,
                  red: m.change.worse,
                }
              : null,
            { k: "Readings", v: String(m.points.length) },
          ]
            .filter((r): r is { k: string; v: string; red?: boolean } =>
              Boolean(r)
            )
            .map((r) => (
              <div
                key={r.k}
                className="flex items-baseline justify-between gap-4 border-t border-border/50 py-1.5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <dt className="text-muted-foreground">{r.k}</dt>
                <dd className={cn("font-medium", r.red && TONE.red.text)}>
                  {r.v}
                </dd>
              </div>
            ))}
        </dl>
      </HoverCardSection>
      <HoverCardSection>
        <Button variant="outline" size="sm" onClick={onOpen}>
          Open lab results
        </Button>
      </HoverCardSection>
    </div>
  )
}

/* -------------------------------------------------------- medications -- */

export function caseTag(c: MedCase): { tone: ToneKey; label: string } {
  if (c.allergy) return { tone: "red", label: `Matches ${c.allergy} allergy` }
  if (c.other && c.practice) return { tone: "orange", label: "Dose differs" }
  if (c.other) return { tone: "orange", label: "Not on your list" }
  if (c.answer?.answer === "Not taking")
    return { tone: "violet", label: "Patient not taking" }
  return { tone: "violet", label: "Taken differently" }
}

/* ------------------------------------------------------------- orders -- */

export function orderState(o: OrderRow): {
  tone: ToneKey
  label: string
  days?: number
} {
  const c: Clock = o.clock
  if (c.kind === "future")
    return { tone: "violet", label: `Scheduled ${usDay(c.scheduledAt)}` }
  const label = o.scheduledAt ? "Scheduled, not done" : "Not scheduled"
  return {
    tone: isOverdue(c) ? "red" : "orange",
    label: isOverdue(c) ? `${label}, overdue` : label,
    days: c.day,
  }
}

/* ------------------------------------------------------- outside care -- */

export const EVENT_TONE: Record<OutsideEncounter["event"], ToneKey> = {
  "ED visit": "red",
  Admission: "red",
  Discharge: "orange",
  "Urgent care": "orange",
  "Specialist visit": "blue",
}

export const isAcute = (e: OutsideEncounter) =>
  e.event === "ED visit" || e.event === "Admission"

/** Mark reviewed (or Validate record on a first review), for the dashboard's quiet state. */
export function ReviewButton({ dash }: { dash: Dashboard }) {
  if (!dash.ready) return null
  const first = dash.model.validation
  return (
    <Button
      size="sm"
      onClick={() => {
        dash.actions.review()
        toast.success(first ? "Record validated" : "Marked reviewed")
      }}
    >
      {first ? "Validate record" : "Mark reviewed"}
    </Button>
  )
}
