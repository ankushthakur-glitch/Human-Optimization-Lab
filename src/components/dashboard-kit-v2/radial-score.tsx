"use client"

import * as React from "react"
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer } from "@/design-system/ui/chart"
import { PALETTE, useReducedMotion } from "@/components/dashboard-kit-v2/charts"

/* shadcn's radial chart with text: one bounded score with its number in
   the centre. The ring is a tenth of the diameter, the track a faint tint,
   and the arc starts at twelve o'clock. One per card at most, never rings
   to compare items. */

export function RadialScore({
  value,
  max,
  label,
  size = 112,
  className,
  children,
}: {
  value: number
  max: number
  label: string
  size?: number
  className?: string
  /** The centre: the number and, optionally, a line under it. */
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  const config = { value: { label, color: PALETTE.primary } } satisfies ChartConfig
  return (
    <div
      role="img"
      aria-label={`${label}: ${value} of ${max}`}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <ChartContainer config={config} className="aspect-square size-full">
        <RadialBarChart
          data={[{ value }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="80%"
          outerRadius="100%"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            fill={PALETTE.primary}
            background={{ fill: "var(--secondary)" }}
            isAnimationActive={!reduced}
          />
        </RadialBarChart>
      </ChartContainer>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
