import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"

/** A single observation: one number, one direction, one sentence of why. */
function InsightCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="insight-card"
      className={cn(
        "group/insight-card flex min-w-0 flex-col gap-2 rounded-3xl border bg-card p-4",
        className
      )}
      {...props}
    />
  )
}

function InsightCardLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="insight-card-label"
      className={cn(
        "text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function InsightCardValue({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="insight-card-value"
      className={cn(
        "font-heading text-2xl font-semibold tracking-tight tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function InsightCardDelta({
  direction = "flat",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  direction?: "up" | "down" | "flat"
}) {
  const icon =
    direction === "up"
      ? ArrowUp02Icon
      : direction === "down"
        ? ArrowDown02Icon
        : MinusSignIcon
  return (
    <span
      data-slot="insight-card-delta"
      data-direction={direction}
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-3xl px-2 text-xs font-medium tabular-nums [&_svg]:size-3",
        direction === "up" && "bg-success-surface text-success",
        direction === "down" && "bg-destructive/10 text-destructive",
        direction === "flat" && "bg-muted text-muted-foreground",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={icon} aria-hidden="true" />
      {children}
    </span>
  )
}

function InsightCardBody({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="insight-card-body"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * A minimal trend line. Decorative by default — the number above it is the
 * accessible value, so the sparkline is hidden from assistive tech unless a
 * label is supplied.
 */
function InsightSparkline({
  points,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "points"> & {
  points: number[]
  label?: string
}) {
  const width = 100
  const height = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = points.length > 1 ? width / (points.length - 1) : width

  const path = points
    .map((p, i) => {
      const x = (i * step).toFixed(2)
      const y = (height - ((p - min) / span) * (height - 4) - 2).toFixed(2)
      return `${i === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  return (
    <svg
      data-slot="insight-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("h-7 w-full text-primary-tint", className)}
      {...props}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function InsightCardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="insight-card-grid"
      className={cn("grid w-full gap-3 sm:grid-cols-2", className)}
      {...props}
    />
  )
}

export {
  InsightCard,
  InsightCardLabel,
  InsightCardValue,
  InsightCardDelta,
  InsightCardBody,
  InsightSparkline,
  InsightCardGrid,
}
