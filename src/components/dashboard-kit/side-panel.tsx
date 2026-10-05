"use client"

import * as React from "react"
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/design-system/ui/sheet"
import { Icon } from "@/components/dashboard-kit/icon"

/* The right-hand drawer a list opens into: 560px, full height. The header
   names the item and its place in the list; Previous and Next (and Arrow Up
   and Arrow Down while the panel has focus) walk the list; actions sit on
   the right of the footer. The build's Sheet traps focus, closes on Esc and
   hands focus back to the row that opened it. */

export function SidePanel({
  open,
  onClose,
  returnFocus,
  lead,
  title,
  meta,
  position,
  onPrevious,
  onNext,
  actions,
  children,
}: {
  open: boolean
  onClose: () => void
  /** The element focus returns to on close. */
  returnFocus?: React.RefObject<HTMLElement | null>
  lead?: React.ReactNode
  title: React.ReactNode
  /** The line under the title (patient link, ID, age and sex). */
  meta?: React.ReactNode
  /** [index from 0, total]. */
  position?: [number, number]
  onPrevious?: () => void
  onNext?: () => void
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  function onKeyDown(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement
    if (t.closest("input,textarea,[role=radio],[role=radiogroup],[role=listbox]")) return
    if (e.key === "ArrowDown" && onNext) {
      e.preventDefault()
      onNext()
    } else if (e.key === "ArrowUp" && onPrevious) {
      e.preventDefault()
      onPrevious()
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        finalFocus={returnFocus}
        onKeyDown={onKeyDown}
        className="gap-0 border-l-0 p-0 shadow-[-12px_0_32px_rgba(16,24,40,.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
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
          {position && position[1] > 0 && (
            <span className="mt-1.5 shrink-0 text-[13px] text-muted-foreground tabular-nums">
              {position[0] + 1} of {position[1]}
            </span>
          )}
          <SheetClose
            render={<Button variant="outline" size="icon-sm" aria-label="Close" className="rounded-lg" />}
          >
            <Icon icon={Cancel01Icon} />
          </SheetClose>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3.5">
          <Button variant="outline" disabled={!onPrevious} onClick={onPrevious}>
            <Icon icon={ArrowLeft01Icon} />
            Previous
          </Button>
          <Button variant="outline" disabled={!onNext} onClick={onNext}>
            Next
            <Icon icon={ArrowRight01Icon} />
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
        </footer>
      </SheetContent>
    </Sheet>
  )
}
