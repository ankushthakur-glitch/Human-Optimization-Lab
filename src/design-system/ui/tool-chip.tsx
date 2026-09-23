import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"

import { Spinner } from "@/design-system/ui/spinner"

const toolChipVariants = cva(
  "group/tool-chip inline-flex h-7 w-fit max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-3xl border px-2.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      status: {
        pending: "border-border bg-muted/50 text-muted-foreground",
        running: "border-primary/30 bg-primary-surface text-primary-tint",
        success: "border-transparent bg-success-surface text-success",
        error: "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

const STATUS_ICON = {
  pending: Clock01Icon,
  running: null,
  success: CheckmarkCircle02Icon,
  error: Alert02Icon,
} as const

function ToolChip({
  status = "pending",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof toolChipVariants>) {
  return (
    <span
      data-slot="tool-chip"
      data-status={status}
      className={cn(toolChipVariants({ status }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

/** Falls back to the status glyph so a chip only needs an icon when it wants a custom one. */
function ToolChipStatus({
  status = "pending",
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof toolChipVariants>) {
  const icon = status ? STATUS_ICON[status] : null
  return (
    <span
      data-slot="tool-chip-status"
      aria-hidden="true"
      className={cn("flex items-center", className)}
      {...props}
    >
      {status === "running" ? (
        <Spinner className="size-3.5" role="presentation" aria-hidden="true" />
      ) : icon ? (
        <HugeiconsIcon icon={icon} />
      ) : (
        <HugeiconsIcon icon={Wrench01Icon} />
      )}
    </span>
  )
}

function ToolChipLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tool-chip-label"
      className={cn("truncate", className)}
      {...props}
    />
  )
}

function ToolChipMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tool-chip-meta"
      className={cn(
        "shrink-0 font-normal tabular-nums opacity-70 before:mr-1.5 before:content-['·']",
        className
      )}
      {...props}
    />
  )
}

function ToolChipGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tool-chip-group"
      className={cn("flex w-full flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  )
}

export {
  ToolChip,
  ToolChipStatus,
  ToolChipLabel,
  ToolChipMeta,
  ToolChipGroup,
  toolChipVariants,
}
