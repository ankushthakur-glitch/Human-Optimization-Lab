import * as React from "react"

import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/components/dashboard-kit/icon"

/* TailAdmin's table in the build's table style: a white header row with a
   border under it, 12px cells (20px at the outer edges), rows divided by the
   inner divider. It scrolls sideways inside its card, never the page. */

const DIVIDER = "border-[color-mix(in_oklab,var(--border)_65%,transparent)]"

export function DataTable({
  className,
  minWidth = 880,
  children,
  ...props
}: React.ComponentProps<"table"> & { minWidth?: number }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        style={{ minWidth }}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border bg-card px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5",
        className
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-3 py-3 align-middle first:pl-5 last:pr-5", className)}
      {...props}
    />
  )
}

/** A body row. Pressable rows open on click or Enter; a selected row takes
    the primary wash with a 3px edge. */
export function Tr({
  onOpen,
  keyboard = true,
  selected,
  className,
  ...props
}: Omit<React.ComponentProps<"tr">, "onClick"> & {
  onOpen?: (from: HTMLElement) => void
  /** False when a control inside the row already takes the keyboard. */
  keyboard?: boolean
  selected?: boolean
}) {
  return (
    <tr
      {...(onOpen && {
        tabIndex: keyboard ? 0 : undefined,
        onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
          if ((e.target as HTMLElement).closest("a,button")) return
          onOpen(e.currentTarget)
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
          if (e.target === e.currentTarget && e.key === "Enter") {
            e.preventDefault()
            onOpen(e.currentTarget)
          }
        },
      })}
      aria-selected={selected || undefined}
      className={cn(
        "border-b last:border-0",
        DIVIDER,
        onOpen && cn("cursor-pointer hover:bg-surface-row-hover", FOCUS_RING, "focus-visible:ring-inset"),
        selected && "bg-primary-1 shadow-[inset_3px_0_0_var(--primary)]",
        className
      )}
      {...props}
    />
  )
}
