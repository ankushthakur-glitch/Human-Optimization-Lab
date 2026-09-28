"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { Badge } from "@/design-system/ui/badge"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The chart's Overview, laid out from the client's Master Biomarkers
   Optimization Tracker (V9.0): the Dashboard tab first, filled in from the
   tabs behind it (Biomarkers, Category Scores, Body Progress, Forecasts,
   Physician Summary, DEXA RMR, Interventions, Recommended Tests, Medication
   and Supplement Inventory, Clinical Reports). Sample data copied from the
   sheet; the real product computes it from the patient's results.

   Layout: a 12 column grid. Every card in a row is the same height and
   scrolls inside, so the rows line up edge to edge. */

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

type Status =
  | "High"
  | "Low"
  | "Watch"
  | "In range"
  | "Optimal"
  | "Not yet tested"

type Marker = {
  name: string
  category: string
  latest?: string
  unit?: string
  date?: string
  target: string
  status: Status
  trend?: string
  tier: string
  todo: string
}

type Group = "out" | "watch" | "untested"

const MARKERS: Record<Group, Marker[]> = {
  out: [
    { name: "Body fat total", category: "Body composition", latest: "23.3", unit: "%", date: "Aug 4", target: "≤20", status: "High", trend: "Improved", tier: "Tier 1", todo: "Reduce fat while preserving lean tissue" },
    { name: "VAT area", category: "Body composition", latest: "142", unit: "cm²", date: "Aug 4", target: "≤100", status: "High", trend: "Improved", tier: "Tier 1", todo: "Continue visceral fat reduction" },
    { name: "VAT volume", category: "Body composition", latest: "738", unit: "cm³", date: "Aug 4", target: "≤600", status: "High", trend: "Improved", tier: "Tier 1", todo: "Continue visceral fat reduction" },
    { name: "LDL particle number", category: "Heart", latest: "1215", unit: "nmol/L", date: "May 29", target: "≤1000", status: "High", trend: "Needs improvement", tier: "Tier 1", todo: "Repeat advanced lipids" },
    { name: "LDL small", category: "Heart", latest: "227", unit: "nmol/L", date: "May 29", target: "≤150", status: "High", trend: "Needs improvement", tier: "Tier 1", todo: "Improve particle profile" },
    { name: "LDL medium", category: "Heart", latest: "219", unit: "nmol/L", date: "May 29", target: "≤150", status: "High", trend: "Needs improvement", tier: "Tier 1", todo: "Improve particle profile" },
    { name: "Lipoprotein(a)", category: "Heart", latest: "80", unit: "nmol/L", date: "Aug 5", target: "<75", status: "Watch", trend: "Monitor", tier: "Tier 2", todo: "Maintain ApoB control" },
    { name: "hs-CRP", category: "Immune regulation", latest: "2", unit: "mg/L", date: "May 29", target: "≤1", status: "High", trend: "Needs improvement", tier: "Tier 1", todo: "Repeat when well" },
    { name: "Fasting glucose", category: "Metabolic", latest: "103", unit: "mg/dL", date: "Aug 5", target: "75-95", status: "Watch", trend: "Improved", tier: "Tier 2", todo: "Repeat after a true overnight fast" },
    { name: "Potassium", category: "Metabolic", latest: "5.6", unit: "mmol/L", target: "≤5.2", status: "High", tier: "Tier 1", todo: "Repeat promptly" },
    { name: "Omega-3 index", category: "Nutrients", latest: "4.6", unit: "%", date: "May 29", target: "8-12", status: "Low", trend: "Needs improvement", tier: "Tier 1", todo: "Retest after EPA and DHA" },
    { name: "Omega-6:3 ratio", category: "Nutrients", latest: "7.5", date: "May 29", target: "≤5", status: "High", trend: "Needs improvement", tier: "Tier 2", todo: "Raise omega-3" },
    { name: "DHEA-S", category: "Male health", latest: "17", unit: "mcg/dL", date: "May 29", target: "≥40", status: "Low", trend: "Needs improvement", tier: "Tier 2", todo: "Discuss before any supplementation" },
    { name: "Rheumatoid factor", category: "Autoimmunity", latest: "29", unit: "IU/mL", date: "Aug 5", target: "Clinical", status: "High", trend: "Improved", tier: "Tier 2", todo: "Consider anti-CCP, ESR, CRP" },
  ],
  watch: [
    { name: "Weight", category: "Body composition", latest: "161", unit: "lb", date: "Aug 8", target: "160-165", status: "Watch", trend: "Improving", tier: "Tier 1", todo: "Finish gradual loss" },
    { name: "Waist", category: "Body composition", latest: "34.25", unit: "in", date: "Aug 8", target: "32-33", status: "Watch", trend: "Improving", tier: "Tier 1", todo: "Continue recomposition" },
    { name: "Fat mass", category: "Body composition", latest: "38.1", unit: "lb", date: "Aug 4", target: "30-33", status: "Watch", trend: "Improved", tier: "Tier 1", todo: "Continue gradual reduction" },
    { name: "Lean mass", category: "Body composition", latest: "119.3", unit: "lb", date: "Aug 4", target: "≥121.9", status: "Watch", trend: "Slight decline", tier: "Tier 1", todo: "Protect lean mass" },
    { name: "Total BMD", category: "Body composition", latest: "1.218", unit: "g/cm²", date: "Aug 4", target: "Maintain", status: "Watch", trend: "Lower", tier: "Tier 2", todo: "Review DEXA" },
    { name: "Hemoglobin A1c", category: "Metabolic", latest: "5.3", unit: "%", date: "Aug 5", target: "5.2-5.4", status: "Optimal", trend: "Improved", tier: "Maintain", todo: "Maintain" },
    { name: "Total testosterone", category: "Male health", latest: "619", unit: "ng/dL", date: "Aug 5", target: "Physiologic", status: "In range", trend: "Improved", tier: "Tier 2", todo: "Maintain conservative range" },
    { name: "Free testosterone", category: "Male health", latest: "10.4", unit: "ng/dL", date: "Aug 5", target: "3.1-11.3", status: "In range", trend: "Improved", tier: "Tier 2", todo: "Monitor symptoms" },
    { name: "RBC", category: "Blood", latest: "5.47", unit: "x10¹²/L", date: "Aug 5", target: "≤5.5", status: "Watch", trend: "Stable", tier: "Tier 2", todo: "Monitor TRT" },
    { name: "eGFR", category: "Kidney", latest: "58", unit: "mL/min", target: "≥60", status: "Low", trend: "Improved", tier: "Tier 1", todo: "Repeat with cystatin C" },
    { name: "Homocysteine", category: "Nutrients", latest: "9.5", unit: "umol/L", date: "May 29", target: "≤8", status: "Watch", trend: "Slightly high", tier: "Tier 2", todo: "Review B vitamins" },
    { name: "Sleep apnea, home study", category: "Sleep", latest: "AHI 5.3, O₂ nadir 85%", date: "Jun 4", target: "Treat, minimise hypoxemia", status: "High", trend: "New", tier: "Tier 1", todo: "Sleep medicine follow up" },
  ],
  untested: [
    { name: "Urine albumin/creatinine ratio", category: "Kidney", target: "<30 mg/g", status: "Not yet tested", tier: "Tier 1", todo: "Order annual kidney screen" },
    { name: "Sensitive estradiol LC/MS-MS", category: "Male health", target: "Symptom guided", status: "Not yet tested", tier: "Tier 2", todo: "Confirm if low libido persists" },
    { name: "Anti-CCP, ESR", category: "Autoimmunity", target: "Clinical", status: "Not yet tested", tier: "Tier 2", todo: "Consider if indicated" },
  ],
}

const SUMMARY: {
  id: string
  label: string
  count: number
  means: string
  tone: string
  group?: Group
}[] = [
  { id: "out", label: "Out of target", count: 14, means: "Action needed", tone: "bg-destructive", group: "out" },
  { id: "watch", label: "On watch", count: 12, means: "Keep monitoring", tone: "bg-warning", group: "watch" },
  { id: "untested", label: "Not yet tested", count: 4, means: "Order at next visit", tone: "bg-info", group: "untested" },
  { id: "range", label: "In range", count: 9, means: "Acceptable", tone: "bg-primary" },
  { id: "optimal", label: "Optimal", count: 20, means: "At or better than target", tone: "bg-success" },
]
const TOTAL = 64
const PANEL_SCORE = 66

/** Optimal or in range counts in full; on watch or not tested counts half. */
const CATEGORIES: { name: string; good: number; watch: number; off: number; score: number }[] = [
  { name: "Body composition", good: 0, watch: 5, off: 3, score: 31 },
  { name: "Immune regulation", good: 0, watch: 0, off: 1, score: 0 },
  { name: "Autoimmunity", good: 0, watch: 0, off: 1, score: 0 },
  { name: "Nutrients", good: 2, watch: 2, off: 2, score: 50 },
  { name: "Heart", good: 6, watch: 1, off: 4, score: 59 },
  { name: "Metabolic", good: 2, watch: 3, off: 0, score: 70 },
  { name: "Male health", good: 6, watch: 1, off: 1, score: 81 },
  { name: "Blood", good: 2, watch: 1, off: 0, score: 83 },
  { name: "Kidney", good: 3, watch: 1, off: 0, score: 88 },
  { name: "Metabolism", good: 1, watch: 0, off: 0, score: 100 },
  { name: "Liver", good: 2, watch: 0, off: 0, score: 100 },
  { name: "Thyroid", good: 3, watch: 0, off: 0, score: 100 },
  { name: "Cancer screening", good: 1, watch: 0, off: 0, score: 100 },
  { name: "Environmental", good: 1, watch: 0, off: 0, score: 100 },
  { name: "Brain health", good: 1, watch: 0, off: 0, score: 100 },
]

/** Scale and tape readings since the program started. */
const BODY: { date: string; weight: number; waist?: number; note?: string }[] = [
  { date: "Mar 1", weight: 183, waist: 38, note: "Optimization start" },
  { date: "Apr 6", weight: 174, waist: 36 },
  { date: "Apr 25", weight: 175.5, waist: 36.5, note: "Short rebound" },
  { date: "May 8", weight: 173, waist: 36 },
  { date: "May 18", weight: 172, waist: 36 },
  { date: "May 21", weight: 170, waist: 35.5 },
  { date: "May 28", weight: 169, waist: 35 },
  { date: "Jun 6", weight: 168, waist: 35 },
  { date: "Jun 15", weight: 168, waist: 35, note: "Plateau" },
  { date: "Jun 17", weight: 166, waist: 35 },
  { date: "Jul 10", weight: 165, waist: 34.5 },
  { date: "Jul 14", weight: 163.5, waist: 34.25 },
  { date: "Jul 30", weight: 164, waist: 34.5 },
  { date: "Aug 4", weight: 163.3, note: "DEXA weight" },
  { date: "Aug 8", weight: 161, waist: 34.25 },
]
const WEIGHT_GOAL = 160

const FORECASTS: {
  metric: string
  baseline: string
  current: string
  goal: string
  projection: string
  by: string
  confidence: "High" | "Moderate"
  status: string
}[] = [
  { metric: "Weight", baseline: "183", current: "161", goal: "160 lb", projection: "160-162", by: "Oct 31, 2026", confidence: "High", status: "Near goal" },
  { metric: "Waist", baseline: "38", current: "34.25", goal: "32-33 in", projection: "33.5-34", by: "Mar 31, 2027", confidence: "Moderate", status: "Improving" },
  { metric: "Body fat", baseline: "28", current: "23.3", goal: "18-20%", projection: "21.5-22.5", by: "Mar 31, 2027", confidence: "Moderate", status: "Improving" },
  { metric: "VAT area", baseline: "191", current: "142", goal: "<100 cm²", projection: "125-135", by: "Mar 31, 2027", confidence: "Moderate", status: "Improving" },
  { metric: "HbA1c", baseline: "5.6", current: "5.3", goal: "5.4%", projection: "5.5", by: "Nov 30, 2026", confidence: "Moderate", status: "Needs improvement" },
  { metric: "Omega-3 index", baseline: "4.6", current: "4.6", goal: "8%", projection: "7.0", by: "Dec 31, 2026", confidence: "Moderate", status: "Needs improvement" },
  { metric: "LDL-P", baseline: "1215", current: "1215", goal: "1000 nmol/L", projection: "1100", by: "Dec 31, 2026", confidence: "Moderate", status: "Needs improvement" },
  { metric: "Hematocrit", baseline: "54.2", current: "49.3", goal: "48%", projection: "49.0", by: "Dec 31, 2026", confidence: "Moderate", status: "Controlled" },
]

const PRIORITIES: { title: string; next: string }[] = [
  { title: "Potassium normalised on repeat", next: "Aug 14: 4.5 mmol/L" },
  { title: "Kidney trend improved", next: "Aug 14: eGFR 62, creatinine 1.20, BUN 18" },
  { title: "Continue visceral fat reduction", next: "VAT <100 cm²" },
  { title: "Protect lean mass", next: "Protein and resistance training" },
  { title: "Maintain TRT safety and balance", next: "CBC and sensitive estradiol" },
  { title: "Treat mild obstructive sleep apnea", next: "Reduce fragmentation and nocturnal hypoxemia" },
]

/** Physician Summary, August 2026 physical: what to raise and the evidence. */
const ISSUES: { issue: string; evidence: string; discuss: string; high?: boolean }[] = [
  { issue: "Mild obstructive sleep apnea", evidence: "Home sleep test Jun 4: AHI 5.3, O₂ nadir 85%", discuss: "Positional therapy or oral appliance; repeat testing", high: true },
  { issue: "Peyronie's disease, ED", evidence: "Penile Doppler abnormal; ~45° left curve, ~30% girth loss", discuss: "Urology surgical option documented", high: true },
  { issue: "LDL particle burden", evidence: "LDL-P 1215; small and medium elevated", discuss: "ApoB and advanced lipid panel" },
  { issue: "Inflammation", evidence: "hs-CRP 2.0 (May); CRP <1.0, ESR 2, anti-CCP negative (Aug 14)", discuss: "Keep CRP separate from hs-CRP" },
  { issue: "TRT balance and safety", evidence: "Prior E2 72.1; Hct 54.2%, now improved", discuss: "Total and free T, SHBG, sensitive E2, CBC, PSA" },
  { issue: "Kidney function", evidence: "eGFR 62, creatinine 1.20 (Aug 14); cystatin C eGFR 68", discuss: "Trend renal function; ACR not calculable" },
  { issue: "Omega-3 status", evidence: "Index 4.6%; ratio 7.5", discuss: "Repeat OmegaCheck after consistent intake" },
  { issue: "Metabolic health", evidence: "A1c 5.3%, insulin 5.4 (Aug 5); glucose 97 (Aug 14)", discuss: "Confirm fasting status before trending" },
]

const DEXA: {
  metric: string
  unit: string
  before?: number
  after: number
  pct?: number
  status: "Improved" | "Watch" | "Optimal"
  read: string
}[] = [
  { metric: "Weight", unit: "lb", before: 177.6, after: 163.3, pct: -8.1, status: "Improved", read: "Substantial weight reduction" },
  { metric: "Body fat", unit: "%", before: 28, after: 23.3, pct: -16.8, status: "Improved", read: "Strong reduction in body fat" },
  { metric: "Fat mass", unit: "lb", before: 49.8, after: 38.1, pct: -23.5, status: "Improved", read: "Most lost weight came from fat" },
  { metric: "Lean mass", unit: "lb", before: 121.9, after: 119.3, pct: -2.1, status: "Watch", read: "Protect lean mass in final loss phase" },
  { metric: "Total BMD", unit: "g/cm²", before: 1.25, after: 1.218, pct: -2.6, status: "Watch", read: "May reflect scan variability" },
  { metric: "Total T-score", unit: "score", after: 0.2, status: "Optimal", read: "Overall score remains normal" },
  { metric: "VAT area", unit: "cm²", before: 191, after: 142, pct: -25.7, status: "Improved", read: "Meaningful visceral fat reduction" },
  { metric: "VAT volume", unit: "cm³", before: 996, after: 738, pct: -25.9, status: "Improved", read: "Meaningful visceral fat reduction" },
  { metric: "RMR", unit: "kcal/day", before: 1754, after: 1902, pct: 8.4, status: "Improved", read: "Measured resting expenditure increased" },
]

const INTERVENTIONS: {
  name: string
  category: string
  dose: string
  since: string
  status: "Active" | "Completed" | "Follow up"
  result: string
  review: string
}[] = [
  { name: "Treat mild obstructive sleep apnea", category: "Sleep", dose: "Nightly", since: "Jun 4, 2026", status: "Follow up", result: "Home study confirmed mild OSA with desaturation", review: "Now" },
  { name: "Calorie controlled fat loss plan", category: "Nutrition", dose: "~1,500-1,600 kcal/day", since: "Mar 1, 2026", status: "Active", result: "Weight down ~19.7 lb; waist down 3.5 in", review: "Aug 31, 2026" },
  { name: "Resistance training split", category: "Exercise", dose: "6 days a week", since: "Mar 1, 2026", status: "Active", result: "Strength maintained; lean mass is priority", review: "Aug 31, 2026" },
  { name: "Walking and treadmill", category: "Activity", dose: "10,000-12,000 steps + 30-45 min", since: "Apr 1, 2026", status: "Active", result: "Strong weight and VAT response", review: "Aug 31, 2026" },
  { name: "Split testosterone dosing", category: "TRT", dose: "3x weekly, physician directed", since: "Apr 1, 2026", status: "Active", result: "E2 and hematocrit improved", review: "Next TRT panel" },
  { name: "Protect lean mass", category: "Body recomposition", dose: "Protein + progressive resistance", since: "Aug 4, 2026", status: "Active", result: "Lean mass 119.3 lb; avoid further decline", review: "Next DEXA" },
  { name: "Omega-3 EPA+DHA", category: "Supplement", dose: "Clinician approved dose, daily", since: "May 29, 2026", status: "Active", result: "Baseline 4.6%; retest needed", review: "Nov 30, 2026" },
  { name: "Psyllium, soluble fiber", category: "Supplement", dose: "5-10 g/day", since: "May 29, 2026", status: "Active", result: "Outcome pending repeat labs", review: "Nov 30, 2026" },
  { name: "Power Red blood donation", category: "TRT safety", dose: "1 session", since: "Mar 26, 2026", status: "Completed", result: "Hematocrit 54.2% to 48.8%", review: "Next CBC" },
]

const TESTS: {
  tier: "Tier 1" | "Tier 2"
  test: string
  category: string
  why: string
  previous: string
  target: string
  timing: string
  state: "Discuss" | "Completed" | "Partially completed"
}[] = [
  { tier: "Tier 1", test: "CBC with differential", category: "TRT safety", why: "TRT previously raised hematocrit", previous: "Hct 54.2% to 48.8%; RBC 6.18 to 5.50", target: "Hct in physician approved range", timing: "Now, 3-6 months", state: "Discuss" },
  { tier: "Tier 1", test: "Hemoglobin A1c", category: "Metabolic", why: "Prediabetes trend after weight and VAT loss", previous: "5.7%", target: "5.2-5.4%", timing: "Now, 3-6 months", state: "Discuss" },
  { tier: "Tier 1", test: "Fasting glucose + fasting insulin", category: "Metabolic", why: "Detect insulin resistance; HOMA-IR", previous: "Glucose 114; insulin not tested", target: "Glucose <95; insulin <6", timing: "Now", state: "Discuss" },
  { tier: "Tier 1", test: "ApoB", category: "Cardiovascular", why: "Atherogenic particle burden", previous: "Not yet tested; LDL-P 1215", target: "<70 mg/dL", timing: "Now, 6-12 months", state: "Discuss" },
  { tier: "Tier 1", test: "Advanced lipid panel", category: "Cardiovascular", why: "Recheck elevated LDL-P, small and medium", previous: "LDL-P 1215; small 227; medium 219", target: "LDL-P <1000", timing: "Now, 6-12 months", state: "Discuss" },
  { tier: "Tier 1", test: "hs-CRP", category: "Inflammation", why: "Has inflammation improved; test when well", previous: "2.0 mg/L", target: "<1.0 mg/L", timing: "Now, 3-6 months", state: "Discuss" },
  { tier: "Tier 1", test: "Omega-3 index", category: "Nutrition", why: "Confirm response to omega-3 intake", previous: "4.6%; ratio 7.5", target: "8-12%", timing: "After 3 months of intake", state: "Discuss" },
  { tier: "Tier 1", test: "Total and free testosterone, SHBG", category: "Hormones", why: "TRT effect with injection timing", previous: "Total T 447; free T 67.7; SHBG 29", target: "Individualised", timing: "Now, 3-6 months", state: "Discuss" },
  { tier: "Tier 1", test: "Sensitive estradiol LC/MS-MS", category: "Hormones", why: "Estrogen balance on current TRT", previous: "72.1 to 37 pg/mL", target: "Symptom guided", timing: "Now, 3-6 months", state: "Discuss" },
  { tier: "Tier 1", test: "PSA", category: "Prostate", why: "Surveillance with cancer history and TRT", previous: "<0.1 ng/mL", target: "Remain undetectable", timing: "Now, 6-12 months", state: "Discuss" },
  { tier: "Tier 1", test: "Sleep apnea treatment follow up", category: "Sleep", why: "Mild OSA with oxygen desaturation", previous: "AHI 5.3; O₂ nadir 85%", target: "Reduce AHI and desaturation", timing: "Now", state: "Discuss" },
  { tier: "Tier 1", test: "CMP with creatinine, eGFR", category: "Kidney", why: "Borderline filtration and electrolytes", previous: "eGFR 62; creatinine 1.20; BUN 18", target: "Stable or improved", timing: "Repeat per clinician", state: "Completed" },
  { tier: "Tier 1", test: "Cystatin C with eGFR", category: "Kidney", why: "Marker less affected by muscle mass", previous: "Cystatin C 1.05; eGFR 68", target: "Normal, stable", timing: "Annual", state: "Completed" },
  { tier: "Tier 1", test: "Urine albumin/creatinine ratio", category: "Kidney", why: "Screen for early kidney damage", previous: "Albumin <0.50; creatinine 14.1; no ratio", target: "<30 mg/g", timing: "Annual", state: "Completed" },
  { tier: "Tier 2", test: "TSH + free T4", category: "Thyroid", why: "Levothyroxine replacement", previous: "TSH 1.26; free T4 1.4", target: "Individualised", timing: "6-12 months", state: "Discuss" },
  { tier: "Tier 2", test: "Ferritin, iron, TIBC", category: "Iron", why: "Iron stores after Power Red donation", previous: "Ferritin 106", target: "Adequate, no overload", timing: "6-12 months", state: "Discuss" },
  { tier: "Tier 2", test: "Lipoprotein(a)", category: "Cardiovascular", why: "Confirm assay and units", previous: "76 nmol/L", target: "Risk context", timing: "Once if needed", state: "Discuss" },
  { tier: "Tier 2", test: "Rheumatoid factor, anti-CCP, ESR", category: "Autoimmune", why: "Clarify elevated RF", previous: "RF 29; anti-CCP negative; ESR 2", target: "Clinical", timing: "If clinician directed", state: "Completed" },
  { tier: "Tier 2", test: "Vitamin D, B12, folate, homocysteine", category: "Nutrition", why: "Mildly high homocysteine", previous: "Vit D 63; B12 666; folate 15.5", target: "Homocysteine <8", timing: "Per clinician", state: "Partially completed" },
  { tier: "Tier 2", test: "Repeat DEXA + RMR", category: "Body composition", why: "Lean mass held, VAT falling", previous: "Lean 119.3 lb; VAT 142 cm²", target: "VAT under 100 cm²", timing: "6-12 months", state: "Discuss" },
  { tier: "Tier 2", test: "Regional DEXA T-scores", category: "Bone", why: "Total BMD 2.6% lower", previous: "BMD 1.218; T-score +0.2", target: "Is the change real", timing: "Next DEXA", state: "Discuss" },
]

const MEDICATIONS: {
  name: string
  dose: string
  when: string
  monitor: string
  change?: string
}[] = [
  { name: "Synthroid (levothyroxine)", dose: "100 mcg oral", when: "Daily, early morning", monitor: "TSH, thyroid markers" },
  { name: "Atorvastatin", dose: "10 mg oral", when: "Daily, before bed", monitor: "Lipids, ApoB, liver enzymes", change: "15 mg by Dr. Jones, 10/25/2025" },
  { name: "Tadalafil", dose: "5 mg oral", when: "Daily, midday", monitor: "Blood pressure, sexual function" },
]

const SUPPLEMENTS: { name: string; brand: string; dose: string; when: string }[] = [
  { name: "Ultimate Omega 2X", brand: "Nordic Naturals", dose: "3 softgels", when: "Mid afternoon" },
  { name: "Magnesium glycinate", brand: "Pure Encapsulations", dose: "3 capsules, 360 mg", when: "After dinner" },
  { name: "Berberine", brand: "Thorne", dose: "1 capsule", when: "Late morning" },
  { name: "CuraMed curcumin", brand: "Terry Naturally", dose: "1 capsule, 500 mg", when: "Late morning" },
  { name: "Vitamin D3 + K2", brand: "Microlingual", dose: "5,000 IU + 100 mcg", when: "Midday" },
  { name: "Basic B complex", brand: "Thorne", dose: "1 capsule", when: "Night" },
  { name: "Ubiquinol", brand: "NOW", dose: "1 softgel, 100 mg", when: "Night" },
]

const REPORTS: {
  date: string
  test: string
  finding: string
  priority: "High" | "Monitor" | "Historical"
}[] = [
  { date: "Jun 4, 2026", test: "Home sleep apnea test", finding: "Mild OSA; AHI 5.3, O₂ nadir 85%", priority: "High" },
  { date: "2026", test: "Penile Doppler", finding: "Asymmetric arterial inflow with deformity", priority: "High" },
  { date: "Dec 17, 2024", test: "12-lead ECG", finding: "Rate 65; QTc 430 ms", priority: "Monitor" },
  { date: "Dec 6, 2023", test: "Gene panel 167", finding: "HFE H63D variant", priority: "Historical" },
  { date: "Nov 27, 2023", test: "Carotid duplex", finding: "Minimal plaque, <30% ICA stenosis", priority: "Monitor" },
  { date: "Aug 30, 2023", test: "Echocardiogram", finding: "LVEF 60%; grade I diastolic dysfunction", priority: "Monitor" },
  { date: "2023", test: "Coronary calcium CT", finding: "CAC score 0", priority: "Monitor" },
  { date: "Aug 21, 2023", test: "Thyroid ultrasound", finding: "Stable 4 mm left nodule", priority: "Monitor" },
]

/* ------------------------------------------------------------------ */
/*  Tones                                                               */
/* ------------------------------------------------------------------ */

type Tone = "destructive" | "warning" | "info" | "success" | "secondary"

const STATUS_TONE: Record<Status, Tone> = {
  High: "destructive",
  Low: "destructive",
  Watch: "warning",
  "In range": "info",
  Optimal: "success",
  "Not yet tested": "secondary",
}

const GOOD_TREND = ["Improving", "Improved", "Controlled", "Near goal", "Completed"]
const BAD_TREND = ["Needs improvement", "Slight decline", "Lower", "Slightly high", "Partially completed"]
/* Text levels used on every card, so the eye lands in the same order:
   card title 15px semibold; the thing itself 14px medium; its value 14px
   semibold; details 13px at 70% ink; dates, units and qualifiers 12px grey.
   Colour is kept for what needs action (status badges, bad trends);
   everything that is fine stays grey. */

const dotTone = (t?: string) =>
  !t
    ? "bg-muted-foreground/40"
    : GOOD_TREND.includes(t)
      ? "bg-success"
      : BAD_TREND.includes(t)
        ? "bg-destructive"
        : "bg-muted-foreground/40"

/** A trend or state in quiet text with a coloured dot in front. */
function Trend({ value, fallback = "No trend" }: { value?: string; fallback?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dotTone(value))} />
      {value ?? fallback}
    </span>
  )
}

const GROUP_TITLE: Record<Group, string> = {
  out: "Out of target",
  watch: "On watch",
  untested: "Not yet tested",
}

const fmt = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("en-US") : n.toString()

const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.round(Math.abs(n) * 100) / 100)}`

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function ChartOverview() {
  const [group, setGroup] = React.useState<Group>("out")
  return (
    <div className="flex flex-col gap-3">
      <SummaryCard group={group} onGroup={setGroup} />

      <Row height="xl:grid-rows-[448px]">
        <CategoryScores className="xl:col-span-4" />
        <BodyTrend className="xl:col-span-4" />
        <Forecasts className="xl:col-span-4" />
      </Row>

      <Row height="xl:grid-rows-[440px]">
        <MarkerCard className="xl:col-span-8" group={group} onGroup={setGroup} />
        <VisitAgenda className="xl:col-span-4" />
      </Row>

      <Row height="xl:grid-rows-[380px]">
        <DexaChange className="xl:col-span-6" />
        <Interventions className="xl:col-span-6" />
      </Row>

      <Row height="xl:grid-rows-[420px]">
        <RecommendedTests className="xl:col-span-12" />
      </Row>

      <Row height="xl:grid-rows-[320px]">
        <Medications className="xl:col-span-4" />
        <Supplements className="xl:col-span-4" />
        <ClinicalReports className="xl:col-span-4" />
      </Row>
    </div>
  )
}

/** One row of the grid. At xl every card in it takes the row's height. */
function Row({ height, children }: { height: string; children: React.ReactNode }) {
  return <div className={cn("grid gap-3 xl:grid-cols-12", height)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Card({
  title,
  meta,
  aside,
  children,
  className,
  footer,
}: {
  title: string
  meta?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border bg-card max-xl:max-h-[480px]",
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h3 className="flex min-w-0 items-baseline gap-1.5 text-[15px] font-semibold">
          <span className="truncate">{title}</span>
          {meta && (
            <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
        </h3>
        {aside}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer && (
        <p className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
          {footer}
        </p>
      )}
    </section>
  )
}

/** A table inside a card: sticky grey header, rows at a steady rhythm. */
function CardTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&_td]:py-2.5 [&_td]:align-top [&_td]:leading-5 [&_td_p+p]:leading-4 [&_td:first-child]:pl-3 [&_td:last-child]:pr-3 [&_th]:h-8 [&_th]:bg-card [&_th]:text-xs [&_th]:font-normal [&_th]:text-muted-foreground [&_th:first-child]:pl-3 [&_th:last-child]:pr-3 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:shadow-[inset_0_-1px_0_var(--border)] [&>[data-slot=table-container]]:overflow-visible">
      <Table>{children}</Table>
    </div>
  )
}

/** A list inside a card: 12px side gutter, hairline between entries. */
function List({ children }: { children: React.ReactNode }) {
  return <ul className="px-3">{children}</ul>
}

function ListItem({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      {aside && <div className="shrink-0 pt-0.5">{aside}</div>}
    </li>
  )
}

function Primary({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-5 font-medium">{children}</p>
}

function Detail({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-[18px] text-foreground/70">{children}</p>
  )
}

function Meta({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-4 text-muted-foreground">{children}</p>
}

/** Small segmented control for a card header. */
function Segments<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex shrink-0 gap-0.5 rounded-md bg-muted p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-7 rounded-[5px] px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
            o.id === value && "bg-card font-medium text-foreground shadow-xs"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary                                                             */
/* ------------------------------------------------------------------ */

function ScoreRing({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-[88px] shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          className="stroke-primary"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums">
        {value}%
      </span>
    </div>
  )
}

function SummaryCard({
  group,
  onGroup,
}: {
  group: Group
  onGroup: (g: Group) => void
}) {
  return (
    <section className="grid gap-3 rounded-md border bg-card p-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex items-center gap-4 lg:border-r lg:pr-3">
        <ScoreRing value={PANEL_SCORE} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold">Optimization score</h3>
          <Meta>{TOTAL} markers tracked</Meta>
          <Meta>Updated Aug 14, 2026</Meta>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {SUMMARY.map((s) => (
            <span
              key={s.id}
              className={cn(s.tone, "h-full border-r-2 border-card last:border-r-0")}
              style={{ width: `${(s.count / TOTAL) * 100}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {SUMMARY.map((s) => {
            const active = s.group === group
            const body = (
              <>
                <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <span aria-hidden className={cn("size-2 rounded-full", s.tone)} />
                  {s.label}
                </span>
                <span className="text-2xl leading-8 font-semibold tabular-nums">
                  {s.count}
                </span>
                <span className="text-xs text-muted-foreground">{s.means}</span>
              </>
            )
            const cls = cn(
              "flex h-full flex-col items-start gap-0.5 rounded-md border border-transparent bg-surface-sunken px-3 py-2 text-left",
              active && "border-primary bg-primary-surface"
            )
            return s.group ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onGroup(s.group!)}
                aria-pressed={active}
                className={cn(cls, !active && "transition-colors hover:bg-surface-hover")}
              >
                {body}
              </button>
            ) : (
              <div key={s.id} className={cls}>
                {body}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Row 2                                                               */
/* ------------------------------------------------------------------ */

function CategoryScores({ className }: { className?: string }) {
  return (
    <Card
      className={className}
      title="Score by category"
      meta={`${CATEGORIES.length}`}
    >
      <ul className="px-3 py-1">
        {CATEGORIES.map((c) => (
          <li key={c.name} className="grid grid-cols-[132px_minmax(0,1fr)_40px] items-center gap-3 py-1 leading-[18px]">
            <span className="truncate text-[13px] text-foreground/80">{c.name}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  c.score < 60 ? "bg-destructive/80" : "bg-primary/70"
                )}
                style={{ width: `${Math.max(c.score, 2)}%` }}
              />
            </span>
            <span
              className={cn(
                "text-right text-[13px] font-medium tabular-nums",
                c.score < 60 ? "text-destructive" : "text-foreground"
              )}
            >
              {c.score}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

const bodyConfig = {
  weight: { label: "Weight (lb)", color: "var(--primary)" },
} satisfies ChartConfig

function BodyTrend({ className }: { className?: string }) {
  const first = BODY[0]
  const last = BODY[BODY.length - 1]
  return (
    <Card className={className} title="Weight" meta="Mar 1 to Aug 8, 2026">
      <div className="flex h-full min-h-[260px] flex-col gap-2 p-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Start" value={`${first.weight} lb`} />
          <Stat label="Latest" value={`${last.weight} lb`} />
          <Stat
            label="Change"
            value={`${signed(last.weight - first.weight)} lb`}
            tone="text-success"
          />
        </div>
        <ChartContainer config={bodyConfig} className="aspect-auto min-h-0 w-full flex-1">
          <LineChart data={BODY} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <ReferenceLine
              y={WEIGHT_GOAL}
              stroke="var(--success)"
              strokeDasharray="4 4"
              label={{ value: "Goal 160", position: "insideBottomLeft", fontSize: 11, fill: "var(--success)" }}
            />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis width={36} tickLine={false} axisLine={false} domain={[156, 186]} ticks={[160, 170, 180]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="weight" type="linear" stroke="var(--color-weight)" strokeWidth={1.75} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartContainer>
      </div>
    </Card>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-surface-sunken px-2.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  )
}

function Forecasts({ className }: { className?: string }) {
  return (
    <Card className={className} title="Forecasts" meta="90 day projection">
      <List>
        {FORECASTS.map((f) => (
          <ListItem
            key={f.metric}
            aside={<Trend value={f.status} />}
          >
            <Primary>
              {f.metric}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                {f.current}, goal {f.goal}
              </span>
            </Primary>
            <Meta>
              Projected {f.projection} by {f.by}, {f.confidence.toLowerCase()} confidence
            </Meta>
          </ListItem>
        ))}
      </List>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Row 3                                                               */
/* ------------------------------------------------------------------ */

function MarkerCard({
  className,
  group,
  onGroup,
}: {
  className?: string
  group: Group
  onGroup: (g: Group) => void
}) {
  const rows = MARKERS[group]
  return (
    <Card
      className={className}
      title="Markers"
      meta={`${rows.length}`}
      aside={
        <Segments
          label="Marker group"
          value={group}
          onChange={onGroup}
          options={(Object.keys(GROUP_TITLE) as Group[]).map((g) => ({
            id: g,
            label: GROUP_TITLE[g],
          }))}
        />
      }
    >
      <CardTable>
        <TableHeader>
          <TableRow>
            <TableHead>Biomarker</TableHead>
            <TableHead className="text-right">Latest</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>What to do</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.name}>
              <TableCell>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.category}</p>
              </TableCell>
              <TableCell className="text-right">
                {m.latest ? (
                  <>
                    <p className="text-sm font-semibold tabular-nums">
                      {m.latest}
                      {m.unit && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {m.unit}
                        </span>
                      )}
                    </p>
                    {m.date && <p className="text-xs text-muted-foreground">{m.date}</p>}
                  </>
                ) : (
                  <span className="text-[13px] text-muted-foreground">Not tested</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {m.target}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_TONE[m.status]}>{m.status}</Badge>
              </TableCell>
              <TableCell>
                <Trend value={m.trend} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.tier}</TableCell>
              <TableCell className="min-w-[180px] text-[13px] whitespace-normal text-foreground/70">
                {m.todo}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </CardTable>
    </Card>
  )
}

function VisitAgenda({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<"priorities" | "issues">("priorities")
  return (
    <Card
      className={className}
      title="Next visit"
      aside={
        <Segments
          label="Next visit"
          value={tab}
          onChange={setTab}
          options={[
            { id: "priorities", label: "Priorities" },
            { id: "issues", label: "Issues" },
          ]}
        />
      }
    >
      {tab === "priorities" ? (
        <ol className="px-3">
          {PRIORITIES.map((p, i) => (
            <li key={p.title} className="flex gap-2.5 border-b py-2.5 last:border-b-0">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-surface text-xs font-semibold text-primary tabular-nums">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <Primary>{p.title}</Primary>
                <Meta>Next milestone: {p.next}</Meta>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <List>
          {ISSUES.map((x) => (
            <ListItem
              key={x.issue}
              aside={x.high && <Badge variant="destructive">High</Badge>}
            >
              <Primary>{x.issue}</Primary>
              <Detail>{x.evidence}</Detail>
              <Meta>{x.discuss}</Meta>
            </ListItem>
          ))}
        </List>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Row 4                                                               */
/* ------------------------------------------------------------------ */

function DexaChange({ className }: { className?: string }) {
  const widest = Math.max(...DEXA.map((d) => Math.abs(d.pct ?? 0)))
  return (
    <Card
      className={className}
      title="DEXA and RMR"
      meta="Mar 31 to Aug 4, 2026"
      footer="Scale weight Aug 8: 161 lb. DEXA weight Aug 4: 163.3 lb."
    >
      <CardTable>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Mar 31</TableHead>
            <TableHead className="text-right">Aug 4</TableHead>
            <TableHead className="w-[32%]">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEXA.map((d) => {
            const good = d.status !== "Watch"
            return (
              <TableRow key={d.metric}>
                <TableCell>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {d.metric}
                    {d.status === "Watch" && <Badge variant="warning">Watch</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.read}</p>
                </TableCell>
                <TableCell className="text-right text-[13px] text-muted-foreground tabular-nums">
                  {d.before != null ? fmt(d.before) : "None"}
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums">
                  {fmt(d.after)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{d.unit}</span>
                </TableCell>
                <TableCell>
                  {d.pct != null ? (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", good ? "bg-primary/60" : "bg-warning")}
                          style={{ width: `${(Math.abs(d.pct) / widest) * 100}%` }}
                        />
                      </div>
                      <span className={cn("w-12 text-right text-xs tabular-nums", good ? "text-foreground/70" : "font-medium text-warning")}>
                        {signed(d.pct)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No earlier scan</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </CardTable>
    </Card>
  )
}

function Interventions({ className }: { className?: string }) {
  const active = INTERVENTIONS.filter((i) => i.status !== "Completed").length
  return (
    <Card className={className} title="Interventions" meta={`${active} active`}>
      <List>
        {INTERVENTIONS.map((i) => (
          <ListItem
            key={i.name}
            aside={
              i.status === "Follow up" ? (
                <Badge variant="destructive">Follow up</Badge>
              ) : i.status === "Completed" ? (
                <Trend value="Completed" />
              ) : undefined
            }
          >
            <Primary>
              {i.name}{" "}
            </Primary>
            <Detail>{i.result}</Detail>
            <Meta>
              {i.category}, {i.dose}. Since {i.since}, review {i.review}
            </Meta>
          </ListItem>
        ))}
      </List>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Row 5                                                               */
/* ------------------------------------------------------------------ */

function RecommendedTests({ className }: { className?: string }) {
  const [tier, setTier] = React.useState<"all" | "Tier 1" | "Tier 2">("all")
  const rows = TESTS.filter((t) => tier === "all" || t.tier === tier)
  const open = TESTS.filter((t) => t.state !== "Completed").length
  return (
    <Card
      className={className}
      title="Recommended tests"
      meta={`${open} to discuss`}
      aside={
        <Segments
          label="Tier"
          value={tier}
          onChange={setTier}
          options={[
            { id: "all", label: "All" },
            { id: "Tier 1", label: "Tier 1" },
            { id: "Tier 2", label: "Tier 2" },
          ]}
        />
      }
    >
      <CardTable>
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Why</TableHead>
            <TableHead>Previous finding</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Timing</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.test}>
              <TableCell>
                <p className="text-sm font-medium">{t.test}</p>
                <p className="text-xs text-muted-foreground">{t.category}</p>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.tier}</TableCell>
              <TableCell className="min-w-[200px] text-[13px] whitespace-normal text-foreground/70">
                {t.why}
              </TableCell>
              <TableCell className="min-w-[200px] text-[13px] whitespace-normal text-foreground tabular-nums">
                {t.previous}
              </TableCell>
              <TableCell className="text-xs whitespace-normal text-muted-foreground tabular-nums">
                {t.target}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.timing}</TableCell>
              <TableCell>
                <Trend value={t.state} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </CardTable>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Row 6                                                               */
/* ------------------------------------------------------------------ */

function Medications({ className }: { className?: string }) {
  return (
    <Card className={className} title="Medications" meta={`${MEDICATIONS.length}`}>
      <List>
        {MEDICATIONS.map((m) => (
          <ListItem key={m.name}>
            <Primary>
              {m.name}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">{m.dose}</span>
            </Primary>
            <Detail>{m.when}</Detail>
            <Meta>Monitor: {m.monitor}</Meta>
            {m.change && <Meta>Dosage change: {m.change}</Meta>}
          </ListItem>
        ))}
      </List>
    </Card>
  )
}

function Supplements({ className }: { className?: string }) {
  return (
    <Card className={className} title="Supplements" meta={`${SUPPLEMENTS.length}`}>
      <List>
        {SUPPLEMENTS.map((s) => (
          <ListItem
            key={s.name}
            aside={<span className="text-xs text-muted-foreground">{s.when}</span>}
          >
            <Primary>{s.name}</Primary>
            <Meta>
              {s.brand}, {s.dose}
            </Meta>
          </ListItem>
        ))}
      </List>
    </Card>
  )
}

function ClinicalReports({ className }: { className?: string }) {
  return (
    <Card className={className} title="Clinical reports" meta={`${REPORTS.length}`}>
      <List>
        {REPORTS.map((r) => (
          <ListItem
            key={r.test}
            aside={
              r.priority === "High" ? (
                <Badge variant="destructive">High</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{r.priority}</span>
              )
            }
          >
            <Primary>{r.test}</Primary>
            <Detail>{r.finding}</Detail>
            <Meta>{r.date}</Meta>
          </ListItem>
        ))}
      </List>
    </Card>
  )
}
