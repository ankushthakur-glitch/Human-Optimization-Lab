"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { IconCheck } from "@/design-system/icons"
import { Button } from "@/design-system/ui/button"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Badge, ChartCardSkeleton, ZoneLabel } from "@/components/dashboard-kit-v2"
import type { Source } from "@/lib/brief/types"
import type { Patient } from "@/components/practice/practice-data"
import { NOW, usDay } from "@/components/provider/mock-clock"
import { reportKey } from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import type { OpenSection } from "@/components/patient-dashboard/ui"
import type { Optimization } from "@/components/patient-dashboard/optimization/model"
import type { BandKey } from "@/components/patient-dashboard/optimization/rules"
import { BodyComposition, BodyProgress } from "@/components/patient-dashboard/optimization-v2/body"
import { SinceBrief } from "@/components/patient-dashboard/optimization-v2/brief"
import { ScoreByCategory } from "@/components/patient-dashboard/optimization-v2/categories"
import { Markers } from "@/components/patient-dashboard/optimization-v2/markers"
import { Medications } from "@/components/patient-dashboard/optimization-v2/medications"
import { NeedsYou } from "@/components/patient-dashboard/optimization-v2/needs-you"
import { InterventionPanel, Plan } from "@/components/patient-dashboard/optimization-v2/plan"
import { MarkerPanel, OrderPanel, PlanReviewPanel, ReportPanel } from "@/components/patient-dashboard/optimization-v2/panels"
import { AboutPerson } from "@/components/patient-dashboard/optimization-v2/person"
import { TopPriorities } from "@/components/patient-dashboard/optimization-v2/priorities"
import { needsYouRows } from "@/components/patient-dashboard/optimization-v2/rules"
import { OptimizationScore } from "@/components/patient-dashboard/optimization-v2/score"
import { CardSkeleton, goTo } from "@/components/patient-dashboard/optimization-v2/ui"

/* The chart's Dashboard > Overview for an optimization member: is the plan
   working, and what to approve, change or order next. Four tiers, top to
   bottom, in the order of the physician's questions: Needs you now (what
   is dangerous, and the one approval that blocks the plan), Summary (the
   composed brief beside the person), Work (the HOLv.9 markers, score,
   priorities and medications), Progress (body series and DEXA) and
   Context (the plan and the category scores). Every value comes from the
   models; the HOLv.9 snapshot renders as the sheet shows it. The free
   view's model carries the shared parts (orders, medication cases,
   reviews), so Mark reviewed works the same in both. */

const SPAN: Record<number, string> = { 4: "xl:col-span-4", 8: "xl:col-span-8", 12: "xl:col-span-12" }

type Slot = { id: string; span: number; node: React.ReactNode }

/** A row of cards; an empty card leaves, and a lone card takes the row. */
function Row({ slots }: { slots: Slot[] }) {
  const shown = slots.filter((s) => s.node)
  if (shown.length === 0) return null
  if (shown.length === 1) return <>{shown[0].node}</>
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-12">
      {shown.map((s) => (
        <div key={s.id} className={cn("min-w-0", SPAN[s.span])}>
          {s.node}
        </div>
      ))}
    </div>
  )
}

const pronounOf = (sex?: string): "she" | "he" | "they" => (sex === "Female" ? "she" : sex === "Male" ? "he" : "they")

export function OptimizationDashboard({
  dash,
  opt,
  patient,
  onOpen,
}: {
  dash: Dashboard
  opt: Optimization
  patient: Patient
  onOpen: OpenSection
}) {
  const core = dash.model
  const model = opt.model
  const [band, setBand] = React.useState<BandKey>("Out of target")
  const [category, setCategory] = React.useState<string | undefined>()
  const [marker, setMarker] = React.useState<{ names: string[]; index: number } | null>(null)
  const [reportAt, setReportAt] = React.useState<string | null>(null)
  const [orderAt, setOrderAt] = React.useState<string | null>(null)
  const [lane, setLane] = React.useState<{ names: string[]; index: number } | null>(null)
  const [planOpen, setPlanOpen] = React.useState(false)
  const opener = React.useRef<HTMLElement | null>(null)
  const ctx = React.useMemo(() => ({ core, opt: model, pronoun: pronounOf(patient.sex) }), [core, model, patient.sex])

  if (!dash.ready || !opt.ready || !model) return <OptimizationSkeleton />

  const syncAt = patient.lastSyncAt ?? NOW
  const rows = needsYouRows(core, model)
  const report = core.data.reports.find((r) => reportKey(r) === reportAt)
  const order = core.orders.find((o) => o.key === orderAt)

  /** Opens a marker; from a list, Previous and Next walk the list. */
  const openMarker = (name: string, from: HTMLElement, list?: string[]) => {
    opener.current = from
    const names = list && list.includes(name) ? list : [name]
    setMarker({ names, index: names.indexOf(name) })
  }
  const openReportByName = (name: string, from: HTMLElement) => {
    const r = core.data.reports.find((x) => x.report === name)
    if (!r) return
    opener.current = from
    setReportAt(reportKey(r))
  }
  const openPlan = (from: HTMLElement) => {
    opener.current = from
    setPlanOpen(true)
  }

  /** A brief chip opens its record: a panel, or the card that holds it. */
  const openSource = (s: Source) => {
    const from = document.activeElement as HTMLElement
    if (s.kind === "lab") {
      const names = s.refId.split("|").filter((n) => model.marker(n))
      if (names.length) openMarker(names[0], from, names)
      else onOpen("labs")
    } else if (s.kind === "document") {
      if (s.refId === "tracker") goTo("markers")
      else if (core.data.reports.some((r) => reportKey(r) === s.refId)) {
        opener.current = from
        setReportAt(s.refId)
      } else onOpen("documents")
    } else if (s.kind === "order") {
      opener.current = from
      setOrderAt(s.refId)
    } else if (s.kind === "medication" || s.kind === "patient") goTo("meds")
    else if (s.kind === "encounter") onOpen("encounters")
    else if (s.kind === "plan") openPlan(from)
    else onOpen("dashboard")
  }

  const pickBand = (b: BandKey) => {
    setBand(b)
    goTo("markers")
  }
  const pickCategory = (c: string) => {
    setCategory((cur) => (cur === c ? undefined : c))
    goTo("markers")
  }

  return (
    <div className="flex flex-col gap-4">
      <NeedsYou
        rows={rows}
        checkedAt={syncAt}
        onReviewReport={(key, from) => {
          opener.current = from
          setReportAt(key)
        }}
        onReviewItem={(key, from) => {
          opener.current = from
          if (key.startsWith("result:")) onOpen("labs")
          else goTo("about")
        }}
        onReviewPlan={openPlan}
        onOpenCheckIn={() => goTo("about")}
      />

      <ZoneLabel className="mt-2">Summary</ZoneLabel>
      <Row
        slots={[
          { id: "brief", span: 8, node: <SinceBrief ctx={ctx} patientId={patient.id} generatedAt={syncAt} onOpenSource={openSource} /> },
          { id: "about", span: 4, node: model.data.commitment ? <AboutPerson model={model} firstName={patient.firstName} /> : null },
        ]}
      />

      <ZoneLabel className="mt-2">Work</ZoneLabel>
      <div className="grid items-stretch gap-4 xl:grid-cols-12">
        <div className={cn("min-w-0", SPAN[8])}>
          <Markers
            model={model}
            band={band}
            category={category}
            onBand={setBand}
            onClearCategory={() => setCategory(undefined)}
            onOpen={openMarker}
            onOrder={opt.actions.orderTest}
            onLabs={() => onOpen("labs")}
          />
        </div>
        <div className={cn("grid min-w-0 content-start gap-4 xl:grid-rows-[auto_minmax(0,1fr)]", SPAN[4])}>
          <OptimizationScore model={model} band={band} onBand={pickBand} onLabs={() => onOpen("labs")} />
          {model.priorities.length > 0 && (
            <div className="min-h-0">
              <TopPriorities
                model={model}
                onApprove={opt.actions.approvePriorities}
                onEdit={openPlan}
                onOpenMarker={openMarker}
                onOpenReport={openReportByName}
              />
            </div>
          )}
        </div>
      </div>
      <Medications
        core={core}
        model={model}
        onAll={() => onOpen("medications")}
        onDecide={dash.actions.reconcile}
        onAddConflict={opt.actions.addConflictToPriorities}
        onOpenMarker={openMarker}
      />

      {(model.goals.length > 0 || model.data.scans.length > 0) && (
        <>
          <ZoneLabel className="mt-2">Progress</ZoneLabel>
          <Row
            slots={[
              { id: "body", span: 8, node: model.goals.length > 0 ? <BodyProgress model={model} /> : null },
              { id: "composition", span: 4, node: model.data.scans.length > 0 ? <BodyComposition model={model} /> : null },
            ]}
          />
        </>
      )}

      {(model.lanes.length > 0 || model.categories.length > 0) && (
        <>
          <ZoneLabel className="mt-2">Context</ZoneLabel>
          <Plan
            model={model}
            onOpen={(l, from) => {
              opener.current = from
              const names = model.lanes.map((x) => x.name)
              setLane({ names, index: names.indexOf(l.key) })
            }}
          />
          <ScoreByCategory model={model} selected={category} onSelect={pickCategory} />
        </>
      )}

      <MarkerPanel
        model={model}
        names={marker?.names ?? []}
        index={marker?.index ?? 0}
        onIndex={(index) => setMarker((m) => m && { ...m, index })}
        onClose={() => setMarker(null)}
        onLabs={() => {
          setMarker(null)
          onOpen("labs")
        }}
        returnFocus={opener}
      />
      <ReportPanel
        report={report}
        onClose={() => setReportAt(null)}
        onReviewed={(r) =>
          dash.actions.reviewOne(
            reportKey(r),
            (w) => w.type === "abnormal_result" && w.payload.kind === "report" && w.payload.name === r.report
          )
        }
        onDocuments={() => {
          setReportAt(null)
          onOpen("documents")
        }}
        returnFocus={opener}
      />
      <OrderPanel order={order} onClose={() => setOrderAt(null)} returnFocus={opener} />
      <InterventionPanel
        model={model}
        names={lane?.names ?? []}
        index={lane?.index ?? 0}
        onIndex={(index) => setLane((l) => l && { ...l, index })}
        onClose={() => setLane(null)}
        returnFocus={opener}
      />
      <PlanReviewPanel
        model={model}
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        returnFocus={opener}
        onDecide={opt.actions.decideDraft}
        onApproveAll={opt.actions.approvePlan}
        onOpenMarker={(name, from) => {
          setPlanOpen(false)
          openMarker(name, from)
        }}
        onOpenReport={(name, from) => {
          setPlanOpen(false)
          openReportByName(name, from)
        }}
      />
    </div>
  )
}

/** The right side of the sub-tab bar: membership, plan and review, Mark reviewed. */
export function OptimizationToolbar({ dash, opt }: { dash: Dashboard; opt: Optimization }) {
  if (!dash.ready || !opt.model) return null
  const review = dash.model.review
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      <Badge tone="primary">Optimization member</Badge>
      <span className="text-[13px] text-muted-foreground tabular-nums">
        Plan since {usDay(opt.model.data.planSince)} · {review ? `Last review ${usDay(review.at)} · ${review.by}` : "Not yet reviewed"}
      </span>
      <Button size="sm" onClick={dash.actions.review}>
        <IconCheck data-icon="inline-start" />
        {dash.model.validation ? "Validate record" : "Mark reviewed"}
      </Button>
    </div>
  )
}

/** Every card's skeleton, in the layout's shape. */
function OptimizationSkeleton() {
  const zone = <Skeleton className="h-4 w-32 rounded-sm" />
  const row = (spans: number[], nodes: React.ReactNode[]) => (
    <div className="grid items-start gap-4 xl:grid-cols-12">
      {nodes.map((n, i) => (
        <div key={i} className={cn("min-w-0", SPAN[spans[i]])}>
          {n}
        </div>
      ))}
    </div>
  )
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {zone}
      <Skeleton className="h-[112px] w-full rounded-[7.2px]" />
      {zone}
      {row([8, 4], [<CardSkeleton key="b" rows={4} tall />, <CardSkeleton key="a" rows={3} tall />])}
      {zone}
      {row([8, 4], [<CardSkeleton key="m" rows={12} />, <CardSkeleton key="s" rows={8} />])}
      <CardSkeleton rows={3} />
      {zone}
      {row([8, 4], [<ChartCardSkeleton key="c" cells={4} body="h-[318px] w-full rounded-[5.76px]" />, <CardSkeleton key="d" rows={7} />])}
      {zone}
      <CardSkeleton rows={8} />
      <CardSkeleton rows={3} tall />
    </div>
  )
}
