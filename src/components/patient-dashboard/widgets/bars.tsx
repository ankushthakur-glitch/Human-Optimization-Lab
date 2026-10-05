"use client"

import * as React from "react"
/* The headline and bar gap the dashboard's chart widgets share. */

export const BAR_GAP = { stroke: "var(--card)", strokeWidth: 2 }

export function Headline({
  value,
  unit,
  meta,
}: {
  value: React.ReactNode
  unit: string
  meta?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-1.5">
        <span className="text-[32px] leading-9 font-semibold tabular-nums">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </p>
      {meta && (
        <p className="text-[13px] text-muted-foreground tabular-nums">{meta}</p>
      )}
    </div>
  )
}
