import * as React from "react"

import { cn } from "@/lib/utils"
import { FOCUS } from "@/components/dashboard-kit-v2/icon"

import { Table, TableCell, TableHead, TableRow } from "@/design-system/ui/table"

/* The design system's table (as in Medications), with the build's 16px
   outer edges. The table scrolls sideways inside its card, so the page
   never does. */
export function DataTable({
  minWidth = 880,
  boxClassName,
  style,
  ...props
}: React.ComponentProps<"table"> & {
  minWidth?: number
  /** The scroll box's classes: a height and overflow-auto make the table
      scroll inside its card, with a sticky header. */
  boxClassName?: string
}) {
  return <Table containerClassName={boxClassName} style={{ minWidth, ...style }} {...props} />
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return <TableHead scope="col" className={cn("border-b bg-card first:pl-4 last:pr-4", className)} {...props} />
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <TableCell className={cn("whitespace-normal first:pl-4 last:pr-4", className)} {...props} />
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
    <TableRow
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
        "last:border-0",
        onOpen && cn("cursor-pointer", FOCUS, "focus-visible:ring-inset"),
        selected && "bg-primary-1 shadow-[inset_3px_0_0_var(--primary)]",
        className
      )}
      {...props}
    />
  )
}
