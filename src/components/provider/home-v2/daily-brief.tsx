"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { Badge, DIVIDER, FOCUS, KitIcon } from "@/components/dashboard-kit-v2"
import { AIMark, AI_SURFACE, AI_TITLE } from "@/components/provider/home-v2/ai-summary"
import { fmtInt } from "@/components/provider/home-v2/clock"
import { TYPE_META, itemName, plural } from "@/components/provider/home-v2/labels"
import { type TypeCount, groupByPatient } from "@/components/provider/home-v2/selectors"
import type { ItemType, QueueItem } from "@/components/provider/home-v2/types"
import type { WorklistTab } from "@/components/provider/home-v2/worklist"

/* The AI Daily Brief, a bar at the top of the page that opens to the day:
   one summary paragraph over the open queue, then the queue in three
   priority lanes. It reads the open queue the metric cards read, so the two
   never disagree. Items open the side panel. */

type Cat = "urgent" | Exclude<ItemType, "outside_care">

type Day = {
  open: QueueItem[]
  urgent: QueueItem[]
  byId: Map<string, Patient>
  of: (c: Cat) => QueueItem[]
  n: (c: Cat) => number
  fresh: QueueItem[]
  groups: ReturnType<typeof groupByPatient>
  who: (item: QueueItem) => string
}

type Ctx = { day: Day; onPick: (tab: WorklistTab) => void; onOpen: (item: QueueItem, from: HTMLElement) => void }

function useDay(open: QueueItem[], urgent: QueueItem[], counts: TypeCount[], byId: Map<string, Patient>): Day {
  return React.useMemo(() => {
    const of = (c: Cat) => (c === "urgent" ? urgent : open.filter((i) => i.type === c))
    const n = (c: Cat) => (c === "urgent" ? urgent.length : (counts.find((t) => t.type === c)?.open ?? 0))
    return {
      open,
      urgent,
      byId,
      of,
      n,
      fresh: open.filter((i) => i.isNew).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      groups: groupByPatient(open),
      who: (item) => {
        const p = byId.get(item.patientId)
        return p ? fullName(p) : item.patientId
      },
    }
  }, [open, urgent, counts, byId])
}

/* -------------------------------------------------------------- bits -- */

function Num({ cat, children }: { cat: Cat; children: React.ReactNode }) {
  const tone: Record<Cat, string> = {
    urgent: "text-destructive",
    abnormal_result: "text-primary",
    medication_change: "text-info",
    overdue_order: "text-warning",
    care_gap: "text-category-2",
    review_due: "text-success",
  }
  return <strong className={cn("font-semibold", tone[cat])}>{children}</strong>
}

/** A pressable item line: name, patient, and an optional right side. */
function ItemLine({ item, ctx, trail }: { item: QueueItem; ctx: Ctx; trail?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => ctx.onOpen(item, e.currentTarget)}
      className={cn("flex w-full min-w-0 items-center gap-2 rounded-[5.76px] px-2 py-1.5 text-left hover:bg-surface-row-hover", FOCUS)}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium">{itemName(item)}</span>
        <span className="truncate text-xs text-muted-foreground">{ctx.day.who(item)}</span>
      </span>
      {trail}
    </button>
  )
}

/* Two short sentences: what to start with, then what else is open, by
   type, and how much of it is new. */
function Paragraph({ day }: { day: Day }) {
  const n = day.n
  if (!day.open.length) return <p className="text-sm leading-6">Nothing is waiting on you today.</p>
  const parts: [Cat, string, [string, string]][] = [
    ["abnormal_result", "results", ["result", "results"]],
    ["medication_change", "medications", ["medication", "medications"]],
    ["overdue_order", "orders", ["order", "orders"]],
    ["care_gap", "care gaps", ["care gap", "care gaps"]],
    ["review_due", "reviews", ["review", "reviews"]],
  ]
  const shown = parts.filter(([c]) => n(c) > 0)
  return (
    <p className="text-sm leading-6 tabular-nums">
      {n("urgent") > 0 && (
        <>
          Start with <Num cat="urgent">{plural(n("urgent"), ["urgent item", "urgent items"])}</Num>.{" "}
        </>
      )}
      You have <strong className="font-semibold">{plural(day.open.length, ["open item", "open items"])}</strong> across{" "}
      {plural(day.groups.length, ["patient", "patients"])}:{" "}
      {shown.map(([c, , noun], i) => (
        <React.Fragment key={c}>
          {i > 0 && (i === shown.length - 1 ? " and " : ", ")}
          <Num cat={c}>{plural(n(c), noun)}</Num>
        </React.Fragment>
      ))}
      .{day.fresh.length > 0 && ` ${fmtInt(day.fresh.length)} new since your last visit.`}
    </p>
  )
}

/* ------------------------------------------------------------- lanes -- */

/* Three lanes by priority. Each shows three items and scrolls inside for
   the rest, so the lanes keep one height. */
function Lanes(ctx: Ctx) {
  const { day } = ctx
  const lanes = [
    { title: "Act now", items: day.open.filter((i) => i.priority === "urgent"), tone: "bg-destructive" },
    { title: "Today", items: day.open.filter((i) => i.priority === "moderate"), tone: "bg-amber-500" },
    { title: "Can wait", items: day.open.filter((i) => i.priority === "routine"), tone: "bg-info" },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {lanes.map((l) => (
        <section key={l.title} className="flex flex-col rounded-[7.2px] border border-border">
          <h4 className={cn("flex items-center gap-2 border-b px-3 py-2 text-[13px] font-semibold", DIVIDER)}>
            <span aria-hidden className={cn("size-2 rounded-full", l.tone)} />
            {l.title}
            <Badge className="ml-auto">{fmtInt(l.items.length)}</Badge>
          </h4>
          <div className="no-scrollbar flex h-[152px] flex-col overflow-y-auto p-1">
            {l.items.map((i) => (
              <ItemLine key={i.id} item={i} ctx={ctx} trail={<span className="text-xs text-muted-foreground">{TYPE_META[i.type].word}</span>} />
            ))}
            {l.items.length === 0 && <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Nothing here</p>}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- brief -- */

export function DailyBrief({
  ready,
  open: queue,
  urgent,
  counts,
  byId,
  onPick,
  onOpen,
}: {
  ready: boolean
  open: QueueItem[]
  urgent: QueueItem[]
  counts: TypeCount[]
  byId: Map<string, Patient>
  onPick: (tab: WorklistTab) => void
  onOpen: (item: QueueItem, from: HTMLElement) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const bodyId = React.useId()
  const day = useDay(queue, urgent, counts, byId)

  return (
    <section aria-label="AI Daily Brief" className={cn("overflow-hidden rounded-[10px]", AI_SURFACE)}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
        className={cn("flex h-12 w-full items-center gap-2.5 px-3.5 text-left", FOCUS, "focus-visible:ring-inset")}
      >
        <AIMark />
        <span className={cn("text-[15px]", AI_TITLE)}>AI Daily Brief</span>
        <span className="truncate text-[13px] text-foreground/70">Here’s where to focus today</span>
        <KitIcon icon={ArrowDown01Icon} className={cn("ml-auto shrink-0 text-primary transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div id={bodyId} className="px-3 pb-3">
          <div className="flex flex-col gap-3.5 rounded-[7.2px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
            {!ready ? (
              <>
                <Skeleton className="h-4 w-[85%] rounded-sm" />
                <Skeleton className="h-4 w-[60%] rounded-sm" />
                <div className="grid gap-3 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-[7.2px]" />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Paragraph day={day} />
                <Lanes day={day} onPick={onPick} onOpen={onOpen} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
