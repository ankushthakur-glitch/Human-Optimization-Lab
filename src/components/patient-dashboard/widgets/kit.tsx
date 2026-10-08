"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Card, FOCUS, type IconDef, KitIcon } from "@/components/dashboard-kit-v2"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { RecordTable } from "@/components/provider/chart-layout"
import { usePaged } from "@/components/table-pager"

/* The widget dashboard's pieces, shared by the free and the optimization
   member's views and the provider home: the weather-app widget (a rounded
   tile with a small icon and grey label over a ruled line, then its
   content; every card on the patient dashboard is one), the status donut
   (the component library's donut with text; a slice slides out on hover
   and while picked) and the tabbed record table that follows the picked
   slice. */

/** The dashboard's text hierarchy. Widget labels are 13px grey with an
    icon; tabs sit at 13px too (muted, the active one
    medium in primary); table heads are 12px grey regular so the rows'
    names (14px medium) lead. */
export const TYPE_SCALE = cn(
  "[&_[data-slot=tabs-trigger]]:text-[13px]!",
  "[&_th]:text-xs! [&_th]:font-normal! [&_th]:text-muted-foreground!"
)

export function Widget({
  icon,
  title,
  count,
  tabs,
  action,
  flush,
  className,
  bodyClassName,
  children,
}: {
  icon: IconDef
  /** The label, and the card's accessible name when tabs replace it. */
  title: string
  /** A small count after the title. */
  count?: number
  /** Tabs in the header, in place of the icon and title (WidgetTabs). */
  tabs?: React.ReactNode
  action?: React.ReactNode
  /** The body runs edge to edge under the header (tables, charts with
      their own inset). */
  flush?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <Card aria-label={title} className={cn("flex h-full flex-col rounded-2xl", className)}>
      {/* A touch of primary 00 behind every header; tabs sit where the
          title would, at the same height. */}
      <header
        className={cn(
          "flex min-h-11 items-center gap-2 border-b bg-[color-mix(in_oklab,var(--primary-tint)_5%,var(--card))] px-4 text-[15px] font-medium text-muted-foreground",
          tabs ? "py-1 pl-3" : "py-2",
          !flush && "mb-3"
        )}
      >
        {tabs ? (
          <div className="min-w-0 flex-1">{tabs}</div>
        ) : (
          <>
            <KitIcon icon={icon} size={18} />
            {/* The title outranks the rows under it; icon and count stay quiet. */}
            <h3 className="flex-1 font-semibold text-foreground">
              {title}
              {count !== undefined && (
                <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{count}</span>
              )}
            </h3>
          </>
        )}
        {action}
      </header>
      <div className={cn("flex-1", flush ? "flex min-h-0 flex-col" : "px-4 pb-4", bodyClassName)}>{children}</div>
    </Card>
  )
}

/** Tabs for a widget's header (Widget tabs), as the chart's own tab bars. */
export function WidgetTabs<K extends string>({
  tabs,
  value,
  onTab,
  label,
}: {
  tabs: { id: K; label: string }[]
  value: K
  onTab: (id: K) => void
  label: string
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onTab(v as K)}>
      <TabsList aria-label={label} className={cn(SUB_TABS_LIST, "max-w-full")}>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className={SUB_TAB}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** The donut's softer status colours: the same four hues as the status
    pills, a step under full strength so the chart reads calm beside the
    table but still holds its colour. */
export const SUBTLE = {
  red: "#DE6F68",
  orange: "#EB9A52",
  violet: "#9C86E6",
  green: "#5FB386",
  blue: "#6E9CE8",
} as const

export type DonutSlice<K extends string> = { key: K; label: string; value: number; color: string }

/** How far a hovered or picked slice slides out, in the donut's units. */
const POP = 7
const SIZE = 200
const C = SIZE / 2
const OUTER = 92
const INNER = 58
const RAD = Math.PI / 180
const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%")

/** A point on the ring; 0° is twelve o'clock, angles run clockwise. */
function at(angle: number, r: number) {
  return { x: C + r * Math.sin(angle * RAD), y: C - r * Math.cos(angle * RAD) }
}

function ring(start: number, end: number) {
  const sweep = Math.min(end - start, 359.999)
  const stop = start + sweep
  const large = sweep > 180 ? 1 : 0
  const a = at(start, OUTER)
  const b = at(stop, OUTER)
  const c = at(stop, INNER)
  const d = at(start, INNER)
  return `M ${a.x} ${a.y} A ${OUTER} ${OUTER} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${INNER} ${INNER} 0 ${large} 0 ${d.x} ${d.y} Z`
}

/** Each soft colour at full strength: the picked slice's border and its
    legend row's frame, the same hue made vivid rather than paler. */
const VIVID: Record<string, string> = {
  [SUBTLE.red]: "#E5484D",
  [SUBTLE.orange]: "#F0861F",
  [SUBTLE.violet]: "#7A5AF8",
  [SUBTLE.green]: "#22A060",
  [SUBTLE.blue]: "#3B7FF0",
}
const bright = (color: string) => VIVID[color] ?? color

/* The component library's donut with text, drawn as plain SVG so each
   slice is one lasting element: a hovered or picked slice slides out
   along its middle angle and back with a CSS transition (Recharts rebuilds
   its sectors on every update, which made the slide jump). The ring
   sweeps in once on load; reduced motion skips both. */
export function StatusDonut<K extends string>({
  slices,
  total,
  totalLabel,
  selected,
  onSelect,
}: {
  slices: DonutSlice<K>[]
  total: number
  totalLabel: string
  selected: K
  onSelect: (key: K) => void
}) {
  const [hover, setHover] = React.useState<K | null>(null)
  const sweepRef = React.useRef<SVGCircleElement>(null)
  const maskId = React.useId()
  const sum = slices.reduce((n, s) => n + s.value, 0) || 1
  const shown = slices.filter((s) => s.value > 0)
  const arcs = shown.map((s, i) => {
    const start = (shown.slice(0, i).reduce((n, x) => n + x.value, 0) / sum) * 360
    const end = start + (s.value / sum) * 360
    const mid = (start + end) / 2
    return { ...s, start, end, mid, out: at(mid, POP), tip: at(mid, OUTER + 10) }
  })
  const tip = arcs.find((a) => a.key === hover)

  React.useEffect(() => {
    const el = sweepRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const length = 2 * Math.PI * ((OUTER + INNER) / 2)
    el.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
      duration: 800,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        <svg viewBox={`${-POP - 2} ${-POP - 2} ${SIZE + POP * 2 + 4} ${SIZE + POP * 2 + 4}`} className="size-full" aria-hidden>
          <defs>
            {/* The picked slice sits raised on a soft shadow. */}
            <filter id={`${maskId}-lift`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#101828" floodOpacity="0.22" />
            </filter>
            <mask id={maskId}>
              <circle
                ref={sweepRef}
                cx={C}
                cy={C}
                r={(OUTER + INNER) / 2}
                fill="none"
                stroke="white"
                strokeWidth={OUTER - INNER + POP * 2 + 20}
                strokeDasharray={2 * Math.PI * ((OUTER + INNER) / 2)}
                transform={`rotate(-90 ${C} ${C})`}
              />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            {/* The picked slice draws last, so its shadow falls over its neighbours. */}
            {[...arcs.filter((a) => a.key !== selected), ...arcs.filter((a) => a.key === selected)].map((a) => {
              const out = a.key === selected || a.key === hover
              return (
                <g
                  key={a.key}
                  filter={a.key === selected ? `url(#${maskId}-lift)` : undefined}
                  onClick={() => onSelect(a.key)}
                  onPointerEnter={() => setHover(a.key)}
                  onPointerLeave={() => setHover((h) => (h === a.key ? null : h))}
                  style={{
                    transform: out ? `translate(${a.out.x - C}px, ${a.out.y - C}px)` : "translate(0px, 0px)",
                    transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className="cursor-pointer motion-reduce:transition-none!"
                >
                  <path
                    d={ring(a.start, a.end)}
                    fill={a.color}
                    stroke={a.key === selected ? bright(a.color) : "var(--card)"}
                    strokeWidth={a.key === selected ? 3 : 2.5}
                    strokeLinejoin="round"
                  />
                </g>
              )
            })}
          </g>
          <text x={C} y={C - 4} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[30px] font-bold tabular-nums">
            {total.toLocaleString()}
          </text>
          <text x={C} y={C + 20} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
            {totalLabel}
          </text>
        </svg>
        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl"
            style={{
              left: `${((tip.tip.x + POP + 2) / (SIZE + POP * 2 + 4)) * 100}%`,
              top: `${((tip.tip.y + POP + 2) / (SIZE + POP * 2 + 4)) * 100}%`,
            }}
          >
            <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ background: tip.color }} />
            <span className="text-muted-foreground">{tip.label}</span>
            <span className="font-mono font-medium text-foreground tabular-nums">{tip.value}</span>
          </div>
        )}
      </div>
      <ul aria-label="Legend" className="flex flex-col gap-0.5">
        {slices.map((s) => {
          const on = s.key === selected
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(s.key)}
                onPointerEnter={() => setHover(s.key)}
                onPointerLeave={() => setHover((h) => (h === s.key ? null : h))}
                style={on ? { borderColor: bright(s.color) } : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-[background-color,box-shadow]",
                  on
                    ? "bg-card shadow-[0_2px_8px_rgba(16,24,40,0.10)]"
                    : "border-transparent hover:bg-surface-row-hover",
                  FOCUS
                )}
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className={cn("flex-1 truncate text-sm text-foreground/80", on && "font-medium text-foreground")}>
                  {s.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">{s.value}</span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct(s.value, total)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export type Column<T> = { head: string; className?: string; cell: (row: T) => React.ReactNode }

/** The chart's record table (as in Medications) under status tabs. */
export function TabbedTable<K extends string, T>({
  tabs,
  value,
  onTab,
  columns,
  rows,
  rowKey,
  onRow,
  canOpen = () => true,
  empty,
  icon,
  title,
}: {
  icon: IconDef
  title: string
  tabs: { id: K; label: string }[]
  value: K
  onTab: (id: K) => void
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Opens a row's details, for the rows canOpen allows. */
  onRow?: (row: T, from: HTMLElement) => void
  canOpen?: (row: T) => boolean
  empty: string
}) {
  const paged = usePaged(rows, 10)
  return (
    <Widget
      icon={icon}
      title={title}
      flush
      tabs={
        <WidgetTabs
          label={title}
          tabs={tabs}
          value={value}
          onTab={(id) => {
            paged.setPage(1)
            onTab(id)
          }}
        />
      }
    >
      {/* Full width: no inset and no inner frame; the card is the frame. */}
      <div className="flex min-h-0 flex-1 flex-col [&>div]:rounded-none [&>div]:border-0">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.head} className={c.className}>
                    {c.head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                    {empty}
                  </TableCell>
                </TableRow>
              )}
              {paged.visible.map((row) => {
                const open =
                  onRow && canOpen(row) ? (e: React.MouseEvent<HTMLElement>) => onRow(row, e.currentTarget) : undefined
                return (
                  <TableRow key={rowKey(row)} className={cn(open && "cursor-pointer")} onClick={open}>
                    {columns.map((c) => (
                      <TableCell key={c.head} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </RecordTable>
      </div>
    </Widget>
  )
}

/** The donut and its table, side by side from xl. The donut card hugs its
    content and sets the row's height; the table fills that height and
    scrolls inside it. Stacked, the table keeps its own height. */
export function DonutWithTable({ donut, table }: { donut: React.ReactNode; table: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-4">{donut}</div>
      <div className="relative min-w-0 xl:col-span-8 xl:self-stretch">
        <div className="xl:absolute xl:inset-0">{table}</div>
      </div>
    </div>
  )
}
