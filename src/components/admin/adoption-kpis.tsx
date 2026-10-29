"use client"

import * as React from "react"
import {
  IconStethoscope,
  IconUserCircle,
  IconUsersGroup,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  type Adoption,
  derivedAdoption,
} from "@/components/admin/practice-adoption"
import type { Practice } from "@/components/admin/practices-store"
import { Card } from "@/design-system/ui/card"

/* The adoption KPIs the admin console shows for a practice and for one of
   its providers. Each is a count out of a total, split into its states, and
   read against a benchmark: the Inlay average for a practice, the practice for
   a provider. */

/* -------------------------------------------------------------------------- */
/*  The KPI model every variant draws                                          */
/* -------------------------------------------------------------------------- */

export type Tone = "good" | "watch" | "alert" | "neutral"
export type PartTone = "fill" | "soft" | "empty" | "warn" | "alert"

export type Kpi = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: number
  total: number
  /** The word after the count: "onboarded", "enrolled". */
  unit: string
  rate: number
  /** Lower is better (patients pending or declined). */
  invert?: boolean
  parts: { label: string; value: number; tone: PartTone }[]
  benchmark: { label: string; rate: number }
  tone: Tone
}

export const share = (n: number, d: number) => (d ? n / d : 0)
export const pct = (r: number) => `${Math.round(r * 100)}%`

/* Against its benchmark: 15 points or more on the wrong side needs follow
   up, any amount is worth watching. */
export function toneFor(rate: number, benchmark: number, invert = false): Tone {
  const gap = invert ? benchmark - rate : rate - benchmark
  if (gap <= -0.15) return "alert"
  if (gap < 0) return "watch"
  return "good"
}

export function holAverages(practices: Practice[]) {
  const all = practices
    .filter((p) => p.status === "Active")
    .map(derivedAdoption)
  const avg = (f: (a: Adoption) => number) =>
    all.reduce((n, a) => n + f(a), 0) / (all.length || 1)
  return {
    users: avg((a) => share(a.usersOnboarded, a.users.length)),
    providers: avg((a) => share(a.providersOnboarded, a.providers.length)),
    enrolled: avg((a) => a.rate ?? 0),
  }
}

export function practiceKpis(a: Adoption, hol: ReturnType<typeof holAverages>): Kpi[] {
  const count = <T extends { status: string }>(list: T[], s: string) =>
    list.filter((x) => x.status === s).length
  const users = { value: a.usersOnboarded, total: a.users.length }
  const providers = { value: a.providersOnboarded, total: a.providers.length }
  return [
    {
      label: "Users onboarded",
      icon: IconUsersGroup,
      ...users,
      unit: "signed in",
      rate: share(users.value, users.total),
      parts: [
        { label: "Signed in", value: users.value, tone: "fill" },
        { label: "Invited", value: count(a.users, "Invited"), tone: "soft" },
        { label: "Inactive", value: count(a.users, "Inactive"), tone: "empty" },
      ],
      benchmark: { label: "Inlay average", rate: hol.users },
      tone: toneFor(share(users.value, users.total), hol.users),
    },
    {
      label: "Providers onboarded",
      icon: IconStethoscope,
      ...providers,
      unit: "signed in",
      rate: share(providers.value, providers.total),
      parts: [
        { label: "Signed in", value: providers.value, tone: "fill" },
        { label: "Invited", value: count(a.providers, "Invited"), tone: "soft" },
        { label: "Inactive", value: count(a.providers, "Inactive"), tone: "empty" },
      ],
      benchmark: { label: "Inlay average", rate: hol.providers },
      tone: toneFor(share(providers.value, providers.total), hol.providers),
    },
    {
      label: "Patients enrolled",
      icon: IconUserCircle,
      value: a.enrolled,
      total: a.open,
      unit: "enrolled",
      rate: a.rate ?? 0,
      parts: [
        { label: "Enrolled", value: a.enrolled, tone: "fill" },
        { label: "Pending", value: a.invited, tone: "soft" },
        { label: "Declined", value: a.declined, tone: "alert" },
      ],
      benchmark: { label: "Inlay average", rate: hol.enrolled },
      tone: toneFor(a.rate ?? 0, hol.enrolled),
    },
  ]
}

export const PART_BG: Record<PartTone, string> = {
  fill: "bg-primary",
  soft: "bg-primary/35",
  empty: "bg-muted-foreground/15",
  warn: "bg-warning",
  alert: "bg-destructive",
}

const RATE_TEXT: Record<Tone, string> = {
  good: "text-foreground",
  watch: "text-warning",
  alert: "text-destructive",
  neutral: "text-foreground",
}

/* Meter and breakdown in one tile: the count out of its total with the rate,
   a stacked bar split into the states that make up the total, and their
   counts in the legend. */
export function KpiTile({ kpi }: { kpi: Kpi }) {
  const parts = kpi.parts.filter((p) => p.value > 0)
  return (
    <Card className="gap-2 rounded-lg border px-4 py-3 shadow-none ring-0">
      <span className="text-xs font-medium text-muted-foreground">
        {kpi.label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-xl font-semibold tabular-nums">
          {kpi.value}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          of {kpi.total}
        </span>
        <span
          className={cn(
            "ml-auto text-sm font-medium tabular-nums",
            RATE_TEXT[kpi.tone]
          )}
        >
          {pct(kpi.rate)}
        </span>
      </div>
      <div
        aria-hidden
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {parts.map((p) => (
          <div
            key={p.label}
            className={cn(
              "h-full first:rounded-l-full last:rounded-r-full",
              PART_BG[p.tone]
            )}
            style={{ flexGrow: p.value }}
          />
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-1">
        {kpi.parts.map((p) => (
          <span
            key={p.label}
            className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground"
          >
            <span className={cn("size-2 rounded-full", PART_BG[p.tone])} />
            {p.label}
            <span className="font-medium text-foreground tabular-nums">
              {p.value}
            </span>
          </span>
        ))}
      </div>
    </Card>
  )
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        kpis.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"
      )}
    >
      {kpis.map((kpi) => (
        <KpiTile key={kpi.label} kpi={kpi} />
      ))}
    </div>
  )
}
