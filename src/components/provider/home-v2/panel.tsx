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

/** The last twelve months, oldest first. Each month's new members and
    cancellations come from the Membership report; month end members are
    walked back from this month's report total so the bars add up. */
export function usePanelMonths(providerIds: string[] = [PROVIDER_ID]): PanelMonth[] {
  const key = providerIds.join(",")
  return React.useMemo(() => {
    const periods = periodsFor("Month")
    const counts = periods.map((p) => totalFor(MEMBERSHIP, key ? key.split(",") : [], p))
    const rows: PanelMonth[] = []
    let end = counts[0]?.members ?? 0
    periods.forEach((p, i) => {
      const c = counts[i]
      const joined = Math.min(end, c.paid)
      const continuing = end - joined
      const dropped = c.cancelled
      rows.unshift({
        month: p.label.slice(0, 3),
        label: p.label,
        start: continuing + dropped,
        continuing,
        joined,
        dropped,
        members: end,
        invited: c.invited,
        activated: c.activated,
        conversion: pct(c.paid, c.activated),
      })
      end = continuing + dropped
    })
    return rows
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

/** Six months from invite to a member who stays, then the monthly rate. */
export function ConversionFunnel({ months, className }: { months: PanelMonth[]; className?: string }) {
  const reduced = useReducedMotion()
  const rows = months.slice(-6)
  const sum = (k: "invited" | "activated" | "joined" | "dropped") => rows.reduce((s, r) => s + r[k], 0)
  const steps = [
    { label: "Invited", value: sum("invited"), color: GREY },
    { label: "Joined the free app", value: sum("activated"), color: SUBTLE.blue },
    { label: "Upgraded to paid", value: sum("joined"), color: SUBTLE.violet },
    { label: "Still on the plan", value: Math.max(0, sum("joined") - sum("dropped")), color: SUBTLE.green },
  ]
  const top = steps[0].value || 1

  return (
    <Card className={className}>
      <CardHeader title="Free to paid" actions={<span className="text-xs text-muted-foreground">Last 6 months</span>} />
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
