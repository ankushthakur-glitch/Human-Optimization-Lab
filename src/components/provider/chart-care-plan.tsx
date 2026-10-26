"use client"

import * as React from "react"
import {
  IconAdd,
  IconCheck,
  IconEdit,
  IconEye,
  IconHelp,
  IconSend,
  IconSparkles,
  IconThumbsDown,
  IconThumbsUp,
  IconTrash,
  IconUser,
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
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
import { setTaskStatus, tasks } from "@/components/provider/tasks/tasks-data"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Input } from "@/design-system/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { toast } from "@/design-system/ui/sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Textarea } from "@/design-system/ui/textarea"

/* The care plan's review loop (15 Oct call). AI checks the patient's record
   against Dr. Blanchard's plans and proposes up to five optimization plans;
   the patient can add their own. Each plan carries its Why: the biomarkers
   that led to it with their trend, or "Patient selected". Then the tests each
   plan needs that the record doesn't have yet, the proposed baseline. The
   physician reads it here, approves or deselects each test, edits what needs
   editing and approves, which sends it to the patient. The patient accepts it
   or asks for changes, and the physician revises. Every version is kept.
   Built to be read in about a minute: Why on the left, what to do on the
   right, tests ticked by default. */

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

const AREAS = [
  "Nutrition",
  "Exercise",
  "Sleep",
  "Medication",
  "Supplements",
  "Tests",
] as const
type Area = (typeof AREAS)[number]

export type PlanAction = {
  id: string
  area: Area
  text: string
  often: string
}

export type OptimizationPlan = {
  id: string
  name: string
  /** AI matched it from the record; the patient or the physician added
      it. Only AI plans carry evidence. */
  source: "AI" | "Patient" | "Physician"
  evidence: Evidence[]
  /** The patient's own words, for a plan they added. */
  note?: string
  actions: PlanAction[]
}

/** Plans the physician can add, from Dr. Blanchard's list (sample). */
const PLAN_CATALOG = [
  "Weight loss",
  "Muscle building",
  "Bone health",
  "Diabetes and A1C",
  "Heart health",
  "Kidney health",
  "Metabolic health",
  "Healthy aging",
  "Better sleep",
  "Maintenance",
] as const

export type BaselineTest = {
  id: string
  name: string
  /** Plan ids that need it. */
  for: string[]
  why: string
  approved: boolean
}

type PlanVersion = {
  version: number
  by: string
  role: "Patient" | "Provider"
  at: string
  plans: OptimizationPlan[]
  tests: BaselineTest[]
}

type PlanEvent = {
  id: string
  at: string
  by: string
  role: "Patient" | "Provider"
  kind:
    "Sent for review" | "Approved and sent" | "Changes requested" | "Accepted"
  version: number
  /** The patient's request, for Changes requested only. */
  note?: string
}

type PlanStatus =
  "Pending review" | "Changes requested" | "Sent to patient" | "Accepted"

type CarePlan = {
  /** The patient's id. */
  id: string
  status: PlanStatus
  versions: PlanVersion[]
  events: PlanEvent[]
}

function shift(days: number, time: string) {
  const [y, m, d] = today().split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
  return `${date.toISOString().slice(0, 10)}T${time}`
}

/* --------------------------------------------------------------- seed -- */

const OLIVIA_PLANS: OptimizationPlan[] = [
  {
    id: "OP-1",
    name: "Diabetes and A1C",
    source: "AI",
    evidence: [
      { name: "HbA1c", unit: "%", values: [5.5, 5.6, 5.8, 5.9], high: 5.6, range: "Under 5.7" },
      { name: "Fasting glucose", unit: "mg/dL", values: [96, 99, 104, 108], low: 70, high: 99, range: "70-99" },
    ],
    actions: [
      { id: "A-1", area: "Nutrition", text: "Keep added sugar under 25 g a day", often: "Daily" },
      { id: "A-2", area: "Exercise", text: "Brisk walk after dinner, 20 minutes", often: "5 days a week" },
      { id: "A-3", area: "Tests", text: "Repeat HbA1c", often: "In 12 weeks" },
    ],
  },
  {
    id: "OP-2",
    name: "Heart health",
    source: "AI",
    evidence: [
      { name: "LDL-C", unit: "mg/dL", values: [112, 118, 126, 132], high: 99, range: "Under 100" },
      { name: "Blood pressure", unit: "mmHg", values: [126, 129, 131, 134], high: 129, range: "Under 130/80" },
    ],
    actions: [
      { id: "A-1", area: "Medication", text: "Atorvastatin 10 mg at bedtime, as prescribed", often: "Daily" },
      { id: "A-2", area: "Nutrition", text: "Fibre 30 g a day, oats or beans at breakfast", often: "Daily" },
      { id: "A-3", area: "Tests", text: "Repeat lipid panel", often: "In 12 weeks" },
    ],
  },
  {
    id: "OP-3",
    name: "Weight loss",
    source: "AI",
    evidence: [
      { name: "Weight", unit: "kg", values: [74, 75.5, 77, 78], high: 72, range: "Goal 72" },
      { name: "BMI", unit: "", values: [26.4, 27.0, 27.5, 27.9], low: 18.5, high: 24.9, range: "18.5-24.9" },
    ],
    actions: [
      { id: "A-1", area: "Nutrition", text: "Protein at every meal, 90 g a day", often: "Daily" },
      { id: "A-2", area: "Exercise", text: "Strength training, full body", often: "2 days a week" },
    ],
  },
  {
    id: "OP-4",
    name: "Better sleep",
    source: "Patient",
    evidence: [],
    note: "I wake up tired most days and want to sleep through the night.",
    actions: [
      { id: "A-1", area: "Sleep", text: "In bed by 10:30 PM, 7 to 8 hours", often: "Daily" },
      { id: "A-2", area: "Sleep", text: "No screens 30 minutes before bed", often: "Daily" },
    ],
  },
]

const OLIVIA_TESTS: BaselineTest[] = [
  { id: "T-1", name: "Fasting insulin", for: ["OP-1"], why: "Not on record, shows insulin resistance", approved: true },
  { id: "T-2", name: "ApoB", for: ["OP-2"], why: "Not on record, sharper risk than LDL-C", approved: true },
  { id: "T-3", name: "hs-CRP", for: ["OP-2"], why: "Not on record", approved: true },
  { id: "T-4", name: "DEXA scan", for: ["OP-3"], why: "No body composition on record", approved: true },
  { id: "T-5", name: "RMR test", for: ["OP-3"], why: "Sets the daily calorie target", approved: true },
]

const MARCUS_V1: OptimizationPlan[] = [
  {
    id: "OP-1",
    name: "Muscle building",
    source: "AI",
    evidence: [
      { name: "Lean mass", unit: "kg", values: [59.6, 59.1, 58.4, 58], low: 61, range: "Goal 61" },
    ],
    actions: [
      { id: "A-1", area: "Exercise", text: "Strength training, full body", often: "4 days a week" },
      { id: "A-2", area: "Nutrition", text: "Protein 1.6 g per kg a day, about 130 g", often: "Daily" },
      { id: "A-3", area: "Supplements", text: "Creatine 5 g", often: "Daily" },
    ],
  },
  {
    id: "OP-2",
    name: "Bone health",
    source: "AI",
    evidence: [
      { name: "T-score, spine", unit: "", values: [-0.8, -1.0, -1.2], low: -1, range: "Above -1.0" },
      { name: "Vitamin D", unit: "ng/mL", values: [34, 29, 24], low: 30, high: 100, range: "30-100" },
    ],
    actions: [
      { id: "A-1", area: "Supplements", text: "Vitamin D3 2,000 IU with calcium 600 mg", often: "Daily" },
      { id: "A-2", area: "Tests", text: "Repeat DEXA scan", often: "In 6 months" },
    ],
  },
  {
    id: "OP-3",
    name: "Better sleep",
    source: "Patient",
    evidence: [],
    note: "My CPAP use is low and I want to fix that.",
    actions: [
      { id: "A-1", area: "Sleep", text: "Wear CPAP all night", often: "Nightly" },
    ],
  },
]
const MARCUS_V2: OptimizationPlan[] = MARCUS_V1.map((p) =>
  p.id === "OP-1"
    ? {
        ...p,
        actions: p.actions.map((a) =>
          a.id === "A-1" ? { ...a, often: "3 days a week" } : a
        ),
      }
    : p
)
const MARCUS_TESTS: BaselineTest[] = [
  { id: "T-1", name: "DEXA scan", for: ["OP-1", "OP-2"], why: "Last on record Mar 2025", approved: true },
  { id: "T-2", name: "Total testosterone", for: ["OP-1"], why: "Not on record", approved: true },
  { id: "T-3", name: "Sleep study", for: ["OP-3"], why: "Last on record 2022", approved: false },
]

function seed(): CarePlan[] {
  return [
    {
      id: "P10240",
      status: "Pending review",
      versions: [
        {
          version: 1,
          by: "Olivia Bennett",
          role: "Patient",
          at: shift(-1, "08:42"),
          plans: OLIVIA_PLANS,
          tests: OLIVIA_TESTS,
        },
      ],
      events: [
        {
          id: "EV-1",
          at: shift(-1, "08:42"),
          by: "Olivia Bennett",
          role: "Patient",
          kind: "Sent for review",
          version: 1,
        },
      ],
    },
    {
      id: "P10318",
      status: "Changes requested",
      versions: [
        {
          version: 1,
          by: "Marcus Hale",
          role: "Patient",
          at: shift(-6, "19:05"),
          plans: MARCUS_V1,
          tests: MARCUS_TESTS.map((t) => ({ ...t, approved: true })),
        },
        {
          version: 2,
          by: ME,
          role: "Provider",
          at: shift(-4, "15:20"),
          plans: MARCUS_V2,
          tests: MARCUS_TESTS,
        },
      ],
      events: [
        {
          id: "EV-1",
          at: shift(-6, "19:05"),
          by: "Marcus Hale",
          role: "Patient",
          kind: "Sent for review",
          version: 1,
        },
        {
          id: "EV-2",
          at: shift(-4, "15:20"),
          by: ME,
          role: "Provider",
          kind: "Approved and sent",
          version: 2,
        },
        {
          id: "EV-3",
          at: shift(-1, "07:55"),
          by: "Marcus Hale",
          role: "Patient",
          kind: "Changes requested",
          version: 2,
          note: "I travel every Monday and Tuesday. Can strength training be 2 days a week with a hotel gym option? Fine with everything else.",
        },
      ],
    },
  ]
}

export const carePlans = createCollection<CarePlan>(
  "hol-care-plans",
  seed(),
  "v2"
)

const isOpen = (s: PlanStatus) =>
  s === "Pending review" || s === "Changes requested"

/** Care plans waiting on the physician, newest first: the bell reads it. */
export function useCarePlansToReview() {
  const { items } = carePlans.use()
  return items
    .filter((p) => isOpen(p.status))
    .map((p) => ({ patientId: p.id, status: p.status, event: p.events[p.events.length - 1] }))
    .sort((a, b) => b.event.at.localeCompare(a.event.at))
}

const STATUS_TONE: Record<
  PlanStatus,
  "warning" | "destructive" | "info" | "success"
> = {
  "Pending review": "warning",
  "Changes requested": "destructive",
  "Sent to patient": "info",
  Accepted: "success",
}

/* ---------------------------------------------------------- feedback -- */

/* The physician's verdict on a plan the AI suggested: right, or wrong and
   why. Kept per patient and plan so the clinical team can tune the rules
   and the AI; one verdict per plan, the latest wins. */

const FEEDBACK_REASONS = [
  "Not supported by the record",
  "Not right for this patient",
  "Unsafe or contraindicated",
  "Plan items not right",
  "Duplicate of another plan",
  "Other",
] as const
type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export type AiFeedback = {
  /** `${patientId}/${planId}` */
  id: string
  patientId: string
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
  for (const p of after.plans) {
    const old = before.plans.find((x) => x.id === p.id)
    if (!old) {
      lines.push(`Added plan: ${p.name}`)
      continue
    }
    for (const a of p.actions) {
      const was = old.actions.find((x) => x.id === a.id)
      if (!was) lines.push(`${p.name}, added: ${a.text}, ${a.often.toLowerCase()}`)
      else {
        if (was.text !== a.text)
          lines.push(`${p.name}, changed: ${was.text} to ${a.text}`)
        if (was.often !== a.often)
          lines.push(
            `${a.text}: ${was.often.toLowerCase()} to ${a.often.toLowerCase()}`
          )
      }
    }
    for (const a of old.actions)
      if (!p.actions.some((x) => x.id === a.id))
        lines.push(`${p.name}, removed: ${a.text}`)
  }
  for (const p of before.plans)
    if (!after.plans.some((x) => x.id === p.id))
      lines.push(`Removed plan: ${p.name}`)
  for (const t of after.tests) {
    const old = before.tests.find((x) => x.id === t.id)
    if (old && old.approved !== t.approved)
      lines.push(`${t.name}: ${t.approved ? "approved" : "deselected"}`)
  }
  return lines
}

/** Ids of plans, items and tests that differ between two versions. */
function changedIds(
  before: Pick<PlanVersion, "plans" | "tests"> | undefined,
  after: Pick<PlanVersion, "plans" | "tests">
) {
  const ids = new Set<string>()
  if (!before) return ids
  for (const p of after.plans) {
    const old = before.plans.find((x) => x.id === p.id)
    if (!old) ids.add(p.id)
    for (const a of p.actions)
      if (
        JSON.stringify(a) !==
        JSON.stringify(old?.actions.find((x) => x.id === a.id))
      )
        ids.add(`${p.id}/${a.id}`)
  }
  for (const t of after.tests)
    if (before.tests.find((x) => x.id === t.id)?.approved !== t.approved)
      ids.add(t.id)
  return ids
}

/* -------------------------------------------------------------- view -- */

type Draft = { plans: OptimizationPlan[]; tests: BaselineTest[] }

export function CarePlanView({
  patient,
  tab,
  onTab,
}: {
  patient: Patient
  tab: "plan" | "history"
  onTab: (tab: "plan" | "history") => void
}) {
  const { items } = carePlans.use()
  const plan = items.find((p) => p.id === patient.id)
  /* Plan edits, only while Edit plan is on. */
  const [draft, setDraft] = React.useState<Draft | null>(null)
  /* Test picks: the physician approves or deselects without Edit plan. */
  const [picks, setPicks] = React.useState<Record<string, boolean>>({})

  if (!plan)
    return (
      <Section>
        <SectionBar title="Care plan" />
        <SectionBody className="flex">
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyTitle>No care plan yet</EmptyTitle>
              <EmptyDescription>
                When {patient.firstName} picks optimization plans in the app
                and sends them for review, they show here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </SectionBody>
      </Section>
    )

  const latest = plan.versions[plan.versions.length - 1]
  const lastEvent = plan.events[plan.events.length - 1]
  const lastApproval = [...plan.events]
    .reverse()
    .find((e) => e.kind === "Approved and sent")
  const editing = draft !== null
  const open = isOpen(plan.status)
  const plans = (draft ?? latest).plans
  const tests = latest.tests.map((t) =>
    t.id in picks ? { ...t, approved: picks[t.id] } : t
  )
  const edited = changedIds(latest, { plans, tests })

  /* Adding a plan opens Edit plan with the new card ready for its items. */
  const addPlan = (name: string) => {
    const base = draft ?? { plans: latest.plans, tests: latest.tests }
    onTab("plan")
    setDraft({
      ...base,
      plans: [
        ...base.plans,
        {
          id: nextId("OP", base.plans),
          name,
          source: "Physician",
          evidence: [],
          actions: [{ id: "A-1", area: "Nutrition", text: "", often: "Daily" }],
        },
      ],
    })
  }

  /* A plan flagged as wrong can be dropped at once: Edit plan opens
     without it, so the physician still approves the change. */
  const dropPlan = (id: string) => {
    const base = draft ?? { plans: latest.plans, tests: latest.tests }
    onTab("plan")
    setDraft({ ...base, plans: base.plans.filter((p) => p.id !== id) })
  }

  const approve = () => {
    const kept = plans.map((p) => ({
      ...p,
      actions: p.actions.filter((a) => a.text.trim()),
    }))
    const at = nowAt()
    const version = latest.version + 1
    carePlans.patch(plan.id, {
      status: "Sent to patient",
      versions: [
        ...plan.versions,
        { version, by: ME, role: "Provider", at, plans: kept, tests },
      ],
      events: [
        ...plan.events,
        {
          id: nextId("EV", plan.events),
          at,
          by: ME,
          role: "Provider",
          kind: "Approved and sent",
          version,
        },
      ],
    })
    /* The review task is done once the plan goes out. */
    for (const t of tasks.get())
      if (
        t.type === "Care plan review" &&
        t.patientId === plan.id &&
        t.status !== "Completed"
      )
        setTaskStatus(t.id, "Completed")
    setDraft(null)
    setPicks({})
    const n = tests.filter((t) => t.approved).length
    toast.success("Care plan approved", {
      description: `Version ${version} sent to ${patient.firstName} with ${n} baseline ${n === 1 ? "test" : "tests"}.`,
    })
  }

  const actions = editing ? (
    <>
      <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
        Cancel
      </Button>
      <Button size="sm" onClick={approve}>
        <IconSend />
        Approve and send
      </Button>
    </>
  ) : (
    <>
      <Badge
        variant={STATUS_TONE[plan.status]}
        className="h-6 rounded-full px-2.5 text-[13px] font-normal"
      >
        {plan.status}
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onTab("plan")
          setDraft({ plans: latest.plans, tests: latest.tests })
        }}
      >
        <IconEdit />
        {open ? "Edit plan" : "Revise plan"}
      </Button>
      {open && (
        <Button size="sm" onClick={approve}>
          <IconCheck />
          Approve and send
        </Button>
      )}
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
          { id: "history", label: `History (${plan.events.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as "plan" | "history")}
        actions={actions}
      />
      <SectionBody className="flex flex-col gap-3 *:shrink-0">
        {tab === "history" ? (
          <History plan={plan} />
        ) : (
          <>
            {editing ? (
              <div className="rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
                Editing version {latest.version + 1}. Changed rows are shaded.
              </div>
            ) : (
              <StatusNote
                patient={patient}
                plan={plan}
                lastEvent={lastEvent}
                lastApproval={lastApproval}
              />
            )}
            <PlansBlock
              plans={plans}
              editing={editing}
              edited={edited}
              onChange={(next) => draft && setDraft({ ...draft, plans: next })}
              onAdd={open || editing ? addPlan : undefined}
              feedback={{
                patientId: patient.id,
                onDrop: open || editing ? dropPlan : undefined,
              }}
            />
            <BaselineCard
              tests={tests}
              plans={plans}
              decidable={open || editing}
              edited={edited}
              onPick={(id, approved) => setPicks({ ...picks, [id]: approved })}
              onPickAll={(approved) =>
                setPicks(
                  Object.fromEntries(tests.map((t) => [t.id, approved]))
                )
              }
            />
          </>
        )}
      </SectionBody>
    </Section>
  )
}

/* The line that says where the plan stands: who sent it and when, the
   patient's change request, or who approved it and when. */
function StatusNote({
  patient,
  plan,
  lastEvent,
  lastApproval,
}: {
  patient: Patient
  plan: CarePlan
  lastEvent: PlanEvent
  lastApproval?: PlanEvent
}) {
  const name = fullName(patient)
  const tone =
    plan.status === "Changes requested"
      ? "bg-destructive/8"
      : plan.status === "Pending review"
        ? "bg-warning-surface"
        : "bg-card"
  const title =
    plan.status === "Pending review"
      ? `${name} sent this plan for your review`
      : plan.status === "Changes requested"
        ? `${name} asked for changes`
        : plan.status === "Accepted"
          ? `${name} accepted the plan`
          : `Sent to ${patient.firstName}, waiting for a reply`
  return (
    <div className={cn("rounded-lg px-4 py-3", tone)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {atLabel(lastEvent.at)}
        </div>
      </div>
      {lastEvent.kind === "Changes requested" && lastEvent.note && (
        <p className="mt-1.5 text-sm text-foreground/85">
          &ldquo;{lastEvent.note}&rdquo;
        </p>
      )}
      {lastApproval && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
          <span>
            <span className="text-muted-foreground">Approved by : </span>
            {lastApproval.by}
          </span>
          <span className="tabular-nums">
            <span className="text-muted-foreground">Approved on : </span>
            {atLabel(lastApproval.at)}
          </span>
          <span>
            <span className="text-muted-foreground">Version : </span>
            {lastApproval.version}
          </span>
        </div>
      )}
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

/* ------------------------------------------------------------- plans -- */

function PlansBlock({
  plans,
  editing,
  edited,
  onChange,
  onAdd,
  feedback,
}: {
  plans: OptimizationPlan[]
  editing: boolean
  edited: Set<string>
  onChange: (plans: OptimizationPlan[]) => void
  /** Set while the plan can still change. */
  onAdd?: (name: string) => void
  /** Set on the live plan, not on saved versions: AI plans get a verdict. */
  feedback?: FeedbackTarget
}) {
  const items = plans.reduce((n, p) => n + p.actions.length, 0)
  const left = PLAN_CATALOG.filter(
    (name) => !plans.some((p) => p.name === name)
  )
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="flex items-baseline gap-2 text-[15px] font-semibold">
          Optimization plans
          <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
            {plans.length} plans · {items} items
          </span>
        </h3>
        {onAdd && left.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <IconAdd />
              Add plan
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Optimization plans</DropdownMenuLabel>
                {left.map((name) => (
                  <DropdownMenuItem key={name} onClick={() => onAdd(name)}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {plans.map((p) => (
        <PlanCard
          key={p.id}
          plan={p}
          editing={editing}
          edited={edited}
          onChange={(next) =>
            onChange(plans.map((x) => (x.id === p.id ? next : x)))
          }
          onRemove={() => onChange(plans.filter((x) => x.id !== p.id))}
          feedback={feedback}
        />
      ))}
    </section>
  )
}

/* One plan: what the patient will do, with its Why one hover away. */
function PlanCard({
  plan,
  editing,
  edited,
  onChange,
  onRemove,
  feedback,
}: {
  plan: OptimizationPlan
  editing: boolean
  edited: Set<string>
  onChange: (plan: OptimizationPlan) => void
  onRemove: () => void
  feedback?: FeedbackTarget
}) {
  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h4 className="truncate text-[15px] font-semibold">{plan.name}</h4>
          <Why plan={plan} />
          {edited.has(plan.id) && <ChangedTag label="New" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {feedback && plan.source === "AI" && (
            <PlanFeedback plan={plan} target={feedback} />
          )}
          <SourceTag source={plan.source} />
          {editing && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${plan.name}`}
              onClick={onRemove}
            >
              <IconTrash />
            </Button>
          )}
        </div>
      </header>
      <PlanItems
        plan={plan}
        editing={editing}
        edited={edited}
        onChange={(actions) => onChange({ ...plan, actions })}
      />
    </article>
  )
}

type FeedbackTarget = {
  patientId: string
  /** Set while the plan can still change: drops the plan into Edit plan. */
  onDrop?: (planId: string) => void
}

/* Right or wrong on an AI plan. Wrong asks why, and can take the plan out
   of the care plan in the same step. */
function PlanFeedback({
  plan,
  target,
}: {
  plan: OptimizationPlan
  target: FeedbackTarget
}) {
  const { items } = aiFeedback.use()
  const given = items.find((f) => f.id === `${target.patientId}/${plan.id}`)
  const [asking, setAsking] = React.useState(false)

  const markRight = () => {
    if (given?.rating === "Right") {
      aiFeedback.remove(given.id)
      return
    }
    saveFeedback({
      patientId: target.patientId,
      planId: plan.id,
      planName: plan.name,
      rating: "Right",
      reasons: [],
    })
    toast.success("Feedback saved", {
      description: `${plan.name} marked as a right suggestion.`,
    })
  }

  return (
    <>
      {given?.rating === "Wrong" && (
        <button
          type="button"
          onClick={() => setAsking(true)}
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
          aria-label={`${plan.name} is a right suggestion`}
          aria-pressed={given?.rating === "Right"}
          className={cn(given?.rating === "Right" && "text-primary")}
          onClick={markRight}
        >
          <IconThumbsUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${plan.name} is a wrong suggestion`}
          aria-pressed={given?.rating === "Wrong"}
          className={cn(given?.rating === "Wrong" && "text-[#C4554E]")}
          onClick={() => setAsking(true)}
        >
          <IconThumbsDown />
        </Button>
      </div>
      {asking && (
        <FeedbackDialog
          plan={plan}
          given={given?.rating === "Wrong" ? given : undefined}
          canDrop={target.onDrop !== undefined}
          onClose={() => setAsking(false)}
          onSave={(reasons, note, drop) => {
            saveFeedback({
              patientId: target.patientId,
              planId: plan.id,
              planName: plan.name,
              rating: "Wrong",
              reasons,
              note,
            })
            setAsking(false)
            if (drop) target.onDrop?.(plan.id)
            toast.success("Feedback saved", {
              description: drop
                ? `${plan.name} removed. Approve and send to save the plan.`
                : `${plan.name} flagged as a wrong suggestion.`,
            })
          }}
        />
      )}
    </>
  )
}

function FeedbackDialog({
  plan,
  given,
  canDrop,
  onClose,
  onSave,
}: {
  plan: OptimizationPlan
  given?: AiFeedback
  canDrop: boolean
  onClose: () => void
  onSave: (reasons: FeedbackReason[], note: string | undefined, drop: boolean) => void
}) {
  const [reasons, setReasons] = React.useState<FeedbackReason[]>(
    given?.reasons ?? []
  )
  const [note, setNote] = React.useState(given?.note ?? "")
  const [drop, setDrop] = React.useState(canDrop && !given)
  const text = note.trim().replace(/\s+/g, " ")
  const needsNote = reasons.includes("Other") && !text
  const ready = reasons.length > 0 && !needsNote

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wrong suggestion: {plan.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Tell the clinical team what is wrong with this AI suggested plan.
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-feedback-note" className="text-sm font-medium">
              Details{reasons.includes("Other") ? "" : " (optional)"}
            </label>
            <Textarea
              id="ai-feedback-note"
              rows={3}
              maxLength={500}
              value={note}
              placeholder="What should the AI have suggested"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {canDrop && (
            <label className="flex cursor-pointer items-center gap-2.5 border-t pt-4 text-sm">
              <Checkbox
                checked={drop}
                onCheckedChange={(c) => setDrop(c === true)}
              />
              Remove {plan.name} from this care plan
            </label>
          )}
        </form>
        <DialogFooter>
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

const SOURCE_LABEL: Record<OptimizationPlan["source"], string> = {
  AI: "From the record",
  Patient: "Patient selected",
  Physician: "Added by physician",
}

function SourceTag({ source }: { source: OptimizationPlan["source"] }) {
  if (source === "Physician")
    return (
      <Badge
        variant="outline"
        className="h-5.5 gap-1 rounded-full px-2 text-xs font-normal"
      >
        <IconEdit className="size-3.5" />
        Added by physician
      </Badge>
    )
  return source === "Patient" ? (
    <Badge
      variant="info"
      className="h-5.5 gap-1 rounded-full px-2 text-xs font-normal"
    >
      <IconUser className="size-3.5" />
      Patient selected
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="h-5.5 gap-1 rounded-full px-2 text-xs font-normal"
    >
      <IconSparkles className="size-3.5" />
      From the record
    </Badge>
  )
}

const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "")

/* The evidence, opened by hovering the word "Why", drawn as the
   dashboard's peek card: the plan and where it came from, then each
   biomarker with its status in colour, the range, the chart and how it
   moved. A plan the patient added shows their own words. */
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

function Why({ plan }: { plan: OptimizationPlan }) {
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
        <WhyCard plan={plan} />
      </HoverCardContent>
    </HoverCard>
  )
}

function StatusLine({
  tone,
  word,
  qualifier,
}: {
  tone: ToneKey
  word: string
  qualifier?: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-[13px]">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", SOFT_DOT[tone])}
      />
      <span className={cn("font-medium", SOFT_TEXT[tone])}>
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

function WhyCard({ plan }: { plan: OptimizationPlan }) {
  const out = plan.evidence.filter((e) => flagOf(e)).length
  return (
    <div className="flex flex-col">
      <HoverCardSection className="gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] leading-5 font-semibold">
            {plan.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {SOURCE_LABEL[plan.source]}
          </span>
        </div>
        {plan.source === "Physician" ? (
          <StatusLine tone="violet" word="Added by the physician" />
        ) : plan.source === "Patient" ? (
          <StatusLine tone="blue" word="Added by the patient" />
        ) : (
          <StatusLine
            tone={out ? "red" : "green"}
            word={
              out
                ? `${out} of ${plan.evidence.length} markers out of range`
                : "Markers in range"
            }
          />
        )}
      </HoverCardSection>
      {plan.source === "Patient" ? (
        <HoverCardSection>
          <p className="text-[13px] leading-5 text-foreground/80">
            {plan.note ? <>&ldquo;{plan.note}&rdquo;</> : "No note from the patient."}
          </p>
        </HoverCardSection>
      ) : plan.source === "Physician" ? null : (
        plan.evidence.map((e) => {
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
        })
      )}
    </div>
  )
}

function PlanItems({
  plan,
  editing,
  edited,
  onChange,
}: {
  plan: OptimizationPlan
  editing: boolean
  edited: Set<string>
  onChange: (actions: PlanAction[]) => void
}) {
  const actions = plan.actions
  const set = (id: string, patch: Partial<PlanAction>) =>
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const ordered = editing
    ? actions
    : [...actions].sort((a, b) => AREAS.indexOf(a.area) - AREAS.indexOf(b.area))

  if (!editing)
    return (
      <ul className="divide-y">
        {ordered.map((a) => (
          <li
            key={a.id}
            className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-2.5 text-sm"
          >
            <span className="text-[13px] text-muted-foreground">{a.area}</span>
            <span>
              {a.text}
              {edited.has(`${plan.id}/${a.id}`) && <ChangedTag />}
            </span>
            <span className="text-[13px] text-muted-foreground">{a.often}</span>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {actions.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md p-1",
            edited.has(`${plan.id}/${a.id}`) && "bg-info-surface/60"
          )}
        >
          <Select
            items={AREAS.map((x) => ({ label: x, value: x }))}
            value={a.area}
            onValueChange={(v) => set(a.id, { area: (v as Area) ?? a.area })}
          >
            <SelectTrigger className="h-8! w-32" aria-label="Area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {AREAS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
            { id: nextId("A", actions), area: "Nutrition", text: "", often: "Daily" },
          ])
        }
      >
        <IconAdd />
        Add item
      </Button>
    </div>
  )
}

/* ---------------------------------------------------------- baseline -- */

/* The tests the plans need that the record doesn't have: ticked means
   approved. Open plans can be decided right here; sent ones are read only. */
function BaselineCard({
  tests,
  plans,
  decidable,
  edited,
  onPick,
  onPickAll,
}: {
  tests: BaselineTest[]
  plans: OptimizationPlan[]
  decidable: boolean
  edited: Set<string>
  onPick?: (id: string, approved: boolean) => void
  onPickAll?: (approved: boolean) => void
}) {
  const approved = tests.filter((t) => t.approved).length
  const all = approved === tests.length
  const planName = (id: string) => plans.find((p) => p.id === id)?.name
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <h3 className="flex items-baseline gap-2 text-[15px] font-semibold">
          Proposed baseline tests
          <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
            {approved} of {tests.length} approved
          </span>
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {decidable && (
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Approve all tests"
                  checked={all}
                  indeterminate={approved > 0 && !all}
                  onCheckedChange={(c) => onPickAll?.(c === true)}
                />
              </TableHead>
            )}
            <TableHead className="min-w-44">Test</TableHead>
            <TableHead>For</TableHead>
            <TableHead className="min-w-56">Why</TableHead>
            <TableHead className="w-32">Decision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((t) => (
            <TableRow
              key={t.id}
              className={cn(!t.approved && "text-muted-foreground")}
            >
              {decidable && (
                <TableCell>
                  <Checkbox
                    aria-label={`Approve ${t.name}`}
                    checked={t.approved}
                    onCheckedChange={(c) => onPick?.(t.id, c === true)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                {t.name}
                {edited.has(t.id) && <ChangedTag />}
              </TableCell>
              <TableCell className="whitespace-normal">
                {t.for.map(planName).filter(Boolean).join(", ") || "None"}
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {t.why}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      t.approved ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                  {t.approved ? "Approved" : "Deselected"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
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
            e.kind === "Approved and sent" && v && before
              ? changesBetween(before, v)
              : []
          return (
            <li key={e.id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      e.kind === "Changes requested"
                        ? "bg-[#DE6F68]"
                        : e.kind === "Approved and sent" ||
                            e.kind === "Accepted"
                          ? "bg-primary"
                          : "bg-[#EB9A52]"
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
              {e.kind === "Changes requested" && e.note && (
                <p className="mt-1.5 pl-4 text-sm text-foreground/85">
                  &ldquo;{e.note}&rdquo;
                </p>
              )}
              {changes.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 pl-4 text-[13px] text-muted-foreground">
                  {changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {(e.kind === "Sent for review" ||
                e.kind === "Approved and sent") && (
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
              `${v.role === "Patient" ? "Sent by" : "Approved by"} ${v.by} (${v.role}) on ${atLabel(v.at)}`}
          </DialogDescription>
        </DialogHeader>
        {v && (
          <div className="-mx-1 flex max-h-[65dvh] flex-col gap-3 overflow-y-auto px-1">
            <PlansBlock
              plans={v.plans}
              editing={false}
              edited={changed}
              onChange={() => {}}
            />
            <BaselineCard
              tests={v.tests}
              plans={v.plans}
              decidable={false}
              edited={changed}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
