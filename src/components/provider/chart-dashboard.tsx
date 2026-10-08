"use client"

import * as React from "react"
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  IconCalendar,
  IconClock,
  IconLocation,
  IconPrint,
  IconUser,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  type Allergy,
  type Condition,
  type HealthRecord,
  type Immunization,
  type Medication,
  SOURCES,
  type VitalSet,
  bmiOf,
  heightLabel,
  kgOf,
} from "@/components/practice/health-record"
import { type Patient, usDate } from "@/components/practice/practice-data"
import type { ChartSection } from "@/components/provider/patient-chart"
import {
  DashboardToolbar,
  useDashboard,
} from "@/components/patient-dashboard/patient-dashboard"
import { useOptimization } from "@/components/patient-dashboard/optimization/model"
import { ChartingDashboard } from "@/components/patient-dashboard/widgets/charting-dashboard"
import { Badge as KitBadge } from "@/components/dashboard-kit-v2"
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"

/* The chart's Dashboard is the patient dashboard (see patient-dashboard/).
   The chart's Overview holds the Face sheet (one card per kind of data
   Health Gorilla returns, newest first) and the Timeline (every dated event
   in one feed). Card names and fields follow the Solid EHR face sheet; the
   cards the feed has no data for (appointments, insurance, family history)
   are left out rather than shown empty. The doctor can drag the face
   sheet's cards into the order they work in; see useFaceSheetLayout. */

export type OverviewTab = "face-sheet" | "timeline"

export function ChartDashboard({
  patient,
  record,
  onOpen,
}: {
  patient: Patient
  record: HealthRecord
  onOpen: (section: ChartSection, item?: string, tab?: string) => void
}) {
  const dash = useDashboard(patient, record)
  const opt = useOptimization(patient.id, dash.model)
  /* One dashboard for everyone (widgets/charting-dashboard.tsx): the
     decision band, important updates, results and trends, care and
     programs, with the detail docked in a sidebar. An active optimization
     member with tracker data reads from the HOLv.9 sheet, everyone else
     from their own record. */
  const optimized =
    patient.membership === "optimization" &&
    (patient.recordState ?? "active") === "active" &&
    Boolean(opt.model)
  /* The detail sidebar renders into this column, beside the section bar
     and the body, so it runs the full height of the card. */
  const [slot, setSlot] = React.useState<HTMLDivElement | null>(null)
  return (
    <Section>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <SectionBar
            title="Dashboard"
            actions={
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                {/* Two kinds of patient only: the badge follows the membership. */}
                {patient.membership === "optimization" ? (
                  dash.ready && (
                    <KitBadge tone="primary">Optimization member</KitBadge>
                  )
                ) : (
                  <DashboardToolbar dash={dash} />
                )}
              </div>
            }
          />
          <SectionBody>
            <ChartingDashboard
              slot={slot}
              dash={dash}
              opt={opt}
              optimized={optimized}
              patientName={patient.firstName}
              onOpen={onOpen}
            />
          </SectionBody>
        </div>
        <div ref={setSlot} className="flex empty:hidden" />
      </div>
    </Section>
  )
}

export function ChartOverview({
  record,
  tab,
  onTab,
  onOpen,
}: {
  record: HealthRecord
  tab: OverviewTab
  onTab: (tab: OverviewTab) => void
  onOpen: (section: ChartSection, item?: string, tab?: string) => void
}) {
  const [filter, setFilter] = React.useState<EventKind | "all">("all")
  const layout = useFaceSheetLayout()
  return (
    <Section>
      <SectionBar
        tabs={[
          { id: "face-sheet", label: "Face sheet" },
          { id: "timeline", label: "Timeline" },
        ]}
        value={tab}
        onTab={(t) => onTab(t as OverviewTab)}
        actions={
          tab === "timeline" ? (
            <EventFilter value={filter} onChange={setFilter} />
          ) : (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <IconPrint />
              Print chart
            </Button>
          )
        }
      />
      <SectionBody>
        {tab === "timeline" ? (
          <Timeline record={record} filter={filter} />
        ) : (
          <FaceSheet record={record} onOpen={onOpen} layout={layout} />
        )}
      </SectionBody>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Face sheet                                                                 */
/* -------------------------------------------------------------------------- */

const sourceLabel = (id: string) => {
  const s = SOURCES.find((x) => x.id === id)
  return s ? `${s.name}, ${s.network}` : id
}

/* ------------------------------------------------------------ layout -- */

type CardKey =
  | "allergies"
  | "diagnosis"
  | "medications"
  | "encounters"
  | "vaccines"
  | "vitals"
  | "labs"
  | "documents"

/** The frame's arrangement: three columns, top to bottom. */
const DEFAULT_LAYOUT: CardKey[][] = [
  ["allergies", "diagnosis", "medications"],
  ["encounters", "vaccines", "vitals"],
  ["labs", "documents"],
]
const ALL_CARDS = DEFAULT_LAYOUT.flat()
const LAYOUT_KEY = "hol.chart.faceSheetLayout"

/** Keeps a saved layout honest: unknown cards dropped, missing ones added
    to the shortest column, always three columns. */
function sanitise(value: unknown): CardKey[][] {
  if (!Array.isArray(value) || value.length !== 3) return DEFAULT_LAYOUT
  const seen = new Set<CardKey>()
  const cols = value.map((col) =>
    (Array.isArray(col) ? col : []).filter((k): k is CardKey => {
      if (!ALL_CARDS.includes(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
  )
  for (const k of ALL_CARDS) {
    if (seen.has(k)) continue
    cols.reduce((a, b) => (b.length < a.length ? b : a)).push(k)
  }
  return cols
}

/** The face sheet's card order, per doctor's browser. A doctor arranges it
    once, the way they read a chart, and every patient opens the same way.
    Saved in localStorage for the prototype; the real product keeps it on
    the provider's profile. */
const layoutListeners = new Set<() => void>()
function readLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY)
  } catch {
    return null
  }
}
function writeLayout(value: CardKey[][]) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(value))
  } catch {}
  layoutListeners.forEach((l) => l())
}
function subscribeLayout(listener: () => void) {
  layoutListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    layoutListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function useFaceSheetLayout() {
  // The server has no saved layout, so it renders the frame's; the browser
  // then switches to the doctor's.
  const raw = React.useSyncExternalStore(
    subscribeLayout,
    readLayout,
    () => null
  )
  const columns = React.useMemo(() => {
    if (!raw) return DEFAULT_LAYOUT
    try {
      return sanitise(JSON.parse(raw))
    } catch {
      return DEFAULT_LAYOUT
    }
  }, [raw])
  const move = React.useCallback(
    (key: CardKey, col: number, index: number) => {
      const next = columns.map((c) => [...c])
      const from = next.findIndex((c) => c.includes(key))
      const at = next[from].indexOf(key)
      next[from].splice(at, 1)
      // Dropping further down its own column: the gap it left shifts the slot.
      const slot = from === col && at < index ? index - 1 : index
      next[col].splice(Math.max(0, Math.min(slot, next[col].length)), 0, key)
      writeLayout(next)
    },
    [columns]
  )
  return { columns, move }
}

type Layout = ReturnType<typeof useFaceSheetLayout>

const CARD_TITLES: Record<CardKey, string> = {
  allergies: "Allergies",
  diagnosis: "Diagnosis",
  medications: "Medications",
  encounters: "Encounters",
  vaccines: "Vaccines",
  vitals: "Vitals",
  labs: "Lab results",
  documents: "Documents",
}

function FaceSheet({
  record,
  onOpen,
  layout,
}: {
  record: HealthRecord
  onOpen: (section: ChartSection, item?: string, tab?: string) => void
  layout: Layout
}) {
  const active = record.conditions.filter((c) => c.status === "Active")
  const current = record.medications.filter((m) => !m.ended)
  const vitals = record.vitals[0]
  const visits = record.encounters.slice(0, 2)

  const cards: { key: CardKey; node: React.ReactNode }[] = [
    {
      key: "allergies",
      node: (
        <FaceCard
          title="Allergies"
          onViewAll={() => onOpen("allergies")}
          empty="No known allergies"
        >
          {record.allergies.slice(0, 3).map((a) => (
            <AllergyItem key={a.id} a={a} />
          ))}
        </FaceCard>
      ),
    },
    {
      key: "diagnosis",
      node: (
        <FaceCard
          title="Diagnosis"
          onViewAll={() => onOpen("diagnoses")}
          empty="No active diagnosis"
        >
          {active.slice(0, 3).map((c) => (
            <DiagnosisItem key={c.id} c={c} />
          ))}
        </FaceCard>
      ),
    },
    {
      key: "medications",
      node: (
        <FaceCard
          title="Medications"
          onViewAll={() => onOpen("medications")}
          empty="No current medications"
        >
          {current.slice(0, 3).map((m) => (
            <MedicationItem key={m.id} m={m} />
          ))}
        </FaceCard>
      ),
    },
    {
      key: "encounters",
      node: (
        <FaceCard
          title="Encounters"
          onViewAll={() => onOpen("encounters")}
          empty="No encounters on record"
        >
          {visits.map((e) => (
            <Item key={e.id} onClick={() => onOpen("encounters", e.id)}>
              <Line aside={e.kind}>{e.type}</Line>
              <Meta>
                {usDate(e.date)}, {e.start} - {e.end}
              </Meta>
            </Item>
          ))}
        </FaceCard>
      ),
    },
    {
      key: "vaccines",
      node: (
        <FaceCard
          title="Vaccines"
          onViewAll={() => onOpen("vaccines")}
          empty="No vaccines on record"
        >
          {record.immunizations.slice(0, 3).map((v) => (
            <VaccineItem key={v.id} v={v} />
          ))}
        </FaceCard>
      ),
    },
    {
      key: "vitals",
      node: (
        <FaceCard
          title="Vitals"
          meta={vitals ? `(${usDate(vitals.date)})` : undefined}
          onViewAll={() => onOpen("vitals", undefined, "trends")}
          empty="No vitals on record"
        >
          {vitals && (
            <Item>
              <VitalsGrid v={vitals} />
            </Item>
          )}
        </FaceCard>
      ),
    },
    {
      key: "labs",
      node: (
        <FaceCard
          title="Lab results"
          onViewAll={() => onOpen("labs")}
          empty="No lab results on record"
        >
          {record.labReports.slice(0, 3).map((r) => {
            const flagged = r.results.filter((x) => x.flag).length
            return (
              <Item key={r.id} onClick={() => onOpen("labs", r.id)}>
                <Line aside={usDate(r.date)}>{r.name}</Line>
                <Pair label="Result">
                  {r.results.length} {r.results.length === 1 ? "test" : "tests"}
                  {flagged > 0 && (
                    <span className="text-destructive">
                      , {flagged} flagged
                    </span>
                  )}
                </Pair>
              </Item>
            )
          })}
        </FaceCard>
      ),
    },
    {
      key: "documents",
      node: (
        <FaceCard
          title="Documents"
          onViewAll={() => onOpen("documents")}
          empty="No documents on record"
        >
          {record.documents.slice(0, 2).map((d) => (
            <Item key={d.id} onClick={() => onOpen("documents", d.id)}>
              <Line aside={d.format}>{d.title}</Line>
              <Meta>Received {usDate(d.date)}</Meta>
            </Item>
          ))}
        </FaceCard>
      ),
    },
  ]

  const node = (key: CardKey) => cards.find((c) => c.key === key)?.node

  return (
    <>
      {/* Three columns as in the frame, in the doctor's order, where cards
          can be dragged; fewer columns on narrower screens, same order. */}
      <ArrangeableColumns layout={layout} render={node} />
      <div className="columns-1 gap-3.5 md:columns-2 xl:hidden">
        {layout.columns.flat().map((key) => (
          <div key={key} className="mb-3.5 break-inside-avoid">
            {node(key)}
          </div>
        ))}
      </div>
    </>
  )
}

/* Drag and drop with the browser's own API. Only the grip in each card's
   header is draggable (so clicks and text selection in the card still
   work), and it drags the whole card as its image; plus the
   arrow keys on that grip for keyboard users. While dragging, a line shows
   where the card will land; an emptied column keeps a drop area. */
function ArrangeableColumns({
  layout,
  render,
}: {
  layout: Layout
  render: (key: CardKey) => React.ReactNode
}) {
  const [dragging, setDragging] = React.useState<CardKey | null>(null)
  const [target, setTarget] = React.useState<{
    col: number
    index: number
  } | null>(null)
  const [announce, setAnnounce] = React.useState("")
  const columnRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const end = () => {
    setDragging(null)
    setTarget(null)
  }

  /** The slot under the pointer: before the first card whose middle is below it. */
  function slotAt(col: number, y: number) {
    const cards =
      columnRefs.current[col]?.querySelectorAll<HTMLElement>("[data-card]") ??
      []
    let index = cards.length
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect()
      if (y < r.top + r.height / 2) {
        index = i
        break
      }
    }
    return index
  }

  function moveBy(key: CardKey, dCol: number, dIndex: number) {
    const col = layout.columns.findIndex((c) => c.includes(key))
    const at = layout.columns[col].indexOf(key)
    const toCol = Math.max(0, Math.min(2, col + dCol))
    if (dCol !== 0) {
      if (toCol === col) return
      layout.move(key, toCol, Math.min(at, layout.columns[toCol].length))
      setAnnounce(`${CARD_TITLES[key]} moved to column ${toCol + 1}`)
      return
    }
    const to = at + dIndex
    if (to < 0 || to >= layout.columns[col].length) return
    layout.move(key, col, dIndex > 0 ? to + 1 : to)
    setAnnounce(
      `${CARD_TITLES[key]} moved to position ${to + 1} in column ${col + 1}`
    )
  }

  return (
    <div className="hidden items-start gap-3.5 xl:grid xl:grid-cols-3">
      {layout.columns.map((keys, col) => (
        <div
          key={col}
          ref={(el) => {
            columnRefs.current[col] = el
          }}
          className="flex min-h-24 min-w-0 flex-col gap-3.5"
          onDragOver={(e) => {
            if (!dragging) return
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            const index = slotAt(col, e.clientY)
            if (target?.col !== col || target.index !== index)
              setTarget({ col, index })
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragging && target) {
              layout.move(dragging, target.col, target.index)
              setAnnounce(`${CARD_TITLES[dragging]} moved`)
            }
            end()
          }}
        >
          {keys.map((key, i) => (
            <div
              key={key}
              data-card
              className={cn(
                "relative transition-opacity",
                dragging === key && "opacity-40",
                // The landing line sits in the gap above (or, at the end,
                // below) a card.
                target?.col === col &&
                  target.index === i &&
                  "before:absolute before:inset-x-0 before:-top-2 before:h-0.5 before:rounded-full before:bg-primary",
                target?.col === col &&
                  target.index === keys.length &&
                  i === keys.length - 1 &&
                  "after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-primary"
              )}
            >
              <HandleContext.Provider
                value={{
                  label: CARD_TITLES[key],
                  onDragStart: (e) => {
                    e.dataTransfer.effectAllowed = "move"
                    e.dataTransfer.setData("text/plain", key)
                    // Drag the whole card, held where the grip was grabbed.
                    const card = (
                      e.currentTarget as HTMLElement
                    ).closest<HTMLElement>("[data-card]")
                    if (card) {
                      const r = card.getBoundingClientRect()
                      e.dataTransfer.setDragImage(
                        card,
                        e.clientX - r.left,
                        e.clientY - r.top
                      )
                    }
                    setDragging(key)
                  },
                  onDragEnd: end,
                  onKey: (e) => {
                    const moves: Record<string, [number, number]> = {
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                    }
                    const m = moves[e.key]
                    if (!m) return
                    e.preventDefault()
                    moveBy(key, m[0], m[1])
                  },
                }}
              >
                {render(key)}
              </HandleContext.Provider>
            </div>
          ))}
          {keys.length === 0 && (
            <div
              className={cn(
                "flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground",
                target?.col === col &&
                  "border-primary bg-primary/5 text-primary"
              )}
            >
              Drop a card here
            </div>
          )}
        </div>
      ))}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}

/* The grip a card shows in its header when it sits in the arrangeable
   columns (the narrow layout has none). */
const HandleContext = React.createContext<{
  label: string
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onKey: (e: React.KeyboardEvent) => void
} | null>(null)

function DragHandle() {
  const handle = React.useContext(HandleContext)
  if (!handle) return null
  return (
    <button
      type="button"
      aria-label={`Move ${handle.label}. Use the arrow keys to move it.`}
      title="Drag to rearrange"
      draggable
      onDragStart={handle.onDragStart}
      onDragEnd={handle.onDragEnd}
      onKeyDown={handle.onKey}
      className="-ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground opacity-60 transition-opacity group-hover/card:opacity-100 hover:bg-muted hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing print:hidden"
    >
      <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
    </button>
  )
}

function FaceCard({
  title,
  meta,
  onViewAll,
  empty,
  children,
}: {
  title: string
  meta?: string
  onViewAll?: () => void
  empty: string
  children: React.ReactNode
}) {
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <section className="group/card min-w-0 overflow-hidden rounded-md border bg-card">
      <header className="flex h-9 items-center justify-between gap-2 border-b bg-surface-sunken px-2">
        <DragHandle />
        <h3 className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[15px] font-semibold">
          <span className="truncate">{title}</span>
          {meta && (
            <span className="text-xs font-normal text-muted-foreground">
              {meta}
            </span>
          )}
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 text-[13px] font-medium text-primary-tint hover:underline print:hidden"
          >
            View all
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="px-2">{items}</ul>
      )}
    </section>
  )
}

/* One entry: a primary dot, then its lines 4px apart, hairline between. */
function Item({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  const body = (
    <>
      <span
        aria-hidden
        className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        {children}
      </div>
    </>
  )
  return (
    <li className="border-b py-2 last:border-b-0">
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full gap-2">
          {body}
        </button>
      ) : (
        <div className="flex gap-2">{body}</div>
      )}
    </li>
  )
}

/* The type scale every face sheet entry follows: the thing itself in
   14px medium, its details in 13px (grey label, softer value), and dates
   and small qualifiers in 12px grey. */
function Line({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="truncate text-sm leading-5 font-medium text-foreground">
        {children}
      </p>
      {aside && (
        <span className="shrink-0 text-xs text-muted-foreground">{aside}</span>
      )}
    </div>
  )
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <p className="truncate text-xs leading-4 text-muted-foreground">
      {children}
    </p>
  )
}

/** A code or qualifier inside a primary line: lighter than the name. */
function Soft({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-normal text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

function Pair({
  label,
  children,
  clamp = true,
}: {
  label: string
  children: React.ReactNode
  clamp?: boolean
}) {
  return (
    <p
      className={cn(
        "text-[13px] leading-[18px] text-foreground/80",
        clamp && "truncate"
      )}
    >
      <span className="text-muted-foreground">{label}: </span>
      {children}
    </p>
  )
}

function AllergyItem({ a, full }: { a: Allergy; full?: boolean }) {
  return (
    <Item>
      <Line
        aside={
          <span
            className={cn(
              "font-medium",
              a.severity === "Severe" && "text-destructive",
              a.severity === "Moderate" && "text-warning"
            )}
          >
            {a.severity}
          </span>
        }
      >
        {a.substance}
      </Line>
      <Pair label="Reaction" clamp={!full}>
        {a.reaction}
      </Pair>
      <Meta>
        {a.category} allergy, onset {usDate(a.onset)}
      </Meta>
      {full && <Pair label="Source">{sourceLabel(a.sourceId)}</Pair>}
    </Item>
  )
}

function DiagnosisItem({ c, full }: { c: Condition; full?: boolean }) {
  return (
    <Item>
      <Line aside={c.type}>
        <Soft>{c.code}</Soft> {c.name}
      </Line>
      <Meta>Onset {usDate(c.onset)}</Meta>
      {full && <Pair label="Source">{sourceLabel(c.sourceId)}</Pair>}
    </Item>
  )
}

function MedicationItem({ m, full }: { m: Medication; full?: boolean }) {
  return (
    <Item>
      <Line>{m.name}</Line>
      <Pair label="Dose">
        {m.quantity}, {m.route.toLowerCase()}, {m.frequency.toLowerCase()},{" "}
        {m.timing.toLowerCase()}
      </Pair>
      <Meta>
        {usDate(m.started)} - {m.ended ? usDate(m.ended) : "ongoing"}
      </Meta>
      {full && (
        <>
          <Pair label="Prescriber">{m.prescriber || "Not recorded"}</Pair>
          <Pair label="Source">{sourceLabel(m.sourceId)}</Pair>
        </>
      )}
    </Item>
  )
}

function VaccineItem({ v, full }: { v: Immunization; full?: boolean }) {
  return (
    <Item>
      <Line
        aside={
          <span
            className={cn(
              v.status === "Refused" && "font-medium text-destructive"
            )}
          >
            {v.status}
          </span>
        }
      >
        {v.vaccine}
      </Line>
      <Pair label="Dose">
        {v.dose}, {v.route.toLowerCase()}
      </Pair>
      <Meta>{v.date ? `Given ${usDate(v.date)}` : "Not given"}</Meta>
      {full && (
        <>
          <Pair label="Performer">{v.performer}</Pair>
          <Pair label="Source">{sourceLabel(v.sourceId)}</Pair>
        </>
      )}
    </Item>
  )
}

function vitalRows(v: VitalSet) {
  return [
    ["Blood pressure", `${v.systolic}/${v.diastolic} mmHg`],
    ["Heart rate", `${v.heartRate}/min`],
    ["Respiratory rate", `${v.respRate}/min`],
    ["Oxygen level", `${v.spo2}%`],
    ["Body temp.", `${v.tempF}°F`],
    ["Height", heightLabel(v.heightIn)],
    ["Weight", `${kgOf(v.weightLb)} kg`],
    ["BMI", `${bmiOf(v)}`],
  ] as const
}

function VitalsGrid({ v }: { v: VitalSet }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-[13px] leading-5">
      {vitalRows(v).map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              "text-sm font-medium text-foreground tabular-nums",
              label === "Blood pressure" &&
                v.systolic > 130 &&
                "text-destructive"
            )}
          >
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

/* -------------------------------------------------------------------------- */
/*  Timeline                                                                   */
/* -------------------------------------------------------------------------- */

type EventKind = "encounter" | "lab" | "vaccine" | "procedure" | "document"

const EVENT_LABELS: Record<EventKind, string> = {
  encounter: "Encounters",
  lab: "Lab results",
  vaccine: "Vaccines",
  procedure: "Procedures",
  document: "Documents",
}

type ChartEvent = {
  id: string
  kind: EventKind
  date: string
  title: string
  status: string
  tone: "success" | "info" | "secondary" | "warning"
  text: string
  time?: string
  who?: string
  where: string
}

function eventsOf(record: HealthRecord): ChartEvent[] {
  const source = (id: string) => SOURCES.find((s) => s.id === id)?.name ?? id
  const events: ChartEvent[] = [
    ...record.encounters.map((e) => ({
      id: e.id,
      kind: "encounter" as const,
      date: e.date,
      title: `Encounter : ${e.type}`,
      status: "Completed",
      tone: "success" as const,
      text: `${e.kind === "Virtual" ? "Virtual visit" : e.kind === "In person" ? "Visit" : e.type} on ${usDate(e.date)} from ${e.start} to ${e.end}${e.clinician ? ` with ${e.clinician}` : ""}. ${e.reason}.`,
      time: e.start,
      who: e.clinician ? `${e.clinician} (Provider)` : undefined,
      where: e.where,
    })),
    ...record.labReports.map((r) => {
      const flagged = r.results.filter((x) => x.flag).length
      return {
        id: r.id,
        kind: "lab" as const,
        date: r.date,
        title: `Lab result : ${r.name}`,
        status: "Final",
        tone: "success" as const,
        text: `${r.results.length} ${r.results.length === 1 ? "test" : "tests"} resulted${flagged ? `, ${flagged} outside the reference range` : ", all within the reference range"}. Accession ${r.accession}.`,
        who: r.orderedBy ? `${r.orderedBy} (Ordered by)` : undefined,
        where: source(r.sourceId),
      }
    }),
    ...record.immunizations
      .filter((v) => v.date)
      .map((v) => ({
        id: v.id,
        kind: "vaccine" as const,
        date: v.date,
        title: `Vaccine : ${v.vaccine}`,
        status: v.status,
        tone:
          v.status === "Administered"
            ? ("success" as const)
            : ("secondary" as const),
        text:
          v.status === "Historical"
            ? `${v.vaccine}, ${v.dose}, recorded from the patient's history.`
            : `${v.vaccine}, ${v.dose}, administered at ${v.performer}.`,
        where: source(v.sourceId),
      })),
    ...record.procedures.map((p) => ({
      id: p.id,
      kind: "procedure" as const,
      date: p.date,
      title: `Procedure : ${p.name}`,
      status: "Completed",
      tone: "success" as const,
      text: p.note,
      who: `${p.performer} (Performer)`,
      where: p.where,
    })),
    ...record.documents.map((d) => ({
      id: d.id,
      kind: "document" as const,
      date: d.date,
      title: `Document : ${d.title}`,
      status: d.format,
      tone: "info" as const,
      text: `${d.format === "C-CDA" ? "Structured summary" : "PDF"} received from ${source(d.sourceId)} through Health Gorilla.`,
      who:
        d.author && d.author !== source(d.sourceId)
          ? `${d.author} (Author)`
          : undefined,
      where: source(d.sourceId),
    })),
  ]
  return events.sort((a, b) => b.date.localeCompare(a.date))
}

function EventFilter({
  value,
  onChange,
}: {
  value: EventKind | "all"
  onChange: (value: EventKind | "all") => void
}) {
  const items = [
    { label: "All", value: "all" },
    ...Object.entries(EVENT_LABELS).map(([k, label]) => ({ label, value: k })),
  ]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange((next as EventKind | "all") ?? "all")}
    >
      <SelectTrigger className="h-8! w-[150px]" aria-label="Filter events">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function weekday(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  })
}

function Timeline({
  record,
  filter,
}: {
  record: HealthRecord
  filter: EventKind | "all"
}) {
  const events = React.useMemo(() => eventsOf(record), [record])
  const shown =
    filter === "all" ? events : events.filter((e) => e.kind === filter)
  const days = shown.reduce<{ date: string; events: ChartEvent[] }[]>(
    (acc, e) => {
      const last = acc[acc.length - 1]
      if (last?.date === e.date) last.events.push(e)
      else acc.push({ date: e.date, events: [e] })
      return acc
    },
    []
  )

  if (days.length === 0)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No {EVENT_LABELS[filter as EventKind]?.toLowerCase() ?? "events"} on
        record
      </p>
    )

  return (
    <ol className="flex flex-col">
      {days.map((day, i) => (
        <li key={day.date} className="relative flex gap-3">
          {/* The rail: from under this day's icon to the next day's. */}
          <span
            aria-hidden
            className={cn(
              "absolute top-9 left-[17.5px] w-px bg-border",
              i < days.length - 1 ? "bottom-0" : "bottom-12"
            )}
          />
          <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary dark:text-primary-tint">
            <IconCalendar className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3 pb-6">
            <div className="flex flex-col pt-0.5">
              <span className="text-[15px] font-semibold">
                {usDate(day.date)} ({weekday(day.date)})
              </span>
              <span className="text-xs text-muted-foreground">
                {day.events.length}{" "}
                {day.events.length === 1 ? "event" : "events"}
              </span>
            </div>
            {day.events.map((e) => (
              <div key={`${e.kind}-${e.id}`} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-[33px] z-10 size-1.5 -translate-y-1/2 rounded-full bg-primary"
                />
                <article className="flex flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      <span className="font-normal text-muted-foreground">
                        {e.title.split(" : ")[0]}:
                      </span>{" "}
                      {e.title.split(" : ").slice(1).join(" : ")}
                    </h3>
                    <Badge
                      variant={e.tone}
                      className="h-5 rounded-full px-2 text-[13px] font-normal"
                    >
                      {e.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/80">{e.text}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <EventMeta icon={IconCalendar}>{usDate(e.date)}</EventMeta>
                    {e.time && <EventMeta icon={IconClock}>{e.time}</EventMeta>}
                    {e.who && <EventMeta icon={IconUser}>{e.who}</EventMeta>}
                    <EventMeta icon={IconLocation}>{e.where}</EventMeta>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

function EventMeta({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}
