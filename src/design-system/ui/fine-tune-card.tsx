import * as React from "react"
import { cn } from "cn"

/**
 * The panel that sits beside a generated result and lets someone nudge the
 * inputs — weights, toggles, a tone — then re-run.
 */
function FineTuneCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="fine-tune-card"
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 rounded-3xl border bg-card p-4 text-sm",
        className
      )}
      {...props}
    />
  )
}

function FineTuneCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="fine-tune-card-header"
      className={cn("flex min-w-0 items-start gap-3", className)}
      {...props}
    />
  )
}

function FineTuneCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="fine-tune-card-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function FineTuneCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="fine-tune-card-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function FineTuneCardControls({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="fine-tune-card-controls"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    />
  )
}

/**
 * One labelled knob. `value` is rendered beside the label so the current
 * setting is readable without interrogating the control itself.
 */
function FineTuneControl({
  label,
  value,
  hint,
  htmlFor,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: string
  value?: React.ReactNode
  hint?: string
  htmlFor?: string
}) {
  return (
    <div
      data-slot="fine-tune-control"
      className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      {...props}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <label
          htmlFor={htmlFor}
          className="min-w-0 truncate text-xs font-medium"
        >
          {label}
        </label>
        {value !== undefined ? (
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {value}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function FineTuneCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="fine-tune-card-footer"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3",
        className
      )}
      {...props}
    />
  )
}

export {
  FineTuneCard,
  FineTuneCardHeader,
  FineTuneCardTitle,
  FineTuneCardDescription,
  FineTuneCardControls,
  FineTuneControl,
  FineTuneCardFooter,
}
