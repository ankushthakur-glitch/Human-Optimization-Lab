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
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group"

/* The care plan's two physician steps (23 Oct call). First the baseline:
   when the patient enrols, AI suggests the tests her record is missing,
   each with the number behind it and a check of whether insurance is
   likely to cover it. The physician sends each one through insurance or
   Inlay, or removes it, and sends one message. Then, once the results are
   in, the plan: the same six steps for everyone (Exercise, Eat, Sleep,
   Mind, Medication, Measure), with the items AI added from the record
   marked and the biomarker behind each. The physician edits what needs
   editing and approves, which sends it to the patient. The patient accepts
   it or asks for changes, and the physician revises. Every version is
   kept. Built to be read in about a minute. */

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
  kind:
    "Sent for review" | "Approved and sent" | "Changes requested" | "Accepted"
  version: number
  /** The patient's request, for Changes requested only. */
  note?: string
}

type PlanStatus =
  "Pending review" | "Changes requested" | "Sent to patient" | "Accepted"

type Route = "Insurance" | "Inlay" | "Remove"
const ROUTES: Route[] = ["Insurance", "Inlay", "Remove"]

export type BaselineTest = {
  id: string
  name: string
  /** "Blood tests", "Sleep": the kind of test. */
  kind: string
  /** The out of range numbers that led to it, shown in colour. */
  markers: { name: string; value: string }[]
  /** The rest of the Why, or all of it when no number led to it. */
  note?: string
  /** AI's read of the patient's plan and history. */
  coverage: "Likely" | "Maybe" | "No"
  coverageText: string
  price: number
  route: Route
  /** The physician added it; AI didn't suggest it. */
  added?: boolean
}

type Baseline = {
  status: "Tests to sort" | "Tests sorted"
  /** When the patient enrolled and asked for the review. */
  at: string
  insurance: string
  /** True when the patient paid for the tests up front: what goes through
      insurance or is removed is refunded. False: she pays Inlay after the
      review for what's left. */
  paid: boolean
  tests: BaselineTest[]
  /** What the physician sent with the sorted tests. */
  message?: string
  sortedAt?: string
  sortedBy?: string
}

type CarePlan = {
  /** The patient's id. */
  id: string
  status: PlanStatus
  versions: PlanVersion[]
  events: PlanEvent[]
  baseline?: Baseline
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

/* Prices match the patient app's baseline screen. */
const OLIVIA_TESTS: BaselineTest[] = [
  {
    id: "T-1",
    name: "Comprehensive Blood Panel",
    kind: "Blood tests",
    markers: [
      { name: "LDL", value: "162" },
      { name: "triglycerides", value: "188" },
    ],
    coverage: "Likely",
    coverageText: "Likely covered, last panel 14 months ago",
    price: 189,
    route: "Insurance",
  },
  {
    id: "T-2",
    name: "DEXA Body Composition",
    kind: "Body and metabolism",
    markers: [{ name: "BMI", value: "32.4" }],
    note: "separates fat from lean mass",
    coverage: "No",
    coverageText: "Not covered",
    price: 149,
    route: "Inlay",
  },
  {
    id: "T-3",
    name: "Resting Metabolic Rate (RMR)",
    kind: "Body and metabolism",
    markers: [],
    note: "No metabolic rate on file",
    coverage: "No",
    coverageText: "Not covered",
    price: 129,
    route: "Inlay",
  },
  {
    id: "T-4",
    name: "Home Sleep Study",
    kind: "Sleep",
    markers: [],
    note: "Wakes at three most nights",
    coverage: "Maybe",
    coverageText: "May be covered with a referral",
    price: 299,
    route: "Inlay",
  },
]

/** Tests the physician can add to a baseline (sample). */
const TEST_CATALOG: Omit<BaselineTest, "id">[] = [
  { name: "HbA1c", kind: "Blood tests", markers: [], note: "Added by you", added: true, coverage: "Likely", coverageText: "Likely covered, prediabetes on file", price: 45, route: "Insurance" },
  { name: "Fasting insulin", kind: "Blood tests", markers: [], note: "Added by you", added: true, coverage: "Maybe", coverageText: "May be covered with a referral", price: 39, route: "Inlay" },
  { name: "ApoB", kind: "Blood tests", markers: [], note: "Added by you", added: true, coverage: "No", coverageText: "Not covered", price: 59, route: "Inlay" },
  { name: "hs-CRP", kind: "Blood tests", markers: [], note: "Added by you", added: true, coverage: "Maybe", coverageText: "May be covered with a referral", price: 35, route: "Inlay" },
  { name: "VO2 max", kind: "Body and metabolism", markers: [], note: "Added by you", added: true, coverage: "No", coverageText: "Not covered", price: 199, route: "Inlay" },
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
      status: "Pending review",
      versions: [
        {
          version: 1,
          by: "Olivia Bennett",
          role: "Patient",
          at: shift(-1, "08:42"),
          steps: OLIVIA_STEPS,
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
      baseline: {
        status: "Tests to sort",
        at: shift(0, "08:42"),
        insurance: "Aetna PPO · active",
        paid: true,
        tests: OLIVIA_TESTS,
      },
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
          steps: MARCUS_V1,
        },
        {
          version: 2,
          by: ME,
          role: "Provider",
          at: shift(-4, "15:20"),
          steps: MARCUS_V2,
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
  "v3"
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

/** Baselines waiting for the physician to sort, newest first. */
export function useBaselinesToSort() {
  const { items } = carePlans.use()
  return items
    .filter((p) => p.baseline?.status === "Tests to sort")
    .map((p) => ({ patientId: p.id, at: p.baseline!.at }))
    .sort((a, b) => b.at.localeCompare(a.at))
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

const usd = (n: number) => `$${n.toLocaleString("en-US")}`

const countOf = (steps: PlanStep[]) => {
  const all = steps.flatMap((s) => s.actions)
  return { items: all.length, ai: all.filter((a) => a.source === "AI").length }
}

/* ---------------------------------------------------------- feedback -- */

/* The physician's verdict on a step as AI built it: right, or wrong and
   why. Kept per patient and step so the clinical team can tune the rules
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

export type CarePlanTab = "baseline" | "plan" | "history"

export function CarePlanView({
  patient,
  tab: asked,
  onTab,
}: {
  patient: Patient
  /** Unset: the baseline while its tests wait to be sorted, else the plan. */
  tab?: CarePlanTab
  onTab: (tab: CarePlanTab) => void
}) {
  const { items } = carePlans.use()
  const plan = items.find((p) => p.id === patient.id)
  /* Plan edits, only while Edit plan is on. */
  const [draft, setDraft] = React.useState<PlanStep[] | null>(null)
  /* The physician's own words for the baseline message; unset, the
     message follows the choices. */
  const [message, setMessage] = React.useState<string | null>(null)

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
                baseline tests and plan show here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </SectionBody>
      </Section>
    )

  const baseline = plan.baseline
  const tab: CarePlanTab =
    asked === "baseline" && !baseline
      ? "plan"
      : (asked ?? (baseline?.status === "Tests to sort" ? "baseline" : "plan"))
  const latest = plan.versions[plan.versions.length - 1]
  const lastEvent = plan.events[plan.events.length - 1]
  const lastApproval = [...plan.events]
    .reverse()
    .find((e) => e.kind === "Approved and sent")
  const editing = draft !== null
  const open = isOpen(plan.status)
  const steps = draft ?? latest.steps
  const edited = changedIds(latest, { steps })

  /* A step flagged as wrong can lose what AI added to it at once: Edit
     plan opens without those items, so the physician still approves. */
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

  const approve = () => {
    const kept = steps.map((s) => ({
      ...s,
      actions: s.actions.filter((a) => a.text.trim()),
    }))
    const at = nowAt()
    const version = latest.version + 1
    carePlans.patch(plan.id, {
      status: "Sent to patient",
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
    const n = countOf(kept).items
    toast.success("Care plan approved", {
      description: `Version ${version} sent to ${patient.firstName} with ${n} ${n === 1 ? "item" : "items"}.`,
    })
  }

  const setBaseline = (patch: Partial<Baseline>) =>
    baseline && carePlans.patch(plan.id, { baseline: { ...baseline, ...patch } })
  const composed = baseline ? composeMessage(patient, baseline.tests) : ""

  const sortTests = () => {
    if (!baseline) return
    setBaseline({
      status: "Tests sorted",
      message: (message ?? composed).trim() || composed,
      sortedAt: nowAt(),
      sortedBy: ME,
    })
    setMessage(null)
    const n = baseline.tests.filter((t) => t.route !== "Remove").length
    toast.success("Baseline tests sent", {
      description: `${n} ${n === 1 ? "test" : "tests"} and your message sent to ${patient.firstName}.`,
    })
  }

  const pill = "h-6 rounded-full px-2.5 text-[13px] font-normal"
  const actions =
    tab === "baseline" && baseline ? (
      <>
        <Badge
          variant={baseline.status === "Tests to sort" ? "warning" : "success"}
          className={pill}
        >
          {baseline.status}
        </Badge>
        {baseline.status === "Tests to sort" && (
          <>
            <AddTest
              tests={baseline.tests}
              onAdd={(t) =>
                setBaseline({
                  tests: [...baseline.tests, { ...t, id: nextId("T", baseline.tests) }],
                })
              }
            />
            <Button size="sm" onClick={sortTests}>
              <IconCheck />
              Send to patient
            </Button>
          </>
        )}
      </>
    ) : editing ? (
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
        <Badge variant={STATUS_TONE[plan.status]} className={pill}>
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
          ...(baseline ? [{ id: "baseline", label: "Baseline tests" }] : []),
          {
            id: "plan",
            label: `Plan (version ${editing ? latest.version + 1 : latest.version})`,
          },
          { id: "history", label: `History (${plan.events.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as CarePlanTab)}
        actions={actions}
      />
      <SectionBody className="flex flex-col gap-3 *:shrink-0">
        {tab === "baseline" && baseline ? (
          <BaselineView
            patient={patient}
            baseline={baseline}
            message={baseline.message ?? message ?? composed}
            onMessage={setMessage}
            onRoute={(id, route) =>
              setBaseline({
                tests: baseline.tests.map((t) =>
                  t.id === id ? { ...t, route } : t
                ),
              })
            }
          />
        ) : tab === "history" ? (
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
            <StepsBlock
              steps={steps}
              editing={editing}
              edited={edited}
              onChange={(next) => draft && setDraft(next)}
              feedback={{
                patientId: patient.id,
                onDrop: open || editing ? dropAi : undefined,
              }}
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
    <Banner tone={tone} title={title} at={lastEvent.at}>
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
  const [asking, setAsking] = React.useState(false)
  const aiItems = step.actions.filter((a) => a.source === "AI").length

  const markRight = () => {
    if (given?.rating === "Right") {
      aiFeedback.remove(given.id)
      return
    }
    saveFeedback({
      patientId: target.patientId,
      planId: step.id,
      planName: step.id,
      rating: "Right",
      reasons: [],
    })
    toast.success("Feedback saved", {
      description: `${step.id} marked as right.`,
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
          aria-label={`${step.id} is right`}
          aria-pressed={given?.rating === "Right"}
          className={cn(given?.rating === "Right" && "text-primary")}
          onClick={markRight}
        >
          <IconThumbsUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${step.id} is wrong`}
          aria-pressed={given?.rating === "Wrong"}
          className={cn(given?.rating === "Wrong" && "text-[#C4554E]")}
          onClick={() => setAsking(true)}
        >
          <IconThumbsDown />
        </Button>
      </div>
      {asking && (
        <FeedbackDialog
          step={step}
          given={given?.rating === "Wrong" ? given : undefined}
          canDrop={target.onDrop !== undefined && aiItems > 0}
          onClose={() => setAsking(false)}
          onSave={(reasons, note, drop) => {
            saveFeedback({
              patientId: target.patientId,
              planId: step.id,
              planName: step.id,
              rating: "Wrong",
              reasons,
              note,
            })
            setAsking(false)
            if (drop) target.onDrop?.(step.id)
            toast.success("Feedback saved", {
              description: drop
                ? `Items from the record removed from ${step.id}. Approve and send to save the plan.`
                : `${step.id} flagged as wrong.`,
            })
          }}
        />
      )}
    </>
  )
}

function FeedbackDialog({
  step,
  given,
  canDrop,
  onClose,
  onSave,
}: {
  step: PlanStep
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
          <DialogTitle>Wrong suggestion: {step.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Tell the clinical team what is wrong with this step as AI built it.
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
              Remove the items from the record in {step.id}
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

/* ---------------------------------------------------------- baseline -- */

/* The tests AI suggested from the record, each sent through insurance or
   Inlay, or removed. The summary adds up what each way costs and what the
   patient gets back or still pays; the message tells her in one line. */

const ROUTE_ON: Record<Route, string> = {
  Insurance: "aria-pressed:bg-info-surface aria-pressed:text-info",
  Inlay: "aria-pressed:bg-primary-surface aria-pressed:text-primary-tint",
  Remove: "aria-pressed:bg-destructive/8 aria-pressed:text-[#C4554E]",
}

const COVERAGE_TONE: Record<BaselineTest["coverage"], ToneKey | undefined> = {
  Likely: "green",
  Maybe: "orange",
  No: undefined,
}

/** "Resting Metabolic Rate (RMR)" reads as "Resting Metabolic Rate". */
const plain = (name: string) => name.replace(/\s*\(.*\)/, "").trim()

function listOf(tests: BaselineTest[]) {
  const names = tests.map((t) => plain(t.name))
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function composeMessage(patient: Patient, tests: BaselineTest[]) {
  const by = (r: Route) => tests.filter((t) => t.route === r)
  const ins = by("Insurance")
  const inlay = by("Inlay")
  const removed = by("Remove")
  const covered = ins.length
    ? `Your insurance covers the ${listOf(ins)}, so my office will order ${ins.length > 1 ? "those" : "that"} and call you.`
    : "None of your tests go through insurance this time."
  const off = removed.length ? ` I took off the ${listOf(removed)} for now.` : ""
  const book =
    inlay.length === 1
      ? ` Please book the ${plain(inlay[0].name)} in the app.`
      : inlay.length
        ? ` Please book ${ins.length ? "the other" : "all"} ${inlay.length} in the app.`
        : ""
  return `Hi ${patient.firstName}, I went through your baseline tests. ${covered}${off}${book}`
}

function BaselineView({
  patient,
  baseline,
  message,
  onMessage,
  onRoute,
}: {
  patient: Patient
  baseline: Baseline
  message: string
  onMessage: (message: string) => void
  onRoute: (id: string, route: Route) => void
}) {
  const sorting = baseline.status === "Tests to sort"
  const her = patient.sex === "Male" ? "his" : patient.sex === "Female" ? "her" : "their"
  const sum = (r: Route) => {
    const list = baseline.tests.filter((t) => t.route === r)
    return { n: list.length, total: list.reduce((s, t) => s + t.price, 0) }
  }
  const ins = sum("Insurance")
  const inlay = sum("Inlay")
  const removed = sum("Remove")
  const added = baseline.tests.filter((t) => t.added).length

  return (
    <>
      {sorting ? (
        <Banner
          tone="bg-warning-surface"
          title={`${fullName(patient)} enrolled and asked you to sort ${her} baseline tests`}
          at={baseline.at}
        />
      ) : (
        <Banner
          tone="bg-card"
          title={`Tests sorted and sent to ${patient.firstName}`}
          at={baseline.sortedAt ?? baseline.at}
        >
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            <span>
              <span className="text-muted-foreground">Sorted by : </span>
              {baseline.sortedBy}
            </span>
            <span className="tabular-nums">
              <span className="text-muted-foreground">Sorted on : </span>
              {atLabel(baseline.sortedAt)}
            </span>
          </div>
        </Banner>
      )}
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-w-0 flex-col gap-2">
          <h3 className="flex items-baseline gap-2 px-1 text-[15px] font-semibold">
            Suggested tests
            <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
              {baseline.tests.length} tests
              {added > 0 && ` · ${added} added by you`}
            </span>
          </h3>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Test</TableHead>
                  <TableHead className="min-w-36">Why</TableHead>
                  <TableHead className="min-w-40">AI coverage check</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Send through</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baseline.tests.map((t) => {
                  const gone = t.route === "Remove"
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(gone && "[&>td:not(:last-child)]:opacity-50")}
                    >
                      <TableCell className="whitespace-normal">
                        <div className={cn("font-medium", gone && "line-through")}>
                          {t.name}
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {t.kind}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-[13px] text-muted-foreground">
                        {t.markers.map((m, i) => (
                          <React.Fragment key={m.name}>
                            {i > 0 && ", "}
                            {m.name}{" "}
                            <span className={cn("font-medium tabular-nums", SOFT_TEXT.red)}>
                              {m.value}
                            </span>
                          </React.Fragment>
                        ))}
                        {t.note && `${t.markers.length ? ", " : ""}${t.note}`}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <StatusLine
                          tone={COVERAGE_TONE[t.coverage]}
                          word={t.coverageText}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {usd(t.price)}
                      </TableCell>
                      <TableCell>
                        <ToggleGroup
                          aria-label={`Send ${t.name} through`}
                          value={[t.route]}
                          onValueChange={(v) =>
                            v[0] && onRoute(t.id, v[0] as Route)
                          }
                          disabled={!sorting}
                          variant="outline"
                          size="sm"
                          spacing={0}
                        >
                          {ROUTES.map((r) => (
                            <ToggleGroupItem
                              key={r}
                              value={r}
                              className={cn(
                                "h-7 min-w-0 px-2.5! text-[13px] font-normal",
                                ROUTE_ON[r]
                              )}
                            >
                              {r}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </section>
        <aside className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold">Summary</h3>
            <dl className="flex flex-col gap-1.5 text-sm">
              {[
                { label: "Insurance", ...ins },
                { label: "Inlay", ...inlay },
                { label: "Removed", ...removed },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground tabular-nums">
                    {row.label} · {row.n}
                  </dt>
                  <dd className="font-medium tabular-nums">{usd(row.total)}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-3 rounded-md bg-primary-surface px-3 py-2 font-semibold">
                <dt>{baseline.paid ? "Refund to patient" : "Patient pays Inlay"}</dt>
                <dd className="tabular-nums">
                  {usd(baseline.paid ? ins.total + removed.total : inlay.total)}
                </dd>
              </div>
            </dl>
          </section>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="baseline-message" className="text-sm font-medium">
              Message to patient
            </label>
            <Textarea
              id="baseline-message"
              rows={7}
              maxLength={1000}
              value={message}
              readOnly={!sorting}
              onChange={(e) => onMessage(e.target.value)}
            />
          </div>
        </aside>
      </div>
    </>
  )
}

/* Add a test the AI didn't suggest, from the practice's list. */
function AddTest({
  tests,
  onAdd,
}: {
  tests: BaselineTest[]
  onAdd: (test: Omit<BaselineTest, "id">) => void
}) {
  const left = TEST_CATALOG.filter((c) => !tests.some((t) => t.name === c.name))
  if (!left.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <IconAdd />
        Add test
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Baseline tests</DropdownMenuLabel>
          {left.map((c) => (
            <DropdownMenuItem key={c.name} onClick={() => onAdd(c)}>
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
