"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { ChartCardSkeleton } from "@/components/dashboard-kit"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import { reportKey } from "@/components/patient-dashboard/model"
import { OrdersAndGaps } from "@/components/patient-dashboard/orders-gaps"
import { CardSkeleton, type OpenSection, goToSection } from "@/components/patient-dashboard/ui"
import { BodyProgress, DexaRmr, EnergyBalance } from "@/components/patient-dashboard/optimization-computed/parts/charts"
import { CommitmentCard } from "@/components/patient-dashboard/optimization-computed/parts/commitment"
import { TopPriorities } from "@/components/patient-dashboard/optimization-computed/parts/markers"
import { Medications } from "@/components/patient-dashboard/optimization-computed/parts/medications"
import type { Optimization } from "@/components/patient-dashboard/optimization/model"
import { MarkerPanel, ReportPanel } from "@/components/patient-dashboard/optimization-computed/parts/panels"
import { PlanGantt, PlanReviewPanel } from "@/components/patient-dashboard/optimization-computed/parts/plan"
import type { SinceKind } from "@/components/patient-dashboard/optimization/rules"
import { Alerts, SinceStrip } from "@/components/patient-dashboard/optimization-computed/parts/summary"
import { goTo } from "@/components/patient-dashboard/optimization-computed/parts/ui"
import { CategoryMix } from "@/components/patient-dashboard/optimization-computed/category-mix"
import { Goals } from "@/components/patient-dashboard/optimization-computed/goals"
import { MarkersByCategory } from "@/components/patient-dashboard/optimization-computed/markers"
import { type Group, buildV2 } from "@/components/patient-dashboard/optimization-computed/rules"
import { Outcomes, PanelScore } from "@/components/patient-dashboard/optimization-computed/summary"

/* Version 2 of the optimization member's Overview. It answers the same
   question as version 1 (is the plan working, and what to approve, change
   or order next) but computes its top half from the biomarker rows by the
   brief's rules instead of rendering the HOLv.9 sheet's snapshot: the
   panel score and its five status groups, every marker grouped by
   category with the category's score, what each intervention has
   achieved, and progress toward each goal. The shared cards (alerts,
   since last review, body progress, DEXA and RMR, medications, plan,
   energy, orders, commitment) and the side panels are version 1's, so
   both versions act on the same session state. */

const SPAN: Record<number, string> = {
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  8: "xl:col-span-8",
  12: "xl:col-span-12",
}

type Slot = { id: string; span: number; node: React.ReactNode }

function Row({ slots }: { slots: Slot[] }) {
  const shown = slots.filter((s) => s.node)
  if (shown.length === 0) return null
  if (shown.length === 1) return <>{shown[0].node}</>
  const even = 12 / shown.length
  const spans = shown.length === slots.length ? shown.map((s) => s.span) : shown.map(() => even)
  return (
    <div className="grid items-stretch gap-3 xl:grid-cols-12">
      {shown.map((s, i) => (
        <div key={s.id} className={cn("min-w-0", SPAN[spans[i]])}>
          {s.node}
        </div>
      ))}
    </div>
  )
}

export function OptimizationDashboardV2({ dash, opt, onOpen }: { dash: Dashboard; opt: Optimization; onOpen: OpenSection }) {
  const core = dash.model
  const model = opt.model
  const v2 = React.useMemo(() => (model ? buildV2(model) : undefined), [model])
  const [group, setGroup] = React.useState<Group>("Out of target")
  const [marker, setMarker] = React.useState<{ names: string[]; index: number } | null>(null)
  const [reportAt, setReportAt] = React.useState<string | null>(null)
  const [planOpen, setPlanOpen] = React.useState(false)
  const opener = React.useRef<HTMLElement | null>(null)

  if (!dash.ready || !opt.ready || !model || !v2) return <SkeletonV2 />

  /** Opens a marker; from the markers table, Previous and Next walk the group. */
  const openMarker = (name: string, from: HTMLElement, list?: string[]) => {
    opener.current = from
    const names = list && list.includes(name) ? list : [name]
    setMarker({ names, index: names.indexOf(name) })
  }
  const groupNames = v2.groups[group].flatMap((g) => g.markers.map((b) => b.name))
  const report = core.reports.find((r) => reportKey(r) === reportAt)

  const pickGroup = (g: Group) => {
    setGroup(g)
    goTo("markers")
  }

  const jump = (kind: SinceKind) => {
    if (kind === "medications") goTo("meds")
    else if (kind === "orders") goToSection("orders")
    else if (kind === "targets") pickGroup("In range")
    else if (kind === "results") goTo("markers")
    else if (kind === "diagnoses") onOpen("diagnoses")
    else onOpen("documents")
  }

  return (
    <div className="flex flex-col gap-3">
      <Alerts
        model={model}
        core={core}
        onReviewPlan={() => {
          opener.current = document.activeElement as HTMLElement
          setPlanOpen(true)
        }}
        onReviewReport={(key) => {
          opener.current = document.activeElement as HTMLElement
          setReportAt(key)
        }}
      />
      <SinceStrip model={model} onJump={jump} />
      <PanelScore v2={v2} group={group} onGroup={pickGroup} />
      <Outcomes v2={v2} onOpen={openMarker} />

      <Row
        slots={[
          {
            id: "markers",
            span: 8,
            node: (
              <MarkersByCategory
                v2={v2}
                group={group}
                onGroup={setGroup}
                onOpen={(name, from) => openMarker(name, from, groupNames)}
                onLabs={() => onOpen("labs")}
              />
            ),
          },
          {
            id: "side",
            span: 4,
            node:
              v2.goals.length + model.priorities.length + model.toOrder.length > 0 ? (
                <div className="flex h-full flex-col gap-3">
                  <Goals v2={v2} onOpen={openMarker} />
                  {model.priorities.length + model.toOrder.length > 0 && (
                    <div className="min-h-0 flex-1">
                      <TopPriorities
                        model={model}
                        onApprove={opt.actions.approvePriorities}
                        onOrder={opt.actions.orderTest}
                        onOpen={openMarker}
                      />
                    </div>
                  )}
                </div>
              ) : null,
          },
        ]}
      />
      <Row
        slots={[
          { id: "mix", span: 6, node: v2.categories.length > 0 ? <CategoryMix v2={v2} /> : null },
          { id: "body", span: 6, node: model.goals.length > 0 ? <BodyProgress model={model} /> : null },
        ]}
      />
      <Row
        slots={[
          { id: "dexa", span: 6, node: model.data.scans.length > 0 ? <DexaRmr model={model} /> : null },
          {
            id: "meds",
            span: 6,
            node: (
              <Medications
                model={model}
                core={core}
                onAll={() => onOpen("medications")}
                onDecide={dash.actions.reconcile}
                onAddConflict={opt.actions.addConflictToPriorities}
                onOpenMarker={openMarker}
              />
            ),
          },
        ]}
      />
      <PlanGantt model={model} />
      <Row
        slots={[
          { id: "energy", span: 4, node: model.data.energy.length > 0 ? <EnergyBalance model={model} /> : null },
          {
            id: "orders",
            span: 4,
            node: core.orders.length + core.gaps.length > 0 ? <OrdersAndGaps model={core} act={dash.actions} compact /> : null,
          },
          { id: "commitment", span: 4, node: model.data.commitment ? <CommitmentCard model={model} /> : null },
        ]}
      />

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
      />
    </div>
  )
}

/** Every card's skeleton, in version 2's shape. */
function SkeletonV2() {
  const row = (spans: number[], nodes: React.ReactNode[]) => (
    <div className="grid items-start gap-3 xl:grid-cols-12">
      {nodes.map((n, i) => (
        <div key={i} className={cn("min-w-0", SPAN[spans[i]])}>
          {n}
        </div>
      ))}
    </div>
  )
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {row([6, 6], [<Skeleton key="a" className="h-[62px] rounded-[7.2px]" />, <Skeleton key="b" className="h-[62px] rounded-[7.2px]" />])}
      <Skeleton className="h-[58px] w-full rounded-[7.2px]" />
      <Skeleton className="h-[118px] w-full rounded-[7.2px]" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-[7.2px]" />
        ))}
      </div>
      {row([8, 4], [<CardSkeleton key="m" rows={12} />, <CardSkeleton key="g" rows={6} tall />])}
      {row([6, 6], [<ChartCardSkeleton key="c" bodyClassName="h-[460px]" />, <ChartCardSkeleton key="b" cells={2} bodyClassName="h-[300px]" />])}
      {row([6, 6], [<ChartCardSkeleton key="d" bodyClassName="h-[240px]" />, <CardSkeleton key="m" rows={6} />])}
      <CardSkeleton rows={9} />
      {row([4, 4, 4], [<ChartCardSkeleton key="e" bodyClassName="h-[200px]" />, <CardSkeleton key="o" rows={2} tall />, <CardSkeleton key="c" rows={3} />])}
    </div>
  )
}
