"use client"

import * as React from "react"
import {
  IconAdd,
  IconCheck,
  IconEdit,
  IconEye,
  IconSend,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { ME, atLabel, nowAt } from "@/components/provider/chart-epic"
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/design-system/ui/empty"
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

/* The care plan's review loop. The patient picks goals in the app and
   sends them with the plan for review. The provider reads it here, changes
   what needs changing and approves it, which sends it back. The patient
   accepts it, or asks for changes with a note, and the provider revises and
   sends it again. Every version is kept with who made it and when. */

/* -------------------------------------------------------------- model -- */

export type PlanGoal = {
  id: string
  name: string
  baseline: string
  target: string
  timeframe: string
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

type PlanVersion = {
  version: number
  by: string
  role: "Patient" | "Provider"
  at: string
  goals: PlanGoal[]
  actions: PlanAction[]
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

const OLIVIA_GOALS: PlanGoal[] = [
  {
    id: "G-1",
    name: "Lower my A1c",
    baseline: "5.9%",
    target: "Under 5.7%",
    timeframe: "6 months",
  },
  {
    id: "G-2",
    name: "Lower LDL cholesterol",
    baseline: "132 mg/dL",
    target: "Under 100 mg/dL",
    timeframe: "3 months",
  },
  {
    id: "G-3",
    name: "Lose weight",
    baseline: "78 kg",
    target: "72 kg",
    timeframe: "6 months",
  },
  {
    id: "G-4",
    name: "Bring blood pressure down",
    baseline: "134/86 mmHg",
    target: "Under 130/80 mmHg",
    timeframe: "3 months",
  },
]
const OLIVIA_ACTIONS: PlanAction[] = [
  {
    id: "A-1",
    area: "Nutrition",
    text: "Keep added sugar under 25 g a day",
    often: "Daily",
  },
  {
    id: "A-2",
    area: "Nutrition",
    text: "Protein at every meal, 90 g a day",
    often: "Daily",
  },
  {
    id: "A-3",
    area: "Exercise",
    text: "Brisk walk, 30 minutes",
    often: "5 days a week",
  },
  {
    id: "A-4",
    area: "Exercise",
    text: "Strength training, full body",
    often: "1 day a week",
  },
  {
    id: "A-5",
    area: "Sleep",
    text: "In bed by 10:30 PM, 7 to 8 hours",
    often: "Daily",
  },
  {
    id: "A-6",
    area: "Medication",
    text: "Atorvastatin 10 mg at bedtime, as prescribed",
    often: "Daily",
  },
  {
    id: "A-7",
    area: "Tests",
    text: "Repeat HbA1c and lipid panel",
    often: "In 12 weeks",
  },
]

const MARCUS_GOALS: PlanGoal[] = [
  {
    id: "G-1",
    name: "Build muscle",
    baseline: "58 kg lean mass",
    target: "61 kg lean mass",
    timeframe: "6 months",
  },
  {
    id: "G-2",
    name: "Protect bone health",
    baseline: "T-score -1.2",
    target: "No further loss",
    timeframe: "12 months",
  },
  {
    id: "G-3",
    name: "Sleep better",
    baseline: "CPAP 4 h a night",
    target: "CPAP 6 h a night",
    timeframe: "2 months",
  },
]
const MARCUS_V1: PlanAction[] = [
  {
    id: "A-1",
    area: "Exercise",
    text: "Strength training, full body",
    often: "4 days a week",
  },
  {
    id: "A-2",
    area: "Nutrition",
    text: "Protein 1.6 g per kg a day, about 130 g",
    often: "Daily",
  },
  { id: "A-3", area: "Supplements", text: "Creatine 5 g", often: "Daily" },
  { id: "A-4", area: "Sleep", text: "Wear CPAP all night", often: "Nightly" },
]
const MARCUS_V2: PlanAction[] = [
  {
    id: "A-1",
    area: "Exercise",
    text: "Strength training, full body",
    often: "3 days a week",
  },
  {
    id: "A-2",
    area: "Nutrition",
    text: "Protein 1.6 g per kg a day, about 130 g",
    often: "Daily",
  },
  { id: "A-3", area: "Supplements", text: "Creatine 5 g", often: "Daily" },
  { id: "A-4", area: "Sleep", text: "Wear CPAP all night", often: "Nightly" },
  {
    id: "A-5",
    area: "Supplements",
    text: "Vitamin D3 2,000 IU with calcium 600 mg",
    often: "Daily",
  },
  { id: "A-6", area: "Tests", text: "Repeat DEXA scan", often: "In 6 months" },
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
          goals: OLIVIA_GOALS,
          actions: OLIVIA_ACTIONS,
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
          goals: MARCUS_GOALS,
          actions: MARCUS_V1,
        },
        {
          version: 2,
          by: ME,
          role: "Provider",
          at: shift(-4, "15:20"),
          goals: MARCUS_GOALS,
          actions: MARCUS_V2,
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

const carePlans = createCollection<CarePlan>("hol-care-plans", seed(), "v1")

const STATUS_TONE: Record<
  PlanStatus,
  "warning" | "destructive" | "info" | "success"
> = {
  "Pending review": "warning",
  "Changes requested": "destructive",
  "Sent to patient": "info",
  Accepted: "success",
}

/* -------------------------------------------------------------- diff -- */

/** What one version changed from the one before, in plain lines. */
function changesBetween(before: PlanVersion, after: PlanVersion) {
  const lines: string[] = []
  for (const g of after.goals) {
    const old = before.goals.find((x) => x.id === g.id)
    if (!old) lines.push(`Added goal: ${g.name}, ${g.target} in ${g.timeframe}`)
    else {
      if (old.target !== g.target)
        lines.push(`${g.name} target: ${old.target} to ${g.target}`)
      if (old.timeframe !== g.timeframe)
        lines.push(`${g.name} timeframe: ${old.timeframe} to ${g.timeframe}`)
    }
  }
  for (const g of before.goals)
    if (!after.goals.some((x) => x.id === g.id))
      lines.push(`Removed goal: ${g.name}`)
  for (const a of after.actions) {
    const old = before.actions.find((x) => x.id === a.id)
    if (!old) lines.push(`Added: ${a.text}, ${a.often.toLowerCase()}`)
    else {
      if (old.text !== a.text) lines.push(`Changed: ${old.text} to ${a.text}`)
      if (old.often !== a.often)
        lines.push(
          `${a.text}: ${old.often.toLowerCase()} to ${a.often.toLowerCase()}`
        )
    }
  }
  for (const a of before.actions)
    if (!after.actions.some((x) => x.id === a.id))
      lines.push(`Removed: ${a.text}`)
  return lines
}

/* -------------------------------------------------------------- view -- */

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
  const [draft, setDraft] = React.useState<{
    goals: PlanGoal[]
    actions: PlanAction[]
  } | null>(null)

  if (!plan)
    return (
      <Section>
        <SectionBar title="Care plan" />
        <SectionBody className="flex">
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyTitle>No care plan yet</EmptyTitle>
              <EmptyDescription>
                When {patient.firstName} picks goals in the app and sends the
                plan for review, it shows here.
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
  const shown = draft ?? latest
  const editing = draft !== null
  const open =
    plan.status === "Pending review" || plan.status === "Changes requested"
  const previous = plan.versions[plan.versions.length - 2]
  /* What the doctor is changing now, against what the patient last saw. */
  const editedIds = new Set(
    draft
      ? [
          ...draft.goals
            .filter(
              (g) =>
                JSON.stringify(g) !==
                JSON.stringify(latest.goals.find((x) => x.id === g.id))
            )
            .map((g) => g.id),
          ...draft.actions
            .filter(
              (a) =>
                JSON.stringify(a) !==
                JSON.stringify(latest.actions.find((x) => x.id === a.id))
            )
            .map((a) => a.id),
        ]
      : []
  )

  const approve = () => {
    const goals = (draft ?? latest).goals.filter((g) => g.name.trim())
    const actions = (draft ?? latest).actions.filter((a) => a.text.trim())
    const at = nowAt()
    const version = latest.version + 1
    carePlans.patch(plan.id, {
      status: "Sent to patient",
      versions: [
        ...plan.versions,
        { version, by: ME, role: "Provider", at, goals, actions },
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
    setDraft(null)
    toast.success("Care plan approved", {
      description: `Version ${version} sent to ${patient.firstName} in the app.`,
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
          setDraft({ goals: latest.goals, actions: latest.actions })
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
            {!editing && (
              <StatusNote
                patient={patient}
                plan={plan}
                lastEvent={lastEvent}
                lastApproval={lastApproval}
              />
            )}
            {editing && (
              <div className="rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
                Editing version {latest.version + 1}. Changed rows are shaded.
                {previous && plan.status === "Changes requested" && (
                  <> {patient.firstName}&apos;s request is in History.</>
                )}
              </div>
            )}
            <GoalsCard
              goals={shown.goals}
              editing={editing}
              edited={editedIds}
              onChange={(goals) => draft && setDraft({ ...draft, goals })}
            />
            <ActionsCard
              actions={shown.actions}
              editing={editing}
              edited={editedIds}
              onChange={(next) =>
                draft && setDraft({ ...draft, actions: next })
              }
            />
          </>
        )}
      </SectionBody>
    </Section>
  )
}

/* The line that says where the plan stands: who sent it and when, the
   patient's note or change request, or who approved it and when. */
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

function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function ChangedTag() {
  return (
    <span className="ml-1.5 inline-flex h-4.5 items-center rounded-full bg-info-surface px-1.5 align-middle text-[11px] font-medium text-info">
      Changed
    </span>
  )
}

function GoalsCard({
  goals,
  editing,
  edited,
  onChange,
}: {
  goals: PlanGoal[]
  editing: boolean
  edited: Set<string>
  onChange: (goals: PlanGoal[]) => void
}) {
  const set = (id: string, patch: Partial<PlanGoal>) =>
    onChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  return (
    <Card
      title={`Goals (${goals.length})`}
      action={
        editing && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              onChange([
                ...goals,
                {
                  id: nextId("G", goals),
                  name: "",
                  baseline: "",
                  target: "",
                  timeframe: "",
                },
              ])
            }
          >
            <IconAdd />
            Add goal
          </Button>
        )
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-52">Goal</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Timeframe</TableHead>
            {editing && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((g) =>
            editing ? (
              <TableRow
                key={g.id}
                className={cn(
                  "hover:bg-transparent",
                  edited.has(g.id) &&
                    "bg-info-surface/60 hover:bg-info-surface/60"
                )}
              >
                <TableCell>
                  <Input
                    aria-label="Goal"
                    value={g.name}
                    onChange={(e) => set(g.id, { name: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Baseline"
                    value={g.baseline}
                    onChange={(e) => set(g.id, { baseline: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Target"
                    value={g.target}
                    onChange={(e) => set(g.id, { target: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Timeframe"
                    value={g.timeframe}
                    onChange={(e) => set(g.id, { timeframe: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${g.name || "goal"}`}
                    onClick={() => onChange(goals.filter((x) => x.id !== g.id))}
                  >
                    <IconTrash />
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={g.id}>
                <TableCell className="font-medium">
                  {g.name}
                  {edited.has(g.id) && <ChangedTag />}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {g.baseline}
                </TableCell>
                <TableCell className="tabular-nums">{g.target}</TableCell>
                <TableCell>{g.timeframe}</TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

function ActionsCard({
  actions,
  editing,
  edited,
  onChange,
}: {
  actions: PlanAction[]
  editing: boolean
  edited: Set<string>
  onChange: (actions: PlanAction[]) => void
}) {
  const set = (id: string, patch: Partial<PlanAction>) =>
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const ordered = editing
    ? actions
    : [...actions].sort((a, b) => AREAS.indexOf(a.area) - AREAS.indexOf(b.area))
  return (
    <Card
      title={`Plan (${actions.length})`}
      action={
        editing && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              onChange([
                ...actions,
                {
                  id: nextId("A", actions),
                  area: "Nutrition",
                  text: "",
                  often: "Daily",
                },
              ])
            }
          >
            <IconAdd />
            Add item
          </Button>
        )
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Area</TableHead>
            <TableHead className="min-w-64">What to do</TableHead>
            <TableHead>How often</TableHead>
            {editing && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((a) =>
            editing ? (
              <TableRow
                key={a.id}
                className={cn(
                  "hover:bg-transparent",
                  edited.has(a.id) &&
                    "bg-info-surface/60 hover:bg-info-surface/60"
                )}
              >
                <TableCell>
                  <Select
                    items={AREAS.map((x) => ({ label: x, value: x }))}
                    value={a.area}
                    onValueChange={(v) =>
                      set(a.id, { area: (v as Area) ?? a.area })
                    }
                  >
                    <SelectTrigger className="h-8! w-36" aria-label="Area">
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
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="What to do"
                    value={a.text}
                    onChange={(e) => set(a.id, { text: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="How often"
                    value={a.often}
                    onChange={(e) => set(a.id, { often: e.target.value })}
                    className="h-8 w-40"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${a.text || "item"}`}
                    onClick={() =>
                      onChange(actions.filter((x) => x.id !== a.id))
                    }
                  >
                    <IconTrash />
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={a.id}>
                <TableCell className="text-muted-foreground">
                  {a.area}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {a.text}
                  {edited.has(a.id) && <ChangedTag />}
                </TableCell>
                <TableCell>{a.often}</TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

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
  const changed = new Set(
    v && before
      ? [
          ...v.goals
            .filter(
              (g) =>
                JSON.stringify(g) !==
                JSON.stringify(before.goals.find((x) => x.id === g.id))
            )
            .map((g) => g.id),
          ...v.actions
            .filter(
              (a) =>
                JSON.stringify(a) !==
                JSON.stringify(before.actions.find((x) => x.id === a.id))
            )
            .map((a) => a.id),
        ]
      : []
  )
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
            <GoalsCard
              goals={v.goals}
              editing={false}
              edited={changed}
              onChange={() => {}}
            />
            <ActionsCard
              actions={v.actions}
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
