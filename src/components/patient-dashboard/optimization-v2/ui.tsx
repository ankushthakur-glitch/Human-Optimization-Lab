"use client"

import * as React from "react"
import { SparklesIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Badge, Card, CardBody, CardFooter, CardHeader, DIVIDER, FOCUS } from "@/components/dashboard-kit-v2"
import type { Biomarker } from "@/components/patient-dashboard/optimization/types"
import { shown } from "@/components/patient-dashboard/optimization/rules"

/* What the optimization Overview's cards share: the kit card as a scroll
   and focus target, the AI chip that marks a draft until a physician
   approves it, and the Based on badges that open the evidence behind a
   draft. */

export type OptSection =
  | "needs"
  | "brief"
  | "about"
  | "markers"
  | "score"
  | "priorities"
  | "meds"
  | "body"
  | "composition"
  | "plan"
  | "categories"

export const optDomId = (id: OptSection) => `opt-${id}`

/** Scrolls to a card after the state that fills it has rendered. */
export function goTo(id: OptSection) {
  requestAnimationFrame(() => {
    const el = document.getElementById(optDomId(id))
    if (!el) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" })
    el.focus({ preventScroll: true })
  })
}

export { DIVIDER }

export function OptCard({
  id,
  title,
  count,
  description,
  actions,
  footer,
  footerDivider,
  flush,
  className,
  bodyClassName,
  children,
}: {
  id: OptSection
  title: string
  count?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  /** A rule above the footer, for a footer that holds actions. */
  footerDivider?: boolean
  flush?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  const domId = optDomId(id)
  return (
    <Card id={domId} tabIndex={-1} aria-labelledby={`${domId}-title`} className={cn("@container/card h-full scroll-mt-3 outline-none", className)}>
      <CardHeader title={title} titleId={`${domId}-title`} count={count} description={description} actions={actions} divider={false} className="pt-4 pb-0" />
      <CardBody flush={flush} className={cn("min-h-0 flex-1", !flush && "px-4 pt-3 pb-3", bodyClassName)}>
        {children}
      </CardBody>
      {footer && (
        <CardFooter
          className={cn(
            "flex-col items-start gap-0.5 border-0 px-4 pt-1 pb-4 text-[13px] tabular-nums",
            footerDivider && cn("border-t pt-3", DIVIDER)
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

/** The first footer line (13/500) over its muted second line. */
export function FooterLines({ lead, sub, tone }: { lead: React.ReactNode; sub?: React.ReactNode; tone?: "warning" | "success" }) {
  return (
    <>
      <p className={cn("font-medium", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{lead}</p>
      {sub && <p className="text-muted-foreground">{sub}</p>}
    </>
  )
}

/** A link inside a card's text, "All lab results". */
export function TextLink({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-sm text-primary-tint underline-offset-2 hover:underline", FOCUS, className)}
    >
      {children}
    </button>
  )
}

/** Marks AI-drafted content until a physician approves or edits it. */
export function AiChip() {
  return (
    <Badge tone="info" icon={SparklesIcon}>
      Drafted by AI
    </Badge>
  )
}

/** "VAT Area 142 cm²", from the marker's latest point. */
export function markerLabel(b: Biomarker) {
  const last = b.history[b.history.length - 1]?.value ?? b.latest?.value
  return last === undefined ? b.name : `${b.name} ${shown(last)}${b.unit && !/^(qualitative|genotype)$/.test(b.unit) ? ` ${b.unit}` : ""}`
}

/** One outline badge per marker; each opens that marker's side panel. */
export function BasedOn({
  markers,
  onOpen,
  label = true,
  className,
}: {
  markers: Biomarker[]
  onOpen: (name: string, from: HTMLElement) => void
  label?: boolean
  className?: string
}) {
  if (markers.length === 0) return null
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {label && <span className="text-xs text-muted-foreground">Based on</span>}
      {markers.map((b) => (
        <button key={b.name} type="button" onClick={(e) => onOpen(b.name, e.currentTarget)} className={cn("rounded-[4.32px]", FOCUS)}>
          <Badge tone="outline" className="cursor-pointer hover:bg-surface-row-hover">
            {markerLabel(b)}
          </Badge>
        </button>
      ))}
    </div>
  )
}

/** A card's skeleton in its final shape: a header, then `rows` lines. */
export function CardSkeleton({ rows = 3, tall, className }: { rows?: number; tall?: boolean; className?: string }) {
  return (
    <Card aria-hidden className={className}>
      <div className="flex min-h-[56px] items-center gap-3 px-4">
        <Skeleton className="h-4 w-36 rounded-sm" />
        <Skeleton className="ml-auto h-7 w-40 rounded-md" />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className={cn("w-full rounded-md", tall ? "h-20" : "h-9")} />
        ))}
      </div>
    </Card>
  )
}
