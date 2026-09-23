import * as React from "react"
import { cn } from "cn"

/**
 * A single suggested next step with the reasoning behind it. Confidence is
 * shown as a meter rather than a bare number so it reads at a glance.
 */
function RecommendationCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="recommendation-card"
      className={cn(
        "group/recommendation-card flex w-full min-w-0 flex-col gap-3 rounded-3xl border bg-card p-4 text-sm transition-colors hover:border-primary/40",
        className
      )}
      {...props}
    />
  )
}

function RecommendationCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="recommendation-card-header"
      className={cn("flex min-w-0 items-start gap-3", className)}
      {...props}
    />
  )
}

function RecommendationCardIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="recommendation-card-icon"
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-surface text-primary-tint [&_svg]:size-4.5",
        className
      )}
      {...props}
    />
  )
}

function RecommendationCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="recommendation-card-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function RecommendationCardReason({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="recommendation-card-reason"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function RecommendationCardConfidence({
  value,
  label = "Confidence",
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      data-slot="recommendation-card-confidence"
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    >
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <span
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="shrink-0 text-[11px] font-medium tabular-nums">
        {pct}%
      </span>
    </div>
  )
}

function RecommendationCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="recommendation-card-footer"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
}

function RecommendationCardGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="recommendation-card-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

export {
  RecommendationCard,
  RecommendationCardHeader,
  RecommendationCardIcon,
  RecommendationCardTitle,
  RecommendationCardReason,
  RecommendationCardConfidence,
  RecommendationCardFooter,
  RecommendationCardGroup,
}
