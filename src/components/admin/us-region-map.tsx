"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { type Tone, toneFor } from "@/components/admin/adoption-kpis"
import { ChartCard } from "@/components/admin/dashboard-charts"
import {
  type Adoption,
  combineAdoption,
} from "@/components/admin/practice-adoption"
import { US_STATES, US_VIEWBOX } from "@/components/admin/us-states.generated"
import { Progress } from "@/design-system/ui/progress"
import { Separator } from "@/design-system/ui/separator"

/* Enrolment across the country: each state tinted by how the regions in it
   compare with the Inlay average. A region is one or more whole states, or a
   metro inside one (California, Michigan), so a state shows the combined
   enrolment of every region in it. Hover a state for its regions, click it to
   open the region. Beside the map, in the same card, the scope in view:
   its enrolment against the average, rows on track or behind, and the lowest
   three. */

const pct = (r: number) => `${Math.round(r * 100)}%`

/* Which states each region covers. */
export const REGION_STATES: Record<string, string[]> = {
  Arizona: ["AZ"],
  Detroit: ["MI"],
  Florida: ["FL"],
  Hawaii: ["HI"],
  "Mid-Atlantic": ["PA", "NJ", "DE", "MD", "DC", "VA"],
  Midwest: ["IL", "IN", "IA", "KS", "MO", "NE", "OH", "WI"],
  Minnesota: ["MN"],
  "Mountain West": ["CO", "UT", "NV", "NM", "WY", "MT"],
  "New England": ["CT", "MA", "RI", "NH", "VT", "ME"],
  "New York": ["NY"],
  "Northern California": ["CA"],
  "Pacific Northwest": ["WA", "OR", "ID"],
  Southeast: ["GA", "NC", "SC", "TN", "AL", "MS", "LA"],
  "Southeast Michigan": ["MI"],
  "Southern California": ["CA"],
  "Southwest Michigan": ["MI"],
  Texas: ["TX"],
}

type Shade = Tone | "none"

/* Soft fills from the --viz-* tokens, a step stronger on hover. */
const FILL: Record<Shade, string> = {
  good: "color-mix(in oklch, var(--viz-enrolled) 42%, var(--background))",
  watch: "color-mix(in oklch, var(--viz-behind) 60%, var(--background))",
  alert: "color-mix(in oklch, var(--viz-declined) 55%, var(--background))",
  neutral: "var(--viz-track)",
  none: "var(--viz-track)",
}
const FILL_HOVER: Record<Shade, string> = {
  good: "var(--viz-enrolled)",
  watch: "var(--viz-behind)",
  alert: "var(--viz-declined)",
  neutral: "color-mix(in oklch, var(--foreground) 12%, var(--background))",
  none: "color-mix(in oklch, var(--foreground) 8%, var(--background))",
}

const LEGEND: { shade: Shade; label: string }[] = [
  { shade: "good", label: "On track" },
  { shade: "watch", label: "Behind" },
  { shade: "alert", label: "Well behind" },
  { shade: "none", label: "No practices" },
]

const TONE_TEXT: Record<Tone, string> = {
  good: "text-primary",
  watch: "text-warning",
  alert: "text-destructive",
  neutral: "text-muted-foreground",
}

export type MapRegion = {
  name: string
  practices: number
  adoption: Adoption
}

export type MapRow = {
  key: string
  name: string
  rate: number | null
  enrolled: number
  open: number
  onPick: () => void
}

function Dot({ shade }: { shade: Shade }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ background: FILL_HOVER[shade] }}
    />
  )
}

export function UsRegionMap({
  regions,
  scope,
  scopeLabel,
  rows,
  rowNoun,
  average,
  onPickRegion,
}: {
  /** Every region with practices, nationwide, whatever the scope. */
  regions: MapRegion[]
  /** The region in view, or null for all regions. */
  scope: string | null
  scopeLabel: string
  /** The rows the dashboard lists for this scope: regions or practices. */
  rows: MapRow[]
  rowNoun: { one: string; many: string }
  average: number
  onPickRegion: (region: string) => void
}) {
  const box = React.useRef<HTMLDivElement>(null)
  const [hover, setHover] = React.useState<{
    code: string
    x: number
    y: number
  } | null>(null)

  /* Per state: the regions in it and their combined enrolment. */
  const byState = React.useMemo(() => {
    const map = new Map<
      string,
      { regions: MapRegion[]; rate: number | null; shade: Shade }
    >()
    for (const state of US_STATES) {
      const inState = regions.filter((r) =>
        REGION_STATES[r.name]?.includes(state.code)
      )
      if (!inState.length) {
        map.set(state.code, { regions: [], rate: null, shade: "none" })
        continue
      }
      const rate = combineAdoption(inState.map((r) => r.adoption)).rate
      map.set(state.code, {
        regions: [...inState].sort((a, b) => b.practices - a.practices),
        rate,
        shade: rate === null ? "neutral" : toneFor(rate, average),
      })
    }
    return map
  }, [regions, average])

  const inScope = (code: string) =>
    scope === null || (REGION_STATES[scope] ?? []).includes(code)

  function place(code: string, clientX: number, clientY: number) {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ code, x: clientX - rect.left, y: clientY - rect.top })
  }

  function pick(code: string) {
    const top = byState.get(code)?.regions[0]
    if (top) onPickRegion(top.name)
  }

  const hovered = hover ? byState.get(hover.code) : null
  const hoveredState = hover
    ? US_STATES.find((s) => s.code === hover.code)
    : null

  const rated = rows.filter((r) => r.rate !== null)
  const counts = { good: 0, watch: 0, alert: 0 }
  for (const r of rated) {
    const tone = toneFor(r.rate!, average)
    if (tone !== "neutral") counts[tone]++
  }
  const ranked = [...rated].sort((a, b) => a.rate! - b.rate!)
  const lowest = ranked.slice(0, 3)
  /* Top three, never repeating a row already in the lowest list. */
  const highest = ranked.slice(Math.max(3, ranked.length - 3)).reverse()

  /* The scope's combined enrolment, and how far it sits from the average. */
  const enrolled = rows.reduce((n, r) => n + r.enrolled, 0)
  const open = rows.reduce((n, r) => n + r.open, 0)
  const rate = open ? enrolled / open : null
  const gap = rate === null ? null : Math.round((rate - average) * 100)

  return (
    <ChartCard
      title="Enrolment by state"
      /* On wide screens the card fills what is left of the first screen under
         the stat tiles: the map scales to fit, the details never scroll. */
      className="lg:col-span-3 lg:h-[calc(100dvh-18rem)] lg:min-h-[35rem] [&>[data-slot=card-content]]:min-h-0"
      action={
        <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {LEGEND.map((l) => (
            <span key={l.shade} className="flex items-center gap-1.5">
              <Dot shade={l.shade} />
              {l.label}
            </span>
          ))}
        </span>
      }
    >
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div
          ref={box}
          className="relative flex min-h-0 min-w-0 items-center"
          onPointerLeave={() => setHover(null)}
        >
          <svg
            viewBox={US_VIEWBOX}
            className="mx-auto block h-auto w-full lg:h-full"
            role="group"
            aria-label="Enrolment by state"
          >
            <g>
              {US_STATES.map((state) => {
                const info = byState.get(state.code)!
                const on = hover?.code === state.code
                const live = info.regions.length > 0
                return (
                  <path
                    key={state.code}
                    d={state.d}
                    role={live ? "button" : undefined}
                    tabIndex={live ? 0 : undefined}
                    aria-label={
                      live
                        ? `${state.name}, ${info.rate === null ? "no open patients" : `${pct(info.rate)} enrolled`}`
                        : undefined
                    }
                    className={cn(
                      "stroke-background transition-[fill,opacity] duration-150 outline-none",
                      live && "cursor-pointer",
                      !inScope(state.code) && "opacity-35"
                    )}
                    strokeWidth={1}
                    strokeLinejoin="round"
                    style={{
                      fill: on ? FILL_HOVER[info.shade] : FILL[info.shade],
                    }}
                    onPointerMove={(e) =>
                      place(state.code, e.clientX, e.clientY)
                    }
                    onFocus={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      place(
                        state.code,
                        r.left + r.width / 2,
                        r.top + r.height / 2
                      )
                    }}
                    onBlur={() => setHover(null)}
                    onClick={() => pick(state.code)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        pick(state.code)
                      }
                    }}
                  />
                )
              })}
            </g>
            <g
              aria-hidden
              className="pointer-events-none select-none max-sm:hidden"
            >
              {US_STATES.map((state) =>
                state.label ? (
                  <text
                    key={state.code}
                    x={state.label[0]}
                    y={state.label[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "fill-foreground/70 text-[11px] font-medium",
                      !inScope(state.code) && "opacity-35"
                    )}
                  >
                    {state.code}
                  </text>
                ) : null
              )}
            </g>
          </svg>

          {hover && hovered && hoveredState && (
            <div
              className="pointer-events-none absolute z-10 w-64 rounded-lg bg-popover p-3.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
              style={{
                left: `clamp(8rem, ${hover.x}px, calc(100% - 8rem))`,
                top: hover.y,
                transform: "translate(-50%, calc(-100% - 14px))",
              }}
            >
              <div className="text-[13px] font-semibold tracking-tight">
                {hoveredState.name}
              </div>
              {hovered.regions.length === 0 ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  No practices yet
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2.5">
                  {hovered.regions.map((r) => {
                    const a = r.adoption
                    const tone: Tone =
                      a.rate === null ? "neutral" : toneFor(a.rate, average)
                    return (
                      <div key={r.name} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] font-medium">
                            {r.name}
                          </span>
                          <span
                            className={cn(
                              "text-[13px] font-semibold tabular-nums",
                              TONE_TEXT[tone]
                            )}
                          >
                            {a.rate === null ? "No patients" : pct(a.rate)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {r.practices}{" "}
                          {r.practices === 1 ? "practice" : "practices"},{" "}
                          {a.enrolled.toLocaleString("en-US")} of{" "}
                          {a.open.toLocaleString("en-US")} enrolled
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold tracking-tight">
                {scopeLabel}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {rows.length} {rows.length === 1 ? rowNoun.one : rowNoun.many}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Enrolled</span>
                <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
                  {rate === null ? "No patients" : pct(rate)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground tabular-nums">
                <span>
                  {enrolled.toLocaleString("en-US")} of{" "}
                  {open.toLocaleString("en-US")} patients
                </span>
                {gap !== null && (
                  <span
                    className={cn(
                      "font-medium",
                      TONE_TEXT[toneFor(rate!, average)]
                    )}
                  >
                    {gap === 0
                      ? "At the Inlay average"
                      : `${gap > 0 ? "+" : ""}${gap} pts vs Inlay average ${pct(average)}`}
                  </span>
                )}
              </div>
            </div>
            <Progress
              value={rate === null ? 0 : Math.round(rate * 100)}
              aria-label="Enrolled"
              className="[&_[data-slot=progress-track]]:h-1.5"
            />
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["good", "On track"],
                  ["watch", "Behind"],
                  ["alert", "Well behind"],
                ] as const
              ).map(([tone, label]) => (
                <div key={tone} className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                    <Dot shade={tone} />
                    {label}
                  </span>
                  <span className="font-heading text-lg leading-none font-semibold tabular-nums">
                    {counts[tone]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-2 lg:flex-1">
            <RankList
              title="Highest enrolment"
              rows={highest}
              average={average}
            />
            <div className="px-2">
              <Separator />
            </div>
            <RankList
              title="Lowest enrolment"
              rows={lowest}
              average={average}
            />
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

function RankList({
  title,
  rows,
  average,
}: {
  title: string
  rows: MapRow[]
  average: number
}) {
  return (
    /* On wide screens the lists share the column's height, rows spaced evenly. */
    <div className="flex flex-col lg:flex-1">
      <span className="px-2 pt-1.5 pb-1 text-[13px] font-semibold tracking-tight">
        {title}
      </span>
      {rows.length === 0 ? (
        <span className="px-2 pb-1.5 text-xs text-muted-foreground">
          Nothing to rank yet
        </span>
      ) : (
        rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={r.onPick}
            className="flex items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-card lg:flex-1"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {r.name}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {r.enrolled.toLocaleString("en-US")} of{" "}
              {r.open.toLocaleString("en-US")}
            </span>
            <span
              className={cn(
                "w-9 text-right text-[13px] font-semibold tabular-nums",
                TONE_TEXT[toneFor(r.rate!, average)]
              )}
            >
              {pct(r.rate!)}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
