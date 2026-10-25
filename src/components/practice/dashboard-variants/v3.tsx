"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown02Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons"
import {
  IconActivity,
  IconBriefcase,
  IconChartUp,
  IconCreditCard,
  IconDashboard,
  IconDownload,
  IconFilter,
  IconRefresh,
  IconUserAdd,
  IconUsersGroup,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { Progress } from "@/design-system/ui/progress"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import {
  Badge,
  type Tone as BadgeTone,
  Card,
  CardFooter,
  CardHeader,
  DataTable,
  FOCUS,
  PALETTE,
  ReAreaChart,
  ReBarChart,
  ReDonut,
  ReDonutLegend,
  Row,
  SegmentedControl,
  Td,
  Th,
} from "@/components/dashboard-kit-v2"
import { AreaSpark } from "@/components/dashboard-kit-v2/charts"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { ENROLLMENT, VALUE } from "@/components/practice/practice-reports-data"
import { CardLink, IconTile, LegendGrid, SegmentBar } from "@/components/provider/home-v2/overview"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import { type Counts, PLAN_PRICE } from "@/components/provider/reports/reports-data"
import { providerName } from "@/components/practice/practice-data"
import { VariantFrame } from "@/components/practice/dashboard-variants/frame"
import {
  HREF,
  type PeriodKind,
  type PracticeOps,
  type ReportTotals,
  pct,
  usePracticeOps,
  useReportTotals,
} from "@/components/practice/dashboard-variants/practice-ops"

/* Variation 3, Growth, after ReUI's Verve CRM: the practice as a business.
   A secondary nav switches four views (Overview, Pipeline, Revenue,
   Employers). Members, revenue, renewals and the enrollment pipeline come
   from the practice reports, so each number matches its report; employer
   accounts and patient sources come from the live patient list. */

const BASE = "/screens/practice/dashboard/v3"
const EMPLOYERS_HREF = `${HREF.settings}/employers/list`

type View = "overview" | "pipeline" | "revenue" | "employers"

const NAV: { group: string; items: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    group: "Growth",
    items: [
      { view: "overview", label: "Overview", icon: IconDashboard },
      { view: "pipeline", label: "Pipeline", icon: IconFilter },
    ],
  },
  {
    group: "Business",
    items: [
      { view: "revenue", label: "Revenue", icon: IconCreditCard },
      { view: "employers", label: "Employers", icon: IconBriefcase },
    ],
  },
]
const VIEWS = NAV.flatMap((g) => g.items)
const viewOf = (s: string | null): View => VIEWS.find((v) => v.view === s)?.view ?? "overview"

/* ------------------------------------------------------------- tones -- */

type Tone = "red" | "orange" | "green" | "teal" | "blue" | "violet" | "gray"
const HUE: Record<Tone, string> = {
  red: SUBTLE.red,
  orange: SUBTLE.orange,
  green: SUBTLE.green,
  teal: PALETTE.primary,
  blue: SUBTLE.blue,
  violet: SUBTLE.violet,
  gray: "#B5B5B5",
}
const BADGE: Record<Tone, BadgeTone> = {
  red: "error",
  orange: "warning",
  green: "success",
  teal: "primary",
  blue: "info",
  violet: "light",
  gray: "light",
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const compact = (n: number) => (n >= 10_000 ? `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : money(n))
const renewRate = (v: Counts) => pct(v.renewed, v.renewed + v.cancelled)
const enrollRate = (e: Counts) => pct(e.enrolled, e.added)

/** A change against the period before, as a badge: green when it helps. */
function Change({ value, suffix = "", goodWhen = "up" }: { value: number; suffix?: string; goodWhen?: "up" | "down" }) {
  const good = value === 0 ? null : (value > 0) === (goodWhen === "up")
  return (
    <Badge
      tone={good === null ? "light" : good ? "success" : "error"}
      icon={value < 0 ? ArrowDown02Icon : value > 0 ? ArrowUp02Icon : undefined}
    >
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </Badge>
  )
}

/** A share as the design system's progress bar, in a status hue. */
function Meter({ value, tone = "teal", label, className }: { value: number; tone?: Tone; label?: string; className?: string }) {
  return (
    <Progress
      value={Math.max(0, Math.min(100, value))}
      aria-label={label}
      className={cn("[&_[data-slot=progress-indicator]]:bg-(--bar) [&_[data-slot=progress-track]]:h-1.5", className)}
      style={{ "--bar": HUE[tone] } as React.CSSProperties}
    />
  )
}

/** A section: the kit's card with its header and an optional footer of buttons. */
function VFrame({
  title,
  sub,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  sub?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={className}>
      {(title || actions) && <CardHeader title={title ?? ""} description={sub} actions={actions} />}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", bodyClassName)}>{children}</div>
      {footer && <CardFooter className="grid grid-cols-2 [&>*]:w-full">{footer}</CardFooter>}
    </Card>
  )
}

function SectionSkeleton({ h = 220 }: { h?: number }) {
  return <Skeleton className="w-full rounded-[7.2px]" style={{ height: h }} />
}

/* ------------------------------------------------------------- page -- */

type Ctx = { ops: PracticeOps; totals: ReportTotals; kind: PeriodKind; locationId: string }

export function PracticeDashboardV3() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const view = viewOf(params.get("view"))
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const [locationId, setLocationId] = React.useState("")
  const ops = usePracticeOps()
  const totals = useReportTotals(kind, locationId)

  function go(next: View) {
    const q = new URLSearchParams(params)
    if (next === "overview") q.delete("view")
    else q.set("view", next)
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const label = VIEWS.find((v) => v.view === view)!.label
  const ctx: Ctx = { ops, totals, kind, locationId }

  return (
    <VariantFrame padded={false}>
      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        {/* Verve's secondary nav: grouped views, the active one on a grey pill. */}
        <nav aria-label="Growth views" className="shrink-0 border-r border-border bg-card max-lg:hidden lg:w-[200px]">
          <div className="sticky top-0 flex flex-col gap-4 px-2.5 py-4">
            {NAV.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{g.group}</span>
                {g.items.map((it) => {
                  const active = it.view === view
                  return (
                    <Button
                      key={it.view}
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => go(it.view)}
                      aria-current={active ? "page" : undefined}
                      className={cn("justify-start gap-2.5 font-normal", active && "font-medium")}
                    >
                      <it.icon className="text-muted-foreground" />
                      {it.label}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-4 pb-10 sm:px-6">
          {/* Under 1024px the nav becomes a row of pills. */}
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:hidden">
            {VIEWS.map((it) => (
              <Button
                key={it.view}
                variant={it.view === view ? "secondary" : "outline"}
                size="sm"
                onClick={() => go(it.view)}
                aria-current={it.view === view ? "page" : undefined}
                className={cn("shrink-0 rounded-full", it.view !== view && "bg-card")}
              >
                <it.icon />
                {it.label}
              </Button>
            ))}
          </div>

          <header className="flex flex-wrap items-center gap-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={BASE} />}>Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>Growth</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Period"
                value={kind}
                onChange={setKind}
                items={[
                  { value: "Month", label: "Month" },
                  { value: "Quarter", label: "Quarter" },
                  { value: "Year", label: "Year" },
                ]}
              />
              <ToolbarSelect
                label="Location"
                className="w-44"
                items={[
                  { label: "All locations", value: "" },
                  ...ops.activeLocations.map((l) => ({ label: l.name, value: l.id })),
                ]}
                value={locationId}
                onChange={setLocationId}
              />
              <Button
                variant="outline"
                size="sm"
                className="bg-card max-sm:hidden"
                onClick={() => toast.success(`${label} for ${totals.now.period.label} exported`)}
              >
                <IconDownload />
                Export
              </Button>
            </div>
          </header>

          {!ops.ready ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <SectionSkeleton key={i} h={128} />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <SectionSkeleton h={380} />
                <SectionSkeleton h={380} />
              </div>
            </div>
          ) : view === "overview" ? (
            <OverviewView ctx={ctx} go={go} />
          ) : view === "pipeline" ? (
            <PipelineView ctx={ctx} />
          ) : view === "revenue" ? (
            <RevenueView ctx={ctx} />
          ) : (
            <EmployersView ctx={ctx} />
          )}
        </div>
      </div>
    </VariantFrame>
  )
}

/* ---------------------------------------------------------- overview -- */

function KpiCard({
  icon,
  title,
  sub,
  badge,
  value,
  bars,
  tone,
  href,
}: {
  icon: typeof IconUserAdd
  title: string
  sub: React.ReactNode
  badge: React.ReactNode
  value: React.ReactNode
  bars: number[]
  tone: Tone
  href: string
}) {
  return (
    <Link href={href} className={cn("group rounded-[7.2px]", FOCUS)}>
      <VFrame className="h-full transition-colors group-hover:border-foreground/20" bodyClassName="gap-5 p-4">
        <div className="flex items-start gap-3">
          <IconTile icon={icon} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-medium">{title}</span>
            <span className="truncate text-[13px] text-muted-foreground tabular-nums">{sub}</span>
          </div>
          {badge}
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">{value}</span>
          <AreaSpark values={bars} color={HUE[tone]} label={`${title}, recent periods`} />
        </div>
      </VFrame>
    </Link>
  )
}

function KpiStrip({ ctx }: { ctx: Ctx }) {
  const { now, before, trend } = ctx.totals
  const v = now.value
  const b = before.value
  return (
    <section aria-label={`${now.period.label} at a glance`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        icon={IconUsersGroup}
        title="Active members"
        sub={`${before.period.label}: ${b.members}`}
        badge={<Change value={v.members - b.members} />}
        value={v.members}
        bars={trend.map((t) => t.value.members)}
        tone="teal"
        href={HREF.report(VALUE)}
      />
      <KpiCard
        icon={IconCreditCard}
        title="Monthly revenue"
        sub={`$${PLAN_PRICE} a member`}
        badge={<Change value={(v.members - b.members) * PLAN_PRICE} />}
        value={compact(v.members * PLAN_PRICE)}
        bars={trend.map((t) => t.value.members * PLAN_PRICE)}
        tone="green"
        href={`${BASE}?view=revenue`}
      />
      <KpiCard
        icon={IconRefresh}
        title="Renewal rate"
        sub={`${v.renewed} of ${v.renewed + v.cancelled} decided`}
        badge={<Change value={renewRate(v) - renewRate(b)} suffix="%" />}
        value={`${renewRate(v)}%`}
        bars={trend.map((t) => renewRate(t.value))}
        tone="blue"
        href={`${BASE}?view=revenue`}
      />
      <KpiCard
        icon={IconUserAdd}
        title="Enrollment rate"
        sub={`${now.enroll.enrolled} of ${now.enroll.added} invited`}
        badge={<Change value={enrollRate(now.enroll) - enrollRate(before.enroll)} suffix="%" />}
        value={`${enrollRate(now.enroll)}%`}
        bars={trend.map((t) => enrollRate(t.enroll))}
        tone="violet"
        href={`${BASE}?view=pipeline`}
      />
      <KpiCard
        icon={IconChartUp}
        title="New members"
        sub={`${before.period.label}: ${b.newMembers}`}
        badge={<Change value={v.newMembers - b.newMembers} />}
        value={v.newMembers}
        bars={trend.map((t) => t.value.newMembers)}
        tone="orange"
        href={HREF.report(VALUE)}
      />
    </section>
  )
}

function OverviewView({ ctx, go }: { ctx: Ctx; go: (v: View) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <KpiStrip ctx={ctx} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Pipeline ctx={ctx} footer={
          <>
            <Button variant="outline" size="sm" className="bg-card" onClick={() => go("pipeline")}>
              Pipeline by provider
            </Button>
            <Link href={HREF.report(ENROLLMENT)} className={buttonVariants({ size: "sm" })}>
              Full report
            </Link>
          </>
        } />
        <MembersRevenue ctx={ctx} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Renewals ctx={ctx} />
        <Sources ctx={ctx} className="xl:col-span-2" />
      </div>
      <EmployerTable ctx={ctx} limit={5} />
    </div>
  )
}

/* ---------------------------------------------------------- pipeline -- */

/** The enrollment pipeline: each stage as a column with its count, its
    share of everyone added and the conversion from the stage before. */
function Pipeline({ ctx, footer }: { ctx: Ctx; footer?: React.ReactNode }) {
  const { now } = ctx.totals
  const e = now.enroll
  const stages: { label: string; value: number; tone: Tone }[] = [
    { label: "Added and invited", value: e.added, tone: "gray" },
    { label: "Enrolled", value: e.enrolled, tone: "blue" },
    { label: "Record connected", value: e.connected, tone: "violet" },
    { label: "Activated", value: e.activated, tone: "green" },
    { label: "Became members", value: Math.min(now.value.newMembers, e.activated), tone: "teal" },
  ]
  return (
    <VFrame
      title="Patient pipeline"
      sub={now.period.label}
      actions={<CardLink href={HREF.report(ENROLLMENT)}>Report</CardLink>}
      footer={footer}
      bodyClassName="gap-4 p-4"
    >
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stages.map((s, i) => (
          <li key={s.label} className="flex min-w-0 flex-col gap-2 rounded-[7.2px] bg-muted/60 p-3">
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: HUE[s.tone] }} />
              {s.label}
            </span>
            <span className="text-2xl leading-8 font-semibold tabular-nums">{s.value}</span>
            {i === 0 ? (
              <Badge tone="light">All patients</Badge>
            ) : (
              <Badge tone={BADGE[pct(s.value, stages[i - 1].value) >= 70 ? "green" : pct(s.value, stages[i - 1].value) >= 45 ? "orange" : "red"]}>
                {pct(s.value, stages[i - 1].value)}% carried on
              </Badge>
            )}
          </li>
        ))}
      </ol>
      <ul className="flex flex-col gap-3">
        {stages.map((s) => (
          <li key={s.label} className="grid grid-cols-[140px_1fr_44px] items-center gap-3 text-[13px]">
            <span className="truncate">{s.label}</span>
            <Meter value={pct(s.value, e.added)} tone={s.tone} label={`${s.label}, share of patients added`} />
            <span className="text-right text-muted-foreground tabular-nums">{pct(s.value, e.added)}%</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Still invited</dt>
          <dd className="text-lg font-semibold tabular-nums">{e.waiting}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Declined</dt>
          <dd className="text-lg font-semibold tabular-nums">{e.declined}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Days to enroll</dt>
          <dd className="text-lg font-semibold tabular-nums">{e.enrolled ? (e.days / e.enrolled).toFixed(1) : "0.0"}</dd>
        </div>
      </dl>
    </VFrame>
  )
}

function PipelineView({ ctx }: { ctx: Ctx }) {
  const { now } = ctx.totals
  const rows = ctx.ops.providerRows
    .filter((r) => ctx.totals.providerIds.includes(r.provider.id))
    .map((r) => ({ ...r, counts: ctx.totals.forProvider(ENROLLMENT, r.provider.id) }))
    .sort((a, b) => enrollRate(b.counts) - enrollRate(a.counts))
  const trend = ctx.totals.trend.map((t) => ({
    period: t.period.label,
    short: ctx.kind === "Month" ? t.period.label.slice(0, 3) : t.period.label,
    added: t.enroll.added,
    enrolled: t.enroll.enrolled,
    activated: t.enroll.activated,
  }))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Pipeline ctx={ctx} />
        <VFrame title="Enrollment over time" sub={`Last ${trend.length} ${ctx.kind.toLowerCase()}s`} bodyClassName="p-4">
          <ReBarChart
            data={trend}
            xKey="short"
            height={300}
            tooltipLabel={(l) => trend.find((t) => t.short === l)?.period ?? l}
            series={[
              { key: "added", label: "Added and invited", color: HUE.gray },
              { key: "enrolled", label: "Enrolled", color: HUE.blue },
              { key: "activated", label: "Activated", color: HUE.green },
            ]}
          />
        </VFrame>
      </div>
      <VFrame title="Pipeline by provider" sub={now.period.label} bodyClassName="overflow-hidden">
        <DataTable minWidth={760}>
          <thead>
            <tr>
              <Th>Provider</Th>
              <Th className="text-right">Invited</Th>
              <Th className="text-right">Enrolled</Th>
              <Th className="text-right">Activated</Th>
              <Th className="text-right">Declined</Th>
              <Th className="w-[220px]">Enrollment rate</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rate = enrollRate(r.counts)
              return (
                <Row key={r.provider.id}>
                  <Td>
                    <Link href={HREF.provider(r.provider.id)} className={cn("font-medium hover:underline", FOCUS)}>
                      {providerName(r.provider)}
                    </Link>
                  </Td>
                  <Td className="text-right tabular-nums">{r.counts.added}</Td>
                  <Td className="text-right tabular-nums">{r.counts.enrolled}</Td>
                  <Td className="text-right tabular-nums">{r.counts.activated}</Td>
                  <Td className="text-right tabular-nums">{r.counts.declined}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Meter value={rate} tone={rate >= 70 ? "green" : rate >= 50 ? "orange" : "red"} label={`${providerName(r.provider)} enrollment rate`} className="flex-1" />
                      <span className="w-10 text-right text-[13px] tabular-nums">{rate}%</span>
                    </div>
                  </Td>
                </Row>
              )
            })}
          </tbody>
        </DataTable>
      </VFrame>
    </div>
  )
}

/* ----------------------------------------------------------- revenue -- */

function MembersRevenue({ ctx, height = 260 }: { ctx: Ctx; height?: number }) {
  const [show, setShow] = React.useState<"revenue" | "members">("revenue")
  const data = ctx.totals.trend.map((t) => ({
    period: t.period.label,
    short: ctx.kind === "Month" ? t.period.label.slice(0, 3) : t.period.label,
    revenue: t.value.revenue,
    members: t.value.members,
    newMembers: t.value.newMembers,
  }))
  const v = ctx.totals.now.value
  return (
    <VFrame
      title={show === "revenue" ? "Revenue" : "Members"}
      actions={
        <SegmentedControl
          label="Show"
          value={show}
          onChange={setShow}
          items={[
            { value: "revenue", label: "Revenue" },
            { value: "members", label: "Members" },
          ]}
        />
      }
      bodyClassName="gap-4 p-4"
    >
      <dl className="grid grid-cols-3 gap-3">
        <div className="flex min-w-0 flex-col">
          <dt className="truncate text-xs text-muted-foreground">Revenue this {ctx.kind.toLowerCase()}</dt>
          <dd className="text-xl font-semibold tabular-nums">{money(v.revenue)}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="truncate text-xs text-muted-foreground">Monthly recurring</dt>
          <dd className="text-xl font-semibold tabular-nums">{money(v.members * PLAN_PRICE)}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="truncate text-xs text-muted-foreground">Active members</dt>
          <dd className="text-xl font-semibold tabular-nums">{v.members}</dd>
        </div>
      </dl>
      {show === "revenue" ? (
        <ReAreaChart
          data={data}
          xKey="short"
          height={height}
          dots="glow"
          showYAxis
          yTickFormat={(n) => compact(n)}
          valueFormat={(n) => money(n)}
          tooltipLabel={(l) => data.find((d) => d.short === l)?.period ?? l}
          series={[{ key: "revenue", label: "Revenue", color: HUE.teal }]}
        />
      ) : (
        <ReBarChart
          data={data}
          xKey="short"
          height={height}
          tooltipLabel={(l) => data.find((d) => d.short === l)?.period ?? l}
          series={[
            { key: "members", label: "Active members", color: HUE.teal },
            { key: "newMembers", label: "New members", color: HUE.blue, fill: "stripe" },
          ]}
        />
      )}
    </VFrame>
  )
}

function Renewals({ ctx }: { ctx: Ctx }) {
  const v = ctx.totals.now.value
  const due = Math.max(0, v.due - v.renewed - v.cancelled)
  const slices = [
    { key: "renewed", label: "Renewed", value: v.renewed, color: HUE.green },
    { key: "cancelled", label: "Cancelled", value: v.cancelled, color: HUE.red },
    { key: "due", label: "Still due", value: due, color: HUE.blue },
  ]
  return (
    <VFrame title="Renewals" sub={ctx.totals.now.period.label} actions={<CardLink href={HREF.report(VALUE)}>Report</CardLink>} bodyClassName="gap-3 p-4">
      <ReDonut data={slices} centerValue={`${renewRate(v)}%`} centerLabel="Renewed" height={200} />
      <ReDonutLegend data={slices} />
    </VFrame>
  )
}

function RevenueView({ ctx }: { ctx: Ctx }) {
  const rows = ctx.ops.providerRows
    .filter((r) => ctx.totals.providerIds.includes(r.provider.id))
    .map((r) => ({ ...r, counts: ctx.totals.forProvider(VALUE, r.provider.id) }))
    .sort((a, b) => b.counts.members - a.counts.members)
  const max = Math.max(1, ...rows.map((r) => r.counts.members))
  return (
    <div className="flex flex-col gap-4">
      <KpiStrip ctx={ctx} />
      <div className="grid gap-4 xl:grid-cols-3">
        <MembersRevenue ctx={ctx} height={300} />
        <Renewals ctx={ctx} />
        <VFrame title="Members by provider" sub={ctx.totals.now.period.label} bodyClassName="gap-3 p-4">
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.provider.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2 text-[13px]">
                  <Link href={HREF.provider(r.provider.id)} className={cn("truncate font-medium hover:underline", FOCUS)}>
                    {providerName(r.provider)}
                  </Link>
                  <span className="ml-auto tabular-nums">{r.counts.members}</span>
                  <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{compact(r.counts.members * PLAN_PRICE)}</span>
                </div>
                <Meter value={pct(r.counts.members, max)} tone="teal" label={`${providerName(r.provider)} members`} />
              </li>
            ))}
          </ul>
        </VFrame>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- employers -- */

function usePatientsAt(ctx: Ctx) {
  return React.useMemo(
    () => ctx.ops.patients.filter((p) => !ctx.locationId || p.locationId === ctx.locationId),
    [ctx.ops.patients, ctx.locationId]
  )
}

/** Where patients came from: an employer account or their own sign up, and
    added by hand or through a bulk import. */
function Sources({ ctx, className }: { ctx: Ctx; className?: string }) {
  const pats = usePatientsAt(ctx)
  const manual = pats.filter((p) => p.source === "Manual").length
  const bulk = pats.length - manual
  const viaEmployer = pats.filter((p) => p.employerId).length
  const how = [
    { label: "Added by hand", value: manual, color: HUE.teal },
    { label: "Bulk import", value: bulk, color: HUE.violet },
  ]
  const who = [
    { label: "Employer account", value: viaEmployer, color: HUE.blue },
    { label: "Self sign up", value: pats.length - viaEmployer, color: HUE.orange },
  ]
  return (
    <VFrame title="Patient sources" actions={<CardLink href={HREF.patients}>Patients</CardLink>} className={className} bodyClassName="gap-5 p-4 sm:flex-row">
      {[
        { title: "How they were added", segs: how },
        { title: "How they came", segs: who },
      ].map((g) => (
        <div key={g.title} className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium">{g.title}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{pats.length} patients</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{pct(g.segs[0].value, pats.length)}%</span>
            <span className="text-xs text-muted-foreground">{g.segs[0].label.toLowerCase()}</span>
          </div>
          <SegmentBar segments={g.segs} label={`${g.title}: ${g.segs.map((s) => `${s.label} ${s.value}`).join(", ")}`} />
          <LegendGrid segments={g.segs} />
        </div>
      ))}
    </VFrame>
  )
}

function EmployerTable({ ctx, limit }: { ctx: Ctx; limit?: number }) {
  const pats = usePatientsAt(ctx)
  const rows = ctx.ops.employerRows
    .map((r) => {
      const theirs = pats.filter((p) => p.employerId === r.employer.id)
      return { ...r, patients: theirs.length, active: theirs.filter((p) => p.status === "Active").length }
    })
    .sort((a, b) => b.patients - a.patients)
  const self = pats.filter((p) => !p.employerId)
  const selfActive = self.filter((p) => p.status === "Active").length
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <VFrame
      title="Employer accounts"
      actions={<CardLink href={EMPLOYERS_HREF}>Employers</CardLink>}
      bodyClassName="overflow-hidden"
    >
      <DataTable minWidth={880}>
        <thead>
          <tr>
            <Th>Employer</Th>
            <Th>Status</Th>
            <Th className="text-right">Eligible</Th>
            <Th className="text-right">Matched</Th>
            <Th className="text-right">Patients</Th>
            <Th className="text-right">Active</Th>
            <Th className="w-[220px]">Enrolled share</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const share = pct(r.active, r.patients)
            return (
              <Row key={r.employer.id}>
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.employer.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{pct(r.employer.matched, r.employer.eligible)}% matched</span>
                  </div>
                </Td>
                <Td>
                  <Badge tone={r.employer.status === "Active" ? "success" : "light"} dot>
                    {r.employer.status}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums">{r.employer.eligible.toLocaleString("en-US")}</Td>
                <Td className="text-right tabular-nums">{r.employer.matched.toLocaleString("en-US")}</Td>
                <Td className="text-right tabular-nums">{r.patients}</Td>
                <Td className="text-right tabular-nums">{r.active}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Meter value={share} tone={share >= 60 ? "green" : share >= 40 ? "orange" : "red"} label={`${r.employer.name} enrolled share`} className="flex-1" />
                    <span className="w-10 text-right text-[13px] tabular-nums">{share}%</span>
                  </div>
                </Td>
              </Row>
            )
          })}
          <Row className="bg-muted/40">
            <Td>
              <span className="font-medium">Self sign up</span>
            </Td>
            <Td>
              <Badge tone="light">No account</Badge>
            </Td>
            <Td className="text-right text-muted-foreground">None</Td>
            <Td className="text-right text-muted-foreground">None</Td>
            <Td className="text-right tabular-nums">{self.length}</Td>
            <Td className="text-right tabular-nums">{selfActive}</Td>
            <Td>
              <div className="flex items-center gap-3">
                <Meter value={pct(selfActive, self.length)} tone="blue" label="Self sign up enrolled share" className="flex-1" />
                <span className="w-10 text-right text-[13px] tabular-nums">{pct(selfActive, self.length)}%</span>
              </div>
            </Td>
          </Row>
        </tbody>
      </DataTable>
    </VFrame>
  )
}

function EmployersView({ ctx }: { ctx: Ctx }) {
  const active = ctx.ops.employerRows.filter((r) => r.employer.status === "Active")
  const eligible = active.reduce((s, r) => s + r.employer.eligible, 0)
  const matched = active.reduce((s, r) => s + r.employer.matched, 0)
  const pats = usePatientsAt(ctx)
  const fromEmployers = pats.filter((p) => p.employerId)
  const data = ctx.ops.employerRows.map((r) => {
    const theirs = pats.filter((p) => p.employerId === r.employer.id)
    return {
      name: r.employer.name,
      active: theirs.filter((p) => p.status === "Active").length,
      invited: theirs.filter((p) => p.status === "Invited").length,
      other: theirs.filter((p) => p.status === "Declined" || p.status === "Inactive").length,
    }
  })
  const tiles: { icon: typeof IconUserAdd; label: string; value: string; meta: string }[] = [
    { icon: IconBriefcase, label: "Active accounts", value: String(active.length), meta: `${ctx.ops.employerRows.length} in all` },
    { icon: IconUsersGroup, label: "Eligible lives", value: eligible.toLocaleString("en-US"), meta: "From the latest files" },
    { icon: IconActivity, label: "Matched", value: `${pct(matched, eligible)}%`, meta: `${matched.toLocaleString("en-US")} matched` },
    { icon: IconUserAdd, label: "Patients from employers", value: String(fromEmployers.length), meta: `${pct(fromEmployers.length, pats.length)}% of patients` },
  ]
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Employer accounts at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <VFrame key={t.label} bodyClassName="gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <IconTile icon={t.icon} />
              <span className="truncate text-sm font-medium">{t.label}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[26px] leading-8 font-semibold tabular-nums">{t.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{t.meta}</span>
            </div>
          </VFrame>
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        <VFrame title="Patients by employer" className="xl:col-span-2" bodyClassName="p-4">
          <ReBarChart
            data={data}
            xKey="name"
            stacked
            height={280}
            series={[
              { key: "active", label: "Active", color: HUE.green },
              { key: "invited", label: "Invited", color: HUE.blue },
              { key: "other", label: "Declined or closed", color: HUE.gray },
            ]}
          />
        </VFrame>
        <Sources ctx={ctx} className="[&>div]:sm:flex-col" />
      </div>
      <EmployerTable ctx={ctx} />
      <div className="flex justify-end">
        <Link href={EMPLOYERS_HREF} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}>
          Manage employer accounts
        </Link>
      </div>
    </div>
  )
}
