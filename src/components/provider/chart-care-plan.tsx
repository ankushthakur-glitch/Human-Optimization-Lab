"use client"

import * as React from "react"
import {
  IconAdd,
  IconCheck,
  IconEdit,
  IconEye,
  IconHelp,
  IconRefresh,
  IconSparkles,
  IconThumbsDown,
  IconThumbsUp,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import { type Patient, fullName } from "@/components/practice/practice-data"
import {
  SOFT_DOT,
  SOFT_TEXT,
} from "@/components/patient-dashboard/widgets/charting-dashboard"
import { type ToneKey } from "@/components/patient-dashboard/widgets/palette"
import {
  PeekChart,
  monthYear,
} from "@/components/patient-dashboard/widgets/peek-chart"
import { ME, atLabel, nowAt } from "@/components/provider/chart-epic"
import { QuarterlyReview } from "@/components/provider/chart-quarterly-review"
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  HoverCard,
  HoverCardContent,
  HoverCardSection,
  HoverCardTrigger,
} from "@/design-system/ui/hover-card"
import { Input } from "@/design-system/ui/input"
import { toast } from "@/design-system/ui/sonner"
import { Textarea } from "@/design-system/ui/textarea"

/* The patient's care plan: the same six steps for everyone (Exercise,
   Eat, Sleep, Mind, Medication, Measure), with the items AI added from the
   record marked and the biomarker behind each. The plan is live from the
   day the patient enrolls: nothing waits on the physician to approve it,
   and there are no baseline tests to sort (27 Oct 2026). The physician can
   edit it, which saves a new version, and marks each step as AI built it
   right or wrong, with a note. Every version is kept. Built to be read in
   about a minute. Every quarter the physician reviews how the patient is
   doing on it (chart-quarterly-review.tsx). */

/* -------------------------------------------------------------- model -- */

export type Evidence = {
  name: string
  unit: string
  /** Oldest first; the last one is the latest reading. */
  values: number[]
  low?: number
  high?: number
  /** "Under 5.7", "60-100": the target range in words. */
  range: string
}

/** Every plan has these six steps, in this order. */
const STEPS = [
  "Exercise",
  "Eat",
  "Sleep",
  "Mind",
  "Medication",
  "Measure",
] as const
type Step = (typeof STEPS)[number]

export type PlanAction = {
  id: string
  /** "Strength", "Lipids": what the item is about. */
  label: string
  text: string
  often: string
  /** Set when the item is more than the step's own: AI added it from the
      record, or the physician added it. */
  source?: "AI" | "Physician"
  /** The biomarker behind an AI item. */
  evidence?: Evidence
  /** How the biomarker moved, in words: "up 34 since Apr 2022". */
  trend?: string
}

export type PlanStep = {
  id: Step
  actions: PlanAction[]
}

type PlanVersion = {
  version: number
  by: string
  role: "Patient" | "Provider"
  at: string
  steps: PlanStep[]
}

type PlanEvent = {
  id: string
  at: string
  by: string
  role: "Patient" | "Provider"
  kind: "Plan started" | "Plan updated" | "Quarterly review"
  version: number
  /** A quarterly review's outcome: "Quarter 1: On track". */
  note?: string
}

type CarePlan = {
  /** The patient's id. */
  id: string
  status: "Active"
  versions: PlanVersion[]
  events: PlanEvent[]
}

function shift(days: number, time: string) {
  const [y, m, d] = today().split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
  return `${date.toISOString().slice(0, 10)}T${time}`
}

/* --------------------------------------------------------------- seed -- */

const OLIVIA_STEPS: PlanStep[] = [
  {
    id: "Exercise",
    actions: [
      { id: "A-1", label: "Strength", text: "Full body, bands and light weights", often: "3 days a week" },
      { id: "A-2", label: "Steps", text: "8,000 a day, from the watch", often: "Daily" },
      { id: "A-3", label: "Walk", text: "Brisk walk after dinner, 20 minutes", often: "5 days a week" },
    ],
  },
  {
    id: "Eat",
    actions: [
      { id: "A-1", label: "Calories", text: "1,650 a day, from RMR 1,310 kcal", often: "Daily" },
      { id: "A-2", label: "Protein", text: "Protein at every meal, 90 g a day", often: "Daily" },
      {
        id: "A-3",
        label: "Lipids",
        text: "Saturated fat under 13 g, fiber 30 g",
        often: "Daily",
        source: "AI",
        evidence: { name: "LDL", unit: "mg/dL", values: [128, 141, 150, 162], high: 99, range: "Under 100" },
        trend: "up 34 since Apr 2022",
      },
      {
        id: "A-4",
        label: "Alcohol",
        text: "7 drinks a week, no more than 3 at once",
        often: "Weekly",
        source: "AI",
        evidence: { name: "Triglycerides", unit: "mg/dL", values: [150, 166, 174, 188], high: 149, range: "Under 150" },
      },
    ],
  },
  {
    id: "Sleep",
    actions: [
      { id: "A-1", label: "Duration", text: "7 hours, bedtime within 30 minutes", often: "Daily" },
      { id: "A-2", label: "Wind down", text: "No screens 30 minutes before bed", often: "Daily" },
    ],
  },
  {
    id: "Mind",
    actions: [
      { id: "A-1", label: "Check in", text: "Rate stress, coping and distress", often: "Daily" },
    ],
  },
  {
    id: "Medication",
    actions: [
      { id: "A-1", label: "Current", text: "Atorvastatin 10 mg at bedtime, as prescribed", often: "Daily" },
    ],
  },
  {
    id: "Measure",
    actions: [
      { id: "A-1", label: "Weight", text: "Weigh in every 2 days", often: "Every 2 days" },
      {
        id: "A-2",
        label: "Waist",
        text: "Tape at the navel, with the guide",
        often: "Every 2 weeks",
        source: "AI",
        evidence: { name: "BMI", unit: "", values: [30.2, 30.9, 31.6, 32.4], low: 18.5, high: 24.9, range: "18.5-24.9" },
        trend: "up 2.2",
      },
      { id: "A-3", label: "Retest", text: "Repeat lipid panel and HbA1c", often: "In 12 weeks" },
    ],
  },
]

const MARCUS_V1: PlanStep[] = [
  {
    id: "Exercise",
    actions: [
      { id: "A-1", label: "Strength", text: "Strength training, full body", often: "4 days a week" },
      { id: "A-2", label: "Steps", text: "7,000 a day, from the watch", often: "Daily" },
    ],
  },
  {
    id: "Eat",
    actions: [
      {
        id: "A-1",
        label: "Protein",
        text: "Protein 1.6 g per kg a day, about 130 g",
        often: "Daily",
        source: "AI",
        evidence: { name: "Lean mass", unit: "kg", values: [59.6, 59.1, 58.4, 58], low: 61, range: "Goal 61" },
        trend: "down 1.6 in a year",
      },
    ],
  },
  {
    id: "Sleep",
    actions: [
      { id: "A-1", label: "CPAP", text: "Wear CPAP all night", often: "Nightly" },
    ],
  },
  {
    id: "Mind",
    actions: [
      { id: "A-1", label: "Check in", text: "Rate stress, coping and distress", often: "Daily" },
    ],
  },
  {
    id: "Medication",
    actions: [
      {
        id: "A-1",
        label: "Supplements",
        text: "Vitamin D3 2,000 IU with calcium 600 mg",
        often: "Daily",
        source: "AI",
        evidence: { name: "Vitamin D", unit: "ng/mL", values: [34, 29, 24], low: 30, high: 100, range: "30-100" },
        trend: "down 10 in 6 months",
      },
    ],
  },
  {
    id: "Measure",
    actions: [
      { id: "A-1", label: "Weight", text: "Weigh in", often: "Weekly" },
      { id: "A-2", label: "Retest", text: "Repeat DEXA scan", often: "In 6 months" },
    ],
  },
]
const MARCUS_V2: PlanStep[] = MARCUS_V1.map((s) =>
  s.id === "Exercise"
    ? {
        ...s,
        actions: s.actions.map((a) =>
          a.id === "A-1" ? { ...a, often: "3 days a week" } : a
        ),
      }
    : s
)

function seed(): CarePlan[] {
  return [
    {
      id: "P10240",
      status: "Active",
      versions: [
        {
          version: 1,
          by: "Olivia Bennett",
          role: "Patient",
          at: shift(-90, "08:42"),
          steps: OLIVIA_STEPS,
        },
      ],
      events: [
        {
          id: "EV-1",
          at: shift(-90, "08:42"),
          by: "Olivia Bennett",
          role: "Patient",
          kind: "Plan started",
          version: 1,
        },
      ],
    },
    {
      id: "P10318",
      status: "Active",
      versions: [
        {
          version: 1,
          by: "Marcus Hale",
          role: "Patient",
          at: shift(-178, "19:05"),
          steps: MARCUS_V1,
        },
        {
          version: 2,
          by: ME,
          role: "Provider",
          at: shift(-150, "15:20"),
          steps: MARCUS_V2,
        },
      ],
      events: [
        {
          id: "EV-1",
          at: shift(-178, "19:05"),
          by: "Marcus Hale",
          role: "Patient",
          kind: "Plan started",
          version: 1,
        },
        {
          id: "EV-2",
          at: shift(-150, "15:20"),
          by: ME,
          role: "Provider",
          kind: "Plan updated",
          version: 2,
        },
        {
          id: "EV-3",
          at: shift(-87, "16:10"),
          by: ME,
          role: "Provider",
          kind: "Quarterly review",
          version: 2,
          note: "Quarter 1: Needs changes",
        },
      ],
    },
  ]
}

export const carePlans = createCollection<CarePlan>(
  "hol-care-plans",
  seed(),
  "v5"
)

const countOf = (steps: PlanStep[]) => {
  const all = steps.flatMap((s) => s.actions)
  return { items: all.length, ai: all.filter((a) => a.source === "AI").length }
}

/* ---------------------------------------------------------- feedback -- */

/* The physician's verdict on a step as AI built it: right, or wrong and
   why, each with the physician's own note. Kept per patient and step so the clinical team can tune the rules
   and the AI; one verdict per step, the latest wins. */

const FEEDBACK_REASONS = [
  "Not supported by the record",
  "Not right for this patient",
  "Unsafe or contraindicated",
  "Plan items not right",
  "Duplicate of another item",
  "Other",
] as const
type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export type AiFeedback = {
  /** `${patientId}/${planId}` */
  id: string
  patientId: string
  /** The step: "Eat". */
  planId: string
  planName: string
  rating: "Right" | "Wrong"
  reasons: FeedbackReason[]
  note?: string
  by: string
  at: string
}

export const aiFeedback = createCollection<AiFeedback>(
  "hol-ai-plan-feedback",
  [],
  "v1"
)

function saveFeedback(next: Omit<AiFeedback, "id" | "by" | "at">) {
  const id = `${next.patientId}/${next.planId}`
  const entry: AiFeedback = { ...next, id, by: ME, at: nowAt() }
  if (aiFeedback.get().some((f) => f.id === id)) aiFeedback.patch(id, entry)
  else aiFeedback.add([entry])
}

/* -------------------------------------------------------------- diff -- */

/** What one version changed from the one before, in plain lines. */
function changesBetween(before: PlanVersion, after: PlanVersion) {
  const lines: string[] = []
  for (const s of after.steps) {
    const old = before.steps.find((x) => x.id === s.id)?.actions ?? []
    for (const a of s.actions) {
      const was = old.find((x) => x.id === a.id)
      if (!was) lines.push(`${s.id}, added: ${a.text}, ${a.often.toLowerCase()}`)
      else {
        if (was.text !== a.text)
          lines.push(`${s.id}, changed: ${was.text} to ${a.text}`)
        if (was.often !== a.often)
          lines.push(
            `${a.text}: ${was.often.toLowerCase()} to ${a.often.toLowerCase()}`
          )
      }
    }
    for (const a of old)
      if (!s.actions.some((x) => x.id === a.id))
        lines.push(`${s.id}, removed: ${a.text}`)
  }
  return lines
}

/** Ids of items that differ between two versions. */
function changedIds(
  before: Pick<PlanVersion, "steps"> | undefined,
  after: Pick<PlanVersion, "steps">
) {
  const ids = new Set<string>()
  if (!before) return ids
  for (const s of after.steps) {
    const old = before.steps.find((x) => x.id === s.id)
    for (const a of s.actions)
      if (
        JSON.stringify(a) !==
        JSON.stringify(old?.actions.find((x) => x.id === a.id))
      )
        ids.add(`${s.id}/${a.id}`)
  }
  return ids
}

/* -------------------------------------------------------------- view -- */

export type CarePlanTab = "plan" | "review" | "history"

export function CarePlanView({
  patient,
  tab: asked,
  onTab,
}: {
  patient: Patient
  /** Unset: the plan. */
  tab?: CarePlanTab
  onTab: (tab: CarePlanTab) => void
}) {
  const { items } = carePlans.use()
  const plan = items.find((p) => p.id === patient.id)
  /* Plan edits, only while Edit plan is on. */
  const [draft, setDraft] = React.useState<PlanStep[] | null>(null)

  if (!plan)
    return (
      <Section>
        <SectionBar title="Care plan" />
        <SectionBody className="flex">
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyTitle>No care plan yet</EmptyTitle>
              <EmptyDescription>
                When {patient.firstName} enrolls in optimization, the
                plan shows here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </SectionBody>
      </Section>
    )

  const tab: CarePlanTab = asked ?? "plan"
  const latest = plan.versions[plan.versions.length - 1]
  const lastEvent = plan.events[plan.events.length - 1]
  const editing = draft !== null
  const steps = draft ?? latest.steps
  const edited = changedIds(latest, { steps })

  /* A step flagged as wrong can lose what AI added to it at once: Edit
     plan opens without those items, for the physician to save. */
  const dropAi = (id: string) => {
    const base = draft ?? latest.steps
    onTab("plan")
    setDraft(
      base.map((s) =>
        s.id === id
          ? { ...s, actions: s.actions.filter((a) => a.source !== "AI") }
          : s
      )
    )
  }

  const save = () => {
    const kept = steps.map((s) => ({
      ...s,
      actions: s.actions.filter((a) => a.text.trim()),
    }))
    const at = nowAt()
    const version = latest.version + 1
    carePlans.patch(plan.id, {
      versions: [
        ...plan.versions,
        { version, by: ME, role: "Provider", at, steps: kept },
      ],
      events: [
        ...plan.events,
        {
          id: nextId("EV", plan.events),
          at,
          by: ME,
          role: "Provider",
          kind: "Plan updated",
          version,
        },
      ],
    })
    setDraft(null)
    const n = countOf(kept).items
    toast.success("Care plan updated", {
      description: `Version ${version} for ${patient.firstName} with ${n} ${n === 1 ? "item" : "items"}.`,
    })
  }

  const pill = "h-6 rounded-full px-2.5 text-[13px] font-normal"
  const actions = editing ? (
      <>
        <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
          Cancel
        </Button>
        <Button size="sm" onClick={save}>
          <IconCheck />
          Save changes
        </Button>
      </>
    ) : (
      <>
        <Badge variant="success" className={pill}>
          {plan.status}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onTab("plan")
            setDraft(latest.steps)
          }}
        >
          <IconRefresh />
          Revise plan
        </Button>
      </>
    )

  return (
    <Section>
      <SectionBar
        tabs={[
          {
            id: "plan",
            label: `Plan (version ${editing ? latest.version + 1 : latest.version})`,
          },
          { id: "review", label: "Quarterly review" },
          { id: "history", label: `History (${plan.events.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as CarePlanTab)}
        actions={actions}
      />
      <SectionBody className="flex flex-col gap-3 *:shrink-0">
        {tab === "history" ? (
          <History plan={plan} />
        ) : tab === "review" ? (
          <QuarterlyReview
            patient={patient}
            started={plan.versions[0].at.slice(0, 10)}
            onEditPlan={() => {
              onTab("plan")
              setDraft(latest.steps)
            }}
            onReviewed={(review, quarter) =>
              carePlans.patch(plan.id, {
                events: [
                  ...plan.events,
                  {
                    id: nextId("EV", plan.events),
                    at: review.at,
                    by: review.by,
                    role: "Provider",
                    kind: "Quarterly review",
                    version: latest.version,
                    note: `Quarter ${quarter}: ${review.outcome}`,
                  },
                ],
              })
            }
          />
        ) : (
          <>
            {editing ? (
              <div className="rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
                Editing version {latest.version + 1}. Changed rows are shaded.
              </div>
            ) : (
              <StatusNote patient={patient} lastEvent={lastEvent} />
            )}
            <StepsBlock
              steps={steps}
              editing={editing}
              edited={edited}
              onChange={(next) => draft && setDraft(next)}
              feedback={{
                patientId: patient.id,
                onDrop: dropAi,
              }}
            />
          </>
        )}
      </SectionBody>
    </Section>
  )
}

/* The line that says where the plan stands: live since the patient
   enrolled, or who last updated it and when. */
function StatusNote({
  patient,
  lastEvent,
}: {
  patient: Patient
  lastEvent: PlanEvent
}) {
  const title =
    lastEvent.kind === "Plan started"
      ? `${fullName(patient)} started this plan`
      : `Plan updated, version ${lastEvent.version}`
  return (
    <Banner tone="bg-card" title={title} at={lastEvent.at}>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <span>
          <span className="text-muted-foreground">Updated by : </span>
          {lastEvent.by}
        </span>
        <span className="tabular-nums">
          <span className="text-muted-foreground">Updated on : </span>
          {atLabel(lastEvent.at)}
        </span>
        <span>
          <span className="text-muted-foreground">Version : </span>
          {lastEvent.version}
        </span>
      </div>
    </Banner>
  )
}

/* The tinted line at the top of a view: what happened, and when. */
function Banner({
  tone,
  title,
  at,
  children,
}: {
  tone: string
  title: string
  at: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("rounded-lg px-4 py-3", tone)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {atLabel(at)}
        </div>
      </div>
      {children}
    </div>
  )
}

function ChangedTag({ label = "Changed" }: { label?: string }) {
  return (
    <span className="ml-1.5 inline-flex h-4.5 items-center rounded-full bg-info-surface px-1.5 align-middle text-[11px] font-medium text-info">
      {label}
    </span>
  )
}

/* ------------------------------------------------------------- steps -- */

function StepsBlock({
  steps,
  editing,
  edited,
  onChange,
  feedback,
}: {
  steps: PlanStep[]
  editing: boolean
  edited: Set<string>
  onChange: (steps: PlanStep[]) => void
  /** Set on the live plan, not on saved versions: each step gets a verdict. */
  feedback?: FeedbackTarget
}) {
  const { items, ai } = countOf(steps)
  const ordered = STEPS.map(
    (id) => steps.find((s) => s.id === id) ?? { id, actions: [] }
  )
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 px-1 text-[15px] font-semibold">
        Optimization plan
        <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
          {STEPS.length} steps · {items} items · {ai} from the record
        </span>
      </h3>
      {ordered.map((s) => (
        <StepCard
          key={s.id}
          step={s}
          editing={editing}
          edited={edited}
          onChange={(next) =>
            onChange(ordered.map((x) => (x.id === s.id ? next : x)))
          }
          feedback={feedback}
        />
      ))}
    </section>
  )
}

/* One step: what the patient will do, with its Why one hover away. */
function StepCard({
  step,
  editing,
  edited,
  onChange,
  feedback,
}: {
  step: PlanStep
  editing: boolean
  edited: Set<string>
  onChange: (step: PlanStep) => void
  feedback?: FeedbackTarget
}) {
  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h4 className="truncate text-[15px] font-semibold">{step.id}</h4>
          <Why step={step} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {feedback && <StepFeedback step={step} target={feedback} />}
          <Badge
            variant="outline"
            className="h-5.5 rounded-full px-2 text-xs font-normal"
          >
            Every plan
          </Badge>
        </div>
      </header>
      <StepItems
        step={step}
        editing={editing}
        edited={edited}
        onChange={(actions) => onChange({ ...step, actions })}
      />
    </article>
  )
}

type FeedbackTarget = {
  patientId: string
  /** Set while the plan can still change: drops the step's AI items into
      Edit plan. */
  onDrop?: (stepId: string) => void
}

/* Right or wrong on a step as AI built it. Wrong asks why, and can take
   what AI added to the step out in the same step. */
function StepFeedback({
  step,
  target,
}: {
  step: PlanStep
  target: FeedbackTarget
}) {
  const { items } = aiFeedback.use()
  const given = items.find((f) => f.id === `${target.patientId}/${step.id}`)
  /* The verdict being written: thumbs up asks what was right, thumbs down
     what was wrong. */
  const [asking, setAsking] = React.useState<AiFeedback["rating"] | null>(null)
  const aiItems = step.actions.filter((a) => a.source === "AI").length

  return (
    <>
      {given?.rating === "Wrong" && (
        <button
          type="button"
          onClick={() => setAsking("Wrong")}
          className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-destructive/8 px-2 text-xs text-[#C4554E] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-[#DE6F68]" />
          Flagged as wrong
        </button>
      )}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${step.id} is right`}
          aria-pressed={given?.rating === "Right"}
          className={cn(given?.rating === "Right" && "text-primary")}
          onClick={() => setAsking("Right")}
        >
          <IconThumbsUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${step.id} is wrong`}
          aria-pressed={given?.rating === "Wrong"}
          className={cn(given?.rating === "Wrong" && "text-[#C4554E]")}
          onClick={() => setAsking("Wrong")}
        >
          <IconThumbsDown />
        </Button>
      </div>
      {asking && (
        <FeedbackDialog
          step={step}
          rating={asking}
          given={given?.rating === asking ? given : undefined}
          canDrop={asking === "Wrong" && target.onDrop !== undefined && aiItems > 0}
          onClose={() => setAsking(null)}
          onRemove={
            given?.rating === asking
              ? () => {
                  aiFeedback.remove(given.id)
                  setAsking(null)
                }
              : undefined
          }
          onSave={(reasons, note, drop) => {
            saveFeedback({
              patientId: target.patientId,
              planId: step.id,
              planName: step.id,
              rating: asking,
              reasons,
              note,
            })
            setAsking(null)
            if (drop) target.onDrop?.(step.id)
            toast.success("Feedback saved", {
              description: drop
                ? `Items from the record removed from ${step.id}. Save changes to keep the plan.`
                : `${step.id} marked as ${asking === "Right" ? "right" : "wrong"}.`,
            })
          }}
        />
      )}
    </>
  )
}

function FeedbackDialog({
  step,
  rating,
  given,
  canDrop,
  onClose,
  onRemove,
  onSave,
}: {
  step: PlanStep
  rating: AiFeedback["rating"]
  given?: AiFeedback
  canDrop: boolean
  onClose: () => void
  /** Set when this verdict is already saved: takes it back. */
  onRemove?: () => void
  onSave: (reasons: FeedbackReason[], note: string | undefined, drop: boolean) => void
}) {
  const right = rating === "Right"
  const [reasons, setReasons] = React.useState<FeedbackReason[]>(
    given?.reasons ?? []
  )
  const [note, setNote] = React.useState(given?.note ?? "")
  const [drop, setDrop] = React.useState(canDrop && !given)
  const text = note.trim().replace(/\s+/g, " ")
  const needsNote = right ? !text : reasons.includes("Other") && !text
  const ready = (right || reasons.length > 0) && !needsNote

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {right ? "Right suggestion" : "Wrong suggestion"}: {step.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tell the clinical team what is {right ? "right" : "wrong"} with
            this step as AI built it.
          </DialogDescription>
        </DialogHeader>
        <form
          id="ai-feedback-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) onSave(reasons, text || undefined, drop)
          }}
        >
          {!right && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              What is wrong
            </legend>
            {FEEDBACK_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2.5 text-sm"
              >
                <Checkbox
                  checked={reasons.includes(r)}
                  onCheckedChange={(c) =>
                    setReasons(
                      c === true
                        ? FEEDBACK_REASONS.filter(
                            (x) => x === r || reasons.includes(x)
                          )
                        : reasons.filter((x) => x !== r)
                    )
                  }
                />
                {r}
              </label>
            ))}
          </fieldset>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-feedback-note" className="text-sm font-medium">
              {right ? "Feedback" : `Details${reasons.includes("Other") ? "" : " (optional)"}`}
            </label>
            <Textarea
              id="ai-feedback-note"
              rows={3}
              maxLength={500}
              autoFocus={right}
              value={note}
              placeholder={right ? "What the AI got right" : "What should the AI have suggested"}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {canDrop && (
            <label className="flex cursor-pointer items-center gap-2.5 border-t pt-4 text-sm">
              <Checkbox
                checked={drop}
                onCheckedChange={(c) => setDrop(c === true)}
              />
              Remove the items from the record in {step.id}
            </label>
          )}
        </form>
        <DialogFooter>
          {onRemove && (
            <Button variant="ghost" className="sm:mr-auto" onClick={onRemove}>
              Remove feedback
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="ai-feedback-form" disabled={!ready}>
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* The chip on an item that is more than the step's own. */
function SourceTag({ source }: { source: NonNullable<PlanAction["source"]> }) {
  return source === "Physician" ? (
    <Badge
      variant="outline"
      className="h-5.5 gap-1 rounded-full px-2 align-middle text-xs font-normal"
    >
      <IconEdit className="size-3.5" />
      Added by physician
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="h-5.5 gap-1 rounded-full px-2 align-middle text-xs font-normal"
    >
      <IconSparkles className="size-3.5" />
      From the record
    </Badge>
  )
}

const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "")

/* The evidence, opened by hovering the word "Why", drawn as the
   dashboard's peek card: the step, then each biomarker behind its items
   from the record with its status in colour, the range, the chart and how
   it moved. */
const PEEK = "w-80 rounded-2xl p-4 shadow-[0_16px_40px_rgba(16,24,40,.12)]"

/* Readings are quarterly, the latest from Sep 2026. */
function readingDates(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8 - (n - 1 - i) * 3, 15))
    return d.toISOString().slice(0, 10)
  })
}

const flagOf = (e: Evidence) => {
  const last = e.values[e.values.length - 1]
  return e.high !== undefined && last > e.high
    ? "High"
    : e.low !== undefined && last < e.low
      ? "Low"
      : null
}

function Why({ step }: { step: PlanStep }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={300}
        closeDelay={220}
        render={
          <button
            type="button"
            className="inline-flex shrink-0 cursor-default items-center gap-1 rounded-sm text-[13px] font-medium text-primary-tint outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        }
      >
        <IconHelp className="size-3.5" />
        <span className="underline decoration-dotted underline-offset-4">
          Why
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        followCursor={false}
        className={PEEK}
      >
        <WhyCard step={step} />
      </HoverCardContent>
    </HoverCard>
  )
}

/** A dot and a word; no tone is the grey of "nothing to flag". */
function StatusLine({
  tone,
  word,
  qualifier,
}: {
  tone?: ToneKey
  word: string
  qualifier?: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-[13px]">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone ? SOFT_DOT[tone] : "bg-muted-foreground/40"
        )}
      />
      <span
        className={cn(
          "font-medium",
          tone ? SOFT_TEXT[tone] : "text-muted-foreground"
        )}
      >
        {word}
        {qualifier && (
          <span className="font-normal text-muted-foreground tabular-nums">
            {`, ${qualifier}`}
          </span>
        )}
      </span>
    </span>
  )
}

function WhyCard({ step }: { step: PlanStep }) {
  const evidence = step.actions.flatMap((a) => a.evidence ?? [])
  const out = evidence.filter((e) => flagOf(e)).length
  return (
    <div className="flex flex-col">
      <HoverCardSection className="gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] leading-5 font-semibold">
            {step.id}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            Every plan
          </span>
        </div>
        {evidence.length ? (
          <StatusLine
            tone={out ? "red" : "green"}
            word={
              out
                ? `${out} of ${evidence.length} markers out of range`
                : "Markers in range"
            }
          />
        ) : (
          <StatusLine word="Nothing added from the record" />
        )}
      </HoverCardSection>
      {evidence.map((e) => {
        const flag = flagOf(e)
        const dates = readingDates(e.values.length)
        const points = e.values.map((value, i) => ({ date: dates[i], value }))
        const last = e.values[e.values.length - 1]
        const prev = e.values[e.values.length - 2]
        return (
          <HoverCardSection key={e.name} className="gap-2.5">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold">{e.name}</span>
              <StatusLine
                tone={flag ? "red" : "green"}
                word={flag ?? "In range"}
                qualifier={`range ${e.range}${e.unit ? ` ${e.unit}` : ""}`}
              />
            </div>
            <PeekChart
              points={points}
              low={e.low}
              high={e.high}
              unit={e.unit}
              digits={e.values.some((v) => !Number.isInteger(v)) ? 1 : 0}
            />
            {prev !== undefined && (
              <p className="text-[13px] leading-5 text-foreground/80">
                {last > prev ? "Up" : last < prev ? "Down" : "Unchanged"} from{" "}
                {fmt(prev)} in {monthYear(dates[dates.length - 2])}.
              </p>
            )}
          </HoverCardSection>
        )
      })}
    </div>
  )
}

/* The biomarker behind an item from the record: its latest reading, in
   colour when out of range, and how it moved. */
function Marker({ evidence: e, trend }: { evidence: Evidence; trend?: string }) {
  const last = e.values[e.values.length - 1]
  return (
    <span className="ml-2 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
      {e.name}{" "}
      <span className={cn("font-medium", flagOf(e) && SOFT_TEXT.red)}>
        {fmt(last)}
      </span>
      {trend && ` · ${trend}`}
    </span>
  )
}

function StepItems({
  step,
  editing,
  edited,
  onChange,
}: {
  step: PlanStep
  editing: boolean
  edited: Set<string>
  onChange: (actions: PlanAction[]) => void
}) {
  const actions = step.actions
  const set = (id: string, patch: Partial<PlanAction>) =>
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  if (!editing)
    return actions.length ? (
      <ul className="divide-y">
        {actions.map((a) => (
          <li
            key={a.id}
            className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-2.5 text-sm"
          >
            <span className="text-[13px] text-muted-foreground">{a.label}</span>
            <span>
              {a.text}
              {a.source && (
                <span className="ml-2">
                  <SourceTag source={a.source} />
                </span>
              )}
              {a.evidence && <Marker evidence={a.evidence} trend={a.trend} />}
              {edited.has(`${step.id}/${a.id}`) && <ChangedTag />}
            </span>
            <span className="text-[13px] text-muted-foreground">{a.often}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-4 py-2.5 text-sm text-muted-foreground">No items</p>
    )

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {actions.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md p-1",
            edited.has(`${step.id}/${a.id}`) && "bg-info-surface/60"
          )}
        >
          <Input
            aria-label="Label"
            value={a.label}
            onChange={(e) => set(a.id, { label: e.target.value })}
            className="h-8 w-32"
          />
          <Input
            aria-label="What to do"
            value={a.text}
            onChange={(e) => set(a.id, { text: e.target.value })}
            className="h-8 min-w-48 flex-1"
          />
          <Input
            aria-label="How often"
            value={a.often}
            onChange={(e) => set(a.id, { often: e.target.value })}
            className="h-8 w-36"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${a.text || "item"}`}
            onClick={() => onChange(actions.filter((x) => x.id !== a.id))}
          >
            <IconTrash />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={() =>
          onChange([
            ...actions,
            { id: nextId("A", actions), label: "", text: "", often: "Daily", source: "Physician" },
          ])
        }
      >
        <IconAdd />
        Add item
      </Button>
    </div>
  )
}

/* ----------------------------------------------------------- history -- */

/* Every step of the loop, newest first, with what each version changed. */
function History({ plan }: { plan: CarePlan }) {
  const events = [...plan.events].reverse()
  const [viewing, setViewing] = React.useState<number | null>(null)
  const latest = plan.versions[plan.versions.length - 1].version
  return (
    <>
      <ol className="flex flex-col gap-3">
        {events.map((e) => {
          const v = plan.versions.find((x) => x.version === e.version)
          const before = plan.versions.find((x) => x.version === e.version - 1)
          const changes =
            e.kind === "Plan updated" && v && before
              ? changesBetween(before, v)
              : e.note
                ? [e.note]
                : []
          return (
            <li key={e.id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      e.kind === "Plan updated"
                        ? "bg-primary"
                        : e.kind === "Quarterly review"
                          ? "bg-success"
                          : "bg-info"
                    )}
                  />
                  <span className="font-semibold">{e.kind}</span>
                  <span className="text-muted-foreground">
                    by {e.by} ({e.role === "Patient" ? "Patient" : "Provider"})
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {atLabel(e.at)} · Version {e.version}
                </span>
              </div>
              {changes.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 pl-4 text-[13px] text-muted-foreground">
                  {changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {v && (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2.5 ml-4"
                  onClick={() => setViewing(e.version)}
                >
                  <IconEye />
                  View plan
                </Button>
              )}
            </li>
          )
        })}
      </ol>
      <VersionDialog
        plan={plan}
        version={viewing}
        current={viewing === latest}
        onClose={() => setViewing(null)}
      />
    </>
  )
}

/* One saved version of the plan, read only, with what it changed from the
   version before marked on its rows. */
function VersionDialog({
  plan,
  version,
  current,
  onClose,
}: {
  plan: CarePlan
  version: number | null
  current: boolean
  onClose: () => void
}) {
  const v = plan.versions.find((x) => x.version === version)
  const before = plan.versions.find((x) => x.version === (version ?? 0) - 1)
  const changed = v ? changedIds(before, v) : new Set<string>()
  return (
    <Dialog open={v !== undefined} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-4 sm:max-w-4xl">
        <DialogHeader className="gap-1 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              Care plan, version {v?.version}
            </DialogTitle>
            {current && (
              <Badge
                variant="info"
                className="h-5 rounded-full px-2 text-xs font-normal"
              >
                Current
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground tabular-nums">
            {v &&
              `${v.version === 1 ? "Started by" : "Updated by"} ${v.by} (${v.role}) on ${atLabel(v.at)}`}
          </DialogDescription>
        </DialogHeader>
        {v && (
          <div className="-mx-1 flex max-h-[65dvh] flex-col gap-3 overflow-y-auto px-1">
            <StepsBlock
              steps={v.steps}
              editing={false}
              edited={changed}
              onChange={() => {}}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
