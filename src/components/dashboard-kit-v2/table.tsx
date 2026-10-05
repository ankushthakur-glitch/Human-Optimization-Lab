import * as React from "react"

import { cn } from "@/lib/utils"
import { DIVIDER, FOCUS } from "@/components/dashboard-kit-v2/icon"

/* TailAdmin's table in the build's table style. The header row is white
   with a border under it; cells sit at 12px (20px at the outer edges) and
   rows are divided by the inner divider. The table scrolls sideways inside
   its card, so the page never does. */

export function DataTable({
  minWidth = 880,
  boxClassName,
  className,
  children,
  ...props
}: React.ComponentProps<"table"> & {
  minWidth?: number
  /** The scroll box's classes: a height and overflow-auto make the table
      scroll inside its card, with a sticky header. */
  boxClassName?: string
}) {
  return (
    /* relative: the sr-only header text is absolutely positioned and must
       stay inside this scroll box, or it widens the page. */
    <div className={cn("relative w-full overflow-x-auto", boxClassName)}>
      <table className={cn("w-full border-collapse text-sm", className)} style={{ minWidth }} {...props}>
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
        "border-b border-border bg-card px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-4 last:pr-4",
        className
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle first:pl-4 last:pr-4", className)} {...props} />
}

/** A body row. With onOpen it is pressable: click or Enter opens it, and a
    selected row takes the primary wash with a 3px left edge. */
export function Row({
  onOpen,
  selected,
  className,
  ...props
}: Omit<React.ComponentProps<"tr">, "onClick"> & {
  onOpen?: (from: HTMLElement) => void
  selected?: boolean
}) {
  return (
    <tr
      {...(onOpen && {
        tabIndex: 0,
        onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
          if ((e.target as HTMLElement).closest("a,button,input,[role=tab]")) return
          onOpen(e.currentTarget)
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
          if (e.key === "Enter" && e.target === e.currentTarget) {
            e.preventDefault()
            onOpen(e.currentTarget)
          }
        },
      })}
      aria-selected={selected || undefined}
      className={cn(
        "border-b last:border-0",
        DIVIDER,
        onOpen && cn("cursor-pointer hover:bg-surface-row-hover", FOCUS, "focus-visible:ring-inset"),
        selected && "bg-primary-1 shadow-[inset_3px_0_0_var(--primary)]",
        className
      )}
      {...props}
    />
  )
}
