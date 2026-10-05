"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Card, CardHeader, DIVIDER } from "@/components/dashboard-kit-v2"
import type { SectionId } from "@/components/patient-dashboard/rules"
import { sectionDomId } from "@/components/patient-dashboard/ui"

/* What the free member's cards share: the kit card as a scroll and focus
   target, with the v5 header (title over one factual line, one control on
   the right, no rule under it unless the body is a list), a body that
   grows so footers in a row line up, and a one-line footer. */

/** Outer table cells sit at the card's 20px padding. */
export const EDGE = "first:pl-5 last:pr-5"

export function SectionCard({
  id,
  title,
  description,
  actions,
  footer,
  flush,
  divider = false,
  className,
  children,
}: {
  id: SectionId
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  /** No body padding, for a table or a list. */
  flush?: boolean
  /** A rule under the header, for a list body. */
  divider?: boolean
  className?: string
  children: React.ReactNode
}) {
  const domId = sectionDomId(id)
  return (
    <Card
      id={domId}
      tabIndex={-1}
      aria-labelledby={`${domId}-title`}
      className={cn(
        "@container/card h-full scroll-mt-3 outline-none",
        className
      )}
    >
      <CardHeader
        title={title}
        titleId={`${domId}-title`}
        description={description}
        actions={actions}
        divider={divider}
        className={cn(
          "min-h-0 items-start px-5 pt-4",
          divider ? "pb-3" : "pb-1.5"
        )}
      />
      <div className={cn("min-w-0 flex-1", !flush && "px-5 py-2")}>
        {children}
      </div>
      {footer && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-1 pb-4 text-[13px] tabular-nums">
          {footer}
        </div>
      )}
    </Card>
  )
}

/** A separator between footer links. */
export const Dot = () => (
  <span aria-hidden className="text-muted-foreground">
    ·
  </span>
)

/** An empty state inside a table, under its headers. */
export function EmptyRow({
  span,
  children,
}: {
  span: number
  children: React.ReactNode
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className="px-5 py-4 text-[13px] text-muted-foreground"
      >
        {children}
      </td>
    </tr>
  )
}

/** A card's skeleton in its final shape: header, then `rows` lines. */
export function CardSkeleton({
  rows = 3,
  tall,
  className,
}: {
  rows?: number
  tall?: boolean
  className?: string
}) {
  return (
    <Card aria-hidden className={cn("h-full", className)}>
      <div
        className={cn(
          "flex min-h-[56px] items-center gap-3 border-b px-5",
          DIVIDER
        )}
      >
        <Skeleton className="h-4 w-36 rounded-sm" />
        <Skeleton className="ml-auto h-7 w-40 rounded-md" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            className={cn("w-full rounded-md", tall ? "h-20" : "h-9")}
          />
        ))}
      </div>
    </Card>
  )
}
