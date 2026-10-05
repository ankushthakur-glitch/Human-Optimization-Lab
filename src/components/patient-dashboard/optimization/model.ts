"use client"

import * as React from "react"

import { createCollection } from "@/components/practice/collection-store"
import { NOW } from "@/components/provider/mock-clock"
import { audit } from "@/components/provider/work-items"
import { ME, type DashboardModel } from "@/components/patient-dashboard/model"
import { optimizationDataFor } from "@/components/patient-dashboard/optimization/mock-data"
import {
  bandRows,
  categoryRows,
  draftSummary,
  goalCards,
  markerByName,
  planLanes,
  sinceCounts,
  stillUntested,
  targetsMet,
} from "@/components/patient-dashboard/optimization/rules"
import type { OptimizationData, VisitPriority } from "@/components/patient-dashboard/optimization/types"

/* What the physician has decided on an optimization member's AI drafts,
   kept per patient for the session: approved priorities, conflicts added
   to priorities, plan-draft items approved, edited or removed, and tests
   ordered. Nothing drafted reaches the patient until it is approved here,
   and every decision writes the audit log with the physician and time. */

type Signed = { at: string; by: string }

type OptState = {
  id: string
  prioritiesApproved?: Signed
  /** Conflicts the physician added to priorities, by item. */
  conflicts: Record<string, "acknowledged" | "dismissed">
  drafts: Record<string, { status: "approved" | "removed"; text?: string } & Signed>
  ordered: string[]
}

export const optimizationState = createCollection<OptState>("hol-optimization-dashboard", [], "v1")

const empty = (id: string): OptState => ({ id, conflicts: {}, drafts: {}, ordered: [] })

function update(id: string, fn: (s: OptState) => OptState) {
  const current = optimizationState.get().find((s) => s.id === id)
  if (current) optimizationState.patch(id, fn(current))
  else optimizationState.add([fn(empty(id))])
}

/** The tracker data with the session's decisions laid over it. */
function withState(data: OptimizationData, s: OptState | undefined): OptimizationData {
  if (!s) return data
  return {
    ...data,
    conflicts: data.conflicts.map((c) => (s.conflicts[c.item] ? { ...c, status: s.conflicts[c.item] } : c)),
    planDraft: data.planDraft && {
      ...data.planDraft,
      items: data.planDraft.items.map((i) => {
        const d = s.drafts[i.id]
        return d ? { ...i, status: d.status, text: d.text ?? i.text } : i
      }),
    },
    tests: data.tests.map((t) => (s.ordered.includes(t.test) ? { ...t, status: "Ordered" } : t)),
  }
}

/** Everything the optimization view shows, derived in one pass. */
export function buildOptimization(data: OptimizationData, core: DashboardModel, s: OptState | undefined) {
  const cutoff = core.review?.at ?? data.planSince
  const addedPriorities: VisitPriority[] = data.conflicts
    .filter((c) => c.status === "acknowledged")
    .map((c, i) => ({
      order: data.snapshot.priorities.filter((p) => !p.met).length + i + 1,
      text: `Review ${c.item.split(" · ")[0]} dose`,
      milestone: `${c.conflictsWith} within target`,
      met: false,
      basedOn: [c.evidenceMarkerName],
    }))
  const priorities = [
    ...data.snapshot.priorities.filter((p) => !p.met),
    ...addedPriorities,
    ...data.snapshot.priorities.filter((p) => p.met),
  ]
  const draft = data.planDraft
  const pendingDraft = draft?.items.filter((i) => i.status === "pending") ?? []
  const toOrder = stillUntested(
    data.tests.filter((t) => t.status !== "Completed").map((t) => ({ ...t, name: t.test })),
    data.biomarkers
  ).filter((t) => t.status === "Discuss" || s?.ordered.includes(t.test))

  return {
    data,
    cutoff,
    since: sinceCounts(core, data, cutoff),
    targetsMet: targetsMet(data.biomarkers, cutoff),
    bands: bandRows(data.snapshot, data.biomarkers),
    priorities,
    prioritiesApproved: s?.prioritiesApproved,
    toOrder,
    categories: categoryRows(data.categories),
    goals: goalCards(data.goals, data.biomarkers),
    lanes: planLanes(data.interventions),
    conflicts: data.conflicts.filter((c) => c.status === "open"),
    draft,
    pendingDraft,
    draftLine: draft ? draftSummary(draft) : "",
    medicationCount: core.data.medications.filter((m) => m.isPracticeList).length,
    marker: (name: string) => markerByName(data.biomarkers, name),
  }
}

export type OptimizationModel = ReturnType<typeof buildOptimization>

export function useOptimization(patientId: string, core: DashboardModel) {
  const { items, ready } = optimizationState.use()
  const state = items.find((s) => s.id === patientId)
  const base = React.useMemo(() => optimizationDataFor(patientId), [patientId])
  const model = React.useMemo(
    () => (base ? buildOptimization(withState(base, state), core, state) : undefined),
    [base, state, core]
  )
  const id = patientId
  const signed = (): Signed => ({ at: NOW, by: ME })

  const actions = React.useMemo(
    () => ({
      approvePriorities() {
        update(id, (s) => ({ ...s, prioritiesApproved: signed() }))
        audit(ME, "Approve priorities", id)
      },
      addConflictToPriorities(item: string) {
        update(id, (s) => ({ ...s, conflicts: { ...s.conflicts, [item]: "acknowledged" } }))
        audit(ME, "Add to priorities", item)
      },
      decideDraft(itemId: string, status: "approved" | "removed", text?: string) {
        update(id, (s) => ({ ...s, drafts: { ...s.drafts, [itemId]: { status, text, ...signed() } } }))
        audit(ME, status === "approved" ? (text ? "Edit and approve plan item" : "Approve plan item") : "Remove plan item", itemId)
      },
      approvePlan(itemIds: string[]) {
        update(id, (s) => ({
          ...s,
          drafts: { ...s.drafts, ...Object.fromEntries(itemIds.map((d) => [d, { status: "approved" as const, ...signed() }])) },
        }))
        audit(ME, "Approve plan", id)
      },
      orderTest(test: string) {
        update(id, (s) => ({ ...s, ordered: [...new Set([...s.ordered, test])] }))
        audit(ME, "Order", test)
      },
    }),
    [id]
  )

  return { ready, model, actions }
}

export type Optimization = ReturnType<typeof useOptimization>
