import { CATEGORIES } from "@/components/goal-list"
import type { Biomarker } from "@/lib/record"
import { pointSide } from "@/lib/trends"

/** Which results speak to each goal, by the goal's first words. Shared by
    /goals (to preselect) and /goals-record (to check each choice). */
export const EVIDENCE: { words: RegExp; markers: string[]; test?: string }[] = [
  { words: /^lose weight/, markers: ["bmi", "glucose", "tg", "bp"] },
  { words: /^improve metabolic/, markers: ["a1c", "glucose"] },
  { words: /^improve cholesterol/, markers: ["ldl", "tg", "hdl", "bp"] },
  { words: /^gain or preserve muscle/, markers: [], test: "body composition" },
  { words: /^improve bone/, markers: [], test: "bone density" },
  { words: /^improve kidney/, markers: ["egfr", "creatinine", "bun"] },
]

/** The goals her record backs: those with a result above or below range,
    in the list's own order, the first `max` of them. */
export function recordGoals(markers: Biomarker[], max = 3): string[] {
  const out = (id: string) => {
    const b = markers.find((m) => m.id === id)
    const last = b?.points[b.points.length - 1]
    return !!b && !!last && !!pointSide(b, last)
  }
  return CATEGORIES.flatMap((c) => c.goals)
    .filter((g) => EVIDENCE.some((e) => e.words.test(g.toLowerCase()) && e.markers.some(out)))
    .slice(0, max)
}
