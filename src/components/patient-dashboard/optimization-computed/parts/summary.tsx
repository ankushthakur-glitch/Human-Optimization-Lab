"use client"

import * as React from "react"
import {
  ClipboardCheckIcon,
  Hospital01Icon,
  PackageIcon,
  PillIcon,
  StethoscopeIcon,
  File01Icon,
  Target02Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Alert, Badge, CHART, FlagBadge, FOCUS_RING, Icon, type KitIcon } from "@/components/dashboard-kit"
import { NOW, usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { Ring } from "@/components/patient-dashboard/optimization-computed/parts/charts"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  type BandKey,
  type SinceKind,
  fmt,
  headlineDelta,
  markerByName,
  numericHistory,
  signed,
} from "@/components/patient-dashboard/optimization/rules"
import type { SnapshotBand } from "@/components/patient-dashboard/optimization/types"
import { AiChip, optDomId } from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The top of the optimization view: the alerts (a plan awaiting approval,
   and every urgent item nobody has reviewed), what arrived since the last
   review, the HOLv.9 result summary and its headline numbers. */

/* ------------------------------------------------------------ alerts -- */

export function Alerts({
  model,
  core,
  onReviewPlan,
  onReviewReport,
}: {
  model: OptimizationModel
  core: DashboardModel
  onReviewPlan: () => void
  onReviewReport: (key: string) => void
}) {
  const urgent = core.urgent
  const plan = model.pendingDraft.length > 0 && model.draft
  if (!plan && urgent.length === 0) return null
  return (
    <section
      id={optDomId("alerts")}
      aria-label="Alerts"
      className={cn("grid items-stretch gap-3", (plan ? 1 : 0) + urgent.length > 1 && "xl:grid-cols-2")}
    >
      {plan && (
        <Alert
          tone="warning"
          icon={ClipboardCheckIcon}
          className="h-full"
          title={
            <span className="flex flex-wrap items-center gap-2">
              Plan awaiting approval <AiChip />
            </span>
          }
          action={
            <Button size="sm" onClick={onReviewPlan}>
              Review plan
            </Button>
          }
        >
          Drafted {usDay(plan.draftedAt)} · {model.draftLine}
        </Alert>
      )}
      {urgent.map((u) => {
        const report = u.target.kind === "report" ? core.reports.find((r) => `report:${r.report}:${r.date}` === u.key) : undefined
        return (
          <Alert
            key={u.key}
            className="h-full"
            title={
              <span className="flex flex-wrap items-center gap-2">
                {report?.report ?? u.text}
                {report && <FlagBadge flag={report.flag === "Critical" ? "Critical" : "Abnormal"} className="bg-transparent px-0" />}
                {report?.isOutsideSource && <Badge tone="outline">Outside</Badge>}
              </span>
            }
            action={
              <Button size="sm" onClick={() => onReviewReport(u.key)}>
                Review
              </Button>
            }
          >
            {report ? `${report.finding} · ${usDay(report.date)}` : `${u.source} · ${usDay(u.date)}`}
          </Alert>
        )
      })}
    </section>
  )
}

/* -------------------------------------------------- since last review -- */

const SINCE: Record<SinceKind, { label: string; tint: string; icon: KitIcon }> = {
  results: { label: "New results", tint: "bg-category-1-surface text-category-1", icon: TestTube01Icon },
  medications: { label: "Medication changes", tint: "bg-category-2-surface text-category-2", icon: PillIcon },
  outside: { label: "Outside visits", tint: "bg-primary-surface text-primary", icon: Hospital01Icon },
  diagnoses: { label: "New diagnoses", tint: "bg-category-4-surface text-category-4", icon: StethoscopeIcon },
  reports: { label: "New reports", tint: "bg-secondary text-muted-foreground", icon: File01Icon },
  targets: { label: "Targets met", tint: "bg-category-5-surface text-category-5", icon: Target02Icon },
  orders: { label: "Open orders", tint: "bg-secondary text-muted-foreground", icon: PackageIcon },
}

export function SinceStrip({ model, onJump }: { model: OptimizationModel; onJump: (kind: SinceKind) => void }) {
  const [, m, d] = model.cutoff.slice(0, 10).split("-")
  return (
    <section
      id={optDomId("since")}
      tabIndex={-1}
      aria-labelledby="opt-since-title"
      className="grid scroll-mt-3 grid-cols-2 gap-px overflow-hidden rounded-[7.2px] border bg-[color-mix(in_oklab,var(--border)_65%,transparent)] outline-none md:grid-cols-3 xl:flex"
    >
      <div className="col-span-2 flex flex-col justify-center gap-0.5 bg-card px-4 py-3 md:col-span-3 xl:w-auto xl:shrink-0">
        <h2 id="opt-since-title" className="text-xs text-muted-foreground">
          Since last review
        </h2>
        <p className="text-sm font-medium tabular-nums">
          {m}/{d} - {usDay(NOW)}
        </p>
      </div>
      {model.since.length === 0 ? (
        <p className="col-span-2 flex flex-1 items-center bg-card px-4 py-3 text-[13px] text-muted-foreground md:col-span-3">
          No changes since last review
        </p>
      ) : (
        model.since.map((c) => {
          const t = SINCE[c.kind]
          return (
            <button
              key={c.kind}
              type="button"
              onClick={() => onJump(c.kind)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 bg-card px-4 py-3 text-left hover:bg-surface-row-hover",
                FOCUS_RING,
                "focus-visible:ring-inset"
              )}
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-[5.76px]", t.tint)}>
                <Icon icon={t.icon} className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs text-muted-foreground">{t.label}</span>
                <span className="text-xl leading-6 font-semibold tabular-nums">{c.count}</span>
              </span>
            </button>
          )
        })
      )}
    </section>
  )
}

/* ---------------------------------------------------- result summary -- */

const BANDS: { key: SnapshotBand; dot: string; bar: string; sub: string }[] = [
  { key: "Out of target", dot: "bg-destructive", bar: "bg-destructive", sub: "Action needed" },
  { key: "On watch", dot: "bg-warning", bar: "bg-warning", sub: "Keep monitoring" },
  { key: "Not yet tested", dot: "bg-info", bar: "bg-info", sub: "Order at next visit" },
  { key: "In range", dot: "bg-primary", bar: "bg-primary", sub: "Acceptable" },
  { key: "Optimal", dot: "bg-success", bar: "bg-success", sub: "At or better than target" },
]

export function ResultSummary({
  model,
  band,
  onBand,
  onLabs,
}: {
  model: OptimizationModel
  band: BandKey
  onBand: (band: BandKey) => void
  onLabs: () => void
}) {
  const s = model.data.snapshot
  const total = BANDS.reduce((n, b) => n + s.counts[b.key], 0) || 1
  return (
    <section
      id={optDomId("summary")}
      aria-label="Result summary"
      className="grid overflow-hidden rounded-[7.2px] border bg-card @container/card xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
    >
      <div className="flex items-center gap-5 border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-4 xl:border-r xl:border-b-0">
        <Ring value={s.score} max={100} label={`Optimization score ${s.score}%`} size={84}>
          <span className="text-xl font-semibold tabular-nums">{s.score}%</span>
        </Ring>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold">Optimization score</h2>
          <p className="text-[13px] text-muted-foreground tabular-nums">{s.markersTracked} markers tracked</p>
          <p className="text-[13px] text-muted-foreground tabular-nums">Updated {usDay(s.updatedAt)}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-4 py-4">
        <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {BANDS.map((b) => (
            <span key={b.key} className={cn("h-full rounded-full", b.bar)} style={{ flexGrow: s.counts[b.key] / total }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {BANDS.map((b) => {
            const isBand = b.key === "Out of target" || b.key === "On watch" || b.key === "Not yet tested"
            const active = isBand && b.key === band
            return (
              <button
                key={b.key}
                type="button"
                aria-pressed={isBand ? active : undefined}
                onClick={() => (isBand ? onBand(b.key as BandKey) : onLabs())}
                className={cn(
                  "flex min-w-0 flex-col gap-0.5 rounded-[5.76px] border px-3 py-2.5 text-left transition-colors",
                  active ? "border-primary/40 bg-primary-surface" : "bg-surface-sunken hover:bg-surface-row-hover",
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-1.5 truncate text-[13px] text-foreground/80">
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", b.dot)} />
                  {b.key}
                </span>
                <span className="text-2xl leading-7 font-semibold tabular-nums">{s.counts[b.key]}</span>
                <span className="truncate text-xs text-muted-foreground">{b.sub}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------- headline numbers -- */

const VERDICT_TONE = { primary: "primary", success: "success", warning: "warning" } as const

export function HeadlineNumbers({ model, onOpen }: { model: OptimizationModel; onOpen: (name: string, from: HTMLElement) => void }) {
  const list = model.data.snapshot.headline
  return (
    <section id={optDomId("headline")} aria-labelledby="opt-headline-title" className="flex flex-col gap-1.5">
      <h2 id="opt-headline-title" className="text-[13px] text-muted-foreground">
        Headline numbers · baseline → latest
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {list.map((h) => {
          const { change, good } = headlineDelta(h)
          const marker = markerByName(model.data.biomarkers, h.seriesMarkerName)
          const values = marker ? numericHistory(marker).map((p) => p.n) : [h.baseline, h.latest]
          const tone = h.verdictTone === "warning" ? CHART.process : CHART.primary
          return (
            <button
              key={h.label}
              type="button"
              onClick={(e) => marker && onOpen(marker.name, e.currentTarget)}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-[7.2px] border bg-card px-3.5 py-3 text-left hover:bg-surface-row-hover",
                FOCUS_RING
              )}
            >
              <span className="truncate text-[13px] font-medium">
                {h.label} <span className="font-normal text-muted-foreground">({h.unit})</span>
              </span>
              <span className="flex min-w-0 items-end gap-2">
                <span className="text-2xl leading-7 font-semibold tabular-nums">{fmt(h.latest, h.decimals)}</span>
                <FlexSpark values={values} color={tone} label={`${h.label} trend`} />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {fmt(h.baseline)} → {fmt(h.latest)} ·{" "}
                <span className={cn("font-semibold", good ? "text-success" : "text-warning")}>{signed(change, Number.isInteger(change) ? 0 : 1)}</span>
              </span>
              <Badge tone={VERDICT_TONE[h.verdictTone]} className="mt-0.5 self-start">
                {h.verdict}
              </Badge>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** The card's trend: an axis-free area that fills the space beside the
    value, with the kit sparkline's gradient (0.35 to 0.02) and 1.5px line. */
function FlexSpark({ values, color, label }: { values: number[]; color: string; label: string }) {
  const id = React.useId().replace(/:/g, "")
  if (values.length < 2) return <span className="flex-1" />
  const [w, h, pad] = [100, 32, 3]
  const lo = Math.min(...values)
  const span = Math.max(...values) - lo || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, pad + (1 - (v - lo) / span) * (h - pad * 2)])
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 min-w-0 flex-1">
      <defs>
        <linearGradient id={`hs-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#hs-${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
