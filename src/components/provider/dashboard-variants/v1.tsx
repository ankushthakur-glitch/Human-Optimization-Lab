"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconCopy,
  IconFilter,
  IconMore,
  IconSearch,
} from "@/design-system/icons"

import { Button, buttonVariants } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/ui/input-group"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/design-system/ui/item"
import { NativeSelect, NativeSelectOption } from "@/design-system/ui/native-select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/design-system/ui/pagination"
import { Progress } from "@/design-system/ui/progress"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { Illustration } from "@/components/illustrations/illustration"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { type Patient, fullName } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DataTable,
  ReAreaChart,
  ReBarChart,
  ReLegend,
  type ReSeries,
  Row as TableRow,
  Sparkline,
  Td,
  Th,
  type Tone,
} from "@/components/dashboard-kit-v2"
import { NOW, daysSince } from "@/components/provider/home-v2/clock"
import { ItemPanel } from "@/components/provider/home-v2/item-panel"
import { TYPE_META, chartHref, itemTitle } from "@/components/provider/home-v2/labels"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  CardLink,
  FooterLink,
  type Segment,
  SegmentBar,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import {
  type ActionOptions,
  actionLabel,
  applyAction,
  ITEM_TYPES,
  isOpen,
  openSeries,
  toQueue,
  urgentSeries,
  weekDelta,
} from "@/components/provider/home-v2/selectors"
import type { ActionKind, ItemType, QueueItem } from "@/components/provider/home-v2/types"
import { MetricCards, VariantFrame } from "@/components/provider/dashboard-variants/frame"
import {
  type Marker,
  type Optimization,
  PLAN_STAGES,
  type PlanStage,
  useOptimization,
} from "@/components/provider/dashboard-variants/optimization-data"
import { useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 1, Queue: Inlay's optimization work read the way a help desk
   reads its tickets, after ReUI's Pulse, drawn only with the portal's own
   components. Four metric cards (upcoming appointments, patients needing attention, active optimization members, open tasks),
   the plan pipeline by stage beside the members' biological age gap, then
   one paged table of what to act on: care plans, off track and watchful
   trends, and urgent clinical items. */

const ACTOR = "Daniel Reyes, MD"
const CARE_PLAN = (id: string) => `/screens/patients/${id}?section=care-plan`

const STAGE_COLOR: Record<PlanStage, string> = {
  "Pending review": SUBTLE.violet,
  "Changes requested": SUBTLE.orange,
  "Sent to patient": SUBTLE.blue,
  Active: SUBTLE.green,
}

const days = (n: number) => `${n} d`
const years = (n: number) => `${Math.abs(n).toFixed(1)} y`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" })
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const short = (iso: string) => SHORT.format(new Date(`${iso.slice(0, 10)}T12:00:00`))

/** The wait badge a stage row and a plan row carry. */
function WaitBadge({ d }: { d: number }) {
  return d > 7 ? (
    <Badge tone="error">Over 7 days</Badge>
  ) : d >= 3 ? (
    <Badge tone="warning">3 to 7 days</Badge>
  ) : (
    <Badge tone="success">Within 3 days</Badge>
  )
}

/** The design system's progress bar, thin, in one status colour. */
function Meter({ value, color }: { value: number; color: string }) {
  return (
    <Progress
      value={Math.round(Math.min(1, Math.max(0, value)) * 100)}
      aria-label={`${Math.round(value * 100)}%`}
      className="flex-1 gap-0 [&_[data-slot=progress-indicator]]:bg-(--indicator) [&_[data-slot=progress-track]]:h-1.5"
      style={{ ["--indicator" as string]: color }}
    />
  )
}

/* -------------------------------------------------------- pipeline -- */

function Pipeline({ opt }: { opt: ReturnType<typeof useOptimization> }) {
  const rows = PLAN_STAGES.map((stage) => {
    const of = opt.members.filter((o) => o.stage === stage)
    return { stage, list: of, oldest: of.reduce((m, o) => Math.max(m, o.stageDays ?? 0), 0) }
  })
  const progress = Math.round(opt.avgProgress * 100)
  const segments: Segment[] = rows.map((r) => ({ label: r.stage, value: r.list.length, color: STAGE_COLOR[r.stage] }))

  function badgeFor(r: (typeof rows)[number]) {
    if (r.list.length === 0) return <Badge tone="light">None</Badge>
    if (r.stage === "Sent to patient") return <Badge tone="info">With patient</Badge>
    if (r.stage === "Active") return <Badge tone="success">{progress}% to goal</Badge>
    return <WaitBadge d={r.oldest} />
  }

  function lineFor(r: (typeof rows)[number]) {
    if (r.list.length === 0) return "No plans here"
    if (r.stage === "Active") return `${plural(opt.active.reduce((s, o) => s + o.plans.length, 0), "plan")} running`
    return `${r.list.length === 1 ? r.list[0]!.name : `${r.list.length} patients`}, oldest ${days(r.oldest)}`
  }

  return (
    <Card>
      <CardHeader
        title="Optimization pipeline"
        count={<Badge tone="light">{opt.members.length}</Badge>}
        description={`${plural(opt.members.length, "member")} by care plan stage`}
        actions={<CardLink href="/screens/patients">All patients</CardLink>}
      />
      <CardBody className="flex flex-1 flex-col gap-4">
        <SegmentBar segments={segments} label={`Members by stage: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} />
        <ItemGroup className="gap-2">
          {rows.map((r) => (
            <Item key={r.stage} variant="muted" size="sm" className="rounded-lg">
              <ItemContent className="min-w-0">
                <ItemTitle className="flex items-center gap-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STAGE_COLOR[r.stage] }} />
                  {r.stage}
                </ItemTitle>
                <ItemDescription className="truncate tabular-nums">{lineFor(r)}</ItemDescription>
              </ItemContent>
              <ItemActions className="gap-3">
                <span className="text-sm font-semibold tabular-nums">{r.list.length}</span>
                <span className="flex justify-end sm:w-[104px]">{badgeFor(r)}</span>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardBody>
      <FooterLink href={opt.reviewing[0] ? CARE_PLAN(opt.reviewing[0].patient.id) : "/screens/patients"}>
        {opt.upgrade.length > 0
          ? `${plural(opt.upgrade.length, "free patient")} fit a plan`
          : "Review the oldest plan"}
      </FooterLink>
    </Card>
  )
}

/* --------------------------------------------------- bio age chart -- */

const GAP_SERIES: ReSeries[] = [{ key: "gap", label: "Average gap", color: "var(--primary)", fill: "gradient" }]

/** "-1.7 y", signed, for the chart's axis and tooltip. */
const signedYears = (n: number) => `${n > 0 ? "+" : ""}${+n.toFixed(1)} y`

function BioAgeGap({ opt }: { opt: ReturnType<typeof useOptimization> }) {
  const group = opt.active.length ? opt.active : opt.members
  const n = group[0]?.bioTrend.length ?? 6
  const now = new Date(`${NOW.slice(0, 10)}T12:00:00`)
  const data = Array.from({ length: n }, (_, i) => {
    const d = new Date(now)
    d.setMonth(now.getMonth() - (n - 1 - i))
    const gap = group.length ? group.reduce((s, o) => s + (o.bioTrend[i]! - o.age), 0) / group.length : 0
    return { month: MONTH.format(d), gap: +gap.toFixed(1) }
  })
  const first = data[0]?.gap ?? 0
  const last = data[data.length - 1]?.gap ?? 0
  const change = +(last - first).toFixed(1)
  /* Whole years with a year of room; the span is a multiple of the axis's
     four steps so every tick lands on a whole year. */
  const lo = Math.floor(Math.min(...data.map((x) => x.gap)) - 1)
  const top = Math.ceil(Math.max(...data.map((x) => x.gap)) + 1)
  const hi = lo + Math.max(4, Math.ceil((top - lo) / 4) * 4)

  return (
    <Card>
      <CardHeader
        title="Biological age gap, members"
        description={`${years(last)} ${last <= 0 ? "younger" : "older"} on average, ${years(change)} ${change <= 0 ? "better" : "worse"} in 6 months`}
        actions={
          <Badge tone={change <= 0 ? "success" : "error"}>
            {change > 0 ? "+" : ""}
            {change} y
          </Badge>
        }
      />
      <CardBody className="flex-1">
        <ReAreaChart
          data={data}
          xKey="month"
          series={GAP_SERIES}
          dots="glow"
          curve="monotone"
          height={300}
          showYAxis
          yDomain={[lo, hi]}
          baseValue="dataMin"
          referenceY={lo < 0 && hi > 0 ? { value: 0 } : undefined}
          yTickFormat={signedYears}
          tooltipLabel={(month) => `${month} · ${signedYears(data.find((x) => x.month === month)?.gap ?? 0)}`}
          valueFormat={signedYears}
        />
      </CardBody>
      <CardFooter className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-medium">Trends to watch</span>
        <Badge tone={opt.offTrack.length ? "error" : "success"} dot>
          {opt.offTrack.length} off track
        </Badge>
        <Badge tone="warning" dot>
          {opt.watchful.length} watchful
        </Badge>
        <Badge tone="success" dot>
          {opt.improving.length} improving
        </Badge>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------ open items chart -- */

const OPEN_SERIES: ReSeries[] = [
  { key: "urgent", label: "Urgent", color: SUBTLE.red, fill: "stripe" },
  { key: "other", label: "Other open", color: "var(--primary)", fill: "solid" },
]

/** The last 14 days of the clinical queue: urgent striped over the rest, ReUI's striped and solid bars. */
function OpenItems({ open, urgent }: { open: QueueItem[]; urgent: QueueItem[] }) {
  const live = (t: ItemType) => open.filter((i) => i.type === t).length
  const totals = ITEM_TYPES.map((t) => openSeries(t, live(t))).reduce((acc, s) => acc.map((v, i) => v + (s[i] ?? 0)))
  const urgentDays = urgentSeries(urgent.length)
  const now = new Date(`${NOW.slice(0, 10)}T12:00:00`)
  const data = totals.map((total, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (totals.length - 1 - i))
    const u = Math.min(total, urgentDays[i] ?? 0)
    return { day: SHORT.format(d), urgent: u, other: total - u }
  })
  const delta = weekDelta(totals)

  return (
    <Card>
      <CardHeader
        title="Open items, 14 days"
        count={<Badge tone="light">{open.length}</Badge>}
        description={`${delta > 0 ? "+" : ""}${delta} on last week, ${plural(urgent.length, "urgent item")} today`}
        actions={<Badge tone={delta > 0 ? "error" : "success"}>{delta > 0 ? `+${delta}` : delta}</Badge>}
      />
      <CardBody className="flex flex-1 flex-col gap-3">
        <ReLegend series={OPEN_SERIES} />
        <ReBarChart
          data={data}
          xKey="day"
          series={OPEN_SERIES}
          stacked
          height={220}
          highlight={data.length - 1}
          xTickFormat={(v) => v.replace(/^[A-Za-z]+ /, "")}
          valueFormat={(v) => `${v}`}
        />
      </CardBody>
    </Card>
  )
}

/* ---------------------------------------------------- act on table -- */

type Kind = "plan" | "off" | "watch" | "clinical"

const KIND: Record<Kind, { label: string; tone: Tone }> = {
  plan: { label: "Care plan", tone: "primary" },
  off: { label: "Off track", tone: "error" },
  watch: { label: "Watchful", tone: "warning" },
  clinical: { label: "Clinical", tone: "info" },
}

type Priority = "Urgent" | "Moderate" | "Routine"
const PRIORITY_TONE: Record<Priority, Tone> = { Urgent: "error", Moderate: "warning", Routine: "light" }

type ActRow = {
  id: string
  kind: Kind
  title: string
  detail: string
  patient: Patient
  stage: React.ReactNode
  due: React.ReactNode
  priority: Priority
  meta: string
  href?: string
  item?: QueueItem
  quick: { label: string; done: string }
}

const lastOf = (m: Marker) => `${m.values[m.values.length - 1]} ${m.unit}`

function StageMeter({ word, share, color }: { word: string; share: number; color: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="truncate text-sm">{word}</span>
      <span className="flex items-center gap-2">
        <Meter value={share} color={color} />
        <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{Math.round(share * 100)}%</span>
      </span>
    </span>
  )
}

function TrendStage({ m, out }: { m: Marker; out: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Sparkline values={m.values} width={72} height={24} latest={out ? "out" : "neutral"} label={`${m.name}, last ${m.values.length} readings`} />
      <span className="text-xs text-muted-foreground">{m.dir === "worse" ? "Moving the wrong way" : "Flat"}</span>
    </span>
  )
}

function buildRows(opt: ReturnType<typeof useOptimization>, urgent: QueueItem[], byId: Map<string, Patient>): ActRow[] {
  const plans: ActRow[] = opt.reviewing.map((o: Optimization) => {
    const waited = o.stageDays ?? 0
    const route = o.tests.filter((t) => t.route === "Physician to decide").length
    const stage = o.stage ?? "Pending review"
    return {
      id: `plan-${o.patient.id}`,
      kind: "plan",
      title: o.stage === "Changes requested" ? "Care plan changes asked" : "Care plan to review",
      detail: o.plans.join(", "),
      patient: o.patient,
      stage: (
        <StageMeter
          word={route ? `${plural(route, "test")} to route` : stage}
          share={o.stage === "Changes requested" ? 0.6 : 0.3}
          color={STAGE_COLOR[stage]}
        />
      ),
      due: <span className={waited > 7 ? "text-destructive" : undefined}>Waiting {days(waited)}</span>,
      priority: waited > 7 ? "Urgent" : "Moderate",
      meta: `${days(waited)} in stage`,
      href: CARE_PLAN(o.patient.id),
      quick: { label: "Review", done: "Reviewed" },
    }
  })
  const trendRow = (kind: "off" | "watch", o: Optimization, m: Marker): ActRow => ({
    id: `${kind}-${o.patient.id}-${m.name}`,
    kind,
    title: `${m.name} ${lastOf(m)}`,
    detail: kind === "off" ? `Out of range, ${o.member ? "member" : "free"}` : "In range, moving the wrong way",
    patient: o.patient,
    stage: <TrendStage m={m} out={kind === "off"} />,
    due: <span className="text-muted-foreground">Last {m.values.length} readings</span>,
    priority: kind === "off" ? "Moderate" : "Routine",
    meta: o.member ? (o.plans[0] ?? "Member") : "Free plan",
    href: chartHref(o.patient.id, "labs"),
    quick: kind === "off" ? { label: "Flag", done: "Flagged" } : { label: "Watch", done: "Watching" },
  })
  const clinical: ActRow[] = urgent.flatMap((i) => {
    const p = byId.get(i.patientId)
    if (!p) return []
    return [
      {
        id: i.id,
        kind: "clinical" as const,
        title: itemTitle(i),
        detail: `${TYPE_META[i.type].word} · ${i.source}`,
        patient: p,
        stage: <StageMeter word={i.isNew ? "New, unread" : "Awaiting review"} share={i.isNew ? 0.2 : 0.5} color={SUBTLE.red} />,
        due: <span className="text-muted-foreground">Opened {short(i.createdAt)}</span>,
        priority: "Urgent" as const,
        meta: `${days(daysSince(i.createdAt))} open`,
        item: i,
        quick: { label: "Reviewed", done: "Reviewed" },
      },
    ]
  })
  const rank: Record<Priority, number> = { Urgent: 0, Moderate: 1, Routine: 2 }
  return [
    ...plans,
    ...clinical,
    ...opt.offTrack.map(({ o, m }) => trendRow("off", o, m)),
    ...opt.watchful.map(({ o, m }) => trendRow("watch", o, m)),
  ].sort((a, b) => rank[a.priority] - rank[b.priority])
}

function ActOn({
  rows,
  done,
  selectedId,
  onOpen,
  onQuick,
}: {
  rows: ActRow[]
  done: Record<string, string>
  selectedId?: string
  onOpen: (row: ActRow, ids: string[], from: HTMLElement) => void
  onQuick: (row: ActRow) => void
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [kind, setKind] = React.useState<Kind | "all">("all")
  const [size, setSize] = React.useState(5)
  const [page, setPage] = React.useState(0)

  const q = query.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false
    return !q || r.title.toLowerCase().includes(q) || fullName(r.patient).toLowerCase().includes(q) || r.patient.id.toLowerCase().includes(q)
  })
  const pages = Math.max(1, Math.ceil(shown.length / size))
  const at = Math.min(page, pages - 1)
  const pageRows = shown.slice(at * size, at * size + size)
  const ids = shown.filter((r) => r.item).map((r) => r.id)
  const counts = (k: Kind) => rows.filter((r) => r.kind === k).length
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (p >= 0 && p < pages) setPage(p)
  }

  return (
    <Card>
      <CardHeader
        title="Plans and trends to act on"
        count={<Badge tone="light">{rows.length}</Badge>}
        description={`${plural(counts("plan"), "plan")}, ${counts("off")} off track, ${counts("watch")} watchful, ${counts("clinical")} urgent clinical`}
        actions={
          <Link href="/screens/patients/dashboard?tab=urgent" className={buttonVariants({ size: "sm" })}>
            Open worklist
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <InputGroup className="h-8 w-full sm:w-64">
          <InputGroupAddon>
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search"
            placeholder="Search items or patients"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </InputGroup>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <IconFilter />
                {kind === "all" ? "Type" : KIND[kind].label}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={kind}
                onValueChange={(v) => {
                  setKind(v as Kind | "all")
                  setPage(0)
                }}
              >
                <DropdownMenuRadioItem value="all">All types</DropdownMenuRadioItem>
                {(Object.keys(KIND) as Kind[]).map((k) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {KIND[k].label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {(kind !== "all" || q) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKind("all")
              setQuery("")
              setPage(0)
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>Nothing to act on</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable minWidth={1040} boxClassName="relative">
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Patient</Th>
              <Th>Stage</Th>
              <Th>Due</Th>
              <Th>Type</Th>
              <Th>Priority</Th>
              <Th className="w-[150px]">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const finished = done[r.id] && (!r.item || !isOpen(r.item))
              return (
                <TableRow key={r.id} selected={r.id === selectedId} onOpen={(from) => onOpen(r, ids, from)}>
                  <Td className="max-w-[260px]">
                    <span className="flex flex-col">
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <span className="truncate text-[13px] text-muted-foreground">{r.detail}</span>
                    </span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={fullName(r.patient)} photo={r.patient.photo} size={30} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{fullName(r.patient)}</span>
                        <span className="text-[13px] text-muted-foreground tabular-nums">{r.patient.id}</span>
                      </span>
                    </span>
                  </Td>
                  <Td className="w-[210px]">{r.stage}</Td>
                  <Td className="text-sm whitespace-nowrap tabular-nums">{r.due}</Td>
                  <Td>
                    <Badge tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Badge>
                  </Td>
                  <Td>
                    <span className="flex flex-col items-start gap-1">
                      <Badge tone={PRIORITY_TONE[r.priority]} dot>
                        {r.priority}
                      </Badge>
                      <span className="max-w-[140px] truncate text-xs text-muted-foreground tabular-nums">{r.meta}</span>
                    </span>
                  </Td>
                  <Td>
                    <span className="flex items-center justify-end gap-1">
                      {finished ? (
                        <Badge tone="success" dot>
                          {done[r.id]}
                        </Badge>
                      ) : (
                        <Button variant="outline" size="xs" onClick={() => onQuick(r)}>
                          {r.quick.label}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="More actions">
                              <IconMore />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push(chartHref(r.patient.id))}>Open chart</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => onOpen(r, ids, e.currentTarget as HTMLElement)}>Review</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => void navigator.clipboard?.writeText(r.patient.id)}>
                              <IconCopy />
                              Copy ID
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </Td>
                </TableRow>
              )
            })}
          </tbody>
        </DataTable>
      )}

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <label className="flex items-center gap-2">
          Rows per page
          <NativeSelect
            size="sm"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
          >
            {[5, 10, 20].map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <span className="tabular-nums">
          {shown.length ? `${at * size + 1} to ${Math.min(shown.length, at * size + size)} of ${shown.length}` : "0 of 0"}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={go(at - 1)} aria-disabled={at === 0} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive onClick={go(at)}>
                {at + 1}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={go(at + 1)} aria-disabled={at >= pages - 1} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------- page -- */

export function DashboardOverview() {
  const d = useProviderDay()
  const opt = useOptimization()
  const router = useRouter()
  const [done, setDone] = React.useState<Record<string, string>>({})
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)

  const { open, urgent, byId } = d
  const ready = d.ready && opt.ready

  /* Every item the panel may walk, worked ones included. */
  const all = React.useMemo(() => d.work.filter((i) => byId.has(i.patientId)).map(toQueue), [d.work, byId])
  /* Urgent items stay listed once worked in place, with their done badge. */
  const urgentListed = React.useMemo(
    () => all.filter((i) => i.priority === "urgent" && (isOpen(i) || done[i.id]) && d.mine.some((p) => p.id === i.patientId)),
    [all, done, d.mine]
  )
  const rows = React.useMemo(() => buildRows(opt, urgentListed, byId), [opt, urgentListed, byId])

  /* Work an item, audit it, and offer Undo. */
  function work(item: QueueItem, kind: ActionKind, opts: ActionOptions = {}) {
    const snapshot = { ...item }
    workItems.patch(item.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), item.id)
    toast.success(actionLabel(kind, opts), {
      description: itemTitle(item),
      action: {
        label: "Undo",
        onClick: () => {
          workItems.patch(item.id, snapshot)
          recordAudit(ACTOR, "undo", item.id)
        },
      },
    })
  }

  function act(kind: ActionKind, opts: ActionOptions = {}) {
    if (!panel) return
    const item = all.find((i) => i.id === panel.id)
    if (!item) return
    work(item, kind, opts)
    setDone((x) => ({ ...x, [item.id]: actionLabel(kind, opts) }))
    const at = panel.list.indexOf(item.id)
    const rest = panel.list.filter((id) => id !== item.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  function openRow(r: ActRow, ids: string[], from: HTMLElement) {
    if (r.item) {
      openerRef.current = from
      setPanel({ id: r.item.id, list: ids.includes(r.item.id) ? ids : [r.item.id] })
    } else if (r.href) router.push(r.href)
  }

  function quick(r: ActRow) {
    if (r.kind === "plan" && r.href) {
      router.push(r.href)
      return
    }
    if (r.item) work(r.item, "mark_reviewed")
    setDone((x) => ({ ...x, [r.id]: r.quick.done }))
  }

  const current = panel ? (all.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (dir: -1 | 1) => (panel && panel.list[at + dir] ? () => setPanel({ ...panel, id: panel.list[at + dir]! }) : undefined)

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg leading-7 font-semibold">Home</h1>
      </header>

      {!ready ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-[460px] rounded-[7.2px]" />
            <Skeleton className="h-[460px] rounded-[7.2px]" />
          </div>
          <Skeleton className="h-[420px] rounded-[7.2px]" />
        </>
      ) : (
        <>
          <MetricCards />

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <Pipeline opt={opt} />
            <BioAgeGap opt={opt} />
            <div className="grid lg:col-span-2 2xl:col-span-1">
              <OpenItems open={open} urgent={urgent} />
            </div>
          </div>

          <ActOn rows={rows} done={done} selectedId={current?.id} onOpen={openRow} onQuick={quick} />
        </>
      )}

      <ItemPanel
        item={current}
        patient={current ? (byId.get(current.patientId) ?? null) : null}
        onPrevious={step(-1)}
        onNext={step(1)}
        onClose={() => setPanel(null)}
        returnFocus={openerRef}
        onAct={act}
      />
    </VariantFrame>
  )
}
