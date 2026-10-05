"use client"

import * as React from "react"
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/design-system/ui/sheet"
import { KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The right-hand drawer a list opens into: 560px, full height, on the
   build's Sheet, which traps focus, closes on Esc and returns focus to the
   row that opened it. The header names the item and its place in the list,
   the footer walks the list (Previous, Next, and Arrow Up and Down) when
   the caller gives it one, and holds the actions. */

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
  /** 760px instead of 560px, for a panel with a two column body. */
  wide?: boolean
  children: React.ReactNode
}) {
  function walk(e: React.KeyboardEvent) {
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

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        finalFocus={returnFocus}
        onKeyDown={walk}
        className={cn(
          "gap-0 border-l-0 p-0 shadow-[-12px_0_32px_rgba(16,24,40,.12)] data-[side=right]:w-full",
          wide ? "data-[side=right]:sm:max-w-[760px]" : "data-[side=right]:sm:max-w-[560px]"
        )}
      >
        <header className="flex items-start gap-3 border-b border-border px-6 py-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3.5">
          {(total !== undefined || onPrevious || onNext) && (
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
      </SheetContent>
    </Sheet>
  )
}
