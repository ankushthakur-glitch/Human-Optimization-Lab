import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Skeleton } from "@/design-system/ui/skeleton"
import { Spinner } from "@/design-system/ui/spinner"

const loadingStateVariants = cva(
  "group/loading-state flex w-full min-w-0 items-start gap-3 text-sm",
  {
    variants: {
      variant: {
        inline: "",
        card: "rounded-2xl border bg-card p-4",
        muted: "rounded-2xl bg-muted/50 p-4",
      },
    },
    defaultVariants: {
      variant: "inline",
    },
  }
)

function LoadingState({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof loadingStateVariants>) {
  return (
    <div
      data-slot="loading-state"
      data-variant={variant ?? "inline"}
      role="status"
      aria-live="polite"
      className={cn(loadingStateVariants({ variant }), className)}
      {...props}
    />
  )
}

// The indicator is decorative — the surrounding region already announces itself.
function LoadingStateIndicator({
  kind = "spinner",
  className,
  ...props
}: React.ComponentProps<"span"> & { kind?: "spinner" | "dots" | "pulse" }) {
  return (
    <span
      data-slot="loading-state-indicator"
      data-kind={kind}
      aria-hidden="true"
      className={cn(
        "flex h-5 shrink-0 items-center justify-center",
        kind === "dots" && "gap-1",
        className
      )}
      {...props}
    >
      {kind === "spinner" ? (
        <Spinner aria-hidden="true" role="presentation" />
      ) : null}
      {kind === "pulse" ? (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
      ) : null}
      {kind === "dots"
        ? [0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 animate-bounce rounded-full bg-muted-foreground/70",
                i === 1 && "[animation-delay:150ms]",
                i === 2 && "[animation-delay:300ms]"
              )}
            />
          ))
        : null}
    </span>
  )
}

function LoadingStateContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="loading-state-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function LoadingStateLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="loading-state-label"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
}

function LoadingStateDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="loading-state-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

// Placeholder body copy: the last line is short so the block reads as text.
function LoadingStateLines({
  lines = 3,
  className,
  ...props
}: React.ComponentProps<"div"> & { lines?: number }) {
  return (
    <div
      data-slot="loading-state-lines"
      aria-hidden="true"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 w-full rounded-full", i === lines - 1 && "w-2/5")}
        />
      ))}
    </div>
  )
}

export {
  LoadingState,
  LoadingStateIndicator,
  LoadingStateContent,
  LoadingStateLabel,
  LoadingStateDescription,
  LoadingStateLines,
  loadingStateVariants,
}
