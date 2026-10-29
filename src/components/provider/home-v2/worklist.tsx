"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/ui/input-group"
import { Skeleton } from "@/design-system/ui/skeleton"
import { type Patient, fullName } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  Card,
  CardFooter,
  CardHeader,
  DIVIDER,
  DataTable,
  KitIcon,
  Row,
  Td,
  Th,
} from "@/components/dashboard-kit-v2"
import { fmtInt } from "@/components/provider/home-v2/clock"
import { RowActions, type RowAct } from "@/components/provider/home-v2/row-actions"
import {
  PRIORITY_WORD,
  PatientLink,
  SyncFailedBadge,
  ageSex,
} from "@/components/provider/home-v2/labels"
import { AGE_BUCKETS, type AgeBucket, CARD_TYPES } from "@/components/provider/home-v2/selectors"
import { columnsFor } from "@/components/provider/home-v2/worklist-columns"
import type { ItemType, Priority, QueueItem } from "@/components/provider/home-v2/types"

/* Row 2, under the metric cards: the work itself, an Urgent tab and one
   tab per type, each with its own columns (worklist-columns.tsx). The
   card keeps one height whatever the tab and the table scrolls inside it.
   A worked row shows its result with Undo for five seconds, then leaves,
   so the list empties as the day is worked. */

/** Urgent (every urgent item, any type), a type tab, or every type: the
    view a patient picked in the chart opens, which has no tab of its own. */
export type WorklistTab = "all" | "urgent" | ItemType
export const PAGE_SIZE = 15


/* The table scrolls inside the card under a sticky header, drawn like the
   Patients list's: the grey head surface, 36px tall, muted 12px labels. A
   collapsed border would scroll away with the rows, so the rule is a shadow. */
const SCROLL_BOX = "no-scrollbar min-h-0 flex-1 overflow-auto"

/* Each column has a set width (worklist-columns.tsx) and the cells never
   wrap, so a value takes the room it needs; 16px a side keeps them apart. */
const PATIENT_WIDTH = 260
const ACTION_WIDTH = 180
const CELL = "px-4 py-2.5 whitespace-nowrap first:pl-5 last:pr-5"

function HeadCell({ className, ...props }: React.ComponentProps<typeof Th>) {
  return (
    <Th
      className={cn(
        "sticky top-0 z-10 h-9 border-b-0 bg-surface-head px-4 py-2.5 shadow-[inset_0_-1px_0_var(--border)] first:pl-5 last:pr-5",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------- bits -- */

/** A filter the page set from a card or chart, shown with its clear button. */
function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge tone="primary" className="h-9 gap-1.5 pr-1">
      {label}
      <Button variant="ghost" size="icon-xs" aria-label={`Clear ${label}`} onClick={onClear}>
        <KitIcon icon={Cancel01Icon} size={12} />
      </Button>
    </Badge>
  )
}

function PatientCell({ patient }: { patient: Patient }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={fullName(patient)} photo={patient.photo} size={30} />
      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <PatientLink patient={patient} className="text-sm font-medium text-foreground" />
          <SyncFailedBadge patient={patient} />
        </span>
        <span className="text-xs text-muted-foreground/70 tabular-nums">
          {patient.id} · {ageSex(patient)}
        </span>
      </div>
    </div>
  )
}

/** A worked row's result with Undo, for five seconds. */
function Finished({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-muted-foreground">
      {label}
      <span aria-hidden>·</span>
      <Button variant="link" className="h-auto p-0 text-[13px]" onClick={onUndo}>
        Undo
      </Button>
    </span>
  )
}

/* ---------------------------------------------------------- worklist -- */

export function Worklist({
  sectionRef,
  ready,
  tab,
  onTab,
  counts,
  query,
  onQuery,
  priority,
  onClearPriority,
  age,
  onClearAge,
  rows,
  byId,
  finished,
  selectedId,
  onOpen,
  onUndo,
  onAct,
}: {
  sectionRef: React.RefObject<HTMLElement | null>
  ready: boolean
  tab: WorklistTab
  onTab: (tab: WorklistTab) => void
  counts: Record<WorklistTab, number>
  query: string
  onQuery: (q: string) => void
  /** Set by the priority chart. */
  priority: Priority | ""
  onClearPriority: () => void
  /** Set by the time open chart. */
  age: AgeBucket | ""
  onClearAge: () => void
  /** Items after every filter. */
  rows: QueueItem[]
  byId: Map<string, Patient>
  finished: Record<string, string>
  selectedId?: string
  onOpen: (item: QueueItem, from: HTMLElement) => void
  onUndo: (id: string) => void
  onAct: RowAct
}) {
  /* The page resets whenever what is asked for changes. */
  const ask = [tab, query, priority, age].join("|")
  const [paging, setPaging] = React.useState({ ask, page: 1 })
  const page = paging.ask === ask ? paging.page : 1
  const setPage = (next: number) => setPaging({ ask, page: next })

  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pages)
  const from = (current - 1) * PAGE_SIZE
  const to = Math.min(total, from + PAGE_SIZE)
  const hasFilter = !!(query.trim() || priority || age)
  const empty = total === 0 ? (hasFilter ? "No matching items" : "No items") : null
  const ageLabel = age ? AGE_BUCKETS.find((b) => b.key === age)?.label : null
  const columns = columnsFor(tab)

  return (
    <Card
      ref={sectionRef}
      tabIndex={-1}
      aria-labelledby="worklist"
      className="h-[600px] scroll-mt-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {/* The card's heading on the left, search and filters on the right. */}
      <CardHeader
        title="Abnormal results"
        titleId="worklist"
        className="h-[65px] py-0"
        actions={
        <div className="flex flex-wrap items-center gap-2">
          {tab === "all" && <FilterBadge label="All types" onClear={() => onTab(CARD_TYPES[0]!)} />}
          {priority && <FilterBadge label={PRIORITY_WORD[priority]} onClear={onClearPriority} />}
          {ageLabel && <FilterBadge label={ageLabel} onClear={onClearAge} />}
          <InputGroup className="h-9 w-60 rounded-[7.2px] border-border bg-card">
            <InputGroupAddon>
              <KitIcon icon={Search01Icon} className="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search patient name or ID"
              aria-label="Search patient name or ID"
            />
          </InputGroup>
        </div>
        }
      />

      {!ready ? (
        <WorklistSkeleton />
      ) : empty ? (
        <Empty className="min-h-0 flex-1 py-14">
          <EmptyHeader>
            <EmptyTitle>{empty}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable minWidth={PATIENT_WIDTH + ACTION_WIDTH + columns.reduce((sum, c) => sum + c.width, 0)} boxClassName={SCROLL_BOX}>
          <colgroup>
            <col style={{ width: PATIENT_WIDTH }} />
            {columns.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: ACTION_WIDTH }} />
          </colgroup>
          <thead>
            <tr>
              <HeadCell>Patient</HeadCell>
              {columns.map((c) => (
                <HeadCell key={c.key}>{c.head}</HeadCell>
              ))}
              <HeadCell>Action</HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.slice(from, to).map((item) => {
              const patient = byId.get(item.patientId)
              const done = finished[item.id]
              return patient ? (
                <Row key={item.id} selected={item.id === selectedId} onOpen={(el) => onOpen(item, el)}>
                  <Td className={CELL}>
                    <PatientCell patient={patient} />
                  </Td>
                  {columns.map((c) => (
                    <Td key={c.key} className={cn(CELL, done && "opacity-50")}>
                      {c.cell(item)}
                    </Td>
                  ))}
                  {/* A worked row trades its actions for the result and Undo. */}
                  <Td className={CELL}>
                    {done ? <Finished label={done} onUndo={() => onUndo(item.id)} /> : <RowActions item={item} onAct={onAct} />}
                  </Td>
                </Row>
              ) : null
            })}
          </tbody>
        </DataTable>
      )}

      {ready && !empty && (
        <CardFooter className="justify-between text-[13px] text-muted-foreground tabular-nums">
          <span>Rows per page: {PAGE_SIZE}</span>
          <span className="inline-flex items-center gap-2">
            {fmtInt(from + 1)}-{fmtInt(to)} of {fmtInt(total)}
            {pages > 1 && (
              <>
                <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <KitIcon icon={ArrowLeft01Icon} />
                </Button>
                <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  <KitIcon icon={ArrowRight01Icon} />
                </Button>
              </>
            )}
          </span>
        </CardFooter>
      )}
    </Card>
  )
}

function WorklistSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-6 border-b px-4 py-2.5 last:border-0", DIVIDER)}>
          <div className="flex w-[22%] items-center gap-3">
            <Skeleton className="size-[30px] rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4 rounded-sm" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-[22px] flex-1 rounded-[4.32px]" />
          <Skeleton className="h-[22px] w-16 rounded-[4.32px]" />
          <Skeleton className="h-4 w-20 rounded-sm" />
        </div>
      ))}
    </div>
  )
}
