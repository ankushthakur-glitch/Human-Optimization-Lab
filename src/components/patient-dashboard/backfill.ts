import type { DashboardData, LabReading } from "@/components/patient-dashboard/types"
import type { Biomarker, MarkerPoint } from "@/components/patient-dashboard/optimization/types"

/* Demo data only (7 Oct request): every chart should have at least four
   readings, so a result with fewer gets illustrative earlier ones, six
   months apart before its first. Each step back is a few percent nearer
   the range when the latest is out of it (the result has been drifting
   out), and a small alternating wobble when it is in. The readings are
   marked with BACKFILL_SOURCE so they can be told apart and removed once
   real history arrives. */

export const BACKFILL_SOURCE = "Earlier record (illustrative)"
const MIN = 4
const STEP_DAYS = 182

const back = (iso: string, n: number) =>
  new Date(new Date(iso.slice(0, 10)).getTime() - n * STEP_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10)

const decimals = (v: number) => (String(v).split(".")[1] ?? "").length

/** Values for `count` readings before `first`, oldest first. */
function earlier(first: number, count: number, low?: number, high?: number) {
  const dp = decimals(first)
  const out: number[] = []
  let v = first
  for (let i = 1; i <= count; i++) {
    const drift =
      high != null && first > high ? -0.04 : low != null && first < low ? 0.04 : i % 2 ? 0.025 : -0.015
    v = v * (1 + drift)
    out.unshift(Number(v.toFixed(dp)))
  }
  return out
}

export function backfillLabs(data: DashboardData): DashboardData {
  return {
    ...data,
    labs: data.labs.map((l) => {
      const h = l.history
      if (h.length === 0 || h.length >= MIN) return l
      const first = h[0]
      const add: LabReading[] = earlier(first.value, MIN - h.length, l.refLow, l.refHigh).map((value, i, all) => ({
        date: back(first.date, all.length - i),
        value,
        source: BACKFILL_SOURCE,
        isOutsideSource: true,
      }))
      return { ...l, history: [...add, ...h] }
    }),
  }
}

export function backfillBiomarker(b: Biomarker): Biomarker {
  const numeric = b.history.filter((p) => typeof p.value === "number")
  if (numeric.length === 0 || numeric.length >= MIN) return b
  const first = b.history[0]
  const low = b.targetLow ?? b.labLow
  const high = b.targetHigh ?? b.labHigh
  const add: MarkerPoint[] = earlier(first.value as number, MIN - numeric.length, low, high).map((value, i, all) => ({
    date: back(first.date, all.length - i),
    value,
    source: BACKFILL_SOURCE,
  }))
  return { ...b, history: [...add, ...b.history] }
}
