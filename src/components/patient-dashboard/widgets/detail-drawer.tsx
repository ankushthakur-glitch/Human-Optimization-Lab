"use client"

import * as React from "react"
import { ArrowDown02Icon, ArrowRight01Icon, ArrowUp02Icon, BulbIcon } from "@hugeicons/core-free-icons"
import { Area, AreaChart, LabelList, ReferenceLine, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import {
  AXIS_PROPS,
  DIVIDER,
  FOCUS,
  Grid,
  KitIcon,
  SidePanel,
  Sparkline,
  UnderlineTabs,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import { fmt, shown } from "@/components/patient-dashboard/optimization/rules"
import {
  type Analytics,
  type HealthMetric,
  unitText,
} from "@/components/patient-dashboard/widgets/metrics"
import {
  ACTION_SCOPE,
  BUTTON_OUTLINE,
  BUTTON_SOLID,
  TONE,
  type ToneKey,
} from "@/components/patient-dashboard/widgets/palette"
import { Pill, STATUS, StatusIcon, StatusWord } from "@/components/patient-dashboard/widgets/status"

/** "↓ 4.7 % (-16.8%)": the arrow follows the value, the colour whether
    that is better. */
function ChangeLine({ m, since = true }: { m: HealthMetric; since?: boolean }) {
  if (m.change === undefined || !m.previous) return <span className="text-xs text-muted-foreground">No earlier reading</span>
  const tone = m.trend === "improving" ? TONE.green.text : m.trend === "worsening" ? TONE.red.text : "text-muted-foreground"
  const unit = unitText(m.unit)
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
      <span className={cn("inline-flex items-center gap-0.5 text-[13px] font-semibold", tone)}>
        {m.change !== 0 && <KitIcon icon={m.change < 0 ? ArrowDown02Icon : ArrowUp02Icon} size={14} />}
        {fmt(Math.abs(m.change), m.decimals)}
        {unit && unit !== "%" ? ` ${unit}` : unit}
        {m.percentageChange !== undefined && ` (${m.percentageChange > 0 ? "+" : ""}${m.percentageChange.toFixed(1)}%)`}
      </span>
      {since && <span className="text-muted-foreground">since {usDay(m.previous.date)}</span>}
    </span>
  )
}

/* The drill-down. Any card, row or priority opens the marker here, on the
   kit's right-hand panel (full screen on a phone), with the dashboard kept
   behind it. Overview: summary, trend against target, and what the value
   means. Related: the markers read with it. Recommendations: the next step,
   the plan in force and the priorities that rest on it. The footer walks
   the list the drawer was opened from and holds the actions this marker's
   state calls for. */

type Tab = "overview" | "related" | "actions"

const withUnit = (v: string | number | undefined, unit: string) => {
  if (v === undefined || v === "") return "None"
  const u = unitText(unit)
  return `${shown(v)}${u ? ` ${u}` : ""}`
}

/* ------------------------------------------------------------- summary -- */

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-semibold tabular-nums">{children}</div>
    </div>
  )
}

export function MetricSummary({ m }: { m: HealthMetric }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Cell label="Latest result">
        <span className={cn("text-xl leading-7 font-bold", m.status === "out" && TONE.red.text, m.status === "watch" && TONE.orange.text)}>
          {m.status === "untested" ? "None" : withUnit(m.value, m.unit)}
        </span>
      </Cell>
      <Cell label="Target">
        <span className="text-xl leading-7 font-bold">{m.target || "None"}</span>
      </Cell>
      <Cell label="Change">
        {m.change !== undefined ? (
          <span className="flex flex-col gap-0.5">
            <ChangeLine m={m} since={false} />
            <span className="text-xs font-normal text-muted-foreground">
              from {fmt(m.previous!.value, m.decimals)} on {usDay(m.previous!.date)}
            </span>
          </span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">No earlier reading</span>
        )}
      </Cell>
      <Cell label="Status">
        <StatusWord m={m} />
      </Cell>
    </div>
  )
}

/* --------------------------------------------------------------- trend -- */

const shortDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`

/** The marker over time in its band's colour: a filled line, a dashed
    target line with its label, and the first and latest values printed. */
function ToneTrend({ m, tone }: { m: HealthMetric; tone: ToneKey }) {
  const id = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const color = TONE[tone].hex
  const h = m.history
  const data = h.map((p) => ({ day: shortDate(p.date), value: p.value }))
  const target = m.targetHigh ?? m.targetLow
  const values = [...h.map((p) => p.value), ...(target !== undefined ? [target] : [])]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.15
  const last = data.length - 1
  const unit = unitText(m.unit)
  const config = { value: { label: unit ? `${m.label} (${unit})` : m.label, color } } satisfies ChartConfig
  return (
    <div role="img" aria-label={`${m.name} over time`}>
      <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
        <AreaChart data={data} margin={{ top: 24, right: 24, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={`v4-trend-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Grid />
          <XAxis dataKey="day" {...AXIS_PROPS} interval="preserveStartEnd" />
          <YAxis
            {...AXIS_PROPS}
            domain={[Math.max(0, lo - pad), hi + pad]}
            tickFormatter={(v: number) => fmt(v, hi - lo < 5 ? 1 : 0)}
            width={48}
          />
          {target !== undefined && (
            <ReferenceLine
              y={target}
              stroke={color}
              strokeDasharray="5 4"
              strokeOpacity={0.8}
              label={{
                value: `Target ${m.target}`,
                position: "insideBottomRight",
                fill: color,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <Area
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#v4-trend-${id})`}
            isAnimationActive={!reduced}
            dot={{ r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          >
            <LabelList
              dataKey="value"
              content={(p: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
                p.index === 0 || p.index === last ? (
                  <text
                    x={Number(p.x)}
                    y={Number(p.y) - 12}
                    textAnchor={p.index === 0 ? "start" : "end"}
                    className="fill-foreground text-[12px] font-semibold"
                  >
                    {fmt(Number(p.value), m.decimals)}
                    {unit === "%" ? "%" : ""}
                  </text>
                ) : null
              }
            />
          </Area>
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function MetricTrendChart({ m }: { m: HealthMetric }) {
  const h = m.history
  if (h.length === 0)
    return <p className="rounded-xl bg-surface-sunken px-3 py-6 text-center text-[13px] text-muted-foreground">Not resulted yet</p>
  if (h.length === 1)
    return (
      <p className="rounded-xl bg-surface-sunken px-3 py-6 text-center text-[13px] text-muted-foreground tabular-nums">
        One reading on {usDay(h[0].date)}
      </p>
    )
  const first = h[0]
  const last = h[h.length - 1]
  const sources = [...new Set(h.map((p) => p.source).filter(Boolean))]
  return (
    <div className="flex flex-col gap-2">
      <ToneTrend m={m} tone={STATUS[m.repeat ? "optimal" : m.status].tone} />
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums">
        <Fact label="First" value={`${withUnit(first.value, m.unit)} · ${usDay(first.date)}`} />
        <Fact label="Latest" value={`${withUnit(last.value, m.unit)} · ${usDay(last.date)}`} />
        <Fact label="Readings" value={String(h.length)} />
        {sources.length > 0 && <Fact label="Source" value={sources.join(", ")} />}
      </dl>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

/* ------------------------------------------------------------- insight -- */

function standing(m: HealthMetric) {
  const value = withUnit(m.value, m.unit)
  if (m.status === "untested") return `No result yet. ${m.test ? `${m.test.name} gives the first reading.` : ""}`
  if (m.status === "out") {
    const where = m.flag === "High" ? "above" : m.flag === "Low" ? "below" : "outside"
    return m.target && m.target !== "Clinical"
      ? `${value} is ${where} the target of ${m.target}.`
      : `${value} is flagged ${m.flag?.toLowerCase() ?? "out of target"} and is read clinically.`
  }
  if (m.status === "watch") return m.target ? `${value} is on watch against the target of ${m.target}.` : `${value} is on watch.`
  return m.target ? `${value} is within the target of ${m.target}.` : `${value} is within range.`
}

function changed(m: HealthMetric) {
  const parts: string[] = []
  if (m.change !== undefined && m.previous) {
    const unit = unitText(m.unit)
    const amount = `${fmt(Math.abs(m.change), m.decimals)}${unit && unit !== "%" ? ` ${unit}` : unit}`
    const verdict =
      m.trend === "improving" ? "an improvement" : m.trend === "worsening" ? "a step back" : "little change"
    parts.push(
      m.change === 0
        ? `No change from ${usDay(m.previous.date)}.`
        : `${m.change < 0 ? "Down" : "Up"} ${amount} from ${fmt(m.previous.value, m.decimals)} on ${usDay(m.previous.date)}${
            m.percentageChange !== undefined ? `, ${Math.abs(m.percentageChange).toFixed(1)}%` : ""
          }: ${verdict}.`
    )
  } else if (m.history.length === 1) {
    parts.push("First reading; the next result sets the trend.")
  }
  if (m.repeat) parts.push(`A repeat on ${usDay(m.repeat.date)} read ${withUnit(m.repeat.value, m.unit)}.`)
  return parts.join(" ")
}

export function MetricInsight({ m }: { m: HealthMetric }) {
  const t = TONE[STATUS[m.status].tone]
  const more = [
    { title: "Why it matters", body: m.why },
    { title: "What changed", body: changed(m) },
  ].filter((i) => i.body)
  return (
    <div className="flex flex-col gap-4">
      <section className={cn("flex gap-3 rounded-xl px-4 py-3.5", t.soft)}>
        <KitIcon icon={BulbIcon} size={20} className={cn("mt-0.5", t.text)} />
        <div className="flex flex-col gap-1">
          <h3 className={cn("text-sm font-semibold", t.text)}>What this means</h3>
          <p className="text-[13px] leading-5 text-foreground/80">
            {standing(m)} {m.explanation}
          </p>
        </div>
      </section>
      {more.map((i) => (
        <section key={i.title} className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">{i.title}</h3>
          <p className="text-[13px] leading-5 text-muted-foreground">{i.body}</p>
        </section>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- related -- */

export function RelatedBiomarkers({
  list,
  onSelect,
}: {
  list: HealthMetric[]
  onSelect: (m: HealthMetric) => void
}) {
  if (list.length === 0) return <p className="text-[13px] text-muted-foreground">No related markers in the tracker</p>
  return (
    <ul className="flex flex-col">
      {list.map((r) => (
        <li key={r.id} className={cn("border-b last:border-0", DIVIDER)}>
          <button
            type="button"
            onClick={() => onSelect(r)}
            className={cn("flex w-full items-center gap-3 rounded-sm py-2.5 text-left hover:bg-surface-row-hover", FOCUS)}
          >
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE[STATUS[r.status].tone].solid)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{r.name}</span>
              <span className="truncate text-xs text-muted-foreground tabular-nums">
                {r.status === "untested" ? "Not resulted" : withUnit(r.repeat?.value ?? r.value, r.unit)}
                {r.target && ` · target ${r.target}`}
              </span>
            </span>
            {r.history.length > 1 && (
              <Sparkline
                values={r.history.map((p) => p.value)}
                low={r.targetLow}
                high={r.targetHigh}
                latest={r.status === "out" ? "out" : r.trend === "improving" ? "better" : "neutral"}
                label={`${r.name} trend`}
              />
            )}
            <StatusWord m={r} />
            <KitIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------- actions -- */

const PLAN_TONE = { Active: "green", Completed: "blue", Verify: "orange", "High priority": "red" } as const

export function RecommendedActions({ m }: { m: HealthMetric }) {
  const steps = [m.action, m.nextStep !== m.action ? m.nextStep : undefined].filter((s): s is string => Boolean(s))
  return (
    <div className="flex flex-col gap-5">
      {steps.length > 0 && (
        <Block title="Next step">
          <ul className="flex flex-col gap-1.5">
            {steps.map((s) => (
              <li key={s} className="flex gap-2 text-[13px]">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
                {s}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {m.plan.length > 0 && (
        <Block title="Plan in force">
          <ul className="flex flex-col">
            {m.plan.map((i) => (
              <li key={i.name} className={cn("flex flex-col gap-0.5 border-b py-2.5 first:pt-0 last:border-0", DIVIDER)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{i.name}</span>
                  <Pill tone={PLAN_TONE[i.status]}>{i.status}</Pill>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {i.doseOrTarget} · {i.frequency} · {i.owner}
                </span>
                <span className="text-xs tabular-nums">
                  <span className="text-muted-foreground">Observed </span>
                  {i.observed}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {m.priorities.length > 0 && (
        <Block title="Visit priorities">
          <ul className="flex flex-col gap-1.5">
            {m.priorities.map((p) => (
              <li key={p.text} className="flex items-center justify-between gap-3 text-[13px]">
                <span>
                  {p.text}
                  <span className="block text-xs text-muted-foreground tabular-nums">{p.milestone}</span>
                </span>
                <Pill tone={p.met ? "green" : "blue"}>{p.met ? "Completed" : "In progress"}</Pill>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {(m.nextTest || m.test) && (
        <Block title="Next test">
          <p className="text-[13px] tabular-nums">
            {m.test?.name ?? m.nextTest}
            {m.frequency && <span className="text-muted-foreground"> · every {m.frequency}</span>}
            {m.test?.ordered && <span className="text-muted-foreground"> · ordered</span>}
          </p>
        </Block>
      )}
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/* -------------------------------------------------------------- drawer -- */

export type DrawerState = { id: string; list: string[]; from: React.RefObject<HTMLElement | null> }

export function MetricDetailDrawer({
  data,
  state,
  onState,
  onClose,
  onOrder,
  onPlan,
  onReport,
}: {
  data: Analytics
  state: DrawerState | null
  onState: (next: DrawerState) => void
  onClose: () => void
  onOrder: (test: string) => void
  onPlan: () => void
  /** The detailed report: the DEXA documents or the lab results. */
  onReport: (m: HealthMetric) => void
}) {
  const [tab, setTab] = React.useState<Tab>("overview")
  const m = state ? data.metric(state.id) : undefined
  const [shownId, setShownId] = React.useState(state?.id)
  if (state?.id !== shownId) {
    setShownId(state?.id)
    setTab("overview")
  }
  const index = state && m ? state.list.indexOf(m.id) : -1
  const go = (to: number) => state && onState({ ...state, id: state.list[to] })
  const related = m ? m.relatedMarkers.map(data.metric).filter((r): r is HealthMetric => Boolean(r)) : []

  const actions = m && (
    <>
      <Button variant="outline" className={BUTTON_OUTLINE} onClick={() => onReport(m)}>
        {m.category === "Body Composition" ? "View DEXA report" : "View lab results"}
      </Button>
      {m.test && !m.test.ordered && m.test.orderable ? (
        <Button className={BUTTON_SOLID} onClick={() => onOrder(m.test!.name)}>
          Order {m.test.name}
        </Button>
      ) : m.plan.length > 0 || m.priorities.length > 0 ? (
        <Button className={BUTTON_SOLID} onClick={onPlan}>
          View personalized plan
          <KitIcon icon={ArrowRight01Icon} />
        </Button>
      ) : null}
    </>
  )

  return (
    <SidePanel
      open={Boolean(m)}
      onClose={onClose}
      returnFocus={state?.from}
      lead={m && <StatusIcon status={m.status} size="sm" />}
      title={m?.name ?? ""}
      meta={
        m && (
          <>
            <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
            <span>{m.category}</span>
            {m.valueDate && <span>· {usDay(m.valueDate)}</span>}
            {m.source && <span>· {m.source}</span>}
          </>
        )
      }
      index={index >= 0 ? index : undefined}
      total={state?.list.length}
      onPrevious={index > 0 ? () => go(index - 1) : undefined}
      onNext={index >= 0 && state && index < state.list.length - 1 ? () => go(index + 1) : undefined}
      actions={actions}
    >
      {m && (
        <div className="-mx-6 -mt-5 flex flex-col" style={ACTION_SCOPE}>
          <UnderlineTabs
            label="Marker detail"
            value={tab}
            onChange={setTab}
            className="[&_[role=tablist]]:px-6"
            items={[
              { value: "overview", label: "Overview" },
              { value: "related", label: "Related", count: related.length },
              { value: "actions", label: "Recommendations" },
            ]}
          />
          <div className="flex flex-col gap-5 px-6 py-5">
            {tab === "overview" && (
              <>
                <MetricSummary m={m} />
                <MetricTrendChart m={m} />
                <MetricInsight m={m} />
              </>
            )}
            {tab === "related" && (
              <RelatedBiomarkers
                list={related}
                onSelect={(r) =>
                  state && onState({ ...state, id: r.id, list: state.list.includes(r.id) ? state.list : [r.id] })
                }
              />
            )}
            {tab === "actions" && <RecommendedActions m={m} />}
          </div>
        </div>
      )}
    </SidePanel>
  )
}
