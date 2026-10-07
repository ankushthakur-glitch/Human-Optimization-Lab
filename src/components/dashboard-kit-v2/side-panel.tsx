"use client"

import * as React from "react"
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/design-system/ui/sheet"
import { KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The right-hand drawer a list opens into: 610px, full height, on the
   build's Sheet, which traps focus, closes on Esc and returns focus to the
   row that opened it. The header names the item and its place in the list,
   the footer walks the list (Previous, Next, and Arrow Up and Down) when
   the caller gives it one, and holds the actions. */

function useWalk(onPrevious?: () => void, onNext?: () => void) {
  return (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest("input,textarea,select,[role=radiogroup],[role=listbox],[role=menu]")) return
    if (e.key === "ArrowDown" && onNext) {
      e.preventDefault()
      onNext()
    } else if (e.key === "ArrowUp" && onPrevious) {
      e.preventDefault()
      onPrevious()
    }
  }
}

function PanelFooter({
  onPrevious,
  onNext,
  walkable,
  actions,
  compact,
}: {
  onPrevious?: () => void
  onNext?: () => void
  walkable?: boolean
  actions?: React.ReactNode
  compact?: boolean
}) {
  if (compact)
    return (
      /* Two columns of actions, the primary across the row when the count is
         odd; the list is walked from the rows (and Arrow Up and Down). */
      <footer className="grid grid-cols-2 gap-2 border-t border-border bg-surface-head/50 px-5 py-3 [&>*]:w-full [&>*:first-child:nth-last-child(odd)]:col-span-2">
        {actions}
      </footer>
    )
  return (
    <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-head/50 px-6 py-3.5">
      {(walkable || onPrevious || onNext) && (
        <>
          <Button variant="outline" disabled={!onPrevious} onClick={onPrevious}>
            <KitIcon icon={ArrowLeft01Icon} />
            Previous
          </Button>
          <Button variant="outline" disabled={!onNext} onClick={onNext}>
            Next
            <KitIcon icon={ArrowRight01Icon} />
          </Button>
        </>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </footer>
  )
}

export function SidePanel({
  open,
  onClose,
  returnFocus,
  lead,
  title,
  meta,
  index,
  total,
  onPrevious,
  onNext,
  actions,
  wide,
  children,
}: {
  open: boolean
  onClose: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
  lead?: React.ReactNode
  title: React.ReactNode
  meta?: React.ReactNode
  /** Zero-based place in the list. */
  index?: number
  total?: number
  onPrevious?: () => void
  onNext?: () => void
  actions?: React.ReactNode
  /** 810px instead of 610px, for a panel with a two column body. */
  wide?: boolean
  children: React.ReactNode
}) {
  const walk = useWalk(onPrevious, onNext)

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        finalFocus={returnFocus}
        onKeyDown={walk}
        className={cn(
          "gap-0 border-l-0 p-0 shadow-[-12px_0_32px_rgba(16,24,40,.12)] data-[side=right]:w-full",
          wide ? "data-[side=right]:sm:max-w-[810px]" : "data-[side=right]:sm:max-w-[610px]"
        )}
      >
        <header className="flex items-start gap-3 border-b border-border bg-surface-head/50 px-6 py-4">
          {lead}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="truncate text-base leading-6 font-semibold">{title}</SheetTitle>
            {meta && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground tabular-nums">
                {meta}
              </div>
            )}
          </div>
          {total !== undefined && total > 0 && index !== undefined && (
            <span className="mt-1 shrink-0 text-[13px] text-muted-foreground tabular-nums">
              {index + 1} of {total}
            </span>
          )}
          <SheetClose render={<Button variant="outline" size="icon-sm" aria-label="Close" className="rounded-lg" />}>
            <KitIcon icon={Cancel01Icon} />
          </SheetClose>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken/30 px-6 py-5">{children}</div>
        <PanelFooter onPrevious={onPrevious} onNext={onNext} walkable={total !== undefined} actions={actions} />
      </SheetContent>
    </Sheet>
  )
}

/* The same panel docked beside the dashboard instead of over it: a full
   height sidebar with its own scroll, always shown, no close button.
   The caller decides what it shows when nothing has been picked. */
export function DockedPanel({
  title,
  meta,
  index,
  total,
  onPrevious,
  onNext,
  actions,
  className,
  children,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  index?: number
  total?: number
  onPrevious?: () => void
  onNext?: () => void
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const walk = useWalk(onPrevious, onNext)
  return (
    <aside
      onKeyDown={walk}
      className={cn(
        "flex h-full w-[440px] shrink-0 flex-col overflow-hidden border-l bg-card",
        className
      )}
    >
      <header className="flex items-start gap-3 border-b border-border bg-surface-head/50 px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {meta && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground tabular-nums">
              {meta}
            </div>
          )}
        </div>
        {total !== undefined && total > 1 && index !== undefined && (
          <span className="mt-1 shrink-0 text-[13px] text-muted-foreground tabular-nums">
            {index + 1} of {total}
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken/30 px-5 py-5">{children}</div>
      <PanelFooter onPrevious={onPrevious} onNext={onNext} actions={actions} compact />
    </aside>
  )
}
