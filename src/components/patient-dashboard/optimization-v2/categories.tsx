"use client"

import { CATEGORY_COLOR, CategoryGrid } from "@/components/dashboard-kit-v2"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { categoryCells } from "@/components/patient-dashboard/optimization-v2/rules"
import { OptCard } from "@/components/patient-dashboard/optimization-v2/ui"

/* The Category Scores sheet as a grid, weakest first. A cell filters the
   Markers card to its category. */

export function ScoreByCategory({
  model,
  selected,
  onSelect,
}: {
  model: OptimizationModel
  selected?: string
  onSelect: (category: string) => void
}) {
  const { cells, legend } = categoryCells(model)
  if (cells.length === 0) return null
  return (
    <OptCard
      id="categories"
      title="Score by category"
      description={`${cells.length} categories`}
      actions={
        <ul className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground tabular-nums">
          {legend.map((l) => (
            <li key={l.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: CATEGORY_COLOR[l.key as keyof typeof CATEGORY_COLOR] }} />
              {l.label} {l.n}
            </li>
          ))}
        </ul>
      }
    >
      <CategoryGrid cells={cells} selected={selected} onPress={onSelect} className="pt-1 pb-1" />
    </OptCard>
  )
}
