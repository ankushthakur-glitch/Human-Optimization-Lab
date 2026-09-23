import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Separator } from "@/design-system/ui/separator"

const selectionActionsVariants = cva(
  "flex w-fit max-w-full items-center gap-2 rounded-4xl border bg-popover px-2 py-1.5 text-sm text-popover-foreground shadow-lg",
  {
    variants: {
      position: {
        static: "",
        // Floats over the content it acts on, clear of the viewport edge.
        floating:
          "sticky bottom-4 z-20 mx-auto animate-in fade-in-0 slide-in-from-bottom-2",
      },
    },
    defaultVariants: {
      position: "static",
    },
  }
)

/**
 * The bar that appears once rows are selected. It states the count first so
 * a destructive action is never taken against a number the person misread.
 */
function SelectionActions({
  position,
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof selectionActionsVariants>) {
  return (
    <div
      data-slot="selection-actions"
      role="toolbar"
      aria-label="Selection actions"
      className={cn(selectionActionsVariants({ position }), className)}
      {...props}
    />
  )
}

function SelectionActionsCount({
  count,
  noun = "item",
  className,
  ...props
}: React.ComponentProps<"span"> & { count: number; noun?: string }) {
  return (
    <span
      data-slot="selection-actions-count"
      aria-live="polite"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-3xl bg-primary-surface px-2.5 py-1 text-xs font-medium text-primary-tint tabular-nums",
        className
      )}
      {...props}
    >
      {count} {noun}
      {count === 1 ? "" : "s"} selected
    </span>
  )
}

function SelectionActionsSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="selection-actions-separator"
      orientation="vertical"
      className={cn("mx-0.5 h-5 self-center", className)}
      {...props}
    />
  )
}

function SelectionActionsGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="selection-actions-group"
      className={cn("flex min-w-0 items-center gap-1", className)}
      {...props}
    />
  )
}

export {
  SelectionActions,
  SelectionActionsCount,
  SelectionActionsSeparator,
  SelectionActionsGroup,
  selectionActionsVariants,
}
