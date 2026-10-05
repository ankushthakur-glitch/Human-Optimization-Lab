"use client"

import * as React from "react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { AreaSpark, Badge, CHART, FOCUS_RING, TrendBadge } from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import { Ring } from "@/components/patient-dashboard/optimization-computed/parts/charts"
import { fmt, isRising, numericHistory, shown, signed, targetText } from "@/components/patient-dashboard/optimization/rules"
import { optDomId } from "@/components/patient-dashboard/optimization-computed/parts/ui"
import { GROUPS, type Group, type V2Model } from "@/components/patient-dashboard/optimization-computed/rules"

/* The top of version 2: the panel score computed from every marker's
   recorded status, with one cell per status group that filters the
   markers card, and one compact card per plan outcome with its trend. */

/* ------------------------------------------------------- panel score -- */

export const GROUP_STYLE: Record<Group, { dot: string; color: string; sub: string }> = {
  "Out of target": { dot: "bg-destructive", color: CHART.clinical, sub: "Action needed" },
  "On watch": { dot: "bg-warning", color: CHART.process, sub: "Keep monitoring" },
  "Not yet tested": { dot: "bg-info", color: CHART.info, sub: "Order at next visit" },
  "In range": { dot: "bg-primary-4", color: CHART.primaryLight, sub: "Acceptable" },
  Optimal: { dot: "bg-primary", color: CHART.primary, sub: "At or better than target" },
}

export function PanelScore({ v2, group, onGroup }: { v2: V2Model; group: Group; onGroup: (g: Group) => void }) {
  const total = v2.tracked || 1
  return (
    <section
      id={optDomId("panel")}
      aria-label="Panel score"
      className="grid overflow-hidden rounded-[7.2px] border bg-card @container/card xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
    >
      <div className="flex items-center gap-5 border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-4 xl:border-r xl:border-b-0">
        <Ring value={v2.score} max={100} label={`Panel score ${v2.score}%`} size={84}>
          <span className="text-xl font-semibold tabular-nums">{v2.score}%</span>
        </Ring>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold">Panel score</h2>
          <p className="text-[13px] text-muted-foreground tabular-nums">{v2.tracked} markers tracked</p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {v2.onTarget} of {v2.categories.length} categories on target
          </p>
          <p className="text-[13px] text-muted-foreground tabular-nums">Latest result {usDay(v2.latestResult)}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-4 py-4">
        <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {GROUPS.map((g) => (
            <span
              key={g}
              className="h-full rounded-full"
              style={{ flexGrow: v2.counts[g] / total, background: GROUP_STYLE[g].color }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {GROUPS.map((g) => {
            const active = g === group
            const t = GROUP_STYLE[g]
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => onGroup(g)}
                className={cn(
                  "flex min-w-0 flex-col gap-0.5 rounded-[5.76px] border px-3 py-2.5 text-left transition-colors",
                  active ? "border-primary/40 bg-primary-surface" : "bg-surface-sunken hover:bg-surface-row-hover",
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-1.5 truncate text-[13px] text-foreground/80">
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", t.dot)} />
                  {g}
                </span>
                <span className="text-2xl leading-7 font-semibold tabular-nums">{v2.counts[g]}</span>
                <span className="truncate text-xs text-muted-foreground">{t.sub}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- outcomes -- */

/** What each intervention has achieved: one card per outcome marker. */
export function Outcomes({ v2, onOpen }: { v2: V2Model; onOpen: (name: string, from: HTMLElement) => void }) {
  const list = v2.outcomes
  if (list.length === 0) return null
  return (
    <section id={optDomId("outcomes")} aria-labelledby="opt-outcomes-title" className="flex flex-col gap-1.5">
      <h2 id="opt-outcomes-title" className="text-[13px] text-muted-foreground tabular-nums">
        Plan outcomes · {list.length} {list.length === 1 ? "marker" : "markers"} the plan is working on
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
        {list.map((o) => {
          const b = o.marker
          const values = numericHistory(b).map((p) => p.n)
          const out = b.status === "High" || b.status === "Low"
          const color = out ? CHART.clinical : o.trend === "improving" ? CHART.success : b.status === "Watch" ? CHART.process : CHART.primary
          const target = targetText(b)
          return (
            <button
              key={b.name}
              type="button"
              onClick={(e) => onOpen(b.name, e.currentTarget)}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-[7.2px] border bg-card px-3.5 py-3 text-left hover:bg-surface-row-hover",
                FOCUS_RING
              )}
            >
              <span className="truncate text-[13px] font-medium" title={b.name}>
                {b.name} <span className="font-normal text-muted-foreground">({b.unit})</span>
              </span>
              <span className="flex min-w-0 items-end gap-2">
                <span className="text-2xl leading-7 font-semibold tabular-nums">
                  {o.latest === undefined ? <span className="text-sm font-normal text-muted-foreground">Not resulted</span> : shown(o.latest)}
                </span>
                {values.length > 1 && <AreaSpark values={values} color={color} label={`${b.name} trend`} className="ml-auto" />}
              </span>
              <span className="truncate text-xs text-muted-foreground tabular-nums">
                {o.baseline !== undefined && o.latest !== undefined
                  ? `${fmt(o.baseline)} → ${fmt(o.latest)} · ${signed(Number((o.latest - o.baseline).toFixed(2)), 0)}`
                  : target
                    ? `Target ${target}`
                    : "One result"}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {o.inside && o.trend !== "worsening" ? (
                  <Badge tone="success" icon={Tick02Icon}>
                    In target
                  </Badge>
                ) : (
                  <TrendBadge trend={o.trend} rising={isRising(b)} />
                )}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={o.intervention.name}>
                {o.intervention.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
