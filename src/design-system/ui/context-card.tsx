import * as React from "react"
import { cn } from "cn"

/**
 * A piece of context the agent pulled in — a file, a record, a page. The
 * source line is part of the contract: context the person cannot trace back
 * to an origin is not useful context.
 */
function ContextCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card"
      className={cn(
        "group/context-card flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-3 text-sm transition-colors hover:border-primary/40 has-[a:focus-visible]:border-ring",
        className
      )}
      {...props}
    />
  )
}

function ContextCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card-header"
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    />
  )
}

function ContextCardIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-card-icon"
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

function ContextCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card-title"
      className={cn("min-w-0 truncate text-xs font-medium", className)}
      {...props}
    />
  )
}

function ContextCardSource({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card-source"
      className={cn(
        "min-w-0 truncate font-mono text-[11px] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ContextCardBody({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="context-card-body"
      className={cn(
        "line-clamp-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ContextCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card-footer"
      className={cn(
        "mt-auto flex min-w-0 items-center gap-2 pt-1 text-[11px] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ContextCardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-card-grid"
      className={cn(
        "grid w-full auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2",
        className
      )}
      {...props}
    />
  )
}

export {
  ContextCard,
  ContextCardHeader,
  ContextCardIcon,
  ContextCardTitle,
  ContextCardSource,
  ContextCardBody,
  ContextCardFooter,
  ContextCardGrid,
}
