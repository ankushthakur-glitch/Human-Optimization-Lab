"use client"

import * as React from "react"
import { Medicine02Icon, PieChart01Icon, Table01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Badge } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import type { Optimization } from "@/components/patient-dashboard/optimization/model"
import { shown, targetText } from "@/components/patient-dashboard/optimization/rules"
import type { SnapshotMarker } from "@/components/patient-dashboard/optimization/types"
import { HeaderLink, type OpenSection } from "@/components/patient-dashboard/ui"
import { type DrawerState, MetricDetailDrawer } from "@/components/patient-dashboard/widgets/detail-drawer"
import { buildAnalytics } from "@/components/patient-dashboard/widgets/metrics"
import { TONE, type ToneKey } from "@/components/patient-dashboard/widgets/palette"
import { Pill } from "@/components/patient-dashboard/widgets/status"
import { DailySteps, EnergyBalance, HeartRisk, SleepNights } from "@/components/patient-dashboard/widgets/program-charts"
import { PROGRAMS, buildProgram } from "@/components/patient-dashboard/widgets/programs"
import { ProgramGoals, ProgramPanel, ProgramPriorities } from "@/components/patient-dashboard/widgets/program-panel"
import {
  type Column,
  DonutWithTable,
  StatusDonut,
  SUBTLE,
  TabbedTable,
  TYPE_SCALE,
  Widget,
} from "@/components/patient-dashboard/widgets/kit"

/* The optimization member's Dashboard, read from the HOLv.9 tracker's
   Dashboard sheet as it prints: the result summary as a donut beside the
   marker table of the picked band (Out of target, On watch, Not yet
   tested, Optimal or in range, with the sheet's columns), then the plans
   the member is enrolled in as tabs (widgets/program-panel.tsx): facts and
   goal, metrics as vertical tabs beside their trend; under it the plan's
   own two charts (energy balance and sleep, or heart risk and steps); then the plan's goals
   (its interventions), its priorities, and the medications as the chart's
   Medications tab lists them. Every card is a Widget (icon and grey label
   over a ruled line), as on the provider home. A row opens the marker's
   detail drawer. */

type Band = "out" | "watch" | "untested" | "optimal"


const BANDS: { key: Band; label: string; tone: ToneKey }[] = [
  { key: "out", label: "Out of target", tone: "red" },
  { key: "watch", label: "On watch", tone: "orange" },
  { key: "untested", label: "Not yet tested", tone: "violet" },
  { key: "optimal", label: "Optimal or in range", tone: "green" },
]

type MarkerRow = Omit<SnapshotMarker, "status" | "tier"> & { status: string; tier?: string; category?: string }

const STATUS_TONE: Record<string, ToneKey> = {
  High: "red",
  Low: "red",
  Watch: "orange",
  "Not yet tested": "violet",
  Optimal: "green",
  "In range": "green",
}

const UNITLESS = /^(ratio|index|qualitative|genotype)$/

const MARKER_COLUMNS: Column<MarkerRow>[] = [
  {
    head: "Biomarker",
    className: "min-w-44 whitespace-normal",
    cell: (r) => (
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{r.name}</span>
        {r.category && <span className="text-xs text-muted-foreground">{r.category}</span>}
      </span>
    ),
  },
  {
    head: "Latest",
    className: "whitespace-normal",
    cell: (r) =>
      r.latest ? (
        <span
          className={cn(
            "text-sm font-semibold text-foreground tabular-nums",
            STATUS_TONE[r.status] === "red" && TONE.red.text
          )}
        >
          {shown(r.latest)}
          {r.unit && !UNITLESS.test(r.unit) && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">{r.unit}</span>
          )}
        </span>
      ) : (
        <span className="text-[13px] text-muted-foreground">Not resulted</span>
      ),
  },
  { head: "Target", className: "text-[13px] text-muted-foreground tabular-nums", cell: (r) => r.target || "None" },
  { head: "Status", cell: (r) => <Pill tone={STATUS_TONE[r.status] ?? "green"}>{r.status}</Pill> },
  { head: "What to do", className: "min-w-44 whitespace-normal text-[13px] text-foreground/80", cell: (r) => r.whatToDo || "None" },
]

export function MemberWidgetDashboard({ opt, onOpen }: { opt: Optimization; onOpen: OpenSection }) {
  const model = opt.model!
  const sheet = model.data.snapshot
  const analytics = React.useMemo(() => buildAnalytics(model), [model])
  const [band, setBand] = React.useState<Band>("out")
  const [drawer, setDrawer] = React.useState<DrawerState | null>(null)
  /* The plans the member is enrolled in (weight loss, diabetes control),
     one tab each, under the result summary. */
  const [planId, setPlanId] = React.useState(PROGRAMS[0].id)
  const plan = PROGRAMS.find((p) => p.id === planId) ?? PROGRAMS[0]
  const program = React.useMemo(() => buildProgram(plan, model), [plan, model])

  const rows = React.useMemo(() => {
    const listed = new Set(
      Object.values(sheet.bands)
        .flat()
        .map((r) => r.name.toLowerCase())
    )
    /* Optimal or in range: the tracker's rows the sheet does not band. */
    const optimal: MarkerRow[] = model.data.biomarkers
      .filter((b) => (b.status === "Optimal" || b.status === "In Range") && !listed.has(b.name.toLowerCase()))
      .map((b) => ({
        name: b.name,
        latest: b.latest?.value ?? "",
        unit: b.unit,
        target: targetText(b),
        status: b.status === "In Range" ? "In range" : "Optimal",
        tier: b.tier,
        whatToDo: b.nextStep ?? "",
        category: b.category,
      }))
    const category = new Map(model.data.biomarkers.map((b) => [b.name.toLowerCase(), b.category]))
    const withCategory = (list: SnapshotMarker[]): MarkerRow[] =>
      list.map((r) => ({ ...r, category: category.get(r.name.toLowerCase()) }))
    return {
      out: withCategory(sheet.bands["Out of target"]),
      watch: withCategory(sheet.bands["On watch"]),
      untested: withCategory(sheet.bands["Not yet tested"]),
      optimal,
    } satisfies Record<Band, MarkerRow[]>
  }, [model, sheet])

  const counts: Record<Band, number> = {
    out: sheet.counts["Out of target"],
    watch: sheet.counts["On watch"],
    untested: sheet.counts["Not yet tested"],
    optimal: sheet.counts["In range"] + sheet.counts.Optimal,
  }
  const shownRows = rows[band]
  const ids = shownRows.map((r) => analytics.metric(r.name)?.id).filter((id): id is string => Boolean(id))

  return (
    <div className={cn("flex flex-col gap-4", TYPE_SCALE)}>
      <DonutWithTable
        donut={
          <Widget icon={PieChart01Icon} title="Result summary">
            <StatusDonut
                slices={BANDS.map((b) => ({ key: b.key, label: b.label, value: counts[b.key], color: SUBTLE[b.tone] }))}
                total={sheet.markersTracked}
                totalLabel="Total tracked"
                selected={band}
                onSelect={setBand}
              />
          </Widget>
        }
        table={
          <TabbedTable
            icon={Table01Icon}
            title="Markers by status"
            tabs={BANDS.map((b) => ({ id: b.key, label: `${b.label} (${counts[b.key]})` }))}
            value={band}
            onTab={setBand}
            columns={MARKER_COLUMNS}
            rows={shownRows}
            rowKey={(r) => r.name}
            canOpen={(r) => Boolean(analytics.metric(r.name))}
            onRow={(r, from) => {
              const m = analytics.metric(r.name)
              if (m) setDrawer({ id: m.id, list: ids, from: { current: from } })
            }}
            empty="No markers in this band"
          />
        }
      />

      <ProgramPanel opt={model} program={plan} view={program} onProgram={setPlanId} />
      {/* Each program's own two charts under its panel. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {plan.id === "diabetes" ? (
          <>
            <HeartRisk markers={model.data.biomarkers} />
            {model.data.wearable && <DailySteps days={model.data.wearable.days} device={model.data.wearable.device} />}
          </>
        ) : (
          <>
            {model.data.energy.length > 0 && <EnergyBalance days={model.data.energy} />}
            {model.data.wearable && (
              <SleepNights days={model.data.wearable.days} device={model.data.wearable.device} />
            )}
          </>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ProgramGoals view={program} />
        </div>
        <div className="min-w-0">
          <ProgramPriorities view={program} />
        </div>
      </div>
      <Widget
        icon={Medicine02Icon}
        title="Medications"
        count={sheet.medications.length}
        action={<HeaderLink onClick={() => onOpen("medications")}>All medications</HeaderLink>}
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48 pl-4">Medicines</TableHead>
              <TableHead>Sig</TableHead>
              <TableHead>Dispense</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Prescriber</TableHead>
              <TableHead>RxNorm</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.medications.map((m) => (
              <TableRow key={m.name}>
                <TableCell className="pl-4 whitespace-normal">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="ml-1.5 text-[13px] text-muted-foreground tabular-nums">{m.dose}</span>
                </TableCell>
                <TableCell className="min-w-56 text-[13px] whitespace-normal">{m.sig ?? "None"}</TableCell>
                <TableCell className="text-[13px]">{m.quantity ?? "None"}</TableCell>
                <TableCell className="text-[13px] tabular-nums">{m.recorded ? usDay(m.recorded) : "None"}</TableCell>
                <TableCell className="text-[13px]">{m.prescriber}</TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">{m.rxnorm ?? "None"}</TableCell>
                <TableCell className="pr-4">
                  <Badge tone="success" dot>
                    Active
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Widget>

      <MetricDetailDrawer
        data={analytics}
        state={drawer}
        onState={setDrawer}
        onClose={() => setDrawer(null)}
        onOrder={opt.actions.orderTest}
        onPlan={() => setDrawer(null)}
        onReport={(m) => onOpen(m.category === "Body Composition" ? "documents" : "labs")}
      />
    </div>
  )
}


/** The right side of the Dashboard bar: membership. */
export function OptimizationToolbar({ dash, opt }: { dash: Dashboard; opt: Optimization }) {
  if (!dash.ready || !opt.model) return null
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      <Badge tone="primary">Optimization member</Badge>
    </div>
  )
}
