"use client"

import * as React from "react"
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { FireIcon, FootprintsIcon, HeartCheckIcon, Moon02Icon } from "@hugeicons/core-free-icons"

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { AXIS_PROPS, Grid, Legend, useReducedMotion } from "@/components/dashboard-kit-v2"
import { fmt, markerByName, numericHistory } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, EnergyDay, WearableDay } from "@/components/patient-dashboard/optimization/types"
import { BAR_GAP, Headline } from "@/components/patient-dashboard/widgets/bars"
import { SUBTLE, Widget } from "@/components/patient-dashboard/widgets/kit"

/* The optimization member's program charts, two per program. Weight
   loss: is the patient in a calorie deficit (food log against the watch's
   burn) and are they sleeping enough to recover (the top priority
   intervention is mild sleep apnea). Diabetes control: are the lipids
   that drive diabetic heart risk improving (triglycerides over time, the
   triglyceride to HDL ratio, small LDL) and is the patient moving enough
   each day (steps against the plan's target). Intake and burn take the validated teal and blue pair. */

const INTAKE = "#009688"
const BURN = "#5598e7"
const SLEEP_TARGET = 7
const STEP_TARGET = 7000

const shortDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

/* ---------------------------------------------------- energy balance -- */

export function EnergyBalance({ days }: { days: EnergyDay[] }) {
  const reduced = useReducedMotion()
  const data = days.map((d) => ({ ...d, day: shortDay(d.date) }))
  const deficit = days.length ? Math.round(days.reduce((n, d) => n + d.burn - d.intake, 0) / days.length) : 0
  const config = {
    intake: { label: "Eaten", color: INTAKE },
    burn: { label: "Burned", color: BURN },
  } satisfies ChartConfig
  return (
    <Widget icon={FireIcon} title="Energy balance, last 7 logged days">
      <div className="flex h-full flex-col gap-4">
        <Headline
          value={deficit.toLocaleString()}
          unit={deficit >= 0 ? "kcal a day under burn" : "kcal a day over burn"}
        />
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 4, top: 4 }} barGap={2} barCategoryGap="24%">
            <Grid />
            <XAxis dataKey="day" {...AXIS_PROPS} interval={0} />
            <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v) => Number(v).toLocaleString()} />
            <ChartTooltip cursor={{ fill: "var(--surface-row-hover)" }} content={<ChartTooltipContent />} />
            <Bar dataKey="intake" fill="var(--color-intake)" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
            <Bar dataKey="burn" fill="var(--color-burn)" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
          </BarChart>
        </ChartContainer>
        <Legend
          items={[
            { key: "intake", label: "Eaten", color: INTAKE },
            { key: "burn", label: "Burned", color: BURN },
          ]}
        />
      </div>
    </Widget>
  )
}

/* ------------------------------------------------- sleep and recovery -- */

export function SleepNights({ days, device }: { days: WearableDay[]; device: string }) {
  const reduced = useReducedMotion()
  const data = days.map((d) => ({ ...d, day: shortDay(d.date), short: d.sleepHours < SLEEP_TARGET }))
  const avg = (pick: (d: WearableDay) => number) =>
    days.length ? days.reduce((n, d) => n + pick(d), 0) / days.length : 0
  const config = { sleepHours: { label: "Sleep (h)", color: SUBTLE.green } } satisfies ChartConfig
  return (
    <Widget icon={Moon02Icon} title="Sleep and recovery, last 7 nights">
      <div className="flex h-full flex-col gap-4">
        <Headline
          value={fmt(avg((d) => d.sleepHours), 1)}
          unit="h average sleep"
        />
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 4, top: 4 }} barCategoryGap="28%">
            <Grid />
            <XAxis dataKey="day" {...AXIS_PROPS} interval={0} />
            <YAxis {...AXIS_PROPS} width={32} domain={[0, 9]} ticks={[0, 3, 6, 9]} />
            <ReferenceLine
              y={SLEEP_TARGET}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{ value: `${SLEEP_TARGET} h`, position: "insideTopLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--surface-row-hover)" }}
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(_, __, item) => (
                    <span className="flex flex-col gap-0.5 tabular-nums">
                      <span className="font-medium text-foreground">{item.payload.sleepHours} h sleep</span>
                      <span className="text-muted-foreground">
                        HRV {item.payload.hrv} ms · resting HR {item.payload.restingHr} bpm
                      </span>
                      <span className="text-muted-foreground">{item.payload.steps.toLocaleString()} steps</span>
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="sleepHours" radius={[4, 4, 0, 0]} {...BAR_GAP} isAnimationActive={!reduced}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.short ? SUBTLE.orange : SUBTLE.green} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Legend
            items={[
              { key: "ok", label: `${SLEEP_TARGET} h or more`, color: SUBTLE.green },
              { key: "short", label: `Under ${SLEEP_TARGET} h`, color: SUBTLE.orange },
            ]}
          />
          <span className="text-xs text-muted-foreground">{device}</span>
        </div>
      </div>
    </Widget>
  )
}

/* ------------------------------------------------------ heart risk -- */

const monthYear = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })

/** Diabetes doubles heart risk, so the lipids insulin resistance moves:
    triglycerides over time against the target, then the triglyceride to
    HDL ratio and small LDL particles. */
export function HeartRisk({ markers }: { markers: Biomarker[] }) {
  const reduced = useReducedMotion()
  const tg = markerByName(markers, "Triglycerides")
  const history = tg ? numericHistory(tg) : []
  const last = history[history.length - 1]
  const target = tg?.targetHigh
  const data = history.map((p) => ({ date: p.date, label: monthYear(p.date), tg: p.n }))
  const config = { tg: { label: "Triglycerides", color: SUBTLE.green } } satisfies ChartConfig
  const rows = [
    { name: "Triglyceride:HDL Ratio (calculated)", label: "Triglyceride to HDL ratio", unit: "" },
    { name: "LDL Small", label: "Small LDL particles", unit: " nmol/L" },
  ].flatMap((r) => {
    const b = markerByName(markers, r.name)
    return b ? [{ ...r, b }] : []
  })
  return (
    <Widget icon={HeartCheckIcon} title="Lipids and heart risk">
      <div className="flex h-full flex-col gap-4">
        <Headline
          value={last ? fmt(last.n) : "None"}
          unit="mg/dL triglycerides"
        />
        <ChartContainer config={config} className="aspect-auto h-[160px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <Grid />
            <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" />
            <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
            {target !== undefined && (
              <ReferenceLine
                y={target}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{ value: `${target}`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
              />
            )}
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Line
              type="monotone"
              dataKey="tg"
              stroke="var(--color-tg)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { date: string; tg: number } }
                const over = target !== undefined && payload.tg > target
                return <circle key={payload.date} cx={cx} cy={cy} r={3} fill={over ? SUBTLE.red : SUBTLE.green} />
              }}
              isAnimationActive={!reduced}
            />
          </LineChart>
        </ChartContainer>
        <ul className="mt-auto flex flex-col border-t pt-1 text-[13px]">
          {rows.map(({ label, unit, b }) => {
            const out = b.status === "High" || b.status === "Low"
            return (
              <li key={b.name} className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium">{label}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {b.latest?.value ? `${b.latest.value}${unit}` : "Not yet tested"}
                  <span className={out ? "text-xs font-medium text-destructive" : "text-xs font-medium text-success"}>
                    {out ? b.status : "In target"}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Widget>
  )
}

/* -------------------------------------------------------- daily steps -- */

/** Steps a day from the wearable against the activity target: moving
    after meals is the plan's main lever on glucose. */
export function DailySteps({ days, device }: { days: WearableDay[]; device: string }) {
  const reduced = useReducedMotion()
  const data = days.map((d) => ({ ...d, day: shortDay(d.date), met: d.steps >= STEP_TARGET }))
  const avg = days.length ? Math.round(days.reduce((n, d) => n + d.steps, 0) / days.length) : 0
  const config = { steps: { label: "Steps", color: SUBTLE.green } } satisfies ChartConfig
  return (
    <Widget icon={FootprintsIcon} title="Daily steps, last 7 days">
      <div className="flex h-full flex-col gap-4">
        <Headline
          value={avg.toLocaleString()}
          unit="steps a day"
        />
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 4, top: 4 }} barCategoryGap="28%">
            <Grid />
            <XAxis dataKey="day" {...AXIS_PROPS} interval={0} />
            <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v) => Number(v).toLocaleString()} />
            <ReferenceLine
              y={STEP_TARGET}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{ value: STEP_TARGET.toLocaleString(), position: "insideTopLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip cursor={{ fill: "var(--surface-row-hover)" }} content={<ChartTooltipContent hideIndicator />} />
            <Bar dataKey="steps" radius={[4, 4, 0, 0]} {...BAR_GAP} isAnimationActive={!reduced}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.met ? SUBTLE.green : SUBTLE.orange} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Legend
            items={[
              { key: "met", label: `${STEP_TARGET.toLocaleString()} or more`, color: SUBTLE.green },
              { key: "under", label: `Under ${STEP_TARGET.toLocaleString()}`, color: SUBTLE.orange },
            ]}
          />
          <span className="text-xs text-muted-foreground">{device}</span>
        </div>
      </div>
    </Widget>
  )
}
