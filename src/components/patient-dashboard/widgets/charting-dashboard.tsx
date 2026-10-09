"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  Calendar03Icon,
  ChartLineData01Icon,
  AmbulanceIcon,
  Apple01Icon,
  Bone01Icon,
  BrainIcon,
  BloodPressureIcon,
  ClipboardIcon,
  DentalToothIcon,
  DropletIcon,
  EyeIcon,
  FavouriteIcon,
  File01Icon,
  InjectionIcon,
  KidneysIcon,
  LiverIcon,
  LungsIcon,
  MicroscopeIcon,
  Moon02Icon,
  Stethoscope02Icon,
  WeightScaleIcon,
  WorkoutRunIcon,
  XRayIcon,
  PlusSignIcon,
  StarIcon,
  Tick02Icon,
  Hospital01Icon,
  Leaf01Icon,
  Notification03Icon,
  PillIcon,
  Target02Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { toast } from "@/design-system/ui/sonner"
import {
  HoverCard,
  HoverCardContent,
  HoverCardSection,
  HoverCardTrigger,
  createHoverCardHandle,
} from "@/design-system/ui/hover-card"
import {
  FOCUS,
  type IconDef,
  KitIcon,
  SidePanel,
  StatusTrace,
  statusSeries,
} from "@/components/dashboard-kit-v2"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import type {
  Optimization,
  OptimizationModel,
} from "@/components/patient-dashboard/optimization/model"
import {
  doseText,
  shortSource,
  statusOf,
  type MedCase,
} from "@/components/patient-dashboard/rules"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import {
  CardSkeleton,
  type OpenSection,
  Quiet,
} from "@/components/patient-dashboard/ui"
import {
  DotTrend,
  type Marker,
} from "@/components/patient-dashboard/widgets/changes-dashboard"
import {
  GROUP_TONE,
  type Group,
  type Row,
  type Subject,
  day,
  plural,
  unitText,
  useDecisionView,
} from "@/components/patient-dashboard/widgets/decision-dashboard"
import { SUBTLE, TYPE_SCALE } from "@/components/patient-dashboard/widgets/kit"
import { type ToneKey } from "@/components/patient-dashboard/widgets/palette"
import {
  PeekChart,
  monotone,
  monthYear,
  timeScale,
} from "@/components/patient-dashboard/widgets/peek-chart"
import { Pill } from "@/components/patient-dashboard/widgets/status"

/* The patient chart's dashboard, from the client's CareMap reference (7
   and 9 Oct): white cards on the lab viewer's grey, full colour icons,
   count badges and status pills.
   - Clicking a row opens its detail in the side modal; nothing is docked.
   - Every graph shows all its dots with their values, and the line takes
     the colour of each reading's band (green in range, amber near the edge,
     red out), so a worsening run reads as a green to red gradient.
   - Out of range zones are shaded on the panel chart with their limit, as
     the reference marks the CKD stage 3 line.
   - Panels add related markers (a missing one is an amber gap), the events
     that bear on a result, and for a medication change what has not been
     repeated since.
   Medications and orders show only when something changed or is open.
   Subjects come from useDecisionView; sentence case, no dark header
   blocks, teal actions. */

/* ------------------------------------------------------------- colours -- */

/* The subtle status colours (the charts' SUBTLE set): dots and lines take
   them as they are; words take them a step darker so they stay readable.
   The cards and rows use the CareMap colours (POP) below; these stay for
   the charts, the panel and the peek card. */
export const SOFT_DOT: Record<ToneKey, string> = {
  red: "bg-[#DE6F68]",
  orange: "bg-[#EB9A52]",
  violet: "bg-[#9C86E6]",
  green: "bg-[#5FB386]",
  blue: "bg-[#6E9CE8]",
}
export const SOFT_TEXT: Record<ToneKey, string> = {
  red: "text-[color-mix(in_oklab,#DE6F68_72%,var(--foreground))]",
  orange: "text-[color-mix(in_oklab,#EB9A52_68%,var(--foreground))]",
  violet: "text-[color-mix(in_oklab,#9C86E6_72%,var(--foreground))]",
  green: "text-[color-mix(in_oklab,#5FB386_70%,var(--foreground))]",
  blue: "text-[color-mix(in_oklab,#6E9CE8_72%,var(--foreground))]",
}
/* A panel note's card, per tone: a 40% border over an 8% tint. */
const SOFT_CARD: Record<ToneKey, string> = {
  red: "border-[#DE6F68]/40 bg-[#DE6F68]/[0.08]",
  orange: "border-[#EB9A52]/40 bg-[#EB9A52]/[0.08]",
  violet: "border-[#9C86E6]/40 bg-[#9C86E6]/[0.08]",
  green: "border-[#5FB386]/40 bg-[#5FB386]/[0.08]",
  blue: "border-[#6E9CE8]/40 bg-[#6E9CE8]/[0.08]",
}

/* ------------------------------------------------------ CareMap colours -- */

/** The client's CareMap colours (9 Oct): full colour icons, filled count
    badges and status pills, white cards on the lab viewer's grey. */
const POP: Record<
  ToneKey,
  { tile: string; solid: string; pill: string; text: string; head: string }
> = {
  red: {
    tile: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
    solid: "bg-red-500 text-white",
    pill: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    text: "text-red-600 dark:text-red-400",
    head: "bg-red-50 dark:bg-red-500/10",
  },
  orange: {
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    solid: "bg-amber-500 text-white",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    head: "bg-amber-50 dark:bg-amber-500/10",
  },
  blue: {
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    solid: "bg-blue-500 text-white",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-400",
    head: "bg-blue-50 dark:bg-blue-500/10",
  },
  green: {
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    solid: "bg-emerald-500 text-white",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    head: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    solid: "bg-violet-500 text-white",
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-400",
    head: "bg-violet-50 dark:bg-violet-500/10",
  },
}

/** Version 2's ink, in light mode: no pure black. Four levels, each a
    step lighter: titles and row names (ink 900), sublines (ink 600),
    dates and quiet meta (ink 400 via muted at 80%), set as the theme's
    own variables so every text-foreground and text-muted-foreground
    inside the dashboard and its side modal takes them. */
const POP_INK =
  "text-foreground [:root:not(.dark)_&]:[--foreground:#1f2a37] [:root:not(.dark)_&]:[--muted-foreground:#5b6573]"

/** What a subject is about, read from its words, and the icon for it:
    a weight program gets the scale, a flu shot the syringe, a renal
    ultrasound the kidneys. First match wins, so the specific comes first. */
const TOPIC_ICONS: [RegExp, IconDef][] = [
  [/supplement|creatine|fish oil|vitamin d3? \d/i, Leaf01Icon],
  [
    /vaccin|influenza|\bflu\b|covid|shingrix|zoster|tdap|immuni/i,
    InjectionIcon,
  ],
  [
    /emergency|\bed visit|\ber\b|urgent care|admission|discharge/i,
    AmbulanceIcon,
  ],
  [/weight|obes|\bbmi\b|waist|body fat/i, WeightScaleIcon],
  [/blood pressure|hypertens|\bbp\b/i, BloodPressureIcon],
  [/diabet|a1c|glucose|insulin/i, DropletIcon],
  [/kidney|renal|egfr|creatinine|cystatin|\bacr\b|nephro|urine/i, KidneysIcon],
  [/liver|\balt\b|\bast\b|hepat/i, LiverIcon],
  [/bone|dexa|osteo|reclast|vitamin d/i, Bone01Icon],
  [/sleep|apnea/i, Moon02Icon],
  [/exercise|fitness|walk|steps|training/i, WorkoutRunIcon],
  [/diet|nutrition|meal|calorie/i, Apple01Icon],
  [
    /heart|cardi|lipid|cholesterol|\bldl\b|\bhdl\b|apolipo|lipoprotein|triglycer|calcium score|\becg\b|\bekg\b|hs-?crp|statin/i,
    FavouriteIcon,
  ],
  [/eye|retina|ophthal|vision/i, EyeIcon],
  [/dental|tooth|teeth/i, DentalToothIcon],
  [/lung|pulmon|copd|asthma|spirom/i, LungsIcon],
  [/brain|neuro|cognit|memory|depress|phq|mood|anxiety/i, BrainIcon],
  [
    /mammo|breast|colon|cancer|pap\b|biopsy|patholog|psa\b|skin check|dermat/i,
    MicroscopeIcon,
  ],
  [/ultrasound|x-?ray|\bct\b|\bmri\b|scan|imaging/i, XRayIcon],
  [/referral|specialist|consult/i, Stethoscope02Icon],
]

/** A row's icon in Version 2: the topic's icon when the words name one,
    else one for what kind of subject it is. */
function kindIcon(s: Subject): IconDef {
  const words = `${s.title} ${s.short} ${s.heading ?? ""} ${s.line}`
  const topic = TOPIC_ICONS.find(([re]) => re.test(words))
  if (topic) return topic[1]
  switch (s.kind) {
    case "med":
      return PillIcon
    case "order":
      return ClipboardIcon
    case "visit":
      return Hospital01Icon
    case "report":
      return File01Icon
    case "result":
      return TestTube01Icon
    case "watch":
      return ChartLineData01Icon
    case "program":
      return Target02Icon
    default:
      return Calendar03Icon
  }
}

/** A dashboard card: a white card with a coloured icon tile and a filled count badge. A `tint` card
    (Important updates, as CareMap's) gets a tinted header with the icon
    bare and the title in the tone's colour. */
function Box({
  icon,
  tone,
  title,
  count,
  action,
  tint,
  children,
}: {
  icon: IconDef
  tone: ToneKey
  title: string
  count?: number
  action?: React.ReactNode
  tint?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-card border border-[color-mix(in_oklab,var(--border)_90%,var(--foreground))] shadow-[0_1px_2px_rgba(16,24,40,.05)]"
    >
      <header
        className={cn(
          "flex min-h-12 items-center gap-2.5 border-b px-4 py-2",
          tint && POP[tone].head
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg",
            tint ? POP[tone].text : POP[tone].tile
          )}
        >
          <KitIcon icon={icon} size={tint ? 20 : 16} />
        </span>
        <h3
          className={cn(
            "flex flex-1 items-center gap-2 text-[15px] font-semibold",
            tint ? POP[tone].text : "text-foreground"
          )}
        >
          {title}
          {count !== undefined && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                POP[tone].solid
              )}
            >
              {count}
            </span>
          )}
        </h3>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

/** Each reading's band, oldest first: out of range, within a tenth of the
    range of a limit, or in, and green whenever it moved toward the range. */
function bands(m: Marker): ToneKey[] {
  return statusSeries(
    m.points.map((p) => p.value),
    m.low,
    m.high
  )
}

const STATUS_WORD = (m: Marker) => {
  const last = m.points[m.points.length - 1].value
  if (m.high != null && last > m.high) return "Above range"
  if (m.low != null && last < m.low) return "Below range"
  return m.trend === "worsening"
    ? m.rising
      ? "Rising"
      : "Declining"
    : m.trend === "improving"
      ? "Improving"
      : "In range"
}

/* ----------------------------------------------------------- the chart -- */

/** A result over time on the patient app's biomarker trend: readings to
    scale in time on a smooth line whose dots, line and fading area take
    each reading's status colour (green in range, orange at the edge, red
    out, a dashed divider where it changes), the range limits as dashed
    hairlines written at the edge, a value over each
    reading where there is room, and a callout only while a reading is
    hovered (or focused with the arrow keys). */
function RangeTrend({ m }: { m: Marker }) {
  const p = m.points
  const latest = p.length - 1
  /* No reading is chosen until the pointer or the arrow keys pick one. */
  const [hover, setSel] = React.useState<number | null>(null)
  const active = hover != null
  const sel = hover ?? latest
  const W = 480
  const H = 180
  const pad = { top: 22, right: 14, bottom: 26, left: 34 }
  const values = p.map((r) => r.value)
  const limits = [m.low, m.high].filter((n): n is number => n != null)
  let lo = Math.min(...values, ...limits)
  let hi = Math.max(...values, ...limits)
  const span = hi - lo || Math.abs(hi) || 1
  lo -= span * 0.18
  hi += span * 0.18
  const y = (v: number) =>
    pad.top + (1 - (v - lo) / (hi - lo)) * (H - pad.top - pad.bottom)
  const xs = timeScale(
    p.map((r) => r.date),
    pad.left + 10,
    W - pad.right - 10,
    18
  )
  const xy = p.map((r, i): [number, number] => [xs[i], y(r.value)])
  const curve = monotone(xy)
  const bottom = H - pad.bottom
  const colors = bands(m).map((k) => SUBTLE[k])
  const r = p[Math.min(sel, latest)]
  const [mx, my] = xy[Math.min(sel, latest)]
  const tipLeft = mx / W > 0.62
  /* As many decimals as the readings carry, so 4.6 never shows as 5. */
  const digits = Math.min(
    2,
    Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length))
  )

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs(xs[best] - px)) best = i
    })
    setSel(best)
  }
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setSel((i) => Math.max(0, (i ?? latest + 1) - 1))
    else if (e.key === "ArrowRight")
      setSel((i) => Math.min(latest, (i ?? latest - 1) + 1))
    else if (e.key === "Escape") setSel(null)
    else return
    e.preventDefault()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <svg
          role="slider"
          tabIndex={0}
          aria-label={`${m.name} over time`}
          aria-valuemin={0}
          aria-valuemax={latest}
          aria-valuenow={sel}
          aria-valuetext={`${day(r.date)}: ${r.value}${unitText(m)}`}
          viewBox={`0 0 ${W} ${H}`}
          className={cn("w-full touch-none rounded-md outline-none", FOCUS)}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setSel(null)}
          onBlur={() => setSel(null)}
          onKeyDown={keys}
        >
          {/* The range's closed edges as hairlines with their limit. */}
          {limits.map((l) => (
            <g key={l}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y(l)}
                y2={y(l)}
                className="stroke-border"
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 6}
                y={y(l) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {l}
              </text>
            </g>
          ))}
          <line
            x1={pad.left}
            x2={pad.left}
            y1={pad.top - 8}
            y2={bottom}
            className="stroke-border"
          />
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={bottom}
            y2={bottom}
            className="stroke-border"
          />
          {/* Where the chosen reading sits in time. */}
          {active && (
            <line
              x1={mx}
              x2={mx}
              y1={my + 9}
              y2={bottom}
              stroke={colors[Math.min(sel, latest)]}
              strokeOpacity={0.35}
              strokeDasharray="2 3"
            />
          )}
          {/* Line, area and dots in each reading's status colour. */}
          <StatusTrace
            xy={xy}
            colors={colors}
            d={curve}
            top={pad.top - 8}
            bottom={bottom}
            zones
          />
          {p.map((pt, i) => {
            const [x, yy] = xy[i]
            const room =
              (i === 0 || x - xs[i - 1] >= 24) &&
              (i === latest || xs[i + 1] - x >= 24)
            return (
              <g key={`${pt.date}-${i}`}>
                {(!active || i !== sel) && (
                  <circle
                    cx={x}
                    cy={yy}
                    r={3.25}
                    fill="var(--card)"
                    stroke={colors[i]}
                    strokeWidth={2}
                  />
                )}
                {(room || i === sel) && (!active || i !== sel) && (
                  <text
                    x={x}
                    y={yy - 9}
                    textAnchor="middle"
                    className="text-[10.5px] tabular-nums"
                    fill="var(--muted-foreground)"
                  >
                    {pt.value.toFixed(digits)}
                  </text>
                )}
              </g>
            )
          })}
          {active && (
            <>
              <circle
                cx={mx}
                cy={my}
                r={9}
                fill="none"
                stroke={colors[Math.min(sel, latest)]}
                strokeOpacity={0.2}
                strokeWidth={2.1}
              />
              <circle
                cx={mx}
                cy={my}
                r={4.5}
                fill="var(--card)"
                stroke={colors[Math.min(sel, latest)]}
                strokeWidth={2.1}
              />
            </>
          )}
          <text
            x={xs[0]}
            y={H - 8}
            textAnchor="start"
            className="fill-muted-foreground text-[10.5px] tabular-nums"
          >
            {monthYear(p[0].date)}
          </text>
          {latest > 0 && (
            <text
              x={xs[latest]}
              y={H - 8}
              textAnchor="end"
              className="fill-muted-foreground text-[10.5px] tabular-nums"
            >
              {monthYear(p[latest].date)}
            </text>
          )}
        </svg>
        {/* The callout beside the hovered reading. */}
        {active && (
          <div
            aria-hidden
            className="pointer-events-none absolute flex w-28 flex-col gap-0.5 rounded-md bg-popover px-2 py-1.5 shadow-[0_12px_8px_rgba(16,24,40,.08),2px_0_3px_rgba(16,24,40,.04)] ring-1 ring-border/60"
            style={{
              top: `${(Math.min(Math.max(my - 22, 0), H - 46) / H) * 100}%`,
              ...(tipLeft
                ? { right: `${((W - mx + 16) / W) * 100}%` }
                : { left: `${((mx + 16) / W) * 100}%` }),
            }}
          >
            <span className="text-[10px] leading-3.5 text-muted-foreground">
              {sel === latest ? "Latest" : day(r.date)}
              {r.source ? `, ${r.source}` : ""}
            </span>
            <span className="text-sm leading-4.5 font-medium tabular-nums">
              {r.value}
              {m.unit && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  {m.unit}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- peek -- */

/** The small card a row shows on hover, in four levels: the name, its
    status in colour with one quiet qualifier, the figure or trend, then a
    few label and value details. Each fact appears once. A click still
    opens the full panel. */
function PeekCard({ s }: { s: Subject }) {
  const m = s.marker
  const tone = panelTone(s)
  const last = m?.points[m.points.length - 1]
  const prev = m?.points[m.points.length - 2]
  const status = m ? STATUS_WORD(m) : s.sub
  const qualifier = m?.range ? `range ${m.range}${unitText(m)}` : undefined
  const sentence = m
    ? prev && last
      ? `${last.value > prev.value ? "Up" : last.value < prev.value ? "Down" : "Unchanged"} from ${prev.value} on ${day(prev.date)}.`
      : "First reading on record."
    : (s.note?.text ?? s.line)
  /* A figure only when it is a number; "Never tested" is already the status. */
  const figure = !m && /\d/.test(s.figure.value) ? s.figure : undefined
  const facts = s.sections
    .flatMap((sec) => sec.rows)
    .filter((r) => r.value !== s.figure.value)
    .slice(0, 4)
  return (
    <div className="flex flex-col">
      <HoverCardSection className="gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] leading-5 font-semibold">
            {m ? m.name : panelTitle(s)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {s.category}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[13px]">
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", SOFT_DOT[tone])}
          />
          <span className={cn("font-medium", SOFT_TEXT[tone])}>
            {status}
            {qualifier && (
              <span className="font-normal text-muted-foreground tabular-nums">
                {`, ${qualifier}`}
              </span>
            )}
          </span>
        </span>
      </HoverCardSection>
      {(m || figure || sentence) && (
        <HoverCardSection className="gap-2.5">
          {m && m.points.length > 0 && (
            <PeekChart
              points={m.points}
              low={m.low}
              high={m.high}
              unit={m.unit}
              digits={m.points.some((p) => !Number.isInteger(p.value)) ? 1 : 0}
            />
          )}
          {figure && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {figure.label}
              </span>
              <span className="text-2xl leading-7 font-semibold tabular-nums">
                {figure.value}
                {figure.unit && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {figure.unit}
                  </span>
                )}
              </span>
            </div>
          )}
          {sentence && (
            <p className="text-[13px] leading-5 text-foreground/80">
              {sentence}
            </p>
          )}
        </HoverCardSection>
      )}
      {facts.length > 0 && (
        <HoverCardSection>
          <dl className="flex flex-col text-[13px]">
            {facts.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-4 border-t border-border/50 py-1.5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <dt className="min-w-0 truncate text-muted-foreground">
                  {r.label}
                </dt>
                <dd
                  className={cn(
                    "shrink-0 text-right font-medium tabular-nums",
                    r.tone && SOFT_TEXT[r.tone]
                  )}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </HoverCardSection>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- extras -- */

/* Markers that are read together. `expect` names a marker the group needs:
   when the record has none it is shown as a gap, not left out. */
function extras(
  s: Subject,
  model: DashboardModel,
  opt?: OptimizationModel | null
): { title: string; rows: Row[] }[] {
  const out: { title: string; rows: Row[] }[] = []
  if (s.marker) out.push(...markerExtras(s.marker, model, opt))
  const c = s.med
  if (c?.other) {
    /* What has not been rechecked since the dose changed. */
    const since = c.other.date
    const watched = model.data.labs
      .filter(
        (l) =>
          statusOf(l) !== "In range" ||
          model.trending.some((t) => t.code === l.code)
      )
      .slice(0, 3)
      .map((l): Row => {
        const last = l.history[l.history.length - 1]
        const repeated = last && last.date.slice(0, 10) > since.slice(0, 10)
        return {
          label: `${l.name} since change`,
          value: repeated
            ? `${last.value} ${l.unit}, ${day(last.date)}`
            : "Not repeated",
          tone: repeated ? undefined : "orange",
        }
      })
    const next = [
      ...model.gaps.map((g) => g.due),
      ...model.orders.filter((o) => o.scheduledAt).map((o) => o.scheduledAt!),
    ]
      .filter(Boolean)
      .sort()[0]
    const rows = [
      ...watched,
      ...(next ? [{ label: "Next labs due", value: day(next) }] : []),
    ]
    if (rows.length) out.push({ title: "Monitoring", rows })
  }
  return out
}

/** A result's own facts beneath its chart: how often it has been out,
    its spread, where it comes from, and, for a member, the plan around it. */
function markerExtras(
  m: Marker,
  model: DashboardModel,
  opt?: OptimizationModel | null
): { title: string; rows: Row[] }[] {
  const p = m.points
  const last = p[p.length - 1]
  const u = unitText(m)
  const out = p.filter((r) => r.out).length
  const values = p.map((r) => r.value)
  const lowest = p[values.indexOf(Math.min(...values))]
  const highest = p[values.indexOf(Math.max(...values))]
  const sources = [...new Set(p.map((r) => r.source))]
  const b = opt?.marker(m.name)
  const target =
    b && (b.targetLow != null || b.targetHigh != null)
      ? b.targetLow != null && b.targetHigh != null
        ? `${b.targetLow}-${b.targetHigh}${u}`
        : b.targetLow != null
          ? `${b.targetLow}${u} or more`
          : `Under ${b.targetHigh}${u}`
      : undefined
  const reviewed = model.data.reviewLog[model.data.reviewLog.length - 1]
  const about: Row[] = [
    ...(b?.category ? [{ label: "Category", value: b.category }] : []),
    ...(m.range ? [{ label: "Range", value: `${m.range}${u}` }] : []),
    ...(target && target !== `${m.range}${u}`
      ? [{ label: "Target", value: target }]
      : []),
    {
      label: "Out of range",
      value: `${out} of ${plural(p.length, "reading", "readings")}`,
      tone: out === p.length ? "red" : out ? "orange" : undefined,
    },
    ...(p.length > 1
      ? [
          {
            label: "Lowest",
            value: `${lowest.value}${u}, ${day(lowest.date)}`,
          },
          {
            label: "Highest",
            value: `${highest.value}${u}, ${day(highest.date)}`,
          },
        ]
      : []),
    { label: "First recorded", value: day(p[0].date) },
    { label: "Latest from", value: `${last.source}, ${day(last.date)}` },
    ...(sources.length > 1
      ? [{ label: "Sources", value: sources.join(", ") }]
      : []),
    ...(reviewed
      ? [
          {
            label: "Last chart review",
            value: `${day(reviewed.at)} by ${reviewed.by}`,
          },
        ]
      : []),
  ]
  const sections = [{ title: "About this result", rows: about }]
  if (b) {
    const plan: Row[] = [
      ...(b.tier ? [{ label: "Priority", value: b.tier }] : []),
      ...(b.nextStep ? [{ label: "Next step", value: b.nextStep }] : []),
      ...(b.nextTest ? [{ label: "Next test", value: b.nextTest }] : []),
      ...(b.frequency ? [{ label: "Retest every", value: b.frequency }] : []),
      ...opt!.data.interventions
        .filter((i) => i.outcomeMetric.toLowerCase() === m.name.toLowerCase())
        .map((i): Row => ({
          label: i.name,
          value: `${i.frequency}, ${i.status.toLowerCase()}, review ${day(i.nextReview)}`,
          tone: i.status === "Verify" ? "orange" : undefined,
        })),
    ]
    if (plan.length) sections.push({ title: "Plan", rows: plan })
  }
  return sections
}

/** Every reading, newest first: date, value, source and its status. */
function Readings({ m }: { m: Marker }) {
  const rows = [...m.points].reverse()
  const u = unitText(m)
  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h4 className="text-[13px] font-semibold">Readings</h4>
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Date", "Value", "Change", "Source"].map((h) => (
              <TableHead
                key={h}
                className="h-9 px-0 pr-4 text-xs font-normal text-muted-foreground last:pr-0 last:text-right"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const before = rows[i + 1]
            const diff = before ? r.value - before.value : undefined
            return (
              <TableRow key={`${r.date}-${i}`} className="hover:bg-transparent">
                <TableCell className="px-0 py-2.5 pr-4 text-muted-foreground tabular-nums">
                  {day(r.date)}
                </TableCell>
                <TableCell
                  className={cn(
                    "px-0 py-2.5 pr-4 font-medium tabular-nums",
                    r.out && SOFT_TEXT.red
                  )}
                >
                  {r.value}
                  {u}
                </TableCell>
                <TableCell className="px-0 py-2.5 pr-4 text-muted-foreground tabular-nums">
                  {diff == null
                    ? "First"
                    : diff === 0
                      ? "No change"
                      : `${diff > 0 ? "+" : ""}${Number(diff.toFixed(2))}`}
                </TableCell>
                <TableCell className="px-0 py-2.5 text-right whitespace-normal">
                  {r.source}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

/* -------------------------------------------------------------- pieces -- */

/** The hover card: small, soft and borderless. The pointer can move into
    it and hover its graph; it stays open while the pointer is on it. */
const PEEK = "w-80 rounded-2xl p-4 shadow-[0_16px_40px_rgba(16,24,40,.12)]"

type PeekHandle = ReturnType<typeof createHoverCardHandle<Subject>>

type Peek = {
  handle: PeekHandle
  enter: (s: Subject, id: string) => void
  leave: () => void
  /** The pointer is on the card: keep it open. */
  hold: () => void
  close: () => void
}

/** The dashboard's one hover card: every row opens this same card, so only
    one is ever open. The first card waits a beat, so sweeping across the
    list opens nothing; once one is open, the next row swaps in after a
    short pause, so crossing a row on the way into the card does not swap
    it; leaving both the names and the card closes it. */
export const PeekContext = React.createContext<Peek | null>(null)

const PEEK_OPEN_DELAY = 300
const PEEK_SWAP_DELAY = 140
const PEEK_CLOSE_DELAY = 220

export function usePeek() {
  const [handle] = React.useState(() => createHoverCardHandle<Subject>())
  /* The subject stays after closing, so the card animates out with it. */
  const [card, setCard] = React.useState<{
    s: Subject
    id: string
    open: boolean
  } | null>(null)
  const shown = React.useRef(false)
  const timer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const peek = React.useMemo<Peek>(() => {
    const show = (s: Subject, id: string) => {
      shown.current = true
      setCard({ s, id, open: true })
    }
    const close = () => {
      window.clearTimeout(timer.current)
      shown.current = false
      setCard((c) => c && { ...c, open: false })
    }
    return {
      handle,
      close,
      enter: (s, id) => {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(
          () => show(s, id),
          shown.current ? PEEK_SWAP_DELAY : PEEK_OPEN_DELAY
        )
      },
      leave: () => {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(close, PEEK_CLOSE_DELAY)
      },
      hold: () => window.clearTimeout(timer.current),
    }
  }, [handle])
  return { peek, card }
}

export function SharedPeek({
  peek,
  card,
}: {
  peek: Peek
  card: { s: Subject; id: string; open: boolean } | null
}) {
  return (
    <HoverCard
      handle={peek.handle}
      open={card?.open ?? false}
      triggerId={card?.id ?? null}
      /* The rows drive opening and closing; only Escape or a press
         elsewhere closes it from here. */
      onOpenChange={(open, details) => {
        if (!open && details.reason !== "trigger-hover") peek.close()
      }}
    >
      {card && (
        <HoverCardContent
          side="bottom"
          align="start"
          sideOffset={8}
          followCursor={false}
          className={PEEK}
          onPointerEnter={peek.hold}
          onPointerLeave={peek.leave}
        >
          <PeekCard s={card.s} />
        </HoverCardContent>
      )}
    </HoverCard>
  )
}

/** A row that selects its subject; the selected one carries a teal edge. */
export function PickRow({
  s,
  selected,
  onPick,
  tone,
  meta,
  graph,
  status,
  icon,
}: {
  s: Subject
  selected: boolean
  onPick: (s: Subject, el: HTMLElement) => void
  tone?: ToneKey
  meta?: React.ReactNode
  graph?: React.ReactNode
  status?: React.ReactNode
  /** Drawn in the tone's colour in place of the dot. */
  icon?: IconDef
}) {
  /* The peek opens from the name block only, so moving across the graph
     or the status never throws a card over the rows below. */
  const peek = React.useContext(PeekContext)
  const triggerId = React.useId()
  const name = (
    <>
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center",
            POP[tone ?? "blue"].text
          )}
        >
          <KitIcon icon={icon} size={20} />
        </span>
      ) : (
        tone && (
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", SOFT_DOT[tone])}
          />
        )
      )}
      <span className={"flex min-w-0 flex-col gap-0.5"}>
        <span className="truncate text-sm font-medium text-foreground">
          {s.title}
        </span>
        {meta && (
          <span className="truncate text-[13px] text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
    </>
  )
  const nameBox = "-my-2 flex max-w-full min-w-0 items-center gap-3 py-2 pr-6"
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={(e) => {
          peek?.close()
          onPick(s, e.currentTarget)
        }}
        className={cn(
          "relative flex w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface-row-hover",
          "py-2.5",
          selected &&
            "bg-primary/5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary",
          FOCUS
        )}
      >
        <span className="flex min-w-0 flex-1">
          {peek && !selected ? (
            <HoverCardTrigger
              handle={peek.handle}
              id={triggerId}
              onPointerEnter={() => peek.enter(s, triggerId)}
              onPointerLeave={peek.leave}
              render={<span className={nameBox} />}
            >
              {name}
            </HoverCardTrigger>
          ) : (
            <span className={nameBox}>{name}</span>
          )}
        </span>
        {graph}
        {status}
        <KitIcon
          icon={ArrowRight01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
      </button>
    </li>
  )
}

function MarkerRow({
  s,
  selected,
  onPick,
}: {
  s: Subject
  selected: boolean
  onPick: (s: Subject, el: HTMLElement) => void
}) {
  const m = s.marker!
  const last = m.points[m.points.length - 1]
  const tone = bands(m)[m.points.length - 1]
  /* The name over the latest value, coloured by its band, then the trend
     with the readings before it. */
  return (
    <PickRow
      s={{ ...s, title: m.name }}
      selected={selected}
      onPick={onPick}
      meta={
        <span className="tabular-nums">
          <span
            className={cn(
              "font-semibold",
              tone === "green" ? "text-foreground" : POP[tone].text
            )}
          >
            {last.value}
          </span>
          {m.unit && ` ${m.unit}`}
        </span>
      }
      graph={
        <span className={"-my-1.5 hidden shrink-0 sm:flex"}>
          <DotTrend
            subtle
            points={m.points}
            low={m.low}
            high={m.high}
            label={`${m.name}, last readings ${m.points
              .slice(-3)
              .map((p) => p.value)
              .join(", ")}`}
          />
        </span>
      }
    />
  )
}

/** The first rows of a list, then a quiet "Show all" at the foot: each
    card stays a glanceable handful (progressive disclosure) without a
    scroll area inside the page. */
/** A scroll area cut after its first `rows` rows (the `li`s inside it,
    with any headings above them), so exactly that many show before it
    scrolls. Without a cut it falls back to `fallback`. */
function RowWindow({
  rows,
  fallback,
  children,
}: {
  rows: number
  fallback?: string
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [max, setMax] = React.useState<number>()
  React.useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    const measure = () => {
      const cut = box.querySelectorAll("li")[rows] as HTMLElement | undefined
      setMax(
        cut
          ? cut.getBoundingClientRect().top -
              box.getBoundingClientRect().top +
              box.scrollTop
          : undefined
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [rows, children])
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-y-auto overscroll-contain",
        max == null && fallback
      )}
      style={max != null ? { maxHeight: max } : undefined}
    >
      {children}
    </div>
  )
}

export function Preview<T>({
  items,
  limit = 5,
  render,
}: {
  items: T[]
  limit?: number
  render: (item: T) => React.ReactNode
}) {
  /* The first `limit` rows show; the rest scroll inside the widget. */
  const ref = React.useRef<HTMLUListElement>(null)
  const [max, setMax] = React.useState<number>()
  React.useLayoutEffect(() => {
    const ul = ref.current
    const cut = ul?.children[limit] as HTMLElement | undefined
    setMax(cut ? cut.offsetTop - ul!.offsetTop : undefined)
  }, [items, limit])
  return (
    <ul
      ref={ref}
      className={cn(
        "divide-y",
        max != null && "overflow-y-auto overscroll-contain"
      )}
      style={max != null ? { maxHeight: max } : undefined}
    >
      {items.map(render)}
    </ul>
  )
}

/** "Order outstanding · Lipid panel" as the subject and its kind. */
const splitTitle = (t: string) => {
  const i = t.indexOf(" · ")
  return i < 0
    ? { kind: "", subject: t }
    : { kind: t.slice(0, i), subject: t.slice(i + 3) }
}

function Figure({ s }: { s: Subject }) {
  const f = s.figure
  /* A number reads large; words ("Skin check, two moles removed") stay at
     heading size so a long reason never fills the panel. */
  const numeric = /^[-+−]?[\d.,]+%?$/.test(String(f.value).trim())
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{f.label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          numeric ? "text-2xl leading-tight" : "text-base leading-6",
          f.tone && SOFT_TEXT[f.tone]
        )}
      >
        {f.value}
        {f.unit && (
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            {f.unit}
          </span>
        )}
      </span>
      {f.sub && (
        <span className="text-[13px] text-muted-foreground">{f.sub}</span>
      )}
    </div>
  )
}

function Facts({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h4 className="text-[13px] font-semibold">{title}</h4>
      <dl className="grid grid-cols-[minmax(0,140px)_1fr] gap-x-4 gap-y-2 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                r.tone && SOFT_TEXT[r.tone]
              )}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** A medication change as From → To, with who, where and when beneath. */
function ChangeFlow({ rows }: { rows: Row[] }) {
  const get = (label: string) => rows.find((r) => r.label === label)?.value
  const meta = ["Changed by", "Source", "Date"].filter((l) => get(l))
  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h4 className="text-[13px] font-semibold">Change</h4>
      <div className="flex flex-col gap-3 rounded-xl border bg-surface-head/50 px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">From</span>
            <span className="text-base font-medium tabular-nums">
              {get("From")}
            </span>
          </div>
          <KitIcon
            icon={ArrowRight01Icon}
            size={18}
            className="text-muted-foreground"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">To</span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
                SOFT_TEXT.orange
              )}
            >
              {get("To")}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
          {meta.map((l) => (
            <div key={l} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{l}</dt>
              <dd className="text-[13px] font-medium tabular-nums">{get(l)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/** One medication across every record: a row per source, with the same
    four columns, so the difference reads straight down the Dose column. */
function MedRecords({ c }: { c: MedCase }) {
  const rows: {
    record: string
    dose: string
    by: string
    date: string
    tone?: ToneKey
  }[] = [
    {
      record: "Your list",
      dose: c.practice ? doseText(c.practice) : "Not on your list",
      by: c.practice?.prescriber ?? "",
      date: c.practice ? day(c.practice.date) : "",
    },
    ...(c.other
      ? [
          {
            record: shortSource(c.other.source),
            dose: doseText(c.other),
            by: c.other.prescriber,
            date: day(c.other.date),
            tone: "orange" as const,
          },
        ]
      : []),
    {
      record: "Patient",
      dose: c.answer
        ? `${c.answer.answer}${c.answer.note ? `, ${c.answer.note}` : ""}`
        : "Not asked yet",
      by: c.answer ? "In the app" : "",
      date: c.answer ? day(c.answer.date) : "",
      tone: c.answer
        ? c.answer.answer !== "Taking"
          ? ("violet" as const)
          : undefined
        : ("orange" as const),
    },
  ]
  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h4 className="text-[13px] font-semibold">Records</h4>
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Record", "Dose", "Prescriber", "Date"].map((h) => (
              <TableHead
                key={h}
                className="h-9 px-0 pr-4 text-xs font-normal text-muted-foreground last:pr-0 last:text-right"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.record} className="hover:bg-transparent">
              <TableCell className="px-0 py-2.5 pr-4 text-muted-foreground">
                {r.record}
              </TableCell>
              <TableCell
                className={cn(
                  "px-0 py-2.5 pr-4 font-medium whitespace-normal tabular-nums",
                  r.tone && SOFT_TEXT[r.tone]
                )}
              >
                {r.dose}
              </TableCell>
              <TableCell className="px-0 py-2.5 pr-4 whitespace-normal">
                {r.by}
              </TableCell>
              <TableCell className="px-0 py-2.5 text-right whitespace-nowrap tabular-nums">
                {r.date}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

/** The panel body: figure, stats, the clinical note, the chart, the three
    medication lists, then Label : Value facts and the extras. */
export function DetailBody({
  s,
  model,
  opt,
}: {
  s: Subject
  /** The patient's record, for the related extras; the provider home has none. */
  model?: DashboardModel
  opt?: OptimizationModel | null
}) {
  const more = model ? extras(s, model, opt) : []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <Figure s={s} />
        {s.stats && s.stats.length > 0 && (
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {s.stats.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd
                  className={cn(
                    "text-base font-semibold tabular-nums",
                    r.tone && SOFT_TEXT[r.tone]
                  )}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {s.note && (
        <div
          className={cn(
            "flex flex-col gap-0.5 rounded-xl border px-4 py-3",
            SOFT_CARD[s.note.tone]
          )}
        >
          <span className="text-sm leading-5 font-semibold">
            {s.note.title}
          </span>
          <p className="text-[13px] leading-5 text-muted-foreground">
            {s.note.text}
          </p>
        </div>
      )}
      {s.marker && s.marker.points.length > 0 && (
        <section className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-[13px] font-semibold">
              {s.marker.name} trend
              {s.marker.unit && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {s.marker.unit}
                </span>
              )}
            </h4>
            <span className="text-xs text-muted-foreground tabular-nums">
              {plural(s.marker.points.length, "result", "results")}
              {s.marker.range ? `, range ${s.marker.range}` : ""}
            </span>
          </div>
          <RangeTrend m={s.marker} />
        </section>
      )}
      {s.marker &&
        s.marker.points.length > 1 &&
        !s.sections.some((sec) => sec.title === "History") && (
          <Readings m={s.marker} />
        )}
      {s.sections.map((sec) =>
        s.med && sec.title === "Change" ? (
          <ChangeFlow key={sec.title} rows={sec.rows} />
        ) : (
          <Facts key={sec.title} title={sec.title} rows={sec.rows} />
        )
      )}
      {s.med && <MedRecords c={s.med} />}
      {more.map((sec) => (
        <Facts key={sec.title} title={sec.title} rows={sec.rows} />
      ))}
    </div>
  )
}

/** The panel's second action: a soft teal tint between the primary and the grey third. */
export const SECOND =
  "border-primary/25 bg-primary/8 text-primary-tint hover:bg-primary/12 hover:text-primary-tint"

/** Version 2's panel actions: the subject's own, plus the CareMap set for
    a result (View original report, Order follow up, Add to watchlist),
    each with its icon, in CareMap's order. */
function popActions(
  s: Subject,
  onOpen: OpenSection
): (Subject["actions"][number] & { icon?: IconDef })[] {
  const own = [...s.actions]
  if (s.marker) {
    const has = (l: string) =>
      own.some((a) => a.label.toLowerCase() === l.toLowerCase())
    const extra: Subject["actions"] = [
      ...(has("View original report")
        ? []
        : [
            {
              label: "View original report",
              keepOpen: true,
              run: () => onOpen("labs"),
            },
          ]),
      ...(own.some((a) => /^order /i.test(a.label))
        ? []
        : [
            {
              label: "Order follow-up",
              run: () => toast.success(`${s.short} follow-up ordered`),
            },
          ]),
      ...(s.kind === "watch" || has("Add to watchlist")
        ? []
        : [
            {
              label: "Add to watchlist",
              run: () => toast.success(`${s.short} added to the watchlist`),
            },
          ]),
    ]
    own.push(...extra)
  }
  /* CareMap's order: trend, report, order, watchlist, plan, then the rest,
     with Mark reviewed last. */
  const rank = (l: string) =>
    [
      /trend/i,
      /report|document/i,
      /^order/i,
      /watchlist/i,
      /care plan/i,
    ].findIndex((r) => r.test(l)) + 1 || (/^mark reviewed$/i.test(l) ? 9 : 6)
  own.sort((a, b) =>
    a.primary ? -1 : b.primary ? 1 : rank(a.label) - rank(b.label)
  )
  return own.map((a) => ({
    ...a,
    icon: /trend/i.test(a.label)
      ? ChartLineData01Icon
      : /report|document/i.test(a.label)
        ? File01Icon
        : /^order/i.test(a.label)
          ? PlusSignIcon
          : /watchlist/i.test(a.label)
            ? StarIcon
            : /care plan|program/i.test(a.label)
              ? Target02Icon
              : /reviewed|confirm/i.test(a.label)
                ? Tick02Icon
                : undefined,
  }))
}

export const panelTitle = (s: Subject) =>
  s.heading ??
  (s.title.includes(" · ")
    ? s.title.split(" · ").slice(1).join(" · ")
    : s.title)

export const panelTone = (s: Subject): ToneKey =>
  s.group
    ? GROUP_TONE[s.group]
    : s.kind === "result"
      ? "red"
      : s.kind === "watch"
        ? "orange"
        : s.kind === "program"
          ? "green"
          : "blue"

/* ----------------------------------------------------------- dashboard -- */

/** The patient chart's dashboard: Important updates (five rows, then it
    scrolls), Out of range beside Trends to watch, Future care beside the
    programs, on the lab viewer's grey in the client's CareMap colours.
    A row opens its detail in the side modal; an action that finishes the
    subject closes it. (Version 1, with the decision band and the docked
    sidebar, was deleted on 9 Oct.) */
export function ChartingDashboard({
  dash,
  opt,
  optimized,
  patientName,
  onOpen,
}: {
  dash: Dashboard
  opt: Optimization
  optimized: boolean
  patientName: string
  onOpen: OpenSection
}) {
  const { peek, card } = usePeek()
  const { ready, model } = dash
  const [pick, setPick] = React.useState<{ id: string; list: string[] } | null>(
    null
  )
  const [from, setFrom] = React.useState<HTMLElement | null>(null)
  const close = React.useCallback(() => setPick(null), [])
  const view = useDecisionView({
    dash,
    opt,
    optimized,
    patientName,
    onOpen,
    close,
  })

  if (!ready || !view)
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <CardSkeleton rows={2} />
        <CardSkeleton rows={6} />
      </div>
    )

  /* The open subject and the list it was opened from. */
  const picked = pick ? view.byId.get(pick.id) : undefined
  const list = pick ? pick.list : []
  const at = picked ? list.indexOf(picked.id) : -1
  const go = (i: number) =>
    list[i] ? () => setPick({ id: list[i], list }) : undefined

  const choose = (group: Subject[]) => (s: Subject, el: HTMLElement) => {
    setFrom(el)
    setPick({ id: s.id, list: group.map((x) => x.id) })
  }
  const act = (a: Subject["actions"][number]) => {
    a.run()
    if (!a.keepOpen) setPick(null)
  }
  const isPicked = (s: Subject) => picked?.id === s.id

  const action = view.updates.filter((s) => s.group === "action")
  const review = view.updates.filter((s) => s.group === "review")
  const pair = (a: React.ReactNode | null, b: React.ReactNode | null) =>
    a || b ? (
      <div className={cn("grid grid-cols-1 gap-4", a && b && "lg:grid-cols-2")}>
        {a}
        {b}
      </div>
    ) : null

  const panelHead = picked && (
    <span className="flex flex-wrap items-center gap-2">
      {panelTitle(picked)}
      <Pill tone={panelTone(picked)}>{picked.category}</Pill>
    </span>
  )
  /* The CareMap set, with icons: the primary first, the rest outlined. */
  const panelActions = picked
    ? popActions(picked, onOpen).map((a) => (
        <Button
          key={a.label}
          variant={a.primary ? "default" : "outline"}
          onClick={() => act(a)}
        >
          {a.icon && <KitIcon icon={a.icon} />}
          {a.label}
        </Button>
      ))
    : undefined

  const lists = (
    <PeekContext.Provider value={peek}>
      <SharedPeek peek={peek} card={card} />
      <div className={cn("flex min-w-0 flex-col gap-4", TYPE_SCALE, POP_INK)}>
        {view.updates.length > 0 && (
          <div id="v5-updates" className="scroll-mt-3">
            <Box
              icon={Notification03Icon}
              tone="red"
              tint
              title="Important updates"
              count={view.updates.length}
              action={
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {view.reviewAt
                    ? `New since ${day(view.reviewAt)}`
                    : "Last 90 days"}
                </span>
              }
            >
              {/* The list scrolls inside the card, every row under an
                  Action needed or For review heading. */}
              <RowWindow rows={5}>
                {(
                  [
                    ["action", action, "Action needed"],
                    ["review", review, "For review"],
                  ] as [Group, Subject[], string][]
                ).map(([g, rows, label]) =>
                  rows.length ? (
                    <div
                      key={g}
                      className="flex flex-col border-b last:border-b-0"
                    >
                      <h4
                        className={cn(
                          "sticky top-0 z-[1] flex items-center gap-2 border-b px-4 text-xs font-semibold",
                          /* A light teal grey behind the group's own
                             coloured words. */
                          "bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))] py-1.5",
                          SOFT_TEXT[GROUP_TONE[g]]
                        )}
                      >
                        {label}
                        <span className="font-normal text-muted-foreground tabular-nums">
                          {rows.length}
                        </span>
                      </h4>
                      <Preview
                        items={rows}
                        limit={rows.length}
                        render={(s) => {
                          const t =
                            s.kind === "visit"
                              ? { kind: "", subject: s.title }
                              : splitTitle(s.title)
                          return (
                            <PickRow
                              key={s.id}
                              s={{ ...s, title: t.subject }}
                              tone={GROUP_TONE[g]}
                              icon={kindIcon(s)}
                              selected={isPicked(s)}
                              onPick={choose(view.updates)}
                              meta={
                                <>
                                  {t.kind && (
                                    <span className="text-foreground/70">
                                      {t.kind}.{" "}
                                    </span>
                                  )}
                                  {s.line}
                                  {s.alert && (
                                    <span
                                      className={cn(
                                        "ml-1 font-medium",
                                        POP[GROUP_TONE[g]].text
                                      )}
                                    >
                                      {s.alert}
                                    </span>
                                  )}
                                </>
                              }
                              status={
                                <>
                                  <span
                                    className={cn(
                                      "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:inline-flex",
                                      POP[GROUP_TONE[g]].pill
                                    )}
                                  >
                                    {label}
                                  </span>
                                  {s.date && (
                                    <span
                                      className={cn(
                                        "w-[76px] shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums"
                                      )}
                                    >
                                      {day(s.date)}
                                    </span>
                                  )}
                                </>
                              }
                            />
                          )
                        }}
                      />
                    </div>
                  ) : null
                )}
              </RowWindow>
            </Box>
          </div>
        )}

        {pair(
          view.results.length > 0 ? (
            <div id="v5-results" className="h-full scroll-mt-3">
              <Box
                icon={TestTube01Icon}
                tone="red"
                title="Out of range"
                count={view.results.length}
              >
                <Preview
                  items={view.results}
                  render={(s) => (
                    <MarkerRow
                      key={s.id}
                      s={s}
                      selected={isPicked(s)}
                      onPick={choose(view.results)}
                    />
                  )}
                />
              </Box>
            </div>
          ) : null,
          view.watches.length > 0 ? (
            <div id="v5-watch" className="h-full scroll-mt-3">
              <Box
                icon={ChartLineData01Icon}
                tone="orange"
                title="Trends to watch"
                count={view.watches.length}
                action={
                  <button
                    type="button"
                    onClick={() => onOpen("labs")}
                    className={cn(
                      "rounded text-[13px] font-medium text-primary hover:underline",
                      FOCUS
                    )}
                  >
                    View all
                  </button>
                }
              >
                <Preview
                  items={view.watches}
                  render={(s) => (
                    <MarkerRow
                      key={s.id}
                      s={s}
                      selected={isPicked(s)}
                      onPick={choose(view.watches)}
                    />
                  )}
                />
              </Box>
            </div>
          ) : null
        )}

        {pair(
          view.care.length > 0 ? (
            <div id="v5-care" className="h-full scroll-mt-3">
              <Box
                icon={Calendar03Icon}
                tone="blue"
                title="Future care and follow up"
                count={view.care.length}
              >
                <Preview
                  items={view.care}
                  render={(s) => {
                    const gap =
                      s.alert === "Overdue" || s.alert === "Never tested"
                    return (
                      <PickRow
                        key={s.id}
                        s={s}
                        tone={gap ? "orange" : "blue"}
                        icon={kindIcon(s)}
                        selected={isPicked(s)}
                        onPick={choose(view.care)}
                        meta={s.line || undefined}
                        status={
                          <span
                            className={cn(
                              "min-w-24 shrink-0 text-right text-xs whitespace-nowrap tabular-nums",
                              gap
                                ? cn("font-semibold", POP.orange.text)
                                : "text-muted-foreground"
                            )}
                          >
                            {s.alert}
                          </span>
                        }
                      />
                    )
                  }}
                />
              </Box>
            </div>
          ) : null,
          view.programs.length > 0 ? (
            <Box
              icon={Target02Icon}
              tone="green"
              title="Optimization programs"
              count={view.programs.length}
            >
              <ul className="divide-y">
                {view.programs.map((s) => (
                  <PickRow
                    key={s.id}
                    s={s}
                    tone={
                      s.status === "Active"
                        ? "green"
                        : s.status === "Eligible"
                          ? "blue"
                          : "orange"
                    }
                    icon={kindIcon(s)}
                    selected={isPicked(s)}
                    onPick={choose(view.programs)}
                    meta={s.line}
                    status={
                      <Pill
                        tone={
                          s.status === "Active"
                            ? "green"
                            : s.status === "Eligible"
                              ? "blue"
                              : "orange"
                        }
                      >
                        {s.status}
                      </Pill>
                    }
                  />
                ))}
              </ul>
            </Box>
          ) : null
        )}

        {view.updates.length === 0 &&
          view.results.length === 0 &&
          view.watches.length === 0 && (
            <Quiet>
              No results out of range, medication changes, open orders or
              outside care.
            </Quiet>
          )}
      </div>
    </PeekContext.Provider>
  )

  return (
    <>
      {lists}
      {picked && (
        <SidePanel
          open
          onClose={() => setPick(null)}
          returnFocus={{ current: from }}
          title={panelHead}
          meta={picked.sub}
          onPrevious={at > 0 ? go(at - 1) : undefined}
          onNext={at >= 0 ? go(at + 1) : undefined}
          actions={panelActions}
          stacked
        >
          <div className={POP_INK}>
            <DetailBody s={picked} model={model} opt={opt.model} />
          </div>
        </SidePanel>
      )}
    </>
  )
}
