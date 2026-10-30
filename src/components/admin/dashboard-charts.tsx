"use client"

import * as React from "react"
import { format } from "date-fns"
import { Area, AreaChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import type { Kpi, Tone } from "@/components/admin/adoption-kpis"
import type { Period } from "@/components/admin/date-range-filter"
import type { Adoption } from "@/components/admin/practice-adoption"
import type { Practice } from "@/components/admin/practices-store"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/design-system/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/design-system/ui/progress"

/* The admin dashboard, built to be read at a glance from the design system's
   own parts: Card for every tile and chart, plain text for rates, Progress for
   every bar, Empty for nothing to show. Fills are the
   soft --viz-* tokens in globals.css, set on those components through
   className. Each chart reads the same adoption roll up as the tiles, for
   whatever region is in scope. */

const pct = (r: number) => `${Math.round(r * 100)}%`
const whole = (r: number) => Math.round(r * 100)

const OUTCOMES = {
  enrolled: { label: "Enrolled", color: "var(--viz-enrolled)" },
  pending: { label: "Pending", color: "var(--viz-pending)" },
  declined: { label: "Declined", color: "var(--viz-declined)" },
} satisfies ChartConfig

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

function isoShift(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

const todayIso = () => format(new Date(), "yyyy-MM-dd")

type Bucket = { start: string; end: string; label: string; tip: string }

/* A period cut into chart points: days up to two months, weeks up to a
   year, calendar months beyond. */
function bucketsOf(from: string, to: string): Bucket[] {
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1
  const out: Bucket[] = []
  if (days <= 62) {
    for (let d = from; d <= to; d = isoShift(d, 1))
      out.push({ start: d, end: d, label: shortDate(d), tip: shortDate(d) })
  } else if (days <= 366) {
    for (let d = from; d <= to; d = isoShift(d, 7)) {
      const end = isoShift(d, 6) < to ? isoShift(d, 6) : to
      out.push({
        start: d,
        end,
        label: shortDate(d),
        tip: `Week of ${shortDate(d)}`,
      })
    }
  } else {
    let [y, m] = from.split("-").map(Number)
    for (;;) {
      const start = `${y}-${String(m).padStart(2, "0")}-01`
      if (start > to) break
      const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
      const name = new Date(`${start}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
      out.push({
        start: start < from ? from : start,
        end: last < to ? last : to,
        label: name,
        tip: name,
      })
      if (++m > 12) {
        m = 1
        y++
      }
    }
  }
  return out
}

/** The period a chart spans: the filter's own ends, or for all time the
    first dated record up to today. */
function spanOf(period: Period, dates: string[]) {
  const today = todayIso()
  const first = dates.reduce((min, d) => (d < min ? d : min), today)
  return { from: period.from ?? first, to: period.to ?? today }
}

/* -------------------------------------------------------------------------- */
/*  Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

/* The design system Card in the portal's own card style, the one the tables
   sit in: white, a hairline border, a faint shadow. Charts take a title bar
   with a rule under it; stat tiles are the same card without one. */
export const CARD =
  "min-w-0 gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0 [--card-spacing:--spacing(4)]"

export function ChartCard({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn(CARD, className)}>
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm font-semibold tracking-tight">
          {title}
        </CardTitle>
        {action && (
          <CardAction className="self-center text-xs text-muted-foreground tabular-nums">
            {action}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 py-4">
        {children}
      </CardContent>
    </Card>
  )
}

/* Progress, recoloured: a light track, a soft rounded fill. */
const BAR = {
  enrolled:
    "[&_[data-slot=progress-indicator]]:bg-(--viz-enrolled) [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-track]]:bg-(--viz-track)",
  pending:
    "[&_[data-slot=progress-indicator]]:bg-(--viz-pending) [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-track]]:bg-(--viz-track)",
  behind:
    "[&_[data-slot=progress-indicator]]:bg-(--viz-behind) [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-track]]:bg-(--viz-track)",
  declined:
    "[&_[data-slot=progress-indicator]]:bg-(--viz-declined) [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-track]]:bg-(--viz-track)",
}

/* A thin mark on a Progress track for a benchmark. Sits over the track,
   which the Progress lays out last, at the bottom of its box. */
function Benchmark({ at, height }: { at: number; height: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground/35",
        height
      )}
      style={{ left: pct(at) }}
    />
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  )
}

/* A headline figure above a chart. The library has no stat primitive, so
   this is only type on the card. */
function Figure({
  label,
  value,
  color,
}: {
  label: string
  value: React.ReactNode
  color?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {color && <Swatch color={color} />}
        {label}
      </span>
      <span className="font-heading text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </span>
    </div>
  )
}

function Nothing({ title }: { title: string }) {
  return (
    <Empty className="flex-1 py-8">
      <EmptyHeader>
        <EmptyTitle className="text-sm font-normal text-muted-foreground">
          {title}
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stat tiles                                                                 */
/* -------------------------------------------------------------------------- */

/* The rate reads as plain text: neutral when on par, amber or red when it
   trails the Inlay average. No pill, the tile already frames it. */
const TONE_TEXT: Record<Tone, string> = {
  good: "text-muted-foreground",
  watch: "text-warning",
  alert: "text-destructive",
  neutral: "text-muted-foreground",
}

const TONE_BAR: Record<Tone, string> = {
  good: BAR.enrolled,
  watch: BAR.behind,
  alert: BAR.declined,
  neutral: BAR.enrolled,
}

/* One number per tile, its total, and the rate as a Progress, both coloured
   by how the rate compares with the Inlay average. The split into states
   lives on the practice pages. */
export function StatTiles({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {kpis.map((k) => (
        <Card key={k.label} className={cn(CARD, "gap-3 py-4")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[13px] font-normal text-muted-foreground">
              <k.icon className="size-4 shrink-0" />
              {k.label}
            </CardTitle>
            <CardAction
              className={cn(
                "self-center text-[13px] font-medium tabular-nums",
                TONE_TEXT[k.tone]
              )}
            >
              {pct(k.rate)}
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-3xl leading-none font-semibold tracking-tight tabular-nums">
                {k.value.toLocaleString("en-US")}
              </span>
              <span className="text-[13px] text-muted-foreground tabular-nums">
                of {k.total.toLocaleString("en-US")}
              </span>
            </div>
            <Progress
              value={whole(k.rate)}
              aria-label={`${k.label}, ${pct(k.rate)}`}
              className={cn(
                "[&_[data-slot=progress-track]]:h-1",
                TONE_BAR[k.tone]
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Invites over the dashboard's period                                        */
/* -------------------------------------------------------------------------- */

/* Two soft areas: invites sent in each day, week or month of the period, and
   how many of those have since enrolled. The gap between them is what is
   still pending or declined. The adoption is already cut to the period. */
export function InviteTrend({
  adoption,
  period,
  periodLabel,
}: {
  adoption: Adoption
  period: Period
  periodLabel: string
}) {
  const invites = adoption.providers.flatMap((p) =>
    p.patients.filter(
      (x) =>
        x.invitedAt &&
        (x.status === "Active" ||
          x.status === "Invited" ||
          x.status === "Declined")
    )
  )
  const span = spanOf(
    period,
    invites.map((x) => x.invitedAt)
  )
  const data = bucketsOf(span.from, span.to).map((b) => {
    const on = invites.filter(
      (x) => x.invitedAt >= b.start && x.invitedAt <= b.end
    )
    return {
      day: b.label,
      tip: b.tip,
      sent: on.length,
      enrolled: on.filter((x) => x.status === "Active").length,
    }
  })
  const enrolled = invites.filter((x) => x.status === "Active").length
  const config = {
    sent: { label: "Invites sent", color: "var(--viz-pending)" },
    enrolled: { label: "Enrolled", color: "var(--viz-enrolled)" },
  } satisfies ChartConfig

  return (
    <ChartCard title={`Invites, ${periodLabel}`} className="lg:col-span-2">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <Figure
          label="Invites sent"
          value={invites.length}
          color="var(--viz-pending)"
        />
        <Figure label="Enrolled" value={enrolled} color="var(--viz-enrolled)" />
        <Figure
          label="Conversion"
          value={pct(invites.length ? enrolled / invites.length : 0)}
        />
      </div>
      <ChartContainer config={config} className="aspect-auto h-52 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          <defs>
            {(["sent", "enrolled"] as const).map((k) => (
              <linearGradient
                key={k}
                id={`inv-${k}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={`var(--color-${k})`}
                  stopOpacity={0.55}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--color-${k})`}
                  stopOpacity={0.06}
                />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={40}
          />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.tip ?? label
                }
              />
            }
          />
          {(["sent", "enrolled"] as const).map((k) => (
            <Area
              key={k}
              dataKey={k}
              type="monotone"
              stroke={`var(--color-${k})`}
              strokeWidth={2}
              fill={`url(#inv-${k})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* -------------------------------------------------------------------------- */
/*  Patient status                                                             */
/* -------------------------------------------------------------------------- */

export function PatientStatus({ adoption: a }: { adoption: Adoption }) {
  const parts = [
    { key: "enrolled", ...OUTCOMES.enrolled, value: a.enrolled },
    { key: "pending", ...OUTCOMES.pending, value: a.invited },
    { key: "declined", ...OUTCOMES.declined, value: a.declined },
  ]
  const config = Object.fromEntries(
    parts.map((p) => [p.key, { label: p.label, color: p.color }])
  ) satisfies ChartConfig

  return (
    <ChartCard title="Patient status">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative size-44 shrink-0">
          <ChartContainer config={config} className="aspect-square size-44">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="key" hideLabel />}
              />
              <Pie
                data={parts}
                dataKey="value"
                nameKey="key"
                innerRadius={62}
                outerRadius={84}
                paddingAngle={2}
                cornerRadius={6}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {parts.map((p) => (
                  <Cell key={p.key} fill={p.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-[28px] leading-none font-semibold tabular-nums">
              {pct(a.rate ?? 0)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">enrolled</span>
          </div>
        </div>
        <ul className="grid w-full grid-cols-2 gap-x-5 gap-y-2.5">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-2 text-sm">
              <Swatch color={p.color} />
              <span className="truncate text-muted-foreground">{p.label}</span>
              <span className="ml-auto font-medium tabular-nums">
                {p.value.toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  )
}

/* -------------------------------------------------------------------------- */
/*  Enrolment rate, ranked                                                     */
/* -------------------------------------------------------------------------- */

export type RateRow = {
  key: string
  name: string
  rate: number | null
  enrolled: number
  open: number
  behind: boolean
  onPick: () => void
}

/* A Progress per row, lowest first: the name and rate on the label line,
   the bar under them with a tick at the Inlay average. Rows well behind
   take the amber fill. Click a row to open it. */
export function RateRanking({
  title,
  rows,
  average,
}: {
  title: string
  rows: RateRow[]
  average: number
}) {
  const data = rows.filter((r) => r.rate !== null)
  return (
    <ChartCard
      title={title}
      action={
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Swatch color="var(--viz-enrolled)" />
            On track
          </span>
          <span className="flex items-center gap-1.5">
            <Swatch color="var(--viz-behind)" />
            Behind
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-0.5 rounded-full bg-foreground/35"
            />
            Inlay average {pct(average)}
          </span>
        </span>
      }
      className="lg:col-span-2"
    >
      <div className="-mx-2 gap-x-6 sm:columns-2">
        {data.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={r.onPick}
            title={`${r.enrolled} of ${r.open} enrolled`}
            className="relative block w-full break-inside-avoid rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <span className="relative block">
              <Progress
                value={whole(r.rate!)}
                className={cn(
                  "gap-y-1.5 text-[13px] [&_[data-slot=progress-track]]:h-1.5",
                  r.behind ? BAR.behind : BAR.enrolled
                )}
              >
                <ProgressLabel className="truncate font-normal">
                  {r.name}
                </ProgressLabel>
                <ProgressValue
                  className={cn(
                    "font-medium text-foreground",
                    r.behind && "text-warning"
                  )}
                />
              </Progress>
              <Benchmark at={average} height="h-2.5" />
            </span>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}

/* -------------------------------------------------------------------------- */
/*  Practices on Inlay                                                         */
/* -------------------------------------------------------------------------- */

/* Practices signed up to date across the dashboard's period, in the scope's
   region: the running total at each point, and how many joined inside it. */
export function PracticeGrowth({
  practices,
  period,
}: {
  practices: Practice[]
  period: Period
}) {
  const dates = practices.map((p) => p.createdAt).sort()
  const config = {
    total: { label: "Practices", color: "var(--viz-enrolled)" },
  } satisfies ChartConfig

  const span = spanOf(period, dates)
  const total = dates.filter((d) => d <= span.to).length

  if (total === 0) {
    return (
      <ChartCard title="Practices on Inlay" className="lg:col-span-2">
        <Nothing title="No practices yet" />
      </ChartCard>
    )
  }

  const data = bucketsOf(span.from, span.to).map((b) => ({
    week: b.label,
    tip: b.tip,
    total: dates.filter((d) => d <= b.end).length,
  }))
  const added = dates.filter((d) => d >= span.from && d <= span.to).length

  return (
    <ChartCard title="Practices on Inlay" className="lg:col-span-2">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <Figure label="Total" value={total} />
        <Figure label="Added" value={`+${added}`} />
      </div>
      <ChartContainer config={config} className="aspect-auto h-40 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="practice-growth" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-total)"
                stopOpacity={0.45}
              />
              <stop
                offset="100%"
                stopColor="var(--color-total)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={48}
          />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.tip ?? label
                }
              />
            }
          />
          <Area
            dataKey="total"
            type="monotone"
            stroke="var(--color-total)"
            strokeWidth={2}
            fill="url(#practice-growth)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* -------------------------------------------------------------------------- */
/*  Enrolment funnel                                                           */
/* -------------------------------------------------------------------------- */

/* Every patient is invited as they are added, so the funnel starts at the
   invite: invited to answered (enrolled or declined) to enrolled. A Progress
   per step at its share of the open records, the count on the label line
   and the step's conversion as muted text. */
export function EnrolmentFunnel({ adoption: a }: { adoption: Adoption }) {
  const answered = a.enrolled + a.declined
  const steps = [
    { label: "Invited", value: a.open, from: null as number | null },
    { label: "Answered", value: answered, from: a.open },
    { label: "Enrolled", value: a.enrolled, from: answered },
  ]
  return (
    <ChartCard title="Enrolment funnel">
      <div className="flex flex-1 flex-col justify-center gap-5">
        {steps.map((s, i) => (
          <Progress
            key={s.label}
            value={whole(a.open ? s.value / a.open : 0)}
            className={cn(
              "gap-y-2 [&_[data-slot=progress-track]]:h-1.5",
              i === steps.length - 1 ? BAR.enrolled : BAR.pending
            )}
          >
            <ProgressLabel className="text-[13px] font-normal text-muted-foreground">
              {s.label}
            </ProgressLabel>
            <span className="ml-auto flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {s.value.toLocaleString("en-US")}
              </span>
              {s.from !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pct(s.from ? s.value / s.from : 0)}
                </span>
              )}
            </span>
          </Progress>
        ))}
      </div>
    </ChartCard>
  )
}
