import * as React from "react"

import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/components/dashboard-kit/icon"

/* A card's list row: a leading avatar or icon box, a title over an xs
   subline, and trailing meta and action. Pressable rows take Enter. */

export function ListRow({
  lead,
  title,
  subline,
  trail,
  onOpen,
  className,
  children,
}: {
  lead?: React.ReactNode
  title: React.ReactNode
  subline?: React.ReactNode
  trail?: React.ReactNode
  onOpen?: (from: HTMLElement) => void
  className?: string
  /** Extra content under the subline (e.g. a progress bar). */
  children?: React.ReactNode
}) {
  return (
    <li
      {...(onOpen && {
        tabIndex: 0,
        role: "button",
        onClick: (e: React.MouseEvent<HTMLLIElement>) => onOpen(e.currentTarget),
        onKeyDown: (e: React.KeyboardEvent<HTMLLIElement>) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            onOpen(e.currentTarget)
          }
        },
      })}
      className={cn(
        "flex items-center gap-3 border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-3 last:border-0",
        onOpen && cn("cursor-pointer hover:bg-surface-row-hover", FOCUS_RING, "focus-visible:ring-inset"),
        className
      )}
    >
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{title}</div>
        {subline && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {subline}
          </div>
        )}
        {children}
      </div>
      {trail && <div className="flex shrink-0 items-center gap-3">{trail}</div>}
    </li>
  )
}
