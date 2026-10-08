"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Card, CardBody, CardFooter, CardHeader } from "@/components/dashboard-kit-v2"
import type { ChartSection } from "@/components/provider/patient-chart"
import type { SectionId } from "@/components/patient-dashboard/rules"

/* What the dashboard's cards share: the kit card as a scroll and focus
   target, header links into chart sections, the inner divider, a muted
   empty line, and scrolling to a card from the alert or a tile. */

export type OpenSection = (section: ChartSection, item?: string, tab?: string) => void

export const sectionDomId = (id: SectionId) => `dashboard-${id}`

/** The inner divider: a step lighter than the card border. */
export const DIVIDER = "border-[color-mix(in_oklab,var(--border)_65%,transparent)]"

export function DashCard({
  id,
  title,
  description,
  controls,
  footer,
  flush,
  children,
}: {
  id: SectionId
  title: React.ReactNode
  description?: React.ReactNode
  /** On the right of the header. */
  controls?: React.ReactNode
  footer?: React.ReactNode
  /** No body padding, for a table or a list. */
  flush?: boolean
  children: React.ReactNode
}) {
  const domId = sectionDomId(id)
  return (
    <Card id={domId} tabIndex={-1} aria-labelledby={`${domId}-title`} className="@container/card scroll-mt-3 outline-none">
      <CardHeader title={title} titleId={`${domId}-title`} description={description} actions={controls} />
      <CardBody flush={flush}>{children}</CardBody>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}

/** A card's skeleton in its final shape: header, then `rows` lines. */
export function CardSkeleton({ rows = 3, tall, className }: { rows?: number; tall?: boolean; className?: string }) {
  return (
    <Card aria-hidden className={className}>
      <div className={cn("flex min-h-[56px] items-center gap-3 border-b px-4", DIVIDER)}>
        <Skeleton className="h-4 w-36 rounded-sm" />
        <Skeleton className="ml-auto h-7 w-40 rounded-md" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className={cn("w-full rounded-md", tall ? "h-20" : "h-9")} />
        ))}
      </div>
    </Card>
  )
}

/** A text link in a card header, "In range (7)". */
export function HeaderLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="link" size="xs" className="h-auto px-0 text-[13px]" onClick={onClick}>
      {children}
    </Button>
  )
}

/** A muted line for an empty card or column. */
export function Quiet({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[13px] text-muted-foreground", className)}>{children}</p>
}

/** One-line text that truncates with the full value on hover. */
export function Clip({ children, className }: { children: string; className?: string }) {
  return (
    <span title={children} className={cn("block min-w-0 truncate", className)}>
      {children}
    </span>
  )
}

/** "Label" over its value. */
export function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

/** Scrolls to a card and moves focus there. */
export function goToSection(id: SectionId) {
  const el = document.getElementById(sectionDomId(id))
  if (!el) return
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" })
  el.focus({ preventScroll: true })
}
