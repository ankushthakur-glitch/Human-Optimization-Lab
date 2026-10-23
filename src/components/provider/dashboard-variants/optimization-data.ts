"use client"

import * as React from "react"

import { type Patient, fullName } from "@/components/practice/practice-data"
import { carePlans } from "@/components/provider/chart-care-plan"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import { ageAt } from "@/components/provider/home-v2/clock"
import { patients } from "@/components/practice/practice-data"

/* Inlay's optimization picture of the provider's panel, for the dashboard
   variations: each patient's AI biological age, the optimization plans the
   AI matched from the record (Dr. Blanchard's catalog), where each member's
   plan stands in the physician review loop, progress toward plan goals,
   the three bothersome symptoms re-rated weekly, trends worth watching, and
   baseline tests waiting on the physician's insurance or cash call.

   Until the models exist the numbers are sample values fixed per patient ID,
   the way the Patients list's Bio age column already does it; the two real
   care plans in the chart's store (P10240, P10318) override the sample. */

export const PLAN_CATALOG = [
  "Diabetes and A1C",
  "Heart health",
  "Weight loss",
  "Bone health",
  "Muscle building",
  "Better sleep",
  "Metabolic health",
  "Healthy aging",
] as const
export type PlanName = (typeof PLAN_CATALOG)[number]

/** The review loop: AI drafts, physician reviews, patient accepts, plan runs. */
export const PLAN_STAGES = ["Pending review", "Changes requested", "Sent to patient", "Active"] as const
export type PlanStage = (typeof PLAN_STAGES)[number]

export type TrendDir = "worse" | "better" | "flat"

export type Marker = {
  name: string
  unit: string
  /** Oldest first, the last is the latest. */
  values: number[]
  /** In range now but moving the wrong way: watch, don't act. */
  watchful: boolean
  inRange: boolean
  dir: TrendDir
}

export type Symptom = { name: string; /** 0 to 10, oldest week first. */ weeks: number[] }

export type BaselineTest = { name: string; plan: PlanName; route: "Insurance" | "Cash" | "Physician to decide" }

export type Optimization = {
  patient: Patient
  name: string
  age: number
  bioAge: number
  /** Biological minus real age: below zero is younger. */
  gap: number
  /** Six monthly readings of the AI biological age, oldest first. */
  bioTrend: number[]
  member: boolean
  /** AI matched plans: a member's chosen plans, a free patient's suggestions. */
  plans: PlanName[]
  /** Members only. */
  stage?: PlanStage
  /** Days the plan has waited in its current stage. */
  stageDays?: number
  /** Share of the way to the plan goals, 0 to 1 (active plans). */
  progress?: number
  /** Last 7 days of the daily optimization score, 0 to 100 (active plans). */
  dailyScore?: number[]
  /** Program week (active plans). */
  week?: number
  symptoms: Symptom[]
  markers: Marker[]
  tests: BaselineTest[]
  /** A free patient whose record shows areas worth working on. */
  upgradeFit: boolean
}

/* -------------------------------------------------------- the sample -- */

function seedOf(id: string, salt = 0) {
  return [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0) + salt) % 997, 7 + salt)
}
const pick = <T,>(list: readonly T[], seed: number) => list[seed % list.length]!

/** The same formula as the Patients list's Bio age column. */
export function bioAgeOf(p: Patient) {
  return ageAt(p.dob) + (seedOf(p.id) % 17) - 8
}

const SYMPTOMS = ["Fatigue", "Poor sleep", "Back pain", "Anxiety", "Weight gain", "Irritability", "Joint pain", "Low mood"]

const MARKERS: { name: string; unit: string; base: number; step: number; low: number; high: number; plan: PlanName }[] = [
  { name: "HbA1c", unit: "%", base: 5.4, step: 0.12, low: 4, high: 5.6, plan: "Diabetes and A1C" },
  { name: "Fasting glucose", unit: "mg/dL", base: 92, step: 3, low: 70, high: 99, plan: "Diabetes and A1C" },
  { name: "LDL-C", unit: "mg/dL", base: 96, step: 5, low: 0, high: 99, plan: "Heart health" },
  { name: "Systolic BP", unit: "mmHg", base: 122, step: 3, low: 90, high: 129, plan: "Heart health" },
  { name: "Weight", unit: "lb", base: 182, step: 2.5, low: 0, high: 190, plan: "Weight loss" },
  { name: "Vitamin D", unit: "ng/mL", base: 38, step: -3, low: 30, high: 100, plan: "Bone health" },
  { name: "Lean mass", unit: "lb", base: 132, step: -1.2, low: 128, high: 999, plan: "Muscle building" },
  { name: "Triglycerides", unit: "mg/dL", base: 128, step: 7, low: 0, high: 149, plan: "Metabolic health" },
]

const TESTS: Record<PlanName, string> = {
  "Diabetes and A1C": "Fasting insulin",
  "Heart health": "ApoB",
  "Weight loss": "RMR test",
  "Bone health": "DEXA scan",
  "Muscle building": "DEXA scan",
  "Better sleep": "Sleep study",
  "Metabolic health": "Lipid panel",
  "Healthy aging": "hs-CRP",
}

const REAL_STAGE: Record<string, PlanStage> = {
  "Pending review": "Pending review",
  "Changes requested": "Changes requested",
  "Sent to patient": "Sent to patient",
  Accepted: "Active",
}

export function optimizationOf(p: Patient, realPlans?: { status: string; names: string[] }): Optimization {
  const s = seedOf(p.id)
  const age = ageAt(p.dob)
  const bioAge = bioAgeOf(p)
  const gap = bioAge - age
  /* A patient with a care plan in the store is a member; the sample panel
     makes about half its active patients members, most with running plans. */
  const member =
    !!realPlans || p.membership === "optimization" || (p.status === "Active" && seedOf(p.id, 5) % 10 < 5)
  const nPlans = 1 + (s % 3)
  const plans = Array.from(new Set(Array.from({ length: nPlans }, (_, i) => pick(PLAN_CATALOG, seedOf(p.id, i + 3)))))
  const real = realPlans?.names.filter((n): n is PlanName => (PLAN_CATALOG as readonly string[]).includes(n))
  const chosen = real && real.length ? real : plans

  const stage: PlanStage | undefined = member
    ? realPlans
      ? (REAL_STAGE[realPlans.status] ?? "Active")
      : p.status !== "Active"
        ? "Sent to patient"
        : pick(["Active", "Active", "Active", "Active", "Sent to patient", "Pending review", "Active"] as const, seedOf(p.id, 11))
    : undefined
  const active = stage === "Active"

  /* Biological age drifts toward the real age for active members, away for the rest. */
  const bioTrend = Array.from({ length: 6 }, (_, i) => bioAge + (active ? (5 - i) * 0.4 : -(5 - i) * 0.25))

  const markers: Marker[] = MARKERS.filter((m) => chosen.includes(m.plan) || seedOf(p.id, m.name.length) % 4 === 0)
    .slice(0, 3)
    .map((m, k) => {
      const dir: TrendDir = active && k % 2 === 0 ? "better" : seedOf(p.id, k + 20) % 3 === 0 ? "flat" : "worse"
      const sign = dir === "better" ? -1 : dir === "flat" ? 0 : 1
      const values = Array.from({ length: 5 }, (_, i) => +(m.base + sign * m.step * i + ((seedOf(p.id, i) % 5) - 2) * m.step * 0.15).toFixed(1))
      const last = values[values.length - 1]!
      const inRange = last >= m.low && last <= m.high
      return { name: m.name, unit: m.unit, values, inRange, dir, watchful: inRange && dir === "worse" }
    })

  const symptoms: Symptom[] = Array.from({ length: 3 }, (_, k) => {
    const start = 4 + (seedOf(p.id, k + 40) % 6)
    const fall = active ? 0.5 + (k % 2) * 0.3 : -0.1
    return {
      name: pick(SYMPTOMS, seedOf(p.id, k * 7 + 1) + k),
      weeks: Array.from({ length: 6 }, (_, i) => Math.max(0, Math.min(10, Math.round(start - fall * i)))),
    }
  })

  const tests: BaselineTest[] =
    member && (stage === "Pending review" || stage === "Changes requested")
      ? Array.from(new Set(chosen.map((c) => TESTS[c]))).map((name, i) => ({
          name,
          plan: chosen[i] ?? chosen[0]!,
          route: pick(["Physician to decide", "Insurance", "Cash"] as const, seedOf(p.id, i + 60)),
        }))
      : []

  return {
    patient: p,
    name: fullName(p),
    age,
    bioAge,
    gap,
    bioTrend,
    member,
    plans: chosen,
    stage,
    stageDays: member ? 1 + (seedOf(p.id, 13) % 12) : undefined,
    progress: active ? Math.min(0.95, 0.2 + (seedOf(p.id, 17) % 70) / 100) : undefined,
    dailyScore: active ? Array.from({ length: 7 }, (_, i) => 62 + ((seedOf(p.id, i + 30) % 30) + i)) : undefined,
    week: active ? 2 + (seedOf(p.id, 19) % 10) : undefined,
    symptoms,
    markers,
    tests,
    upgradeFit: !member && p.status === "Active" && (gap > 0 || markers.some((m) => !m.inRange || m.watchful)),
  }
}

/** The signed-in provider's panel, with every patient's optimization picture. */
export function useOptimization() {
  const roster = patients.use()
  const plans = carePlans.use()
  return React.useMemo(() => {
    const real = new Map(
      plans.items.map((c) => [c.id, { status: c.status, names: c.versions[c.versions.length - 1]?.plans.map((x) => x.name) ?? [] }])
    )
    /* The practice's whole panel, as the provider's Patients list shows it
       (the 16 Oct call asked for a practice level view); the provider's own
       patients sort first. */
    const mine = roster.items
      .filter((p) => p.status !== "Inactive")
      .sort((a, b) => Number(b.providerId === PROVIDER_ID) - Number(a.providerId === PROVIDER_ID))
    const all = mine.map((p) => optimizationOf(p, real.get(p.id)))
    const members = all.filter((o) => o.member)
    const active = members.filter((o) => o.stage === "Active")
    const reviewing = members.filter((o) => o.stage === "Pending review" || o.stage === "Changes requested")
    const engaged = all.filter((o) => o.patient.status === "Active")

    const byPlan = PLAN_CATALOG.map((name) => ({
      name,
      members: members.filter((o) => o.plans.includes(name)).length,
      suggested: all.filter((o) => !o.member && o.plans.includes(name)).length,
    })).filter((x) => x.members + x.suggested > 0)

    const byStage = PLAN_STAGES.map((stage) => ({ stage, count: members.filter((o) => o.stage === stage).length }))

    const younger = engaged.filter((o) => o.gap <= -3).length
    const near = engaged.filter((o) => o.gap > -3 && o.gap <= 0).length
    const older = engaged.filter((o) => o.gap > 0).length
    const avgGap = engaged.length ? +(engaged.reduce((s, o) => s + o.gap, 0) / engaged.length).toFixed(1) : 0
    const avgGapMembers = active.length ? +(active.reduce((s, o) => s + o.gap, 0) / active.length).toFixed(1) : 0

    const watchful = all.flatMap((o) => o.markers.filter((m) => m.watchful).map((m) => ({ o, m })))
    const offTrack = all.flatMap((o) => o.markers.filter((m) => !m.inRange && m.dir === "worse").map((m) => ({ o, m })))
    const improving = all.flatMap((o) => o.markers.filter((m) => m.dir === "better").map((m) => ({ o, m })))
    const tests = reviewing.flatMap((o) => o.tests.map((t) => ({ o, t })))
    const upgrade = all.filter((o) => o.upgradeFit)
    const avgProgress = active.length ? active.reduce((s, o) => s + (o.progress ?? 0), 0) / active.length : 0
    const symptomRelief = active.length
      ? +(
          active.reduce((s, o) => s + o.symptoms.reduce((a, x) => a + (x.weeks[0]! - x.weeks[x.weeks.length - 1]!), 0) / 3, 0) / active.length
        ).toFixed(1)
      : 0

    return {
      ready: roster.ready,
      all,
      members,
      active,
      reviewing,
      byPlan,
      byStage,
      bio: { younger, near, older, avgGap, avgGapMembers },
      watchful,
      offTrack,
      improving,
      tests,
      upgrade,
      avgProgress,
      symptomRelief,
    }
  }, [roster.items, roster.ready, plans.items])
}
