"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, BrainIcon } from "@hugeicons/core-free-icons"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/ui/collapsible"

function Thinking({
  className,
  ...props
}: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      data-slot="thinking"
      className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

/**
 * `active` shows the live shimmer; once the trace is settled pass the elapsed
 * label instead so the row reads as a summary of what already happened.
 */
function ThinkingTrigger({
  active = false,
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { active?: boolean }) {
  return (
    <CollapsibleTrigger
      data-slot="thinking-trigger"
      data-active={active || undefined}
      className={cn(
        "group/thinking-trigger flex w-fit items-center gap-2 rounded-full text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        icon={BrainIcon}
        className={cn(
          "size-4 shrink-0",
          active && "animate-pulse text-primary-tint"
        )}
      />
      <span
        className={cn(
          active &&
            "bg-[linear-gradient(90deg,var(--color-muted-foreground)_25%,var(--color-foreground)_50%,var(--color-muted-foreground)_75%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-safe:animate-[thinking-shimmer_1.6s_linear_infinite]"
        )}
      >
        {children}
      </span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        className="size-4 shrink-0 transition-transform group-data-panel-open/thinking-trigger:rotate-180"
      />
    </CollapsibleTrigger>
  )
}

function ThinkingContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="thinking-content"
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 border-l-2 border-border pl-4 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ThinkingStep({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      data-slot="thinking-step"
      className={cn("flex min-w-0 flex-col gap-1", className)}
      {...props}
    >
      {label ? (
        <span className="text-xs font-medium text-foreground/70">{label}</span>
      ) : null}
      <span className="leading-relaxed whitespace-pre-wrap">{children}</span>
    </div>
  )
}

export { Thinking, ThinkingTrigger, ThinkingContent, ThinkingStep }
