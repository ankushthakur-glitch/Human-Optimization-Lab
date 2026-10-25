"use client"

import * as React from "react"
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts"
import {
  IconActivity,
  IconChat,
  IconCreditCard,
  IconUserAdd,
  IconWarning,
} from "@/design-system/icons"

import {
  locations,
  providers,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { VariantSwitch } from "@/components/practice/dashboard-variants/frame"
import {
  ALERTS,
  ALERT_TYPES,
  ENCOUNTERS,
  ENCOUNTER_TYPES,
  ENROLLMENT,
  OUTCOMES,
  VALUE,
} from "@/components/practice/practice-reports-data"
import {
  AXIS_PROPS,
  Card,
  CardHeader,
  Grid,
  SegmentedControl,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import {
  CardLink,
  FooterLink,
  StatCard,
} from "@/components/provider/home-v2/overview"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import {
  type Counts,
  type Period,
  type Report,
  formatValue,
  periodsFor,
  totalFor,
} from "@/components/provider/reports/reports-data"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import { Progress, ProgressLabel } from "@/design-system/ui/progress"

/* The clinic manager's practice dashboard: how the whole practice is doing
   over a month, quarter or year. Every number is a practice report's total
   for the period (see practice-reports-data.ts), summed over the active
   providers at the picked location, so a tile always matches the report it
   links to. Stat cards first (enrollment, activation, encounters, alerts,
   members), then the enrollment funnel beside encounters by type, then
   outcomes, alert volume and value over the last few periods. */

const REPORTS_HREF = "/screens/practice/reports"
const reportHref = (r: Report) => `${REPORTS_HREF}?report=${r.id}`

type Kind = "Month" | "Quarter" | "Year"

/** How many periods the trend charts show for each kind. */
const SPAN: Record<Kind, number> = { Month: 6, Quarter: 4, Year: 3 }

const GREY = "#B5B5B5"

/* Words take the soft hue mixed toward the ink so they read. */
const word = (hex: string) => `color-mix(in oklab, ${hex} 70%, var(--foreground))`

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0)

const ENCOUNTER_COLOR: Record<(typeof ENCOUNTER_TYPES)[number]["id"], string> = {
  inPerson: SUBTLE.blue,
  telehealth: SUBTLE.violet,
  messages: SUBTLE.green,
  askInlay: "var(--primary)",
  labDraws: SUBTLE.orange,
  checkIns: GREY,
}

const ALERT_COLOR: Record<(typeof ALERT_TYPES)[number]["id"], string> = {
  critical: SUBTLE.red,
  er: SUBTLE.orange,
  rising: SUBTLE.violet,
  overdue: SUBTLE.blue,
}

const ENCOUNTER_CONFIG = Object.fromEntries(
  ENCOUNTER_TYPES.map((t) => [t.id, { label: t.label, color: ENCOUNTER_COLOR[t.id] }])
) satisfies ChartConfig

const ALERT_CONFIG = Object.fromEntries(
  ALERT_TYPES.map((t) => [t.id, { label: t.label, color: ALERT_COLOR[t.id] }])
) satisfies ChartConfig

const OUTCOME_CONFIG = {
  retested: { label: "Retested", color: GREY },
  improved: { label: "Markers back in range", color: SUBTLE.green },
} satisfies ChartConfig

const MEMBER_CONFIG = {
  members: { label: "Active members", color: "var(--primary)" },
  newMembers: { label: "New members", color: SUBTLE.blue },
} satisfies ChartConfig

/** A column's value in a report's totals, formatted as the report does. */
function show(report: Report, column: string, c: Counts) {
  const col = report.columns.find((x) => x.id === column)!
  return formatValue(col.value(c), col.format)
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function PracticeDashboardScreen() {
  return (
    <PracticeShell active="dashboard">
      <Dashboard />
    </PracticeShell>
  )
}

function Dashboard() {
  const { items: provs } = providers.use()
  const { items: locs } = locations.use()
  const [kind, setKind] = React.useState<Kind>("Month")
  const [locationId, setLocationId] = React.useState("")

  const ids = provs
    .filter(
      (p) =>
        p.status === "Active" &&
        (!locationId || p.locationIds.includes(locationId))
    )
    .map((p) => p.id)

  const periods = periodsFor(kind)
  const [now, before] = periods
  const trend = periods.slice(0, SPAN[kind]).reverse()
  const at = (report: Report, period: Period = now) => totalFor(report, ids, period)

  const enroll = at(ENROLLMENT)
  const enc = at(ENCOUNTERS)
  const alerts = at(ALERTS)
  const value = at(VALUE)
  const outcomes = at(OUTCOMES)
  const prior = {
    enroll: at(ENROLLMENT, before),
    enc: at(ENCOUNTERS, before),
    alerts: at(ALERTS, before),
    value: at(VALUE, before),
  }

  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-surface-sunken">
      <div className="border-b border-border bg-card px-6 py-2">
        <VariantSwitch />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-8">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg leading-7 font-semibold">Practice dashboard</h1>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Period"
              value={kind}
              onChange={setKind}
              items={[
                { value: "Month", label: "Month" },
                { value: "Quarter", label: "Quarter" },
                { value: "Year", label: "Year" },
              ]}
            />
            <ToolbarSelect
              label="Location"
              className="w-48"
              items={[
                { label: "All locations", value: "" },
                ...locs
                  .filter((l) => l.status === "Active")
                  .map((l) => ({ label: l.name, value: l.id })),
              ]}
              value={locationId}
              onChange={setLocationId}
            />
          </div>
        </header>

        <section
          aria-label={`${now.label} at a glance`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          <StatCard
            icon={IconUserAdd}
            label="Enrollment"
            when={now.label}
            value={enroll.enrolled}
            of={enroll.added}
            meta={`${pct(enroll.enrolled, enroll.added)}% enrolled, ${pct(
              prior.enroll.enrolled,
              prior.enroll.added
            )}% in ${before.label}`}
            segments={[
              { label: "Enrolled", value: enroll.enrolled, color: SUBTLE.green },
              { label: "Still invited", value: enroll.waiting, color: SUBTLE.blue },
              { label: "Declined", value: enroll.declined, color: SUBTLE.red },
            ]}
            footer={<FooterLink href={reportHref(ENROLLMENT)}>Enrollment report</FooterLink>}
          />
          <StatCard
            icon={IconActivity}
            label="Activation"
            when={now.label}
            value={enroll.activated}
            of={enroll.enrolled}
            meta={`${pct(enroll.activated, enroll.enrolled)}% finished onboarding`}
            segments={[
              { label: "Activated", value: enroll.activated, color: SUBTLE.green },
              {
                label: "Connected only",
                value: enroll.connected - enroll.activated,
                color: SUBTLE.orange,
              },
              {
                label: "Not connected",
                value: enroll.enrolled - enroll.connected,
                color: GREY,
              },
            ]}
            footer={<FooterLink href={reportHref(ENROLLMENT)}>Activation report</FooterLink>}
          />
          <StatCard
            icon={IconChat}
            label="Encounters"
            when={now.label}
            value={enc.total}
            meta={`${show(ENCOUNTERS, "perPatient", enc)} per active patient, ${prior.enc.total} in ${before.label}`}
            segments={[
              { label: "Visits", value: enc.inPerson + enc.telehealth, color: SUBTLE.blue },
              { label: "Messages", value: enc.messages, color: SUBTLE.green },
              { label: "Ask Inlay", value: enc.askInlay, color: "var(--primary)" },
              { label: "Other", value: enc.labDraws + enc.checkIns, color: GREY },
            ]}
            footer={<FooterLink href={reportHref(ENCOUNTERS)}>Engagement report</FooterLink>}
          />
          <StatCard
            icon={IconWarning}
            label="Alerts"
            when={now.label}
            value={alerts.raised}
            meta={
              alerts.open > 0 ? (
                <span style={{ color: word(SUBTLE.red) }}>{alerts.open} still open</span>
              ) : (
                `All acknowledged, ${prior.alerts.raised} in ${before.label}`
              )
            }
            segments={ALERT_TYPES.map((t) => ({
              label: t.label,
              value: alerts[t.id],
              color: ALERT_COLOR[t.id],
            }))}
            footer={<FooterLink href={reportHref(ALERTS)}>Alert report</FooterLink>}
          />
          <StatCard
            icon={IconCreditCard}
            label="Members"
            when="Active"
            value={value.members}
            meta={`${show(VALUE, "mrr", value)} a month, ${show(VALUE, "renewRate", value)} renewed`}
            segments={[
              { label: "Renewed", value: value.renewed, color: SUBTLE.green },
              { label: "Cancelled", value: value.cancelled, color: SUBTLE.red },
              {
                label: "Renewal due",
                value: value.due - value.renewed - value.cancelled,
                color: SUBTLE.blue,
              },
            ]}
            footer={<FooterLink href={reportHref(VALUE)}>Value report</FooterLink>}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <EnrollmentFunnel enroll={enroll} newMembers={value.newMembers} period={now} />
          <TrendCard
            title="Encounters by type"
            report={ENCOUNTERS}
            stats={[
              { label: "All encounters", value: show(ENCOUNTERS, "total", enc) },
              { label: "Per active patient", value: show(ENCOUNTERS, "perPatient", enc) },
              {
                label: "Virtual share",
                value: `${pct(enc.telehealth + enc.messages + enc.askInlay, enc.total)}%`,
              },
            ]}
            config={ENCOUNTER_CONFIG}
            stacked
            rows={trend.map((p) => ({ period: p, counts: at(ENCOUNTERS, p) }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <TrendCard
            title="Outcomes"
            report={OUTCOMES}
            stats={[
              { label: "Markers improved", value: show(OUTCOMES, "improvedRate", outcomes) },
              { label: "Symptoms better", value: show(OUTCOMES, "betterRate", outcomes) },
              { label: "Biological age drop", value: show(OUTCOMES, "bioAge", outcomes) },
            ]}
            config={OUTCOME_CONFIG}
            rows={trend.map((p) => ({ period: p, counts: at(OUTCOMES, p) }))}
          />
          <TrendCard
            title="Alert volume"
            report={ALERTS}
            stats={[
              { label: "Open", value: show(ALERTS, "open", alerts) },
              { label: "Within 24 hours", value: show(ALERTS, "fast", alerts) },
              { label: "Time to acknowledge", value: show(ALERTS, "hours", alerts) },
            ]}
            config={ALERT_CONFIG}
            stacked
            rows={trend.map((p) => ({ period: p, counts: at(ALERTS, p) }))}
          />
          <TrendCard
            title="Value and renewal"
            report={VALUE}
            stats={[
              { label: "Monthly revenue", value: show(VALUE, "mrr", value) },
              { label: "Renewal rate", value: show(VALUE, "renewRate", value) },
              { label: `Revenue this ${kind.toLowerCase()}`, value: show(VALUE, "revenue", value) },
            ]}
            config={MEMBER_CONFIG}
            rows={trend.map((p) => ({ period: p, counts: at(VALUE, p) }))}
          />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Enrollment funnel                                                          */
/* -------------------------------------------------------------------------- */

/** Each step as a bar against the patients added, with the share that
    carried on from the step before. */
function EnrollmentFunnel({
  enroll,
  newMembers,
  period,
}: {
  enroll: Counts
  newMembers: number
  period: Period
}) {
  const steps = [
    { label: "Added and invited", value: enroll.added },
    { label: "Enrolled", value: enroll.enrolled },
    { label: "Record connected", value: enroll.connected },
    { label: "Activated", value: enroll.activated },
    { label: "Became members", value: Math.min(newMembers, enroll.activated) },
  ]
  return (
    <Card>
      <CardHeader
        title="Enrollment funnel"
        description={period.label}
        actions={<CardLink href={reportHref(ENROLLMENT)}>Report</CardLink>}
      />
      <ol className="flex flex-1 flex-col justify-center gap-4 p-4">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Progress
              value={pct(s.value, enroll.added)}
              className="gap-1.5 [&_[data-slot=progress-track]]:h-2"
            >
              <ProgressLabel className="text-[13px]">{s.label}</ProgressLabel>
              <span className="ml-auto flex items-baseline gap-2 tabular-nums">
                <span className="text-sm font-semibold">{s.value}</span>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {i === 0 ? "All patients" : `${pct(s.value, steps[i - 1].value)}% of previous`}
                </span>
              </span>
            </Progress>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trend card                                                                 */
/* -------------------------------------------------------------------------- */

/** Three numbers for the current period over bars for the last few
    periods, one bar group per period. */
function TrendCard({
  title,
  report,
  stats,
  config,
  stacked,
  rows,
}: {
  title: string
  report: Report
  stats: { label: string; value: string }[]
  config: ChartConfig
  stacked?: boolean
  rows: { period: Period; counts: Counts }[]
}) {
  const reduced = useReducedMotion()
  const keys = Object.keys(config)
  const data = rows.map((r) => ({
    /* Six months read as "Oct"; quarters and years keep their full label. */
    label: rows.length > 4 ? r.period.label.slice(0, 3) : r.period.label,
    period: r.period.label,
    ...Object.fromEntries(keys.map((k) => [k, r.counts[k]])),
  }))
  return (
    <Card>
      <CardHeader
        title={title}
        actions={<CardLink href={reportHref(report)}>Report</CardLink>}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(config).map(([k, c]) => (
            <li key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>
        <ChartContainer config={config} className="aspect-auto h-[196px] w-full">
          <BarChart
            data={data}
            margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            barCategoryGap={stacked ? "28%" : "20%"}
          >
            <Grid />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)", radius: 6 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, p) => (p?.[0]?.payload as { period?: string })?.period ?? ""}
                />
              }
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId={stacked ? "period" : undefined}
                fill={`var(--color-${k})`}
                stroke="var(--card)"
                strokeWidth={stacked ? 2 : 0}
                isAnimationActive={!reduced}
                shape={(props: React.ComponentProps<typeof Rectangle>) => (
                  <Rectangle
                    {...props}
                    radius={!stacked || i === keys.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                )}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}
