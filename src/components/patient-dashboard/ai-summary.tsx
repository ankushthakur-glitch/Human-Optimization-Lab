"use client"

import * as React from "react"

import { usDay } from "@/components/provider/mock-clock"
import { AISummary } from "@/components/provider/home-v2/ai-summary"
import type { Insight } from "@/components/provider/home-v2/insight"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import {
  doseText,
  isOverdue,
  isRising,
  latestOf,
  shortSource,
  statusOf,
} from "@/components/patient-dashboard/rules"

/* The chart Dashboard's AI summary, in the provider home's AI look (see
   home-v2/ai-summary.tsx): at a glance, current situation,
   recommendations and key risks. Every line is read from the same model
   the dashboard's cards read; nothing here orders, prescribes or messages. */

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0

export function chartInsight(model: DashboardModel): Insight {
  const { data, cases, orders, gaps, encounters, urgent } = model
  const out = model.outOfRange
  const trend = model.trending
  const overdueOrders = orders.filter((o) => isOverdue(o.clock))
  const overdueGaps = gaps.filter((g) => isOverdue(g.clock))
  const overdue = overdueOrders.length + overdueGaps.length
  const allergyCases = cases.filter((c) => c.allergy)
  const doseCases = cases.filter((c) => !c.allergy)

  const labValue = (code: string) => {
    const lab = data.labs.find((l) => l.code === code)
    const r = lab && latestOf(lab)
    return lab && r ? `${lab.name} ${r.value} ${lab.unit}` : ""
  }

  const glance: Insight["glance"] = [
    {
      label: "Out of range",
      value: String(out.length),
      note: `${plural(trend.length, "trending result")}`,
      tone: out.length ? "bad" : "good",
    },
    {
      label: "Medication differences",
      value: String(cases.length),
      note: `${plural(model.medicationCount, "medication")} on your list`,
      tone: allergyCases.length ? "bad" : cases.length ? "warn" : "good",
    },
    {
      label: "Open orders and gaps",
      value: String(orders.length + gaps.length),
      note: overdue ? `${overdue} overdue` : "None overdue",
      tone: overdue ? "warn" : "neutral",
    },
    {
      label: "Outside visits",
      value: String(encounters.length),
      note: model.review
        ? `Since ${usDay(model.review.at)}`
        : "Not yet reviewed",
      tone: encounters.some((e) => !e.reviewed) ? "info" : "neutral",
    },
  ]

  const labs = data.labs.length
  const closedGaps = data.gaps.filter((g) => g.status === "closed").length
  const progress: Insight["progress"] = [
    ...(labs
      ? [{ label: "Results in range", pct: pct(model.inRange, labs) }]
      : []),
    ...(data.gaps.length
      ? [{ label: "Care gaps closed", pct: pct(closedGaps, data.gaps.length) }]
      : []),
  ]

  const situation: Insight["situation"] = [
    ...urgent.slice(0, 2).map((u) => ({
      text: u.text,
      tone: "bad" as const,
      tag: usDay(u.date),
    })),
    ...out
      .filter(
        (l) =>
          !urgent.some(
            (u) => u.target.kind === "result" && u.target.code === l.code
          )
      )
      .slice(0, 2)
      .map((l) => ({
        text: labValue(l.code),
        tone: (statusOf(l) === "Critical" ? "bad" : "warn") as "bad" | "warn",
        tag: statusOf(l),
      })),
    ...trend.slice(0, 1).map((l) => ({
      text: `${l.name} is trending ${isRising(l) ? "up" : "down"}`,
      tone: "warn" as const,
      tag: latestOf(l) ? `${latestOf(l)!.value} ${l.unit}` : undefined,
    })),
    ...(model.intake
      ? [
          {
            text: `Matters most: ${model.intake.mattersMost}`,
            tone: "info" as const,
          },
        ]
      : []),
  ].slice(0, 5)
  if (situation.length === 0)
    situation.push({
      text: "Results, medications and orders are on track",
      tone: "good",
    })

  const recommendations: Insight["recommendations"] = [
    ...(urgent.length
      ? [
          {
            kind: "next" as const,
            label: "Review now",
            value: `${plural(urgent.length, "urgent result")} from ${shortSource(urgent[0].source)}`,
          },
        ]
      : []),
    ...doseCases.slice(0, 1).map((c) => ({
      kind: "next" as const,
      label: "Reconcile",
      value: c.other
        ? `${c.medication}: list shows ${c.practice ? doseText(c.practice) : "none"}, ${shortSource(c.other.source)} shows ${doseText(c.other)}`
        : `Confirm the ${c.medication} dose with the patient`,
    })),
    ...overdueOrders.slice(0, 1).map((o) => ({
      kind: "schedule" as const,
      label: "Follow up",
      value: `${o.order}, open ${o.clock.kind === "running" ? o.clock.day : 0} days`,
    })),
    ...trend.slice(0, 1).map((l) => ({
      kind: "recheck" as const,
      label: "Recheck",
      value: `Repeat ${l.name} to confirm the trend`,
    })),
    ...gaps
      .filter((g) => !isOverdue(g.clock))
      .slice(0, 1)
      .map((g) => ({
        kind: "followup" as const,
        label: "Care gap",
        value: `${g.gap}, due ${usDay(g.due)}`,
      })),
  ].slice(0, 4)

  const risks: Insight["risks"] = [
    ...allergyCases.map((c) => ({
      tone: "bad" as const,
      strong: `${c.medication} with a ${c.allergy} allergy`,
      text: "on record from another source",
    })),
    ...urgent.slice(0, 2).map((u) => ({
      tone: "bad" as const,
      strong: u.text,
      text: `from ${shortSource(u.source)}, not yet reviewed`,
    })),
    ...trend
      .filter((l) => statusOf(l) !== "In range")
      .slice(0, 1)
      .map((l) => ({
        tone: "warn" as const,
        strong: `${l.name} outside range and still moving`,
        text: "repeat before it is missed",
      })),
    ...(overdue
      ? [
          {
            tone: "warn" as const,
            strong: `${plural(overdue, "overdue item")}`,
            text: [
              ...overdueOrders.map((o) => o.order),
              ...overdueGaps.map((g) => g.gap),
            ].join(", "),
          },
        ]
      : []),
    ...(doseCases.length
      ? [
          {
            tone: "neutral" as const,
            strong: `${plural(doseCases.length, "medication difference")}`,
            text: "your list may not match what the patient takes",
          },
        ]
      : []),
  ].slice(0, 4)

  return {
    title: "AI summary",
    glance,
    progress,
    situation,
    recommendations,
    risks,
  }
}

export function ChartAISummary({ model }: { model: DashboardModel }) {
  const insight = React.useMemo(() => chartInsight(model), [model])
  return <AISummary insight={insight} showRisks />
}
