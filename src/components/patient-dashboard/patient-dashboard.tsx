"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { IconCheck } from "@/design-system/icons"
import { Button } from "@/design-system/ui/button"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Badge, DoneRow, ZoneLabel } from "@/components/dashboard-kit-v2"
import type { Patient } from "@/components/practice/practice-data"
import { usDay } from "@/components/provider/mock-clock"
import { PatientBrief } from "@/components/patient-dashboard/brief"
import { Medications } from "@/components/patient-dashboard/medications"
import {
  intakeKey,
  reportKey,
  useDashboard,
} from "@/components/patient-dashboard/model"
import { OrdersAndGaps } from "@/components/patient-dashboard/orders-gaps"
import { OutsideCare } from "@/components/patient-dashboard/outside-care"
import { AboutPerson } from "@/components/patient-dashboard/person-card"
import { ProblemsAndControl } from "@/components/patient-dashboard/problems"
import { RecommendDialog } from "@/components/patient-dashboard/recommend-dialog"
import { RecordSources } from "@/components/patient-dashboard/record-sources"
import { ResultDetail } from "@/components/patient-dashboard/result-detail"
import {
  Results,
  type ResultsTab,
} from "@/components/patient-dashboard/results"
import type { SectionId, Zone } from "@/components/patient-dashboard/rules"
import { CardSkeleton } from "@/components/patient-dashboard/section-card"
import {
  type OpenSection,
  goToSection,
  sectionDomId,
} from "@/components/patient-dashboard/ui"
import { UrgentAlert } from "@/components/patient-dashboard/urgent-alert"
import { type PatientContext, type Source, composeBrief } from "@/lib/brief"

/* The chart's Dashboard > Overview for a free member, read top to bottom
   in the order of the physician's questions: Needs you now (is anything
   dangerous), Summary (what changed, and where did it come from), Work
   (what do I act on) and Context. Only out-of-range, trending, changed or
   overdue items appear. Cards keep fixed positions; a card with nothing to
   show drops out and its row partner takes the full width; a zone with
   nothing in it drops out too, except Needs you now, which shows its done
   state. Every count, row and sentence comes from the rules in rules.ts
   and the brief composer over the patient's data.

   The chart calls useDashboard once and hands it to both the toolbar (on
   the right of the Overview / Face sheet / Timeline bar) and the content. */

export { useDashboard }
export type Dashboard = ReturnType<typeof useDashboard>

/** 12-column spans, for Tailwind to see each one. */
const SPAN: Record<number, string> = {
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  8: "xl:col-span-8",
  12: "xl:col-span-12",
}

/** "she", "he" or "they", for the brief's sentences. */
export function pronounOf(sex: string | undefined): PatientContext["pronoun"] {
  if (/^f/i.test(sex ?? "")) return "she"
  if (/^m/i.test(sex ?? "")) return "he"
  return "they"
}

export function PatientDashboard({
  dash,
  patient,
  onOpen,
}: {
  dash: Dashboard
  patient: Patient
  onOpen: OpenSection
}) {
  const { ready, model, actions } = dash
  const [tab, setTab] = React.useState<ResultsTab>("out")
  const [picked, setPicked] = React.useState<string | null>(null)
  const pronoun = pronounOf(patient.sex)
  const ctx = React.useMemo<PatientContext>(
    () => ({ core: model, pronoun }),
    [model, pronoun]
  )
  const brief = React.useMemo(
    () => (ready ? composeBrief("patient", ctx) : []),
    [ready, ctx]
  )
  const waited = useDelay(250)

  if (!ready)
    return waited ? (
      <DashboardSkeleton />
    ) : (
      <div aria-busy className="min-h-[60vh]" />
    )

  /* The row shown in Result detail: the picked one, else the first listed. */
  const listed = tab === "trending" ? model.trending : model.outOfRange
  const pool = [...model.outOfRange, ...model.trending]
  const selected =
    pool.find((l) => l.code === picked) ??
    listed[0] ??
    model.outOfRange[0] ??
    model.trending[0]

  /** Scrolls to a card after the state that fills it has rendered. */
  const jump = (id: SectionId) => requestAnimationFrame(() => goToSection(id))

  const showResult = (code: string) => {
    setTab(
      model.outOfRange.some((l) => l.code === code) ||
        !model.trending.some((l) => l.code === code)
        ? "out"
        : "trending"
    )
    setPicked(code)
    jump("results")
  }

  const reviewReport = (r: { report: string; date: string }) =>
    actions.reviewOne(
      reportKey(r),
      (w) =>
        w.type === "abnormal_result" &&
        w.payload.kind === "report" &&
        w.payload.name === r.report
    )

  /** A source chip goes to the record it names: the result, report, visit, medication or order. */
  const openSource = (s: Source) => {
    switch (s.kind) {
      case "lab": {
        const code = s.refId.startsWith("result:")
          ? s.refId.split(":")[1]
          : s.refId
        const lab = model.data.labs.find(
          (l) => l.code === code || l.name === s.refId
        )
        if (lab) showResult(lab.code)
        else jump("results")
        return
      }
      case "document":
        setTab("reports")
        jump("results")
        return
      case "encounter":
        jump("outside")
        return
      case "medication":
      case "patient":
        jump("meds")
        return
      case "order":
      case "filter":
        jump("orders")
        return
      default:
        jump("results")
    }
  }

  const card = (id: SectionId) => {
    switch (id) {
      case "alert":
        return (
          <UrgentAlert
            items={model.urgent}
            onReview={() => {
              const first = model.urgent[0]
              if (first?.target.kind === "result") showResult(first.target.code)
              else {
                setTab("reports")
                jump("results")
              }
            }}
          />
        )
      case "brief":
        return model.validation ? (
          <RecordSources model={model} />
        ) : (
          <PatientBrief
            ctx={ctx}
            items={brief}
            syncedAt={patient.lastSyncAt}
            onOpenSource={openSource}
          />
        )
      case "person":
        return (
          <AboutPerson
            model={model}
            firstName={patient.preferredName || patient.firstName}
            onReview={() =>
              actions.reviewOne(
                intakeKey(model.intake!),
                (w) =>
                  w.type === "review_due" &&
                  w.payload.review === "Intake summary"
              )
            }
          />
        )
      case "results":
        return (
          <Results
            model={model}
            tab={tab}
            onTab={setTab}
            selected={selected?.code}
            onSelect={setPicked}
            onOpen={onOpen}
            onReviewReport={reviewReport}
          />
        )
      case "detail":
        return selected ? (
          <ResultDetail
            lab={selected}
            model={model}
            onOrderRepeat={actions.orderRepeat}
          />
        ) : null
      case "meds":
        return (
          <Medications
            model={model}
            onOpen={onOpen}
            onDecide={actions.reconcile}
            onUndo={actions.undoReconcile}
          />
        )
      case "orders":
        return <OrdersAndGaps model={model} act={actions} />
      case "outside":
        return <OutsideCare model={model} onOpen={onOpen} />
      case "problems":
        return <ProblemsAndControl model={model} />
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {model.layout.map((zone) => (
        <ZoneSection
          key={zone.id}
          zone={zone}
          count={zone.id === "needs" ? model.urgent.length : undefined}
        >
          {zone.id === "needs" && zone.rows.length === 0 ? (
            <DoneRow
              id={sectionDomId("alert")}
              title="Nothing needs you now"
              meta={
                model.review
                  ? `No urgent results · last review ${usDay(model.review.at)}`
                  : "No urgent results · not yet reviewed"
              }
            />
          ) : (
            zone.rows.map((row) =>
              row.length === 1 ? (
                <React.Fragment key={row[0].id}>
                  {card(row[0].id)}
                </React.Fragment>
              ) : (
                <div
                  key={row.map((c) => c.id).join("-")}
                  className="grid items-stretch gap-4 xl:grid-cols-12"
                >
                  {row.map((c) => (
                    <div key={c.id} className={cn("min-w-0", SPAN[c.span])}>
                      {card(c.id)}
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </ZoneSection>
      ))}
    </div>
  )
}

/** A tier: its label, then its cards 16px apart. */
function ZoneSection({
  zone,
  count,
  children,
}: {
  zone: Zone
  count?: number
  children: React.ReactNode
}) {
  return (
    <section aria-label={zone.label} className="flex flex-col gap-4">
      <ZoneLabel count={count} tone={zone.id === "needs" ? "error" : "neutral"}>
        {zone.label}
      </ZoneLabel>
      {children}
    </section>
  )
}

/** True once `ms` have passed, so a skeleton shows only for a slow load. */
function useDelay(ms: number) {
  const [done, setDone] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setDone(true), ms)
    return () => clearTimeout(t)
  }, [ms])
  return done
}

/** The right side of the sub-tab bar: membership, last review, actions. */
export function DashboardToolbar({ dash }: { dash: Dashboard }) {
  const { ready, model, actions, free } = dash
  const [opening, setOpening] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  if (!ready) return null
  const { review, validation } = model
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      {free && <Badge tone="primary">Free member</Badge>}
      <span className="text-[13px] text-muted-foreground tabular-nums">
        {review
          ? `Last review ${usDay(review.at)} · ${review.by}`
          : "Not yet reviewed"}
      </span>
      {free && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpening((n) => n + 1)
            setOpen(true)
          }}
        >
          Recommend optimization
        </Button>
      )}
      <Button size="sm" onClick={actions.review}>
        <IconCheck data-icon="inline-start" />
        {validation ? "Validate record" : "Mark reviewed"}
      </Button>
      {free && (
        <RecommendDialog
          key={opening}
          model={model}
          open={open}
          onOpenChange={setOpen}
          onSend={actions.recommend}
        />
      )}
    </div>
  )
}

/** Every zone's skeleton, in the default layout's shape. */
function DashboardSkeleton() {
  const label = <Skeleton className="h-4 w-32 rounded-sm" />
  const pair = (
    left: React.ReactNode,
    right: React.ReactNode,
    spans: [number, number] = [8, 4]
  ) => (
    <div className="grid items-stretch gap-4 xl:grid-cols-12">
      <div className={cn("min-w-0", SPAN[spans[0]])}>{left}</div>
      <div className={cn("min-w-0", SPAN[spans[1]])}>{right}</div>
    </div>
  )
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <div className="flex flex-col gap-4">
        {label}
        <Skeleton className="h-[62px] w-full rounded-[7.2px]" />
      </div>
      <div className="flex flex-col gap-4">
        {label}
        {pair(<CardSkeleton rows={4} tall />, <CardSkeleton rows={3} />)}
      </div>
      <div className="flex flex-col gap-4">
        {label}
        {pair(<CardSkeleton rows={5} />, <CardSkeleton rows={2} tall />)}
        <CardSkeleton rows={3} />
        {pair(
          <CardSkeleton rows={2} tall />,
          <CardSkeleton rows={2} tall />,
          [6, 6]
        )}
      </div>
      <div className="flex flex-col gap-4">
        {label}
        <CardSkeleton rows={2} tall />
      </div>
    </div>
  )
}
