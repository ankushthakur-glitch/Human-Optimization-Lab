"use client"

import * as React from "react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Hospital01Icon,
  Medicine02Icon,
  TaskDaily01Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardSection,
  HoverCardTrigger,
} from "@/design-system/ui/hover-card"
import { toast } from "@/design-system/ui/sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import {
  FOCUS,
  KitIcon,
  StatTile,
  type Tint,
  TrendWord,
  StatusTrace,
  statusColors,
} from "@/components/dashboard-kit-v2"
import { NOW, usDay } from "@/components/provider/mock-clock"
import type { WorkItem } from "@/components/provider/work-items"
import type {
  DashboardModel,
  OrderRow,
} from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import type { Optimization } from "@/components/patient-dashboard/optimization/model"
import {
  isInside,
  markerByName,
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
  doseText,
  encounterKey,
  isOverdue,
  isRising,
  rangeText,
  readingStatus,
  reportKey,
  shortSource,
  statusOf,
  trendOf,
} from "@/components/patient-dashboard/rules"
import type {
  ClinicalReport,
  LabResult,
  OutsideEncounter,
} from "@/components/patient-dashboard/types"
import {
  CardSkeleton,
  HeaderLink,
  type OpenSection,
  Quiet,
} from "@/components/patient-dashboard/ui"
import {
  TYPE_SCALE,
  Widget,
  WidgetTabs,
} from "@/components/patient-dashboard/widgets/kit"
import {
  TONE,
  type ToneKey,
} from "@/components/patient-dashboard/widgets/palette"
import { ProgramPanel } from "@/components/patient-dashboard/widgets/program-panel"
import {
  PROGRAMS,
  buildProgram,
} from "@/components/patient-dashboard/widgets/programs"
import { PeekChart, monotone } from "@/components/patient-dashboard/widgets/peek-chart"
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
        className={cn("shrink-0 overflow-visible rounded-md outline-none", FOCUS)}
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
                <circle cx={xs[i]} cy={xy[i][1]} r={8.5} fill={colors[i]} opacity={0.16} />
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

function ResultsWidget({
  out,
  watch,
  onOpen,
}: {
  out: Marker[]
  watch: Marker[]
  onOpen: OpenSection
}) {
  const [tab, setTab] = React.useState<"out" | "watch">(
    out.length ? "out" : "watch"
  )
  const rows = tab === "out" ? out : watch
  return (
    <Widget
      icon={TestTube01Icon}
      title="Results"
      flush
      tabs={
        <WidgetTabs
          label="Results"
          value={tab}
          onTab={setTab}
          tabs={[
            ...(out.length
              ? [{ id: "out" as const, label: `Out of range (${out.length})` }]
              : []),
            ...(watch.length
              ? [
                  {
                    id: "watch" as const,
                    label: `Heading out of range (${watch.length})`,
                  },
                ]
              : []),
          ]}
        />
      }
      action={
        <HeaderLink onClick={() => onOpen("labs")}>All results</HeaderLink>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40 pl-4">Test</TableHead>
            <TableHead>Last readings</TableHead>
            <TableHead>Range</TableHead>
            <TableHead>Change</TableHead>
            <TableHead className="pr-4">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-6 text-center text-muted-foreground"
              >
                Nothing here
              </TableCell>
            </TableRow>
          )}
          {rows.map((m) => (
            <TableRow
              key={m.id}
              className="cursor-pointer"
              onClick={() => onOpen("labs")}
            >
              <TableCell className="pl-4 whitespace-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    {m.isNew && <Pill tone="blue">New</Pill>}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {usDay(m.points[m.points.length - 1].date.slice(0, 10))} ·{" "}
                    {m.points[m.points.length - 1].source}
                  </span>
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <HoverCard>
                  <HoverCardTrigger
                    delay={120}
                    render={
                      <button
                        type="button"
                        aria-label={`${m.name} trend`}
                        onClick={() => onOpen("labs")}
                        className={cn(
                          "-my-1 rounded-md px-1 py-1 hover:bg-surface-row-hover",
                          FOCUS
                        )}
                      />
                    }
                  >
                    <DotTrend
                      points={m.points}
                      low={m.low}
                      high={m.high}
                      label={`${m.name}, last readings`}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="right"
                    align="start"
                    className="w-80 rounded-2xl"
                  >
                    <TrendWindow m={m} onOpen={() => onOpen("labs")} />
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground tabular-nums">
                {m.range || "None"}
                {m.unit && m.range && (
                  <span className="ml-1 text-xs">{m.unit}</span>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "text-[13px] tabular-nums",
                  m.change?.worse && TONE.red.text
                )}
              >
                {m.change?.text ?? "First reading"}
              </TableCell>
              <TableCell className="pr-4">
                <TrendWord trend={m.trend} rising={m.rising} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Widget>
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

/** One of the three things the doctor weighs: label, value, where from. */
function Fact({
  label,
  value,
  meta,
  tone,
}: {
  label: string
  value: string
  meta?: string
  tone?: ToneKey
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface-head px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", tone && TONE[tone].text)}>
        {value}
      </span>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
    </div>
  )
}

function MedicationsWidget({
  dash,
  onOpen,
}: {
  dash: Dashboard
  onOpen: OpenSection
}) {
  const { model, actions } = dash
  function decide(c: MedCase, decision: "acknowledged" | "dismissed") {
    actions.reconcile(c, decision)
    toast.success(
      decision === "acknowledged"
        ? `${c.medication}: change confirmed`
        : `${c.medication}: marked not current`,
      {
        action: { label: "Undo", onClick: () => actions.undoReconcile(c.key) },
      }
    )
  }
  return (
    <Widget
      icon={Medicine02Icon}
      title="Medication discrepancies"
      count={model.cases.length}
      action={
        <HeaderLink onClick={() => onOpen("medications")}>
          All medications
        </HeaderLink>
      }
      flush
    >
      <ul className="divide-y">
        {model.cases.map((c) => {
          const tag = caseTag(c)
          return (
            <li key={c.key} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{c.medication}</span>
                <Pill tone={tag.tone}>{tag.label}</Pill>
                <span className="ml-auto flex gap-2">
                  {c.other && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide(c, "dismissed")}
                    >
                      Not current
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(c, "acknowledged")}
                  >
                    {c.other ? "Confirm change" : "Mark reviewed"}
                  </Button>
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Fact
                  label="Your list"
                  value={
                    c.practice
                      ? doseText(c.practice) || c.practice.sig
                      : "Not on your list"
                  }
                  meta={
                    c.practice
                      ? `${c.practice.prescriber}, ${usDay(c.practice.date.slice(0, 10))}`
                      : undefined
                  }
                />
                <Fact
                  label="Other record"
                  value={c.other ? doseText(c.other) : "No other source"}
                  meta={
                    c.other
                      ? `${c.other.prescriber}, ${shortSource(c.other.source)}, ${usDay(c.other.date.slice(0, 10))}`
                      : undefined
                  }
                  tone={c.other ? "orange" : undefined}
                />
                <Fact
                  label="Patient confirmed"
                  value={
                    c.answer
                      ? `${c.answer.answer}${c.answer.note ? `: ${c.answer.note}` : ""}`
                      : "Not asked yet"
                  }
                  meta={
                    c.answer
                      ? `In the app, ${usDay(c.answer.date.slice(0, 10))}`
                      : undefined
                  }
                  tone={
                    c.answer && c.answer.answer !== "Taking"
                      ? "violet"
                      : undefined
                  }
                />
              </div>
            </li>
          )
        })}
      </ul>
    </Widget>
  )
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

function OrdersWidget({ dash }: { dash: Dashboard }) {
  const { model, actions } = dash
  const rows = [...model.orders].sort(
    (a, b) =>
      Number(isOverdue(b.clock)) - Number(isOverdue(a.clock)) ||
      (orderState(b).days ?? -1) - (orderState(a).days ?? -1)
  )
  return (
    <Widget
      icon={TaskDaily01Icon}
      title="Orders not fulfilled"
      count={rows.length}
      flush
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40 pl-4">Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Days open</TableHead>
            <TableHead>Reminders</TableHead>
            <TableHead className="pr-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => {
            const s = orderState(o)
            return (
              <TableRow key={o.key}>
                <TableCell className="pl-4 whitespace-normal">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{o.order}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {o.orderedBy}, {usDay(o.orderedAt)}
                      {o.facility && ` · ${o.facility}`}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {s.days ?? "None"}
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {o.reminderDates.length + (o.remindedAt ? 1 : 0)}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {o.clock.kind === "running" &&
                    (o.remindedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Reminder sent
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.remind(o.key)}
                      >
                        Send reminder
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Widget>
  )
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

function OutsideWidget({
  dash,
  encounters,
  reports,
  onOpen,
}: {
  dash: Dashboard
  encounters: OutsideEncounter[]
  reports: ClinicalReport[]
  onOpen: OpenSection
}) {
  const { actions } = dash
  const [tab, setTab] = React.useState<"visits" | "reports">(
    encounters.length ? "visits" : "reports"
  )
  const review = (key: string, type: WorkItem["type"]) =>
    actions.reviewOne(key, (w) => w.type === type)
  return (
    <Widget
      icon={Hospital01Icon}
      title="Care outside the practice"
      flush
      tabs={
        <WidgetTabs
          label="Care outside the practice"
          value={tab}
          onTab={setTab}
          tabs={[
            ...(encounters.length
              ? [
                  {
                    id: "visits" as const,
                    label: `Visits (${encounters.length})`,
                  },
                ]
              : []),
            ...(reports.length
              ? [
                  {
                    id: "reports" as const,
                    label: `Reports (${reports.length})`,
                  },
                ]
              : []),
          ]}
        />
      }
      action={
        <HeaderLink
          onClick={() => onOpen(tab === "visits" ? "encounters" : "documents")}
        >
          Open
        </HeaderLink>
      }
    >
      <ul className="divide-y">
        {tab === "visits" &&
          encounters.map((e) => (
            <li
              key={encounterKey(e)}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={EVENT_TONE[e.event]}>{e.event}</Pill>
                  <span className="text-sm font-medium">{e.reason}</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {usDay(e.date)} · {e.facility}
                  {e.clinician && `, ${e.clinician}`} · {e.documents.join(", ")}
                </span>
              </span>
              {e.reviewed ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <KitIcon icon={CheckmarkCircle02Icon} size={14} />
                  Reviewed
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => review(encounterKey(e), "outside_care")}
                >
                  Mark reviewed
                </Button>
              )}
            </li>
          ))}
        {tab === "reports" &&
          reports.map((r) => (
            <li
              key={reportKey(r)}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.flag === "Normal" ? "green" : "red"}>
                    {r.flag}
                  </Pill>
                  <span className="text-sm font-medium">
                    {r.report}: {r.finding}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {usDay(r.date)} · {shortSource(r.source)}
                  {r.values && ` · ${r.values}`}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => review(reportKey(r), "abnormal_result")}
              >
                Mark reviewed
              </Button>
            </li>
          ))}
        {(tab === "visits" ? encounters : reports).length === 0 && (
          <li className="px-4 py-6 text-center">
            <Quiet>Nothing here</Quiet>
          </li>
        )}
      </ul>
    </Widget>
  )
}

/* ------------------------------------------------------ what changed -- */

type Story = { date: string; items: { tone: ToneKey; text: string }[] }

/** Everything since the last review, one group per day, newest first.
    Same-day results fold into one line. */
function storyOf(
  model: DashboardModel,
  markers: Marker[],
  cutoff?: string
): Story[] {
  const byDay = new Map<string, Story["items"]>()
  const add = (date: string, tone: ToneKey, text: string) => {
    const day = date.slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), { tone, text }])
  }
  const results = new Map<string, { text: string; out: boolean }[]>()
  for (const m of markers)
    for (const p of m.points)
      if (after(p.date, cutoff)) {
        const day = p.date.slice(0, 10)
        results.set(day, [
          ...(results.get(day) ?? []),
          {
            text: `${m.name} ${p.value}${m.unit ? ` ${m.unit}` : ""}`,
            out: p.out,
          },
        ])
      }
  /* A day's results in one line, the out of range ones first. */
  for (const [day, list] of results) {
    const sorted = [...list].sort((a, b) => Number(b.out) - Number(a.out))
    const names = sorted.map((r) => r.text)
    add(
      day,
      sorted[0].out ? "red" : "green",
      names.length > 3
        ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
        : names.join(", ")
    )
  }
  for (const e of model.data.encounters)
    if (after(e.date, cutoff))
      add(
        e.date,
        EVENT_TONE[e.event],
        `${e.event}, ${e.facility}: ${lowerFirst(e.reason)}`
      )
  for (const r of model.data.reports)
    if (r.flag !== "Normal" && after(r.date, cutoff))
      add(r.date, "red", `${r.report}: ${lowerFirst(r.finding)}`)
  for (const c of model.data.conditions)
    if (after(c.addedAt, cutoff))
      add(c.addedAt, "blue", `New diagnosis: ${c.name}`)
  /* The change another record shows, on its own date; the patient's answer on theirs. */
  for (const c of model.cases) {
    if (c.other && after(c.other.date, cutoff))
      add(
        c.other.date,
        "orange",
        c.practice
          ? `${c.medication} ${doseText(c.other)} by ${c.other.prescriber}, ${doseText(c.practice)} on your list`
          : `${c.medication} ${doseText(c.other)} started by ${c.other.prescriber}`
      )
    if (c.answer && after(c.answer.date, cutoff))
      add(
        c.answer.date,
        "violet",
        `Patient confirmed ${c.medication}: ${c.answer.answer.toLowerCase()}${c.answer.note ? `, ${c.answer.note}` : ""}`
      )
  }
  for (const o of model.orders)
    if (after(o.orderedAt, cutoff))
      add(o.orderedAt, "blue", `Ordered: ${o.order}`)
  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

function StoryWidget({ story, review }: { story: Story[]; review?: string }) {
  return (
    <Widget
      icon={Clock01Icon}
      title={
        review
          ? `Since your review on ${usDay(review.slice(0, 10))}`
          : "In the last 90 days"
      }
      className="xl:max-h-[720px]"
      bodyClassName="min-h-0 overflow-y-auto"
    >
      {story.length === 0 ? (
        <Quiet>Nothing new</Quiet>
      ) : (
        <ol className="flex flex-col gap-4">
          {story.map((s) => (
            <li key={s.date} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {usDay(s.date)}
              </span>
              <ul className="flex flex-col gap-1.5 border-l pl-3">
                {s.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] leading-5"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        TONE[it.tone].solid
                      )}
                    />
                    <span>{it.text}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  )
}

/* ---------------------------------------------------------- dashboard -- */

type WidgetId = "results" | "meds" | "orders" | "outside"

const domId = (id: WidgetId) => `dashboard-v2-${id}`

function goTo(id: WidgetId) {
  const el = document.getElementById(domId(id))
  if (!el) return
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" })
}

const NINETY_DAYS_AGO = (now: string) =>
  new Date(new Date(now).getTime() - 90 * 86_400_000).toISOString().slice(0, 10)

export function ChangesDashboard({
  dash,
  opt,
  optimized,
  onOpen,
}: {
  dash: Dashboard
  opt: Optimization
  optimized: boolean
  onOpen: OpenSection
}) {
  const { ready, model } = dash
  const [planId, setPlanId] = React.useState(PROGRAMS[0].id)
  const plan = PROGRAMS.find((p) => p.id === planId) ?? PROGRAMS[0]
  const program = React.useMemo(
    () => (optimized && opt.model ? buildProgram(plan, opt.model) : null),
    [optimized, opt.model, plan]
  )

  const view = React.useMemo(() => {
    if (!ready) return null
    const reviewAt = model.review?.at
    const cutoff = reviewAt ?? NINETY_DAYS_AGO(NOW)
    const tracker = optimized ? (opt.model?.data.biomarkers ?? []) : []
    /* An optimization member's bands come from the tracker's Dashboard
       sheet, as version 1 counts them. */
    const band = (key: "Out of target" | "On watch") =>
      (opt.model?.data.snapshot.bands[key] ?? [])
        .map((r) => markerByName(tracker, r.name))
        .filter((b): b is Biomarker => Boolean(b))
        .map((b) => fromBiomarker(b, cutoff, key === "On watch"))
    const outMarkers = optimized
      ? band("Out of target")
      : model.outOfRange.map((l) => fromLab(l, false, cutoff))
    const watchMarkers = optimized
      ? band("On watch")
      : model.trending
          .filter((l) => statusOf(l) === "In range")
          .map((l) => fromLab(l, true, cutoff))
    const out = outMarkers.filter((m): m is Marker => Boolean(m)).sort(byChange)
    const watch = watchMarkers
      .filter((m): m is Marker => Boolean(m))
      .sort(byChange)
    /* Visits since the review or not yet reviewed; abnormal reports waiting. */
    const encounters = model.encounters.filter(
      (e) => !e.reviewed || after(e.date, reviewAt)
    )
    const reports = model.reports
    const allMarkers = optimized
      ? tracker
          .map((b) => fromBiomarker(b, cutoff))
          .filter((m): m is Marker => Boolean(m))
      : model.data.labs
          .map((l) => fromLab(l, false, cutoff))
          .filter((m): m is Marker => Boolean(m))

    /* What leads: an unreviewed ED visit or admission, then urgent results
       or an allergy match, then the call's order (results, medications,
       orders, outside care). */
    const acute =
      encounters.some((e) => isAcute(e) && !e.reviewed) ||
      reports.some((r) => Boolean(r.redFlag))
    const urgentResult =
      out.some((m) => m.flag === "Critical") ||
      model.urgent.some((u) => u.target.kind === "result")
    const rank: Record<WidgetId, number> = {
      outside: acute ? 0 : 4,
      results: urgentResult ? 0.5 : 1,
      meds: model.cases.some((c) => c.allergy) ? 0.5 : 2,
      orders: model.orders.some((o) => isOverdue(o.clock)) ? 2.5 : 3,
    }
    const has: Record<WidgetId, boolean> = {
      results: out.length + watch.length > 0,
      meds: model.cases.length > 0,
      orders: model.orders.length > 0,
      outside: encounters.length + reports.length > 0,
    }
    const order = (Object.keys(rank) as WidgetId[])
      .filter((id) => has[id])
      .sort((a, b) => rank[a] - rank[b])
    const quiet = (Object.keys(has) as WidgetId[]).filter((id) => !has[id])
    return {
      out,
      watch,
      encounters,
      reports,
      order,
      quiet,
      story: storyOf(model, allMarkers, cutoff),
      reviewAt,
      acute,
    }
  }, [ready, model, optimized, opt.model])

  if (!ready || !view)
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <CardSkeleton rows={2} />
        <CardSkeleton rows={6} />
      </div>
    )

  const overdueOrders = model.orders.filter((o) => isOverdue(o.clock)).length
  const tiles: Record<
    WidgetId,
    { label: string; value: number; icon: typeof Alert02Icon; tint: Tint }
  > = {
    results: {
      label: "Out of range",
      value: view.out.length,
      icon: TestTube01Icon,
      tint: "category-1",
    },
    meds: {
      label: "Medication discrepancies",
      value: model.cases.length,
      icon: Medicine02Icon,
      tint: "category-2",
    },
    orders: {
      label: overdueOrders ? "Orders overdue" : "Orders not fulfilled",
      value: overdueOrders || model.orders.length,
      icon: TaskDaily01Icon,
      tint: "category-4",
    },
    outside: {
      label: view.encounters.some(isAcute)
        ? "ED visits and admissions"
        : "Outside visits and reports",
      value: view.encounters.some(isAcute)
        ? view.encounters.filter(isAcute).length
        : view.encounters.length + view.reports.length,
      icon: Hospital01Icon,
      tint: "category-5",
    },
  }
  const QUIET_TEXT: Record<WidgetId, string> = {
    results: "No results out of range",
    meds: "No medication discrepancies",
    orders: "No open orders",
    outside: "No care outside the practice",
  }

  const widget = (id: WidgetId) =>
    id === "results" ? (
      <ResultsWidget out={view.out} watch={view.watch} onOpen={onOpen} />
    ) : id === "meds" ? (
      <MedicationsWidget dash={dash} onOpen={onOpen} />
    ) : id === "orders" ? (
      <OrdersWidget dash={dash} />
    ) : (
      <OutsideWidget
        dash={dash}
        encounters={view.encounters}
        reports={view.reports}
        onOpen={onOpen}
      />
    )

  return (
    <div className={cn("flex flex-col gap-4", TYPE_SCALE)}>
      {view.order.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {view.order.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              className={cn(
                "rounded-[7.2px] text-left transition-[filter] hover:brightness-[0.98]",
                FOCUS
              )}
            >
              <StatTile
                label={tiles[id].label}
                value={tiles[id].value}
                icon={tiles[id].icon}
                tint={tiles[id].tint}
              />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          {view.order.length === 0 && (
            <Widget icon={CheckmarkCircle02Icon} title="Nothing needs you">
              <Quiet>
                No results out of range, discrepancies, open orders or outside
                care.
              </Quiet>
            </Widget>
          )}
          {view.order.map((id) => (
            <section key={id} id={domId(id)} className="scroll-mt-3">
              {widget(id)}
            </section>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-0 xl:col-span-4">
          <StoryWidget story={view.story} review={view.reviewAt} />
          {view.quiet.length > 0 && view.order.length > 0 && (
            <Widget icon={CheckmarkCircle02Icon} title="No change">
              <ul className="flex flex-col gap-1.5">
                {view.quiet.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 text-[13px] text-muted-foreground"
                  >
                    <KitIcon
                      icon={CheckmarkCircle02Icon}
                      size={14}
                      className={TONE.green.text}
                    />
                    {QUIET_TEXT[id]}
                  </li>
                ))}
              </ul>
            </Widget>
          )}
        </div>
      </div>

      {program && opt.model && (
        <ProgramPanel
          opt={opt.model}
          program={plan}
          view={program}
          onProgram={setPlanId}
        />
      )}
    </div>
  )
}

/** Mark reviewed (or Validate record on a first review), for version 2's bar. */
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
