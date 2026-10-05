/* The optimization member's data: the client's HOLv.9 tracker (biomarkers,
   goals, scans, interventions, supplements, energy balance) and the
   Dashboard sheet's snapshot as the sheet shows it. Medications, orders,
   gaps, reports and the review log are the free view's shapes
   (../types.ts), so the shared cards read them unchanged. */

import type { DashCondition } from "@/components/patient-dashboard/types"

export type MarkerStatus = "High" | "Low" | "Watch" | "Not Yet Tested" | "In Range" | "Optimal" | "Informational"

export type BetterDirection = "Lower" | "Higher" | "Range" | "Maintain" | "Negative" | "Informational"

export type Tier = "Tier 1" | "Tier 2" | "Monitor" | "Maintain"

export type MarkerPoint = { date: string; value: number | string; source: string }

export interface Biomarker {
  category: string
  name: string
  unit: string
  baseline?: { date: string; value: string }
  latest?: { date: string; value: string }
  labLow?: number
  labHigh?: number
  targetLow?: number
  targetHigh?: number
  betterDirection: BetterDirection
  /** As recorded by the rules engine or clinician; never recomputed here. */
  status: MarkerStatus
  tier?: Tier
  nextStep?: string
  nextTest?: string
  frequency?: string
  note?: string
  /** Oldest first. Baseline and latest when the tracker has no series. */
  history: MarkerPoint[]
}

export type OptCondition = DashCondition & { controlMarkerName?: string }

export interface Goal {
  metric: string
  unit: string
  baseline: number
  current: number
  goal: number
  goalLabel: string
  betterDirection: "Lower" | "Higher"
  projection: string
  goalDate: string
  confidence: "High" | "Moderate" | "Low"
  status: "Near goal" | "Improving" | "Needs improvement" | "Controlled"
  seriesMarkerName: string
}

export interface ScanRow {
  metric: string
  /** The short name on the chart's axis. */
  short: string
  unit: string
  first: number
  latest: number
  status: "Improved" | "Watch" | "Optimal"
}

export type InterventionStatus = "Active" | "Completed" | "Verify" | "High priority"

export interface Intervention {
  start: string
  category: string
  name: string
  doseOrTarget: string
  frequency: string
  owner: string
  status: InterventionStatus
  outcomeMetric: string
  observed: string
  nextReview: string
  /** How far along the intervention is toward its target, 0 to 100. */
  progress?: number
}

export interface VisitPriority {
  order: number
  text: string
  milestone: string
  met: boolean
  /** Marker names the item rests on. */
  basedOn: string[]
  /** A report the item rests on, by name. */
  basedOnReport?: string
}

export interface RecommendedTest {
  tier: "Tier 1" | "Tier 2"
  category: string
  test: string
  why: string
  previous: string
  target: string
  timing: string
  status: "Discuss" | "Ordered" | "Completed"
}

export type TimeOfDay = "Morning" | "Midday" | "Afternoon" | "Evening" | "Night"

export interface Supplement {
  name: string
  brand: string
  dose: string
  timing: TimeOfDay
  status: "Active"
}

export interface Conflict {
  item: string
  conflictsWith: string
  evidenceMarkerName: string
  status: "open" | "acknowledged" | "dismissed"
}

export type DraftKind = "Add" | "Change" | "Add test"

export interface PlanDraft {
  draftedAt: string
  items: {
    id: string
    kind: DraftKind
    text: string
    basedOn: string[]
    /** A report the item rests on, by name. */
    basedOnReport?: string
    status: "pending" | "approved" | "removed"
  }[]
}

export type CheckInState = "Doing well" | "Somewhat" | "Struggling" | "Didn't start"

export interface Commitment {
  why: string
  intakeReviewedAt: string
  text: string
  confidence: number
  checkIns: { date: string; state: CheckInState }[]
  nextCheckIn: string
}

export interface EnergyDay {
  date: string
  intake: number
  burn: number
  lowConfidence?: boolean
}

/** One night's wearable sync (Terra, at midnight): the day before. */
export interface WearableDay {
  date: string
  steps: number
  restingHr: number
  hrv: number
  sleepHours: number
}

/* ------------------------------------------------- HOLv.9 snapshot -- */

export type SnapshotBand = "Out of target" | "On watch" | "Not yet tested" | "In range" | "Optimal"

export type SnapshotMarker = {
  name: string
  latest: string
  unit: string
  /** As the sheet prints it: "≤ 20", "75-95", "Clinical". */
  target: string
  status: "High" | "Low" | "Watch" | "Not yet tested" | "Optimal" | "In range"
  tier: "Tier 1" | "Tier 2" | "Monitor" | "Maintain"
  whatToDo: string
}

export type HeadlineNumber = {
  label: string
  unit: string
  baseline: number
  latest: number
  /** The marker whose history draws the sparkline. */
  seriesMarkerName: string
  /** Higher or lower is better, for the sign's colour. */
  better: "Lower" | "Higher"
  verdict: string
  /** Process words read amber; the rest green or primary. */
  verdictTone: "primary" | "success" | "warning"
  decimals: number
}

export type SnapshotMedication = {
  name: string
  dose: string
  prescriber: string
  /** As the chart's Medications tab lists it. */
  sig?: string
  quantity?: string
  recorded?: string
  rxnorm?: string
  /** None, or another source's dose with who changed it and when. */
  change?: { from: string; to: string; by: string; date: string }
}

export type MedicationChange = {
  date: string
  text: string
  sub: string
  status: "Verify" | "Active" | "Unconfirmed"
  /** Resolves through a reconcile case on this medication. */
  medication?: string
}

export type Holv9DashboardSnapshot = {
  updatedAt: string
  score: number
  markersTracked: number
  counts: Record<SnapshotBand, number>
  latestDraw: string
  /** The bulk upload the panel came from. */
  bulk: { count: number; source: string; date: string }
  headline: HeadlineNumber[]
  bands: { "Out of target": SnapshotMarker[]; "On watch": SnapshotMarker[]; "Not yet tested": SnapshotMarker[] }
  priorities: VisitPriority[]
  scanDates: { first: string; latest: string }
  scale: { weight: number; date: string }
  medications: SnapshotMedication[]
  changes: MedicationChange[]
}

/** The Category Scores sheet, as recorded. */
export type CategoryScore = { category: string; score: number }

/** Everything the optimization view reads beyond the shared data. */
export type OptimizationData = {
  patientId: string
  planSince: string
  conditions: OptCondition[]
  biomarkers: Biomarker[]
  goals: Goal[]
  scans: ScanRow[]
  interventions: Intervention[]
  tests: RecommendedTest[]
  supplements: Supplement[]
  conflicts: Conflict[]
  planDraft?: PlanDraft
  commitment?: Commitment
  energy: EnergyDay[]
  /** The wearable's nightly syncs, oldest first. */
  wearable?: { device: string; days: WearableDay[] }
  rmr: number
  categories: CategoryScore[]
  snapshot: Holv9DashboardSnapshot
}
