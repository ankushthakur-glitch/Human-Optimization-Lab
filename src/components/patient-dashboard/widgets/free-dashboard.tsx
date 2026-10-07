"use client"

import * as React from "react"
import {
  Medicine02Icon,
  PieChart01Icon,
  Stethoscope02Icon,
  Table01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Badge, TrendWord } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import {
  SYSTOLIC_HIGH,
  comparable,
  isOverdue,
  isRising,
  latestOf,
  rangeText,
  readingStatus,
  shortSource,
  statusOf,
  trendOf,
} from "@/components/patient-dashboard/rules"
import type { ControlMarker, DashCondition, LabResult } from "@/components/patient-dashboard/types"
import { CardSkeleton, HeaderLink, type OpenSection } from "@/components/patient-dashboard/ui"
import { CareGaps } from "@/components/patient-dashboard/widgets/care-charts"
import { bands, valueOf } from "@/components/patient-dashboard/widgets/free-bands"
import {
  type Column,
  DonutWithTable,
  StatusDonut,
  SUBTLE,
  TabbedTable,
  TYPE_SCALE,
  Widget,
  WidgetTabs,
} from "@/components/patient-dashboard/widgets/kit"
import { TONE, type ToneKey } from "@/components/patient-dashboard/widgets/palette"
import { Fact } from "@/components/patient-dashboard/widgets/programs"
import { Pill } from "@/components/patient-dashboard/widgets/status"
import { MetricStatus, MetricTrends, type TrendMetric } from "@/components/patient-dashboard/widgets/trends"

/* The free member's Dashboard, laid out as the optimization member's and
   filled from their own EHR record. The result summary donut sits beside
   the picked band's table (Out of range, On watch, Due or overdue, In
   range). A free member has no enrolled plan, so the plan panel's place
   goes to their active problems, one tab each: the problem's facts and its
   control marker, then the markers that follow it as vertical tabs beside
   their trend (the same MetricTrends the plans use). Then the care gaps (donut and table, linked), and the medication list with any source that
   disagrees. Every card is a Widget, as on the provider home. */

type Band = "out" | "watch" | "due" | "range"

const BANDS: { key: Band; label: string; tone: ToneKey }[] = [
  { key: "out", label: "Out of range", tone: "red" },
  { key: "watch", label: "On watch", tone: "orange" },
  { key: "due", label: "Due or overdue", tone: "violet" },
  { key: "range", label: "In range", tone: "green" },
]

type DueRow = ReturnType<typeof bands>["due"][number]

const LAB_COLUMNS: Column<LabResult>[] = [
  { head: "Test", className: "min-w-44 whitespace-normal text-sm font-medium text-foreground", cell: (l) => l.name },
  {
    head: "Latest",
    cell: (l) => {
      const s = statusOf(l)
      return <span className={cn("text-sm font-semibold tabular-nums", s !== "In range" && TONE.red.text)}>{valueOf(l)}</span>
    },
  },
  { head: "Range", className: "text-[13px] text-muted-foreground tabular-nums", cell: (l) => rangeText(l) || "None" },
  {
    head: "Status",
    cell: (l) => {
      const s = statusOf(l)
      return <Pill tone={s === "In range" ? "green" : "red"}>{s}</Pill>
    },
  },
  { head: "Trend", cell: (l) => <TrendWord trend={trendOf(l)} rising={isRising(l)} /> },
  {
    head: "Source",
    className: "text-xs text-muted-foreground tabular-nums",
    cell: (l) => {
      const r = latestOf(l)
      return r ? `${shortSource(r.source)} · ${usDay(r.date)}` : "None"
    },
  },
]

const DUE_COLUMNS: Column<DueRow>[] = [
  { head: "Item", className: "min-w-44 whitespace-normal text-sm font-medium text-foreground", cell: (d) => d.name },
  { head: "Type", className: "text-[13px] text-muted-foreground", cell: (d) => d.kind },
  { head: "Since", className: "text-[13px] tabular-nums", cell: (d) => (d.since ? usDay(d.since) : "None") },
  {
    head: "Status",
    cell: (d) => (isOverdue(d.clock) ? <Pill tone="red">Overdue</Pill> : <Pill tone="violet">Due</Pill>),
  },
  { head: "Reminders", className: "text-xs text-muted-foreground tabular-nums", cell: (d) => d.reminders },
]

/* ---------------------------------------------------------- problems -- */

/** The labs that follow each control marker, the marker itself first. */
const PROBLEM_LABS: Record<ControlMarker, string[]> = {
  hba1c: ["4548-4", "1558-6", "27873-9"],
  ldl: ["13457-7", "2571-8", "2085-9"],
  egfr: ["33914-3", "2160-0"],
  tsh: ["3016-3"],
  bp: [],
  weight: [],
}

/** Diastolic above this reads as raised (ACC/AHA stage 1). */
const DIASTOLIC_HIGH = 80

const monthOf = (since: string) =>
  new Date(`${since.slice(0, 7)}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })

function labMetric(lab: LabResult): TrendMetric | undefined {
  const readings = comparable(lab)
  const last = readings[readings.length - 1]
  if (!last) return undefined
  const points = readings.map((r) => ({
    date: r.date,
    value: r.value,
    out: readingStatus(lab, r) !== "In range",
    source: shortSource(r.source),
  }))
  return {
    id: lab.code,
    label: lab.name,
    unit: lab.unit,
    value: String(last.value),
    points,
    low: lab.refLow,
    high: lab.refHigh,
    target: rangeText(lab) || undefined,
    meta: (
      <>
        {rangeText(lab) && <span>Range {rangeText(lab)}</span>}
        <MetricStatus m={{ points, low: lab.refLow, high: lab.refHigh }} noun="range" />
      </>
    ),
    aside: readings.length > 1 && <TrendWord trend={trendOf(lab)} rising={isRising(lab)} />,
  }
}

function bpMetrics(model: DashboardModel): TrendMetric[] {
  const bp = [...model.data.bp].sort((a, b) => a.date.localeCompare(b.date))
  if (bp.length === 0) return []
  const series = (id: string, label: string, high: number, pick: (r: (typeof bp)[number]) => number): TrendMetric => {
    const points = bp.map((r) => ({ date: r.date, value: pick(r), out: pick(r) > high, source: shortSource(r.source) }))
    const asLab: LabResult = {
      code: id,
      name: label,
      unit: "mmHg",
      refHigh: high,
      betterDirection: "lower",
      history: bp.map((r) => ({ date: r.date, value: pick(r), source: r.source, isOutsideSource: false })),
    }
    return {
      id,
      label,
      unit: "mmHg",
      value: String(pick(bp[bp.length - 1])),
      points,
      high,
      target: `under ${high}`,
      meta: (
        <>
          <span>Under {high}</span>
          <MetricStatus m={{ points, high }} noun="range" />
        </>
      ),
      aside: bp.length > 1 && <TrendWord trend={trendOf(asLab)} rising={isRising(asLab)} />,
    }
  }
  return [
    series("bp-sys", "Systolic BP", SYSTOLIC_HIGH, (r) => r.systolic),
    series("bp-dia", "Diastolic BP", DIASTOLIC_HIGH, (r) => r.diastolic),
  ]
}

type ProblemTab = { condition: DashCondition; metrics: TrendMetric[] }

/** Every active problem with a control marker that has readings. */
function problemTabs(model: DashboardModel): ProblemTab[] {
  return model.problems
    .map(({ condition }) => {
      const marker = condition.controlMarker
      if (!marker) return undefined
      const metrics =
        marker === "bp"
          ? bpMetrics(model)
          : PROBLEM_LABS[marker]
              .map((code) => model.data.labs.find((l) => l.code === code))
              .map((lab) => lab && labMetric(lab))
              .filter((m): m is TrendMetric => Boolean(m))
      return metrics.length ? { condition, metrics } : undefined
    })
    .filter((p): p is ProblemTab => Boolean(p))
}

function ProblemPanel({ tabs }: { tabs: ProblemTab[] }) {
  const [picked, setPicked] = React.useState(tabs[0].condition.icd10)
  const tab = tabs.find((t) => t.condition.icd10 === picked) ?? tabs[0]
  const { condition, metrics } = tab
  const lead = metrics[0]
  const last = lead.points[lead.points.length - 1]

  return (
    <Widget
      icon={Stethoscope02Icon}
      title="Active problems"
      flush
      tabs={
        <WidgetTabs
          label="Active problems"
          tabs={tabs.map((t) => ({ id: t.condition.icd10, label: t.condition.name }))}
          value={tab.condition.icd10}
          onTab={setPicked}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-4 py-3.5">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Fact label="Diagnosed" value={monthOf(condition.since)} />
          <Fact label="ICD-10" value={condition.icd10} />
          <Fact label="Recorded by" value={shortSource(condition.source)} />
          <Fact label="Latest data" value={usDay(last.date.slice(0, 10))} />
        </dl>
        <div className="ml-auto flex w-full min-w-56 flex-col gap-1 sm:w-72">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">{lead.label}</span>
            <span className={cn("font-semibold tabular-nums", last.out ? TONE.red.text : "text-primary")}>
              {lead.value}
              {lead.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{lead.unit}</span>}
            </span>
          </span>
        </div>
      </div>
      <MetricTrends key={condition.icd10} metrics={metrics} label="Problem markers" />
    </Widget>
  )
}

/* --------------------------------------------------------- dashboard -- */

export function FreeWidgetDashboard({ dash, onOpen }: { dash: Dashboard; onOpen: OpenSection }) {
  const { ready, model } = dash
  const b = React.useMemo(() => (ready ? bands(model) : null), [ready, model])
  const problems = React.useMemo(() => (ready ? problemTabs(model) : []), [ready, model])
  const [band, setBand] = React.useState<Band>("out")

  if (!ready || !b)
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <CardSkeleton rows={6} />
        <CardSkeleton rows={3} />
      </div>
    )

  const counts: Record<Band, number> = {
    out: b.out.length,
    watch: b.watch.length,
    due: b.due.length,
    range: b.inRange.length,
  }
  const total = counts.out + counts.watch + counts.due + counts.range
  const tabs = BANDS.map((x) => ({ id: x.key, label: `${x.label} (${counts[x.key]})` }))
  const labs = band === "out" ? b.out : band === "watch" ? b.watch : b.inRange
  const meds = model.data.medications.filter((m) => m.isPracticeList)
  const caseOf = (name: string) => model.cases.find((c) => c.medication.toLowerCase() === name.toLowerCase())

  return (
    <div className={cn("flex flex-col gap-4", TYPE_SCALE)}>
      <DonutWithTable
        donut={
          <Widget icon={PieChart01Icon} title="Result summary">
            <StatusDonut
              slices={BANDS.map((x) => ({ key: x.key, label: x.label, value: counts[x.key], color: SUBTLE[x.tone] }))}
              total={total}
              totalLabel="Total tracked"
              selected={band}
              onSelect={setBand}
            />
          </Widget>
        }
        table={
          band === "due" ? (
            <TabbedTable
              icon={Table01Icon}
              title="Results by status"
              tabs={tabs}
              value={band}
              onTab={setBand}
              columns={DUE_COLUMNS}
              rows={b.due}
              rowKey={(d) => d.key}
              empty="Nothing is due"
            />
          ) : (
            <TabbedTable
              icon={Table01Icon}
              title="Results by status"
              tabs={tabs}
              value={band}
              onTab={setBand}
              columns={LAB_COLUMNS}
              rows={labs}
              rowKey={(l) => l.code}
              onRow={() => onOpen("labs")}
              empty="No results in this band"
            />
          )
        }
      />

      {problems.length > 0 && <ProblemPanel tabs={problems} />}

      <CareGaps gaps={model.gaps} orders={model.orders} />

      <Widget
        icon={Medicine02Icon}
        title="Medications"
        count={meds.length}
        action={<HeaderLink onClick={() => onOpen("medications")}>All medications</HeaderLink>}
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48 pl-4">Medicines</TableHead>
              <TableHead>Sig</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Prescriber</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meds.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No medications on the practice list
                </TableCell>
              </TableRow>
            )}
            {meds.map((m) => {
              const c = caseOf(m.medication)
              return (
                <TableRow key={m.medication}>
                  <TableCell className="pl-4 whitespace-normal">
                    <span className="text-sm font-medium">{m.medication}</span>
                    <span className="ml-1.5 text-[13px] text-muted-foreground tabular-nums">{m.dose}</span>
                  </TableCell>
                  <TableCell className="min-w-56 text-[13px] whitespace-normal">{m.sig || "None"}</TableCell>
                  <TableCell className="text-[13px] tabular-nums">{usDay(m.date.slice(0, 10))}</TableCell>
                  <TableCell className="text-[13px]">{m.prescriber}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{shortSource(m.source)}</TableCell>
                  <TableCell className="pr-4">
                    {c?.allergy ? (
                      <Pill tone="red">{`${c.allergy} allergy`}</Pill>
                    ) : c?.other ? (
                      <Pill tone="orange">{`${shortSource(c.other.source)} differs`}</Pill>
                    ) : (
                      <Badge tone="success" dot>
                        Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Widget>
    </div>
  )
}
