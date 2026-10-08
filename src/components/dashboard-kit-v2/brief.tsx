"use client"

import * as React from "react"
import {
  Calendar03Icon,
  ClipboardIcon,
  File01Icon,
  Hospital01Icon,
  Link01Icon,
  Note01Icon,
  PillIcon,
  SparklesIcon,
  Task01Icon,
  TestTube01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover"
import { Skeleton } from "@/design-system/ui/skeleton"
import { type BriefItem, FEEDBACK_REASONS, type Source, type SourceKind, type Tone } from "@/lib/brief/types"
import { Badge } from "@/components/dashboard-kit-v2/badge"
import { Card } from "@/components/dashboard-kit-v2/card"
import { DIVIDER, FOCUS, type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The AI brief:
   three or four sourced sentences under a sparkles header, marked twice as
   AI (the icon and the words "AI summary"), each with the chips that open
   its evidence. The brief never acts: its one footer action is the
   caller's, the thumbs send feedback, and nothing here places an order,
   adds a diagnosis or messages anyone. */

const DOT: Record<Tone, string> = {
  urgent: "bg-destructive",
  action: "bg-warning",
  clinical: "bg-primary",
  improving: "bg-success",
  info: "bg-foreground/20",
}

const KIND_ICON: Record<SourceKind, IconDef> = {
  lab: TestTube01Icon,
  document: File01Icon,
  encounter: Hospital01Icon,
  medication: PillIcon,
  patient: UserIcon,
  plan: Note01Icon,
  order: Task01Icon,
  filter: Link01Icon,
}

/* A filter chip's icon follows what it filters to. */
const FILTER_ICON: Record<string, IconDef> = {
  overdue_order: ClipboardIcon,
  care_gap: Calendar03Icon,
  abnormal_result: TestTube01Icon,
  medication_change: PillIcon,
  outside_care: Hospital01Icon,
}

export function SourceChip({
  source,
  index,
  total,
  onOpen,
}: {
  source: Source
  index: number
  total: number
  onOpen: (source: Source) => void
}) {
  const icon = (source.kind === "filter" && source.filter?.tab && FILTER_ICON[source.filter.tab]) || KIND_ICON[source.kind]
  return (
    <button
      type="button"
      onClick={() => onOpen(source)}
      aria-label={`${source.label}, source ${index + 1} of ${total}`}
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-[4.32px] border border-border bg-card px-2 text-xs text-foreground/70 tabular-nums hover:bg-surface-row-hover hover:text-foreground",
        FOCUS
      )}
    >
      <KitIcon icon={icon} size={12} />
      {source.label}
    </button>
  )
}

export type BriefFeedback = { rating: "up" | "down"; reason?: string }

export function AIBrief({
  id,
  title,
  meta,
  items,
  loading,
  emptyText,
  generatedAt,
  stale,
  onRefresh,
  about,
  action,
  onOpenSource,
  onFeedback,
  className,
}: {
  id?: string
  title: string
  meta: React.ReactNode
  items: BriefItem[]
  loading?: boolean
  emptyText: string
  /** h:mm AM. */
  generatedAt: string
  /** True when records newer than the data window have arrived. */
  stale?: boolean
  onRefresh?: () => void
  /** What "About this summary" opens: model, data window, limitations. */
  about: { model: string; window: string; limitations: string }
  /** The one footer action (an outline button). */
  action?: React.ReactNode
  onOpenSource: (source: Source) => void
  onFeedback?: (feedback: BriefFeedback) => void
  className?: string
}) {
  const [rating, setRating] = React.useState<"up" | "down" | null>(null)
  const [reason, setReason] = React.useState<string | null>(null)
  const [reasonsOpen, setReasonsOpen] = React.useState(false)
  const titleId = React.useId()

  function rate(next: "up" | "down") {
    if (next === "up") {
      setRating("up")
      setReason(null)
      setReasonsOpen(false)
      onFeedback?.({ rating: "up" })
    } else {
      setRating("down")
      setReasonsOpen(true)
    }
  }

  function sendReason(r: string) {
    setReason(r)
    setReasonsOpen(false)
    onFeedback?.({ rating: "down", reason: r })
  }

  return (
    <Card id={id} tabIndex={-1} aria-labelledby={titleId} className={cn("h-full scroll-mt-3 outline-none", className)}>
      <span
        aria-hidden
        className="h-[3px] w-full shrink-0 bg-[linear-gradient(90deg,var(--primary),var(--primary-4)_55%,transparent)]"
      />
      <header className="flex items-start gap-3 px-5 pt-4 pb-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[5.76px] bg-primary-surface text-primary">
          <KitIcon icon={SparklesIcon} size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-base leading-[22px] font-semibold">
              {title}
            </h3>
            <Badge tone="info" icon={SparklesIcon}>
              AI summary
            </Badge>
          </div>
          <p className="text-[13px] leading-[18px] text-muted-foreground tabular-nums">{meta}</p>
        </div>
      </header>

      {stale && (
        <p className="mx-5 mt-2 flex items-center gap-1.5 rounded-[5.76px] bg-warning-1 px-3 py-1.5 text-[13px] text-warning">
          Newer records available
          <span aria-hidden>·</span>
          <button type="button" onClick={onRefresh} className={cn("rounded-sm font-medium underline-offset-2 hover:underline", FOCUS)}>
            Refresh summary
          </button>
        </p>
      )}

      <div className="flex flex-1 flex-col px-5 pt-2 pb-2">
        {loading ? (
          <ul className={cn("flex flex-col divide-y", DIVIDER.replace("border-", "divide-"))}>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-3 py-3.5">
                <Skeleton className="mt-[7px] size-2 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-[82%] rounded-sm" />
                  <Skeleton className="h-4 w-[55%] rounded-sm" />
                  <Skeleton className="h-[22px] w-28 rounded-[4.32px]" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="py-3.5 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ol className={cn("flex flex-col divide-y", DIVIDER.replace("border-", "divide-"))}>
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5">
                <span aria-hidden className={cn("mt-[7px] size-2 shrink-0 rounded-full", DOT[item.tone])} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-sm leading-[22px] tabular-nums">
                    <strong className="font-semibold">{item.lead}</strong> {item.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.sources.map((s, i) => (
                      <SourceChip
                        key={`${item.id}-${s.refId}-${i}`}
                        source={s}
                        index={i}
                        total={item.sources.length}
                        onOpen={onOpenSource}
                      />
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-1 pb-4">
        {action}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span>Generated {generatedAt} · verify against sources before acting ·</span>
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn("rounded-sm text-primary-tint underline-offset-2 hover:underline", FOCUS)}
                />
              }
            >
              About this summary
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 gap-3 rounded-[7.2px] p-4">
              <dl className="flex flex-col gap-2.5 text-[13px]">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Model</dt>
                  <dd>{about.model}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Data window</dt>
                  <dd className="tabular-nums">{about.window}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Limitations</dt>
                  <dd>{about.limitations}</dd>
                </div>
              </dl>
            </PopoverContent>
          </Popover>
          <span className="ml-1 inline-flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Helpful"
              aria-pressed={rating === "up"}
              onClick={() => rate("up")}
              className={cn("rounded-[5.76px] text-muted-foreground", rating === "up" && "bg-primary-surface text-primary-tint")}
            >
              <KitIcon icon={ThumbsUpIcon} size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Not helpful"
              aria-pressed={rating === "down"}
              aria-expanded={reasonsOpen}
              onClick={() => rate("down")}
              className={cn("rounded-[5.76px] text-muted-foreground", rating === "down" && "bg-secondary text-foreground")}
            >
              <KitIcon icon={ThumbsDownIcon} size={14} />
            </Button>
          </span>
        </div>
        {reasonsOpen && (
          <div role="group" aria-label="What was wrong" className="flex w-full flex-wrap items-center gap-1.5">
            {FEEDBACK_REASONS.map((r) => (
              <Button key={r} variant="outline" size="xs" onClick={() => sendReason(r)} className="rounded-[5.76px] font-normal">
                {r}
              </Button>
            ))}
          </div>
        )}
        {rating === "down" && reason && !reasonsOpen && (
          <p role="status" className="w-full text-xs text-muted-foreground">
            Thanks, sent to the clinical safety queue
          </p>
        )}
      </footer>
    </Card>
  )
}
