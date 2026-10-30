"use client"

import * as React from "react"
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts"
import { IconChartUp, IconPercent, IconRefresh } from "@/design-system/icons"

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { MEMBERSHIP } from "@/components/practice/practice-reports-data"
import {
  AXIS_PROPS,
  Card,
  CardHeader,
  Grid,
  SegmentedControl,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import { periodsFor, totalFor } from "@/components/provider/reports/reports-data"
import { FooterLink, StatCard } from "@/components/provider/home-v2/overview"

/* A panel as a business: how many patients are optimization members, how
   many free patients upgrade, who keeps paying and who drops off. The
   provider home shows its own panel; the clinic manager's dashboard shows
   the same blocks summed over the practice's providers. Membership numbers
   are the Membership and conversion report, month by month, so both portals
   agree. */

const BASE = "/screens/patients"
const PRACTICE_BASE = "/screens/practice"
const GREY = "#B5B5B5"

/* --------------------------------------------------------------- data -- */

export type PanelMonth = {
  month: string
  label: string
  /** Members at the start of the month. */
  start: number
  continuing: number
  joined: number
  dropped: number
  /** Members at month end. */
  members: number
  invited: number
  activated: number
  conversion: number
}

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0)

type Flow = Omit<PanelMonth, "month" | "label" | "conversion">

/** One provider's twelve months, oldest first. New members and
    cancellations are the Membership report's; month end members are walked
    back from this month's report total, so each month's start is the
    month before's end and every bar adds up. */
function providerMonths(id: string): Flow[] {
  const periods = periodsFor("Month")
  const rows: Flow[] = []
  let end = 0
  periods.forEach((p, i) => {
    const c = totalFor(MEMBERSHIP, [id], p)
    if (i === 0) end = c.members
    const joined = Math.min(end, c.paid)
    const continuing = end - joined
    rows.unshift({
      start: continuing + c.cancelled,
      continuing,
      joined,
      dropped: c.cancelled,
      members: end,
      invited: c.invited,
      activated: c.activated,
    })
    end = continuing + c.cancelled
  })
  return rows
}

/** The panel's twelve months, oldest first: each provider's months summed,
    so a practice total always equals its By provider rows, and every rate
    is worked from the same counts the bars draw. */
export function usePanelMonths(providerIds: string[] = [PROVIDER_ID]): PanelMonth[] {
  const key = providerIds.join(",")
  return React.useMemo(() => {
    const periods = periodsFor("Month").slice().reverse()
    const each = (key ? key.split(",") : []).map(providerMonths)
    return periods.map((p, i) => {
      const f = (k: keyof Flow) => each.reduce((s, rows) => s + rows[i][k], 0)
      const joined = f("joined")
      const activated = f("activated")
      return {
        month: p.label.slice(0, 3),
        label: p.label,
        start: f("start"),
        continuing: f("continuing"),
        joined,
        dropped: f("dropped"),
        members: f("members"),
        invited: f("invited"),
        activated,
        conversion: pct(joined, activated),
      }
    })
  }, [key])
}

/* ------------------------------------------------------- stat cards -- */

export function PanelStats({
  months,
  practice = false,
}: {
  months: PanelMonth[]
  /** The clinic manager's view: links go to the practice portal. */
  practice?: boolean
}) {
  const base = practice ? PRACTICE_BASE : BASE
  const patientsHref = practice ? `${PRACTICE_BASE}/patients` : BASE
  const now = months[months.length - 1]
  const prev = months[months.length - 2]
  const change = now.members - (prev?.members ?? now.members)
  const kept = pct(now.continuing, now.start)

  return (
    <section aria-label="Your panel" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        icon={IconChartUp}
        label="Optimization members"
        when="This month"
        value={now.members}
        meta={`${change >= 0 ? "+" : ""}${change} since last month`}
        segments={[
          { label: "Continuing", value: now.continuing, color: SUBTLE.green },
          { label: "New", value: now.joined, color: SUBTLE.blue },
        ]}
        footer={<FooterLink href={patientsHref}>Open patients</FooterLink>}
      />
      <StatCard
        icon={IconPercent}
        label="Conversion rate"
        when="This month"
        value={now.conversion}
        unit="%"
        meta={`${now.joined} of ${now.activated} free patients upgraded`}
        segments={[
          { label: "Upgraded", value: now.joined, color: SUBTLE.blue },
          { label: "Still free", value: Math.max(0, now.activated - now.joined), color: GREY },
        ]}
        footer={<FooterLink href={`${base}/reports`}>Open reports</FooterLink>}
      />
      <StatCard
        icon={IconRefresh}
        label="Continuing paid plan"
        when="This month"
        value={kept}
        unit="%"
        meta={`${now.continuing} of ${now.start} members renewed`}
        segments={[
          { label: "Continuing", value: now.continuing, color: SUBTLE.green },
          { label: "Dropped off", value: now.dropped, color: SUBTLE.red },
        ]}
        footer={<FooterLink href={`${base}/reports`}>Open reports</FooterLink>}
      />
    </section>
  )
}

/* ------------------------------------------------- membership chart -- */

const MEMBER_CONFIG = {
  continuing: { label: "Continuing", color: SUBTLE.green },
  joined: { label: "New members", color: SUBTLE.blue },
  dropped: { label: "Dropped off", color: SUBTLE.red },
} satisfies ChartConfig

export function MembershipTrend({ months, className }: { months: PanelMonth[]; className?: string }) {
  const reduced = useReducedMotion()
  const [range, setRange] = React.useState<"6" | "12">("6")
  const rows = months.slice(-Number(range))
  const sum = (k: "start" | "continuing" | "joined" | "dropped") => rows.reduce((s, r) => s + r[k], 0)
  const stats = [
    { label: "New members", value: `${sum("joined")}` },
    { label: "Continuing the plan", value: `${pct(sum("continuing"), sum("start"))}%` },
    { label: "Dropped off", value: `${sum("dropped")}`, color: SUBTLE.red },
  ]

  return (
    <Card className={className}>
      <CardHeader
        title="Optimization members"
        actions={
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            items={[
              { value: "6", label: "6 months" },
              { value: "12", label: "12 months" },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {s.color && <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
                {s.label}
              </dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(MEMBER_CONFIG).map(([k, c]) => (
            <li key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>
        {/* Members at month end (continuing + new) beside those who left. */}
        <ChartContainer config={MEMBER_CONFIG} className="aspect-auto h-[240px] w-full">
          <BarChart data={rows} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="24%" barGap={4}>
            <Grid />
            <XAxis dataKey="month" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)", radius: 6 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string })?.label ?? ""}
                />
              }
            />
            {(["continuing", "joined"] as const).map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="members"
                fill={`var(--color-${k})`}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={!reduced}
                shape={(props: React.ComponentProps<typeof Rectangle>) => (
                  <Rectangle {...props} radius={i === 1 ? [4, 4, 0, 0] : 0} />
                )}
              />
            ))}
            <Bar dataKey="dropped" fill="var(--color-dropped)" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}

/* ------------------------------------------------- conversion funnel -- */

const CONVERSION_CONFIG = {
  conversion: { label: "Conversion rate", color: SUBTLE.blue },
} satisfies ChartConfig

/** Six or twelve months from invite to paid member, then the monthly rate.
    The upgraded count is the members chart's new members over the same months. */
export function ConversionFunnel({ months, className }: { months: PanelMonth[]; className?: string }) {
  const reduced = useReducedMotion()
  const [range, setRange] = React.useState<"6" | "12">("6")
  const rows = months.slice(-Number(range))
  const sum = (k: "invited" | "activated" | "joined") => rows.reduce((s, r) => s + r[k], 0)
  const steps = [
    { label: "Invited", value: sum("invited"), color: GREY },
    { label: "Joined the free app", value: sum("activated"), color: SUBTLE.blue },
    { label: "Upgraded to paid", value: sum("joined"), color: SUBTLE.violet },
  ]
  const top = steps[0].value || 1

  return (
    <Card className={className}>
      <CardHeader
        title="Free to paid"
        actions={
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            items={[
              { value: "6", label: "6 months" },
              { value: "12", label: "12 months" },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ul className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.label} className="flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums">{s.value}</span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                  {i === 0 ? "" : `${pct(s.value, steps[i - 1].value)}%`}
                </span>
              </span>
              <span className="h-2 w-full overflow-hidden rounded-full bg-surface-soft">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(2, (s.value / top) * 100)}%`, backgroundColor: s.color }}
                />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Conversion rate by month</span>
          <ChartContainer config={CONVERSION_CONFIG} className="aspect-auto h-[96px] w-full">
            <BarChart data={rows} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="28%">
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis allowDecimals={false} unit="%" {...AXIS_PROPS} />
              <ChartTooltip
                cursor={{ fill: "var(--secondary)", radius: 6 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string })?.label ?? ""}
                    formatter={(v) => `${v}% converted`}
                  />
                }
              />
              <Bar dataKey="conversion" fill="var(--color-conversion)" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </Card>
  )
}
