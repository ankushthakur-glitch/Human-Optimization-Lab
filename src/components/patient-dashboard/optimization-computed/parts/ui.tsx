"use client"

import * as React from "react"
import { SparklesIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Badge, Card, CardBody, CardFooter, CardHeader } from "@/components/dashboard-kit"
import type { Biomarker } from "@/components/patient-dashboard/optimization/types"
import { shown } from "@/components/patient-dashboard/optimization/rules"

/* What the optimization cards share: the kit card as a scroll and focus
   target, the AI chip that marks a draft until a physician approves it, and
   the Based on badges that open the evidence behind a draft. */

export type OptSection =
  | "alerts"
  | "since"
  | "summary"
  | "headline"
  | "markers"
  | "priorities"
  | "categories"
  | "body"
  | "dexa"
  | "meds"
  | "plan"
  | "energy"
  | "orders"
  | "commitment"
  /* Version 2's own cards. */
  | "panel"
  | "outcomes"
  | "goals"
  | "mix"

export const optDomId = (id: OptSection) => `opt-${id}`

export function goTo(id: OptSection) {
  requestAnimationFrame(() => {
    const el = document.getElementById(optDomId(id))
    if (!el) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" })
    el.focus({ preventScroll: true })
  })
}

export function OptCard({
  id,
  title,
  count,
  description,
  controls,
  footer,
  flush,
  className,
  children,
}: {
  id: OptSection
  title: string
  count?: React.ReactNode
  description?: React.ReactNode
  controls?: React.ReactNode
  footer?: React.ReactNode
  flush?: boolean
  className?: string
  children: React.ReactNode
}) {
  const domId = optDomId(id)
  return (
    <Card
      id={domId}
      tabIndex={-1}
      aria-labelledby={`${domId}-title`}
      className={cn("@container/card flex scroll-mt-3 flex-col outline-none", className)}
    >
      <CardHeader title={title} titleId={`${domId}-title`} count={count} description={description}>
        {controls}
      </CardHeader>
      <CardBody flush={flush} className="min-h-0 flex-1">
        {children}
      </CardBody>
      {footer && <CardFooter className="text-[13px] text-muted-foreground tabular-nums">{footer}</CardFooter>}
    </Card>
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
        <button
          key={b.name}
          type="button"
          onClick={(e) => onOpen(b.name, e.currentTarget)}
          className="rounded-[4.32px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Badge tone="outline" className="cursor-pointer hover:bg-surface-row-hover">
            {markerLabel(b)}
          </Badge>
        </button>
      ))}
    </div>
  )
}
