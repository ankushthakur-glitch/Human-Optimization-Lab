"use client"

import * as React from "react"
import { IconCheck, IconRefresh } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { createCollection, today } from "@/components/practice/collection-store"
import { type Patient } from "@/components/practice/practice-data"
import {
  SOFT_DOT,
  SOFT_TEXT,
} from "@/components/patient-dashboard/widgets/charting-dashboard"
import {
  SUBTLE,
  type ToneKey,
} from "@/components/patient-dashboard/widgets/palette"
import { ReAreaChart, Sparkline } from "@/components/dashboard-kit-v2"
import { ME, atLabel, nowAt } from "@/components/provider/chart-epic"
import { Button } from "@/design-system/ui/button"
import { Progress } from "@/design-system/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"
import { toast } from "@/design-system/ui/sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Textarea } from "@/design-system/ui/textarea"

/* Every 13 weeks the physician looks back at how the patient is doing on
   the care plan: how closely each of the six steps was followed, how the
   markers behind the plan moved, how the patient's three bothersome
   symptoms rate now, and the weight. The physician closes the quarter with
   an outcome and a note, or opens Edit plan when it needs changes. */

/* -------------------------------------------------------------- model -- */

const QUARTER_DAYS = 91

type StepProgress = {
  step: string
  /** How much of the step was done, 0 to 100. */
  done: number
  detail: string
}

type MarkerChange = {
  name: string
  unit: string
  start: number
  now: number
  low?: number
  high?: number
}

/** Re-rated every week, 0 to 10, 10 the most bothersome. */
type SymptomChange = { name: string; start: number; now: number }

type QuarterData = {
  quarter: number
  daysLogged: number
  /** Week by week, 13 weeks: how much of the plan was followed (0 to
      100) and the weight in lb. */
  weeks: { followed: number[]; weight: number[] }
  steps: StepProgress[]
  markers: MarkerChange[]
  symptoms: SymptomChange[]
}

const OUTCOMES = ["On track", "Needs changes"] as const
type Outcome = (typeof OUTCOMES)[number]

export type QuarterReview = {
  /** "P10318/1": the patient's id and the quarter. */
  id: string
  outcome: Outcome
  note: string
  by: string
  at: string
}

/* --------------------------------------------------------------- seed -- */

const DATA: Record<string, QuarterData[]> = {
  P10240: [
    {
      quarter: 1,
      daysLogged: 78,
      weeks: {
        followed: [64, 70, 74, 76, 73, 79, 82, 79, 84, 86, 84, 90, 86],
        weight: [196, 195.4, 194.9, 194.6, 193.8, 193.1, 192.7, 191.9, 191.2, 190.6, 189.8, 189.1, 188.4],
      },
      steps: [
        { step: "Exercise", done: 72, detail: "Strength 2.2 of 3 days a week, 7,400 steps a day" },
        { step: "Eat", done: 64, detail: "Protein goal met 4 of 7 days, alcohol within limit 10 of 13 weeks" },
        { step: "Sleep", done: 81, detail: "6 h 50 min a night, bedtime within 30 minutes 5 of 7 nights" },
        { step: "Mind", done: 88, detail: "Checked in 79 of 90 days" },
        { step: "Medication", done: 96, detail: "Atorvastatin taken 86 of 90 nights" },
        { step: "Measure", done: 70, detail: "Weighed in 31 of 45 times, waist 5 of 6 times" },
      ],
      markers: [
        { name: "LDL", unit: "mg/dL", start: 162, now: 131, high: 99 },
        { name: "Triglycerides", unit: "mg/dL", start: 188, now: 152, high: 149 },
        { name: "BMI", unit: "", start: 32.4, now: 31.1, low: 18.5, high: 24.9 },
      ],
      symptoms: [
        { name: "Low energy", start: 7, now: 4 },
        { name: "Poor sleep", start: 6, now: 4 },
        { name: "Joint pain", start: 5, now: 5 },
      ],
    },
  ],
  P10318: [
    {
      quarter: 1,
      daysLogged: 84,
      weeks: {
        followed: [66, 70, 72, 74, 71, 76, 78, 74, 77, 79, 76, 80, 82],
        weight: [214.6, 214.2, 213.9, 213.1, 212.8, 212.4, 211.9, 211.5, 211, 210.8, 210.3, 210.1, 209.8],
      },
      steps: [
        { step: "Exercise", done: 58, detail: "Strength 2.3 of 4 days a week, 6,100 steps a day" },
        { step: "Eat", done: 74, detail: "Protein goal met 5 of 7 days" },
        { step: "Sleep", done: 62, detail: "CPAP worn all night 56 of 91 nights" },
        { step: "Mind", done: 80, detail: "Checked in 73 of 91 days" },
        { step: "Medication", done: 90, detail: "Vitamin D taken 82 of 91 days" },
        { step: "Measure", done: 85, detail: "Weighed in 11 of 13 weeks" },
      ],
      markers: [
        { name: "Lean mass", unit: "kg", start: 58.0, now: 58.3, low: 61 },
        { name: "Vitamin D", unit: "ng/mL", start: 24, now: 31, low: 30, high: 100 },
      ],
      symptoms: [
        { name: "Daytime sleepiness", start: 8, now: 6 },
        { name: "Low energy", start: 7, now: 6 },
        { name: "Back pain", start: 4, now: 3 },
      ],
    },
    {
      quarter: 2,
      daysLogged: 80,
      weeks: {
        followed: [80, 82, 81, 84, 85, 83, 86, 85, 87, 86, 88, 89, 89],
        weight: [209.8, 209.3, 208.9, 208.2, 207.8, 207.3, 206.9, 206.2, 205.8, 205.4, 204.9, 204.5, 204.1],
      },
      steps: [
        { step: "Exercise", done: 79, detail: "Strength 3.2 of 4 days a week, 7,300 steps a day" },
        { step: "Eat", done: 82, detail: "Protein goal met 6 of 7 days" },
        { step: "Sleep", done: 84, detail: "CPAP worn all night 76 of 87 nights" },
        { step: "Mind", done: 76, detail: "Checked in 66 of 87 days" },
        { step: "Medication", done: 94, detail: "Vitamin D taken 82 of 87 days" },
        { step: "Measure", done: 92, detail: "Weighed in 12 of 13 weeks, DEXA booked" },
      ],
      markers: [
        { name: "Lean mass", unit: "kg", start: 58.3, now: 59.4, low: 61 },
        { name: "Vitamin D", unit: "ng/mL", start: 31, now: 38, low: 30, high: 100 },
      ],
      symptoms: [
        { name: "Daytime sleepiness", start: 6, now: 3 },
        { name: "Low energy", start: 6, now: 4 },
        { name: "Back pain", start: 3, now: 3 },
      ],
    },
  ],
}

export const quarterReviews = createCollection<QuarterReview>(
  "hol-quarterly-reviews",
  [
    {
      id: "P10318/1",
      outcome: "Needs changes",
      note: "CPAP use is the gap. Asked Marcus to wear it every night and dropped strength to 3 days a week until the routine holds. Vitamin D back in range.",
      by: ME,
      at: shiftDate(-87, "16:10"),
    },
  ],
  "v1"
)

/* -------------------------------------------------------------- dates -- */

function shiftDate(days: number, time: string) {
  return `${addDays(today(), days)}T${time}`
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

function daysBetween(from: string, to: string) {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

/** "10/27/2026" from "2026-10-27". */
function dateLabel(date: string) {
  const [y, m, d] = date.split("-")
  return `${m}/${d}/${y}`
}

/** The quarters from the plan's start up to the one running today. */
function quartersOf(started: string) {
  const elapsed = Math.max(0, daysBetween(started, today()))
  const count = Math.floor(elapsed / QUARTER_DAYS) + 1
  return Array.from({ length: count }, (_, i) => ({
    quarter: i + 1,
    from: addDays(started, i * QUARTER_DAYS),
    to: addDays(started, (i + 1) * QUARTER_DAYS - 1),
    due: addDays(started, (i + 1) * QUARTER_DAYS),
  }))
}

/* --------------------------------------------------------------- view -- */

/** A smooth sample path from `from` to `to` in `n` steps, with a little
    week to week wobble, for the seeded trends. */
function glide(from: number, to: number, n: number, digits = 0) {
  const wobble = [0, 0.4, -0.3, 0.5, -0.2, 0.3, -0.4, 0.2, 0.4, -0.3, 0.2, -0.1, 0]
  const k = 10 ** digits
  /* No wobble on a series that barely moved, so "Same" draws flat. */
  const amp = Math.min(1, Math.abs(to - from) / 3)
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return from
    if (i === n - 1) return to
    const v = from + ((to - from) * i) / (n - 1) + amp * wobble[i % wobble.length]
    return Math.round(v * k) / k
  })
}

const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "")

const signed = (v: number) => `${v > 0 ? "+" : ""}${fmt(+v.toFixed(1))}`

const stepTone = (done: number): ToneKey =>
  done >= 80 ? "green" : done >= 60 ? "orange" : "red"

const stepWord = (done: number) =>
  done >= 80 ? "On track" : done >= 60 ? "Behind" : "Off track"

const markerFlag = (m: { low?: number; high?: number }, v: number) =>
  m.high !== undefined && v > m.high
    ? "High"
    : m.low !== undefined && v < m.low
      ? "Low"
      : null

export function QuarterlyReview({
  patient,
  started,
  onEditPlan,
  onReviewed,
}: {
  patient: Patient
  /** The plan's first day, "2026-07-29". */
  started: string
  onEditPlan: () => void
  /** Called once the physician closes a quarter. */
  onReviewed: (review: QuarterReview, quarter: number) => void
}) {
  const { items } = quarterReviews.use()
  const quarters = quartersOf(started)
  const data = DATA[patient.id] ?? []
  /* Open on the oldest quarter still waiting for a review, else the latest. */
  const open = quarters.find(
    (q) =>
      data.some((d) => d.quarter === q.quarter) &&
      !items.some((r) => r.id === `${patient.id}/${q.quarter}`)
  )
  const [picked, setPicked] = React.useState<number | null>(null)
  const quarter =
    quarters.find((q) => q.quarter === picked) ??
    open ??
    quarters[quarters.length - 1]
  const qData = data.find((d) => d.quarter === quarter.quarter)
  const review = items.find((r) => r.id === `${patient.id}/${quarter.quarter}`)
  const left = daysBetween(today(), quarter.due)

  return (
    <div className="flex flex-col gap-3">
      {quarters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {quarters.map((q) => (
            <Button
              key={q.quarter}
              size="xs"
              variant={q.quarter === quarter.quarter ? "outline" : "ghost"}
              className={cn(
                "rounded-full",
                q.quarter === quarter.quarter
                  ? "bg-card font-semibold"
                  : "text-muted-foreground"
              )}
              onClick={() => setPicked(q.quarter)}
            >
              Quarter {q.quarter}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-card px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="text-sm font-semibold">
            Quarter {quarter.quarter} review
          </div>
          <Dot
            tone={review ? "green" : left < 0 ? "red" : left <= 7 ? "orange" : undefined}
            word={
              review
                ? "Reviewed"
                : left < 0
                  ? `Overdue by ${-left} ${-left === 1 ? "day" : "days"}`
                  : left === 0
                    ? "Due today"
                    : `Due in ${left} ${left === 1 ? "day" : "days"}`
            }
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] tabular-nums">
          <Fact label="Period">
            {dateLabel(quarter.from)} to {dateLabel(quarter.to)}
          </Fact>
          <Fact label="Due">{dateLabel(quarter.due)}</Fact>
          {qData && (
            <Fact label="Days logged">
              {qData.daysLogged} of {QUARTER_DAYS}
            </Fact>
          )}
        </div>
      </div>

      {qData ? (
        <>
          <Summary data={qData} />
          <div className="grid gap-3 lg:grid-cols-2">
            <WeeklyChart
              title="Plan followed"
              meta="By week, goal 80%"
              values={qData.weeks.followed}
              unit="%"
              goal={80}
              domain={[0, 100]}
            />
            <WeeklyChart
              title="Weight"
              meta="By week, lb"
              values={qData.weeks.weight}
              unit=" lb"
              color={SUBTLE.blue}
            />
          </div>
          <StepsCard steps={qData.steps} />
          <div className="grid gap-3 xl:grid-cols-2">
            <MarkersCard markers={qData.markers} />
            <SymptomsCard symptoms={qData.symptoms} />
          </div>
          {review ? (
            <ReviewDone review={review} />
          ) : (
            <ReviewForm
              key={quarter.quarter}
              patient={patient}
              quarter={quarter.quarter}
              onEditPlan={onEditPlan}
              onReviewed={onReviewed}
            />
          )}
        </>
      ) : (
        <p className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          {patient.firstName}&apos;s progress for this quarter shows here
          as the app reports it.
        </p>
      )}
    </div>
  )
}

function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span>
      <span className="text-muted-foreground">{label} : </span>
      {children}
    </span>
  )
}

function Dot({ tone, word }: { tone?: ToneKey; word: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px]">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone ? SOFT_DOT[tone] : "bg-muted-foreground/40"
        )}
      />
      <span
        className={cn(
          "font-medium",
          tone ? SOFT_TEXT[tone] : "text-muted-foreground"
        )}
      >
        {word}
      </span>
    </span>
  )
}

function CardTitle({
  title,
  meta,
}: {
  title: string
  meta?: string
}) {
  return (
    <header className="flex items-baseline gap-2 border-b px-4 py-2">
      <h4 className="text-[15px] font-semibold">{title}</h4>
      {meta && (
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {meta}
        </span>
      )}
    </header>
  )
}

/* Four numbers first: the quarter at a glance. */
function Summary({ data }: { data: QuarterData }) {
  const followed = Math.round(
    data.steps.reduce((s, x) => s + x.done, 0) / data.steps.length
  )
  const w = data.weeks.weight
  const weight = w[w.length - 1] - w[0]
  const better = data.symptoms.filter((s) => s.now < s.start).length
  const inRange = data.markers.filter((m) => !markerFlag(m, m.now)).length
  const cells = [
    {
      label: "Plan followed",
      value: `${followed}%`,
      tone: stepTone(followed),
      word: stepWord(followed),
    },
    {
      label: "Weight",
      value: `${signed(weight)} lb`,
      tone: weight < 0 ? ("green" as const) : undefined,
      word: `${fmt(w[w.length - 1])} lb now`,
    },
    {
      label: "Symptoms better",
      value: `${better} of ${data.symptoms.length}`,
      tone: better ? ("green" as const) : undefined,
      word: better ? "Rated lower" : "No change",
    },
    {
      label: "Markers in range",
      value: `${inRange} of ${data.markers.length}`,
      tone: inRange === data.markers.length ? ("green" as const) : ("red" as const),
      word:
        inRange === data.markers.length
          ? "All in range"
          : `${data.markers.length - inRange} out of range`,
    },
  ]
  return (
    <div className="grid grid-cols-2 divide-x divide-y rounded-lg border bg-card lg:grid-cols-4 lg:divide-y-0">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col gap-1 px-4 py-3">
          <span className="text-xs text-muted-foreground">{c.label}</span>
          <span className="text-xl font-semibold tabular-nums">{c.value}</span>
          <Dot tone={c.tone} word={c.word} />
        </div>
      ))}
    </div>
  )
}

function StepsCard({ steps }: { steps: StepProgress[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title="How each step went" />
      <ul className="divide-y">
        {steps.map((s) => (
          <li
            key={s.step}
            className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm md:grid-cols-[96px_160px_minmax(0,1fr)_96px]"
          >
            <span className="font-medium">{s.step}</span>
            <span className="flex items-center gap-2">
              <Progress
                value={s.done}
                aria-label={`${s.step} followed`}
                className="flex-1 [&_[data-slot=progress-track]]:h-1.5"
              />
              <span className="w-9 text-right text-[13px] tabular-nums">
                {s.done}%
              </span>
            </span>
            <span className="col-span-2 text-[13px] text-foreground/80 md:col-span-1">
              {s.detail}
            </span>
            <span className="col-span-2 md:col-span-1 md:justify-self-end">
              <Dot tone={stepTone(s.done)} word={stepWord(s.done)} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MarkersCard({ markers }: { markers: MarkerChange[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title="Markers behind the plan" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Marker</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Now</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markers.map((m) => {
            const flag = markerFlag(m, m.now)
            return (
              <TableRow key={m.name}>
                <TableCell className="pl-4 font-medium">{m.name}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {fmt(m.start)}
                </TableCell>
                <TableCell
                  className={cn("tabular-nums font-medium", flag && SOFT_TEXT.red)}
                >
                  {fmt(m.now)}
                  {m.unit && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {m.unit}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {signed(m.now - m.start)}
                </TableCell>
                <TableCell>
                  <Sparkline
                    values={glide(m.start, m.now, 4, 1)}
                    low={m.low}
                    high={m.high}
                    latest={flag ? "out" : "neutral"}
                    width={72}
                    label={`${m.name} this quarter`}
                  />
                </TableCell>
                <TableCell className="pr-4">
                  <Dot tone={flag ? "red" : "green"} word={flag ?? "In range"} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

/* One measure across the quarter's 13 weeks, with the goal dashed. */
function WeeklyChart({
  title,
  meta,
  values,
  unit,
  goal,
  domain,
  color = "var(--primary)",
}: {
  title: string
  meta: string
  values: number[]
  unit: string
  goal?: number
  domain?: [number, number]
  color?: string
}) {
  const lo = Math.floor(Math.min(...values)) - 1
  const hi = Math.ceil(Math.max(...values)) + 1
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title={title} meta={meta} />
      <div className="px-2 pt-2 pb-1">
        <ReAreaChart
          data={values.map((value, i) => ({ week: `W${i + 1}`, value }))}
          xKey="week"
          series={[{ key: "value", label: title, color }]}
          curve="monotone"
          dots="dot"
          height={180}
          showYAxis
          yDomain={domain ?? [lo, hi]}
          baseValue="dataMin"
          referenceY={goal !== undefined ? { value: goal, label: "Goal" } : undefined}
          tooltipLabel={(w) => `Week ${String(w).slice(1)}`}
          valueFormat={(v) => `${fmt(v)}${unit}`}
        />
      </div>
    </section>
  )
}

function SymptomsCard({ symptoms }: { symptoms: SymptomChange[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title="Bothersome symptoms" meta="Rated 0 to 10" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Symptom</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Now</TableHead>
            <TableHead>By week</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {symptoms.map((s) => {
            const delta = s.now - s.start
            return (
              <TableRow key={s.name}>
                <TableCell className="pl-4 font-medium">{s.name}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {s.start}
                </TableCell>
                <TableCell className="tabular-nums font-medium">{s.now}</TableCell>
                <TableCell>
                  <Sparkline
                    values={glide(s.start, s.now, 13)}
                    high={6}
                    width={72}
                    label={`${s.name} by week`}
                  />
                </TableCell>
                <TableCell className="pr-4">
                  <Dot
                    tone={delta < 0 ? "green" : delta > 0 ? "red" : undefined}
                    word={delta < 0 ? "Better" : delta > 0 ? "Worse" : "Same"}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

/* The physician's close of the quarter: an outcome and a note. */
function ReviewForm({
  patient,
  quarter,
  onEditPlan,
  onReviewed,
}: {
  patient: Patient
  quarter: number
  onEditPlan: () => void
  onReviewed: (review: QuarterReview, quarter: number) => void
}) {
  const [outcome, setOutcome] = React.useState<Outcome>("On track")
  const [note, setNote] = React.useState("")

  const complete = () => {
    const review: QuarterReview = {
      id: `${patient.id}/${quarter}`,
      outcome,
      note: note.trim(),
      by: ME,
      at: nowAt(),
    }
    quarterReviews.add([review])
    onReviewed(review, quarter)
    toast.success(`Quarter ${quarter} review completed`, {
      description: `${patient.firstName}: ${outcome.toLowerCase()}.`,
    })
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title="Your review" />
      <div className="flex flex-col gap-3 px-4 py-3">
        <RadioGroup
          aria-label="Outcome"
          value={outcome}
          onValueChange={(v) => setOutcome(v as Outcome)}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {OUTCOMES.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={o} />
              {o}
            </label>
          ))}
        </RadioGroup>
        <Textarea
          aria-label="Review note"
          placeholder="How is the patient doing?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-20"
        />
        <div className="flex flex-wrap justify-end gap-2">
          {outcome === "Needs changes" && (
            <Button variant="outline" size="sm" onClick={onEditPlan}>
              <IconRefresh />
              Revise plan
            </Button>
          )}
          <Button size="sm" onClick={complete}>
            <IconCheck />
            Complete review
          </Button>
        </div>
      </div>
    </section>
  )
}

function ReviewDone({ review }: { review: QuarterReview }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <CardTitle title="Physician review" />
      <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
        <div className="flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
          <Fact label="Outcome">
            <span
              className={cn(
                "font-medium",
                review.outcome === "On track" ? SOFT_TEXT.green : SOFT_TEXT.orange
              )}
            >
              {review.outcome}
            </span>
          </Fact>
          <Fact label="Reviewed by">{review.by}</Fact>
          <Fact label="Reviewed on">{atLabel(review.at)}</Fact>
        </div>
        {review.note && (
          <p className="text-sm leading-5 text-foreground/85">{review.note}</p>
        )}
      </div>
    </section>
  )
}
