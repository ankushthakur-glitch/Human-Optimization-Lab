"use client"

import * as React from "react"
import {
  Activity01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  ChartLineData01Icon,
  InformationCircleIcon,
  Message01Icon,
  Note01Icon,
  RefreshIcon,
  Share08Icon,
  Shield01Icon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Badge, type Tone as BadgeTone, DIVIDER, FOCUS, type IconDef, KitIcon } from "@/components/dashboard-kit-v2"
import type { Patient } from "@/components/practice/practice-data"
import { ImagingPaper, LabReportPaper, ReportPaper } from "@/components/provider/chart-papers"
import type { Insight, PaperSpec, RecKind, Report, Tone } from "@/components/provider/home-v2/insight"

/* The AI look shared by the Daily Brief and the item summaries: a teal to
   blue wash with a gradient sparkles mark, white inner cards. Then the
   item summary itself, laid out like an episode summary (at a glance,
   current situation, recommendations), and the full report the item came
   from. */

export const AI_SURFACE =
  "border border-primary/30 bg-[linear-gradient(105deg,color-mix(in_oklab,var(--primary)_14%,white),color-mix(in_oklab,var(--primary)_5%,white))] dark:bg-[linear-gradient(105deg,color-mix(in_oklab,var(--primary)_24%,var(--card)),var(--card))]"

export const AI_TITLE = "font-semibold text-primary"

export function AIMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_50%,var(--info)))] text-white shadow-[0_2px_8px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
    >
      <KitIcon icon={SparklesIcon} size={Math.round(size * 0.58)} />
    </span>
  )
}

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
  info: "text-info",
  neutral: "text-foreground",
}
const TONE_TAG: Record<Tone, BadgeTone> = {
  good: "success",
  warn: "warning",
  bad: "error",
  info: "info",
  neutral: "light",
}
const TONE_ICON: Record<Tone, IconDef> = {
  good: CheckmarkCircle02Icon,
  warn: AlertCircleIcon,
  bad: AlertCircleIcon,
  info: InformationCircleIcon,
  neutral: Activity01Icon,
}

const REC: Record<RecKind, { icon: IconDef; tint: string }> = {
  next: { icon: Task01Icon, tint: "text-primary" },
  recheck: { icon: RefreshIcon, tint: "text-success" },
  followup: { icon: Activity01Icon, tint: "text-info" },
  message: { icon: Message01Icon, tint: "text-warning" },
  refer: { icon: Share08Icon, tint: "text-category-3" },
  schedule: { icon: Calendar03Icon, tint: "text-category-2" },
}

function Panel({ icon, title, children, className }: { icon: IconDef; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[7.2px] border border-border bg-card", className)}>
      <h4 className={cn("flex items-center gap-2 border-b px-3.5 py-2.5 text-sm font-medium", DIVIDER)}>
        <KitIcon icon={icon} className="text-muted-foreground" />
        {title}
      </h4>
      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3">{children}</div>
    </section>
  )
}

const TONE_DOT: Record<Tone, string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}

/** `showRisks` adds the Key risks panel; the patient chart shows it, the
    provider home's item panel does not. */
export function AISummary({ insight, showRisks = false }: { insight: Insight; showRisks?: boolean }) {
  const [open, setOpen] = React.useState(true)
  const bodyId = React.useId()
  return (
    <section aria-label={insight.title} className={cn("overflow-hidden rounded-[10px]", AI_SURFACE)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className={cn("flex h-12 w-full items-center gap-2.5 px-3.5 text-left", FOCUS, "focus-visible:ring-inset")}
      >
        <AIMark />
        <span className={cn("text-[15px]", AI_TITLE)}>{insight.title}</span>
        <KitIcon
          icon={ArrowDown01Icon}
          className={cn("ml-auto text-primary transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div id={bodyId} className="flex flex-col gap-3 px-3 pb-3">
          {(insight.glance.length > 0 || insight.progress) && (
          <Panel icon={ChartLineData01Icon} title="At a glance">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
              {insight.glance.map((g) => (
                <div key={g.label} className="flex min-w-0 flex-col rounded-[5.76px] border border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground">{g.label}</span>
                  <span className={cn("truncate text-base leading-6 font-semibold tabular-nums", TONE_TEXT[g.tone ?? "neutral"])} title={g.value}>
                    {g.value}
                  </span>
                  {g.note && <span className="truncate text-xs text-muted-foreground tabular-nums">{g.note}</span>}
                </div>
              ))}
            </div>
            {insight.progress?.map((p) => (
              <div key={p.label} className="mt-3 flex flex-col gap-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{p.label}</span>
                  <span>{p.pct}%</span>
                </div>
              </div>
            ))}
          </Panel>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Panel icon={Note01Icon} title="Current situation">
              <ul className={cn("flex flex-col divide-y", DIVIDER.replace("border-", "divide-"))}>
                {insight.situation.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 py-2 text-[13px] leading-5 first:pt-0 last:pb-0">
                    <KitIcon icon={TONE_ICON[s.tone]} size={14} className={cn("mt-0.5", TONE_TEXT[s.tone])} />
                    <span className="min-w-0">
                      {s.text}
                      {s.tag && (
                        <Badge tone={TONE_TAG[s.tone]} className="ml-1.5">
                          {s.tag}
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel icon={Task01Icon} title="Recommendations">
              {insight.recommendations.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No suggestions for this item</p>
              ) : (
                <ul className={cn("flex flex-col divide-y", DIVIDER.replace("border-", "divide-"))}>
                  {insight.recommendations.map((r) => (
                    <li key={r.label} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                      <KitIcon icon={REC[r.kind].icon} size={14} className={cn("mt-0.5", REC[r.kind].tint)} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-xs text-muted-foreground">{r.label}</span>
                        <span className="text-[13px] leading-5">{r.value}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {showRisks && insight.risks.length > 0 && (
            <section className="flex min-w-0 flex-col rounded-[7.2px] border border-warning-3 bg-warning-1">
              <h4 className="flex items-center gap-2 border-b border-warning-3 px-3.5 py-2.5 text-sm font-medium">
                <KitIcon icon={Shield01Icon} className="text-warning" />
                Key risks
              </h4>
              <ul className="flex flex-col gap-1.5 px-3.5 py-3">
                {insight.risks.map((r) => (
                  <li key={r.strong} className="flex items-start gap-2 text-[13px] leading-5">
                    <span aria-hidden className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[r.tone])} />
                    <span className="min-w-0">
                      <span className="font-medium">{r.strong}</span>
                      <span className="text-muted-foreground">, {r.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="px-1 text-xs text-muted-foreground">AI generated from the record. Verify before acting.</p>
        </div>
      )}
    </section>
  )
}

/** The item's full report, drawn by the patient chart's own papers on
    the chart's grey canvas. */
/** The record behind an item that is not a document (a medication entry,
    an order, a gap, a review): its log as a table, then its notes, in
    plain panels rather than a printed report. */
export function ItemRecord({ report, title }: { report: Report; title: string }) {
  return (
    <div className="flex flex-col gap-4">
      {report.table && report.table.rows.length > 0 && (
        <section className="overflow-hidden rounded-[7.2px] border border-border bg-card">
          <h4 className={cn("border-b px-3.5 py-2.5 text-sm font-medium", DIVIDER)}>{title}</h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-head">
                {report.table.columns.map((c) => (
                  <th key={c} scope="col" className="px-3.5 py-2 text-left text-xs font-medium text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.table.rows.map((r, i) => (
                <tr key={i} className={cn("border-t", DIVIDER)}>
                  {r.cells.map((c, j) => (
                    <td key={j} className={cn("px-3.5 py-2 tabular-nums", j === 0 ? "text-foreground" : "text-muted-foreground", r.flag && "text-destructive")}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {report.sections.length > 0 && (
        <section className="overflow-hidden rounded-[7.2px] border border-border bg-card">
          <h4 className={cn("border-b px-3.5 py-2.5 text-sm font-medium", DIVIDER)}>Details</h4>
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] text-[13px]">
            {report.sections.map((x, i) => (
              <React.Fragment key={x.heading}>
                <dt className={cn("py-2.5 pr-6 pl-3.5 text-muted-foreground", i > 0 && "border-t", DIVIDER)}>{x.heading}</dt>
                <dd className={cn("py-2.5 pr-3.5 leading-5", i > 0 && "border-t", DIVIDER)}>{x.body}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

/** The item's full report, drawn by the patient chart's own papers. */
export function FullReport({ paper, patient }: { paper: PaperSpec; patient: Patient }) {
  return (
    <section aria-label="Full report">
      {paper.kind === "lab" ? (
        <LabReportPaper patient={patient} reports={[paper.report]} />
      ) : paper.kind === "imaging" ? (
        <ImagingPaper patient={patient} d={paper.doc} />
      ) : (
        <ReportPaper patient={patient} {...paper} />
      )}
    </section>
  )
}
