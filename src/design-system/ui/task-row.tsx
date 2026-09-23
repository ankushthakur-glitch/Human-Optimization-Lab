import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"

import { Spinner } from "@/design-system/ui/spinner"

function TaskList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="task-list"
      className={cn("flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  )
}

const taskRowVariants = cva(
  "group/task-row relative flex w-full min-w-0 items-start gap-3 py-2.5 text-sm",
  {
    variants: {
      status: {
        pending: "text-muted-foreground",
        running: "text-foreground",
        done: "text-foreground",
        failed: "text-foreground",
        skipped: "text-muted-foreground line-through decoration-border",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

/**
 * Rows draw their own connector to the next row, so a list needs no extra
 * markup between items. `last` drops the trailing line.
 */
function TaskRow({
  status = "pending",
  last = false,
  className,
  children,
  ...props
}: React.ComponentProps<"li"> &
  VariantProps<typeof taskRowVariants> & { last?: boolean }) {
  return (
    <li
      data-slot="task-row"
      data-status={status}
      className={cn(taskRowVariants({ status }), className)}
      {...props}
    >
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-[11px] w-px bg-border"
        />
      ) : null}
      {children}
    </li>
  )
}

function TaskRowStatus({
  status = "pending",
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof taskRowVariants>) {
  return (
    <span
      data-slot="task-row-status"
      data-status={status}
      className={cn(
        "relative z-1 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background [&_svg]:size-3.5",
        status === "done" &&
          "border-transparent bg-success-surface text-success",
        status === "running" &&
          "border-primary/30 bg-primary-surface text-primary-tint",
        status === "failed" &&
          "border-transparent bg-destructive/10 text-destructive",
        (status === "pending" || status === "skipped") &&
          "text-muted-foreground",
        className
      )}
      {...props}
    >
      {status === "running" ? (
        <Spinner className="size-3.5" role="presentation" aria-hidden="true" />
      ) : status === "done" ? (
        <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden="true" />
      ) : status === "failed" ? (
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
      ) : (
        <HugeiconsIcon icon={Clock01Icon} aria-hidden="true" />
      )}
    </span>
  )
}

function TaskRowContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="task-row-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1 pb-1", className)}
      {...props}
    />
  )
}

function TaskRowTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="task-row-title"
      className={cn("flex min-w-0 items-center gap-2 font-medium", className)}
      {...props}
    />
  )
}

function TaskRowDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="task-row-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function TaskRowMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="task-row-meta"
      className={cn(
        "ml-auto shrink-0 self-start pt-0.5 text-xs text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export {
  TaskList,
  TaskRow,
  TaskRowStatus,
  TaskRowContent,
  TaskRowTitle,
  TaskRowDescription,
  TaskRowMeta,
  taskRowVariants,
}
